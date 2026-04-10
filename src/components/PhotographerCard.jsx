import { useNavigate } from 'react-router-dom';
import Corners from './Corners';
import { MapPinIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { fmt } from '../data/photographers';

// ─── Photographer Card ─────────────────────────────────────────────────

const PhotographerCard = ({ p, onClick }) => {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const handleClick = () => {
    if (onClick) {
      onClick(p);
    } else {
      navigate(`/photographer/${p.id}`);
    }
  };

  // 언어별 표시 이름: KO → 한국어명, 그 외 → 영문명
  const displayName = lang === 'ko' && p.nameKo ? p.nameKo : p.name;

  // 현재 언어에 맞는 지역명
  const locationLabel = p.locationNames?.[lang] ?? p.location;

  return (
    <div className="photo-card" onClick={handleClick}>
      <Corners />

      {/* Cover image */}
      <div className="photo-card-img">
        <div
          className="photo-card-img-inner"
          style={{ backgroundImage: `url(${p.img})` }}
        />
      </div>

      {/* Card body */}
      <div className="photo-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div className="photo-card-name">{displayName}</div>
          <div className="lang-chips">
            {p.languages.map(l => (
              <span key={l} className="lang-chip">{l}</span>
            ))}
          </div>
        </div>

        <div className="photo-card-location">
          <MapPinIcon /> {locationLabel}
        </div>

        <div className="photo-card-tags">
          {p.tags.map(tagKey => (
            <span key={tagKey} className="tag">{t(`tags.${tagKey}`)}</span>
          ))}
          {p.hmk && <span className="tag gold">{t('tags.hmk')}</span>}
        </div>

        <div className="photo-card-footer">
          <div className="photo-card-price">₩{fmt(p.price)}<span>~</span></div>
          <div className="photo-card-rating">
            <span className="star">★</span> {p.rating} ({p.reviews})
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerCard;
