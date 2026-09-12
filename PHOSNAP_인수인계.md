# PhoSnap 프로젝트 인수인계 문서

> **백업 작성일: 2026년 9월 12일** (권한 정리 · 승인/문의 시스템 반영)
> 이 문서 하나만 읽으면 다른 AI 플랫폼(ChatGPT, Gemini, Cursor 등)에서도
> 맥락 손실 없이 작업을 이어갈 수 있도록 작성했다.
> 프로젝트를 처음 보는 사람/AI를 독자로 가정한다.

---

## 0. 이 문서 사용법 (AI에게 주는 지시)

다른 AI에게 작업을 맡길 때 이 문서를 통째로 붙여넣고 다음과 같이 요청하면 된다.

```
아래는 내가 만들고 있는 PhoSnap이라는 사진작가 예약 플랫폼의 인수인계 문서야.
이 문서를 먼저 다 읽고, 프로젝트 구조와 지금까지 발견된 함정들을 파악한 다음
[하고 싶은 작업]을 진행해줘.

특히 "5. 반드시 지켜야 할 규칙"과 "6. 과거에 발목 잡았던 함정들"은
같은 실수를 반복하지 않기 위한 것이니 꼭 지켜줘.
```

---

## 1. 서비스 개요

**PhoSnap(포스냅)** — 전 세계 어디서든 사진작가를 찾아 스냅 촬영을 예약하는 플랫폼.
여행지 스냅, 웨딩, 커플, 가족 촬영 등을 다룬다.

### 참여 주체 4종

| 역할 | 하는 일 | 로그인 후 진입 경로 |
|---|---|---|
| **고객 (customer)** | 작가 검색 → 예약 → 결제 → 리뷰 | `/my` (마이페이지) |
| **작가 (artist)** | 프로필·포트폴리오·상품·스케줄 등록, 예약 승인 | `/artist/dashboard` |
| **헤메 (stylist)** | 헤어메이크업 시술 메뉴 등록, 의상 대여(선택) | `/stylist/dashboard` |
| **벤더 (dress_vendor)** | 의상/장소 대여 아이템 등록 | `/vendor/dashboard` |

### 예약 흐름 (고객 기준 6단계)

```
STEP 01 날짜 선택      → 작가 스케줄 기반 달력
STEP 02 패키지 선택    → 작가가 등록한 촬영 상품 + 시간대 선택
STEP 03 H&M 선택      → 같은 지역 스타일리스트 (선택사항)
STEP 04 의상 선택      → 같은 지역 벤더/헤메의 의상 (선택사항)
STEP 05 장소 선택      → 같은 지역 장소 벤더 (선택사항)
STEP 06 예약 확인      → 금액 합산 + 취소정책 동의 → 결제
```

**핵심 연결 규칙**: 3·4·5단계는 **작가의 `location_id`와 같은 지역**의
헤메/벤더만 노출된다. 지역이 비어 있으면 아무것도 안 뜬다. (과거 최대 버그 원인)

---

## 2. 기술 스택 & 실행

### 스택
```
프론트엔드 : React 18 + Vite 5 (SPA)
라우팅     : react-router-dom 6
백엔드     : Supabase (PostgreSQL + Auth + Storage + Realtime)
결제       : TossPayments (미연동 — 사업자등록증 대기)
배포       : Vercel (main 브랜치 push 시 자동 배포)
도메인     : www.phosnap.com (카페24 도메인 → Vercel DNS)
다국어     : 자체 Context 기반 (ko / en / ja / zh)
스타일     : CSS 변수 기반 인라인 스타일 (다크 테마, 시네마 컨셉)
```

### 의존성 (package.json)
```json
{
  "@supabase/supabase-js": "^2.103.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.22.0",
  "react-easy-crop": "^5.0.8",
  "react-helmet-async": "^2.0.5",
  "i18next": "^23.10.0",
  "react-i18next": "^14.1.0"
}
```

### 명령어
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
```

### 환경변수 (`.env.local`)
```
VITE_SUPABASE_URL=https://znjkyvijjlahsxczweqh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_FORMSPREE_CONTACT_ID=mdaprzyw
VITE_FORMSPREE_ID=xreowkkl
VITE_TOSS_CLIENT_KEY=<미설정>
```
> Vercel에도 동일한 이름으로 등록되어 있어야 배포본이 동작한다.

### 저장소
```
GitHub : https://github.com/tyleryoon/Phosnap.git
브랜치 : main (프로덕션), design-experiment (과거 작업 브랜치)
로컬   : C:\Users\keons\Documents\Claude\phosnap
```

---

## 3. 디렉터리 구조

```
src/
├── App.jsx                  # 라우트 정의 + 역할별 리다이렉트
├── main.jsx
├── pages/          (26개)   # 페이지 컴포넌트
├── components/     (46개)   # 재사용 컴포넌트
├── contexts/                # AuthContext, LanguageContext, CurrencyContext, ToastContext
├── lib/                     # supabase.js(핵심), storage.js, payment.js, points.js 등
├── data/                    # mock 데이터 + 지역 레지스트리 + 스케줄(localStorage)
├── utils/                   # bookingExpiry, portfolioUtils, refundPolicy 등
├── i18n/                    # ko.json / en.json / ja.json / zh.json
└── styles/                  # global.css, tokens.css
supabase/                    # SQL 마이그레이션 모음
```

### 주요 페이지

| 파일 | 경로 | 설명 |
|---|---|---|
| `Home.jsx` | `/` | 랜딩 (역할별 대시보드로 리다이렉트) |
| `Photographers.jsx` | `/photographers` | 작가 목록 + 필터 |
| `Profile.jsx` | `/photographer/:id` | 작가 상세 (포트폴리오·패키지·후기·일정) |
| `Booking.jsx` | `/booking/:id` | **예약 6단계** (가장 복잡, ~1600줄) |
| `ArtistDashboard.jsx` | `/artist/dashboard` | 작가 홈·예약·리뷰·인사이트·실적 |
| `ArtistSchedule.jsx` | `/artist/schedule` | **작가 상품/스케줄/지역/포트폴리오** (~5600줄) |
| `CustomerDashboard.jsx` | `/my` | 고객 마이페이지 |
| `MyBookings.jsx` | `/my-bookings` | 고객 예약 목록 + 채팅 + 리뷰 |
| `VendorDashboard.jsx` | `/vendor/dashboard` | 벤더 (~4400줄) |
| `StylistDashboard.jsx` | `/stylist/dashboard` | 헤메 (~1600줄) |
| `AdminDashboard.jsx` | `/admin` | 관리자 — 개요·예약·**승인**·회원. 승인 탭은 `RoleApprovals.jsx` |

### 라우트 전체
```
/  /explore  /photographers  /photographer/:id  /booking/:id
/for-artists  /waitlist  /terms  /privacy  /contact
/booking/success  /booking/fail
/artist/dashboard  /artist/schedule  /artist/register
/my  /my-bookings
/stylist/dashboard  /stylist/:id
/vendors  /vendor/register  /vendor/dashboard
/tour/:instanceId  /account/settings  /admin  /support  *
```

---

## 4. 데이터베이스 구조 (Supabase)

### 테이블 24개

**인증·프로필**
| 테이블 | 설명 | 핵심 컬럼 |
|---|---|---|
| `profiles` | auth.users와 1:1, 모든 역할 공통 | `id`(=auth uid), `email`, `full_name`, `role`, `real_name`, `phone`, `birthdate`, `address`, `approval_status`, `badge` |
| `user_roles` | 멀티롤 (한 이메일 = 여러 역할) | `user_id`, `role`, `status` |

**작가**
| 테이블 | 설명 | 핵심 컬럼 |
|---|---|---|
| `photographers` | **고객에게 노출되는 작가 공개 레코드** | `id`(UUID), `user_id`, `name`, `name_ko`, `location_id`, `location_names`(jsonb), `price_from`, `img`, `portfolio`(jsonb), `packages`(jsonb), `tags`, `is_active` |
| `packages` | 작가 상품 (snap/tour/costume/prop) | `photographer_id`, `type`, `name`, `price`, `duration_hours`, `edit_count`, `images`, `regions` |
| `artist_schedules` | 날짜별 운영/차단 시간 | `photographer_id`, `date`, `day_off`, `slots`, `blocked` |
| `artist_defaults` | 기본 운영 시간 | `photographer_id`, `default_slots` |
| `artist_locations` | 다중 활동지역 (**현재 미사용**) | `photographer_id`, `location_id`, `period_start/end` |

**헤메**
| 테이블 | 핵심 컬럼 |
|---|---|
| `stylists` | `id`, `user_id`, `name_ko`, `display_name`, `specialty`, `phone`, `instagram`, `portfolio_images`, `location_id`, `city`, `is_active` |
| `stylist_services` | `stylist_id`, `name_ko`, `price`, `duration_minutes`, `description` |
| `stylist_schedules` | `stylist_id`, 날짜별 스케줄 |

**벤더**
| 테이블 | 핵심 컬럼 |
|---|---|
| `dress_vendors` | `id`, `user_id`, `name`, `name_ko`, `vendor_type`, `location_id`, `city`, `intro`, `tags`, `venue_*`(장소 대시보드용), `is_active` |
| `dress_items` | `vendor_id`, `name_ko`, `category`, `price`, `sizes`, `size_stock`(jsonb), `image_url`, `is_available` |
| `venue_vendors` | 장소 벤더. `location_id` 가 있어야 고객 지역 필터에 걸린다 |
| `venue_items` | 개별 촬영장소. `category`, `capacity`, `price`, `price_unit`(per_session 고정), `amenities` |

**예약·소통**
| 테이블 | 핵심 컬럼 |
|---|---|
| `bookings` | `id`, `customer_id`, `customer_name`, `photographer_id`, `date`, `time`, `total_price`, `status`, `expires_at`, `shoot_start_at`, `shoot_end_at`, `collab_count`, `commission_total` |
| **`booking_items`** | **예약 1건 : 아이템 N개.** `booking_id`, `provider_type`(photographer/stylist/dress/venue), `provider_id`, `item_id`, `item_name`, `item_option`, `price`, `timing`, `start_at`, `end_at`, `commission_rate`, `commission_amount`, `payout_amount`, `status` |
| **`provider_schedules`** | **작가·헤메·벤더 공통 날짜별 스케줄.** `provider_type`, `provider_id`, `date`, `day_off`, `slots`, `blocked` |
| **`provider_defaults`** | 기본 운영시간 + 정기 휴무 요일. `default_slots`, `weekly_off`(0=일~6=토) |
| `chat_rooms` | `booking_id`(unique), `photographer_id`(=photographers.id), `customer_id`(=auth uid) |
| `messages` | `room_id`, `sender_id`, `content`, `read_at` |
| `notifications` | `user_id`, `type`, `title`, `body`, `link`, `metadata`, `read_at`, **`email_status`**, **`email_after`**, `email_sent_at`, `email_error` |

**리뷰**
`reviews`, `package_reviews`, `photographer_reviews`, `review_replies`, `vendor_reviews`

**문의**
| 테이블 | 핵심 컬럼 |
|---|---|
| `inquiries` | `user_id`, `category`(8종), `subject`, `body`, `role_at_time`, `status`(open/answered/closed), `answer`, `answered_at`, `answered_by` |

**기타**: `waitlist`

### 예약 상태 흐름
```
pending ──(작가 승인)──> confirmed ──> completed ──> delivered
   │                          │
   │                          └──(고객 취소)──> cancelled
   └──(48h 미응답 or 작가 거절)──> cancelled
