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

          {/* Company 열은 없앴다.
              소개·블로그·채용·파트너십 네 항목이 전부 <span> 이었다 —
              cursor:pointer 라 눌리는 것처럼 보이는데 아무 데도 안 갔다.
              없는 페이지를 링크인 척 두느니 없는 걸 없다고 두는 게 낫다. */}

          {/* Support */}
          <div>
            <div className="footer-col-title">{t('footer.supportTitle')}</div>
            <Link to="/contact" className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.supportCenter')}</Link>
            {/* 로그인한 사용자를 위한 문의 창구.
                /contact 는 일반 안내, /support 는 계정에 묶인 1:1 문의다. */}
            <Link to="/support" className="footer-link" style={{ textDecoration: 'none' }}>{t('footer.supportInquiry')}</Link>
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
