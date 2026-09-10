# PhoSnap 프로젝트 인수인계 문서

> **백업 작성일: 2026년 9월 11일**
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
| `AdminDashboard.jsx` | `/admin` | 관리자 (아직 mock 기반) |

### 라우트 전체
```
/  /explore  /photographers  /photographer/:id  /booking/:id
/for-artists  /waitlist  /terms  /privacy  /contact
/booking/success  /booking/fail
/artist/dashboard  /artist/schedule  /artist/register
/my  /my-bookings
/stylist/dashboard  /stylist/:id
/vendors  /vendor/register  /vendor/dashboard
/tour/:instanceId  /account/settings  /admin  *
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
| `venue_vendors` / `venue_items` | 장소 대여 (별도 테이블, 현재 미사용에 가까움) |

**예약·소통**
| 테이블 | 핵심 컬럼 |
|---|---|
| `bookings` | `id`, `customer_id`, `photographer_id`, `date`, `time`, `package_name`, `package_price`, `total_price`, `status`, `expires_at`, `stylist_*`, `dress_*` |
| `chat_rooms` | `booking_id`(unique), `photographer_id`(=photographers.id), `customer_id`(=auth uid) |
| `messages` | `room_id`, `sender_id`, `content`, `read_at` |
| `notifications` | `user_id`, `type`, `title`, `body`, `link`, `metadata`, `read_at`, `is_read` |

**리뷰**
`reviews`, `package_reviews`, `photographer_reviews`, `review_replies`, `vendor_reviews`

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
```

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

### C. 기술 부채
| 항목 | 내용 |
|---|---|
| 서비스워커 캐시 | 배포해도 사용자가 옛 버전 사용 — **가장 시급** |
| `expireStaleBookings` | pg_cron 스케줄 필요 (현재 클라이언트 의존) |
| `artist_locations` 미사용 | 다중 활동지역(국내3+해외3)이 저장 안 됨 |
| `AdminDashboard` | 아직 mock 데이터 기반 (실제 검증 안 됨) |
| `venue_vendors` | 장소 대여 경로가 사실상 미완성 |
| 남은 `catch {}` 13곳 | 포인트·공유·아바타 등 부가 기능 (주 흐름 영향 없음) |

---

## 9. 작업 이력 요약

### 2026-09-10 ~ 09-11 세션
- **DB를 완전히 비우고 mock 데이터를 제거한 상태에서 전 구간 실검증**
- **61개 이슈 발견 및 수정** (커밋 49개, 파일 38개 변경, SQL 마이그레이션 14개 작성)
- 헤메 의상 대여 기능 신규 구현
- 상세 내역은 `PHOSNAP_검증_리포트.md` 참조

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
```

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