```

### Storage 버킷 5개
```
avatars        프로필 이미지
portfolios     작가 포트폴리오
photographers  작가 기타 이미지
snap-products  스냅 상품 사진
dresses        의상/장소 이미지
```
**경로 규칙**: `{bucket}/{auth.uid()}/{파일명}`
RLS가 첫 폴더명 = `auth.uid()` 일치를 요구한다. **절대 다른 ID를 쓰면 안 된다.**

### SQL 적용 순서 (새 환경 구축 시)

```
1. MASTER_MIGRATION.sql          # 기본 테이블 전부
2. FIX_RLS_RECURSION.sql         # profiles RLS 무한재귀 해결 + GRANT 복구
3. FIX_02_PROFILE_COLUMNS.sql    # profiles 누락 컬럼
4. FIX_03_RLS_POLICIES.sql       # photographers/packages 등 RLS 정비
5. FIX_04_MISSING_TABLES.sql     # user_roles / notifications / vendor_reviews
6. FIX_05_STORAGE_BUCKETS.sql    # Storage 버킷 5개 + 정책
7. FIX_06_NOTIFICATIONS.sql      # notifications link/metadata 컬럼
8. FIX_07_CHAT_RLS.sql           # 채팅 RLS
9. FIX_08_BOOKING_EXPIRY.sql     # 만료 트리거
10. FIX_09_DELETE_POLICIES.sql   # DELETE 정책
11. FIX_10_VENDOR_COLUMNS.sql    # dress_vendors 컬럼
12. FIX_11_VENDOR_PROFILE_COLUMNS.sql
13. FIX_12_VENDOR_NAME_SYNC.sql  # name 동기화 + is_active 자동화
14. FIX_13_DRESS_SIZE_STOCK.sql
15. FIX_14_STYLIST_COLUMNS.sql   # stylists display_name + RLS
16. FIX_15_BOOKING_ITEMS.sql     # 예약을 참여자별 라인 아이템으로 분해
17. FIX_16_PROVIDER_BOOKING_ACCESS.sql  # 공급자가 자기 예약을 읽게
18. FIX_17_CUSTOMER_NAME.sql     # 고객 이름 스냅샷
19. FIX_18_APPROVE_RPC.sql       # 확정/거절/알림 서버 함수
20. FIX_19_PROVIDER_SCHEDULES.sql # 작가·헤메·벤더 공통 스케줄
21. FIX_20_REVIEW_AGGREGATE.sql   # 리뷰 평점·후기수 자동 집계
22. FIX_21_CHAT_NOTIFY_EMAIL.sql  # 채팅 알림 + 이메일 발송 큐
23. FIX_22_CRON.sql               # pg_cron (메일 1분 / 예약만료 10분)
```

> 22·23은 외부 설정이 함께 필요하다. 아래 "이메일 발송" 절 참조.

> `PATCH_*.sql`, `migration_*.sql`은 과거 파일이라 참고용. 위 순서만 실행하면 된다.

---

## 5. 반드시 지켜야 할 규칙

이 프로젝트에서 61개 버그를 잡으며 정립한 규칙이다. **어기면 같은 버그가 재발한다.**

### 5-1. mock 데이터로 폴백하지 않는다

```javascript
// 절대 금지
const list = dbData || MOCK_PHOTOGRAPHERS;
const vendor = matched || DRESS_VENDORS[0];

// 올바름
const list = dbData || [];   // 비면 "등록된 것이 없습니다" 빈 상태를 보여준다
```
`src/data/photographers.js` 등의 mock은 **디자인 참고용으로만** 남아 있다.
화면에 노출하면 존재하지 않는 작가를 고객이 예약하게 된다.

### 5-2. 실패를 조용히 삼키지 않는다

```javascript
// 절대 금지
try { await save(); } catch {}
const { error } = await save();
if (error) { /* silently handled */ }
await save().catch(() => {});

// 올바름
const { error } = await save();
if (error) {
  console.error('[컴포넌트명] 저장 실패:', error);
  setErrorMsg(error.message);
  return;   // 성공 메시지를 띄우지 않는다
}
```
**Supabase는 없는 컬럼에 update해도 에러를 던지지 않고 0건 갱신으로 넘어간다.**
그래서 조용히 삼키면 영원히 발견되지 않는다.

### 5-3. Supabase 함수 반환값은 항상 `{ data, error }`

```javascript
// 잘못된 사용 (실제로 있었던 버그)
const data = await getStylistServices(id);   // 객체가 통째로 들어옴
setServices(data);                           // 렌더링 시 화면 멈춤

// 올바름
const { data, error } = await getStylistServices(id);
setServices(data || []);
```

### 5-4. ID 체계를 혼동하지 않는다

| 값 | 정체 | 쓰는 곳 |
|---|---|---|
| `auth.uid()` | 로그인 사용자 ID | `profiles.id`, `bookings.customer_id`, `messages.sender_id`, Storage 경로 |
| `photographers.id` | 작가 공개 레코드 ID | `bookings.photographer_id`, `packages.photographer_id`, `chat_rooms.photographer_id` |
| `stylists.id` | 헤메 레코드 ID | `stylist_services.stylist_id` |
| `dress_vendors.id` | 벤더 레코드 ID | `dress_items.vendor_id` |

**절대 금지**: `Number(uuid)` (NaN이 된다), `photographer_legacy_id`(없는 컬럼), `_customers`(없는 테이블)

### 5-5. 가입 시 공개 레코드를 반드시 만든다

`profiles`만 저장하면 **고객에게 절대 노출되지 않는다.**
```javascript
await upsertProfile({...});
await ensureArtistRecord(userId, {...});   // photographers 또는 stylists
// 벤더는 ensureVendorRecord(userId, {...})
```
대시보드 진입 시에도 레코드가 없으면 자동 생성하도록 되어 있다(구버전 계정 복구용).

### 5-6. 지역(`location_id`)은 표준 ID를 쓴다

`LocationPicker` 컴포넌트가 `{ locationId, countryCode, city }` 객체를 준다.
자유 텍스트로 받으면 고객 예약의 지역 필터(`.eq('location_id', 'seoul')`)에 절대 걸리지 않는다.

### 5-7. 금액은 반드시 숫자로

```javascript
// 실제 있었던 버그: 결제 금액이 1000배가 됨
"250000" + 0 + 0 + 0  // → "250000000"

// 올바름
const toAmount = v => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
```

### 5-8. 배열/객체 접근은 방어한다

DB 레코드에는 mock에만 있던 필드가 없다.
```javascript
// 금지
{s.languages.slice(0,2).map(...)}
{dress.sizes.join(' / ')}

// 올바름
{(s.languages ?? []).slice(0,2).map(...)}
{(dress.sizes || []).join(' / ')}
```

### 5-9. React 훅은 early return 앞에

```javascript
// 금지
if (!data) return null;
const [x, setX] = useState();   // 훅 개수가 달라져 React가 깨진다

// 올바름 — 모든 훅 선언 후 early return
```

### 5-10. `alert()` / `confirm()` 대신 화면 내 표시

브라우저를 블로킹해 자동화 테스트가 멈추고, UX도 나쁘다.

### 5-11. 권한이 걸린 쓰기는 서버 함수로 (가장 비싸게 배운 규칙)

**남의 것을 건드리는 작업을 클라이언트에 두면 안 된다.**

RLS 는 의도대로 막는데, 그 결과가 에러로 오지 않는다.

| 상황 | 응답 |
|---|---|
| 남에게 알림 INSERT | 403 (42501) |
| 남의 행 UPDATE | **200 인데 0행 갱신** |
| 권한 없는 행 SELECT | **빈 배열** |

뒤의 둘은 에러가 아니다. **"권한이 없어 아무 일도 안 일어난 것"과
"정상 처리"를 구분할 수 없다.** 실제로 `sendNotificationTo()` 는
한 번도 작동한 적이 없었는데 아무도 몰랐다.

```javascript
// 금지 — 작가가 고객·헤메·벤더에게 알림을 넣으려 함
await sb.from('notifications').insert([{ user_id: 남의_id, ... }]);
await sb.from('booking_items').update({ status:'confirmed' }).eq('booking_id', id);

