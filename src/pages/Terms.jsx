import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { TERMS } from '../data/legal';

const Terms = () => {
  const { lang } = useLanguage();
  const content = TERMS[lang] ?? TERMS['ko'];

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Header */}
        <div className="section-label" style={{ marginBottom: 16 }}>Legal</div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 3.5vw, 36px)',
          letterSpacing: '0.06em',
          color: 'var(--text)',
          marginBottom: 8,
        }}>
          {content.title}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 56 }}>
          {content.lastUpdated}
        </p>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 40 }} />

        {/* Sections */}
        {content.sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 44 }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              letterSpacing: '0.06em',
              color: 'var(--gold)',
              marginBottom: 14,
            }}>
              {sec.title}
            </h2>
            <p style={{
              fontSize: 13,
              color: 'rgba(242,242,242,0.7)',
              lineHeight: 2,
              letterSpacing: '0.02em',
              whiteSpace: 'pre-line',
            }}>
              {sec.content}
            </p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, marginTop: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', lineHeight: 1.8 }}>
            © 2026 Phosnap. All rights reserved.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
