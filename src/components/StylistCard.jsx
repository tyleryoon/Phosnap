import React from 'react';
import { Link } from 'react-router-dom';
import Corners from './Corners';
import { MapPinIcon } from './Icons';
import { fmtStylist } from '../data/stylists';
import { useLanguage } from '../contexts/LanguageContext';
import LazyImage from './LazyImage';

// ─── Stylist Card ──────────────────────────────────────────────────────
// 예약 플로우에서 헤어메이크업 아티스트 선택 카드
// 포트폴리오 썸네일 + 프로필 보기 링크 포함

const StylistCard = ({ s, selected, onClick }) => {
  const { lang, t } = useLanguage();
  const displayTags = s.tagsI18n?.[lang] ?? s.tags;
  const displayName = lang === 'ko' && s.nameKo ? s.nameKo : s.name;

  // 포트폴리오 최대 3장 썸네일
  const thumbs = (s.portfolio || []).slice(0, 3);

  return (
    <div style={{ position: 'relative' }}>
      {/* ── 선택 카드 (클릭 영역) ── */}
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
          borderRadius: 'var(--radius)',
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
            padding: '3px 10px', zIndex: 1,
          }}>
            SELECTED
          </div>
        )}

        {/* Cover image */}
        <LazyImage
          src={s.img}
          alt={displayName}
          style={{
            width: '100%',
            aspectRatio: '4/3',
            overflow: 'hidden',
          }}
        />

        <div style={{ padding: '16px 20px 12px' }}>
          {/* Name + languages */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em' }}>
              {displayName}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {s.languages.slice(0, 2).map(l => (
                <span key={l} className="lang-chip">{l}</span>
              ))}
            </div>
          </div>

          {/* Location */}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPinIcon /> {s.location}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {displayTags.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>

          {/* 포트폴리오 썸네일 (있는 경우) */}
          {thumbs.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {thumbs.map((p, i) => (
                <div key={i} style={{
                  flex: 1, aspectRatio: '1/1', overflow: 'hidden',
                  borderRadius: 2, border: '1px solid var(--border)',
                }}>
                  <LazyImage
                    src={p.url}
                    alt={p.caption}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          )}

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

      {/* ── 프로필 보기 링크 (카드 바깥, 선택과 별개) ── */}
      <Link
        to={`/stylist/${s.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '8px 0',
          fontSize: 11,
          color: 'var(--gold)',
          fontFamily: 'var(--font-serif)',
          letterSpacing: '0.12em',
          textDecoration: 'none',
          borderTop: 'none',
          border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
          borderTop: 'none',
          background: 'var(--bg)',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-dim)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
      >
        {t('card.viewProfile')}
      </Link>
    </div>
  );
};

export default React.memo(StylistCard);
