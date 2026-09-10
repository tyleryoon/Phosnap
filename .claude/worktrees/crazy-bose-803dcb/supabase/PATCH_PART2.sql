-- ============================================================
-- PHOSNAP PATCH Part 2: 함수 + 트리거 + DO 블록
-- (Part 1 실행 후 이것을 실행하세요)
-- ============================================================

-- 1. 리뷰 평점 자동 업데이트 함수
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
CREATE TRIGGER trg_update_photographer_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_photographer_rating();

-- 2. 스타일리스트 스케줄 타임스탬프 함수
CREATE OR REPLACE FUNCTION update_stylist_schedule_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $ts$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ts$;

DROP TRIGGER IF EXISTS stylist_schedule_updated_at ON public.stylist_schedules;
CREATE TRIGGER stylist_schedule_updated_at
  BEFORE UPDATE ON public.stylist_schedules
  FOR EACH ROW EXECUTE FUNCTION update_stylist_schedule_timestamp();

-- 3. Realtime 구독
DO $rt$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rt$;

DO $rt2$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rt2$;

-- 4. RLS 보강 (조건부 생성)
DO $p1$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '본인 프로필 삽입') THEN
    CREATE POLICY "본인 프로필 삽입" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $p1$;

DO $p2$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '고객 예약 수정') THEN
    CREATE POLICY "고객 예약 수정" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '작가 예약 수정') THEN
    CREATE POLICY "작가 예약 수정" ON public.bookings FOR UPDATE USING (photographer_id IN (SELECT id FROM public.photographers WHERE user_id = auth.uid()));
  END IF;
END $p2$;

DO $p3$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '작가 본인 삭제') THEN
    CREATE POLICY "작가 본인 삭제" ON public.photographers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $p3$;

DO $p4$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dress_vendors' AND policyname = '의상업체 본인 삭제') THEN
    CREATE POLICY "의상업체 본인 삭제" ON public.dress_vendors FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $p4$;

DO $p5$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = '관리자 전체 조회') THEN
    CREATE POLICY "관리자 전체 조회" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $p5$;

DO $p6$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 전체 조회') THEN
    CREATE POLICY "관리자 예약 전체 조회" ON public.bookings FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = '관리자 예약 수정') THEN
    CREATE POLICY "관리자 예약 수정" ON public.bookings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $p6$;

DO $p7$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photographers' AND policyname = '관리자 작가 전체 조회') THEN
    CREATE POLICY "관리자 작가 전체 조회" ON public.photographers FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $p7$;

-- ✅ Part 2 완료! 마이그레이션 전체 완료.
