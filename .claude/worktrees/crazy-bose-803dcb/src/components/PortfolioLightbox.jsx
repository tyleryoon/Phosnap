import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Portfolio Lightbox (공유 컴포넌트) ────────────────────────────────
// 사진 클릭 → 풀스크린 + 좌우 스와이프/화살표 네비게이션
// 사용처: 작가 프로필, 스타일리스트, 의상/장소 벤더

const PortfolioLightbox = ({ images, startIndex = 0, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const total = images.length;
  const current = images[idx];
  if (!current) return null;

  // 이미지 URL (문자열 또는 { url, caption } 객체 모두 지원)
  const getUrl = (img) => typeof img === 'string' ? img : img?.url || '';
  const getCaption = (img) => typeof img === 'string' ? '' : img?.caption || '';

  const goPrev = useCallback(() => setIdx(i => (i > 0 ? i - 1 : total - 1)), [total]);
  const goNext = useCallback(() => setIdx(i => (i < total - 1 ? i + 1 : 0)), [total]);

  // 키보드 네비게이션
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  // 터치 스와이프
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const url = getUrl(current);
  const caption = getCaption(current);
  // 고해상도 URL로 변환
  const hdUrl = url.replace(/w=\d+/, 'w=1400').replace(/q=\d+/, 'q=90');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 20, zIndex: 10,
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.7)', fontSize: 32,
          cursor: 'pointer', lineHeight: 1,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
      >
        ×
      </button>

      {/* 카운터 */}
      {total > 1 && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.5)', zIndex: 10,
        }}>
          {idx + 1} / {total}
        </div>
      )}

      {/* 좌측 화살표 */}
      {total > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: 'rgba(0,0,0,0.4)', border: 'none',
            color: 'rgba(255,255,255,0.7)', fontSize: 28, cursor: 'pointer',
            width: 48, height: 48, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          ‹
        </button>
      )}

      {/* 이미지 */}
      <img
        src={hdUrl}
        alt={caption || ''}
        style={{
          maxWidth: '85vw', maxHeight: '80vh',
          objectFit: 'contain', display: 'block',
          transition: 'opacity 0.2s',
        }}
        onClick={e => e.stopPropagation()}
        draggable={false}
      />

      {/* 우측 화살표 */}
      {total > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: 'rgba(0,0,0,0.4)', border: 'none',
            color: 'rgba(255,255,255,0.7)', fontSize: 28, cursor: 'pointer',
            width: 48, height: 48, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          ›
        </button>
      )}

      {/* 캡션 */}
      {caption && (
        <div style={{
          marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
          textAlign: 'center', maxWidth: '80vw',
        }}>
          {caption}
        </div>
      )}

      {/* 하단 썸네일 스트립 (6장 이상일 때) */}
      {total > 1 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 6, maxWidth: '90vw', overflow: 'auto',
          padding: '8px 4px',
          scrollbarWidth: 'none',
        }}>
          {images.map((img, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              style={{
                width: 48, height: 48, flexShrink: 0,
                borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                border: i === idx ? '2px solid var(--gold)' : '2px solid transparent',
                opacity: i === idx ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              <img
                src={getUrl(img)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                draggable={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioLightbox;
