-- ============================================================
--  Phosnap · Bookings 마이그레이션 v3
--  Supabase SQL Editor에서 실행
--
--  추가 사항:
--   - 고객이 본인 예약 취소/변경 가능하도록 UPDATE RLS 추가
--   - cancelled_at 컬럼 추가
--   - reschedule_request 컬럼 추가 (변경 요청 메모)
-- ============================================================

-- 1. 고객 예약 UPDATE 허용 (본인 예약만)
CREATE POLICY "내 예약 업데이트" ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- 2. 취소 일시 컬럼
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 3. 일정 변경 요청 메모 컬럼
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reschedule_request text;

-- ============================================================
-- 완료!
-- ============================================================
