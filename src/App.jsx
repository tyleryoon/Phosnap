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
const Explore      = React.lazy(() => import('./pages/Explore'));
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
const VendorRegister = React.lazy(() => import('./pages/VendorRegister'));
const VendorDashboard = React.lazy(() => import('./pages/VendorDashboard'));
const Vendors = React.lazy(() => import('./pages/Vendors'));
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


  .nav {
    position: fixed; top: 0; left: 0; right: 0;
    z-index: 100; padding: 20px 48px;
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(180deg, rgba(11,11,11,0.95) 0%, transparent 100%);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
  }
  @media (max-width: 768px) { .nav { padding: 16px 20px; } }

  .nav-logo { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 600; letter-spacing: 0.2em; color: var(--text); cursor: pointer; }
  .nav-links { display: flex; gap: 32px; align-items: center; }
  @media (max-width: 768px) { .nav-links { display: none; } }
  .nav-link { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.15em; color: rgba(242,242,242,0.82); cursor: pointer; text-transform: uppercase; transition: color 0.2s; font-weight: 500; }
  .nav-link:hover, .nav-link.active { color: #f2f2f2; text-shadow: 0 0 12px rgba(242,242,242,0.3); }

  .mobile-menu-btn { display: none; background: transparent; border: none; color: var(--text); cursor: pointer; padding: 4px; }
  @media (max-width: 768px) { .mobile-menu-btn { display: flex; } }

  .mobile-menu {
    position: fixed; inset: 0; background: var(--bg); z-index: 150;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px;
  }
  .mobile-nav-link { font-family: 'Cinzel', serif; font-size: 18px; letter-spacing: 0.2em; color: var(--text); cursor: pointer; text-transform: uppercase; }

  /* Hero */
  .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 120px 24px 80px; }
  .hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(232,160,32,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(232,160,32,0.03) 0%, transparent 60%); }
  .hero-eyebrow { font-family: 'Cinzel', serif; font-size: clamp(14px, 1.8vw, 20px); letter-spacing: 0.3em; color: var(--gold); text-transform: uppercase; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
  .hero-eyebrow::before, .hero-eyebrow::after { content: ''; width: 56px; height: 1px; background: var(--gold-border); }
  .hero-title { font-family: 'Cinzel', serif; font-size: clamp(36px, 7vw, 80px); font-weight: 400; letter-spacing: 0.05em; text-align: center; line-height: 1.1; color: var(--text); text-shadow: 0 0 60px rgba(242,242,242,0.1); margin-bottom: 16px; }
  .hero-subtitle { font-family: var(--font-sans); font-size: clamp(18px, 2.5vw, 24px); font-weight: 300; font-style: italic; color: var(--muted); text-align: center; margin-bottom: 48px; letter-spacing: 0.02em; }
  .hero-ctas { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }

  /* Search */
  .search-box { width: 100%; max-width: 640px; position: relative; margin-bottom: 40px; }
  .search-input { width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(242,242,242,0.35); color: var(--text); font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 300; padding: 20px 68px 20px 28px; outline: none; transition: all 0.3s; }
  .search-input::placeholder { color: rgba(242,242,242,0.45); }
  .search-input:focus { border-color: var(--gold); background: rgba(232,160,32,0.06); box-shadow: 0 0 0 1px rgba(232,160,32,0.3); }
  .search-btn { position: absolute; right: 0; top: 0; bottom: 0; width: 60px; background: var(--gold); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
  .search-btn:hover { background: #f0ac2a; }
  .search-btn svg { width: 20px; height: 20px; color: #0B0B0B; }
  .search-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
  .search-tag { font-size: 11px; color: rgba(242,242,242,0.55); padding: 5px 14px; border: 1px solid rgba(242,242,242,0.2); cursor: pointer; transition: all 0.2s; font-family: 'Noto Sans KR', sans-serif; }
  .search-tag:hover { border-color: var(--gold-border); color: var(--gold); }

  /* Location cards */
  .location-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 2px; }
  @media (max-width: 600px) { .location-grid { grid-template-columns: repeat(2, 1fr); } }
  .location-card { position: relative; aspect-ratio: 3/4; overflow: hidden; cursor: pointer; background: var(--bg3); }
  .location-card:hover .location-overlay { opacity: 1; }
  .location-card:hover .location-img-inner { transform: scale(1.05); }
  .location-img { width: 100%; height: 100%; overflow: hidden; }
  .location-img-inner { width: 100%; height: 100%; background-size: cover; background-position: center; transition: transform 0.6s ease; }
  .location-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(11,11,11,0.85) 100%); opacity: 0.7; transition: opacity 0.3s; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; }
  .location-name { font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 0.15em; font-weight: 500; text-transform: uppercase; }
  .location-count { font-size: 11px; color: var(--gold); margin-top: 2px; }

  /* Photographer card */
  .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
  @media (max-width: 900px) { .photo-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .photo-grid { grid-template-columns: 1fr; } }
  .photo-card { background: var(--bg2); border: 1px solid var(--border); position: relative; cursor: pointer; transition: border-color 0.3s, transform 0.3s; overflow: hidden; }
  .photo-card:hover { border-color: var(--gold-border); transform: translateY(-4px); }
  .photo-card:hover .photo-card-arrow { opacity: 1; }

  /* ── 슬라이더 (넷플릭스 스타일) ── */
  .photo-card-slider { width: calc(100% - 12px); aspect-ratio: 4/3; overflow: hidden; position: relative; margin: 6px auto 0; }
  .photo-card-slider-track { display: flex; width: 100%; height: 100%; transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .photo-card-slide { min-width: 100%; height: 100%; background-size: cover; background-position: center; }

  /* 좌우 화살표 */
  .photo-card-arrow {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(0,0,0,0.55); color: #fff; border: none; cursor: pointer;
    font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.25s;
    backdrop-filter: blur(4px);
  }
  .photo-card-arrow-left { left: 8px; }
  .photo-card-arrow-right { right: 8px; }
  @media (hover: none) { .photo-card-arrow { opacity: 0.7; } }

  /* 페이지 인디케이터 (1/5) */
  .photo-card-indicator {
    position: absolute; top: 10px; right: 10px; z-index: 2;
    background: rgba(0,0,0,0.55); color: #fff;
    font-size: 10px; font-family: 'Cinzel', serif; letter-spacing: 0.05em;
    padding: 2px 8px; border-radius: 10px;
    backdrop-filter: blur(4px);
  }

  /* 프로필 아바타 (좌하단) */
  .photo-card-avatar {
    position: absolute; bottom: 10px; left: 12px; z-index: 2;
  }
  .photo-card-avatar-img {
    width: 36px; height: 36px; border-radius: 50%;
    background-size: cover; background-position: center;
    border: 2px solid rgba(255,255,255,0.85);
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }

  .photo-card-body { padding: 20px; }
  .photo-card-name { font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 0.1em; margin-bottom: 6px; }
  .photo-card-location { font-size: 12px; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; gap: 4px; }
  .photo-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .photo-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border); }
  .photo-card-price { font-family: 'Cinzel', serif; font-size: 15px; }
  .photo-card-price span { font-size: 11px; color: var(--muted); margin-left: 2px; }
  .photo-card-rating { font-size: 12px; color: var(--muted); }
  .photo-card-rating .star { color: var(--gold); }
  .lang-chips { display: flex; gap: 4px; }

  /* Waitlist section */
  .waitlist-section { padding: 100px 48px; position: relative; overflow: hidden; background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  @media (max-width: 768px) { .waitlist-section { padding: 60px 20px; } }
  .waitlist-inner { max-width: 600px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
  .waitlist-form { display: flex; gap: 0; margin-top: 32px; }
  @media (max-width: 500px) { .waitlist-form { flex-direction: column; gap: 8px; } .waitlist-form .btn-primary { width: 100%; justify-content: center; } }
  .waitlist-input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid var(--border-hover); border-right: none; color: var(--text); font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 300; padding: 14px 20px; outline: none; transition: all 0.3s; }
  .waitlist-input::placeholder { color: var(--muted); }
  .waitlist-input:focus { border-color: var(--gold-border); }
  @media (max-width: 500px) { .waitlist-input { border-right: 1px solid var(--border-hover); } }

  /* Profile page */
  .profile-hero { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; padding-top: 40px; }
  @media (max-width: 768px) { .profile-hero { grid-template-columns: 1fr; } }
  .profile-photo { aspect-ratio: 3/4; background: var(--bg3); position: relative; }
  .profile-photo-inner { width: 100%; height: 100%; background-size: cover; background-position: center; }
  .profile-info { padding: 8px 0; }
  .profile-name { font-family: 'Cinzel', serif; font-size: 32px; letter-spacing: 0.08em; margin-bottom: 8px; }
  .profile-location { color: var(--muted); margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 6px; }
  .profile-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; padding: 20px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .meta-item { text-align: center; }
  .meta-val { font-family: 'Cinzel', serif; font-size: 20px; color: var(--gold); }
  .meta-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

  /* Footer */
  .footer { padding: 60px 48px 32px; border-top: 1px solid var(--border); max-width: 1200px; margin: 0 auto; }
  @media (max-width: 768px) { .footer { padding: 40px 20px 24px; } }
  .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 48px; }
  @media (max-width: 900px) { .footer-top { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 500px) { .footer-top { grid-template-columns: 1fr; } }
  .footer-logo { font-family: 'Cinzel', serif; font-size: 18px; letter-spacing: 0.2em; margin-bottom: 12px; }
  .footer-tagline { font-family: var(--font-sans); font-style: italic; color: var(--muted); font-size: 15px; }
  .footer-col-title { font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; color: var(--gold); }
  .footer-link { display: block; font-size: 13px; color: var(--muted); margin-bottom: 8px; cursor: pointer; transition: color 0.2s; }
  .footer-link:hover { color: var(--text); }
  .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); }
  @media (max-width: 600px) { .footer-bottom { flex-direction: column; gap: 8px; text-align: center; } }

  /* ── Booking page ── */
  .booking-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 48px;
  }
  /* Mobile booking summary bar: 기본 숨김 */
  .booking-mobile-bar {
    display: none;
  }
  @media (max-width: 900px) {
    .booking-layout { grid-template-columns: 1fr; }
    .booking-sidebar { display: none; }
    .booking-mobile-bar {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: var(--z-mobile, 150);
      background: var(--bg2);
      border-top: 1px solid var(--gold-border);
      padding: 12px 20px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  }
  .booking-progress {
    display: flex;
    gap: 0;
    margin-bottom: 48px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .booking-progress-step {
    flex: 1;
    min-width: 80px;
    padding: 14px 8px;
    text-align: center;
    font-family: var(--font-serif);
    font-size: 10px;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
  @media (max-width: 500px) {
    .booking-progress-step-label { display: none; }
    .booking-progress-step { padding: 12px 4px; min-width: 40px; }
  }

  /* ── Waitlist role cards ── */
  .waitlist-roles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 48px 0 56px;
  }
  @media (max-width: 640px) {
    .waitlist-roles { grid-template-columns: 1fr; gap: 8px; margin: 32px 0 40px; }
  }

  /* ── Instagram feed grid ── */
  .instagram-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    max-width: 900px;
    margin: 36px auto 40px;
  }
  @media (max-width: 600px) {
    .instagram-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ── Section with inline-style-like paddings ── */
  .section-pad-hero {
    background: var(--bg2);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 80px 48px;
    text-align: center;
  }
  @media (max-width: 768px) { .section-pad-hero { padding: 60px 20px; } }

  /* ── Profile: name responsive ── */
  @media (max-width: 500px) {
    .profile-name { font-size: 22px; }
    .meta-val { font-size: 16px; }
  }

  /* ── Tab nav: tighter padding on small screens ── */
  @media (max-width: 500px) {
    .tab-btn { padding: 12px 14px; font-size: 10px; letter-spacing: 0.1em; }
  }
  @media (max-width: 360px) {
    .tab-btn { padding: 10px 10px; font-size: 9px; letter-spacing: 0.06em; }
  }

  /* ── Filters: horizontal scroll on mobile ── */
  @media (max-width: 600px) {
    .filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
    .filters::-webkit-scrollbar { display: none; }
    .filter-btn { white-space: nowrap; }
  }

  /* ── Hero CTA buttons full width on mobile ── */
  @media (max-width: 480px) {
    .hero-ctas { flex-direction: column; width: 100%; }
    .hero-ctas .btn-primary,
    .hero-ctas .btn-outline { width: 100%; justify-content: center; }
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

// ─── Role-aware Explore: activeRole 기반 리다이렉트 ────────────────────
const RoleAwareExplore = () => {
  const { activeRole, roleLoading, loading } = useAuth();
  if (loading || roleLoading) return null;
  if (activeRole === 'artist')                                          return <Navigate to="/artist/dashboard" replace />;
  if (activeRole === 'stylist')                                         return <Navigate to="/stylist/dashboard" replace />;
  if (activeRole === 'dress_vendor' || activeRole === 'vendor')         return <Navigate to="/vendor/dashboard" replace />;
  // customer 또는 기타 → Explore 페이지
  return <Explore />;
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
          <Route path="/explore"             element={<RoleAwareExplore />} />
          <Route path="/photographers"       element={<Photographers onAuthOpen={(m) => setAuthModal(m)} />} />
          <Route path="/photographer/:id"    element={<Profile      onAuthOpen={(m) => setAuthModal(m)} />} />
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
          <Route path="/vendors"             element={<Vendors />} />
          <Route path="/vendor/register"    element={<VendorRegister />} />
          <Route path="/vendor/dashboard"   element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)} requiredRole="vendor"><VendorDashboard /></ProtectedRoute>} />
          <Route path="/tour/:instanceId"    element={<TourDetail />} />
          <Route path="/account/settings"   element={<ProtectedRoute onAuthOpen={(m) => setAuthModal(m)}><AccountSettings /></ProtectedRoute>} />
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