// 올바름 — 권한 확인과 처리를 서버 함수 안에서
const { data, error } = await sb.rpc('approve_booking', { p_booking: id });
if (error) { /* 실패가 예외로 올라온다 */ }
```

현재 서버 함수 (`FIX_18_APPROVE_RPC.sql`):

```
approve_booking(uuid)        예약·아이템 확정 + 고객·공급자 알림
reject_booking(uuid, text)   취소 + 아이템 해제 + 알림
notify_new_booking(uuid)     새 예약을 공급자 전원에게
provider_user_id(text, uuid) 공급자 레코드 → 소유자 auth uid
is_booking_provider(uuid)    이 예약의 참여 공급자인가 (RLS 용)
owns_provider(text, uuid)    이 공급자 레코드의 소유자인가 (RLS 용)
```

RLS 정책에서 다른 테이블을 참조할 때는 **반드시 SECURITY DEFINER 함수**를 거친다.
직접 참조하면 정책끼리 서로를 불러 무한 재귀(42P17)가 난다.
`profiles` 와 `bookings` 에서 두 번 겪었다.

### 5-12. mock 시절 필드명이 곳곳에 남아 있다

화면 코드가 존재하지 않는 필드를 읽는 경우가 반복해서 나왔다.
데이터가 없을 땐 멀쩡해 보이다가, 실제 데이터가 들어오는 순간 빈 칸이 된다.

| 잘못된 필드 | 실제 필드 |
|---|---|
| `booking.booking_date` | `booking.date` + `booking.time` |
| `booking.customer` | `booking.customer_name` |
| `booking.itemName` / `booking.size` | `booking.myItems[].item_name` / `.item_option` |
| `booking.hours` | `booking.time` |
| `status === 'rejected'` | `status === 'cancelled'` |

새 화면을 만들 때는 **DB 응답을 먼저 콘솔에 찍어보고** 필드명을 확인한다.

### 5-13. 커밋 전 미정의 변수 검사

npm 레지스트리가 막혀 eslint 를 쓸 수 없다. 대신 이걸 돌린다.

```bash
node scripts/check-undefined.mjs     # → 미정의 참조 0건
```

세 가지를 본다.

| 검사 | 잡는 것 |
|---|---|
| 미정의 참조 | babel 스코프 분석. 크래시 2건을 잡았다 — 그중 하나는 **장소 벤더가 등록되는 순간 예약 STEP 05 전체가 죽는** 상태였다 |
| **파싱 실패** | 문법 오류·중복 선언 |
| **중복 선언** | 최상위 `export const` 중복 |

#### ⚠ 예전에는 검사기가 실패를 삼켰다 (2026-09-11 수정)

```js
try { ast = parse(code, ...); } catch { continue; }   // ← 조용히 건너뜀
```

파싱 실패한 파일을 건너뛰고 "미정의 참조 0건" 을 출력했다.
`supabase.js` 에 `getPendingRoleRequests` 를 중복 선언했는데 그대로 통과해서
**Vercel 빌드가 깨졌다.** 푸시는 되는데 번들이 안 바뀌어 한참 헤맸다.

지금은 파일명과 메시지를 출력하고 `exit code 1` 을 낸다.
결함을 일부러 주입해 두 경로 모두 잡히는지 확인했다.

실제로 값을 했다. `ArtistSchedule` 에 H&M 메뉴 CRUD 를 새로 만들려다
`Identifier 'addHmkMenu' has already been declared` 로 즉시 막혔다.
이미 있는 UI 를 못 보고 중복 구현을 밀어넣을 뻔했다.

### 5-14. 권한 출처는 `user_roles` 하나뿐 (2026-09-11)

**클라이언트가 고칠 수 있는 값을 권한 판단에 쓰지 않는다.**

금지 목록. 전부 브라우저에서 한 줄로 바꿀 수 있다.

| 쓰면 안 되는 것 | 왜 |
|---|---|
| `localStorage['phosnap_roles_<uid>']` | 콘솔에서 직접 편집 가능 |
| `sessionStorage['phosnap_active_role']` | 위와 같음 + 계정 전환 시 잔여값 |
| `user_metadata.role` | `auth.updateUser({ data: { role: 'admin' } })` |
| `profiles.role` | 본인 수정 정책이 열려 있다 |

`sessionStorage['phosnap_active_role']` 은 **어느 역할을 보고 있나**(표시용)로만
쓴다. 그것도 `userRoles.includes()` 를 통과한 뒤에만 신뢰한다.

#### 실제로 어떻게 뚫렸나

`getUserRolesWithFallback` 이 localStorage 역할을 DB 결과에 병합했다.
여기에 걸린 게 세 겹이었다.

```
localStorage 에 'artist' 주입
  → roles 배열 오염
  → ProtectedRoute 역할 검사 통과 (자동 역할 전환까지 해 줌)
  → 승인대기 검사도 통과 ★
  → RLS INSERT 통과 (auth.uid() = user_id 만 봄)
  → photographers 레코드 생성
```

★ 가 제일 교묘하다. 역할 목록은 **병합본**인데 `roleStatuses` 는 **DB 전용**이라,
주입된 역할은 `status === undefined` 가 되고 `pending` 도 `rejected` 도 아니라서
관리자 승인 절차를 통째로 건너뛴다.

결과: `hnm@gmail.com`(헤메), `yoonstudio@gmail.com`(의상벤더) 계정에
artist 역할 없이 `photographers` 레코드가 생겼다.
`is_active = false` 라 고객에게는 안 보였다 — **그래서 화면으로는 못 찾는다.**
`VERIFY.sql` 의 `작가 역할 없이 작가 레코드 보유` 항목이 이걸 잡는다.

#### 고친 내용

| 파일 | 변경 |
|---|---|
| `supabase.js` `getUserRoles` | fallback 전부 제거. DB만. 실패하면 `customer`(fail closed) |
| `supabase.js` `getUserRolesWithFallback` | localStorage 병합 제거 (이름만 유지 — 호출부가 많다) |
| `supabase.js` `addUserRole` | localStorage 대체 제거. 실패를 `error` 로 반환 |
| `supabase.js` `ensureArtistRecord` | 생성 전 `canOwnProviderRecord()` 확인 |
| `AuthContext.jsx` | `userRole = activeRole ?? 'customer'` — 저장소로 안 떨어진다 |
| `ProtectedRoute.jsx` | `activeRole` 채워질 때까지 대기 + `status` 없으면 거부 |
| `FIX_23_ROLE_GUARD.sql` | INSERT 정책에 `has_role()` 추가 ← **진짜 방어선** |
| `FIX_24_CLEAN_ORPHAN_PROVIDERS.sql` | 이미 생긴 고아 레코드 정리 |

#### 역할 가드는 `active` 가 아니라 "행이 있고 반려 아님"

가입 절차가 `addUserRole`(→ `pending`) **직후에** 공개 레코드를 만든다.
여기서 `active` 를 요구하면 **정상 가입이 막힌다.**
승인 전 노출은 레코드의 `is_active = false` 가 따로 막는다.

#### ⚠️ RLS 정책은 OR 로 합쳐진다

같은 테이블·같은 명령에 정책이 여러 개면 Postgres 는 **OR** 로 평가한다.
느슨한 옛 정책을 하나라도 남기면 새 정책은 **아무 의미가 없다.**
이 프로젝트는 영문 이름(`dress_vendors_owner_insert`)과 한글 이름(`벤더 본인 삽입`)이
마이그레이션마다 섞여 있으니, 정책을 조일 때는 반드시 이름을 전부 확인한다.

```sql
select tablename, policyname, with_check from pg_policies
 where schemaname='public' and cmd='INSERT' and tablename='photographers';
```

### 5-15. 역할 부여도 잠겨 있어야 한다 (2026-09-11)

5-14 에서 "역할 출처는 `user_roles` 하나뿐" 으로 정리했다.
그런데 **그 테이블에 자기 역할을 마음대로 쓸 수 있으면** 아무 의미가 없다.
승인 도구를 만들다가 발견했다.

| 구멍 | 내용 |
|---|---|
| `user_roles_self_insert` | `with check (auth.uid() = user_id)` 뿐. `role`·`status` 무제한 → `{role:'admin', status:'active'}` 삽입 가능 |
| `user_roles_self_update` | `with check` 없음. UPDATE 는 `using` 이 검사로 재사용되므로 `user_id` 만 고정되고 `role`·`status` 는 자유 |
| **`is_admin()`** | `profiles.role` 을 읽는데, `switchUserRole()` 이 그 값을 사용자 권한으로 UPDATE 한다 → `update profiles set role='admin'` 한 줄로 **전 DB 관리자 정책이 열림** |
| `status` 제약 | `('active','pending','suspended')` — `'rejected'` 가 없어서 반려 화면이 한 번도 뜰 수 없었다 |

세 번째가 범위가 가장 넓다. `is_admin()` 은 여러 테이블의 관리자 정책이 쓴다.

실제로 FIX_25 를 처음 돌렸을 때 **`profiles.role='admin'` 인 사람이 0명**이라
안전장치가 걸려 멈췄다. 즉 관리자 판정이 `user_metadata.role` 에만 의존하고
있었고, 그건 `auth.updateUser()` 로 누구나 쓸 수 있는 값이다.

#### 지금 구조

```
user_roles  ← 유일한 권한 출처
  본인 INSERT:  customer(active) 또는 공급자(pending) 만. admin 금지
  본인 UPDATE:  없음
  관리자 UPDATE: is_admin() 일 때만
  승인/반려:    approve_role() / reject_role()  (SECURITY DEFINER)

