-- ============================================================
--  Phosnap · Reviews 마이그레이션 v1
--  Supabase SQL Editor에서 실행
--
--  추가 사항:
--   - reviews 테이블 생성
--   - RLS 정책 (본인 리뷰 작성, 공개 조회)
--   - 평균 평점 자동 업데이트 트리거
--   - dress_vendors 테이블 생성 (VendorRegister용)
-- ============================================================

-- ── 1. reviews 테이블 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id   uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating            int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text              text NOT NULL DEFAULT '',
  author_name       text,           -- 표시용 이름 (마스킹 가능)
  lang              text DEFAULT 'ko',
  is_visible        boolean DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 한 예약당 하나의 리뷰만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_unique
  ON public.reviews (booking_id)
  WHERE booking_id IS NOT NULL;

-- 작가별 리뷰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_reviews_photographer
  ON public.reviews (photographer_id, created_at DESC);

-- 고객별 리뷰 조회
CREATE INDEX IF NOT EXISTS idx_reviews_customer
  ON public.reviews (customer_id);

-- ── 2. reviews RLS ───────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 공개 조회 (is_visible = true인 것만)
CREATE POLICY "리뷰 공개 조회"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

-- 본인 리뷰 작성 (customer_id = 로그인 유저)
CREATE POLICY "리뷰 작성"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- 본인 리뷰 수정
CREATE POLICY "리뷰 본인 수정"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = customer_id);

-- 본인 리뷰 삭제
CREATE POLICY "리뷰 본인 삭제"
  ON public.reviews FOR DELETE
  USING (auth.uid() = customer_id);

-- Admin 리뷰 전체 조회/수정 (숨김 포함)
CREATE POLICY "admin_reviews_select"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_reviews_update"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 3. 평균 평점 자동 업데이트 트리거 ─────────────────────────
CREATE OR REPLACE FUNCTION public.update_photographer_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _photographer_id uuid;
  _avg_rating numeric(3,2);
  _count int;
BEGIN
  -- INSERT/UPDATE 시 NEW, DELETE 시 OLD
  IF TG_OP = 'DELETE' THEN
    _photographer_id := OLD.photographer_id;
  ELSE
    _photographer_id := NEW.photographer_id;
  END IF;

  -- 평균 평점 & 리뷰 수 계산
  SELECT
    COALESCE(AVG(rating)::numeric(3,2), 5.0),
    COUNT(*)
  INTO _avg_rating, _count
  FROM public.reviews
  WHERE photographer_id = _photographer_id
    AND is_visible = true;

  -- photographers 테이블 업데이트
  UPDATE public.photographers
  SET
    rating = _avg_rating,
    reviews_count = _count,
    updated_at = now()
  WHERE id = _photographer_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD;
  ELSE RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_photographer_rating ON public.reviews;
CREATE TRIGGER trg_update_photographer_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_photographer_rating();

-- ── 4. dress_vendors 테이블 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dress_vendors (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name_ko         text NOT NULL,
  name_en         text,
  location_id     text,
  categories      text[] DEFAULT '{}',
  hero_image_url  text,
  contact_phone   text,
  contact_email   text,
  contact_instagram text,
  contact_website text,
  bio             text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- dress_vendors RLS
ALTER TABLE public.dress_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "업체 공개 조회"
  ON public.dress_vendors FOR SELECT
  USING (is_active = true);

CREATE POLICY "업체 본인 삽입"
  ON public.dress_vendors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "업체 본인 수정"
  ON public.dress_vendors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "업체 본인 삭제"
  ON public.dress_vendors FOR DELETE
  USING (auth.uid() = user_id);

-- ── 5. vendor_dresses 테이블 (업체의 의상 목록) ─────────────
CREATE TABLE IF NOT EXISTS public.vendor_dresses (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       uuid NOT NULL REFERENCES public.dress_vendors(id) ON DELETE CASCADE,
  name_ko         text NOT NULL,
  name_en         text,
  category        text NOT NULL DEFAULT 'hanbok',
  sizes           text[] DEFAULT '{}',
  color           text,
  price           int NOT NULL DEFAULT 0,
  image_url       text,
  description     text,
  is_available    boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_dresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "의상 공개 조회"
  ON public.vendor_dresses FOR SELECT
  USING (true);

CREATE POLICY "의상 본인 삽입"
  ON public.vendor_dresses FOR INSERT
  WITH CHECK (
    vendor_id IN (SELECT id FROM public.dress_vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "의상 본인 수정"
  ON public.vendor_dresses FOR UPDATE
  USING (
    vendor_id IN (SELECT id FROM public.dress_vendors WHERE user_id = auth.uid())
  );

CREATE POLICY "의상 본인 삭제"
  ON public.vendor_dresses FOR DELETE
  USING (
    vendor_id IN (SELECT id FROM public.dress_vendors WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_vendor_dresses_vendor
  ON public.vendor_dresses (vendor_id);

-- ── 6. profiles role 확장 (dress_vendor 추가) ────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer','photographer','artist','stylist','dress_vendor','admin'));

-- ============================================================
-- 완료! reviews + dress_vendors + vendor_dresses + 트리거
-- ============================================================
