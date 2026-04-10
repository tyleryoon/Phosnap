# Phosnap — Light captured. Moments made.

전 세계 스냅촬영 작가와 고객을 연결하는 글로벌 스냅촬영 예약 플랫폼

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 빌드

```bash
npm run build
npm run preview
```

## 프로젝트 구조

```
phosnap/
├── src/
│   ├── assets/          # 이미지, 아이콘 등 정적 파일
│   ├── components/      # 재사용 컴포넌트
│   │   ├── AuthModal.jsx
│   │   ├── Corners.jsx  # 브랜드 코너마크
│   │   ├── Footer.jsx
│   │   ├── Icons.jsx
│   │   ├── Nav.jsx
│   │   ├── PhotographerCard.jsx
│   │   └── Toast.jsx
│   ├── data/            # Mock 데이터 (추후 API 교체)
│   │   ├── locations.js
│   │   └── photographers.js
│   ├── i18n/            # 다국어 번역
│   │   ├── ko.json      # 한국어
│   │   ├── en.json      # English
│   │   ├── ja.json      # 日本語
│   │   └── zh.json      # 中文
│   ├── pages/           # 라우팅 페이지
│   │   ├── Booking.jsx
│   │   ├── Explore.jsx
│   │   ├── ForArtists.jsx
│   │   ├── Home.jsx
│   │   ├── Photographers.jsx
│   │   ├── Profile.jsx
│   │   └── Waitlist.jsx
│   ├── styles/
│   │   ├── global.css   # 전역 스타일
│   │   └── tokens.css   # 디자인 토큰 (컬러/폰트 변수)
│   ├── App.jsx          # 라우터 + 레이아웃
│   └── main.jsx         # 진입점
├── index.html
├── vite.config.js
└── package.json
```

## 페이지 구성

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | 히어로, 지역 탐색, 주목 작가, 이용 방법, 웨이트리스트 |
| `/explore` | Explore | 국내/해외 지역 목록 |
| `/photographers` | Photographers | 작가 목록 + 필터 |
| `/photographer/:id` | Profile | 작가 상세 프로필 |
| `/booking/:id` | Booking | 날짜/패키지 선택 + 예약 확인 |
| `/for-artists` | For Artists | 작가 등록 안내 |
| `/waitlist` | Waitlist | 얼리액세스 이메일 수집 |

## 디자인 토큰

| 변수 | 값 | 용도 |
|------|-----|------|
| `--bg` | `#0B0B0B` | 메인 배경 |
| `--text` | `#F2F2F2` | 메인 텍스트 |
| `--gold` | `#E8A020` | 포인트 컬러 |
| `--font-serif` | Cinzel | 타이틀 |
| `--font-elegant` | Cormorant Garamond | 서브타이틀 |
| `--font-sans` | Noto Sans KR/JP/SC | 본문 |

## 기술 스택

- **React 18** + **Vite 5**
- **React Router v6** (클라이언트 사이드 라우팅)
- **CSS Variables** (디자인 토큰)
- **i18n** (ko/en/ja/zh JSON 기반, 추후 react-i18next 연동)

## 향후 작업

- [ ] i18next 실제 연동 (언어 전환 UI)
- [ ] 백엔드 API 연결 (Supabase 또는 Firebase)
- [ ] 결제 연동 (Stripe / Toss Payments)
- [ ] 실제 이미지 및 작가 데이터
- [ ] 작가 대시보드 페이지
- [ ] SEO 최적화 (react-helmet)
- [ ] 배포 (Vercel / Netlify)
