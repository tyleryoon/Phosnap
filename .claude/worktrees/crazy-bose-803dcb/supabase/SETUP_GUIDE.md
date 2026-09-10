# Phosnap Supabase 설정 가이드

## 준비물
- Supabase 프로젝트: `https://znjkyvijjlahsxczweqh.supabase.co`
- 왼쪽 사이드바에서 **SQL Editor** 아이콘 클릭

---

## 실행 순서 (총 5단계)

> 각 단계마다 **New Query** 버튼 눌러서 새 쿼리창 열고, 해당 SQL 파일 내용을 복사 → 붙여넣기 → **Run** 클릭

### Step 1. 기본 테이블 생성 (필수)

**파일:** `supabase/schema.sql`

이걸 먼저 실행하면 아래 6개 테이블이 만들어져:
- `profiles` — 회원 프로필 (가입 시 자동 생성)
- `photographers` — 작가 프로필
- `artist_locations` — 작가 활동 지역
- `artist_schedules` — 작가 일정
- `artist_defaults` — 기본 운영시간
- `bookings` — 예약
- `waitlist` — 대기자 명단

+ RLS 보안 정책 + 인덱스 + 자동 트리거

---

### Step 2. 의상 대여 업체 시스템 (필수)

**파일:** `supabase/migration_dress_vendor_v1.sql`

벤더 대쉬보드에 필요한 핵심 테이블:
- `dress_vendors` — 의상 대여 업체 프로필
- `dress_items` — 개별 의상 아이템

+ `profiles.role`에 'dress_vendor' 추가
+ `bookings`에 의상 관련 컬럼 추가
+ RLS + 인덱스

---

### Step 3. Storage 버킷 (이미지 업로드용)

**파일:** `supabase/migration_storage_buckets_v1.sql`

3개 이미지 저장소 생성:
- `avatars` — 프로필 사진
- `portfolios` — 작가 포트폴리오
- `dresses` — 의상 사진

---

### Step 4. 추가 기능 마이그레이션 (선택)

아래 파일들은 **필요할 때** 하나씩 실행하면 돼. 지금 당장 없어도 기본 동작은 해.

| 순서 | 파일 | 뭘 추가하는지 |
|------|------|--------------|
| 4-1 | `migration_bookings_v2.sql` | 예약에 작가이름, 메모, 언어 컬럼 |
| 4-2 | `migration_bookings_v3.sql` | 예약 취소/일정변경 기능 |
| 4-3 | `migration_bookings_v4.sql` | 작가 승인/거절 기능 |
| 4-4 | `migration_bookings_v5_payment_verify.sql` | 토스페이먼츠 결제 검증 |
| 4-5 | `migration_profiles_artist_v1.sql` | 작가 뱃지, 추천인 시스템 |
| 4-6 | `migration_rls_hardening_v1.sql` | 보안 정책 강화 |
| 4-7 | `migration_reviews_v2.sql` | 패키지/작가 리뷰 |
| 4-8 | `migration_packages_schedules_v1.sql` | 패키지 테이블 + 예약 만료 |
| 4-9 | `migration_stylists_dresses_v1.sql` | 스타일리스트 시스템 |
| 4-10 | `migration_location_system_v1.sql` | 국가/도시 필터링 |
| 4-11 | `migration_chat_v1.sql` | 실시간 채팅 |

---

### Step 5. 샘플 데이터 (선택)

**파일:** `supabase/seed_photographers_v1.sql`

26명의 샘플 작가 데이터를 넣어줘. 개발/테스트 할 때 유용.

---

## 실행 방법 (스크린샷 기준)

1. Supabase 대시보드 왼쪽 사이드바 → **SQL Editor** (코드 아이콘)
2. **New Query** 버튼 클릭
3. 위 순서대로 파일 내용을 복사 → 붙여넣기
4. **Run** (또는 Cmd+Enter) 클릭
5. "Success. No rows returned" 뜨면 성공!
6. 다음 Step으로 넘어가기

---

## 확인 방법

실행 후 왼쪽 사이드바 → **Table Editor** (표 아이콘) 클릭하면 생성된 테이블들이 보여야 해.

## 주의사항

- **Step 1 → Step 2 순서 반드시 지켜야 해** (Step 2가 Step 1 테이블을 참조함)
- Step 3은 Step 1,2와 독립적이라 순서 상관없어
- Step 4는 반드시 4-1 → 4-2 → ... 순서대로
- 같은 파일을 두 번 실행해도 `IF NOT EXISTS`가 있어서 에러 안 남 (일부 정책 중복 에러는 무시해도 됨)
