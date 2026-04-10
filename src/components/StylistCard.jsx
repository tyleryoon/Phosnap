import Corners from './Corners';
import { MapPinIcon } from './Icons';
import { fmtStylist } from '../data/stylists';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Stylist Card ──────────────────────────────────────────────────────

const StylistCard = ({ s, selected, onClick }) => {
  const { lang } = useLanguage();
  const displayTags = s.tagsI18n?.[lang] ?? s.tags;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s',
        position: 'relative',
        transform: selected ? 'translateY(-2px)' : 'none',
        boxShadow: selected ? 'var(--glow-gold)' : 'none',
        background: selected ? 'var(--gold-dim)' : 'var(--bg2)',
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
      }}
    >
      <Corners />

      {/* Selected badge */}
      {selected && (
        <div style={{
          position: 'absolute', top: -1, left: 20,
          background: 'var(--gold)', color: '#0B0B0B',
          fontFamily: 'var(--font-serif)', fontSize: 9,
          fontWeight: 600, letterSpacing: '0.1em',
          padding: '3px 10px',
        }}>
          SELECTED
        </div>
      )}

      {/* Cover image */}
      <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: '100%',
          backgroundImage: `url(${s.img})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transition: 'transform 0.5s ease',
        }} />
      </div>

      <div style={{ padding: 20 }}>
        {/* Name + languages */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em' }}>
            {lang === 'ko' && s.nameKo ? s.nameKo : s.name}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {s.languages.map(l => (
              <span key={l} className="lang-chip">{l}</span>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPinIcon /> {s.location}
        </div>

        {/* Tags — localized */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {displayTags.map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>

        {/* Price + rating */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>
            ₩{fmtStylist(s.price)}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>~</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ color: 'var(--gold)' }}>★</span> {s.rating} ({s.reviews})
          </div>
        </div>
      </div>
    </div>
  );
};

export default StylistCard;