is_admin()  ← user_roles 만 본다
profiles.role  ← "지금 어느 역할로 보고 있나" 표시용. 권한 판정에 쓰지 않는다
```

#### ⚠ `is_admin()` 을 바꿀 때는 순서가 있다

**관리자 행을 `user_roles` 에 먼저 만들고** 판정 기준을 바꾼다.
반대로 하면 아무도 관리자가 아니게 되고, 되돌릴 방법도 관리자 권한이 필요하다.
FIX_25 는 이 순서를 강제하고, 관리자가 0명이면 `raise exception` 으로 멈춘다
(SQL Editor 는 전체를 한 트랜잭션으로 돌리므로 안전하게 롤백된다).

#### 승인 도구

`/admin` → 승인 탭. `src/components/RoleApprovals.jsx`.

이전 구현은 화면만 있었다. 버튼이 `setProfiles()` 로 React 상태만 바꿔서
새로고침하면 되돌아갔고, 목록은 `profiles.approved` 라는 엉뚱한 컬럼을 읽었다.
진짜 승인 상태는 `user_roles.status` 다.

관리자 화면은 조회 실패를 mock 으로 덮지 않는다. 예전에는 `catch` 에서
가짜 예약 847건 · ₩12,450,000 을 넣어 관리자가 그 숫자를 믿게 만들었다.
지금은 에러 배너를 띄우고, 0건일 때는 "RLS 로 걸러졌을 수 있음" 을 함께 알린다.
(PostgREST 는 정책에 막힌 행을 에러 없이 빼므로 클라이언트가 구분할 수 없다)

#### 멀티롤 전환 UI

`src/components/RoleSwitcher.jsx`. Nav 우측(모바일은 메뉴 안)에 뜬다.
역할이 하나뿐이면 아무것도 그리지 않는다.

이게 없어서 생긴 문제들:
- 관리자 역할을 받아도 활성 역할이 `artist` 면 `⚙ Admin` 링크가 안 보였다
  (주소창에 `/admin` 을 직접 쳐야 ProtectedRoute 가 자동 전환)
- 헤메 겸 의상벤더는 한쪽 대시보드로 가면 돌아올 길이 없었다
- 모바일 메뉴에는 관리자 링크가 아예 없었다

승인 대기·반려 상태도 항목 옆에 표시한다.

#### 관리자 읽기 정책 (FIX_26)

`bookings`·`photographers` 의 관리자 정책이 `is_admin()` 을 쓰지 않고
`profiles.role = 'admin'` 을 정책 안에 직접 박아 뒀었다.
`profiles.role` 은 `switchUserRole()` 이 덮어쓰는 값이라 관리자가
관리자 화면에서 아무것도 못 보는 상태였고, 옛 우회도 살아 있었다.
지금은 전부 `is_admin()` 기반이다.

반려는 **사유가 필수**다. 입력값이 `user_roles.reject_reason` 에 남고
그대로 신청자 메일 본문이 된다. 사유 없이 반려하면 신청자는 뭘 고쳐야 할지
알 수 없다.

### 5-16. 자체 헤메·자체 의상 — 데이터가 어디 있어야 하나 (2026-09-12)

작가가 "헤어메이크업도 직접 한다" / "의상도 자체 보유한다" 를 켤 수 있다.
**그 메뉴는 `packages` 에 있어야 한다.**

| 무엇 | 어디 | `packages.type` |
|---|---|---|
| 촬영 상품 | packages | `snap`, `tour` |
| 자체 의상 | packages | `costume` |
| **자체 H&M** | packages | **`hmk`** |
| 소품 | packages | `prop` |

#### 왜 `profiles` 에 두면 안 되나

```sql
create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);
```

`profiles` 는 본인(과 관리자)만 읽는다. 고객은 남의 프로필을 못 읽는다.

가입 폼이 H&M 메뉴를 `profiles.hmk_options` 에 저장하고 있었는데,
**그래서 그 값을 읽는 코드가 한 줄도 없었다.** 빠뜨린 게 아니라 불가능했다.
"자체 H&M 있음" 으로 가입한 작가의 고객은 그 작가 메뉴 대신
같은 지역 **다른** 헤메 목록을 봤다. (FIX_29 에서 `packages` 로 이관)

의상은 처음부터 `packages(type='costume')` 라 잘 동작했다.
같은 문제는 같은 방법으로 푼다.

#### ⚠ `hmk_available` 과 `hmk_self` 는 다른 컬럼이다

`photographers` 에 둘 다 있다.

| 컬럼 | 누가 쓰나 |
|---|---|
| `hmk_self` | **정본.** `toPhotographerCard`, 예약 STEP 03, FIX_29, VERIFY_COMBO |
| `hmk_available` | 레거시. 읽는 코드가 없다 |

ArtistSchedule 이 `hmk_available` 에만 쓰고 있어서, 작가가 대시보드에서
자체 H&M 을 켜도 고객 화면은 영영 바뀌지 않았다.
게다가 읽는 값도 틀렸다 — 토글은 `profile.hmk.selfAvailable` 에 저장되는데
동기화 코드는 존재하지 않는 `updated.hmkSelf` 를 봤다. 늘 `false` 였다.
지금은 두 컬럼 다 `profile.hmk.selfAvailable` 에서 채운다.

#### ⚠ localStorage 기반 프로필이 DB 를 지울 수 있다

`profile.hmk.menus` 는 localStorage 에서 온다. 다른 기기에서 열면 비어 있고,
그 상태로 저장하면 `replacePackages(id, 'hmk', [])` 가 돌아
**DB 의 hmk 행이 삭제된다.**
로드 시 비어 있을 때만 DB 값으로 채우도록 막아 뒀다.
`costume`·`prop` 도 같은 구조이므로 같은 위험이 있다.

#### 자체 H&M 의 수수료

10-3 절 참고. `provider_type='photographer'` + `rate_type='stylist'` 다.

---

### 5-17. 공급자도 고객 화면을 볼 수 있어야 한다 (2026-09-12)

작가·헤메·벤더가 자기가 고객에게 어떻게 노출되는지 확인할 방법이 없었다.
두 군데가 막고 있었다.

- `Nav` 가 공급자 로그인 시 `지역 탐색`·`작가 찾기` 를 숨김
- `/explore` 에 들어가면 `RoleAwareExplore` 가 대시보드로 리다이렉트

둘 다 풀었다. 각 대시보드에 `👁 고객에게 보이는 내 페이지` 링크가 있다.
홈(`/`) 리다이렉트는 유지한다 — 로그인하면 자기 대시보드로 가는 게 맞다.

**예약은 들어갈 수 있지만 결제는 막는다.** `Booking.jsx` 의
`isSupplierViewing` 이 상단 배너를 띄우고 `handleConfirm` 을 차단한다.
공급자 계정으로 예약이 생기면 정산·수수료·일정이 전부 꼬인다.
끝까지 채우고 나서 막히면 시간만 버리므로 배너를 먼저 보여준다.

---

### 5-18. 실패를 성공처럼 보이게 하지 않는다 (2026-09-12)

이 프로젝트에서 찾은 버그의 **대부분**이 한 가지 모양이었다.
화면은 성공했다고 하는데 실제로는 아무 일도 안 일어났다.
그래서 클릭으로는 못 찾고, 사용자도 원인을 모른다.

#### 나타나는 형태

| 형태 | 예 |
|---|---|
| `error` 를 안 받는다 | `const { data } = await sb.from(...)` |
| 예외를 삼킨다 | `catch (e) { /* Silently ignore */ }` |
| 실패해도 성공 메시지 | `console.error(...)` 후 `showSaved()` |
| 실패하면 가짜로 대체 | `catch { setStats(getMockStats()) }` |
| 실패하면 엉뚱한 출처로 폴백 | DB 실패 → 고객 localStorage |
| 0행을 성공으로 본다 | RLS 에 막힌 UPDATE 는 에러가 아니다 |
| 저장 위치가 둘 | 한쪽만 고객에게 닿는다 |
| 버튼이 상태만 바꾼다 | 새로고침하면 되돌아간다 |

#### 규칙

1. **`error` 를 항상 받는다.** `const { data, error } = ...`
2. **쓰기는 행 수까지 본다.** `.select('id')` 후 `data.length === 0` 확인.
   PostgREST 는 RLS 에 막힌 UPDATE 를 에러가 아니라 **0행**으로 준다.
3. **실패를 화면에 띄운다.** 콘솔은 사용자가 안 본다.
4. **모르면 지어내지 않는다.** 조회가 실패하면 빈 값·잠금·안내를 쓴다.
   가짜 데이터나 다른 출처로 대신하면 그 위에서 결정이 내려진다.
5. **막을지 말지 애매하면 막지 않되 로그는 남긴다.**
   확실하지 않은데 막으면 멀쩡한 것이 사라진다.
   (`getProvidersClosedOn` 이 그 예)
6. **권한이 걸린 쓰기는 서버 함수로.** 5-11 절.

#### 실제로 이렇게 새고 있었다

| 무엇 | 결과 |
|---|---|
| `AccountSettings.handleSave` | 실명·연락처가 안 들어가도 "저장되었습니다" |
| `ArtistSchedule.saveProfileData` | 상품·정산계좌가 DB 에 없는데 ✓. localStorage 에는 있어 **본인 화면에는 계속 보인다** |
| `AdminDashboard` mock 폴백 | 조회 실패 시 가짜 847건 · ₩1,245만원 |
| 벤더 대시보드 휴무 탭 2개 | 한쪽은 DB, 한쪽은 localStorage |
| 예약 화면 공급자 휴무 | `booking_items`(예약)만 보고 `day_off`(휴무)는 안 봄 → 헤메 쉬는 날에 예약이 들어옴 |
| 예약 달력 조회 실패 | `data` 가 `[]` 라 **모든 날짜가 열림**으로 보임 |
| `check-undefined.mjs` | `catch { continue }` 로 파싱 실패를 삼켜 빌드를 깨뜨림 |

마지막 줄이 이 규칙이 왜 필요한지 보여준다 —
**실패를 숨기는 코드는 검사기 자신에게도 있었다.**

#### 찾는 법

```bash
grep -rn "catch {}\|catch (_) {}" src/
grep -rn "const { data } = await sb\." src/
grep -rn "Silently ignore\|무시" src/
```

그리고 쓰기 경로는 **호출부**를 봐야 한다.
`supabase.js` 가 `error` 를 돌려줘도 화면이 안 보면 소용없다.

---

### 5-21. 승인 전에는 고객에게 보이지 않는다 (2026-09-12)

#### 승인 절차가 사실상 없었다

윤헤메 계정을 확인하다 발견했다.

```
user_roles.status = 'pending'     ← 대시보드에는 "승인 대기 중"
stylists.is_active = true         ← 고객 예약 화면에는 선택지로 노출
```

`getStylists()` 는 `is_active` 만 본다. 승인 여부는 안 본다.
`photographers` / `dress_vendors` / `venue_vendors` 도 같은 구조였다.

**가입만 하면 고객이 예약할 수 있었다.** 승인 버튼은 상태 글자만 바꿨다.

#### 어디서 켜졌는지 못 찾았다

앱 코드에서 `is_active: true` 를 쓰는 자리는
`VenueItemsManager` 한 곳뿐인데 헤메 레코드가 true 였다.
`ensureArtistRecord` 는 명시적으로 `false` 로 만든다.

경로를 다 찾아 막는 것보다 **테이블에서 한 번 막는 게 확실하다**.
그래서 트리거로 갔다 (FIX_34).

#### 두 개의 트리거

| 트리거 | 대상 | 하는 일 |
|---|---|---|
| `trg_guard_activation` | 공급자 4개 테이블 | 미승인이면 `is_active` 를 `false` 로 되돌린다 |
| `trg_activate_on_approval` | `user_roles` | 승인되면 켜고, 반려·정지되면 끈다 |

**둘 다 있어야 한다.** 가드만 걸면 승인해도 영영 비노출이다 —
코드 어디에도 `is_active` 를 켜는 자리가 없기 때문이다.

#### 왜 오류를 던지지 않나

가드는 오류 대신 값을 `false` 로 내린다.
오류를 던지면 승인 대기 중인 작가가 **프로필 저장 자체를 못 한다.**
승인 전에 프로필을 채워두는 건 정상적인 흐름이다. 노출만 막으면 된다.
대시보드가 이미 "승인 대기 중" 을 보여주므로 사용자는 상태를 안다.

#### 조회 정책은 건드리지 않았다

SELECT 정책을 고치는 게 더 근본적으로 보이지만,
잘못 건드리면 **고객 화면이 통째로 비어버린다.**
쓰기 쪽에서만 막고, 조회는 기존 `is_active` 필터를 그대로 쓴다.

#### 검사

`VERIFY.sql` 이 양방향으로 본다.
`미승인인데 고객에게 노출` / `승인됐는데 고객에게 비노출`.

후자도 사고다 — 작가는 승인됐다고 알고 있는데 예약이 한 건도 안 들어온다.

---

### 5-20. 자체 의상은 세 사람이 판다 (2026-09-12)

의상을 파는 주체가 셋이다. 저장 자리가 다르다.

| 파는 사람 | 저장 위치 | providerType | rateType |
|---|---|---|---|
| 의상 벤더 | `dress_items.vendor_id` | `dress` | `dress` |
| 헤메 작가 | `dress_items.stylist_id` | `stylist` | `dress` |
| 사진·영상 작가 | `packages` (type=`costume`) | `photographer` | `dress` |

**`rateType` 은 셋 다 `dress` 다.** 같은 드레스인데 파는 사람에 따라
수수료가 다르면 불만이 생긴다 — 헤메 요율을 통일한 것과 같은 이유다(5-15 참조).
`providerType` 은 "누가 정산받는가", `rateType` 은 "무슨 요율인가" 다.

#### dress_items 를 벤더와 헤메가 같이 쓴다

`vendor_id` 와 `stylist_id` 중 **정확히 하나만** 채워진다.
DB 제약 `dress_items_owner_check` 가 강제한다.
둘 다 비면 정산 대상이 없고, 둘 다 차면 둘이 된다.

테이블을 나누지 않은 이유 — 사이즈·재고(`size_stock`)·이미지·카테고리
렌더링과 중복 예약 판정(`booking_items.item_id`) 코드가 이미
`dress_items` 기준으로 다 돌아간다. 두 벌로 나누면 한쪽만 고치는 버그가 난다.

#### 예전에는 헤메를 벤더로 둔갑시켰다 (동작하지 않았다)

`StylistDashboard` 의 의상 탭은 `ensureVendorRecord()` 로
`dress_vendors` 행을 만들었다. 그런데 FIX_23 의 역할 가드 때문에
`vendor` 역할이 없는 헤메는 그 insert 가 RLS 에 막힌다.
**버튼은 있는데 눌러도 안 되는 상태였다.**

지금은 `stylists.dress_self` 를 켜고 `dress_items.stylist_id` 로 바로 붙인다.
역할은 `stylist` 하나 그대로다.

#### 노출 규칙

헤메의 자체 의상은 **그 헤메를 선택했을 때만** 의상 목록에 뜬다.
같은 사람이 당일 함께 움직이므로 전달·핏 조정이 자연스럽고,
일정 충돌을 따로 계산할 필요가 없다.
헤메를 바꾸면 `selectedDress` 를 비운다 — 안 그러면 고른 것처럼 보이는데
실제로는 아무 의상도 담기지 않은 채 결제까지 간다.

#### 성립하는 조합

작가(사진만·자체 헤메 X·자체 의상 X) + 헤메(자체 의상 O)
→ 고객은 사진·헤메·의상을 한 번에 받고, 공급자는 둘만 붙는다.

#### 검사

`VERIFY.sql` 이 상시로 본다.
`소유자가 불명확한 의상`, `자체 의상 보유인데 0벌 (헤메/작가)`,
`자체 헤메인데 메뉴 0개`, `의상 아이템인데 의상 요율이 아님`.

가운데 둘은 막을 일이 아니라 **알려줄 일**이다.
"보유" 라고 체크만 하고 하나도 안 올리면 고객 화면의 그 칸이 빈다.
관리자 회원 관리 탭에서 같은 상태를 붉은 배지로 보여준다.

---

### 5-19. 서버가 거부한 것과 서버에 못 닿은 것은 다르다 (2026-09-12)

이 규칙은 결제에서 나왔다. 가장 크게 데일 뻔한 자리다.

#### 무슨 일이 있었나

`BookingSuccess.jsx` 는 이렇게 생겼었다.

```javascript
try {
  const result = await confirmPayment({ ... });
  if (result.duplicate) { ...; return; }
  if (result.success)   { ...; return; }
} catch (edgeFnErr) {
  // silently handled
}

