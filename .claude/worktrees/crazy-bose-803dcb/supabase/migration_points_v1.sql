-- ─── User Points & Tier System ─────────────────────────────────────────
-- Reward points system for reviews

-- user_points table: tracks current and earned points per user
CREATE TABLE IF NOT EXISTS user_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  total_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- point_history table: audit log of all point transactions
CREATE TABLE IF NOT EXISTS point_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  booking_id text,
  created_at timestamptz DEFAULT now()
);

-- ─── Row Level Security ────────────────────────────────────────────────
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own points"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own history"
  ON point_history FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Indices for performance ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_history_user_id ON point_history(user_id);
CREATE INDEX IF NOT EXISTS idx_point_history_created_at ON point_history(created_at DESC);
