import { Link } from 'react-router-dom';
import logoMark from '../assets/logo-mark.svg';
import LogoText from './LogoText';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Footer ────────────────────────────────────────────────────────────

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer>
      <div className="footer">
        <div className="footer-top">

          {/* Brand */}
          <div>
            <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={logoMark} alt="Phosnap mark" style={{ width: 24, height: 24, opacity: 0.7 }} />
              <LogoText />
            </div>
            <div className="footer-tagline">{t('footer.tagline')}</div>
            <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              {t('footer.phosTagline')}<br />
              @phosnap.kr
            </div>
          </div>

          {/* Service */}
          <div>
            <div className="footer-col-title">{t('footer.svcTitle')}</div>
            <Link to="/photographers" className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.svcFindArtist')}</Link>
            <Link to="/explore"       className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.svcExplore')}</Link>
            <Link to="/for-artists"   className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.svcJoinArtist')}</Link>
            <Link to="/waitlist"      className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.svcEarlyAccess')}</Link>
          </div>

          {/* Company */}
          <div>
            <div className="footer-col-title">{t('footer.companyTitle')}</div>
            <span className="footer-link">{t('footer.companyAbout')}</span>
            <span className="footer-link">{t('footer.companyBlog')}</span>
            <span className="footer-link">{t('footer.companyJobs')}</span>
            <span className="footer-link">{t('footer.companyPartnership')}</span>
          </div>

          {/* Support */}
          <div>
            <div className="footer-col-title">{t('footer.supportTitle')}</div>
            <Link to="/contact" className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.supportCenter')}</Link>
            <Link to="/terms"   className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.supportTerms')}</Link>
            <Link to="/privacy" className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.supportPrivacy')}</Link>
            <a
              href="https://instagram.com/phosnap.kr"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
              style={{ textDecoration: 'none' }}
            >
              {t('footer.supportInstagram')}
            </a>
          </div>

        </div>

        <div className="footer-bottom">
          <span>{t('footer.copyright')}</span>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', fontFamily: 'var(--font-serif)' }}>
            KR · EN · JP · CN
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
