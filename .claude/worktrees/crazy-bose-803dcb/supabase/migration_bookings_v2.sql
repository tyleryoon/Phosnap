-- ============================================================
--  Phosnap · Bookings 테이블 마이그레이션 v2
--  Supabase 대시보드 → SQL Editor → 아래 전체 복사·실행
--
--  변경 사항:
--   - photographer_id → nullable (MVP: 작가가 아직 DB에 없음)
--   - photographer_name text 컬럼 추가 (URL param에서 받아 저장)
--   - photographer_legacy_id text 컬럼 추가 (mock ID 1~4 저장용)
--   - note 컬럼 추가 (고객 메모)
-- ============================================================

-- 1. photographer_id의 NOT NULL 제약 제거
ALTER TABLE public.bookings
  ALTER COLUMN photographer_id DROP NOT NULL;

-- 2. photographer_name 컬럼 추가 (MVP 기간용)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS photographer_name text;

-- 3. photographer_legacy_id 추가 (mock 데이터의 숫자 ID)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS photographer_legacy_id text;

-- 4. 고객 메모 컬럼 추가
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS note text;

-- 5. 언어 컬럼 추가 (예약 시 사용 언어 기록)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS lang text default 'ko';

-- ============================================================
-- 완료! 이제 photographer가 DB에 없어도 예약 저장 가능
-- ============================================================
