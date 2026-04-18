import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { MapPinIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { STYLISTS, fmtStylist } from '../data/stylists';
import PortfolioLightbox from '../components/PortfolioLightbox';
import { normalizePortfolio } from '../utils/portfolioUtils';

// ─── Stylist Profile Page  (/stylist/:id) ────────────────────────────
// 헤어메이크업 아티스트 상세 프로필 페이지

const LABEL = {
  ko: {
    hmk:        'Hair & Makeup',
    portfolio:  '포트폴리오',
    services:   '서비스 & 요금',
    popular:    '인기',
    languages:  '사용 언어',
    reviews:    '리뷰',
    backBtn:    '← 돌아가기',
    notFound:   '스타일리스트를 찾을 수 없습니다.',
  },
  en: {
    hmk:        'Hair & Makeup',
    portfolio:  'Portfolio',
    services:   'Services & Pricing',
    popular:    'Popular',
    languages:  'Languages',
    reviews:    'reviews',
    backBtn:    '← Back',
    notFound:   'Stylist not found.',
  },
  ja: {
    hmk:        'ヘアメイク',
    portfolio:  'ポートフォリオ',
    services:   'サービス＆料金',
    popular:    '人気',
    languages:  '対応言語',
    reviews:    'レビュー',
    backBtn:    '← 戻る',
    notFound:   'スタイリストが見つかりません。',
  },
  zh: {
    hmk:        '发型 & 化妆',
    portfolio:  '作品集',
    services:   '服务 & 价格',
    popular:    '热门',
    languages:  '语言',
    reviews:    '条评价',
    backBtn:    '← 返回',
    notFound:   '未找到该造型师。',
  },
};

// ─── 라이트박스 (포트폴리오 클릭 확대) ──────────────────────────────
// Lightbox는 공유 컴포넌트(PortfolioLightbox)로 대체됨

// ─── Main ──────────────────────────────────────────────────────────────
const StylistProfile = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { lang }     = useLanguage();
  const L = LABEL[lang] ?? LABEL['ko'];

  const s = STYLISTS.find(st => st.id === Number(id));
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // 포트폴리오를 Instagram 게시물 형태로 정규화
  const portfolioPosts = useMemo(() => {
    if (!s?.portfolio) return [];
    return normalizePortfolio(s.portfolio, [], s.id || 0);
  }, [s]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!s) {
    return (
      <div style={{ paddingTop: 160, textAlign: 'center', color: 'var(--muted)' }}>
        {L.notFound}
      </div>
    );
  }

  const displayName = lang === 'ko' && s.nameKo ? s.nameKo : s.name;
  const displayBio  = s.bioI18n?.[lang] ?? s.bio;
  const displayTags = s.tagsI18n?.[lang] ?? s.tags;

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>

      {/* ── 히어로 배너 ── */}
      <div style={{
        width: '100%', height: 320, position: 'relative', overflow: 'hidden',
        backgroundImage: `url(${s.img})`,
        backgroundSize: 'cover', backgroundPosition: 'center top',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(11,11,11,0.2) 0%, rgba(11,11,11,0.85) 100%)',
        }} />
        {/* 뒤로 가기 */}
        <button
          onClick={() => { try { navigate(-1); } catch { navigate('/'); } }}
          style={{
            position: 'absolute', top: 20, left: 24,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.8)', padding: '8px 16px',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.08em',
          }}
        >
          {L.backBtn}
        </button>

        {/* 이름 + 태그 오버레이 */}
        <div style={{
          position: 'absolute', bottom: 32, left: 0, right: 0,
          padding: '0 32px',
        }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 9, letterSpacing: '0.35em',
            color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10,
          }}>
            {L.hmk}
          </div>
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 40px)',
            fontFamily: 'var(--font-serif)', color: '#fff',
            margin: '0 0 12px', letterSpacing: '0.05em',
          }}>
            {displayName}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {displayTags.map(tag => (
              <span key={tag} style={{
                padding: '4px 10px', background: 'rgba(232,160,32,0.2)',
                border: '1px solid rgba(232,160,32,0.5)',
                fontSize: 11, color: 'var(--gold)',
                fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── 기본 정보 ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16, marginBottom: 48,
        }}>
          {[
            { icon: '📍', label: s.location },
            { icon: '★', label: `${s.rating} (${s.reviews} ${L.reviews})` },
            { icon: '💬', label: s.languages.join(' · ') },
            { icon: '₩', label: `${fmtStylist(s.price)}~` },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '16px 20px', border: '1px solid var(--border)',
              background: 'var(--bg2)', position: 'relative',
            }}>
              <Corners />
              <div style={{ fontSize: 16, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── 소개 ── */}
        <div style={{ marginBottom: 56 }}>
          <p style={{
            fontSize: 14, lineHeight: 1.9, color: 'var(--muted)',
            fontFamily: 'var(--font-elegant)', fontStyle: 'italic',
            borderLeft: '2px solid var(--gold)', paddingLeft: 20,
          }}>
            {displayBio}
          </p>
        </div>

        {/* ── 포트폴리오 (Instagram 게시물 형태) ── */}
        {portfolioPosts.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em',
              color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24,
            }}>
              {L.portfolio}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 8,
            }}>
              {portfolioPosts.map((post, i) => {
                const photoCount = post.images?.length || 1;
                return (
                  <div
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    style={{
                      aspectRatio: '3/4', overflow: 'hidden',
                      cursor: 'zoom-in', position: 'relative',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={post.cover}
                      alt={post.caption}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        display: 'block', transition: 'transform 0.5s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    {/* 다중 사진 표시 배지 */}
                    {photoCount > 1 && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                        padding: '3px 8px', borderRadius: 2,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2">
                          <rect x="3" y="3" width="14" height="14" rx="1" />
                          <path d="M7 21h14a2 2 0 002-2V7" />
                        </svg>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-serif)' }}>{photoCount}</span>
                      </div>
                    )}
                    {post.caption && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '8px 12px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        fontSize: 11, color: 'rgba(255,255,255,0.85)',
                        fontFamily: 'var(--font-serif)',
                      }}>
                        {post.caption}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 서비스 & 요금 ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em',
            color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24,
          }}>
            {L.services}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {s.services.map((svc, i) => {
              const desc = svc.descI18n?.[lang] ?? svc.desc;
              return (
                <div key={i} style={{
                  padding: '24px 28px', position: 'relative',
                  border: `1px solid ${svc.popular ? 'var(--gold)' : 'var(--border)'}`,
                  background: svc.popular ? 'var(--gold-dim)' : 'var(--bg2)',
                }}>
                  <Corners />
                  {svc.popular && (
                    <div style={{
                      position: 'absolute', top: -1, left: 20,
                      background: 'var(--gold)', color: '#0B0B0B',
                      fontFamily: 'var(--font-serif)', fontSize: 9,
                      fontWeight: 600, letterSpacing: '0.1em', padding: '3px 10px',
                    }}>
                      {L.popular.toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.08em', marginBottom: 6 }}>
                        {svc.name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                        {desc}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontSize: 16,
                      color: svc.popular ? 'var(--gold)' : 'var(--text)',
                      whiteSpace: 'nowrap', marginLeft: 20,
                    }}>
                      ₩{fmtStylist(svc.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA (뒤로 가서 선택) ── */}
        <div style={{
          padding: '32px', textAlign: 'center',
          border: '1px solid var(--gold-border)', background: 'var(--gold-dim)',
          position: 'relative',
        }}>
          <Corners />
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, fontFamily: 'var(--font-elegant)', fontStyle: 'italic' }}>
            {lang === 'ko' ? '예약 페이지로 돌아가서 이 아티스트를 선택해보세요.' :
             lang === 'ja' ? '予約ページに戻って、このアーティストを選択してください。' :
             lang === 'zh' ? '返回预约页面选择此造型师。' :
             'Go back to the booking page to select this artist.'}
          </p>
          <button
            className="btn-primary"
            onClick={() => { try { navigate(-1); } catch { navigate('/'); } }}
          >
            {L.backBtn}
          </button>
        </div>

      </div>
      <Footer />

      {/* 라이트박스 — 클릭한 게시물의 사진들만 표시 */}
      {lightboxIndex !== null && portfolioPosts[lightboxIndex] && (
        <PortfolioLightbox
          images={portfolioPosts[lightboxIndex].images}
          startIndex={0}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

export default StylistProfile;
