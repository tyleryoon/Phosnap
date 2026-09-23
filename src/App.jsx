import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

// Layout
import Nav from './components/Nav';
import Toast from './components/Toast';
import ToastContainer from './components/ToastContainer';
import AuthModal from './components/AuthModal';
import InstallPrompt, { installPromptCSS } from './components/InstallPrompt';
import OnboardingOverlay from './components/OnboardingOverlay';
import { useAuth } from './contexts/AuthContext';
import ToastProvider from './contexts/ToastContext';

// Loading Fallback Component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    background: 'var(--bg)',
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '3px solid rgba(232,160,32,0.2)',
        borderTopColor: 'var(--gold)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{
        fontSize: '12px',
        color: 'var(--muted)',
        fontFamily: 'var(--font-serif)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Loading...
      </div>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Lazy-loaded Pages
const Home         = React.lazy(() => import('./pages/Home'));
const Photographers = React.lazy(() => import('./pages/Photographers'));
const Profile      = React.lazy(() => import('./pages/Profile'));
const Booking      = React.lazy(() => import('./pages/Booking'));
const ForArtists   = React.lazy(() => import('./pages/ForArtists'));
const Waitlist     = React.lazy(() => import('./pages/Waitlist'));
const Terms        = React.lazy(() => import('./pages/Terms'));
const Privacy      = React.lazy(() => import('./pages/Privacy'));
const Contact      = React.lazy(() => import('./pages/Contact'));
const BookingSuccess = React.lazy(() => import('./pages/BookingSuccess'));
const BookingFail  = React.lazy(() => import('./pages/BookingFail'));
const ArtistSchedule = React.lazy(() => import('./pages/ArtistSchedule'));
const MyBookings   = React.lazy(() => import('./pages/MyBookings'));
const StylistProfile = React.lazy(() => import('./pages/StylistProfile'));
const ArtistRegister = React.lazy(() => import('./pages/ArtistRegister'));
const ArtistDashboard = React.lazy(() => import('./pages/ArtistDashboard'));
const Support = React.lazy(() => import('./pages/Support'));
const VendorRegister = React.lazy(() => import('./pages/VendorRegister'));
// 새 예약 흐름 — 지역·날짜·시각·길이를 먼저 정하고 자유롭게 구성한다.
// 기존 /booking/:id 는 작가 프로필에서 바로 예약하는 경로로 남겨둔다.
const BookCompose = React.lazy(() => import('./pages/BookCompose'));
const VendorDashboard = React.lazy(() => import('./pages/VendorDashboard'));
// 찾기 페이지 — 주소는 유형별로 넷, 속은 FindShell 하나.
// 갈라놓되 구현은 한 벌만 둔다. (인수인계 5-23)
const FindStylists = React.lazy(() => import('./pages/FindStylists'));
const FindDresses  = React.lazy(() => import('./pages/FindDresses'));
const FindVenues   = React.lazy(() => import('./pages/FindVenues'));
const VendorProfile = React.lazy(() => import('./pages/VendorProfile'));
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard'));
const StylistDashboard = React.lazy(() => import('./pages/StylistDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const TourDetail = React.lazy(() => import('./pages/TourDetail'));
const AccountSettings = React.lazy(() => import('./pages/AccountSettings'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
import ProtectedRoute  from './components/ProtectedRoute';

// Styles
import './styles/global.css';

// ─── Scroll to Top on Route Change ──────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// Nav & Install Prompt CSS additions (not in global.css to keep it clean)
const navCSS = `
  ${installPromptCSS}

  /* ─── 페이지 레이아웃 ───────────────────────────────────────────────
   *
   * 여기에는 global.css 에 없는 것만 둔다.
   * 예전에는 .nav / .nav-link / .mobile-menu / .footer 가 양쪽에 다 있었고,
   * 이 블록이 <style> 로 나중에 실려서 global.css 를 조용히 덮었다.
   * 그래서 global.css 를 고쳐도 화면이 안 바뀌었다. 중복을 걷어냈다.
   */

  /* ── Hero ──
     화면을 꽉 채우고 가운데 정렬하는 대신 왼쪽에서 시작한다.
     가운데 정렬된 히어로는 어느 사이트에나 있다. */
  .hero {
    min-height: 88dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: 160px 40px 90px;
    max-width: var(--container);
    margin: 0 auto;
  }
  @media (max-width: 768px) { .hero { padding: 116px 20px 64px; min-height: auto; } }

  /* 후광 대신 아주 옅은 웜 톤 한 겹. 빛은 사진에서 와야 한다 */
  .hero-bg {
    position: absolute; inset: 0;
    pointer-events: none;
    background:
      radial-gradient(60% 50% at 78% 12%, var(--accent-a05) 0%, transparent 70%),
      radial-gradient(50% 40% at 6% 88%, var(--accent-a03) 0%, transparent 65%);
  }

  .hero-eyebrow {
    font-family: var(--font-mono);
    font-size: var(--t-label);
    letter-spacing: 0.16em;
    color: var(--accent);
    text-transform: uppercase;
    margin-bottom: 22px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  /* 양쪽 선을 없애고 왼쪽 한 획만 남긴다 — 대칭은 장식이지 구조가 아니다 */
  .hero-eyebrow::before { content: ''; width: 28px; height: 1px; background: var(--accent); flex-shrink: 0; }

  .hero-title {
    font-family: var(--font-serif);
    font-size: var(--t-display);
    font-weight: 400;
    letter-spacing: -0.035em;
    text-align: left;
    line-height: 0.98;
    color: var(--text);
    margin-bottom: 20px;
    max-width: 16ch;
    text-wrap: balance;
  }
  .hero-subtitle {
    font-family: var(--font-sans);
    font-size: clamp(1rem, 1.5vw, 1.1875rem);
    font-weight: 400;
    font-style: normal;
    color: var(--muted);
    text-align: left;
    margin-bottom: 40px;
    max-width: 38ch;
    line-height: 1.65;
  }
  .hero-ctas { display: flex; gap: 10px; flex-wrap: wrap; }

  /* ── Search ──
     태그는 .search-box 밖에 있다. 안에 넣으면 상자가 태그 높이까지
     늘어나고, top:0/bottom:0 인 버튼이 태그를 덮는다. */
  .search-box {
    width: 100%;
    max-width: 560px;
    position: relative;
    margin-top: 4px;
  }
  .search-input {
    width: 100%;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 400;
    padding: 16px 60px 16px 20px;
    outline: none;
    transition: border-color var(--ease-fast), box-shadow var(--ease-fast);
  }
  .search-input::placeholder { color: var(--faint); }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-a15);
  }
  .search-btn {
    position: absolute;
    right: 6px; top: 6px; bottom: 6px;
    width: 42px;
    background: var(--ink);
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background var(--ease-fast), transform var(--ease-fast);
  }
  .search-btn:hover { background: #34302A; }
  .search-btn:active { transform: scale(0.96); }
  .search-btn svg { width: 17px; height: 17px; color: var(--on-ink); }

  .search-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 40px; max-width: 560px; }
  .search-tag {
    font-size: var(--t-xs);
    color: var(--muted);
    padding: 6px 13px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--ease-fast);
    font-family: var(--font-sans);
  }
  .search-tag:hover { border-color: var(--text); color: var(--text); }

  /* ── 지역 카드 ──
     칸을 전부 같은 크기로 두면 목록이지 편집물이 아니다.
     첫 칸을 두 배로 잡아 리듬을 준다. */
  .location-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 10px;
  }
  @media (min-width: 900px) {
    .location-grid > .location-card:first-child { grid-column: span 2; grid-row: span 2; aspect-ratio: auto; }
  }
  @media (max-width: 600px) { .location-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }

  .location-card {
    position: relative;
    aspect-ratio: 3/4;
    overflow: hidden;
    cursor: pointer;
    background: var(--bg3);
    border-radius: var(--radius-lg);
  }
  .location-card:hover .location-overlay { opacity: 1; }
  .location-card:hover .location-img-inner { transform: scale(1.04); }
  .location-img { width: 100%; height: 100%; overflow: hidden; }
  .location-img-inner {
    width: 100%; height: 100%;
    background-size: cover; background-position: center;
    transition: transform 0.7s var(--ease-out);
  }
  .location-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 45%, var(--ink-a82) 100%);
    opacity: 0.88;
    transition: opacity var(--ease);
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 18px;
  }
  .location-name {
    font-family: var(--font-serif);
    font-size: 1.125rem;
    letter-spacing: -0.02em;
    font-weight: 400;
    text-transform: none;
    color: #FBFAF7;
  }
  .location-count { font-size: var(--t-xs); color: rgba(251, 250, 247, 0.72); margin-top: 2px; }

  /* ── 작가 카드 ──
     테두리 + 그림자 + 흰 배경의 3종 세트를 걷어냈다.
     사진이 카드고, 나머지는 캡션이다. */
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(258px, 1fr));
    gap: 28px 20px;
  }
  @media (max-width: 900px) { .photo-grid { grid-template-columns: repeat(2, 1fr); gap: 24px 14px; } }
  @media (max-width: 560px) { .photo-grid { grid-template-columns: 1fr; } }

  .photo-card {
    background: transparent;
    border: none;
    border-radius: 0;
    position: relative;
    cursor: pointer;
    transition: transform var(--ease);
    overflow: visible;
  }
  .photo-card:hover { transform: translateY(-3px); }
  .photo-card:hover .photo-card-arrow { opacity: 1; }

  .photo-card-slider {
    width: 100%;
    aspect-ratio: 4/5;
    overflow: hidden;
    position: relative;
    margin: 0;
    border-radius: var(--radius-lg);
    background: var(--bg3);
  }
  .photo-card-slider-track { display: flex; width: 100%; height: 100%; transition: transform 0.45s var(--ease-out); }
  .photo-card-slide { min-width: 100%; height: 100%; background-size: cover; background-position: center; }

  .photo-card-arrow {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(251, 250, 247, 0.92);
    color: var(--text);
    border: none; cursor: pointer;
    font-size: 15px; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity var(--ease-fast), transform var(--ease-fast);
    box-shadow: var(--shadow-sm);
  }
  .photo-card-arrow:hover { transform: translateY(-50%) scale(1.06); }
  .photo-card-arrow-left { left: 10px; }
  .photo-card-arrow-right { right: 10px; }
  @media (hover: none) { .photo-card-arrow { opacity: 0.85; } }

  .photo-card-indicator {
    position: absolute; top: 10px; right: 10px; z-index: 2;
    background: var(--ink-a55); color: #FBFAF7;
    font-size: 10px; font-family: var(--font-mono); letter-spacing: 0.02em;
    padding: 3px 8px; border-radius: var(--radius-full);
    backdrop-filter: blur(6px);
  }

  .photo-card-avatar { position: absolute; bottom: 10px; left: 10px; z-index: 2; }
  .photo-card-avatar-img {
    width: 34px; height: 34px;
    /* 원형 아바타 대신 둥근 사각 — 원은 어디에나 있다 */
    border-radius: 10px;
    background-size: cover; background-position: center;
    border: 2px solid rgba(251, 250, 247, 0.9);
    box-shadow: var(--shadow-sm);
  }

  .photo-card-body { padding: 13px 2px 0; }
  .photo-card-name { font-family: var(--font-sans); font-size: 0.9375rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 3px; }
  .photo-card-location { font-size: var(--t-xs); color: var(--muted); margin-bottom: 10px; display: flex; align-items: center; gap: 4px; }
  .photo-card-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
  .photo-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 11px; border-top: 1px solid var(--border); }
  .photo-card-price { font-family: var(--font-sans); font-size: 0.9375rem; font-weight: 600; }
  .photo-card-price span { font-size: var(--t-xs); color: var(--muted); margin-left: 3px; font-weight: 400; }
  .photo-card-rating { font-size: var(--t-xs); color: var(--muted); }
  .photo-card-rating .star { color: var(--accent); }
  .lang-chips { display: flex; gap: 4px; }

  /* ── Waitlist ── */
  .waitlist-section {
    padding: var(--space-32) 40px;
    position: relative;
    overflow: hidden;
    background: var(--bg3);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  @media (max-width: 768px) { .waitlist-section { padding: var(--space-20) 20px; } }
  .waitlist-inner { max-width: 620px; margin: 0 auto; text-align: left; position: relative; z-index: 1; }
  .waitlist-form { display: flex; gap: 8px; margin-top: 26px; }
  @media (max-width: 500px) {
    .waitlist-form { flex-direction: column; }
    .waitlist-form .btn-primary { width: 100%; }
  }
  .waitlist-input {
    flex: 1;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: var(--t-body);
    padding: 13px 16px;
    outline: none;
    transition: border-color var(--ease-fast), box-shadow var(--ease-fast);
  }
  .waitlist-input::placeholder { color: var(--faint); }
  .waitlist-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-a15); }

  /* ── 작가 프로필 ── */
  .profile-hero { display: grid; grid-template-columns: 1fr 1.6fr; gap: 44px; padding-top: 32px; }
  @media (max-width: 768px) { .profile-hero { grid-template-columns: 1fr; gap: 28px; } }
  .profile-photo { aspect-ratio: 3/4; background: var(--bg3); position: relative; border-radius: var(--radius-lg); overflow: hidden; }
  .profile-photo-inner { width: 100%; height: 100%; background-size: cover; background-position: center; }
  .profile-info { padding: 4px 0; }
  .profile-name { font-family: var(--font-serif); font-size: clamp(2rem, 3.6vw, 2.75rem); letter-spacing: -0.03em; line-height: 1.08; margin-bottom: 8px; }
  .profile-location { color: var(--muted); margin-bottom: 20px; font-size: var(--t-sm); display: flex; align-items: center; gap: 6px; }
  .profile-meta {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
    margin: 22px 0; padding: 20px 0;
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  }
  .meta-item { text-align: left; }
  .meta-val { font-family: var(--font-serif); font-size: 1.625rem; letter-spacing: -0.02em; color: var(--text); }
  .meta-label { font-size: var(--t-xs); color: var(--muted); margin-top: 2px; }
  @media (max-width: 500px) {
    .profile-name { font-size: 1.75rem; }
    .meta-val { font-size: 1.25rem; }
  }

  /* ── Footer ──
     4열 링크 농장을 3열로 줄였다. COMPANY 열은 전부 죽은 링크였다. */
  .footer { padding: var(--space-20) 40px var(--space-8); border-top: 1px solid var(--border); max-width: var(--container); margin: 0 auto; }
  @media (max-width: 768px) { .footer { padding: var(--space-12) 20px var(--space-6); } }
  .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 44px; margin-bottom: var(--space-12); }
  @media (max-width: 900px) { .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; } }
  @media (max-width: 500px) { .footer-top { grid-template-columns: 1fr; gap: 28px; } }
  .footer-logo { font-family: var(--font-serif); font-size: 1.125rem; letter-spacing: -0.01em; margin-bottom: 12px; }
  .footer-tagline { font-family: var(--font-sans); font-style: normal; color: var(--muted); font-size: var(--t-sm); }
  .footer-col-title {
    font-family: var(--font-sans);
    font-size: var(--t-label);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 14px;
    color: var(--faint);
  }
  .footer-link {
    display: block;
    font-size: var(--t-sm);
    color: var(--muted);
    margin-bottom: 9px;
    cursor: pointer;
    transition: color var(--ease-fast);
    width: fit-content;
  }
  .footer-link:hover { color: var(--text); }
  .footer-bottom {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 22px; border-top: 1px solid var(--border);
    font-size: var(--t-xs); color: var(--faint);
  }
  @media (max-width: 600px) { .footer-bottom { flex-direction: column; gap: 8px; align-items: flex-start; } }

  /* ── 예약 ── */
  .booking-layout { display: grid; grid-template-columns: 1fr 330px; gap: 44px; }
  .booking-mobile-bar { display: none; }
  @media (max-width: 900px) {
    .booking-layout { grid-template-columns: 1fr; }
    .booking-sidebar { display: none; }
    .booking-mobile-bar {
      display: block;
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: var(--z-mobile, 150);
      background: color-mix(in srgb, var(--bg2) 94%, transparent);
      border-top: 1px solid var(--border);
      padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 -2px 16px rgba(58, 48, 34, 0.07);
    }
  }
  .booking-progress {
    display: flex; gap: 0;
    margin-bottom: var(--space-10);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .booking-progress::-webkit-scrollbar { display: none; }
  .booking-progress-step {
    flex: 1; min-width: 84px;
    padding: 13px 8px;
    text-align: center;
    font-family: var(--font-sans);
    font-size: var(--t-xs);
    font-weight: 500;
    letter-spacing: 0;
    white-space: nowrap;
  }
  @media (max-width: 500px) {
    .booking-progress-step-label { display: none; }
    .booking-progress-step { padding: 12px 4px; min-width: 42px; }
  }

  /* ── Waitlist 역할 카드 ── */
  .waitlist-roles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: var(--space-10) 0 var(--space-12); }
  @media (max-width: 640px) { .waitlist-roles { grid-template-columns: 1fr; gap: 8px; margin: var(--space-8) 0 var(--space-10); } }

  /* ── Instagram ── */
  .instagram-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; max-width: 900px; margin: var(--space-8) auto var(--space-10); }
  @media (max-width: 600px) { .instagram-grid { grid-template-columns: repeat(2, 1fr); } }

  /* ── 강조 구간 ── */
  .section-pad-hero {
    background: var(--bg3);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: var(--space-24) 40px;
    text-align: left;
  }
  @media (max-width: 768px) { .section-pad-hero { padding: var(--space-16) 20px; } }

  /* ── 좁은 화면 보정 ── */
  @media (max-width: 500px) {
    .tab-btn { padding: 12px 13px; font-size: var(--t-xs); }
  }
  @media (max-width: 360px) {
    .tab-btn { padding: 10px 10px; font-size: 12px; }
  }
  @media (max-width: 600px) {
    .filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
    .filters::-webkit-scrollbar { display: none; }
    .filter-btn { white-space: nowrap; }
  }
  @media (max-width: 480px) {
    .hero-ctas { flex-direction: column; width: 100%; align-items: stretch; }
    .hero-ctas .btn-primary, .hero-ctas .btn-outline { width: 100%; }
  }
`;

// ─── Role-aware Home: activeRole 기반으로 대시보드 리다이렉트 ────────────
// 멀티롤 사용자가 고객으로 접속하면 홈 표시, 작가로 접속하면 대시보드로
const RoleAwareHome = ({ onAuthOpen }) => {
  const { activeRole, roleLoading, loading } = useAuth();
  if (loading || roleLoading) return null;
  if (activeRole === 'artist')                                          return <Navigate to="/artist/dashboard" replace />;
  if (activeRole === 'stylist')                                         return <Navigate to="/stylist/dashboard" replace />;
  if (activeRole === 'dress_vendor' || activeRole === 'vendor')         return <Navigate to="/vendor/dashboard" replace />;
  if (activeRole === 'admin')                                           return <Navigate to="/admin" replace />;
  // 고객 로그인 또는 비로그인 → 홈 페이지 표시
  return <Home onAuthOpen={onAuthOpen} />;
};


// ─── App Root ──────────────────────────────────────────────────────────

const AppContent = () => {
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'
  const [toast, setToast] = useState(null);

  return (
    <>
      {/* Inline extra CSS */}
      <style>{navCSS}</style>

      {/* Scroll to top on every route change */}
      <ScrollToTop />

      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Navigation */}
      <Nav onAuthOpen={(mode) => setAuthModal(mode)} />

      {/* Routes with Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        <main id="main-content">
          <Routes>
          <Route path="/"                    element={<RoleAwareHome onAuthOpen={(m) => setAuthModal(m)} />} />
          {/* 지역 탐색은 없앴다.
              하던 일은 '지역을 골라 작가 목록으로 보내기' 하나뿐이었고,
              그건 작가 찾기의 국가·도시 필터가 이미 한다. 메뉴에 둘을
              나란히 두면 고객은 뭐가 다른지 알 수 없다.
              주소는 남긴다 — 북마크와 검색 유입이 404 가 되면 안 된다. */}
          <Route path="/explore"             element={<Navigate to="/photographers" replace />} />
          <Route path="/photographers"       element={<Photographers onAuthOpen={(m) => setAuthModal(m)} />} />
          <Route path="/photographer/:id"    element={<Profile      onAuthOpen={(m) => setAuthModal(m)} />} />
          <Route path="/book"                element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)}><BookCompose /></ProtectedRoute>} />
          <Route path="/booking/:id"         element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)}><Booking /></ProtectedRoute>} />
          <Route path="/for-artists"         element={<ForArtists   onAuthOpen={(m) => setAuthModal(m)} />} />
          <Route path="/waitlist"            element={<Waitlist />} />
          <Route path="/terms"              element={<Terms />} />
          <Route path="/privacy"            element={<Privacy />} />
          <Route path="/contact"            element={<Contact />} />
          <Route path="/booking/success"    element={<BookingSuccess />} />
          <Route path="/booking/fail"       element={<BookingFail />} />
          <Route path="/artist/dashboard"   element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)} requiredRole="artist"><ArtistDashboard /></ProtectedRoute>} />
          <Route path="/artist/schedule"    element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)} requiredRole="artist"><ArtistSchedule /></ProtectedRoute>} />
          <Route path="/artist/register"    element={<ArtistRegister />} />
          <Route path="/my"                  element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/my-bookings"        element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)}><MyBookings /></ProtectedRoute>} />
          <Route path="/stylist/dashboard"  element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)} requiredRole="stylist"><StylistDashboard /></ProtectedRoute>} />
          <Route path="/stylist/:id"        element={<StylistProfile />} />
          {/* 찾기 — 유형별 주소. 검색 노출과 메뉴를 위해 넷으로 나눠뒀다. */}
          <Route path="/stylists"            element={<FindStylists />} />
          <Route path="/dresses"             element={<FindDresses />} />
          <Route path="/venues"              element={<FindVenues />} />
          {/* 예전 /vendors 는 하드코딩 목록을 그리던 가짜였다.
              기존 링크·북마크가 죽지 않게 의상 찾기로 넘긴다. */}
          <Route path="/vendors"             element={<Navigate to="/dresses" replace />} />
          {/* 이 라우트가 없어서 목록의 업체 카드가 전부 404 로 떨어졌다. */}
          <Route path="/vendor/:id"          element={<VendorProfile />} />
          <Route path="/vendor/register"    element={<VendorRegister />} />
          <Route path="/vendor/dashboard"   element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)} requiredRole="vendor"><VendorDashboard /></ProtectedRoute>} />
          <Route path="/tour/:instanceId"    element={<TourDetail />} />
          <Route path="/account/settings"   element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)}><AccountSettings /></ProtectedRoute>} />
          {/* 문의. ProtectedRoute 를 쓰지 않는다 — 비로그인에게는
              '로그인 필요' 대신 왜 필요한지 설명하는 화면을 보여준다. */}
          <Route path="/support"            element={<Support onAuthOpen={(m) => setAuthModal(m)} />} />
          <Route path="/admin"              element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)} requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          {/* 404 */}
          <Route path="*"                    element={<NotFound />} />
          </Routes>
        </main>
      </Suspense>

      {/* Auth modal */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Toast Container (new context-based system) */}
      <ToastContainer />

      {/* Onboarding Overlay */}
      <OnboardingOverlay />

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </>
  );
};

const App = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
