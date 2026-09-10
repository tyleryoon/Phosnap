-- ============================================================
--  Phosnap · Bookings 마이그레이션 v4
--  Supabase SQL Editor에서 실행
--
--  추가 사항:
--   - approved_at: 작가가 예약 수락한 시간
--   - rejected_reason: 거절 사유
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- ============================================================
-- 완료!
-- ============================================================
