-- ============================================================
-- PHOSNAP PATCH MIGRATION (Safe Re-run)
--
-- 기존 MASTER_MIGRATION에서 이미 생성된 테이블/정책과 충돌하는
-- 부분을 안전하게 DROP → CREATE 하는 패치 스크립트
--
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- (트랜잭션 제거 — Supabase SQL Editor에서 $$ 함수와 충돌 방지)

-- ═══════════════════════════════════════════════════════════
-- 1. DRESS_VENDORS (dress_items보다 먼저 생성해야 함)
-- ═══════════════════════════════════════════════════════════

-- profiles.role 확장
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer','artist','photographer','stylist','dress_vendor','venue_vendor','admin'));

-- dress_vendors 테이블
CREATE TABLE IF NOT EXISTS public.dress_vendors (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_i18n       jsonb DEFAULT '{}',
  bio             text,
  bio_i18n        jsonb DEFAULT '{}',
  location_id     text,
  location_names  jsonb DEFAULT '{}',
  categories      text[] DEFAULT '{}',
  img             text,
  contact_info    jsonb DEFAULT '{}',
  is_active       boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dress_vendors ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE dress_vendors ADD COLUMN IF NOT EXISTS city TEXT;
CREATE INDEX IF NOT EXISTS idx_dress_vendors_country_code ON dress_vendors(country_code);
CREATE INDEX IF NOT EXISTS idx_dress_vendors_country_city ON dress_vendors(country_code, city);
CREATE INDEX IF NOT EXISTS idx_dress_vendors_location ON public.dress_vendors(location_id, is_active);

ALTER TABLE public.dress_vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "의상업체 공개 조회" ON public.dress_vendors;
CREATE POLICY "의상업체 공개 조회" ON public.dress_vendors FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "의상업체 본인 수정" ON public.dress_vendors;
CREATE POLICY "의상업체 본인 수정" ON public.dress_vendors FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "의상업체 본인 삽입" ON public.dress_vendors;
CREATE POLICY "의상업체 본인 삽입" ON public.dress_vendors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 2. STYLISTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  specialty TEXT,
  description TEXT,
  phone TEXT,
  instagram TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  location_id TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stylists ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'KR';
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS city TEXT;
CREATE INDEX IF NOT EXISTS idx_stylists_user_id ON stylists(user_id);
CREATE INDEX IF NOT EXISTS idx_stylists_location_id ON stylists(location_id);
CREATE INDEX IF NOT EXISTS idx_stylists_is_active ON stylists(is_active);
CREATE INDEX IF NOT EXISTS idx_stylists_country_code ON stylists(country_code);
CREATE INDEX IF NOT EXISTS idx_stylists_country_city ON stylists(country_code, city);

ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stylists are viewable by everyone" ON stylists;
CREATE POLICY "Stylists are viewable by everyone" ON stylists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own stylist profile" ON stylists;
CREATE POLICY "Users can insert their own stylist profile" ON stylists FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Stylists can update their own profile" ON stylists;
CREATE POLICY "Stylists can update their own profile" ON stylists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Stylists can delete their own profile" ON stylists;
CREATE POLICY "Stylists can delete their own profile" ON stylists FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 3. STYLIST_SERVICES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stylist_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  price INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT 60,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stylist_services_stylist_id ON stylist_services(stylist_id);
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Services are viewable by everyone" ON stylist_services;
CREATE POLICY "Services are viewable by everyone" ON stylist_services FOR SELECT USING (true);
DROP POLICY IF EXISTS "Stylists can insert their own services" ON stylist_services;
CREATE POLICY "Stylists can insert their own services" ON stylist_services FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM stylists WHERE stylists.id = stylist_services.stylist_id AND stylists.user_id = auth.uid()));
DROP POLICY IF EXISTS "Stylists can update their own services" ON stylist_services;
CREATE POLICY "Stylists can update their own services" ON stylist_services FOR UPDATE USING (EXISTS (SELECT 1 FROM stylists WHERE stylists.id = stylist_services.stylist_id AND stylists.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM stylists WHERE stylists.id = stylist_services.stylist_id AND stylists.user_id = auth.uid()));
DROP POLICY IF EXISTS "Stylists can delete their own services" ON stylist_services;
CREATE POLICY "Stylists can delete their own services" ON stylist_services FOR DELETE USING (EXISTS (SELECT 1 FROM stylists WHERE stylists.id = stylist_services.stylist_id AND stylists.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- 4. DRESS_ITEMS (dress_vendors가 이미 존재하므로 안전)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dress_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES dress_vendors(id) ON DELETE CASCADE,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_zh TEXT,
  category TEXT NOT NULL DEFAULT 'hanbok',
  price INT NOT NULL DEFAULT 0,
  sizes TEXT[] DEFAULT '{}',
  color TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dress_items_vendor_id ON dress_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dress_items_category ON dress_items(category);
CREATE INDEX IF NOT EXISTS idx_dress_items_is_available ON dress_items(is_available);
CREATE INDEX IF NOT EXISTS idx_dress_items_vendor ON public.dress_items(vendor_id, is_available);

ALTER TABLE dress_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dress items are viewable by everyone" ON dress_items;
CREATE POLICY "Dress items are viewable by everyone" ON dress_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Vendors can insert their own dress items" ON dress_items;
CREATE POLICY "Vendors can insert their own dress items" ON dress_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM dress_vendors WHERE dress_vendors.id = dress_items.vendor_id AND dress_vendors.user_id = auth.uid()));
DROP POLICY IF EXISTS "Vendors can update their own dress items" ON dress_items;
CREATE POLICY "Vendors can update their own dress items" ON dress_items FOR UPDATE USING (EXISTS (SELECT 1 FROM dress_vendors WHERE dress_vendors.id = dress_items.vendor_id AND dress_vendors.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM dress_vendors WHERE dress_vendors.id = dress_items.vendor_id AND dress_vendors.user_id = auth.uid()));
DROP POLICY IF EXISTS "Vendors can delete their own dress items" ON dress_items;
CREATE POLICY "Vendors can delete their own dress items" ON dress_items FOR DELETE USING (EXISTS (SELECT 1 FROM dress_vendors WHERE dress_vendors.id = dress_items.vendor_id AND dress_vendors.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- 5. VENUE_VENDORS & VENUE_ITEMS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.venue_vendors (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_i18n       jsonb DEFAULT '{}',
  bio             text,
  bio_i18n        jsonb DEFAULT '{}',
  location_id     text,
  location_names  jsonb DEFAULT '{}',
  categories      text[] DEFAULT '{}',
  img             text,
  contact_info    jsonb DEFAULT '{}',
  is_active       boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       uuid NOT NULL REFERENCES public.venue_vendors(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_i18n       jsonb DEFAULT '{}',
  category        text NOT NULL CHECK (category IN ('studio','traditional_space','outdoor','urban','event_hall','other')),
  capacity        int DEFAULT 10,
  price           int DEFAULT 0,
  price_unit      text DEFAULT 'per_session' CHECK (price_unit IN ('per_hour','per_session','per_day')),
  images          jsonb DEFAULT '[]',
  description     text,
  description_i18n jsonb DEFAULT '{}',
  amenities       text[] DEFAULT '{}',
  sort_order      int DEFAULT 0,
  is_available    boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "촬영장소업체 공개 조회" ON public.venue_vendors;
CREATE POLICY "촬영장소업체 공개 조회" ON public.venue_vendors FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "촬영장소업체 본인 수정" ON public.venue_vendors;
CREATE POLICY "촬영장소업체 본인 수정" ON public.venue_vendors FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "촬영장소업체 본인 삽입" ON public.venue_vendors;
CREATE POLICY "촬영장소업체 본인 삽입" ON public.venue_vendors FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.venue_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "촬영장소 공개 조회" ON public.venue_items;
CREATE POLICY "촬영장소 공개 조회" ON public.venue_items FOR SELECT USING (is_available = true);
DROP POLICY IF EXISTS "촬영장소 본인 수정" ON public.venue_items;
CREATE POLICY "촬영장소 본인 수정" ON public.venue_items FOR ALL USING (vendor_id IN (SELECT id FROM public.venue_vendors WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_venue_items_vendor ON public.venue_items(vendor_id, is_available);
CREATE INDEX IF NOT EXISTS idx_venue_items_category ON public.venue_items(category, is_available);
CREATE INDEX IF NOT EXISTS idx_venue_vendors_location ON public.venue_vendors(location_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_vendor ON public.bookings(venue_vendor_id);

-- ═══════════════════════════════════════════════════════════
-- 6. BOOKINGS 확장 컬럼
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivery_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivery_memo TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS venue_vendor_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS venue_item_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS venue_price int DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hmk_type text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hmk_option_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dress_item_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS toss_method text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS toss_receipt_url text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount int DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reschedule_request text;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'delivered', 'refunded'));

DROP POLICY IF EXISTS "내 예약 업데이트" ON public.bookings;
CREATE POLICY "내 예약 업데이트" ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- ═══════════════════════════════════════════════════════════
-- 7. REVIEWS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reviews (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id   uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating            int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text              text NOT NULL DEFAULT '',
  author_name       text,
  lang              text DEFAULT 'ko',
  is_visible        boolean DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_unique ON public.reviews (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_photographer ON public.reviews (photographer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews (customer_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "리뷰 공개 조회" ON public.reviews;
CREATE POLICY "리뷰 공개 조회" ON public.reviews FOR SELECT USING (is_visible = true);
DROP POLICY IF EXISTS "리뷰 작성" ON public.reviews;
CREATE POLICY "리뷰 작성" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "리뷰 본인 수정" ON public.reviews;
CREATE POLICY "리뷰 본인 수정" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "리뷰 본인 삭제" ON public.reviews;
CREATE POLICY "리뷰 본인 삭제" ON public.reviews FOR DELETE USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "admin_reviews_select" ON public.reviews;
CREATE POLICY "admin_reviews_select" ON public.reviews FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "admin_reviews_update" ON public.reviews;
CREATE POLICY "admin_reviews_update" ON public.reviews FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rating auto-update trigger
CREATE OR REPLACE FUNCTION public.update_photographer_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
  v_photographer_id uuid;
  v_avg_rating numeric(3,2);
  v_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_photographer_id := OLD.photographer_id;
  ELSE
    v_photographer_id := NEW.photographer_id;
  END IF;

  SELECT COALESCE(AVG(rating)::numeric(3,2), 5.0), COUNT(*)
    INTO v_avg_rating, v_count
    FROM public.reviews
    WHERE photographer_id = v_photographer_id AND is_visible = true;

  UPDATE public.photographers
    SET rating = v_avg_rating, reviews_count = v_count, updated_at = now()
    WHERE id = v_photographer_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD;
  ELSE RETURN NEW;
  END IF;
END;
$func$;

DROP TRIGGER IF EXISTS trg_update_photographer_rating ON public.reviews;
CREATE TRIGGER trg_update_photographer_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_photographer_rating();

-- ═══════════════════════════════════════════════════════════
-- 8. PACKAGE_REVIEWS & PHOTOGRAPHER_REVIEWS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS package_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  package_id UUID,
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT, body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photographer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT, body TEXT, tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pkg_reviews_photographer ON package_reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_pkg_reviews_booking ON package_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_photographer ON photographer_reviews(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_booking ON photographer_reviews(booking_id);

ALTER TABLE package_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read package reviews" ON package_reviews;
CREATE POLICY "Anyone can read package reviews" ON package_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own package reviews" ON package_reviews;
CREATE POLICY "Users can insert their own package reviews" ON package_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Users can update their own package reviews" ON package_reviews;
CREATE POLICY "Users can update their own package reviews" ON package_reviews FOR UPDATE USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Anyone can read photographer reviews" ON photographer_reviews;
CREATE POLICY "Anyone can read photographer reviews" ON photographer_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own photographer reviews" ON photographer_reviews;
CREATE POLICY "Users can insert their own photographer reviews" ON photographer_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Users can update their own photographer reviews" ON photographer_reviews;
CREATE POLICY "Users can update their own photographer reviews" ON photographer_reviews FOR UPDATE USING (auth.uid() = customer_id);

-- ═══════════════════════════════════════════════════════════
-- 9. REVIEW_REPLIES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('package', 'photographer')),
  photographer_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (review_id, review_type)
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_replies(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_replies_photographer ON review_replies(photographer_id);

ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read review replies" ON review_replies;
CREATE POLICY "Anyone can read review replies" ON review_replies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Photographer can insert own replies" ON review_replies;
CREATE POLICY "Photographer can insert own replies" ON review_replies FOR INSERT WITH CHECK (auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Photographer can update own replies" ON review_replies;
CREATE POLICY "Photographer can update own replies" ON review_replies FOR UPDATE USING (auth.uid() = photographer_id);

-- ═══════════════════════════════════════════════════════════
-- 10. CHAT
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  photographer_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_photographer ON chat_rooms(photographer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_customer ON chat_rooms(customer_id);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own chat rooms" ON chat_rooms;
CREATE POLICY "Users can see their own chat rooms" ON chat_rooms FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Users can see messages in their rooms" ON messages;
CREATE POLICY "Users can see messages in their rooms" ON messages FOR SELECT USING (room_id IN (SELECT id FROM chat_rooms WHERE customer_id = auth.uid() OR photographer_id = auth.uid()));
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON messages;
CREATE POLICY "Users can send messages to their rooms" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND room_id IN (SELECT id FROM chat_rooms WHERE customer_id = auth.uid() OR photographer_id = auth.uid()));

-- Realtime (ignore error if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 11. STYLIST_SCHEDULES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stylist_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked','cancelled','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stylist_id, date, time_slot)
);

ALTER TABLE public.stylist_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stylist_schedules_public_read" ON public.stylist_schedules;
CREATE POLICY "stylist_schedules_public_read" ON public.stylist_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "stylist_schedules_self_manage" ON public.stylist_schedules;
CREATE POLICY "stylist_schedules_self_manage" ON public.stylist_schedules FOR ALL USING (auth.uid() = stylist_id) WITH CHECK (auth.uid() = stylist_id);
DROP POLICY IF EXISTS "stylist_schedules_booking_system" ON public.stylist_schedules;
CREATE POLICY "stylist_schedules_booking_system" ON public.stylist_schedules FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stylist_schedule_date ON public.stylist_schedules(stylist_id, date);
CREATE INDEX IF NOT EXISTS idx_stylist_schedule_booking ON public.stylist_schedules(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stylist_schedule_status ON public.stylist_schedules(stylist_id, status, date);

CREATE OR REPLACE FUNCTION update_stylist_schedule_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS stylist_schedule_updated_at ON public.stylist_schedules;
CREATE TRIGGER stylist_schedule_updated_at BEFORE UPDATE ON public.stylist_schedules FOR EACH ROW EXECUTE FUNCTION update_stylist_schedule_timestamp();

-- ═══════════════════════════════════════════════════════════
-- 12. STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',    'avatars',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('portfolios', 'portfolios', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('dresses',    'dresses',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

-- avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- portfolios
DROP POLICY IF EXISTS "portfolios_public_read" ON storage.objects;
CREATE POLICY "portfolios_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'portfolios');
DROP POLICY IF EXISTS "portfolios_owner_insert" ON storage.objects;
CREATE POLICY "portfolios_owner_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "portfolios_owner_update" ON storage.objects;
CREATE POLICY "portfolios_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "portfolios_owner_delete" ON storage.objects;
CREATE POLICY "portfolios_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- dresses
DROP POLICY IF EXISTS "dresses_public_read" ON storage.objects;
CREATE POLICY "dresses_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'dresses');
DROP POLICY IF EXISTS "dresses_owner_insert" ON storage.objects;
CREATE POLICY "dresses_owner_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dresses' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "dresses_owner_update" ON storage.objects;
CREATE POLICY "dresses_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'dresses' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "dresses_owner_delete" ON storage.objects;
CREATE POLICY "dresses_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'dresses' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════
-- 13. RLS HARDENING (safe with IF NOT EXISTS checks)
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '본인 프로필 삽입') THEN
    CREATE POLICY "본인 프로필 삽입" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '고객 예약 수정') THEN
    CREATE POLICY "고객 예약 수정" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '작가 예약 수정') THEN
    CREATE POLICY "작가 예약 수정" ON public.bookings FOR UPDATE USING (photographer_id IN (SELECT id FROM public.photographers WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '작가 본인 삭제') THEN
    CREATE POLICY "작가 본인 삭제" ON public.photographers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dress_vendors' AND policyname = '의상업체 본인 삭제') THEN
    CREATE POLICY "의상업체 본인 삭제" ON public.dress_vendors FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '관리자 전체 조회') THEN
    CREATE POLICY "관리자 전체 조회" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 전체 조회') THEN
    CREATE POLICY "관리자 예약 전체 조회" ON public.bookings FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 수정') THEN
    CREATE POLICY "관리자 예약 수정" ON public.bookings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '관리자 작가 전체 조회') THEN
    CREATE POLICY "관리자 작가 전체 조회" ON public.photographers FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 14. 누락 테이블: user_roles (멀티롤 시스템)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL,
  status      text DEFAULT 'active' CHECK (status IN ('active','pending','suspended')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_self_read" ON public.user_roles;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_roles_self_insert" ON public.user_roles;
CREATE POLICY "user_roles_self_insert" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_roles_self_update" ON public.user_roles;
CREATE POLICY "user_roles_self_update" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_roles_admin_read" ON public.user_roles;
CREATE POLICY "user_roles_admin_read" ON public.user_roles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- 15. 누락 테이블: notifications (알림 시스템)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text,
  body        text,
  data        jsonb DEFAULT '{}',
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_self_read" ON public.notifications;
CREATE POLICY "notifications_self_read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_self_update" ON public.notifications;
CREATE POLICY "notifications_self_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 16. 누락 테이블: vendor_reviews (벤더 리뷰)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vendor_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     uuid NOT NULL,
  vendor_type   text NOT NULL CHECK (vendor_type IN ('dress','venue','stylist')),
  booking_id    uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text          text DEFAULT '',
  author_name   text,
  lang          text DEFAULT 'ko',
  is_visible    boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor ON public.vendor_reviews(vendor_id, vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_customer ON public.vendor_reviews(customer_id);
ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_reviews_public_read" ON public.vendor_reviews;
CREATE POLICY "vendor_reviews_public_read" ON public.vendor_reviews FOR SELECT USING (is_visible = true);
DROP POLICY IF EXISTS "vendor_reviews_insert" ON public.vendor_reviews;
CREATE POLICY "vendor_reviews_insert" ON public.vendor_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "vendor_reviews_self_update" ON public.vendor_reviews;
CREATE POLICY "vendor_reviews_self_update" ON public.vendor_reviews FOR UPDATE USING (auth.uid() = customer_id);

-- ═══════════════════════════════════════════════════════════
-- 17. 누락 테이블: vendor_dresses (벤더 의상 — dress_items alias)
-- ═══════════════════════════════════════════════════════════

-- vendor_dresses는 코드에서 사용하지만 실제로는 dress_items와 같은 구조
-- 뷰로 생성하여 호환성 유지
CREATE OR REPLACE VIEW public.vendor_dresses AS
  SELECT * FROM public.dress_items;

-- ============================================================
-- PATCH MIGRATION COMPLETE
-- user_roles, notifications, vendor_reviews 테이블 추가 완료
-- 모든 정책 DROP IF EXISTS → CREATE로 안전하게 재실행 가능
-- ============================================================
