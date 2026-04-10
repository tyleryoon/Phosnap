import { useState } from 'react';
import PhotographerCard from '../components/PhotographerCard';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { PHOTOGRAPHERS, ALL_TAG_KEYS } from '../data/photographers';

// ─── Photographers List Page ───────────────────────────────────────────

const Photographers = () => {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLanguage, setActiveLanguage] = useState('all');

  const languages = ['all', 'KO', 'EN', 'JP', 'ZH'];

  const filtered = PHOTOGRAPHERS.filter(p => {
    const tagMatch = activeFilter === 'all' || p.tags.includes(activeFilter);
    const langMatch = activeLanguage === 'all' || p.languages.includes(activeLanguage);
    return tagMatch && langMatch;
  });

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section">
        <div className="section-label">Visual Artists</div>
        <h2 className="section-title">{t('nav.photographers')}</h2>
        <p className="section-sub">{t('photographers.sub')}</p>

        {/* Genre filters */}
        <div className="filters">
          {ALL_TAG_KEYS.map(key => (
            <button
              key={key}
              className={`filter-btn ${activeFilter === key ? 'active' : ''}`}
              onClick={() => setActiveFilter(key)}
            >
              {t(`tags.${key}`)}
            </button>
          ))}
        </div>

        {/* Language filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginRight: 8 }}>{t('photographers.languageFilter')}</span>
          {languages.map(l => (
            <button
              key={l}
              className={`filter-btn ${activeLanguage === l ? 'active' : ''}`}
              onClick={() => setActiveLanguage(l)}
              style={{ padding: '6px 14px', fontSize: 11 }}
            >
              {l === 'all' ? t('tags.all') : l}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 32, letterSpacing: '0.05em' }}>
          {filtered.length}{t('home.locationCount')}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="photo-grid">
            {filtered.map(p => <PhotographerCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>
              {t('photographers.noResults')}
            </div>
            <div style={{ fontSize: 13 }}>{t('photographers.changeFilter')}</div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Photographers;
