-- ============================================================
--  Phosnap · RLS 강화 마이그레이션
--  기존 schema.sql + dress_vendor_v1.sql의 RLS를 보완
-- ============================================================

-- ── 1. profiles: INSERT 정책 (회원가입 트리거 + 직접 삽입) ─────
-- handle_new_user 트리거는 SECURITY DEFINER이므로 RLS 바이패스됨
-- 하지만 클라이언트에서 직접 insert 시도 시 본인만 가능하도록
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '본인 프로필 삽입'
  ) THEN
    CREATE POLICY "본인 프로필 삽입"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ── 2. bookings: UPDATE 정책 (고객 취소 + 작가 확정/거절) ──────
-- 현재: SELECT + INSERT만 있음, UPDATE 없음
DO $$ BEGIN
  -- 고객: 자기 예약만 취소 가능 (status → cancelled)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '고객 예약 수정'
  ) THEN
    CREATE POLICY "고객 예약 수정"
      ON public.bookings FOR UPDATE
      USING (auth.uid() = customer_id);
  END IF;

  -- 작가: 자기 예약만 확정/거절 가능
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '작가 예약 수정'
  ) THEN
    CREATE POLICY "작가 예약 수정"
      ON public.bookings FOR UPDATE
      USING (
        photographer_id IN (
          SELECT id FROM public.photographers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 3. bookings: DELETE 차단 ────────────────────────────────────
-- 예약은 삭제 불가 — 취소만 (status 변경)
-- 기본적으로 DELETE 정책이 없으면 차단되지만 명시적으로 확인
-- (이미 RLS enabled이고 DELETE 정책이 없으면 자동 차단)

-- ── 4. photographers: DELETE 정책 (본인만 탈퇴) ─────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '작가 본인 삭제'
  ) THEN
    CREATE POLICY "작가 본인 삭제"
      ON public.photographers FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. dress_vendors: DELETE 정책 ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dress_vendors' AND policyname = '의상업체 본인 삭제'
  ) THEN
    CREATE POLICY "의상업체 본인 삭제"
      ON public.dress_vendors FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 6. profiles: admin은 모든 프로필 조회 가능 ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '관리자 전체 조회'
  ) THEN
    CREATE POLICY "관리자 전체 조회"
      ON public.profiles FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 7. bookings: admin 전체 조회/수정 ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 전체 조회'
  ) THEN
    CREATE POLICY "관리자 예약 전체 조회"
      ON public.bookings FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 수정'
  ) THEN
    CREATE POLICY "관리자 예약 수정"
      ON public.bookings FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 8. photographers: 비활성 작가도 admin이 볼 수 있도록 ────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '관리자 작가 전체 조회'
  ) THEN
    CREATE POLICY "관리자 작가 전체 조회"
      ON public.photographers FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 9. Supabase Storage RLS (이미지 업로드용 준비) ──────────────
-- 아래는 Storage 버킷 생성 + 정책
-- Supabase 대시보드 → Storage → New Bucket 후 아래 SQL 실행
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('portfolios', 'portfolios', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('dresses', 'dresses', true);
--
-- CREATE POLICY "아바타 공개 조회" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "아바타 본인 업로드" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "아바타 본인 수정" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "아바타 본인 삭제" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 완료!
-- RLS 정책 요약:
--   profiles:       SELECT(본인+admin), INSERT(본인), UPDATE(본인)
--   photographers:  SELECT(공개+admin), INSERT(본인), UPDATE(본인), DELETE(본인)
--   bookings:       SELECT(고객+작가+admin), INSERT(고객), UPDATE(고객+작가+admin)
--   dress_vendors:  SELECT(공개), INSERT(본인), UPDATE(본인), DELETE(본인)
--   dress_items:    SELECT(공개), ALL(업체 본인)
--   schedules:      SELECT(공개), ALL(작가 본인)
--   waitlist:       INSERT(공개)
-- ============================================================
