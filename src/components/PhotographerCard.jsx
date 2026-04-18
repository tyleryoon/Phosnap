import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from './Corners';
import { MapPinIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { fmt } from '../data/photographers';

// ─── 대표 포트폴리오 최대 장수 ────────────────────────────────────────
const MAX_FEATURED = 5;

// ─── Photographer Card (넷플릭스 스타일 스와이프) ──────────────────────
const PhotographerCard = ({ p, onClick, blurred = false }) => {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  // 대표 포트폴리오: featuredPortfolio가 있으면 우선, 없으면 portfolio 앞 5장
  const featured = (p.featuredPortfolio?.length ? p.featuredPortfolio : p.portfolio?.slice(0, MAX_FEATURED)) || [];
  // 이미지가 아예 없으면 기존 img 사용
  const slides = featured.length > 0 ? featured : (p.img ? [p.img] : []);

  const [currentIdx, setCurrentIdx] = useState(0);

  // ── DB 리뷰 통계 (count + avgRating) ──
  const [dbStats, setDbStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getReviewStats } = await import('../lib/supabase');
        const stats = await getReviewStats(p.id);
        if (!cancelled && stats && stats.count > 0) setDbStats(stats);
      } catch { /* mock fallback */ }
    })();
    return () => { cancelled = true; };
  }, [p.id]);

  const displayRating = dbStats?.rating ?? p.rating;
  const displayReviews = dbStats?.count ?? p.reviews;

  // ── 터치 스와이프 핸들링 ──
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging = useRef(false);

  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= slides.length) return;
    setCurrentIdx(idx);
  }, [slides.length]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      isDragging.current = true;
      if (dx < 0) goTo(currentIdx + 1);
      else goTo(currentIdx - 1);
    }
    touchStartX.current = null;
  };

  // ── 좌우 화살표 클릭 ──
  const handleArrow = (e, dir) => {
    e.stopPropagation();
    goTo(currentIdx + dir);
  };

  const handleClick = (e) => {
    if (isDragging.current) { isDragging.current = false; return; }
    if (onClick) onClick(p);
    else navigate(`/photographer/${p.id}`);
  };

  // 언어별 표시 이름
  const displayName = lang === 'ko' && p.nameKo ? p.nameKo : p.name;
  const locationLabel = p.locationNames?.[lang] ?? p.location;

  return (
    <div className="photo-card" onClick={handleClick} style={blurred ? { position: 'relative' } : undefined}>
      <Corners />
      {blurred && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(11,11,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8, cursor: 'pointer',
        }}>
          <div style={{ fontSize: 20, opacity: 0.8 }}>🔒</div>
          <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>
            로그인 후 확인
          </div>
        </div>
      )}

      {/* ── 이미지 슬라이더 (넷플릭스 스타일) ── */}
      <div
        className="photo-card-slider"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 이미지 트랙 */}
        <div
          className="photo-card-slider-track"
          style={{ transform: `translateX(-${currentIdx * 100}%)` }}
        >
          {slides.map((url, i) => (
            <div
              key={i}
              className="photo-card-slide"
              style={{ backgroundImage: `url(${url})` }}
            />
          ))}
        </div>

        {/* 좌우 화살표 (여러 장일 때만) */}
        {slides.length > 1 && (
          <>
            {currentIdx > 0 && (
              <button
                className="photo-card-arrow photo-card-arrow-left"
                onClick={(e) => handleArrow(e, -1)}
                aria-label="Previous"
              >
                ‹
              </button>
            )}
            {currentIdx < slides.length - 1 && (
              <button
                className="photo-card-arrow photo-card-arrow-right"
                onClick={(e) => handleArrow(e, 1)}
                aria-label="Next"
              >
                ›
              </button>
            )}
          </>
        )}

        {/* 페이지 인디케이터 (1/5) */}
        {slides.length > 1 && (
          <div className="photo-card-indicator">
            {currentIdx + 1} / {slides.length}
          </div>
        )}

        {/* 프로필 아바타 (이미지 위 좌측 하단) */}
        {p.img && featured.length > 0 && (
          <div className="photo-card-avatar">
            <div
              className="photo-card-avatar-img"
              style={{ backgroundImage: `url(${p.img})` }}
            />
          </div>
        )}
      </div>

      {/* ── 카드 바디 ── */}
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
          {p.instantBooking && (
            <span className="tag" style={{ background: 'rgba(232,160,32,0.12)', color: 'var(--gold)', border: '1px solid rgba(232,160,32,0.25)', fontWeight: 500 }}>
              ⚡ {lang === 'ko' ? '즉시 예약' : lang === 'ja' ? '即時予約' : lang === 'zh' ? '即时预订' : 'Instant'}
            </span>
          )}
          {p.tours?.length > 0 && (
            <span className="tag" style={{ background: 'rgba(232,160,32,0.1)', color: 'var(--gold)', border: '1px solid rgba(232,160,32,0.2)' }}>
              🗺️ {lang === 'ko' ? '포토투어' : lang === 'ja' ? 'フォトツアー' : 'Photo Tour'}
            </span>
          )}
        </div>

        <div className="photo-card-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div className="photo-card-price">₩{fmt(p.price)}<span>~</span></div>
            {p.hourlyRate && p.hourlyRateEnabled !== false && (
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.02em' }}>
                ₩{fmt(p.hourlyRate)}<span style={{ opacity: 0.6 }}>/{lang === 'ko' ? '시간' : lang === 'ja' ? '時間' : 'hr'}</span>
              </div>
            )}
          </div>
          <div className="photo-card-rating">
            <span className="star">★</span> {displayRating} ({displayReviews})
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerCard;
