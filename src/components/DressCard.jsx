import React, { useState } from 'react';
import Corners from './Corners';
import SizeSelector from './SizeSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { fmt } from '../data/photographers';
import LazyImage from './LazyImage';

// ─── Dress Card ────────────────────────────────────────────────────────
// 의상 카드 컴포넌트 — Booking 및 VendorDashboard에서 사용
//
// Props:
//   dress      - dress item object (from dresses.js or DB)
//   selected   - boolean: 현재 선택된 카드인지
//   onSelect   - (dressId, size) => void: 카드+사이즈 선택 콜백
//   compact    - boolean: 목록용 작은 카드 (default false)
//   showPrice  - boolean: 가격 표시 여부 (default true)

const CATEGORY_LABELS = {
  hanbok: { ko: '한복', en: 'Hanbok', ja: '韓服', zh: '韩服' },
  dress: { ko: '드레스', en: 'Dress', ja: 'ドレス', zh: '礼服' },
  tuxedo: { ko: '턱시도', en: 'Tuxedo', ja: 'タキシード', zh: '西装' },
  casual: { ko: '캐주얼', en: 'Casual', ja: 'カジュアル', zh: '休闲装' },
  traditional_jp: { ko: '기모노', en: 'Kimono', ja: '着物', zh: '和服' },
  qipao: { ko: '치파오', en: 'Qipao', ja: 'チャイナドレス', zh: '旗袍' },
  accessory: { ko: '소품', en: 'Accessory', ja: 'アクセサリー', zh: '配饰' },
  other: { ko: '기타', en: 'Other', ja: 'その他', zh: '其他' },
};

const DressCard = ({
  dress,
  selected = false,
  onSelect,
  compact = false,
  showPrice = true,
  bookedSizes = [],
}) => {
  const { lang } = useLanguage();
  const [selectedSize, setSelectedSize] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  if (!dress) return null;

  const name = dress.nameI18n?.[lang] || dress.name;
  const desc = dress.descI18n?.[lang] || dress.desc || '';
  const categoryLabel = CATEGORY_LABELS[dress.category]?.[lang] || dress.category;
  const images = dress.images || [];
  const currentImg = images[imgIdx]?.url || images[imgIdx] || '';
  const price = dress.price || 0;

  const handleSelect = (size) => {
    setSelectedSize(size);
    onSelect?.(dress.id, size);
  };

  const handleCardClick = () => {
    if (compact && onSelect) {
      onSelect(dress.id, selectedSize || dress.sizes?.[0] || '');
    }
  };

  // ── Compact 모드: 목록용 작은 카드 ──
  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        style={{
          display: 'flex', gap: 14, padding: '12px 14px',
          border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
          background: selected ? 'rgba(232,160,32,0.06)' : 'var(--bg2)',
          cursor: 'pointer', transition: 'all 0.2s',
          position: 'relative',
          borderRadius: 'var(--radius)',
        }}
      >
        {selected && (
          <div style={{
            position: 'absolute', top: 8, right: 8, width: 20, height: 20,
            borderRadius: '50%', background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0B0B0B', fontSize: 10, fontWeight: 700 }}>✓</span>
          </div>
        )}
        {currentImg && (
          <LazyImage
            src={currentImg}
            alt={name}
            style={{
              width: 64,
              height: 80,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            {categoryLabel}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', letterSpacing: '0.03em', marginBottom: 4 }}>
            {name}
          </div>
          {showPrice && price > 0 && (
            <div style={{ fontSize: 12, color: 'var(--gold)' }}>
              ₩{fmt(price)}
            </div>
          )}
          {dress.sizes?.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              {dress.sizes.join(' / ')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Full 모드: 상세 카드 ──
  return (
    <div style={{
      border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
      background: selected ? 'rgba(232,160,32,0.04)' : 'var(--bg2)',
      transition: 'all 0.3s', position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius)',
    }}>
      <Corners />

      {/* 이미지 영역 */}
      {images.length > 0 && (
        <div style={{ position: 'relative' }}>
          <LazyImage
            src={currentImg}
            alt={name}
            style={{
              width: '100%',
              paddingTop: '120%',
            }}
          />

          {/* 이미지 네비게이션 dots */}
          {images.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 6,
            }}>
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', border: 'none',
                    background: i === imgIdx ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* 카테고리 뱃지 */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(11,11,11,0.8)', backdropFilter: 'blur(8px)',
            padding: '4px 10px', fontSize: 9, fontFamily: 'var(--font-serif)',
            letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)',
          }}>
            {categoryLabel}
          </div>

          {/* 색상 표시 */}
          {dress.color && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(11,11,11,0.8)', backdropFilter: 'blur(8px)',
              padding: '4px 10px', fontSize: 9, color: 'var(--muted)',
              letterSpacing: '0.1em',
            }}>
              {dress.color}
            </div>
          )}
        </div>
      )}

      {/* 카드 바디 */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 15,
          letterSpacing: '0.04em', marginBottom: 6,
        }}>
          {name}
        </div>

        {desc && (
          <div style={{
            fontSize: 12, color: 'var(--muted)', lineHeight: 1.7,
            marginBottom: 12,
          }}>
            {desc}
          </div>
        )}

        {/* 가격 */}
        {showPrice && price > 0 && (
          <div style={{
            fontSize: 16, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.05em', marginBottom: 10,
          }}>
            ₩{fmt(price)}
          </div>
        )}

        {/* 사이즈 선택 */}
        {dress.sizes?.length > 0 && onSelect && (
          <SizeSelector
            sizes={dress.sizes}
            selected={selectedSize}
            onChange={handleSelect}
            bookedSizes={bookedSizes}
          />
        )}

        {/* 선택 버튼 */}
        {onSelect && (
          <button
            type="button"
            onClick={() => handleSelect(selectedSize || dress.sizes?.[0] || 'Free')}
            style={{
              marginTop: 14, width: '100%', padding: '11px 0',
              border: selected ? 'none' : '1px solid var(--gold)',
              background: selected ? 'var(--gold)' : 'transparent',
              color: selected ? '#0B0B0B' : 'var(--gold)',
              fontFamily: 'var(--font-serif)', fontSize: 12,
              letterSpacing: '0.08em', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {selected ? '✓ 선택됨' : '선택하기'}
          </button>
        )}
      </div>
    </div>
  );
};

export { CATEGORY_LABELS };
export default React.memo(DressCard);
