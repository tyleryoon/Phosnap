import { useEffect, useState } from 'react';
import PortfolioLightbox from './PortfolioLightbox';
import Corners from './Corners';
import { useLanguage } from '../contexts/LanguageContext';

// ─── 공급자 상세 모달 ──────────────────────────────────────────────────
//
// 작가 · 헤메 · 의상 · 장소를 **같은 모달**로 보여준다.
//
// 왜 하나로 합쳤나
//   예약 화면에서 장소는 이름과 가격만 보였다. 사진도, 수용 인원도,
//   무엇이 갖춰져 있는지도 볼 수 없었다. 고객은 그걸 모르고 골라야 했다.
//   유형마다 따로 만들면 한쪽만 고치는 일이 반드시 생기므로 하나로 둔다.
//
// 쓰는 법
//   <ProviderDetailModal kind="venue" data={item} onClose={...}>
//     <button>선택하기</button>          ← 액션은 부모가 넣는다
//   </ProviderDetailModal>
//
// 데이터 모양이 유형마다 달라서 여기서 정규화한다.
// 호출부는 DB 행을 그대로 넘기면 된다.

/** 이미지 필드가 유형마다 다르다. 하나의 URL 배열로 맞춘다. */
const toImages = (kind, d) => {
  const pick = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) {
      return v.map(x => (typeof x === 'string' ? x : x?.url || '')).filter(Boolean);
    }
    return typeof v === 'string' ? [v] : [];
  };
  const list = [
    ...pick(d.images),
    ...pick(d.portfolio),          // photographers (jsonb [{url,caption}])
    ...pick(d.portfolio_images),   // stylists (text[])
    ...pick(d.portfolioImages),
    ...pick(d.image_url),          // dress_items
    ...pick(d.image),
    ...pick(d.img),
  ];
  // 같은 사진이 두 번 들어가면 갤러리에서 중복으로 보인다.
  return [...new Set(list)];
};

const nameOf = (d, lang) =>
  d.nameI18n?.[lang] ||
  d.name_i18n?.[lang] ||
  (lang !== 'ko' ? d[`name_${lang}`] : null) ||
  d.name_ko || d.name || d.display_name || '이름 미설정';

const descOf = (d, lang) =>
  d.descI18n?.[lang] ||
  d.description_i18n?.[lang] ||
  d.description || d.desc || d.bio || d.intro || '';

const fmt = (n) => `₩${Number(n || 0).toLocaleString('ko-KR')}`;

/**
 * 장소 편의시설 라벨.
 *
 * 예전에는 Booking.jsx 안에만 있어서 parking, dressing 같은 내부 ID 가
 * 다른 화면에서는 그대로 노출됐다. 한 군데 두고 같이 쓴다.
 */
export const AMENITY_LABELS = {
  parking: '주차', dressing: '탈의실', restroom: '화장실',
  aircon: '냉난방', lighting: '조명 장비', wifi: 'Wi-Fi',
  elevator: '엘리베이터', pet: '반려동물',
};

const PRICE_UNIT_LABELS = {
  per_hour: '시간당', per_day: '1일', per_session: '1회',
};

/**
 * 유형별로 "표에 넣을 사실" 을 뽑는다.
 * 없는 값은 넣지 않는다 — 빈 칸을 만들지 않기 위해서다.
 */
const factsOf = (kind, d) => {
  const f = [];
  const add = (label, value) => {
    if (value === null || value === undefined || value === '' ) return;
    f.push({ label, value: String(value) });
  };

  if (kind === 'photographer') {
    add('작가 유형', d.artist_type === 'both' ? '사진 · 영상'
                    : d.artist_type === 'videographer' ? '영상' : '사진');
    add('활동 지역', d.location_id || d.city);
    add('언어', (d.languages || []).join(', '));
    if (d.hmk_self) add('자체 헤어메이크업', '제공');
    if (d.dress_self) add('자체 의상', '보유');
  }

  if (kind === 'stylist') {
    add('전문 분야', d.specialty);
    add('활동 지역', d.location_id || d.city);
    if (d.dress_self) add('자체 의상', '보유');
  }

  if (kind === 'service') {
    const timing = { before: '촬영 전 시술 완료', during: '촬영 중 합류', full: '촬영 종료까지 동행' };
    add('시술 시점', timing[d.timing] || d.timing);
    add('소요 시간', d.duration_minutes ? `${d.duration_minutes}분` : null);
    add('최대 동행', d.max_hours ? `${d.max_hours}시간` : null);
    add('출장비', d.travel_fee ? fmt(d.travel_fee) : null);
  }

  if (kind === 'dress') {
    add('사이즈', (d.sizes || []).join(', '));
    add('색상', d.color);
    add('분류', d.category);
    // 사이즈별 재고는 "고를 수 있는가" 를 직접 알려준다.
    const stock = d.size_stock && typeof d.size_stock === 'object'
      ? Object.entries(d.size_stock).map(([k, v]) => `${k} ${v}벌`).join(' · ')
      : null;
    add('보유 수량', stock);
  }

  if (kind === 'venue') {
    add('수용 인원', d.capacity ? `${d.capacity}명` : null);
    add('분류', d.category);
    const unit = d.price_unit || d.priceUnit;
    add('요금 단위', PRICE_UNIT_LABELS[unit] || unit);
    add('편의 시설',
      (d.amenities || []).map(a => AMENITY_LABELS[a] || a).join(', '));
  }

  return f;
};

