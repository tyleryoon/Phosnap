-- Seed SQL for Photographers Table
-- Converts mock data from photographers.js to Supabase
-- Date: 2026-04-12
-- This file inserts all 26 photographers with full data mapping

-- Waitlist table (if not exists)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  lang TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert Photographers (with ON CONFLICT DO NOTHING for idempotency)
INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 1, 'Mina J.', '정미나', 'kyoto',
  '{"ko": "교토 · 오사카", "en": "Kyoto · Osaka", "ja": "京都・大阪", "zh": "京都・大阪"}',
  'JP', 'kyoto', ARRAY['wedding', 'outdoor', 'couple'], ARRAY['wedding', 'outdoor', 'couple'],
  ARRAY['KO', 'JP', 'EN'], ARRAY['kimono', 'hmu', 'golden_hour'],
  true, 4.9, 142, 280000,
  ARRAY[
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80',
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=800&q=80',
  'Working at the edge of light and moment. I capture your story in Kyoto''s alleys, shrines, and under cherry blossoms.',
  '빛과 순간의 경계에서 작업합니다. 교토의 골목과 신사, 벚꽃 아래서 당신의 이야기를 담아드립니다.',
  '[{"name":"Snapshot","price":180000,"hours":1,"photos":30,"desc":"가볍게 1시간, 핵심 장면 위주의 스냅"},{"name":"Story","price":280000,"hours":2,"photos":60,"desc":"충분한 시간으로 자연스러운 순간들을 담아냅니다","popular":true},{"name":"Full Day","price":480000,"hours":4,"photos":120,"desc":"하루 종일 함께하며 모든 순간을 기록합니다"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 2, 'Seo H.', '서혜원', 'seoul',
  '{"ko": "서울 · 제주", "en": "Seoul · Jeju", "ja": "ソウル・済州", "zh": "首尔·济州"}',
  'KR', 'seoul', ARRAY['wedding', 'birthday1st', 'indoor'], ARRAY['wedding', 'birthday1st', 'indoor'],
  ARRAY['KO', 'EN', 'CN'], ARRAY['hanbok', 'hmu'],
  true, 4.8, 98, 220000,
  ARRAY[
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80',
    'https://images.unsplash.com/photo-1529636444744-adffc9135a5e?w=600&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    'https://images.unsplash.com/photo-1595407416011-cdfae46e0aad?w=600&q=80',
    'https://images.unsplash.com/photo-1597775169066-4ae81c2bfa9a?w=600&q=80',
    'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80',
  'I''ve captured every season of Seoul. From Gyeongbokgung to the alleys of Ikseon-dong — your story, in your space.',
  '서울의 모든 계절을 담아왔습니다. 경복궁부터 익선동 골목까지, 당신만의 공간에서 당신만의 이야기를.',
  '[{"name":"Light","price":150000,"hours":1,"photos":25,"desc":"핵심 장면 선별 촬영"},{"name":"Standard","price":220000,"hours":2,"photos":50,"desc":"2시간 기본 스냅","popular":true},{"name":"Premium","price":380000,"hours":4,"photos":100,"desc":"4시간 프리미엄 스냅 + 보정 강화"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 3, 'David C.', '최준영', 'tokyo',
  '{"ko": "도쿄 · 오사카", "en": "Tokyo · Osaka", "ja": "東京・大阪", "zh": "东京・大阪"}',
  'JP', 'tokyo', ARRAY['wedding', 'outdoor', 'video'], ARRAY['wedding', 'outdoor', 'video'],
  ARRAY['EN', 'JP', 'KO'], ARRAY['instant_booking', 'golden_hour', 'photo_tour'],
  true, 4.7, 87, 300000,
  ARRAY[
    'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=600&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Cinematic storyteller capturing Tokyo''s dynamic energy through film and stills.',
  '도쿄의 에너지를 영화적으로 담아내는 포토그래퍼입니다.',
  '[{"name":"Essentials","price":200000,"hours":2,"photos":40,"desc":"핵심 2시간 영상+스틸"},{"name":"Full Experience","price":350000,"hours":4,"photos":80,"desc":"4시간 풀 패키지","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 4, 'Emma P.', '박채영', 'paris',
  '{"ko": "파리", "en": "Paris", "ja": "パリ", "zh": "巴黎"}',
  'FR', 'paris', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['EN', 'FR', 'KO'], ARRAY['golden_hour', 'instant_booking'],
  true, 4.9, 156, 450000,
  ARRAY[
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
  'Parisian moments, timeless memories. Specializing in romantic storytelling.',
  '파리의 로맨틱한 순간들을 영원히 담아냅니다.',
  '[{"name":"Romance Package","price":400000,"hours":3,"photos":60,"desc":"파리 3시간 스냅","popular":true},{"name":"Full Day Paris","price":700000,"hours":8,"photos":150,"desc":"종일 촬영"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 5, 'Marco R.', '로드리게스', 'rome',
  '{"ko": "로마", "en": "Rome", "ja": "ローマ", "zh": "罗马"}',
  'IT', 'rome', ARRAY['wedding', 'couple', 'landmark'], ARRAY['wedding', 'couple', 'landmark'],
  ARRAY['EN', 'IT', 'ES'], ARRAY['golden_hour'],
  false, 4.8, 112, 380000,
  ARRAY[
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
  'Eternal city, eternal moments. Capturing love in Rome''s historic backdrop.',
  '로마의 영원한 배경에서 사랑을 담아냅니다.',
  '[{"name":"Roman Holiday","price":350000,"hours":3,"photos":70,"desc":"로마 3시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 6, 'Sophie M.', '쌍피아', 'santorini',
  '{"ko": "산토리니", "en": "Santorini", "ja": "サントリーニ", "zh": "圣托里尼"}',
  'GR', 'santorini', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['EN', 'FR', 'DE'], ARRAY['golden_hour', 'instant_booking'],
  true, 4.9, 134, 500000,
  ARRAY[
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Santorini sunsets and timeless love. Creating magic in the Aegean islands.',
  '산토리니의 선셋과 사랑을 담아냅니다.',
  '[{"name":"Sunset Magic","price":450000,"hours":3,"photos":80,"desc":"선셋 3시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 7, 'James T.', '토마스', 'barcelona',
  '{"ko": "바르셀로나", "en": "Barcelona", "ja": "バルセロナ", "zh": "巴塞罗那"}',
  'ES', 'barcelona', ARRAY['wedding', 'outdoor', 'couple'], ARRAY['wedding', 'outdoor', 'couple'],
  ARRAY['EN', 'ES', 'FR'], ARRAY['instant_booking'],
  true, 4.7, 98, 320000,
  ARRAY[
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Barcelona''s creative energy meets timeless moments. Modern storytelling.',
  '바르셀로나의 창의적 에너지를 담아냅니다.',
  '[{"name":"Gaudí Moments","price":300000,"hours":2.5,"photos":60,"desc":"바르셀로나 2.5시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 8, 'Lucia V.', '루시아', 'prague',
  '{"ko": "프라하", "en": "Prague", "ja": "プラハ", "zh": "布拉格"}',
  'CZ', 'prague', ARRAY['wedding', 'couple', 'indoor'], ARRAY['wedding', 'couple', 'indoor'],
  ARRAY['EN', 'CZ', 'DE'], ARRAY['golden_hour'],
  false, 4.6, 76, 280000,
  ARRAY[
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
  'Prague''s fairy tale charm captured through intimate photography.',
  '프라하의 동화 같은 순간들을 담아냅니다.',
  '[{"name":"Prague Charm","price":250000,"hours":2,"photos":50,"desc":"프라하 2시간"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 9, 'Yuki K.', '유키 쿠보타', 'sapporo',
  '{"ko": "삿포로", "en": "Sapporo", "ja": "札幌", "zh": "札幌"}',
  'JP', 'sapporo', ARRAY['wedding', 'outdoor', 'portrait'], ARRAY['wedding', 'outdoor', 'portrait'],
  ARRAY['JP', 'EN', 'KO'], ARRAY['kimono', 'hmu'],
  true, 4.8, 105, 260000,
  ARRAY[
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Hokkaido''s natural beauty meets artistic vision. Winter and spring specialist.',
  '홋카이도의 자연과 예술을 담아냅니다.',
  '[{"name":"Sapporo Dreams","price":240000,"hours":2,"photos":50,"desc":"삿포로 2시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 10, 'Aiko S.', '아이코', 'osaka',
  '{"ko": "오사카", "en": "Osaka", "ja": "大阪", "zh": "大阪"}',
  'JP', 'osaka', ARRAY['wedding', 'couple', 'portrait'], ARRAY['wedding', 'couple', 'portrait'],
  ARRAY['JP', 'EN'], ARRAY['instant_booking', 'hmu'],
  true, 4.7, 89, 240000,
  ARRAY[
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Osaka vibrance and intimate moments beautifully blended.',
  '오사카의 활기와 친밀함을 담아냅니다.',
  '[{"name":"Osaka Joy","price":220000,"hours":2,"photos":45,"desc":"오사카 2시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 11, 'Kenji Y.', '켄지', 'fukuoka',
  '{"ko": "후쿠오카", "en": "Fukuoka", "ja": "福岡", "zh": "福冈"}',
  'JP', 'fukuoka', ARRAY['wedding', 'couple', 'indoor'], ARRAY['wedding', 'couple', 'indoor'],
  ARRAY['JP', 'KO', 'EN'], ARRAY['golden_hour'],
  false, 4.6, 67, 200000,
  ARRAY[
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Fukuoka warmth and natural light specialists.',
  '후쿠오카의 따뜻함을 담아냅니다.',
  '[{"name":"Fukuoka Warmth","price":180000,"hours":2,"photos":40,"desc":"후쿠오카 2시간"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 12, 'Min K.', '김민정', 'jeju',
  '{"ko": "제주", "en": "Jeju", "ja": "済州", "zh": "济州"}',
  'KR', 'jeju', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['KO', 'EN', 'JP'], ARRAY['instant_booking', 'golden_hour', 'photo_tour'],
  true, 4.9, 176, 250000,
  ARRAY[
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80',
  'Jeju island specialist. Nature, ocean, and timeless moments.',
  '제주의 자연과 바다를 담아내는 전문가입니다.',
  '[{"name":"Jeju Essence","price":220000,"hours":2.5,"photos":60,"desc":"제주 2.5시간","popular":true},{"name":"Island Adventure","price":380000,"hours":4,"photos":100,"desc":"제주 4시간 풀패키지"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 13, 'Sung J.', '성준혁', 'busan',
  '{"ko": "부산", "en": "Busan", "ja": "釜山", "zh": "釜山"}',
  'KR', 'busan', ARRAY['wedding', 'outdoor', 'couple'], ARRAY['wedding', 'outdoor', 'couple'],
  ARRAY['KO', 'EN'], ARRAY['hanbok', 'instant_booking'],
  true, 4.8, 134, 210000,
  ARRAY[
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Busan beach and city romance combined beautifully.',
  '부산의 해변과 도시 로맨스를 담아냅니다.',
  '[{"name":"Beach Moments","price":190000,"hours":2,"photos":45,"desc":"부산 해변 2시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 14, 'Hae S.', '해수진', 'gangneung',
  '{"ko": "강릉", "en": "Gangneung", "ja": "江陵", "zh": "江陵"}',
  'KR', 'gangneung', ARRAY['couple', 'outdoor', 'portrait'], ARRAY['couple', 'outdoor', 'portrait'],
  ARRAY['KO', 'EN'], ARRAY['golden_hour', 'photo_tour'],
  false, 4.7, 85, 180000,
  ARRAY[
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Gangneung''s coastal beauty and mountain serenity.',
  '강릉의 해안과 산의 아름다움을 담아냅니다.',
  '[{"name":"Gangneung Escape","price":160000,"hours":2,"photos":40,"desc":"강릉 2시간"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 15, 'Ji W.', '지윤주', 'sokcho',
  '{"ko": "속초", "en": "Sokcho", "ja": "束草", "zh": "束草"}',
  'KR', 'sokcho', ARRAY['couple', 'outdoor', 'portrait'], ARRAY['couple', 'outdoor', 'portrait'],
  ARRAY['KO', 'EN'], ARRAY['instant_booking'],
  true, 4.6, 72, 170000,
  ARRAY[
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Sokcho mountain and beach fusion photography.',
  '속초의 산과 바다를 함께 담아냅니다.',
  '[{"name":"Sokcho Trail","price":150000,"hours":1.5,"photos":35,"desc":"속초 1.5시간"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 16, 'Tae K.', '태경식', 'yeosu',
  '{"ko": "여수", "en": "Yeosu", "ja": "麗水", "zh": "丽水"}',
  'KR', 'yeosu', ARRAY['couple', 'outdoor', 'romantic'], ARRAY['couple', 'outdoor', 'romantic'],
  ARRAY['KO'], ARRAY['golden_hour', 'photo_tour'],
  false, 4.7, 91, 200000,
  ARRAY[
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Yeosu''s night lights and romantic atmosphere.',
  '여수의 야경과 낭만을 담아냅니다.',
  '[{"name":"Yeosu Night","price":180000,"hours":2,"photos":45,"desc":"여수 야경 2시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 17, 'Jae L.', '이재훈', 'gyeongju',
  '{"ko": "경주", "en": "Gyeongju", "ja": "慶州", "zh": "庆州"}',
  'KR', 'gyeongju', ARRAY['couple', 'landmark', 'outdoor'], ARRAY['couple', 'landmark', 'outdoor'],
  ARRAY['KO', 'EN'], ARRAY['hanbok', 'golden_hour'],
  true, 4.8, 110, 220000,
  ARRAY[
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Gyeongju''s ancient temples and historic beauty.',
  '경주의 문화유산과 역사를 담아냅니다.',
  '[{"name":"Historic Gyeongju","price":200000,"hours":2.5,"photos":55,"desc":"경주 2.5시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 18, 'Bo R.', '지보라', 'jeonju',
  '{"ko": "전주", "en": "Jeonju", "ja": "全州", "zh": "全州"}',
  'KR', 'jeonju', ARRAY['couple', 'portrait', 'indoor'], ARRAY['couple', 'portrait', 'indoor'],
  ARRAY['KO'], ARRAY['hmu', 'instant_booking'],
  true, 4.6, 68, 180000,
  ARRAY[
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Jeonju hanok village and cultural photography.',
  '전주 한옥마을의 문화를 담아냅니다.',
  '[{"name":"Hanok Village","price":170000,"hours":1.5,"photos":40,"desc":"전주 1.5시간"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 19, 'Eun C.', '최은실', 'incheon',
  '{"ko": "인천", "en": "Incheon", "ja": "仁川", "zh": "仁川"}',
  'KR', 'incheon', ARRAY['wedding', 'couple', 'indoor'], ARRAY['wedding', 'couple', 'indoor'],
  ARRAY['KO', 'EN'], ARRAY['instant_booking'],
  true, 4.7, 95, 190000,
  ARRAY[
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Incheon studio and location photography.',
  '인천의 스튜디오와 야외 촬영을 담당합니다.',
  '[{"name":"Incheon Studio","price":160000,"hours":2,"photos":40,"desc":"인천 2시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 20, 'Noa L.', '로아', 'danang',
  '{"ko": "다낭", "en": "Da Nang", "ja": "ダナン", "zh": "岘港"}',
  'VN', 'danang', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['EN', 'VI', 'KO'], ARRAY['golden_hour', 'instant_booking'],
  true, 4.8, 102, 280000,
  ARRAY[
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Da Nang tropical beauty and golden hour specialist.',
  '다낭의 열대 아름다움을 담아냅니다.',
  '[{"name":"Danang Sunset","price":260000,"hours":2.5,"photos":60,"desc":"다낭 2.5시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 21, 'Lila P.', '릴라', 'bali',
  '{"ko": "발리", "en": "Bali", "ja": "バリ", "zh": "巴厘岛"}',
  'ID', 'bali', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['EN', 'ID', 'JP'], ARRAY['golden_hour', 'photo_tour', 'instant_booking'],
  true, 4.9, 145, 350000,
  ARRAY[
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Bali''s paradise beauty and temple spirituality combined.',
  '발리의 아름다움과 영성을 담아냅니다.',
  '[{"name":"Temple Rituals","price":320000,"hours":3,"photos":70,"desc":"발리 사찰 3시간","popular":true},{"name":"Island Adventure","price":500000,"hours":5,"photos":120,"desc":"발리 5시간 풀패키지"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 22, 'Kai H.', '카이', 'hawaii',
  '{"ko": "하와이", "en": "Hawaii", "ja": "ハワイ", "zh": "夏威夷"}',
  'US', 'hawaii', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['EN', 'JP', 'KO'], ARRAY['golden_hour', 'instant_booking', 'photo_tour'],
  true, 4.9, 167, 420000,
  ARRAY[
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Hawaii beach weddings and tropical paradise moments.',
  '하와이의 비치 웨딩과 열대 낙원을 담아냅니다.',
  '[{"name":"Beach Vows","price":380000,"hours":3,"photos":80,"desc":"하와이 비치 3시간","popular":true},{"name":"Aloha Experience","price":600000,"hours":5,"photos":130,"desc":"하와이 5시간 풀패키지"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 23, 'Rio M.', '리오', 'guam',
  '{"ko": "괌", "en": "Guam", "ja": "グアム", "zh": "关岛"}',
  'US', 'guam', ARRAY['wedding', 'couple', 'outdoor'], ARRAY['wedding', 'couple', 'outdoor'],
  ARRAY['EN', 'JP'], ARRAY['golden_hour'],
  true, 4.7, 84, 300000,
  ARRAY[
    'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Guam tropical island photography and celebrations.',
  '괌의 열대 섬 분위기를 담아냅니다.',
  '[{"name":"Tropical Escape","price":280000,"hours":2.5,"photos":60,"desc":"괌 2.5시간","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 24, 'Ethan S.', '에단', 'newyork',
  '{"ko": "뉴욕", "en": "New York", "ja": "ニューヨーク", "zh": "纽约"}',
  'US', 'newyork', ARRAY['wedding', 'couple', 'urban'], ARRAY['wedding', 'couple', 'urban'],
  ARRAY['EN', 'FR'], ARRAY['instant_booking'],
  true, 4.8, 128, 450000,
  ARRAY[
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'NYC urban chic and skyline romance photographer.',
  '뉴욕의 도시 에너지와 로맨스를 담아냅니다.',
  '[{"name":"NYC Skyline","price":420000,"hours":3,"photos":75,"desc":"뉴욕 3시간","popular":true},{"name":"Full Manhattan","price":700000,"hours":6,"photos":150,"desc":"뉴욕 6시간 풀패키지"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 25, 'Do H.', '도현수', 'jeju',
  '{"ko": "제주", "en": "Jeju", "ja": "済州", "zh": "济州"}',
  'KR', 'jeju', ARRAY['wedding', 'video', 'drone'], ARRAY['wedding', 'video', 'drone'],
  ARRAY['KO', 'EN', 'JP'], ARRAY['instant_booking', 'photo_tour'],
  true, 4.9, 156, 400000,
  ARRAY[
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Jeju video and drone specialist. Cinematic storytelling.',
  '제주의 영상미와 드론 촬영 전문가입니다.',
  '[{"name":"Sunrise","price":180000,"hours":2,"photos":50,"desc":"성산일출봉 일출 + 오름 투어"},{"name":"Jeju Video","price":250000,"hours":3.5,"photos":85,"desc":"드론 + 스틸 혼합 풀코스","popular":true}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;

INSERT INTO photographers (
  id, legacy_id, name_en, name_ko, location_id, location_names,
  country_code, city, genre, tags, languages, snap_filters,
  instant_booking, rating, review_count, base_price,
  images, avatar, bio_en, bio_ko, packages,
  is_active, created_at
) VALUES
(
  gen_random_uuid(), 26, 'Na Y.', '나영윤', 'seoul',
  '{"ko": "서울", "en": "Seoul", "ja": "ソウル", "zh": "首尔"}',
  'KR', 'seoul', ARRAY['wedding', 'indoor', 'ceremony'], ARRAY['wedding', 'indoor', 'ceremony'],
  ARRAY['KO', 'EN'], ARRAY['hmu', 'instant_booking'],
  true, 4.8, 119, 300000,
  ARRAY[
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80'
  ],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Seoul indoor wedding and ceremonial photography specialist.',
  '서울의 실내 웨딩 촬영 전문가입니다.',
  '[{"name":"Ceremony Package","price":280000,"hours":3,"photos":70,"desc":"예식 3시간","popular":true},{"name":"Full Day Wedding","price":500000,"hours":8,"photos":180,"desc":"신부 준비부터 폐식까지 종일 촬영"}]'::jsonb,
  true, now()
) ON CONFLICT (legacy_id) DO NOTHING;
