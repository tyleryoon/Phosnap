import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon, CloseIcon } from './Icons';
import { useLanguage, LANG_LABELS } from '../contexts/LanguageContext';
// import { useCurrency } from '../contexts/CurrencyContext'; // removed — currency selector no longer shown
import { useAuth } from '../contexts/AuthContext';
import logoMark from '../assets/logo-mark.svg';
import LogoText from './LogoText';
import NotificationBell from './NotificationBell';
import RoleSwitcher from './RoleSwitcher';
import AlertDot from './AlertDot';
import useAdminAttention from '../hooks/useAdminAttention';

// ─── Navigation ────────────────────────────────────────────────────────

const Nav = ({ onAuthOpen }) => {
  const { isLoggedIn, userName, isArtist, isVendor, isStylist, isAdmin, logout } = useAuth();
  // 관리자가 확인해야 할 것이 있으면 링크 옆에 표시한다.
  // 활성 역할이 작가여도 관리자 계정이면 알려준다.
  const { counts, total } = useAdminAttention();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  // currency dropdown removed — card payments auto-convert
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  // const { currency, setCurrency, symbol, currencies } = useCurrency(); // removed

  // ── 같은 페이지 링크 클릭 시 새로고침 ──────────────────────────────
  const handleNavClick = useCallback((e, to) => {
    // 현재 같은 경로면 강제로 페이지 새로고침
    if (pathname === to || (to === '/photographers' && pathname.startsWith('/photographer'))) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // 대시보드/마이페이지 등 모든 페이지에서 확실하게 데이터 리프레시
      navigate(to, { replace: true, state: { _refresh: Date.now() } });
      // 0.05초 후 reload로 확실한 리프레시 (state 기반 리렌더가 안 되는 페이지 대응)
      setTimeout(() => window.location.reload(), 50);
    }
  }, [pathname, navigate]);

  // ── 스크롤 반응 ──────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── 활성 탭 판별 (하위 경로 포함) ───────────────────────────────────
  const isActive = (to) => {
    if (to === '/photographers') return pathname.startsWith('/photographer');
    if (to === '/book')          return pathname.startsWith('/book');
    if (to === '/explore')       return pathname === '/explore';
    if (to === '/for-artists')   return pathname === '/for-artists';
    return pathname === to;
  };

  const navLinks = [
    // 지역탐색 + 작가 찾기는 누구에게나 보인다.
    //
    // 예전에는 작가·벤더 로그인 시 숨겼다. 그래서 공급자가 자기 프로필이
    // 고객에게 어떻게 보이는지, 같은 지역에 누가 있는지 확인할 수 없었다.
    // 노출 상태를 아는 건 공급자에게 필요한 일이다.
    { to: '/explore',       label: t('nav.explore') },
    { to: '/photographers', label: t('nav.photographers') },
    // 유형별 찾기. 헤메만·의상만·장소만 찾으러 오는 사람이 있다.
    // 주소는 넷으로 나뉘지만 화면은 FindShell 하나다 (인수인계 5-23).
    { to: '/stylists',      label: '헤어메이크업' },
    { to: '/dresses',       label: '의상' },
    { to: '/venues',        label: '장소' },
    // 새 예약 흐름. 날짜·시각을 먼저 정하고 자유롭게 구성한다.
    // 로그인한 사람에게만 보인다 — 비로그인은 눌러도 로그인 벽에 막힌다.
    ...(isLoggedIn ? [{ to: '/book', label: t('nav.book') }] : []),
    // 작가 등록 탭: 비로그인 시에만 표시
    ...(!isLoggedIn ? [{ to: '/for-artists', label: t('nav.forArtists') }] : []),
  ];

  return (
    <>
      {/* 배경·테두리는 global.css 의 .nav / .nav.scrolled 가 정한다.
          여기서 인라인으로 칠하면 인라인이 이겨서, 팔레트를 바꿔도
          내비만 옛날 색으로 남는다. 실제로 그렇게 됐었다. */}
      <nav
        className={`nav${scrolled ? ' scrolled' : ''}`}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Logo */}
        <Link to="/" className="nav-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => handleNavClick(e, '/')}>
          <img src={logoMark} alt="Phosnap mark" style={{ width: 28, height: 28, opacity: 0.9 }} />
          <LogoText />
        </Link>

        {/* Desktop links */}
        <div className="nav-links">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${isActive(to) ? 'active' : ''}`}
              aria-current={isActive(to) ? 'page' : undefined}
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleNavClick(e, to)}
            >
              {label}
            </Link>
          ))}

          {/* Language dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-serif)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: langDropdownOpen ? 'var(--gold)' : 'var(--muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
              onMouseEnter={e => !langDropdownOpen && (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => !langDropdownOpen && (e.currentTarget.style.color = 'var(--muted)')}
            >
              {lang.toUpperCase()}
              <span style={{ fontSize: 8, marginTop: 1 }}>▼</span>
            </button>

            {langDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: 'var(--bg2)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 4,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  zIndex: 200,
                  minWidth: 100,
                  overflow: 'hidden',
                }}
              >
                {LANG_LABELS.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLang(code);
                      setLangDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: lang === code ? 'var(--accent-a10)' : 'transparent',
                      border: 'none',
                      borderBottom: code !== LANG_LABELS[LANG_LABELS.length - 1].code ? '1px solid var(--border)' : 'none',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: lang === code ? 'var(--gold)' : 'var(--muted)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (lang !== code) e.currentTarget.style.background = 'var(--accent-a05)';
                    }}
                    onMouseLeave={e => {
                      if (lang !== code) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>


          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NotificationBell />
              {/* 멀티롤 계정 전환. 역할이 하나면 아무것도 안 그린다. */}
              <RoleSwitcher />
              {isAdmin && (
                <Link to="/admin"
                  style={{ fontSize: 11, color: 'var(--grade-4)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  ⚙ Admin
                  <AlertDot count={total} title={`승인 대기 ${counts.pending_roles}건 · 문의 ${counts.open_inquiries}건`} />
                </Link>
              )}
              {isArtist && (
                <Link to="/artist/dashboard"
                  onClick={(e) => handleNavClick(e, '/artist/dashboard')}
                  style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  {t('nav.dashboard')}
                </Link>
              )}
              {isVendor && (
                <Link to="/vendor/dashboard"
                  onClick={(e) => handleNavClick(e, '/vendor/dashboard')}
                  style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  벤더 대시보드
                </Link>
              )}
              {isStylist && (
                <Link to="/stylist/dashboard"
                  onClick={(e) => handleNavClick(e, '/stylist/dashboard')}
                  style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  {t('nav.dashboard')}
                </Link>
              )}
              {!isArtist && !isVendor && !isStylist && !isAdmin && (
                <Link to="/my"
                  onClick={(e) => handleNavClick(e, '/my')}
                  style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  {t('nav.myPage') || '마이페이지'}
                </Link>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName.split(' ')[0]}
              </div>
              <Link to="/account/settings"
                onClick={(e) => handleNavClick(e, '/account/settings')}
                style={{ fontSize: 18, color: 'var(--muted)', textDecoration: 'none', lineHeight: 1, padding: '2px 4px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                ⚙
              </Link>
              <button className="btn-ghost" style={{ fontSize: '11px' }} onClick={async () => { await logout(); navigate('/'); }}>{t('nav.logout')}</button>
            </div>
          ) : (
            <>
              <button className="btn-ghost" style={{ fontSize: '12px', color: 'var(--gold)' }} onClick={() => onAuthOpen('login')}>{t('nav.login')}</button>
              <button className="btn-primary" style={{ padding: '11px 22px', fontSize: '12px', letterSpacing: '0.1em' }} onClick={() => onAuthOpen('signup')}>
                {t('nav.signup')}
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-label="Toggle navigation menu">
          <MenuIcon />
        </button>
      </nav>

      {/* Mobile fullscreen menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          <div className="nav-logo" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoMark} alt="Phosnap mark" style={{ width: 32, height: 32, opacity: 0.9 }} />
            <LogoText />
          </div>
          <div className="divider" style={{ width: 60 }} />

          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="mobile-nav-link"
              style={{ textDecoration: 'none' }}
              onClick={(e) => { handleNavClick(e, to); setMobileOpen(false); }}
            >
              {label}
            </Link>
          ))}

          {isLoggedIn ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>{userName}</div>
              {/* 멀티롤 전환. 고르면 메뉴를 닫고 해당 대시보드로 이동한다. */}
              <RoleSwitcher onNavigate={() => setMobileOpen(false)} />
              {/* 모바일 메뉴에는 관리자 링크가 아예 없었다. */}
              {isAdmin && (
                <Link to="/admin" className="mobile-nav-link" style={{ textDecoration: 'none', color: 'var(--grade-4)', display: 'inline-flex', alignItems: 'center' }} onClick={() => setMobileOpen(false)}>
                  ⚙ Admin
                  <AlertDot count={total} title={`승인 대기 ${counts.pending_roles}건 · 문의 ${counts.open_inquiries}건`} />
                </Link>
              )}
              {isArtist && (
                <Link to="/artist/dashboard" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={(e) => { handleNavClick(e, '/artist/dashboard'); setMobileOpen(false); }}>
                  {t('nav.dashboard')}
                </Link>
              )}
              {isVendor && (
                <Link to="/vendor/dashboard" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={(e) => { handleNavClick(e, '/vendor/dashboard'); setMobileOpen(false); }}>
                  벤더 대시보드
                </Link>
              )}
              {isStylist && (
                <Link to="/stylist/dashboard" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={(e) => { handleNavClick(e, '/stylist/dashboard'); setMobileOpen(false); }}>
                  {t('nav.dashboard')}
                </Link>
              )}
              {!isArtist && !isVendor && !isStylist && (
                <Link to="/my" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={(e) => { handleNavClick(e, '/my'); setMobileOpen(false); }}>
                  {t('nav.myPage') || '마이페이지'}
                </Link>
              )}
              <Link to="/account/settings" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={(e) => { handleNavClick(e, '/account/settings'); setMobileOpen(false); }}>
                {lang === 'ko' ? '⚙ 개인정보 관리' : lang === 'ja' ? '⚙ アカウント設定' : '⚙ Account Settings'}
              </Link>
              <button className="btn-ghost" onClick={async () => { await logout(); setMobileOpen(false); navigate('/'); }}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <span className="mobile-nav-link" style={{ color: 'var(--gold)' }} onClick={() => { onAuthOpen('login'); setMobileOpen(false); }}>
                {t('nav.login')}
              </span>
              <button className="btn-primary" onClick={() => { onAuthOpen('signup'); setMobileOpen(false); }}>
                {t('nav.signup')}
              </button>
            </>
          )}

          {/* Instagram (mobile) */}
          <a
            href="https://instagram.com/phosnap.kr"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', textDecoration: 'none', fontSize: 13, letterSpacing: '0.08em' }}
            onClick={() => setMobileOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
            @phosnap.kr
          </a>

          {/* Language switcher (mobile) */}
          <div style={{ marginTop: 8 }}>
            <select
              value={lang}
              onChange={e => { setLang(e.target.value); setMobileOpen(false); }}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border-hover)',
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--gold)',
                cursor: 'pointer',
                padding: '8px 16px',
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238C6D46%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: 32,
              }}
            >
              {LANG_LABELS.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>


          <button
            style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            onClick={() => setMobileOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  );
};

export default Nav;
