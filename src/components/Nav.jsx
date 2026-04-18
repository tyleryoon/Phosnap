import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon, CloseIcon } from './Icons';
import { useLanguage, LANG_LABELS } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import logoMark from '../assets/logo-mark.svg';
import LogoText from './LogoText';

// ─── Navigation ────────────────────────────────────────────────────────

const Nav = ({ onAuthOpen }) => {
  const { isLoggedIn, userName, isArtist, isVendor, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const { currency, setCurrency, symbol, currencies } = useCurrency();

  // ── 같은 페이지 링크 클릭 시 새로고침 ──────────────────────────────
  const handleNavClick = useCallback((e, to) => {
    // 현재 같은 경로면 강제로 페이지 상태 리셋
    if (pathname === to || (to === '/photographers' && pathname.startsWith('/photographer'))) {
      e.preventDefault();
      // navigate로 같은 경로에 replace + 상태 변경 → 컴포넌트 리렌더
      navigate(to, { replace: true, state: { _refresh: Date.now() } });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (to === '/explore')       return pathname === '/explore';
    if (to === '/for-artists')   return pathname === '/for-artists';
    return pathname === to;
  };

  const navLinks = [
    // 지역탐색 + 작가 찾기: 작가 또는 벤더 로그인 시 숨김
    ...(!isArtist && !isVendor ? [{ to: '/explore', label: t('nav.explore') }] : []),
    ...(!isArtist && !isVendor ? [{ to: '/photographers', label: t('nav.photographers') }] : []),
    // 작가 등록 탭: 비로그인 시에만 표시
    ...(!isLoggedIn ? [{ to: '/for-artists', label: t('nav.forArtists') }] : []),
  ];

  return (
    <>
      <nav
        className="nav"
        style={{
          background: scrolled
            ? 'rgba(11,11,11,0.97)'
            : 'linear-gradient(180deg, rgba(11,11,11,0.92) 0%, transparent 100%)',
          borderBottom: scrolled ? '1px solid var(--border-hover)' : '1px solid var(--border)',
          boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.4)' : 'none',
          transition: 'background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease',
        }}
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
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleNavClick(e, to)}
            >
              {label}
            </Link>
          ))}

          {/* Divider */}
          <span style={{ width: '1px', height: '16px', background: 'var(--border-hover)', display: 'inline-block' }} />

          {/* Language switcher */}
          <div style={{ display: 'flex', gap: 2 }}>
            {LANG_LABELS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: lang === code ? 'var(--gold)' : 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  transition: 'color 0.2s',
                  borderBottom: lang === code ? '1px solid var(--gold)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Currency selector */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-serif)',
                fontSize: 13,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => !currencyDropdownOpen && (e.currentTarget.style.color = 'var(--muted)')}
            >
              {symbol}
              <span style={{ fontSize: 9, marginTop: 2 }}>▼</span>
            </button>

            {currencyDropdownOpen && (
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
                  minWidth: 140,
                  overflow: 'hidden',
                }}
              >
                {currencies.map(curr => (
                  <button
                    key={curr}
                    onClick={() => {
                      setCurrency(curr);
                      setCurrencyDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: currency === curr ? 'rgba(232,160,32,0.1)' : 'transparent',
                      border: 'none',
                      borderBottom: curr !== currencies[currencies.length - 1] ? '1px solid var(--border)' : 'none',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: currency === curr ? 'var(--gold)' : 'var(--muted)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (currency !== curr) e.currentTarget.style.background = 'rgba(232,160,32,0.05)';
                    }}
                    onMouseLeave={e => {
                      if (currency !== curr) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Instagram icon */}
          <a
            href="https://instagram.com/phosnap.kr"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          {/* Divider */}
          <span style={{ width: '1px', height: '16px', background: 'var(--border-hover)', display: 'inline-block' }} />

          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isAdmin && (
                <Link to="/admin"
                  style={{ fontSize: 11, color: '#f472b6', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  ⚙ Admin
                </Link>
              )}
              {isArtist && (
                <Link to="/artist/dashboard"
                  style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  {t('nav.dashboard')}
                </Link>
              )}
              {isVendor && (
                <Link to="/vendor/dashboard"
                  style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  벤더 대시보드
                </Link>
              )}
              {!isArtist && !isVendor && !isAdmin && (
                <Link to="/my"
                  style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textDecoration: 'none' }}>
                  {t('nav.myPage') || '마이페이지'}
                </Link>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName.split(' ')[0]}
              </div>
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
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
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
              {isArtist && (
                <Link to="/artist/dashboard" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
                  {t('nav.dashboard')}
                </Link>
              )}
              {isVendor && (
                <Link to="/vendor/dashboard" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
                  벤더 대시보드
                </Link>
              )}
              {!isArtist && !isVendor && (
                <Link to="/my" className="mobile-nav-link" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
                  {t('nav.myPage') || '마이페이지'}
                </Link>
              )}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {LANG_LABELS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => { setLang(code); setMobileOpen(false); }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${lang === code ? 'var(--gold)' : 'var(--border-hover)'}`,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: lang === code ? 'var(--gold)' : 'var(--muted)',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Currency selector (mobile) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {currencies.map(curr => (
              <button
                key={curr}
                onClick={() => { setCurrency(curr); setMobileOpen(false); }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${currency === curr ? 'var(--gold)' : 'var(--border-hover)'}`,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: currency === curr ? 'var(--gold)' : 'var(--muted)',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  transition: 'all 0.2s',
                }}
              >
                {curr}
              </button>
            ))}
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
