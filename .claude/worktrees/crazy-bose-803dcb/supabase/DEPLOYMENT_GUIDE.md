# Phosnap 실서비스 배포 가이드

## 현재 상태
- Supabase 프로젝트: 생성 완료
- 프론트엔드: Vite 5 + React 18 (빌드 준비 완료)
- 결제: Toss Payments (테스트 모드)
- 데이터: 현재 localStorage + mock → Supabase로 전환 필요

---

## Step 1: Supabase 테이블 생성

### 1-1. Supabase 대시보드 접속
1. [supabase.com](https://supabase.com) 로그인
2. 생성된 프로젝트 선택
3. 좌측 메뉴 → **SQL Editor** 클릭

### 1-2. Migration 실행
1. `MASTER_MIGRATION.sql` 파일 전체 복사 (프로젝트 root)
2. SQL Editor → 우측 상단 **New Query** 클릭
3. 복사한 SQL 전체 붙여넣기
4. **Run** 버튼 클릭 (실행 시간 5-10초)

### 1-3. 테이블 확인
생성되어야 할 테이블 목록:

**사용자 & 작가**
- `profiles`: 사용자 기본 정보
- `photographers`: 포토그래퍼 추가 정보
- `artist_locations`: 작가별 촬영 가능 지역

**예약 & 패키지**
- `bookings`: 예약 정보
- `packages`: 패키지 상품
- `schedules`: 작가 일정

**스타일링**
- `stylists`: 스타일리스트 프로필
- `stylist_services`: 제공 서비스
- `stylist_schedules`: 스타일리스트 일정

**드레스 & 장소**
- `dress_vendors`: 드레스 판매점
- `dress_items`: 드레스 상품
- `venue_vendors`: 스튜디오/장소
- `venue_items`: 장소별 패키지

**리뷰 & 채팅**
- `reviews`: 예약 후기
- `photographer_reviews`: 작가 평점
- `review_replies`: 후기 댓글
- `chat_rooms`: 채팅방
- `chat_messages`: 메시지

### 1-4. RLS 정책 확인
1. 좌측 메뉴 → **Table Editor**
2. 각 테이블 선택 → **RLS** 스위치가 **ON**인지 확인
   - 만약 OFF라면 ON으로 변경 (Row Level Security 활성화)

---

## Step 2: Authentication 설정

### 2-1. 이메일 인증 활성화
1. 좌측 메뉴 → **Authentication** → **Settings**
2. **Email Auth** 섹션에서:
   - ✓ Enable email confirmations: **ON**
   - ✓ Secure email change: **ON**
3. **Email Templates** 탭으로 이동
4. `Confirm signup` 템플릿 수정:
   - 제목: `[Phosnap] 이메일 인증` 으로 변경
   - 본문에서 `{{ .SiteURL }}` 부분을 실제 배포 도메인으로 나중에 수정
   - 예: `https://phosnap.com/auth/callback?token={{ .TokenHash }}`

### 2-2. Google OAuth 설정 (선택사항)

**Google Cloud Console에서:**
1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: "Phosnap"
3. API 활성화 → "Google+ API" 검색 → 활성화
4. 사용자 인증정보 → OAuth 2.0 클라이언트 ID 생성
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: `https://[your-project].supabase.co/auth/v1/callback`
5. 클라이언트 ID, 클라이언트 비밀 복사

**Supabase에서:**
1. Authentication → Providers → Google
2. **Enable Google** 토글 ON
3. Client ID, Client Secret 붙여넣기
4. 저장

### 2-3. 카카오 로그인 (선택사항)

1. [Kakao Developers](https://developers.kakao.com) 접속 → 앱 등록
2. 앱 → 설정 → 기본정보에서 REST API 키 복사
3. 설정 → 플랫폼 → Web 추가
   - 사이트 도메인: `phosnap.com` (또는 테스트 도메인)
4. 설정 → 로그인 → Redirect URI 등록
   - `https://[your-domain]/auth/callback`
5. Supabase Authentication → Providers → Custom로 Kakao OAuth 추가 (또는 나중에 Edge Function으로 구현)

---

## Step 3: Storage 설정

### 3-1. 스토리지 버킷 생성
좌측 메뉴 → **Storage** → **Create Bucket**

| 버킷명 | 공개 여부 | 용도 |
|--------|----------|------|
| `portfolios` | Public | 포토그래퍼 포트폴리오 사진 |
| `avatars` | Public | 사용자 프로필 사진 |
| `dress-images` | Public | 드레스 상품 이미지 |
| `venue-images` | Public | 장소/스튜디오 이미지 |

### 3-2. 각 버킷 RLS 정책 설정

**portfolios 버킷에서:**
1. 버킷 선택 → **Policies** 탭
2. **New Policy** → **For SELECT**
   ```
   정책명: "SELECT for all users"
   조건: true
   ```
3. **New Policy** → **For INSERT**
   ```
   정책명: "INSERT for authenticated users"
   조건: (auth.role() = 'authenticated')
   ```
4. 나머지 버킷들도 동일하게 설정

---

## Step 4: Edge Functions 배포 (결제 검증)

### 4-1. Toss Payments Secret Key 등록
```bash
# 터미널에서 프로젝트 root 폴더에서 실행
supabase secrets set TOSS_SECRET_KEY=test_sk_xxx
# 라이브 환경에서는: test_sk_xxx → live_sk_xxx로 변경
```

### 4-2. Edge Function 배포
```bash
supabase functions deploy verify-payment
supabase functions deploy confirm-payment
```

### 4-3. 배포 확인
```bash
supabase functions list
```

---

## Step 5: 환경변수 설정

### 5-1. .env.local 파일 최종 확인

프로젝트 root의 `.env.local` 파일:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Toss Payments (테스트 모드)
VITE_TOSS_CLIENT_KEY=test_ck_5xxxxxxxxxxxxxxxxxxxxxxx
# 실거래 전환 후: test_ck_xxx → live_ck_xxx로 변경

# Kakao (카카오톡 공유용)
VITE_KAKAO_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 앱 설정
VITE_APP_URL=http://localhost:5173  # 개발환경
# 배포 후: https://phosnap.com 으로 변경
```

### 5-2. Supabase URL, API Key 복사
1. Supabase 대시보드 → 프로젝트 선택
2. 좌측 메뉴 → **Settings** → **API**
3. **Project URL** 복사 → `VITE_SUPABASE_URL`에 붙여넣기
4. **anon public** 키 복사 → `VITE_SUPABASE_ANON_KEY`에 붙여넣기
5. **service_role secret** 키는 따로 보관 (백엔드에서만 사용)

---

## Step 6: Vercel 배포

### 6-1. GitHub에 코드 푸시
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### 6-2. Vercel 프로젝트 연결
1. [vercel.com](https://vercel.com) 로그인
2. **Add New** → **Project**
3. GitHub 계정 연결 → `phosnap` 저장소 선택
4. **Import Project**

### 6-3. 빌드 설정
| 항목 | 값 |
|------|-----|
| Framework | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 6-4. 환경변수 추가
1. **Environment Variables** 섹션
2. `.env.local`의 모든 변수 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TOSS_CLIENT_KEY` (test_ck_xxx로 시작)
   - `VITE_KAKAO_KEY`
   - `VITE_APP_URL` (배포 후 자동 할당되는 Vercel URL)

### 6-5. 배포
1. **Deploy** 버튼 클릭
2. 배포 진행 상황 확인 (약 3-5분)
3. 배포 완료 후 자동 할당된 URL 확인: `https://phosnap-xxx.vercel.app`

---

## Step 7: 커스텀 도메인 연결

### 7-1. 도메인 구매
추천 도메인:
- `phosnap.com` (국제)
- `phosnap.co.kr` (국내)
- `phosnap.kr` (국내)

도메인 레지스트라: Namecheap, GoDaddy, 가비아, Route53 등

### 7-2. Vercel에서 도메인 추가
1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Domains**
3. **Add Domain** → 구매한 도메인 입력
4. 예: `phosnap.com`

### 7-3. DNS 레코드 설정
1. 도메인 호스팅 제공자의 관리 패널 접속
2. DNS 레코드 수정:
   - **Type:** CNAME
   - **Name:** @ (또는 비워둠)
   - **Value:** `cname.vercel-dns.com`
3. 또는 Nameserver를 Vercel의 nameserver로 변경:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

### 7-4. 적용 대기
DNS 변경은 24시간까지 걸릴 수 있음. 이 시간에 다른 작업 진행.

### 7-5. SSL 인증서 (자동)
Vercel이 자동으로 Let's Encrypt SSL 인증서 발급 (무료)

---

## Step 8: Toss Payments 실거래 전환

### 8-1. Toss Payments 가입
1. [toss.tech](https://toss.tech) 접속
2. **Toss Payments** 선택 → 사업자 등록
3. 필요 서류:
   - 사업자등록증
   - 통장 사본 (입금 계좌)
   - 신분증

### 8-2. 심사 완료 후 라이브 키 발급
약 1-3일 소요. 심사 완료 후:
- **Client Key:** `live_ck_xxx...`
- **Secret Key:** `live_sk_xxx...` (백엔드에서만 사용)

### 8-3. 환경변수 업데이트

**개발/테스트 환경:**
```env
VITE_TOSS_CLIENT_KEY=test_ck_5xxxxxxxxxxxxxxxxxxxxxxx
```

**프로덕션 환경 (.env.production):**
```env
VITE_TOSS_CLIENT_KEY=live_ck_1xxxxxxxxxxxxxxxxxxxxxxx
```

또는 Vercel에서 직접 변경:
1. 프로젝트 → **Settings** → **Environment Variables**
2. `VITE_TOSS_CLIENT_KEY` 수정: `live_ck_xxx`로 변경
3. **Redeploy** 클릭

### 8-4. 라이브 결제 테스트
1. Vercel 배포 사이트 접속
2. 테스트 예약 진행
3. 결제 화면에서 라이브 결제 테스트 카드 사용:
   - **카드 번호:** `4000-0002-2000-0002` (일반 신용카드)
   - **유효기간:** 임의의 미래 날짜
   - **CVC:** 임의의 3자리

---

## Step 9: 초기 데이터 입력

### 9-1. 포토그래퍼 프로필 등록 (2-3명)
1. Vercel 배포 사이트 접속
2. 회원가입 → 포토그래퍼로 가입
3. 프로필 작성:
   - 이름, 자기소개, 경력
   - 프로필 사진 업로드
   - 촬영 지역 선택
4. 포트폴리오 추가:
   - 최소 5-10장의 샘플 사진 업로드

### 9-2. 패키지 생성
1. 포토그래퍼 대시보드 → **패키지 관리**
2. 최소 3개 패키지 생성:
   - Basic: 2시간, 100장 보정, 1,500,000원
   - Standard: 4시간, 200장 보정, 2,500,000원
   - Premium: 8시간, 400장 보정, 3,500,000원

### 9-3. 일정 설정
1. 포토그래퍼 대시보드 → **일정 관리**
2. 촬영 가능한 날짜/시간 등록 (달력)

### 9-4. 옵션 서비스 등록 (선택)
- 스타일리스트 동반: +500,000원
- 메이크업: +300,000원
- 드레스 대여: +700,000원

---

## Step 10: 라이브 테스트

### 10-1. 사용자 관점 테스트
1. 새 이메일로 회원가입
2. 프로필 작성
3. 포토그래퍼 검색
4. 예약 진행 (완료까지)
5. 테스트 결제 진행 (Toss 테스트 카드 사용)
6. 후기 작성

### 10-2. 포토그래퍼 관점 테스트
1. 포토그래퍼 대시보드에서 예약 확인
2. 일정 업데이트
3. 채팅으로 클라이언트 소통

### 10-3. 성능 모니터링
1. Vercel Analytics 확인
   - 페이지 로딩 시간
   - 최상위 경로 (Top paths)
   - 에러율
2. Supabase 모니터링
   - API 호출 수
   - 스토리지 사용량
   - DB 쿼리 성능 (Slow Queries)

---

## 트러블슈팅

### 문제: "Failed to fetch from Supabase"
**해결:**
- `.env.local` 환경변수 확인
- Supabase URL과 API Key가 맞는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- RLS 정책이 SELECT를 허용하는지 확인

### 문제: "Storage bucket not found"
**해결:**
- Supabase → Storage에서 모든 버킷이 생성되었는지 확인
- 버킷명이 정확한지 확인 (`portfolios`, `avatars` 등)
- 공개/비공개 설정 재확인

### 문제: Toss 결제 버튼이 작동하지 않음
**해결:**
- `VITE_TOSS_CLIENT_KEY` 확인 (test_ck_로 시작해야 함)
- 브라우저 콘솔 에러 확인
- Toss Payments 테스트 카드 번호 확인

### 문제: 배포 후 라이브 결제가 실패함
**해결:**
- 환경변수에서 `test_ck_xxx` → `live_ck_xxx`로 정말 변경했는지 확인
- Vercel에서 새로 Deploy (Redeploy)했는지 확인
- Toss 사업자 심사가 완료되었는지 확인

### 문제: Supabase Edge Functions이 실행되지 않음
**해결:**
```bash
supabase functions list  # 배포 확인
supabase functions logs verify-payment  # 로그 확인
```

---

## 체크리스트

배포 전 아래 항목들을 모두 체크하세요:

### 단계 1-3: 데이터베이스
- [ ] Supabase 테이블 모두 생성 확인
- [ ] RLS 정책이 모든 테이블에 활성화됨
- [ ] 테이블 구조 확인 (예: profiles.id = users.id 외래키)

### 단계 4-5: 인증 & 환경
- [ ] 이메일 인증 템플릿 커스터마이징
- [ ] Google/Kakao OAuth 설정 완료 (선택사항)
- [ ] `.env.local` 모든 변수 입력
- [ ] `.env.production` 생성 (선택사항)

### 단계 6: 배포
- [ ] GitHub 코드 푸시 완료
- [ ] Vercel 프로젝트 생성 완료
- [ ] 환경변수 Vercel에 모두 입력
- [ ] 빌드 성공 (배포 로그 확인)
- [ ] `https://phosnap-xxx.vercel.app` 사이트 접속 가능

### 단계 7: 도메인
- [ ] 도메인 구매 완료
- [ ] Vercel에 도메인 추가
- [ ] DNS 설정 완료
- [ ] DNS 전파 완료 (24시간 내)
- [ ] SSL 인증서 자동 발급됨

### 단계 8-9: 테스트
- [ ] Toss 테스트 결제 성공
- [ ] 포토그래퍼 프로필 2-3개 생성
- [ ] 패키지 가격 설정
- [ ] 포트폴리오 사진 3장 이상 업로드
- [ ] 테스트 예약 완료
- [ ] 후기 작성 테스트

### 실거래 전환
- [ ] Toss 사업자 심사 완료
- [ ] 라이브 Client Key 발급받음
- [ ] 환경변수 업데이트 (`test_ck_xxx` → `live_ck_xxx`)
- [ ] Vercel Redeploy 실행
- [ ] 라이브 환경에서 테스트 결제 성공

---

## 연락처 & 지원

### Supabase 지원
- 공식 문서: [supabase.com/docs](https://supabase.com/docs)
- 커뮤니티 지원: Supabase Discord

### Toss Payments 지원
- 공식 문서: [toss.tech/docs](https://toss.tech/docs)
- 기술 지원 이메일: support@toss.tech

### Vercel 지원
- 공식 문서: [vercel.com/docs](https://vercel.com/docs)
- 커뮤니티: Vercel Discord

---

**마지막 업데이트:** 2026년 4월
**작성자:** Phosnap 팀
**대상:** Tyler (Korean Developer)