// ── Fallback: 클라이언트 직접 저장 ──
// ⚠ 개발/테스트 환경 전용
```

두 가지가 겹쳐 있었다.

1. `confirmPayment` 는 **예외를 던지지 않는다.** `{ success:false, error }` 를
   돌려준다. 그래서 `catch` 는 거의 안 걸리고, `result.error` 는 아무도 안 읽는다.
2. `success` 도 `duplicate` 도 아니면 **그냥 아래로 흘러내려** 클라이언트가
   직접 저장한다.

그 결과가 이렇다. Edge Function 이 `AMOUNT_MISMATCH`(금액 위조)로 400 을
돌려줘도 → 클라이언트가 **URL 파라미터의 금액 그대로** 예약을 저장하고
→ 화면에는 초록색 "예약이 저장되었습니다" 가 뜬다.

서버 검증을 넣은 이유 자체가 무력화돼 있었다.

#### 규칙

서버를 호출하는 모든 자리에서 이 둘을 구분해야 한다.

| | 뜻 | 해야 할 일 |
|---|---|---|
| **거부** (400/401/409 …) | 서버가 판단을 내렸고, 안 된다고 했다 | 우회하지 않는다. 사용자에게 이유를 보여준다 |
| **미도달** (fetch 실패, 404) | 서버는 아무 판단도 하지 않았다 | 대체 경로가 있다면 그때만 쓴다 |

`confirmPayment` / `cancelPaymentServer` 는 이제 `reached` 를 같이 돌려준다.
`reached === true` 면 **절대** 클라이언트 저장으로 내려가지 않는다.

#### 돈이 걸린 화면은 "완료" 로 보이면 안 된다

결제창을 통과했다는 건 **돈이 나갔다**는 뜻이다.
예약이 저장되지 않았는데 ✓ 와 "작가 확정 대기 중" 을 띄우면
고객은 몇 주 뒤에야 알게 된다.

`BookingSuccess` 는 `saveStatus === 'error'` 일 때
헤더 아이콘·제목·설명을 전부 바꾸고, 주문번호와
`/support?category=payment&order=...` 로 가는 버튼을 띄운다.
문의 폼은 주문번호를 미리 채워 넣는다 — 고객이 옮겨 적다 틀리면 우리가 못 찾는다.

#### 결제했는데 항목이 사라지던 문제

`createBooking` 의 payload 에 `venue_price` 가 아예 없었다.
(`bookings` 에는 `venue_price` 는 있고 `venue_name` 은 없다.)
결제 초안(`sessionStorage`)이 없으면 라인 아이템도 작가 것 하나만 만들어졌다.

→ 고객은 헤메·의상·장소 값을 다 냈는데
   예약에는 작가만 남고, 공급자들은 자기가 불린 줄도 모른다.

지금은
* `venue_price` 를 payload 에 넣는다
* 초안이 없으면 빠진 항목을 `note` 에 `[항목 복원 필요 — 결제 초안 없음]` 으로 남긴다
* `BookingSuccess` 가 화면에 "일부 항목이 저장되지 않았을 수 있다" 고 알린다
* `VERIFY.sql` 이 `결제했는데 라인 아이템 없는 항목` 과
  `아이템 합계 ≠ 결제 총액` 을 상시 검사한다

---

---

## 6. 과거에 발목 잡았던 함정들

### 6-1. 서비스워커가 새 배포를 막는다 ⚠️ 미해결

PWA 서비스워커가 옛 JS 번들을 캐시해서 **배포해도 사용자가 옛 버전을 계속 본다.**
개발 중 확인할 때는 매번 이렇게 해야 한다:
```javascript
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
const keys = await caches.keys();
for (const k of keys) await caches.delete(k);
location.reload();
```
**근본 해결이 필요한 항목이다.**

### 6-1-2. RLS 가 막았는데 코드는 성공으로 안다 ⚠️ 반복된 함정

RLS 는 의도대로 막는데, 그 결과가 **에러로 오지 않는다.**

| 상황 | 응답 |
|---|---|
| 남에게 알림 INSERT | 403 (42501) — 이건 그나마 티가 난다 |
| 남의 행 UPDATE | **200 인데 0행 갱신** |
| 권한 없는 행 SELECT | **빈 배열** |
| 권한 없는 행을 조인 | **`null`** |

뒤의 셋은 에러가 아니다. "권한이 없어 아무 일도 안 일어난 것"과
"정상 처리"를 구분할 수 없다. 실제로 이 때문에

- `sendNotificationTo()` 가 **한 번도 작동하지 않았고** (아무도 몰랐다)
- 작가가 승인해도 헤메·벤더 아이템이 `pending` 으로 남았고
- 헤메 대시보드가 조인 `null` 때문에 "예약이 없습니다" 를 띄웠다

**해결: 권한이 걸린 쓰기는 서버 함수(SECURITY DEFINER)로.** 규칙 5-11 참조.

### 6-2. 데이터가 없으면 검증이 안 된 것이다

예약 3~5단계(헤메/의상/장소)를 "검증 완료"로 판단했으나,
당시엔 헤메·벤더가 0명이라 **카드가 렌더링될 일이 없었다.**
실제 데이터를 넣자마자 `s.languages.slice()`에서 페이지 전체가 죽었다.

> **새 기능 검증 시 반드시 실제 데이터를 넣고 확인할 것.**

### 6-3. 예약 만료는 자동 "취소"다

화면 문구가 "미응답 시 자동 확정"이었으나 실제 DB 함수는 `cancelled`로 바꾼다.
자동 취소가 올바른 설계다 — 자동 확정은 작가가 못 나오는 예약을 성립시켜
고객이 촬영 당일 현장에서 작가를 못 만나는 회복 불가능한 실패를 만든다.

`expires_at = min(생성+48시간, 촬영 3일 전)` (최소 2시간 보장)

⚠️ **미해결**: `expireStaleBookings()`가 작가 대시보드 접속 시에만 실행된다.
응답 없는 작가일수록 접속을 안 하므로 만료가 안 되는 모순. `pg_cron` 필요.

### 6-4. 디버깅 팁 — 브라우저에서 DB 직접 조회

```javascript
const url='https://znjkyvijjlahsxczweqh.supabase.co';
const anonKey='<VITE_SUPABASE_ANON_KEY 값>';
const tok=JSON.parse(localStorage.getItem('sb-znjkyvijjlahsxczweqh-auth-token'));
const h={apikey:anonKey, Authorization:'Bearer '+tok.access_token};
await (await fetch(`${url}/rest/v1/photographers?select=*`,{headers:h})).json();
```
UI가 이상할 때 **DB에 실제로 뭐가 들어갔는지** 먼저 확인하면 원인이 빨리 잡힌다.

---

## 7. 현재 검증 완료 상태 (2026-09-11 기준)

실제 계정으로 전 구간을 브라우저에서 직접 수행해 확인했다.

### 2차 검증 (booking_items 개편 후)

| 흐름 | 결과 |
|---|---|
| 헤메가 시술 시점 3종 등록 (선행·동행·상주) | ✅ DB 저장값 확인 |
| 고객 예약 화면에 시술 실제 시각 안내 | ✅ 14:00 / 16:30 / 15:00 |
| 촬영 시간 겹치는 헤메·장소 자동 제외 | ✅ 시술 단위 판정 |
| 3자 예약 → 참여자별 아이템 분해 + 수수료 | ✅ |
| 작가 승인 → 예약·아이템 전체 확정 (RPC) | ✅ 중복 승인 차단 확인 |
| 확정 알림이 헤메·벤더에게 도달 | ✅ 역할별로 각각 |
| 새 예약 알림이 공급자 전원에게 도달 | ✅ |
| 헤메 대시보드 — 시술+의상 한 카드 병합 | ✅ |
| 벤더 대시보드 — 예약 테이블·재고 | ✅ |

### 1차 검증

| 흐름 | 결과 |
|---|---|
| 작가 가입 → 프로필·상품·스케줄 → 고객 목록 노출 | ✅ |
| 벤더 가입 → 업체 프로필 → 의상 등록 → 고객 노출 | ✅ |
| 헤메 가입 → 프로필 → 시술 메뉴 → 고객 노출 | ✅ |
| 헤메 의상 대여 (신규 기능) | ✅ |
| 고객 예약 6단계 (결제 직전까지) | ✅ |
| 3자 결합 예약 (작가+헤메+의상) 금액 합산 | ✅ ₩520,000 |
| 작가 예약 승인 → 고객 화면 반영 | ✅ |
| 작가 ↔ 고객 채팅 양방향 | ✅ |
| 알림 발송 + 미읽음 배지 | ✅ |
| 리뷰 작성 → 작가 공개 프로필 반영 | ✅ |

### 테스트 계정
```
고객   customer@gmail.com    / Rjstlr806!
작가   photo@gmail.com       / Rjstlr806!   (윤작가)
헤메   hnm@gmail.com         / Rjstlr806!   (윤헤메)
벤더   yoonstudio@gmail.com  / Rjstlr806!   (윤스튜디오)
```
> 테스트용 임시 비밀번호. 실서비스 전 반드시 변경/삭제할 것.

### 외부 서비스 연동 상태
| 서비스 | 상태 |
|---|---|
| Supabase | ✅ 연동 완료 |
| Google 소셜 로그인 | ✅ 완료 |
| 카카오 로그인 | ✅ 완료 (이메일 수집은 비즈앱 전환 필요) |
| Vercel 배포 | ✅ main push 시 자동 |
| 도메인 (www.phosnap.com) | ✅ DNS 연결 완료 |
| TossPayments | ❌ 사업자등록증 대기 |

---

## 8. 남은 작업 (우선순위 순)

### A. 사업자등록증 발급 후
1. **TossPayments 라이브 연동** — 결제 6단계 이후 전 구간
2. **정산 계좌 서버 저장** — 현재 localStorage 전용, 민감정보 설계 필요
3. **카카오 비즈앱 전환** — 이메일 수집 동의항목

### B. 사용자가 요청한 기능 (DB 컬럼은 준비 완료)
1. **실명-휴대폰 일치 인증** — `profiles.real_name`, `phone`, `phone_verified` 사용
   > 타인 명의 휴대폰으로 인증하는 것을 막기 위함
2. **이메일 인증번호 프로세스** — `profiles.email_verified` 사용
3. **관리자 승인 + AI 자동 심사** — `profiles.approval_status` (pending/approved/rejected), `approval_note`
   > SNS·작업물을 AI가 분석해 자동 승인/반려, 반려 시 관리자에게 알림
   > 작가 가입 폼의 "SNS · 웹사이트 (선택)" 문구를 "작업물 확인 가능한 SNS"로 수정 필요
4. **벤더 가입 주소 검색** — `ArtistRegister.jsx`에는 있고 `VendorRegister.jsx`에는 없음

> 3번의 "반려 시 관리자에게 알림" 부분은 이미 만들어져 있다 (10-5 절).
> AI 자동 심사만 남았다 — `approve_role()` / `reject_role()` 을 그대로 부르면 된다.

### C. 기술 부채
| 항목 | 내용 |
|---|---|
| 서비스워커 캐시 | 배포해도 사용자가 옛 버전 사용 — **가장 시급** |
| 채팅·리뷰 재검증 | 1차에서만 확인. booking_items 개편 영향 가능 |
| 장소(venue) 전 구간 | 장소 벤더 데이터 0건이라 한 번도 실행된 적 없음 |
| `notifyBookingProviders` | 클라이언트 함수가 남아 있으나 RLS로 막힌다. RPC로 대체됨 |
| 테스트 데이터 | 예약 3건·알림 다수·리뷰 1건이 DB에 남아 있음 (아래 참조) |
| `expireStaleBookings` | pg_cron 스케줄 필요 (현재 클라이언트 의존) |
| `artist_locations` 미사용 | 다중 활동지역(국내3+해외3)이 저장 안 됨 |
| ~~`AdminDashboard` mock~~ | ✅ 해결 (2026-09-12). 조회 실패를 가짜 데이터로 덮던 것을 제거 |
| 반송 메일 미처리 | `email_status='sent'` 은 **Resend 가 접수했다**는 뜻이지 도착이 아니다. 없는 주소면 접수 후 반송되는데 웹훅이 없어 계속 `sent` 로 남는다 |
| `costume`/`prop` 도 덮어쓰기 위험 | `profile.*` 가 localStorage 기반이라 다른 기기에서 저장하면 DB 행이 지워질 수 있다. `hmk` 만 막아 뒀다 (5-16 참고) |
| `venue_vendors` | 장소 대여 경로가 사실상 미완성 |
| 남은 `catch {}` 13곳 | 포인트·공유·아바타 등 부가 기능 (주 흐름 영향 없음) |

---

## 8-2. 실서비스 전 테스트 데이터 정리

검증용으로 만든 데이터가 DB에 남아 있다. 실제 고객을 받기 전에 지운다.

```sql
-- 테스트 예약과 딸린 아이템 (booking_items 는 CASCADE 로 함께 삭제됨)
delete from public.bookings
 where customer_id in (select id from public.profiles where email = 'customer@gmail.com');

