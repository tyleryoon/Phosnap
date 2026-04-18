-- ============================================================
--  Phosnap · Bookings 마이그레이션 v5 — 결제 서버 검증 지원
--  Supabase SQL Editor에서 실행
--
--  추가 사항:
--   - toss_method:      결제 수단 ('카드', '가상계좌' 등)
--   - toss_receipt_url: 영수증 URL
--   - confirmed_at:     서버 검증(confirm) 완료 시각
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS toss_method       text,
  ADD COLUMN IF NOT EXISTS toss_receipt_url  text,
  ADD COLUMN IF NOT EXISTS confirmed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount     int default 0;

-- 인덱스: orderId로 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_toss_order_id
  ON public.bookings (toss_order_id)
  WHERE toss_order_id IS NOT NULL;

-- ============================================================
-- 완료!
-- ============================================================
