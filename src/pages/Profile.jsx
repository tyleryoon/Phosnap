import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { ArrowLeftIcon, MapPinIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { PHOTOGRAPHERS, fmt } from '../data/photographers';
import { LOCATIONS_DOMESTIC, LOCATIONS_OVERSEAS } from '../data/locations';

// 지역 id → 다국어 이름 (순수 데이터라 순환 참조 없음)
const PROFILE_LOCATION_NAMES = [...LOCATIONS_DOMESTIC, ...LOCATIONS_OVERSEAS]
  .reduce((acc, l) => { acc[l.id] = l.nameI18n || { ko: l.name, en: l.nameEn }; return acc; }, {});
import { getMergedProfile } from '../data/artistProfile';
import { getAllLocationsSorted } from '../data/locationUtils';
import { ProfileSEO } from '../components/SEO';
import { getPhotographerReviews, fetchPhotographer, getPackageReviews, getPhotographerReviewsV2, getReviewReplies } from '../lib/supabase';
import ShareModal from '../components/ShareModal';
import PortfolioLightbox from '../components/PortfolioLightbox';
import { normalizePortfolio } from '../utils/portfolioUtils';
import TrustBadge from '../components/TrustBadge';
import SentimentTags from '../components/SentimentTags';
import {
  getRecruitingInstances,
  getActiveBookingCount,
  getRemainingSlots,
  getStatusLabel,
  getStatusColor,
  getPerPersonPrice,
  evaluateDeadlines,
  seedMockInstances,
} from '../data/tourBookingStore';

// ─── Photographer Profile Page ─────────────────────────────────────────

const Profile = ({ onAuthOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('portfolio');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = closed, number = open at index
  const [isFavorited, setIsFavorited] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  // Fetch from DB with fallback to mock
  const [dbPhotographer, setDbPhotographer] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    const loadPhotographer = async () => {
      setDbLoading(true);
      try {
        const { data } = await fetchPhotographer(id);
        if (data) {
          setDbPhotographer(data);
        }
      } catch (err) {
        // silently handled
      }
      setDbLoading(false);
    };
    loadPhotographer();
  }, [id]);

  // DB + localStorage + Mock 데이터 병합 (localStorage 작가 저장 > DB > Mock)
  const mockPhotographer = PHOTOGRAPHERS.find(ph => ph.id === Number(id));
  const localMerged = getMergedProfile(mockPhotographer, 'photographer', Number(id));
  const p = (() => {
    if (!dbPhotographer) return localMerged;
    if (!localMerged) return dbPhotographer;
    // DB의 null/undefined가 아닌 값만 오버라이드
    const merged = { ...localMerged };
    for (const [key, val] of Object.entries(dbPhotographer)) {
      if (val !== null && val !== undefined) merged[key] = val;
    }
    merged.supabaseId = dbPhotographer.id;
    // 중요 배열 필드 보호 (DB에서 잘못된 타입이 올 경우)
    if (!Array.isArray(merged.portfolio)) merged.portfolio = localMerged.portfolio || [];
    if (!Array.isArray(merged.packages)) merged.packages = localMerged.packages || [];
    if (!Array.isArray(merged.tags)) merged.tags = localMerged.tags || mockPhotographer?.tags || [];
    if (!Array.isArray(merged.languages)) merged.languages = localMerged.languages || mockPhotographer?.languages || [];
    return merged;
  })();
  // 즐겨찾기 초기화
  useEffect(() => {
    if (!p) return;
    const saved = JSON.parse(localStorage.getItem('phosnap_fav_artists') || '[]');
    setIsFavorited(saved.includes(p.id));
  }, [p?.id]);

  const [portfolioLocation, setPortfolioLocation] = useState('all');

  // ── 투어 인스턴스 (모집 중인 일정) ──
  const [tourInstances, setTourInstances] = useState([]);
  useEffect(() => {
    if (!p) return;
    try {
      seedMockInstances(PHOTOGRAPHERS); // 개발용: 최초 1회 mock 데이터 생성
      evaluateDeadlines(); // 마감 체크
      setTourInstances(getRecruitingInstances(p.id));
    } catch (err) { /* silently handled */ }

    const handler = () => { try { setTourInstances(getRecruitingInstances(p.id)); } catch {} };
    window.addEventListener('tourInstancesChanged', handler);
    return () => window.removeEventListener('tourInstancesChanged', handler);
  }, [p?.id]);

  // ── 리뷰: Supabase에서 가져오기 (split review system) ──
  const [pkgReviews, setPkgReviews] = useState([]);
  const [artistReviews, setArtistReviews] = useState([]);
  const [dbReviews, setDbReviews] = useState(null); // fallback to old reviews
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewTabType, setReviewTabType] = useState('artist'); // 'package' or 'artist'
  const [reviewSort, setReviewSort] = useState('newest'); // 'newest' or 'rating'
  const [reviewRepliesMap, setReviewRepliesMap] = useState({}); // { reviewId: replyObj }

  useEffect(() => {
    if (!p) return;
    const reviewId = p.supabaseId || p.id;
    if (!reviewId) return;
    setReviewsLoading(true);
    Promise.all([
      getPackageReviews(reviewId).catch(() => ({ data: [] })),
      getPhotographerReviewsV2(reviewId).catch(() => ({ data: [] })),
    ]).then(([pkgRes, artistRes]) => {
      const pkgData = Array.isArray(pkgRes?.data) ? pkgRes.data : [];
      const artData = Array.isArray(artistRes?.data) ? artistRes.data : [];
      setPkgReviews(pkgData);
      setArtistReviews(artData);

      // 답글 로드
      const allIds = [...pkgData.map(r => r.id), ...artData.map(r => r.id)].filter(Boolean);
      if (allIds.length > 0) {
        Promise.all([
          getReviewReplies(pkgData.map(r => r.id).filter(Boolean), 'package').catch(() => ({ data: [] })),
          getReviewReplies(artData.map(r => r.id).filter(Boolean), 'photographer').catch(() => ({ data: [] })),
        ]).then(([pkgReplies, artReplies]) => {
          const map = {};
          [...(pkgReplies.data || []), ...(artReplies.data || [])].forEach(r => { map[r.review_id] = r; });
          setReviewRepliesMap(map);
        }).catch(() => {});
      }

      // fallback: if no new reviews, fetch old reviews
      if (pkgData.length === 0 && artData.length === 0) {
        getPhotographerReviews(reviewId).then(({ data }) => {
          if (data && data.length > 0) setDbReviews(data);
        }).catch(() => {});
      }
      setReviewsLoading(false);
    }).catch(() => {
      setReviewsLoading(false);
    });
  }, [p?.id]);

  // Helper: Anonymize name (e.g., "Kim JunYeon" → "K*n")
  const anonymize = (name) => {
    if (!name || name.length < 2) return name || t('profile.anonymous');
    return name[0] + '*' + name.slice(-1);
  };

  // Format date as YYYY.MM.DD
  const formatReviewDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}.${m}.${day}`;
    } catch {
      return dateStr || '';
    }
  };

  // Recommendation score algorithm
  const calculateRecommendScore = (review) => {
    let score = 0;
    if (review.rating === 5) score += 10;
    else if (review.rating === 4) score += 5;

    const bodyLen = (review.body || '').length;
    if (bodyLen >= 50) score += 5;
    if (bodyLen >= 100) score += 3;

    const tagCount = (review.tags || []).length;
    if (tagCount >= 2) score += 2;

    const daysSince = (Date.now() - new Date(review.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 30) score += 3;
    else if (daysSince <= 90) score += 1;

    return score;
  };

  // Get current review set based on tab type
  const currentReviews = reviewTabType === 'package' ? pkgReviews : artistReviews;

  // Determine display reviews (fallback to old reviews if empty)
  const reviews = useMemo(() => {
    if ((pkgReviews && pkgReviews.length > 0) || (artistReviews && artistReviews.length > 0)) {
      return currentReviews || [];
    }
    if (dbReviews && dbReviews.length > 0) {
      return dbReviews.map(r => ({
        author_name: r.author_name || 'Anonymous',
        created_at: r.created_at,
        rating: r.rating,
        body: r.body || r.text || '',
        title: r.title || '',
        tags: [],
      }));
    }
    return p?.reviewList || [];
  }, [currentReviews, dbReviews, p, pkgReviews, artistReviews]);

  // Sort reviews based on sort preference
  const sortedReviews = useMemo(() => {
    let sorted = [...reviews];
    if (reviewSort === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (reviewSort === 'ratingLow') {
      sorted.sort((a, b) => a.rating - b.rating);
    } else {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
  }, [reviews, reviewSort]);

  // Recommended reviews (top 3 by score)
  const recommendedReviews = useMemo(() => {
    if (reviewTabType !== 'artist' || !artistReviews || artistReviews.length === 0) return [];
    return artistReviews
      .map(r => ({ ...r, recommendScore: calculateRecommendScore(r) }))
      .sort((a, b) => b.recommendScore - a.recommendScore)
      .slice(0, 3);
  }, [artistReviews, reviewTabType]);

  // Tag statistics (from artist reviews)
  const tagStats = useMemo(() => {
    if (!artistReviews || artistReviews.length === 0) return {};
    const counts = {};
    artistReviews.forEach(r => {
      if (r.tags && Array.isArray(r.tags)) {
        r.tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return counts;
  }, [artistReviews]);

  // ── 리뷰 하이라이트: 댓글에서 긍정 키워드 추출 → 상위 5개 장점 ──
  const reviewHighlights = useMemo(() => {
    const allTexts = reviews.map(r => {
      const text = r.body || r.text || '';
      const i18n = r.textI18n?.[lang] || '';
      return (text + ' ' + i18n).toLowerCase();
    }).join(' ');

    if (!allTexts.trim()) return [];

    // 카테고리별 키워드 매칭 (한/영/일/중)
    const categories = [
      { id: 'quality',      keywords: ['퀄리티','quality','素晴らし','stunning','beautiful','완벽','perfect','amazing','gorgeous','wonderful','최고','best','一流','excellent','professional','프로','出色','棒'],
        label: { ko: '뛰어난 사진 퀄리티', en: 'Excellent photo quality', ja: '優れた写真クオリティ', zh: '出色的照片质量' }, icon: '📸' },
      { id: 'guide',        keywords: ['안내','가이드','guide','장소','location','spot','案内','場所','지역','추천','recommend','찾','found','地点','带'],
        label: { ko: '장소 추천 & 가이드', en: 'Great location guidance', ja: 'ロケーション案内', zh: '地点推荐与引导' }, icon: '📍' },
      { id: 'natural',      keywords: ['자연스러','natural','自然','표정','expression','引き出','포즈','pose','편안','comfortable','릴렉스','relaxed','리얼'],
        label: { ko: '자연스러운 표정 연출', en: 'Natural expressions', ja: '自然な表情を引き出す', zh: '自然的表情引导' }, icon: '✨' },
      { id: 'lighting',     keywords: ['빛','light','光','golden','골든아워','감성','mood','雰囲気','atmosphere','분위기','lighting','색감','tone','色彩'],
        label: { ko: '감성적인 빛과 분위기', en: 'Beautiful lighting & mood', ja: '美しい光と雰囲気', zh: '唯美的光线与氛围' }, icon: '🌅' },
      { id: 'kind',         keywords: ['친절','kind','nice','親切','세심','careful','丁寧','배려','considerate','warm','따뜻','편하','easy','优质','热情','好'],
        label: { ko: '친절하고 세심한 진행', en: 'Kind & attentive service', ja: '親切で丁寧な対応', zh: '亲切细心的服务' }, icon: '💛' },
      { id: 'communication',keywords: ['소통','communication','연락','contact','응답','response','빠른','quick','fast','迅速','quick','沟通','回复','相談'],
        label: { ko: '빠르고 원활한 소통', en: 'Quick communication', ja: '迅速なコミュニケーション', zh: '快速顺畅的沟通' }, icon: '💬' },
      { id: 'again',        keywords: ['또','again','다시','再','もう一度','また','依頼','추천','recommend','다음에도','next time','재예약','再次','还会'],
        label: { ko: '재예약 의사 높음', en: 'High rebooking intent', ja: 'リピート希望', zh: '再次预约意愿高' }, icon: '🔄' },
      { id: 'delivery',     keywords: ['보정','editing','retouch','edit','リタッチ','빨리','fast','quick','빠르','배송','delivery','받','receive','수령','纳品','修图'],
        label: { ko: '빠른 보정 & 전달', en: 'Fast editing & delivery', ja: '迅速なリタッチ・納品', zh: '快速修图与交付' }, icon: '⚡' },
      { id: 'honeymoon',    keywords: ['허니문','honeymoon','웨딩','wedding','커플','couple','ハネムーン','ウェディング','カップル','蜜月','婚礼','情侣'],
        label: { ko: '커플 & 웨딩 전문', en: 'Couple & wedding specialist', ja: 'カップル＆ウェディング専門', zh: '情侣&婚礼专业' }, icon: '💍' },
      { id: 'memory',       keywords: ['기억','memory','추억','잊을 수 없','unforgettable','감동','moved','touching','思い出','忘れられない','記憶','难忘','回忆'],
        label: { ko: '잊을 수 없는 추억', en: 'Unforgettable memories', ja: '忘れられない思い出', zh: '难忘的回忆' }, icon: '🌟' },
    ];

    const scored = categories.map(cat => {
      let count = 0;
      cat.keywords.forEach(kw => {
        const regex = new RegExp(kw, 'gi');
        const matches = allTexts.match(regex);
        if (matches) count += matches.length;
      });
      return { ...cat, count };
    }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    return scored.slice(0, 5);
  }, [reviews, lang]);

  const reviewCount = (pkgReviews?.length || 0) + (artistReviews?.length || 0) || (dbReviews?.length ?? (p?.reviews || 0));
  const avgRating = useMemo(() => {
    const allReviews = [...pkgReviews, ...artistReviews];
    if (allReviews && allReviews.length > 0) {
      return (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1);
    }
    if (dbReviews && dbReviews.length > 0) {
      return (dbReviews.reduce((sum, r) => sum + r.rating, 0) / dbReviews.length).toFixed(1);
    }
    return p?.rating || '5.0';
  }, [pkgReviews, artistReviews, dbReviews, p]);

  // ── 포트폴리오: Instagram 게시물 형태로 정규화 (hooks는 early return 전에 선언) ──
  const portfolioPosts = useMemo(() => {
    if (!p) return [];
    return normalizePortfolio(p.portfolio || [], p.portfolioLocations || [], p.id || 0);
  }, [p]);

  // 호환용 — 위치 필터링 등에 사용
  const portfolioItems = useMemo(() => {
    return portfolioPosts.map(post => ({
      ...post,
      url: post.cover,
      locationId: post.location || p?.locationId,
    }));
  }, [portfolioPosts, p]);

  const portfolioLocationList = useMemo(() => {
    const ids = [...new Set(portfolioItems.map(item => item.locationId))];
    const allLocs = getAllLocationsSorted();
    return ids.map(id => allLocs.find(l => l.id === id) || { id, ko: id, en: id });
  }, [portfolioItems]);

  // Loading state
  if (dbLoading) {
    return (
      <div style={{ paddingTop: 120, minHeight: '60vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          <div style={{
            width: '100%', height: 300, background: 'var(--bg2)',
            borderRadius: 8, marginBottom: 24, animation: 'pulse 1.5s infinite'
          }} />
          <div style={{
            width: '80%', height: 24, background: 'var(--bg2)',
            borderRadius: 4, marginBottom: 16, animation: 'pulse 1.5s infinite'
          }} />
          <div style={{
            width: '60%', height: 16, background: 'var(--bg2)',
            borderRadius: 4, animation: 'pulse 1.5s infinite'
          }} />
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 16 }}>
          {t('profile.notFound')}
        </div>
        <button className="btn-outline" onClick={() => navigate('/photographers')}>
          {t('profile.backToList')}
        </button>
      </div>
    );
  }

  // ── 언어별 데이터 ─────────────────────────────────────────────────────
  const displayName    = lang === 'ko' && p.nameKo ? p.nameKo   : p.name;
  const subName        = lang === 'ko' ? null : (p.nameKo ?? null);
  const bio            = p.bioI18n?.[lang] ?? p.bio;
  // location_names 가 비어 있는 작가는 지역 id 가 그대로 노출되므로
  // 데이터 인덱스에서 현지어 이름을 찾아 보완한다. (카드와 동일한 폴백)
  const locationLabel  =
    p.locationNames?.[lang]
    ?? PROFILE_LOCATION_NAMES[p.location]?.[lang]
    ?? PROFILE_LOCATION_NAMES[p.location]?.ko
    ?? p.location;

  const filteredPortfolio = portfolioLocation === 'all'
    ? portfolioItems
    : portfolioItems.filter(item => item.locationId === portfolioLocation);

  const packages = p.packages || [];
  const pkg = packages.find(pk => pk.popular) || packages[0];
  const initPackage = selectedPackage ?? pkg?.name;

  const tabs = [
    { id: 'portfolio', label: t('profile.tabPortfolio') },
    { id: 'packages',  label: t('profile.tabPackages') },
    { id: 'reviews',   label: `${t('profile.tabReviews')} (${reviewCount})` },
    { id: 'schedule',  label: t('profile.tabSchedule') },
  ];

  return (
    <div className="page-enter" style={{ paddingTop: 80 }}>
      <ProfileSEO photographer={p} lang={lang} />
      <div className="section" style={{ paddingTop: 40 }}>

        {/* Back button */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftIcon /> {t('profile.backBtn')}
        </button>

        {/* Profile hero */}
        <div className="profile-hero">
          {/* Left: photo */}
          <div className="profile-photo">
            <Corners />
            <div className="profile-photo-inner" style={{ backgroundImage: `url(${p.img})` }} />
          </div>

          {/* Right: info */}
          <div className="profile-info">
            <div className="profile-name">{displayName}</div>
            {subName && (
              <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-elegant)', fontStyle: 'italic' }}>
                {subName}
              </div>
            )}
            <div className="profile-location">
              <MapPinIcon /> {locationLabel}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {(p.tags || []).map(tagKey => (
                <span key={tagKey} className="tag">{t(`tags.${tagKey}`)}</span>
              ))}
              {p.hmk && <span className="tag gold">{t('tags.hmk')}</span>}
              {p.instantBooking && (
                <span className="tag" style={{ background: 'rgba(232,160,32,0.12)', color: 'var(--gold)', border: '1px solid rgba(232,160,32,0.25)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  ⚡ {lang === 'ko' ? '즉시 예약' : lang === 'ja' ? '即時予約' : lang === 'zh' ? '即时预订' : 'Instant Booking'}
                </span>
              )}
            </div>

            {/* Languages */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {(p.languages || []).map(l => <span key={l} className="lang-chip">{l}</span>)}
            </div>

            {/* Bio with truncation and expand toggle */}
            <div style={{ marginBottom: 24 }}>
              <p style={{
                fontSize: 14,
                color: 'var(--muted)',
                lineHeight: 1.8,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: bioExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: bioExpanded ? 'unset' : 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {bio}
              </p>
              {bio && bio.split('\n').length > 3 && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  style={{
                    marginTop: 8,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold)',
                    fontSize: 13,
                    fontFamily: 'var(--font-serif)',
                    cursor: 'pointer',
                    padding: 0,
                    letterSpacing: '0.04em',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {bioExpanded ? (lang === 'ko' ? '접기' : lang === 'ja' ? '閉じる' : 'Show less') : (lang === 'ko' ? '더 보기' : lang === 'ja' ? 'もっと見る' : 'Show more')} →
                </button>
              )}
            </div>

            {/* Share + Favorite Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '12px', background: 'transparent',
                  border: '1px solid var(--gold-border)', color: 'var(--gold)',
                  cursor: 'pointer', transition: 'all 0.2s', borderRadius: '2px',
                  fontFamily: 'var(--font-serif)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,160,32,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span>↗</span> {lang === 'ko' ? '공유' : lang === 'ja' ? '共有' : lang === 'zh' ? '分享' : 'Share'}
              </button>
              <button
                onClick={() => {
                  const key = 'phosnap_fav_artists';
                  const saved = JSON.parse(localStorage.getItem(key) || '[]');
                  const isFav = saved.includes(p.id);
                  const next = isFav ? saved.filter(x => x !== p.id) : [...saved, p.id];
                  localStorage.setItem(key, JSON.stringify(next));
                  setIsFavorited(!isFav);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '12px',
                  background: isFavorited ? 'rgba(239,68,68,0.1)' : 'transparent',
                  border: isFavorited ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--border)',
                  color: isFavorited ? '#ef4444' : 'var(--muted)',
                  cursor: 'pointer', transition: 'all 0.2s', borderRadius: '2px',
                  fontFamily: 'var(--font-serif)',
                }}
                onMouseEnter={e => {
                  if (!isFavorited) e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                }}
                onMouseLeave={e => {
                  if (!isFavorited) e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <span style={{ fontSize: 14 }}>{isFavorited ? '♥' : '♡'}</span>
                {lang === 'ko' ? '즐겨찾기' : lang === 'ja' ? 'お気に入り' : lang === 'zh' ? '收藏' : 'Favorite'}
              </button>
            </div>

            {/* Meta stats */}
            <div className="profile-meta">
              <div className="meta-item">
                <div className="meta-val">★ {avgRating}</div>
                <div className="meta-label">{t('profile.rating')}</div>
              </div>
              <div className="meta-item">
                <div className="meta-val">{reviewCount}</div>
                <div className="meta-label">{t('profile.reviews')}</div>
              </div>
              <div className="meta-item">
                <div className="meta-val">₩{fmt(p.price)}~</div>
                <div className="meta-label">{t('profile.startingPrice')}</div>
              </div>
            </div>

            {/* Trust Badge */}
            <TrustBadge photographer={p} size="medium" showDetails={false} />

            {/* Props */}
            {p.props && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('profile.props')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(p.propsI18n?.[lang] ?? p.props).map(prop => <span key={prop} className="tag">{prop}</span>)}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate(`/booking/${p.id}`)}
            >
              {t('profile.book')}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="tab-nav" style={{ marginTop: 64 }}>
          {tabs.map(tb => (
            <button
              key={tb.id}
              className={`tab-btn ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Portfolio tab */}
        {tab === 'portfolio' && (
          <>
            {/* 위치 필터 (복수 촬영지가 있는 경우에만 표시) */}
            {portfolioLocationList.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginRight: 4,
                }}>
                  📍 촬영지
                </span>
                <button
                  onClick={() => setPortfolioLocation('all')}
                  style={{
                    padding: '5px 12px', fontSize: 11, border: '1px solid',
                    borderColor: portfolioLocation === 'all' ? 'var(--gold)' : 'var(--border)',
                    background: portfolioLocation === 'all' ? 'rgba(232,160,32,0.1)' : 'transparent',
                    color: portfolioLocation === 'all' ? 'var(--gold)' : 'var(--muted)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                  전체 ({portfolioItems.length})
                </button>
                {portfolioLocationList.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => setPortfolioLocation(portfolioLocation === loc.id ? 'all' : loc.id)}
                    style={{
                      padding: '5px 12px', fontSize: 11, border: '1px solid',
                      borderColor: portfolioLocation === loc.id ? 'var(--gold)' : 'var(--border)',
                      background: portfolioLocation === loc.id ? 'rgba(232,160,32,0.1)' : 'transparent',
                      color: portfolioLocation === loc.id ? 'var(--gold)' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {loc.ko} ({portfolioItems.filter(i => i.locationId === loc.id).length})
                  </button>
                ))}
              </div>
            )}

            {/* 갤러리 그리드 — 각 게시물의 커버만 표시 */}
            <div className="gallery-grid">
              {filteredPortfolio.map((item, i) => {
                const locInfo = getAllLocationsSorted().find(l => l.id === item.locationId);
                const locLabel = locInfo ? locInfo.ko : item.locationId;
                const photoCount = item.images?.length || 1;
                return (
                  <div
                    key={i}
                    className="gallery-item"
                    style={{ position: 'relative', overflow: 'hidden', cursor: 'zoom-in' }}
                    onClick={() => setLightboxIndex(i)}
                  >
                    <div className="gallery-item-inner" style={{ backgroundImage: `url(${item.cover || item.url})` }} />
                    {/* 다중 사진 표시 배지 (인스타그램 스타일) */}
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
                    {/* 위치 태그 배지 */}
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                      padding: '3px 8px', borderRadius: 2,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                      className="portfolio-loc-badge"
                    >
                      <span style={{ fontSize: 9, color: 'var(--gold)' }}>📍</span>
                      <span style={{ fontSize: 10, color: '#fff', letterSpacing: '0.05em' }}>{locLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 포트폴리오 라이트박스 — 클릭한 게시물의 사진들만 표시 */}
            {lightboxIndex !== null && filteredPortfolio[lightboxIndex] && (
              <PortfolioLightbox
                images={filteredPortfolio[lightboxIndex].images || [filteredPortfolio[lightboxIndex].cover || filteredPortfolio[lightboxIndex].url]}
                startIndex={0}
                onClose={() => setLightboxIndex(null)}
              />
            )}

            {/* 결과 없음 */}
            {filteredPortfolio.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>
                선택한 지역의 포트폴리오가 없습니다.
              </div>
            )}
          </>
        )}

        {/* Packages tab */}
        {tab === 'packages' && (
          <div className="packages">
            {/* 시간 단위 예약 옵션 (hourlyRate가 있고 활성화된 작가만) */}
            {p.hourlyRate && p.hourlyRateEnabled !== false && (
              <div
                className="package"
                style={{ border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.03)', position: 'relative' }}
              >
                <Corners />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>⏱</span>
                  <div className="package-name" style={{ margin: 0 }}>
                    {lang === 'ko' ? '시간 단위 예약' : lang === 'ja' ? '時間単位予約' : 'Hourly Booking'}
                  </div>
                </div>
                <div className="package-price">
                  ₩{fmt(p.hourlyRate)}<span>/ {lang === 'ko' ? '시간' : lang === 'ja' ? '時間' : 'hour'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
                  {lang === 'ko'
                    ? '패키지 외에 원하는 시간만큼 자유롭게 예약하세요. 최소 1시간부터.'
                    : lang === 'ja'
                    ? 'パッケージ以外に、お好きな時間だけ自由にご予約ください。最低1時間から。'
                    : 'Book flexibly by the hour, outside of packages. Minimum 1 hour.'}
                </div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 16, fontSize: 10 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/booking/${p.id}`, { state: { mode: 'hourly' } }); }}
                >
                  {lang === 'ko' ? '시간 단위로 예약' : lang === 'ja' ? '時間単位で予約' : 'Book by Hour'}
                </button>
              </div>
            )}

            {packages.map(pkg => (
              <div
                key={pkg.name}
                className={`package ${pkg.popular ? 'recommended' : ''} ${initPackage === pkg.name ? 'selected' : ''}`}
                onClick={() => setSelectedPackage(pkg.name)}
              >
                <Corners />
                <div className="package-name">{pkg.name}</div>
                <div className="package-price">₩{fmt(pkg.price)}<span>/ session</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {pkg.hours}{t('profile.hours')} · {pkg.photos}{t('profile.photos')}
                </div>
                <div className="package-desc">{pkg.descI18n?.[lang] ?? pkg.desc}</div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 20, fontSize: 10 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/booking/${p.id}`); }}
                >
                  {t('profile.bookPackage')}
                </button>
              </div>
            ))}

            {/* 포토 투어 상품 (tours가 있는 작가만) */}
            {p.tours?.length > 0 && (
              <>
                <div style={{
                  gridColumn: '1 / -1',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 24, marginTop: 8,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em',
                    color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 14 }}>🗺️</span>
                    {lang === 'ko' ? '포토 투어' : lang === 'ja' ? 'フォトツアー' : 'PHOTO TOURS'}
                  </div>
                </div>

                {p.tours.map((tour, i) => {
                  const isTotal = tour.pricingType === 'total';
                  const perPersonPrice = isTotal ? Math.round(tour.price / (tour.maxGuests || 1)) : tour.price;
                  const durText = tour.durationMin >= 60
                    ? `${Math.floor(tour.durationMin / 60)}${lang === 'ko' ? '시간' : 'h'}${tour.durationMin % 60 ? ` ${tour.durationMin % 60}${lang === 'ko' ? '분' : 'm'}` : ''}`
                    : `${tour.durationMin}${lang === 'ko' ? '분' : 'm'}`;

                  return (
                    <div key={i} className="package"
                      style={{ border: '1px solid rgba(232,160,32,0.2)', background: 'rgba(232,160,32,0.02)', position: 'relative' }}
                    >
                      <Corners />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 12 }}>📍</span>
                        <div className="package-name" style={{ margin: 0 }}>{tour.name}</div>
                      </div>

                      {/* 가격 표시 — 모드별 분기 */}
                      {isTotal ? (
                        <div>
                          <div className="package-price">₩{fmt(tour.price)}<span style={{ fontSize: 11, color: 'var(--muted)' }}> / {lang === 'ko' ? '총액' : lang === 'ja' ? '合計' : 'total'}</span></div>
                          <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: 'rgba(232,160,32,0.1)', padding: '1px 6px', fontSize: 9, letterSpacing: '0.05em', fontFamily: 'var(--font-serif)' }}>
                              {lang === 'ko' ? '더치페이 가능' : lang === 'ja' ? '割り勘OK' : 'Split OK'}
                            </span>
                            {lang === 'ko' ? `최대 ${tour.maxGuests}인 → 1인 ₩${fmt(perPersonPrice)}` :
                             lang === 'ja' ? `最大${tour.maxGuests}名 → 1人 ₩${fmt(perPersonPrice)}` :
                             `Up to ${tour.maxGuests} guests → ₩${fmt(perPersonPrice)}/person`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="package-price">₩{fmt(tour.price)}<span style={{ fontSize: 11, color: 'var(--muted)' }}> / {lang === 'ko' ? '1인' : lang === 'ja' ? '1名' : 'person'}</span></div>
                          {tour.maxGuests && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                              {lang === 'ko' ? `최대 ${tour.maxGuests}인` : lang === 'ja' ? `最大${tour.maxGuests}名` : `Max ${tour.maxGuests} guests`}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 12 }}>
                        <span>⏱ {durText}</span>
                        <span>📷 {tour.photos}{lang === 'ko' ? '장' : lang === 'ja' ? '枚' : ' photos'}</span>
                      </div>
                      <div className="package-desc">{tour.descI18n?.[lang] ?? tour.desc}</div>
                      {/* 경유지 태그 */}
                      {tour.spots?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {tour.spots.map((spot, si) => (
                            <span key={si} style={{
                              fontSize: 10, padding: '2px 8px',
                              background: 'rgba(232,160,32,0.08)',
                              border: '1px solid rgba(232,160,32,0.15)',
                              color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                            }}>
                              {spot}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* 오픈된 일정이 있으면 일정별 참가 신청, 없으면 일반 예약 */}
                      {(() => {
                        const openInstances = tourInstances.filter(inst => inst.tourIndex === i);
                        if (openInstances.length > 0) {
                          return openInstances.map(inst => {
                            const count = getActiveBookingCount(inst);
                            const remaining = getRemainingSlots(inst);
                            const statusColor = getStatusColor(inst.status);
                            const fmtDate = (d) => { const dt = new Date(d + 'T00:00:00'); return `${dt.getMonth()+1}/${dt.getDate()}`; };
                            return (
                              <div key={inst.id} style={{ marginTop: 12, padding: '10px 14px', border: '1px solid rgba(76,175,80,0.2)', background: 'rgba(76,175,80,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <div style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                                    📅 {fmtDate(inst.scheduledDate)} {inst.scheduledTime}
                                  </div>
                                  <div style={{ fontSize: 9, padding: '2px 8px', background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`, fontFamily: 'var(--font-serif)' }}>
                                    {getStatusLabel(inst.status, lang)}
                                  </div>
                                </div>
                                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                                  <div style={{
                                    height: '100%', borderRadius: 2,
                                    width: `${Math.min(100, (count / inst.maxGuests) * 100)}%`,
                                    background: count >= inst.maxGuests ? '#4caf50' : '#e8a020',
                                  }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    👥 {count}/{inst.maxGuests}{lang === 'ko' ? '명' : ''} · {remaining > 0 ? `${remaining}${lang === 'ko' ? '자리 남음' : ' left'}` : lang === 'ko' ? '마감' : 'Full'}
                                  </span>
                                  <button
                                    className="btn-primary"
                                    style={{ fontSize: 9, padding: '5px 14px' }}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/tour/${inst.id}`); }}
                                    disabled={remaining <= 0}
                                  >
                                    {remaining > 0 ? (lang === 'ko' ? '참가 신청' : lang === 'ja' ? '参加申込' : 'Join Tour') : (lang === 'ko' ? '마감' : 'Full')}
                                  </button>
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
                                  ⏰ {lang === 'ko' ? '마감' : 'Deadline'}: {fmtDate(inst.deadline)}
                                </div>
                              </div>
                            );
                          });
                        }
                        return (
                          <button
                            className="btn-primary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 16, fontSize: 10 }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/booking/${p.id}`, { state: { mode: 'tour', tourName: tour.name } }); }}
                          >
                            {lang === 'ko' ? '투어 예약' : lang === 'ja' ? 'ツアー予約' : 'Book Tour'}
                          </button>
                        );
                      })()}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {tab === 'reviews' && (
          <div className="reviews">
            {reviewsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                {lang === 'ko' ? '리뷰를 불러오는 중...' : lang === 'ja' ? 'レビューを読み込んでいます...' : lang === 'zh' ? '加载评价中...' : 'Loading reviews...'}
              </div>
            ) : reviews.length > 0 || pkgReviews.length > 0 || artistReviews.length > 0 ? (
              <>
                {/* ── 1) 평점 요약 — 가장 위에 (센터 정렬) ── */}
                <div style={{
                  textAlign: 'center', padding: '28px 24px', marginBottom: 24,
                  border: '1px solid var(--gold-border)', background: 'var(--bg2)', position: 'relative',
                }}>
                  <Corners />
                  <div style={{ fontSize: 48, fontFamily: 'var(--font-serif)', color: 'var(--gold)', lineHeight: 1, marginBottom: 6 }}>
                    {avgRating}
                  </div>
                  <div style={{ color: 'var(--gold)', fontSize: 16, letterSpacing: 2, marginBottom: 4 }}>
                    {'★'.repeat(Math.round(Number(avgRating)))}{'☆'.repeat(5 - Math.round(Number(avgRating)))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
                    {reviewCount} {lang === 'ko' ? '개 리뷰' : lang === 'ja' ? '件のレビュー' : lang === 'zh' ? '条评价' : 'reviews'}
                  </div>

                  {/* 별점 분포 바 */}
                  <div style={{ maxWidth: 300, margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const allRevs = (pkgReviews.length > 0 || artistReviews.length > 0) ? [...pkgReviews, ...artistReviews] : reviews;
                      const count = allRevs.filter(r => (r.rating || r.stars) === star).length;
                      const pct = allRevs.length > 0 ? (count / allRevs.length) * 100 : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', minWidth: 8, textAlign: 'right' }}>{star}</span>
                          <span style={{ fontSize: 9, color: 'var(--gold)' }}>★</span>
                          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: 'var(--gold)', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: 9, color: 'var(--muted)', minWidth: 14, textAlign: 'right' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 리뷰 하이라이트 — 댓글 기반 장점 요약 */}
                  {reviewHighlights.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div style={{
                        fontFamily: 'var(--font-serif)', fontSize: 9, letterSpacing: '0.2em',
                        color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12,
                      }}>
                        {lang === 'ko' ? '고객들이 인정한 장점' : lang === 'ja' ? 'お客様が認める強み' : lang === 'zh' ? '客户认可的优点' : 'What clients love'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {reviewHighlights.map(h => (
                          <span key={h.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-serif)',
                            background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.15)',
                            color: 'var(--text)',
                          }}>
                            <span style={{ fontSize: 13 }}>{h.icon}</span>
                            {h.label[lang] || h.label.ko}
                            <span style={{ fontSize: 9, color: 'var(--gold)' }}>{h.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 2) 정렬 + 탭 필터 — 한 줄 ── */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 20, flexWrap: 'wrap', gap: 10,
                }}>
                  {/* 탭 토글 (패키지/작가 리뷰) */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {pkgReviews.length > 0 && (
                      <button
                        onClick={() => setReviewTabType('package')}
                        style={{
                          padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-serif)', cursor: 'pointer', transition: 'all 0.2s',
                          border: reviewTabType === 'package' ? '1px solid var(--gold)' : '1px solid var(--border)',
                          background: reviewTabType === 'package' ? 'var(--gold)' : 'transparent',
                          color: reviewTabType === 'package' ? 'var(--bg)' : 'var(--muted)',
                        }}
                      >
                        {lang === 'ko' ? '패키지' : 'Package'} ({pkgReviews.length})
                      </button>
                    )}
                    <button
                      onClick={() => setReviewTabType('artist')}
                      style={{
                        padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-serif)', cursor: 'pointer', transition: 'all 0.2s',
                        border: reviewTabType === 'artist' ? '1px solid var(--gold)' : '1px solid var(--border)',
                        background: reviewTabType === 'artist' ? 'var(--gold)' : 'transparent',
                        color: reviewTabType === 'artist' ? 'var(--bg)' : 'var(--muted)',
                      }}
                    >
                      {lang === 'ko' ? '작가' : 'Artist'} ({artistReviews.length})
                    </button>
                  </div>

                  {/* 정렬 */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { val: 'newest', ko: '최신순', en: 'Newest' },
                      { val: 'rating', ko: '높은 평점순', en: 'Highest' },
                      { val: 'ratingLow', ko: '낮은 평점순', en: 'Lowest' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setReviewSort(opt.val)}
                        style={{
                          padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-serif)',
                          border: `1px solid ${reviewSort === opt.val ? 'var(--gold)' : 'var(--border)'}`,
                          background: reviewSort === opt.val ? 'rgba(232,160,32,0.1)' : 'transparent',
                          color: reviewSort === opt.val ? 'var(--gold)' : 'var(--muted)',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {lang === 'ko' ? opt.ko : opt.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Sentiment Tags ── */}
                <SentimentTags reviews={reviews || artistReviews} lang={lang} mode="full" />

                {/* ── 3) 리뷰 목록 — 쭉 아래로 ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {sortedReviews.length > 0 ? (
                    sortedReviews.map((r, i) => (
                      <div key={i} style={{
                        padding: '20px 0',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {/* 상단: 이름 · 날짜 | 별점 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* 아바타 */}
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'var(--bg2)', border: '1px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-serif)',
                            }}>
                              {(r.author_name || r.author || '?')[0]}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                                {anonymize(r.author_name || r.author)}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                                {formatReviewDate(r.created_at || r.date)}
                              </div>
                            </div>
                          </div>
                          <div style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 1 }}>
                            {'★'.repeat(r.rating || r.stars)}{'☆'.repeat(5 - (r.rating || r.stars))}
                          </div>
                        </div>
                        {/* 본문 */}
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.8, opacity: 0.9, paddingLeft: 40 }}>
                          {r.title && (
                            <span style={{ fontWeight: 600, marginRight: 6 }}>{r.title}</span>
                          )}
                          {r.body || r.text || ''}
                        </div>
                        {/* 태그 */}
                        {r.tags && r.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, paddingLeft: 40 }}>
                            {r.tags.map((tag, ti) => (
                              <span key={ti} style={{
                                padding: '2px 8px', background: 'rgba(232,160,32,0.06)',
                                color: 'var(--muted)', fontSize: 10, border: '1px solid var(--border)',
                              }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* 작가 답글 */}
                        {(reviewRepliesMap[r.id] || r.reply) && (() => {
                          const reply = reviewRepliesMap[r.id] || r.reply;
                          const replyBody = typeof reply === 'string' ? reply : reply?.body;
                          const replyDate = typeof reply === 'object' ? (reply.updated_at || reply.created_at) : null;
                          if (!replyBody) return null;
                          return (
                            <div style={{
                              marginTop: 12, marginLeft: 40, padding: '14px 18px',
                              background: 'rgba(232,160,32,0.04)', borderLeft: '3px solid var(--gold)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.06em' }}>
                                  ✦ {lang === 'ko' ? '작가 답글' : lang === 'ja' ? 'フォトグラファーの返信' : lang === 'zh' ? '摄影师回复' : 'Photographer Reply'}
                                </span>
                                {replyDate && (
                                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    {replyDate.slice(0, 10).replace(/-/g, '.')}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.8, opacity: 0.9 }}>
                                {replyBody}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                      {lang === 'ko' ? '이 탭에 리뷰가 없습니다.' : lang === 'ja' ? 'このタブにはレビューがありません。' : lang === 'zh' ? '此选项卡中没有评价。' : 'No reviews in this tab.'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-serif)' }}>
                {lang === 'ko' ? '아직 리뷰가 없습니다.' :
                 lang === 'ja' ? 'まだレビューがありません。' :
                 lang === 'zh' ? '暂无评价。' :
                 'No reviews yet.'}
              </div>
            )}
          </div>
        )}

        {/* Schedule tab */}
        {tab === 'schedule' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>
              {t('profile.scheduleTitle')}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
              {t('profile.scheduleSub')}
            </p>
            <button className="btn-primary" onClick={() => navigate(`/booking/${p.id}`)}>
              {t('profile.scheduleBtn')}
            </button>
          </div>
        )}

      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareData={{
          title: `${displayName} — Phosnap`,
          description: bio || `${locationLabel} photographer on Phosnap`,
          imageUrl: p.images?.[0] || p.img,
          url: window.location.href,
          type: 'photographer',
        }}
      />

      <Footer />
    </div>
  );
};

export default Profile;