-- 테스트 알림
delete from public.notifications
 where user_id in (
   select id from public.profiles
    where email in ('customer@gmail.com','photo@gmail.com','hnm@gmail.com','yoonstudio@gmail.com')
 );

-- 확인
select (select count(*) from public.bookings)      as 예약,
       (select count(*) from public.booking_items) as 아이템,
       (select count(*) from public.notifications) as 알림;
```

테스트 계정 4개의 임시 비밀번호(`Rjstlr806!`)도 반드시 변경하거나 계정을 삭제한다.

---

## 9. 작업 이력 요약

### 2026-09-11 ~ 12 — 권한 정리 · 관리자 도구

| 무엇 | 왜 |
|---|---|
| 권한 출처를 `user_roles` 단일화 | localStorage·user_metadata·profiles.role 로 아무 역할이나 얻을 수 있었다 (5-14) |
| `user_roles` 자기 삽입/수정 잠금 | 스스로 `admin/active` 를 만들 수 있었다 (5-15) |
| `is_admin()` 을 `user_roles` 기반으로 | `profiles.role='admin'` 한 줄로 전 DB 관리자 정책이 열렸다 |
| RLS INSERT 에 역할 검사 | 로그인만 하면 누구나 작가 레코드를 만들 수 있었다 |
| 승인/반려/재신청 | 승인 탭이 장식이었고 `'rejected'` 는 DB 제약에 없어 반려가 불가능했다 |
| 문의 시스템 | `mailto:` 를 대체 (10-5) |
| `rate_type` 분리 | 같은 헤메 시술인데 작가가 하면 요율이 달랐다 (10-3) |
| 자체 H&M 을 `packages` 로 | `profiles` 에 있어 고객이 읽을 수 없었다 (5-16) |
| 공급자 둘러보기 | 자기 노출 상태를 볼 방법이 없었다 (5-17) |
| 검사기 강화 | 파싱 실패를 삼켜 빌드를 깨뜨렸다 (5-13) |

적용한 SQL: `FIX_23` ~ `FIX_31`, 검증용 `VERIFY.sql` · `VERIFY_COMBO.sql`


### 2026-09-10 ~ 09-11 세션
- **DB를 완전히 비우고 mock 데이터를 제거한 상태에서 전 구간 실검증**
- **61개 이슈 발견 및 수정** (커밋 49개, 파일 38개 변경, SQL 마이그레이션 14개 작성)
- 헤메 의상 대여 기능 신규 구현
- 상세 내역은 `PHOSNAP_검증_리포트.md` 참조

### 2026-09-11 세션 (2차 — 브라우저 실검증)
- booking_items 개편 후 실제 브라우저로 전 구간 재검증
- **10건 추가 발견** (커밋 8개, SQL 마이그레이션 4개)
- 가장 큰 것: `sendNotificationTo()` 가 한 번도 작동한 적 없음 (RLS 403)
- 10건 중 8건이 실제 데이터를 넣고 실제 버튼을 눌러야만 드러나는 것들

### 발견된 이슈 유형 분포
```
A. DB 설정 누락 (RLS·권한·컬럼·테이블·버킷)   14건
B. UUID 체계 불일치 (옛 스키마 잔재)            9건
C. 데이터가 고객에게 도달하지 않음              12건
D. 치명적 계산·렌더 오류                        7건
E. 정책·UX 오류                                14건
F. 재검토 추가 발견                             5건
```

### 특히 위험했던 3건
1. **결제 금액 1000배** — 문자열 덧셈으로 ₩250,000이 ₩250,000,000이 됨
2. **포트폴리오에 Unsplash 스톡 사진 자동 혼입** — 저작권 문제
3. **예약 만료 안내가 실제 동작과 반대** — 작가가 문구를 믿고 방치하면 예약 취소

---

## 10. `src/lib/supabase.js` API 전체 목록 (126개)

**모든 DB 접근은 이 파일을 통한다.** 새 기능을 만들기 전에 여기서 기존 함수를 먼저 찾을 것.
모든 함수는 `{ data, error }` 형태를 반환한다(예외: `getSupabase`, `toE164KR`, 변환 헬퍼).

### 인증
```
getSupabase  signUp  signIn  signInWithGoogle  signOut  getSession
resetPassword  onAuthChange  updateUserData
checkEmailExists  sendEmailOtp  verifyEmailOtp
toE164KR  sendPhoneOtp  verifyPhoneOtp  updateUserPhone
```
> `sendEmailOtp`/`verifyEmailOtp`/`sendPhoneOtp`/`verifyPhoneOtp`는
> 껍데기는 있으나 실제 인증 프로세스는 **미완성** (남은 작업 B-1, B-2)

### 역할 (멀티롤)
```
getUserRoles  addUserRole  getUserRolesWithFallback  getUserRolesWithStatus
switchUserRole  signInAndAddRole
approveUserRole  rejectUserRole  getPendingRoleRequests
```

### 프로필
```
getProfile  upsertProfile
ensureArtistRecord   ← 작가/헤메 공개 레코드 생성 (가입 시 필수)
ensureVendorRecord   ← 벤더 공개 레코드 생성 (가입 시 필수)
getMyArtistRecord
```

### 작가 조회 (고객용)
```
toPhotographerCard   ← DB row → 카드 컴포넌트 형태 변환 (반드시 거칠 것)
fetchPhotographers  fetchPhotographer  fetchFeaturedPhotographers
```

### 상품(패키지)
```
getPackages  createPackage  updatePackage  deletePackage
replacePackages   ← 전체 교체 (delete + insert)
fromPackageRow    ← DB row → 대시보드 로컬 형태
```

### 스케줄
```
getScheduleMonth  upsertScheduleDate  upsertScheduleBatch
getDefaultSlots  upsertDefaultSlots  getBookedSlots
```

### 예약
```
createBooking  getMyBookings  getBookingByOrderId
getPendingBookings  getArtistBookings
approveBooking  rejectBooking  cancelBooking  requestReschedule
deliverPhotos  expireStaleBookings

