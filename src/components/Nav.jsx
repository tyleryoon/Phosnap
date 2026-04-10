import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, CloseIcon } from './Icons';
import { useLanguage, LANG_LABELS } from '../contexts/LanguageContext';
import logoMark from '../assets/logo-mark.svg';
import LogoText from './LogoText';

// ─── Navigation ────────────────────────────────────────────────────────

const Nav = ({ onAuthOpen }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const { pathname } = useLocation();
  const { lang, setLang, t } = useLanguage();

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
    { to: '/explore',       label: t('nav.explore') },
    { to: '/photographers', label: t('nav.photographers') },
    { to: '/for-artists',   label: t('nav.forArtists') },
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
        <Link to="/" className="nav-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
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

          {/* Divider */}
          <span style={{ width: '1px', height: '16px', background: 'var(--border-hover)', display: 'inline-block' }} />

          <button className="btn-ghost" style={{ fontSize: '12px' }} onClick={() => onAuthOpen('login')}>{t('nav.login')}</button>
          <button
            className="btn-primary"
            style={{ padding: '11px 22px', fontSize: '12px', letterSpacing: '0.1em' }}
            onClick={() => onAuthOpen('signup')}
          >
            {t('nav.signup')}
          </button>
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
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}

          <span className="mobile-nav-link" onClick={() => { onAuthOpen('login'); setMobileOpen(false); }}>
            {t('nav.login')}
          </span>
          <button className="btn-primary" onClick={() => { onAuthOpen('signup'); setMobileOpen(false); }}>
            {t('nav.signup')}
          </button>

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
