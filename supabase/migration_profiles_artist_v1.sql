-- ══════════════════════════════════════════════════════════════════════
-- Phosnap · profiles 테이블 작가 확장 마이그레이션 v1
-- Supabase SQL Editor에서 새 탭(+버튼)으로 실행해주세요
-- ══════════════════════════════════════════════════════════════════════

-- 1. profiles 테이블에 작가 관련 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS artist_type        TEXT,        -- 'photographer' | 'videographer' | 'both' | 'hmk'
  ADD COLUMN IF NOT EXISTS has_hmk_partner    BOOLEAN DEFAULT FALSE,  -- 자체 H&M 섭외 동행 여부
  ADD COLUMN IF NOT EXISTS referral_code      TEXT UNIQUE, -- 이 작가의 초대코드 (자동 생성)
  ADD COLUMN IF NOT EXISTS referred_by_code   TEXT,        -- 가입 시 입력한 초대코드
  ADD COLUMN IF NOT EXISTS referral_count     INTEGER DEFAULT 0,  -- 내가 초대한 사람 수
  ADD COLUMN IF NOT EXISTS referral_completed INTEGER DEFAULT 0,  -- 초대한 사람들의 누적 완료 건수
  ADD COLUMN IF NOT EXISTS completed_bookings INTEGER DEFAULT 0,  -- 내 누적 완료 건수 (배지 기준)
  ADD COLUMN IF NOT EXISTS badge              TEXT DEFAULT 'rising'; -- 'rising'|'established'|'premier'|'elite'

-- 2. badge 자동 업데이트 함수
-- completed_bookings 값에 따라 배지 자동 갱신
CREATE OR REPLACE FUNCTION update_artist_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_bookings >= 60 THEN
    NEW.badge := 'elite';
  ELSIF NEW.completed_bookings >= 30 THEN
    NEW.badge := 'premier';
  ELSIF NEW.completed_bookings >= 10 THEN
    NEW.badge := 'established';
  ELSE
    NEW.badge := 'rising';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 트리거 연결 (이미 있으면 교체)
DROP TRIGGER IF EXISTS trigger_update_artist_badge ON profiles;
CREATE TRIGGER trigger_update_artist_badge
  BEFORE UPDATE OF completed_bookings ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_artist_badge();

-- 4. 수수료 할인 계산 함수
-- referral_completed 값으로 할인율 반환
CREATE OR REPLACE FUNCTION get_referral_discount(p_referral_completed INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF p_referral_completed >= 10 THEN
    RETURN 0.05;  -- 5% 할인
  ELSIF p_referral_completed >= 5 THEN
    RETURN 0.02;  -- 2% 할인
  ELSE
    RETURN 0.00;  -- 할인 없음
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. RLS: 작가 본인만 자신의 프로필 수정 가능 (이미 있으면 생략)
-- profiles 테이블에 RLS가 없다면 아래 활성화
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 기존 RLS 정책이 있으면 중복 오류 발생할 수 있으므로 CREATE POLICY는 주석 처리
-- 이미 profiles에 RLS 정책이 있다면 아래는 건너뛰세요:
/*
CREATE POLICY "프로필 본인 수정" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "프로필 읽기 허용" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "프로필 삽입" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
*/

-- ✅ 실행 완료 확인용 쿼리
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('artist_type','has_hmk_partner','referral_code','referred_by_code',
                      'referral_count','referral_completed','completed_bookings','badge')
ORDER BY column_name;