getBookingItems          예약 1건의 아이템 목록
getProviderBookings      특정 공급자가 참여한 예약 (provider_type + id)
getMyProviderBookings    내가 참여한 모든 예약 — 역할 가리지 않고 병합
getMyProviderRefs        내가 소유한 공급자 레코드 전부
getProviderBusyBlocks    특정 공급자의 점유 구간 (충돌 판정용)
```
> `approveBooking` / `rejectBooking` 은 내부적으로 서버 함수(RPC)를 호출한다.
> 클라이언트에서 직접 처리하면 RLS 때문에 반쪽만 돈다 (규칙 5-11).
>
> 한 사람이 여러 역할을 겸할 수 있으므로, 대시보드는
> `getMyProviderBookings()` 를 쓰는 게 안전하다.

### 결제
```
confirmPayment  cancelPaymentServer   ← TossPayments 미연동 상태
```

### 헤메(스타일리스트)
```
getStylists  getStylistProfile  updateStylistProfile  getStylistBookings
getStylistServices  createStylistService  updateStylistService  deleteStylistService
```

### 의상 벤더
```
createDressVendor  ensureVendorRecord
getMyVendorProfile  updateVendorProfile  getVendorBookings
getVendorDresses  addVendorDress  updateVendorDress  deleteVendorDress
getDressItems  getBookedDresses
```
> `addVendorDress` 등은 `dress_items` 테이블에 쓴다.
> `vendor_dresses`는 VIEW이므로 **INSERT 금지**.

### 장소 벤더
```
getVenueVendors  getVenueVendorById  getMyVenueVendorProfile
createVenueVendor  updateVenueVendorProfile  getVenueVendorBookings
getVenueItems  addVenueItem  updateVenueItem  deleteVenueItem
```

### 채팅
```
getOrCreateChatRoom  getMyChatRooms  getChatMessages
sendChatMessage  markMessagesRead
subscribeChatMessages  unsubscribeChat
```
> `getOrCreateChatRoom(bookingId)` — **booking 객체가 아니라 id를 넘길 것**

### 리뷰
```
submitReview  getPhotographerReviews  getReviewByBookingId
submitPackageReview  getPackageReviewByBookingId  getPackageReviews
submitPhotographerReview  getPhotographerReviewByBookingId  getPhotographerReviewsV2
getReviewStats
submitReviewReply  getReviewRepliesByPhotographer  getReviewReplies
submitVendorReview  getVendorReviewsByType  getVendorReviewsByBooking
getVendorReviewStats
submitVendorReviewReply  getVendorReviewRepliesByVendor  getVendorReviewReplies
```
> 리뷰 계열이 3중(reviews / package_reviews / photographer_reviews)으로 중복돼 있다.
> 정리 대상이지만 현재는 셋 다 쓰인다.

### 알림
```
getMyNotifications  getUnreadNotificationCount
markNotificationRead  markAllNotificationsRead
createNotification  sendNotification  sendNotificationTo
subscribeNotifications  unsubscribeNotifications
```
> 미읽음 판단은 `read_at IS NULL` 기준. `is_read` 컬럼에 의존하지 말 것.

### 기타
```
uploadAvatar  getAvatarUrl  saveWaitlistEntry
```

---

## 10-2. `src/lib/scheduling.js` — 시간 점유 계산

참여자마다 "언제 일하는가" 가 전혀 다르다. 촬영 시간만 보고 판단하면
헤메 추천이 통째로 틀린다. **촬영 16:00~19:00 기준:**

| 유형 | `timing` | 시술 구간 | 점유 구간 |
|---|---|---|---|
| 작가 · 장소 | `shoot` | 16:00~19:00 | 16:00~19:00 |
| 샵 헤메 (90분, 이동 30분) | `before` | 14:00~15:30 | **14:00~16:00** |
| 현장 헤메 (60분, 이동 0) | `before` | 15:00~16:00 | 15:00~16:00 |
| 헤어변형 (30분, +30분) | `during` | 16:30~17:00 | 16:30~17:00 |
| 종일 동행 (60분) | `full` | 15:00~16:00 | **15:00~19:00** |
| 의상 | `day` | — | 하루 전체 |

**시술 구간과 점유 구간을 반드시 구분한다.**
시술이 15:30 에 끝나도 16:00 까지 이동 중이라 그 30분에 다른 예약을 받으면 안 된다.
충돌 판정은 항상 점유 구간(`busyStart`/`busyEnd`)으로 한다.

```
computeSlot({timing, shootStart, shootEnd, durationMinutes, offsetMinutes})
overlaps(a, b)                두 구간이 겹치는가
mergeProviderBlocks(items)    같은 사람의 여러 아이템을 통 블록으로
isServiceAvailable(svc, shoot, busy)   시술 단위 가용 판정
buildShootWindow(date, time, hours)
timingLabel(service, lang)
```

`offset_minutes` 의 의미가 `timing` 에 따라 다르다.
`before`·`full` 은 **이동 버퍼**(현장 시술이면 0), `during` 은 **합류 지연**이다.

`full` 메뉴에는 `max_hours` 를 둔다. 그보다 긴 촬영에는 노출하지 않는다.

---

## 10-3. 수수료 (`src/lib/commission.js`)

**수수료는 예약 단위가 아니라 정산받는 사람 단위로 계산한다.**
작가가 헤메를 데려왔다고 작가 요율이 달라지지 않는다.

| 공급자 | 일반 (누적 0 / 15 / 50건) | 얼리버드 |
|---|---|---|
| 작가 | 18 / 14 / 11% | 10% |
| 헤메 | 15 / 12 / 10% | 10% |
| 의상 벤더 | 20 / 15 / 12% | 12% |
| 장소 벤더 | 18 / 14 / 10% | 10% |

- **건당 상한 ₩150,000** — 약 83만원부터 실효 요율이 자동으로 내려간다.
  고액 예약에서 이탈 유인이 폭발하는 것을 막는 장치다.
- **콜라보 우대** 2인 −1%p / 3인 −2%p / 4인 −3%p, 하한 8%
- 얼리버드 유효기간 **12개월**, 선착순 50명

```
calculateItemCommission({providerType, rateType, price, completedCount, isEarlyBird, collabCount})
calculateBookingCommissions(items)   → { items, collabCount, commissionTotal, payoutTotal }
```

### ⚠ `provider_type` 과 `rate_type` 은 다른 것이다 (2026-09-12)

| 필드 | 뜻 | 쓰이는 곳 |
|---|---|---|
| `provider_type` | **돈이 누구에게 가나** | `provider_user_id()` 정산 대상, `owns_provider()` RLS |
| `rate_type` | **무슨 일에 대한 수수료인가** | 요율표 선택 |

대부분 둘이 같다. **작가 자체 헤어메이크업만 갈린다.**

```
provider_type = 'photographer'   작가에게 정산, 작가가 자기 아이템을 본다
rate_type     = 'stylist'        헤메 요율(15/12/10%) 적용
```

`provider_type` 을 그냥 `'stylist'` 로 바꾸면 요율은 맞지만
`owns_provider('stylist', 작가id)` 가 false 라 **작가가 자기 예약을 못 본다.**

같은 시술 같은 금액인데 누가 하느냐로 요율이 다르면 설명할 수 없고,
작가가 자체 헤메를 숨기고 외부로 돌리는 유인이 생긴다.

실측 (헤메 시술 80,000원)

| 경우 | 인원 | 헤메 요율 | 총 수수료 |
|---|---|---|---|
| 헤메 단독 | 1 | 15% | 12,000 |
| 작가 자체헤메 | 1 | **15%** | 12,000 |
| 작가+자체헤메 | 1 | 15% | 57,000 |
| 작가+외부헤메 | 2 | **14%** | 53,700 |
| 작가+헤메+벤더 | 3 | **13%** | 72,000 |

같은 일이면 같은 요율, 협업하면 혜택. 콜라보 인원은 사람 수 기준이라
작가가 혼자 헤메까지 하면 1인이고 할인이 없다.

**콜라보 인원은 사람(`ownerId` = auth uid) 기준으로 센다.**
`provider_id` 로 세면 한 사람이 헤메이면서 의상 벤더일 때 혼자 2인이 되어
할인을 한 단계 더 받는다. 금액 0원인 참여자는 인원에서 제외한다(어뷰징 방어).

> 요율을 바꾸면 `src/data/legal.js` TERMS_VENDOR 제3조,
> `VendorRegister.jsx` 동의 문구, 대시보드 안내 문구도 함께 고쳐야 한다.

---

## 10-4. 이메일 발송 (Resend + pg_cron)

### 설계 — 알림을 만드는 것이 곧 메일을 예약하는 것

예전 `send-notification` 은 "이 사람에게 이 메일을 보내라" 는 명령형이었다.
부르는 쪽이 빠뜨리면 그대로 메일이 안 가고, 실제로 그랬다
(호출처가 `createBooking` 한 군데뿐이었다).

`notify-worker` 는 반대로 동작한다. `notifications` 에서
**아직 안 보냈고 · 보낼 때가 됐고 · 아직 안 읽은** 것을 스스로 찾아 보낸다.

```
알림 생성 (앱 또는 서버 함수)
   ↓
notifications  ← email_status='pending', email_after
   ↓  pg_cron 1분마다
notify-worker (Edge Function)
   ↓
Resend → 메일
```

**앞으로 알림을 추가하면 메일은 저절로 따라간다.** 따로 붙일 게 없다.

### 발송 상태

| `email_status` | 의미 |
|---|---|
| `pending` | 보낼 차례 대기 |
| `sent` | 발송 완료 |
| `skipped` | 보낼 필요 없어짐 (읽음 처리 등) |
| `failed` | 실패 — `email_error` 에 원인 |

읽음 처리하면 트리거가 `skipped` 로 바꾼다. 이미 본 것을 메일로 또 받을 이유가 없다.

### 채팅은 5분 유예

`send_chat_message()` 가 알림을 만들 때 `email_after = now() + 5분` 을 건다.
그 안에 읽으면 메일이 나가지 않는다.
같은 방에 안 읽은 알림이 있으면 새로 만들지 않고 내용만 갱신하고 유예를 다시 센다
— 대화가 오가는 동안 메일이 연달아 가지 않는다.

### 외부 설정 (새 환경 구축 시 필요)

**1. Resend**
- resend.com 가입 → Domains → `phosnap.com` 추가
- DNS 레코드를 카페24에 등록 (호스트명은 `.phosnap.com` 제외하고 앞부분만)

| Resend 항목 | Type | Name | 카페24 메뉴 |
|---|---|---|---|
| DKIM | TXT | `resend._domainkey` | TXT 관리 |
| SPF | CNAME | `rsend`, `send` | **별칭(CNAME) 관리** |
| DMARC | TXT | `_dmarc` | TXT 관리 |

> Resend 가 섹션 제목을 "SPF" 라고 붙였지만 Type 은 CNAME 이다.
> 카페24의 "SPF 관리" 가 아니라 "별칭(CNAME) 관리" 에 넣는다.

**2. Edge Function 배포** (PowerShell)
```bash
npx supabase login
npx supabase link --project-ref znjkyvijjlahsxczweqh
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set SITE_URL=https://www.phosnap.com
npx supabase functions deploy notify-worker
```

> ⚠ 함수 이름 주의. `send-notification` 은 쓰지 않는 옛 함수다.
> 실제로 쓰는 것은 **`notify-worker`** 다. 한 번 여기서 헤맸다
> — 옛 함수를 배포해놓고 404 를 한참 추적했다.

**3. service_role 키를 Vault 에 저장** (SQL Editor)
```sql
select vault.create_secret('키', 'service_role_key', 'pg_cron 용');
```
> 이 키는 RLS 를 전부 우회한다. `.env` 나 코드, Vercel 환경변수에 절대 넣지 않는다.

**4. `FIX_22_CRON.sql` 실행** — 메일 1분 / 예약만료 10분

### 문제 진단

```sql
-- 대기 중인 알림이 있는가
select count(*) from public.pending_notification_emails(50);

