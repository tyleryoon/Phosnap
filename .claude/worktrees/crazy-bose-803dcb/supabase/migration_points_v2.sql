-- ─── Points v2: Atomic RPCs + Insert/Update RLS ───────────────────────
-- The v1 migration only granted SELECT to users; INSERT/UPDATE attempts
-- from the client were silently denied by RLS, so review rewards never
-- landed in the database. This migration:
--   1. Adds the missing self-write RLS policies as a safety net.
--   2. Provides SECURITY DEFINER RPCs that perform the award/deduct
--      atomically inside the database, so the client never has to do a
--      read-then-write cycle (which is racy under concurrent reviews).

-- ─── RLS: allow users to write their own rows ──────────────────────────
DROP POLICY IF EXISTS "Users can insert own points" ON user_points;
CREATE POLICY "Users can insert own points"
  ON user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own points" ON user_points;
CREATE POLICY "Users can update own points"
  ON user_points FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own history" ON point_history;
CREATE POLICY "Users can insert own history"
  ON point_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── RPC: award_points ─────────────────────────────────────────────────
-- Increments user_points and writes a point_history audit row in one
-- transaction. SECURITY DEFINER so the function can run even if the
-- caller is briefly missing its insert grant; we still gate on auth.uid()
-- inside the function so a client cannot award points to another user.
CREATE OR REPLACE FUNCTION award_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_booking_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'award_points: amount must be a positive integer';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'award_points: caller is not the owner of p_user_id';
  END IF;

  INSERT INTO user_points (user_id, points, total_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET points       = user_points.points + EXCLUDED.points,
        total_earned = user_points.total_earned + EXCLUDED.total_earned,
        updated_at   = now();

  INSERT INTO point_history (user_id, amount, reason, booking_id)
  VALUES (p_user_id, p_amount, p_reason, p_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION award_points(uuid, integer, text, text) TO authenticated;

-- ─── RPC: deduct_points ────────────────────────────────────────────────
-- Decrements user_points and writes a negative point_history row.
-- Throws if the user has insufficient balance, so callers should expect
-- a clear error rather than silently going negative.
CREATE OR REPLACE FUNCTION deduct_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_booking_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'deduct_points: amount must be a positive integer';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'deduct_points: caller is not the owner of p_user_id';
  END IF;

  SELECT points INTO v_current
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'deduct_points: user has no points record';
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'deduct_points: insufficient balance (%/%)', v_current, p_amount;
  END IF;

  UPDATE user_points
     SET points     = points - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO point_history (user_id, amount, reason, booking_id)
  VALUES (p_user_id, -p_amount, p_reason, p_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_points(uuid, integer, text, text) TO authenticated;
