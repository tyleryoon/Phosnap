import { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import PhotographerCard from '../components/PhotographerCard';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { PHOTOGRAPHERS, ALL_TAG_KEYS, SNAP_FILTER_KEYS, SNAP_FILTER_LABELS } from '../data/photographers';
import { fetchPhotographers } from '../lib/supabase';
import {
  getDomesticLocations,
  getOverseasLocations,
  getAllLocationsSorted,
  refreshRegistryFromDB,
  COUNTRIES,
  getLocationsByCountry,
  getCountriesFromPortfolio,
} from '../data/locationUtils';

// ─── i18n Translations for Advanced Filters ────────────────────────────
const FILTER_LABELS = {
  ko: {
    country: '촬영 국가',
    city: '촬영 도시',
    language: '작가 사용가능 언어',
    favSaved: '즐겨찾기 저장됨',
    loginForFav: '로그인 후 즐겨찾기를 이용할 수 있습니다',
    priceRange: '가격대',
    minPrice: '최소 가격',
    maxPrice: '최대 가격',
    rating: '평점',
    all: '전체',
    ratingUp4: '4.0+',
    ratingUp45: '4.5+',
    tags: '조건',
    sort: '정렬',
    popular: '인기순',
    ratingSort: '평점순',
    priceLow: '가격낮은순',
    priceHigh: '가격높은순',
    newest: '최신등록순',
    resetFilters: '필터 초기화',
    collapse: '필터 접기',
    expand: '필터 펼치기',
    activeFilters: '활성 필터',
    loginToSeeMore: '더 많은 작가를 보려면 로그인해주세요',
    loginRequired: '로그인이 필요합니다',
  },
  en: {
    country: 'Shooting Country',
    city: 'Shooting City',
    language: 'Artist Languages',
    favSaved: 'Saved to Favorites',
    loginForFav: 'Log in to use favorites',
    priceRange: 'Price Range',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    rating: 'Rating',
    all: 'All',
    ratingUp4: '4.0+',
    ratingUp45: '4.5+',
    tags: 'Conditions',
    sort: 'Sort',
    popular: 'Popular',
    ratingSort: 'Rating',
    priceLow: 'Lowest Price',
    priceHigh: 'Highest Price',
    newest: 'Newest',
    resetFilters: 'Reset Filters',
    collapse: 'Collapse',
    expand: 'Expand',
    activeFilters: 'Active Filters',
    loginToSeeMore: 'Log in to see more artists',
    loginRequired: 'Login Required',
  },
  ja: {
    country: '撮影国',
    city: '撮影都市',
    language: '作家対応言語',
    favSaved: 'お気に入りに保存',
    loginForFav: 'ログインしてお気に入りをご利用ください',
    priceRange: '価格範囲',
    minPrice: '最小価格',
    maxPrice: '最大価格',
    rating: '評点',
    all: '全て',
    ratingUp4: '4.0+',
    ratingUp45: '4.5+',
    tags: '条件',
    sort: 'ソート',
    popular: '人気順',
    ratingSort: '評点順',
    priceLow: '価格安い順',
    priceHigh: '価格高い順',
    newest: '最新登録順',
    resetFilters: 'フィルターをリセット',
    collapse: 'フィルターを折りたたむ',
    expand: 'フィルターを展開',
    activeFilters: 'アクティブフィルター',
    loginToSeeMore: 'もっと見るにはログインしてください',
    loginRequired: 'ログインが必要です',
  },
  zh: {
    country: '拍摄国家',
    city: '拍摄城市',
    language: '摄影师可用语言',
    favSaved: '已保存到收藏',
    loginForFav: '登录后可使用收藏功能',
    priceRange: '价格范围',
    minPrice: '最小价格',
    maxPrice: '最大价格',
    rating: '评分',
    all: '全部',
    ratingUp4: '4.0+',
    ratingUp45: '4.5+',
    tags: '条件',
    sort: '排序',
    popular: '热门',
    ratingSort: '评分',
    priceLow: '最低价格',
    priceHigh: '最高价格',
    newest: '最新注册',
    resetFilters: '重置筛选器',
    collapse: '折叠筛选器',
    expand: '展开筛选器',
    activeFilters: '活跃筛选器',
    loginToSeeMore: '更多摄影师请登录查看',
    loginRequired: '需要登录',
  },
};

// ─── Tag translations (expanded tags) ────────────────────────────────────
const EXPANDED_TAGS = {
  traditional_costume: { ko: '전통의상', en: 'Traditional Costume', ja: '伝統衣装', zh: '传统服装' },
  dress_rental:  { ko: '드레스', en: 'Dress', ja: 'ドレス', zh: '礼服' },
  suit_rental:   { ko: '정장', en: 'Suit', ja: 'スーツ', zh: '西装' },
  other_costume: { ko: '기타 의상', en: 'Other Costume', ja: 'その他衣装', zh: '其他服装' },
  props:         { ko: '소품', en: 'Props', ja: '小道具', zh: '道具' },
  hmu:           { ko: 'HMU', en: 'HMU', ja: 'HMU', zh: 'HMU' },
  instant_book:  { ko: '즉시예약', en: 'Instant Book', ja: '即予約', zh: '即时预订' },
  photo_tour:    { ko: '투어 포함', en: 'Photo Tour', ja: 'ツアー付き', zh: '包含旅游' },
  golden_hour:   { ko: '골든아워', en: 'Golden Hour', ja: 'ゴールデンアワー', zh: '黄金时段' },
};

// ─── Photographers List Page ───────────────────────────────────────────
// Advanced filtering with country/city cascading, price, rating, sorting, and URL sync

const Photographers = ({ onAuthOpen }) => {
  const { t, lang } = useLanguage();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Explore/Home에서 넘어온 state 수신
  const initialLocation = location.state?.locationId || 'all';
  const initialSearch   = location.state?.searchQuery || '';

  // ─── Filter State ─────────────────────────────────────────────────────
  const [activeFilter,   setActiveFilter]   = useState('all');
  const [activeLanguage, setActiveLanguage] = useState('all');
  const [activeLocation, setActiveLocation] = useState(initialLocation);
  const [searchQuery,    setSearchQuery]    = useState(initialSearch);
  const [activeSnapFilters, setActiveSnapFilters] = useState(new Set());

  // New filters
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'rating' | 'priceLow' | 'priceHigh' | 'newest'
  const [mobileFilterExpanded, setMobileFilterExpanded] = useState(false);

  // Database state
  const [dbPhotographers, setDbPhotographers] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);

  const toggleSnapFilter = (key) => {
    setActiveSnapFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ─── URL Sync: Load filters from URL params on mount ──────────────────
  useEffect(() => {
    if (location.state?._refresh) {
      // Full reset
      resetAllFilters();
      return;
    }

    const country = searchParams.get('country') || 'all';
    const city = searchParams.get('city') || 'all';
    const tags = searchParams.get('tags');
    const minP = searchParams.get('minPrice') || '';
    const maxP = searchParams.get('maxPrice') || '';
    const sort = searchParams.get('sort') || 'popular';
    const genre = searchParams.get('genre') || 'all';
    const lang = searchParams.get('lang') || 'all';
    const search = searchParams.get('search') || '';

    setSelectedCountry(country);
    setSelectedCity(city);
    setMinPrice(minP);
    setMaxPrice(maxP);
    setSortBy(sort);
    setActiveFilter(genre);
    setActiveLanguage(lang);
    setSearchQuery(search);

    if (tags) {
      const tagSet = new Set(tags.split(',').filter(Boolean));
      setActiveSnapFilters(tagSet);
    }

    // Handle legacy navigation
    if (location.state?.locationId) {
      setActiveLocation(location.state.locationId);
    }
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
    }
  }, []);

  // ─── URL Sync: Update URL when filters change ────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedCountry !== 'all') params.set('country', selectedCountry);
    if (selectedCity !== 'all') params.set('city', selectedCity);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sortBy !== 'popular') params.set('sort', sortBy);
    if (activeFilter !== 'all') params.set('genre', activeFilter);
    if (activeLanguage !== 'all') params.set('lang', activeLanguage);
    if (activeLocation !== 'all') params.set('location', activeLocation);
    if (activeSnapFilters.size > 0) params.set('tags', Array.from(activeSnapFilters).join(','));
    if (searchQuery) params.set('search', searchQuery);

    const queryString = params.toString();
    if (queryString) {
      window.history.replaceState(null, '', `?${queryString}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [selectedCountry, selectedCity, minPrice, maxPrice, sortBy, activeFilter, activeLanguage, activeLocation, activeSnapFilters, searchQuery]);

  // TASK 1C: 마운트 시 DB에서 지역 레지스트리 새로고침
  useEffect(() => {
    refreshRegistryFromDB().catch(err => console.warn('[Photographers] Registry refresh failed:', err));
  }, []);

  // ─── Fetch photographers from Supabase with current filters ──────────────
  useEffect(() => {
    const fetchWithFilters = async () => {
      setDbLoading(true);
      const { data, error } = await fetchPhotographers({
        countryCode: selectedCountry !== 'all' ? selectedCountry : undefined,
        city: selectedCity !== 'all' ? selectedCity : undefined,
        genre: activeFilter !== 'all' ? activeFilter : undefined,
        language: activeLanguage !== 'all' ? activeLanguage : undefined,
        minPrice: minPrice ? parseInt(minPrice) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
        sortBy,
        search: searchQuery || undefined,
      });
      if (!error && data && data.length > 0) {
        setDbPhotographers(data);
      }
      setDbLoading(false);
    };
    fetchWithFilters();
  }, [selectedCountry, selectedCity, activeFilter, activeLanguage, minPrice, maxPrice, sortBy, searchQuery]);

  const resetAllFilters = () => {
    setActiveFilter('all');
    setActiveLanguage('all');
    setActiveLocation('all');
    setSelectedCountry('all');
    setSelectedCity('all');
    setSearchQuery('');
    setActiveSnapFilters(new Set());
    setMinPrice('');
    setMaxPrice('');
    setSortBy('popular');
  };

  const languages = ['all', 'KO', 'EN', 'JP', 'CN'];

  // 동적 지역 목록 (작가 데이터 기반)
  const domesticLocs = useMemo(() => getDomesticLocations(), []);
  const overseasLocs = useMemo(() => getOverseasLocations(), []);
  const allLocs      = useMemo(() => getAllLocationsSorted(), []);

  // 즐겨찾기 국가 (로컬스토리지 or Supabase)
  const [favCountries, setFavCountries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phosnap_fav_countries') || '[]'); } catch { return []; }
  });
  const [favToast, setFavToast] = useState('');

  const toggleFavCountry = (code) => {
    if (!isLoggedIn) {
      setFavToast(filterLabelsForLang.loginForFav);
      setTimeout(() => setFavToast(''), 2500);
      return;
    }
    const next = favCountries.includes(code) ? favCountries.filter(c => c !== code) : [...favCountries, code];
    setFavCountries(next);
    localStorage.setItem('phosnap_fav_countries', JSON.stringify(next));
  };

  // Countries list — 작가 포트폴리오에 태그된 국가만 (즐겨찾기 우선)
  const countriesList = useMemo(() => {
    const fromPortfolio = getCountriesFromPortfolio(lang);
    // 즐겨찾기를 우선으로 정렬
    return [...fromPortfolio].sort((a, b) => {
      const aFav = favCountries.includes(a.code) ? 0 : 1;
      const bFav = favCountries.includes(b.code) ? 0 : 1;
      return aFav - bFav;
    });
  }, [lang, favCountries]);

  // Cities for selected country
  const citiesForCountry = useMemo(() => {
    if (selectedCountry === 'all') return [];
    return getLocationsByCountry(selectedCountry);
  }, [selectedCountry]);

  // Handle country change - reset city
  useEffect(() => {
    if (selectedCity !== 'all' && citiesForCountry.length > 0) {
      const cityExists = citiesForCountry.some(c => c.id === selectedCity);
      if (!cityExists) {
        setSelectedCity('all');
      }
    }
  }, [citiesForCountry, selectedCity]);

  // Get cheapest package price for each photographer
  const getCheapestPrice = (p) => {
    if (!p.packages || p.packages.length === 0) return Infinity;
    return Math.min(...p.packages.map(pkg => pkg.price));
  };

  // Use DB data with fallback to mock data
  const photographersSource = dbPhotographers || PHOTOGRAPHERS;

  // Filter logic - chain all filters together
  const filtered = photographersSource.filter(p => {
    // Genre filter
    const tagMatch = activeFilter === 'all' || p.tags.includes(activeFilter);

    // Language filter
    const langMatch = activeLanguage === 'all' || p.languages.includes(activeLanguage);

    // Legacy location filter (for backward compatibility)
    const locMatch = activeLocation === 'all' || p.locationId === activeLocation;

    // Country filter
    let countryMatch = true;
    if (selectedCountry !== 'all') {
      const locMeta = citiesForCountry.find(c => c.id === p.locationId);
      countryMatch = !!locMeta;
    }

    // City filter (cascading)
    let cityMatch = true;
    if (selectedCity !== 'all') {
      cityMatch = p.locationId === selectedCity;
    }

    // Price range filter
    let priceMatch = true;
    const minP = minPrice ? parseInt(minPrice, 10) : 0;
    const maxP = maxPrice ? parseInt(maxPrice, 10) : 2000000;
    const cheapest = getCheapestPrice(p);
    if (minPrice || maxPrice) {
      priceMatch = cheapest >= minP && cheapest <= maxP;
    }

    // Snap filters (expanded)
    let snapMatch = true;
    if (activeSnapFilters.size > 0) {
      for (const key of activeSnapFilters) {
        if (key === 'instant_booking') {
          if (!p.instantBooking) { snapMatch = false; break; }
        } else if (key === 'hmu') {
          if (!p.hmk) { snapMatch = false; break; }
        } else if (key === 'photo_tour') {
          if (!p.tours || p.tours.length === 0) { snapMatch = false; break; }
        } else {
          if (!(p.snapFilters || []).includes(key)) { snapMatch = false; break; }
        }
      }
    }

    // Search match
    let searchMatch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      searchMatch =
        (p.name || '').toLowerCase().includes(q) ||
        (p.nameKo || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.locationNames?.ko || '').toLowerCase().includes(q) ||
        (p.locationNames?.en || '').toLowerCase().includes(q) ||
        (p.locationNames?.ja || '').toLowerCase().includes(q) ||
        (p.locationNames?.zh || '').toLowerCase().includes(q) ||
        (p.locationId || '').toLowerCase().includes(q) ||
        (p.tags || []).some(tag => tag.toLowerCase().includes(q) || (t(`tags.${tag}`) || '').toLowerCase().includes(q));
    }

    return tagMatch && langMatch && locMatch && countryMatch && cityMatch && priceMatch && searchMatch && snapMatch;
  });

  // Apply sorting
  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === 'rating') {
      copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'priceLow') {
      copy.sort((a, b) => getCheapestPrice(a) - getCheapestPrice(b));
    } else if (sortBy === 'priceHigh') {
      copy.sort((a, b) => getCheapestPrice(b) - getCheapestPrice(a));
    } else if (sortBy === 'newest') {
      copy.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else {
      // popular: sort by reviews/bookings
      copy.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    }
    return copy;
  }, [filtered, sortBy]);

  const FilterBtn = ({ id, label, active, onClick }) => (
    <button
      className={`filter-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ padding: '6px 14px', fontSize: 11 }}
    >
      {label}
    </button>
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCountry !== 'all') count++;
    if (selectedCity !== 'all') count++;
    if (activeFilter !== 'all') count++;
    if (activeLanguage !== 'all') count++;
    if (activeLocation !== 'all') count++;
    if (minPrice || maxPrice) count++;
    if (activeSnapFilters.size > 0) count += activeSnapFilters.size;
    if (searchQuery) count++;
    return count;
  }, [selectedCountry, selectedCity, activeFilter, activeLanguage, activeLocation, minPrice, maxPrice, activeSnapFilters, searchQuery]);

  const filterLabelsForLang = FILTER_LABELS[lang] || FILTER_LABELS.en;

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section">
        <div className="section-label">Visual Artists</div>
        <h2 className="section-title">{t('nav.photographers')}</h2>
        <p className="section-sub">{t('photographers.sub')}</p>

        {/* Mobile Filter Toggle */}
        <div style={{ display: 'none', marginBottom: 16, '@media (maxWidth: 768px)': { display: 'flex' } }}>
          <button
            onClick={() => setMobileFilterExpanded(!mobileFilterExpanded)}
            style={{
              width: '100%', padding: '12px', fontSize: 12, fontFamily: 'var(--font-serif)',
              background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--gold)',
              cursor: 'pointer', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {mobileFilterExpanded ? filterLabelsForLang.collapse : filterLabelsForLang.expand}
            {activeFilterCount > 0 && (
              <span style={{ background: 'var(--gold)', color: 'var(--bg)', padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 'bold' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters Container */}
        <div style={{ display: mobileFilterExpanded ? 'block' : 'block' }}>
          {/* ── 촬영 국가 (포트폴리오 기반 + 즐겨찾기) ── */}
          <div style={{ marginBottom: 16, border: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {filterLabelsForLang.country}
              </div>
              {selectedCountry !== 'all' && (
                <button
                  onClick={() => { setSelectedCountry('all'); setSelectedCity('all'); }}
                  style={{ fontSize: 10, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}
                >
                  {filterLabelsForLang.all} ✕
                </button>
              )}
            </div>

            {/* 즐겨찾기 토스트 */}
            {favToast && (
              <div style={{
                marginBottom: 10, padding: '8px 14px', fontSize: 11,
                background: 'rgba(232,160,32,0.1)', border: '1px solid var(--gold-border)',
                color: 'var(--gold)', fontFamily: 'var(--font-serif)', textAlign: 'center',
                animation: 'fadeIn 0.2s',
              }}>
                {favToast}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                className={`filter-btn ${selectedCountry === 'all' ? 'active' : ''}`}
                onClick={() => { setSelectedCountry('all'); setSelectedCity('all'); }}
                style={{ padding: '6px 14px', fontSize: 11 }}
              >
                {filterLabelsForLang.all}
              </button>
              {countriesList.map(c => {
                const isActive = selectedCountry === c.code;
                const isFav = favCountries.includes(c.code);
                return (
                  <div key={c.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 0, position: 'relative' }}>
                    <button
                      className={`filter-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCountry(isActive ? 'all' : c.code);
                        setSelectedCity('all');
                      }}
                      style={{ padding: '6px 12px 6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                    >
                      <span style={{ fontSize: 13 }}>{c.flag}</span>
                      {c.name}
                      <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 2 }}>{c.artistCount}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavCountry(c.code); }}
                      style={{
                        padding: '6px 6px', fontSize: 12, cursor: 'pointer',
                        background: isActive ? 'rgba(232,160,32,0.15)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
                        borderLeft: 'none', borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
                        color: isFav ? 'var(--gold)' : 'rgba(136,136,136,0.3)',
                        transition: 'color 0.2s',
                      }}
                      title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div style={{ marginBottom: 16, border: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {filterLabelsForLang.priceRange}
              </div>
              {(minPrice || maxPrice) && (
                <button
                  onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                  style={{ fontSize: 10, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}
                >
                  {filterLabelsForLang.all} ✕
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>{filterLabelsForLang.minPrice}</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="₩0"
                  min="0"
                  max="2000000"
                  style={{
                    padding: '10px', fontSize: 12, fontFamily: 'var(--font-sans)', background: 'var(--bg)',
                    border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
                    transition: 'border-color var(--ease)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold-border)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>{filterLabelsForLang.maxPrice}</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="₩2,000,000"
                  min="0"
                  max="2000000"
                  style={{
                    padding: '10px', fontSize: 12, fontFamily: 'var(--font-sans)', background: 'var(--bg)',
                    border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
                    transition: 'border-color var(--ease)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--gold-border)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>
            </div>
          </div>

          {/* Rating Filter — removed per design update */}
        </div>

        {/* Genre Filter */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            {lang === 'ko' ? '장르' : lang === 'ja' ? 'ジャンル' : lang === 'zh' ? '流派' : 'Genre'}
          </div>
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
        </div>

        {/* 촬영 도시 — 선택된 국가의 포트폴리오 태그 도시만 표시 */}
        <div style={{ marginBottom: 16, border: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {filterLabelsForLang.city}
            </div>
            {activeLocation !== 'all' && (
              <button
                onClick={() => setActiveLocation('all')}
                style={{ fontSize: 10, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}
              >
                {filterLabelsForLang.all} ✕
              </button>
            )}
          </div>
          {selectedCountry === 'all' ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.03em', padding: '8px 0' }}>
              {lang === 'ko' ? '위에서 촬영 국가를 선택하면 도시가 표시됩니다' : lang === 'ja' ? '上で撮影国を選択すると都市が表示されます' : lang === 'zh' ? '请先在上方选择拍摄国家' : 'Select a country above to see cities'}
            </div>
          ) : citiesForCountry.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.03em', padding: '8px 0' }}>
              {lang === 'ko' ? '이 국가에 등록된 도시가 없습니다' : lang === 'ja' ? 'この国に登録された都市はありません' : lang === 'zh' ? '该国家暂无注册城市' : 'No cities registered in this country'}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }} className="filters">
              <FilterBtn id="all" label={filterLabelsForLang.all} active={activeLocation === 'all'} onClick={() => setActiveLocation('all')} />
              {citiesForCountry.map(loc => (
                <FilterBtn key={loc.id} id={loc.id} label={loc.nameI18n?.[lang] ?? loc.ko}
                  active={activeLocation === loc.id}
                  onClick={() => setActiveLocation(activeLocation === loc.id ? 'all' : loc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 언어 필터 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginRight: 8 }}>{filterLabelsForLang.language}</span>
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

        {/* Expanded Tags/Conditions Filter */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center',
          padding: '14px 20px', border: '1px solid var(--border)', background: 'var(--bg2)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: 4, flexShrink: 0 }}>
            ✦ {filterLabelsForLang.tags}
          </span>
          {SNAP_FILTER_KEYS.map(key => {
            const active = activeSnapFilters.has(key);
            const label = SNAP_FILTER_LABELS[key]?.[lang] || SNAP_FILTER_LABELS[key]?.en || key;
            const icon = key === 'traditional_costume' ? '👘' : key === 'dress_rental' ? '👗' : key === 'suit_rental' ? '🤵' : key === 'other_costume' ? '🎭' : key === 'props' ? '🎪' : key === 'hmu' ? '💄' : key === 'golden_hour' ? '🌅' : key === 'instant_booking' ? '⚡' : key === 'photo_tour' ? '📸' : '✨';
            return (
              <button
                key={key}
                onClick={() => toggleSnapFilter(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'var(--font-serif)', letterSpacing: '0.03em',
                  background: active ? 'rgba(232,160,32,0.1)' : 'transparent',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                  color: active ? 'var(--gold)' : 'var(--muted)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 12 }}>{icon}</span>
                {label}
                {active && <span style={{ fontSize: 10, marginLeft: 2 }}>✕</span>}
              </button>
            );
          })}
          {/* 원하는 조건이 없을 때 — 기타 요청 */}
          <button
            onClick={() => navigate('/contact', { state: { subject: 'custom_request' } })}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font-serif)', letterSpacing: '0.03em',
              background: 'transparent',
              border: '1px dashed var(--border)',
              color: 'var(--muted)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--muted)'; }}
          >
            <span style={{ fontSize: 12 }}>💬</span>
            {lang === 'ko' ? '원하는 조건이 없나요?' : lang === 'ja' ? 'お探しの条件がない？' : lang === 'zh' ? '没有想要的条件？' : 'Missing a filter?'}
          </button>
          {activeSnapFilters.size > 0 && (
            <button
              onClick={() => setActiveSnapFilters(new Set())}
              style={{
                fontSize: 10, color: 'var(--muted)', background: 'transparent',
                border: '1px solid var(--border)', padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
              }}
            >
              {lang === 'ko' ? '초기화' : lang === 'ja' ? 'リセット' : lang === 'zh' ? '重置' : 'Clear'} ✕
            </button>
          )}
        </div>

        {/* Reset Filters Button */}
        {activeFilterCount > 0 && (
          <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
            <button
              onClick={resetAllFilters}
              style={{
                padding: '10px 20px', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em',
                background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(232,160,32,0.1)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; }}
            >
              {filterLabelsForLang.resetFilters}
            </button>

            {/* Active Filters Display */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {selectedCountry !== 'all' && (
                <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(232,160,32,0.15)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: 4, fontFamily: 'var(--font-serif)' }}>
                  {countriesList.find(c => c.code === selectedCountry)?.flag} {countriesList.find(c => c.code === selectedCountry)?.name}
                </span>
              )}
              {selectedCity !== 'all' && (
                <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(232,160,32,0.15)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: 4, fontFamily: 'var(--font-serif)' }}>
                  {citiesForCountry.find(c => c.id === selectedCity)?.nameI18n?.[lang] ?? citiesForCountry.find(c => c.id === selectedCity)?.ko}
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(232,160,32,0.15)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: 4, fontFamily: 'var(--font-serif)' }}>
                  ₩ {minPrice || '0'} ~ {maxPrice || '2M'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Result Count + Artist Name Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.05em', flexShrink: 0 }}>
            {sorted.length}{t('home.locationCount')}
            {activeLocation !== 'all' && (
              <span style={{ marginLeft: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                — {(() => { const loc = allLocs.find(l => l.id === activeLocation); return loc?.nameI18n?.[lang] ?? loc?.ko ?? activeLocation; })()}
              </span>
            )}
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'ko' ? '작가명 검색...' : lang === 'ja' ? '作家名で検索...' : lang === 'zh' ? '搜索摄影师...' : 'Search artist...'}
              style={{
                width: '100%', padding: '8px 32px 8px 30px', fontSize: 12,
                background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)',
                fontFamily: 'var(--font-sans)', letterSpacing: '0.03em', outline: 'none',
                transition: 'border-color var(--ease)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--gold-border)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                  fontSize: 12, padding: '2px',
                }}
              >✕</button>
            )}
          </div>

          {/* Sort Dropdown — compact, below search */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '6px 24px 6px 10px', fontSize: 11, fontFamily: 'var(--font-sans)',
              background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--muted)',
              cursor: 'pointer', outline: 'none', letterSpacing: '0.03em',
              transition: 'border-color var(--ease)', flexShrink: 0,
              appearance: 'auto',
            }}
          >
            <option value="popular">{filterLabelsForLang.popular}</option>
            <option value="rating">{filterLabelsForLang.ratingSort}</option>
            <option value="priceLow">{filterLabelsForLang.priceLow}</option>
            <option value="priceHigh">{filterLabelsForLang.priceHigh}</option>
            <option value="newest">{filterLabelsForLang.newest}</option>
          </select>
        </div>

        {/* Grid — 비로그인 사용자는 상위 3명만 표시 */}
        {(() => {
          const MAX_PREVIEW = 3;
          const visibleList = isLoggedIn ? sorted : sorted.slice(0, MAX_PREVIEW);
          const hasMore = !isLoggedIn && sorted.length > MAX_PREVIEW;

          const handleCardClick = (p) => {
            if (!isLoggedIn) {
              if (onAuthOpen) onAuthOpen('login');
              return;
            }
            navigate(`/photographer/${p.id}`);
          };

          return visibleList.length > 0 ? (
            <>
              <div className="photo-grid">
                {visibleList.map(p => <PhotographerCard key={p.id} p={p} onClick={handleCardClick} blurred={!isLoggedIn} />)}
              </div>
              {/* 비로그인 시 로그인 유도 배너 */}
              {hasMore && (
                <div
                  onClick={() => onAuthOpen ? onAuthOpen('login') : navigate('/login')}
                  style={{
                    marginTop: 40, padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(232,160,32,0.04) 50%, rgba(232,160,32,0.08) 100%)',
                    border: '1px solid var(--gold-border)',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(232,160,32,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.background = 'linear-gradient(180deg, transparent 0%, rgba(232,160,32,0.04) 50%, rgba(232,160,32,0.08) 100%)'; }}
                >
                  <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {filterLabelsForLang.loginRequired}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', marginBottom: 12 }}>
                    {filterLabelsForLang.loginToSeeMore}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    +{sorted.length - MAX_PREVIEW}{lang === 'ko' ? '명의 작가가 더 있습니다' : lang === 'ja' ? '名の作家がいます' : lang === 'zh' ? '位摄影师' : ' more artists available'}
                  </div>
                  <button style={{
                    marginTop: 16, padding: '12px 32px', background: 'var(--gold)', color: '#0B0B0B',
                    border: 'none', fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer',
                  }}>
                    {lang === 'ko' ? '로그인하기' : lang === 'ja' ? 'ログイン' : lang === 'zh' ? '登录' : 'Log In'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>
                {t('photographers.noResults')}
              </div>
              <div style={{ fontSize: 13 }}>{t('photographers.changeFilter')}</div>
            </div>
          );
        })()}
      </div>

      <Footer />
    </div>
  );
};

export default Photographers;