-- 크론이 도는가
select j.jobname, d.status, d.return_message, d.start_time
  from cron.job_run_details d join cron.job j on j.jobid = d.jobid
 order by d.start_time desc limit 10;

-- 워커를 직접 호출
select net.http_post(
  url := 'https://znjkyvijjlahsxczweqh.supabase.co/functions/v1/notify-worker',
  headers := jsonb_build_object('Content-Type','application/json',
    'Authorization','Bearer ' || (select decrypted_secret
      from vault.decrypted_secrets where name='service_role_key' limit 1)),
  body := '{}'::jsonb);

-- 5초 뒤 응답 확인
select status_code, content from net._http_response order by created desc limit 2;
```

| 응답 | 원인 |
|---|---|
| `404 NOT_FOUND` | 함수 미배포 (이름 확인) |
| `401` | Vault 키 오류 |
| `{"skipped":"RESEND_API_KEY not set"}` | 시크릿 설정 후 **재배포** 필요 |
| `{"sent":N}` | 정상 |

---

## 10-4-2. 반송 메일 (Resend 웹훅)

`email_status = 'sent'` 은 **Resend 가 접수했다**는 뜻이지 도착이 아니다.
없는 주소도 200 을 받고 나서 반송된다.

```
notify-worker  →  Resend           email_id 를 notifications 에 기록
Resend         →  email-webhook    delivered / bounced / complained
email-webhook  →  record_email_event()
```

반송된 주소는 `profiles.email_bounced_at` 에 표시되고,
`pending_notification_emails()` 가 발송 대상에서 빼 준다.
계속 보내면 도메인 평판이 떨어져 정상 메일까지 스팸으로 간다.

### ⚠ `--no-verify-jwt` 없이 배포하면 401 로 막힌다

```bash
npx supabase functions deploy email-webhook --no-verify-jwt
```

Supabase Edge Function 은 기본으로 `Authorization` 헤더를 요구한다.
Resend 는 그걸 보낼 수 없어서 **우리 코드가 실행되기도 전에**
게이트웨이가 `401 UNAUTHORIZED_NO_AUTH_HEADER` 를 돌려준다.
실제로 이렇게 막혔고, Resend 이벤트 목록에서 401 을 보고 알았다.

안전하다 — 이 함수는 Svix 서명을 직접 검증하고 시크릿이 없으면 요청을
거부한다. 애초에 그래서 서명 검증을 넣었다.

### 설정

1. Resend → Webhooks → **Add Webhook**
2. URL `https://<project>.supabase.co/functions/v1/email-webhook`
3. 이벤트 `email.delivered` `email.bounced` `email.complained`
4. Signing Secret 을 Supabase → Edge Functions → Secrets 에
   `RESEND_WEBHOOK_SECRET` 으로 등록

Resend 는 200 을 못 받으면 5초 → 5분 → 30분 → 2시간 → 5시간 → 10시간 으로
재시도한다. 일시 장애는 저절로 복구된다.
중복 배달(at-least-once)도 오는데, `record_email_event()` 는 같은 값을
다시 쓸 뿐이라 문제없다.

---

## 10-5. 승인 · 문의 (관리자 도구)

### 승인 — `user_roles.status`

```
가입        addUserRole()      → pending
승인        approve_role()     → active     + 알림·메일
반려        reject_role(사유)  → rejected   + 알림·메일 (사유 필수)
재신청      reapply_role(보완) → pending    + 관리자 전원에게 알림
```

| 화면 | 파일 |
|---|---|
| 관리자 승인 | `components/RoleApprovals.jsx` → `/admin` 승인 탭 |
| 반려 안내 + 재신청 | `components/RoleRejected.jsx` (ProtectedRoute 가 띄움) |

**반려는 막다른 길이 아니다.** `user_roles` 는 `(user_id, role)` 유니크라
새 신청을 만들 수 없고 본인 수정 정책도 없앴다. `reapply_role()` RPC 만이 길이다.
보완 메모를 필수로 받는다 — 버튼만 다시 누르는 재신청을 막고,
관리자가 이전 반려 사유와 나란히 놓고 재심사할 수 있게 하기 위해서다.
**이전 반려 사유는 지우지 않는다.** 맥락이 필요하다.

### 문의 — `inquiries`

분류 8종: `role_change` `account` `booking` `payment` `settlement` `bug` `suggestion` `other`

```
접수  submit_inquiry(category, subject, body)  → 본인·관리자 전원 알림
답변  answer_inquiry(id, answer)               → 문의자 알림
종료  close_inquiry(id)                        → 알림 없음 (중복·해결된 건)
목록  admin_inquiries(status)                  → 미답변 우선, 오래된 순
```

| 화면 | 파일 |
|---|---|
| 문의 작성 + 내 내역 | `pages/Support.jsx` → `/support` |
| 관리자 처리 | `components/InquiryAdmin.jsx` → `/admin` 문의 탭 |

`/support?category=role_change` 로 열면 분류가 미리 선택된다.
개인정보 관리의 "유형 변경 문의" 버튼이 그렇게 넘어간다.
(예전에는 `mailto:` 였다 — 메일 클라이언트가 없으면 아무 일도 안 일어나고,
보냈는지 확인할 수 없고, 기록도 안 남았다)

**`inquiries` 에 INSERT 정책을 열지 않았다.** 열면 사용자가
`status: 'answered'` 나 `answer` 를 직접 넣을 수 있다. 접수도 RPC 로만 한다.

### 관리자 배지

```
admin_attention()  → { pending_roles, reapplied, open_inquiries,
                       failed_emails, stale_bookings }
```

`hooks/useAdminAttention.js` 가 60초마다 부르고 `components/AlertDot.jsx` 가 그린다.
Nav 의 `⚙ Admin` 과 관리자 탭에 숫자가 붙는다.
**활성 역할이 작가여도 관리자 계정이면 보인다** — 작가 화면을 보고 있다고
승인 대기를 몰라도 되는 건 아니다.

목록 조회를 배지에 쓰지 않는다. 프로필·포트폴리오까지 끌고 오는 쿼리를
1분마다 돌릴 이유가 없어서 숫자 전용 함수를 따로 뒀다.

> ⚠ `auth.uid()` 를 쓰는 함수는 SQL Editor 에서 그냥 실행하면 항상 0 이다.
> Editor 는 `postgres` 로 돌아 `auth.uid()` 가 NULL 이다.
> 실제 값을 보려면 VERIFY.sql 2-C 절처럼 `set local role authenticated` +
> `request.jwt.claims` 를 세팅해야 한다.

### 멀티롤 전환

`components/RoleSwitcher.jsx` — Nav 우측(모바일은 메뉴 안).
역할이 하나뿐이면 아무것도 그리지 않는다.
없을 때는 관리자 역할을 받아도 활성 역할이 `artist` 면 `⚙ Admin` 링크가
보이지 않았고, 헤메 겸 벤더는 한쪽 대시보드에서 돌아올 길이 없었다.

---

## 10-6. Edge Function 배포 현황 ⚠️ (2026-09-12 확인)

저장소에 소스는 6개 있는데 **실제로 배포된 건 2개뿐이다.**
소스가 있다고 도는 게 아니다. 대시보드에서 눈으로 확인해야 한다.

| 함수 | 배포 | 역할 | 없으면 |
|---|---|---|---|
| `notify-worker` | ✅ | 알림 메일 발송 | — |
| `email-webhook` | ✅ | 반송·수신 결과 기록 | — |
| `confirm-payment` | ❌ | **Toss 결제 승인 + 금액 검증** | 서버 검증이 아예 없다 |
| `cancel-payment` | ❌ | **환불** | 작가 거절 시 환불이 안 된다 |
| `expire-bookings` | ❌ | 만료 예약 정리 | `pending` 이 영원히 남는다 |
| `send-notification` | ❌ | 단건 알림 | — |

확인하는 곳: Supabase 대시보드 → Edge Functions → Functions

### 지금 당장 문제가 되진 않는 이유

`confirm-payment` 가 없으면 게이트웨이가 404 를 주고, 클라이언트는
`reached === false` 로 보고 대체 경로(클라이언트 직접 저장)로 내려간다.
테스트 결제는 그래서 잘 됐던 것이다.

**실서비스에서는 이게 곧 금액 검증이 없다는 뜻이다.**

### 배포 순서 — 순서를 지켜야 한다

`confirm-payment` 는 `TOSS_SECRET_KEY` 가 없으면 500 을 돌려준다.
이제 500 은 "서버가 거부함" 으로 취급돼서 예약이 아예 저장되지 않는다.
**시크릿을 먼저 넣고 배포한다.** 거꾸로 하면 결제가 전부 막힌다.

1. Supabase 대시보드 → Edge Functions → Secrets
   `TOSS_SECRET_KEY = live_sk_...` (클라이언트 키 아님)
2. 배포

```
npx supabase functions deploy confirm-payment --no-verify-jwt
npx supabase functions deploy cancel-payment --no-verify-jwt
npx supabase functions deploy expire-bookings --no-verify-jwt
```

3. 브라우저 콘솔에서 도달 여부 확인 (401/400 이 나오면 도달한 것이다. 404 면 미배포)

```
await fetch('https://znjkyvijjlahsxczweqh.supabase.co/functions/v1/confirm-payment',{method:'OPTIONS'}).then(r=>r.status)
```

4. 테스트 결제 1건 → `VERIFY.sql` 에서 `아이템 합계 ≠ 결제 총액` 이 0 인지 확인

`--no-verify-jwt` 를 빼면 Supabase 게이트웨이가 CORS 프리플라이트(OPTIONS)를
401 로 막아서, 브라우저에서는 `Failed to fetch` 로만 보인다.
함수 코드는 실행조차 되지 않는다. 함수 안에서 사용자 토큰을 직접 검증한다.

---

## 11. 참고 파일

| 파일 | 내용 |
|---|---|
| `PHOSNAP_검증_리포트.md` | 61개 이슈 전체 목록 + 분류 |
| `supabase/FIX_*.sql` | DB 수정 마이그레이션 (적용 순서는 4장 참조) |
| `src/lib/supabase.js` | **모든 DB 접근 함수 126개** — 10장 목록 참조 |
| `src/App.jsx` | 라우트 + 역할별 리다이렉트 |
| `src/contexts/AuthContext.jsx` | 로그인 상태·역할 관리 |

---

**문서 작성일: 2026년 9월 11일**
**작성 기준 커밋: main 브랜치 최신**