const ProviderDetailModal = ({ kind, data, onClose, children, ownerNote }) => {
  const { lang } = useLanguage();
  const [lightboxAt, setLightboxAt] = useState(null);
  // 크게 보고 있는 사진. 아래 썸네일을 누르면 바뀐다.
  const [heroIdx, setHeroIdx] = useState(0);

  // 모달이 열려 있는 동안 뒤 배경이 스크롤되면 안 된다.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!data) return null;

  const images = toImages(kind, data);
  const title  = nameOf(data, lang);
  const desc   = descOf(data, lang);
  const facts  = factsOf(kind, data);
  const price  = data.price ?? data.price_from ?? null;
  const rating = Number(data.rating || 0);
  const reviews = Number(data.review_count ?? data.reviews_count ?? data.reviews ?? 0);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, overflowY: 'auto',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative', width: '100%', maxWidth: 720,
            maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--bg)', border: '1px solid var(--gold-border)',
          }}
        >
          <Corners />

          {/* 닫기 */}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              position: 'absolute', top: 12, right: 14, zIndex: 2,
              background: 'rgba(0,0,0,0.5)', border: 'none', color: 'var(--text)',
              fontSize: 22, lineHeight: 1, width: 34, height: 34, cursor: 'pointer',
            }}
          >
            ×
          </button>

          {/* ── 사진 ──
              대표 한 장을 크게 보여주고, 나머지는 아래 썸네일로 늘어놓는다.
              가로로 전부 늘어놓으면 두 번째 사진부터는 있는 줄도 모른다. */}
          {images.length > 0 ? (
            <div style={{ background: 'var(--bg2)' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={images[heroIdx] || images[0]}
                  alt={`${title} ${heroIdx + 1}`}
                  onClick={() => setLightboxAt(heroIdx)}
                  style={{
                    width: '100%', height: 320, objectFit: 'cover',
                    cursor: 'zoom-in', display: 'block',
                  }}
                />
                {images.length > 1 && (
                  <div style={{
                    position: 'absolute', bottom: 10, right: 12,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    fontSize: 11, padding: '4px 10px',
                    fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
                  }}>
                    {heroIdx + 1} / {images.length}
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div style={{
                  display: 'flex', gap: 6, overflowX: 'auto',
                  padding: '8px 10px', scrollbarWidth: 'thin',
                }}>
                  {images.map((src, i) => (
                    <img
                      key={src + i}
                      src={src}
                      alt={`${title} 미리보기 ${i + 1}`}
                      onClick={() => setHeroIdx(i)}
                      style={{
                        width: 62, height: 62, objectFit: 'cover', flexShrink: 0,
                        cursor: 'pointer',
                        border: i === heroIdx ? '2px solid var(--gold)' : '2px solid transparent',
                        opacity: i === heroIdx ? 1 : 0.6,
                        transition: 'opacity 0.2s',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // 사진이 없다는 사실도 알려준다. 빈 영역만 두면 로딩 중인 줄 안다.
            <div style={{
              height: 120, background: 'var(--bg2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', fontSize: 12,
            }}>
              등록된 사진이 없습니다
            </div>
          )}

          <div style={{ padding: '28px 32px 32px' }}>
            {/* ── 제목 · 가격 ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 6 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: 0, lineHeight: 1.4 }}>
                {title}
              </h3>
              {price !== null && (
                <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 18, whiteSpace: 'nowrap' }}>
                  {fmt(price)}
                </div>
              )}
            </div>

            {(reviews > 0 || rating > 0) && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                ★ {rating.toFixed(1)} · 후기 {reviews}
              </div>
            )}

            {/* 누구의 것인지 — 헤메 자체 의상처럼 출처가 중요한 경우 */}
            {ownerNote && (
              <div style={{
                fontSize: 12, color: 'var(--muted)', lineHeight: 1.7,
                background: 'var(--accent-a06)', borderLeft: '2px solid var(--gold)',
                padding: '10px 14px', marginBottom: 16,
              }}>
                {ownerNote}
              </div>
            )}

            {desc && (
              <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.9, whiteSpace: 'pre-line', marginBottom: 20 }}>
                {desc}
              </p>
            )}

            {/* ── 사실 표 ── */}
            {facts.length > 0 && (
              <div style={{ border: '1px solid var(--border)', marginBottom: 20 }}>
                {facts.map((f, i) => (
                  <div
                    key={f.label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', gap: 16,
                      padding: '11px 16px', fontSize: 12.5,
                      borderBottom: i < facts.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.06em' }}>
                      {f.label}
                    </span>
                    <span style={{ textAlign: 'right' }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── 액션 (부모가 넣는다) ── */}
            {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
          </div>
        </div>
      </div>

      {lightboxAt !== null && (
        <PortfolioLightbox
          images={images}
          startIndex={lightboxAt}
          onClose={() => setLightboxAt(null)}
        />
      )}
    </>
  );
};

export default ProviderDetailModal;
