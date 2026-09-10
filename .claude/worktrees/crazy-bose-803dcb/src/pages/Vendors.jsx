import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Corners from '../components/Corners';
import { useLanguage } from '../contexts/LanguageContext';
import { DRESS_VENDORS } from '../data/dressVendors';
import { getTagLabel, getAllTagIds, COSTUME_TAG_REGISTRY, VENUE_TAG_REGISTRY } from '../data/tagRegistry';

// ─── Vendors Page — 고객용 업체 탐색 + 태그 필터링 ────────────────────

const Vendors = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [imageErrors, setImageErrors] = useState(new Set());

  // Tab: 의상 / 장소
  const [vendorTab, setVendorTab] = useState('costume');

  // Tag filter state
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);

  // Search
  const [searchText, setSearchText] = useState('');

  // Sort: 'name' | 'newest'
  const [sortBy, setSortBy] = useState('name');

  // Available tags for current tab
  const tagIds = useMemo(() => getAllTagIds(vendorTab), [vendorTab]);

  // Tag toggle
  const toggleFilterTag = (tagId) => {
    setSelectedFilterTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  // Clear filters on tab switch
  const switchTab = (tab) => {
    setVendorTab(tab);
    setSelectedFilterTags([]);
    setSearchText('');
  };

  // Filter vendors
  const filteredVendors = useMemo(() => {
    let vendors = DRESS_VENDORS.filter(v => v.isActive);

    // Only show vendors that have nameKo (published requirement)
    // For mock data, all vendors have a name, so we just filter by isActive

    // Filter by search text
    if (searchText) {
      const q = searchText.toLowerCase();
      vendors = vendors.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.nameI18n?.[lang] || '').toLowerCase().includes(q) ||
        (v.bio || '').toLowerCase().includes(q) ||
        (v.bioI18n?.[lang] || '').toLowerCase().includes(q)
      );
    }

    // Filter by selected tags
    if (selectedFilterTags.length > 0) {
      vendors = vendors.filter(v => {
        const vTags = v.tags || [];
        return selectedFilterTags.some(ft => vTags.includes(ft));
      });
    }

    // Sort
    if (sortBy === 'newest') {
      vendors = [...vendors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      vendors = [...vendors].sort((a, b) => (a.nameI18n?.[lang] || a.name).localeCompare(b.nameI18n?.[lang] || b.name));
    }

    return vendors;
  }, [searchText, selectedFilterTags, sortBy, lang, vendorTab]);

  return (
    <div className="page-enter" style={{ paddingTop: 100, minHeight: '100vh' }}>
      <div className="section">
        <div className="section-label">Vendors</div>
        <h2 className="section-title">
          {lang === 'ko' ? '의상 & 장소 대여 업체' :
           lang === 'ja' ? '衣装＆会場レンタル' :
           lang === 'zh' ? '服装与场地租赁' :
           'Costume & Venue Rentals'}
        </h2>
        <p className="section-sub" style={{ maxWidth: 600, margin: '0 auto 2rem' }}>
          {lang === 'ko' ? '원하는 태그로 업체를 찾아보세요. 스냅촬영에 딱 맞는 의상과 장소를 제공하는 파트너 업체들입니다.' :
           lang === 'ja' ? 'タグで検索して、あなたのスナップ撮影にぴったりの衣装と会場のパートナーを見つけましょう。' :
           lang === 'zh' ? '通过标签搜索，找到适合您快拍摄影的服装和场地合作伙伴。' :
           'Find the perfect costume and venue partners for your snap photography through tag-based search.'}
        </p>

        {/* Tab: 의상 / 장소 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {[
            { key: 'costume', label: lang === 'ko' ? '👗 의상 대여' : lang === 'ja' ? '👗 衣装レンタル' : '👗 Costumes' },
            { key: 'venue', label: lang === 'ko' ? '🏛️ 장소 대여' : lang === 'ja' ? '🏛️ 会場レンタル' : '🏛️ Venues' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              style={{
                padding: '0.6rem 1.5rem',
                border: `1px solid ${vendorTab === key ? 'var(--gold)' : 'var(--border)'}`,
                background: vendorTab === key ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: vendorTab === key ? 'var(--gold)' : 'var(--muted)',
                fontFamily: 'var(--font-serif)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ maxWidth: 500, margin: '0 auto 1.5rem' }}>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={lang === 'ko' ? '업체명, 지역, 키워드 검색...' : 'Search vendors...'}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.9rem',
              letterSpacing: '0.03em',
            }}
          />
        </div>

        {/* Tag filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.5rem', maxWidth: 800, margin: '0 auto 1.5rem' }}>
          {tagIds.map((tagId) => {
            const isActive = selectedFilterTags.includes(tagId);
            return (
              <button
                key={tagId}
                onClick={() => toggleFilterTag(tagId)}
                style={{
                  padding: '0.3rem 0.7rem',
                  border: `1px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
                  background: isActive ? 'rgba(212,175,55,0.15)' : 'transparent',
                  color: isActive ? 'var(--gold)' : 'var(--muted)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '0.02em',
                }}
              >
                {isActive && '✓ '}{getTagLabel(tagId, lang, vendorTab)}
              </button>
            );
          })}
        </div>

        {selectedFilterTags.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => setSelectedFilterTags([])}
              style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {lang === 'ko' ? '필터 초기화' : 'Clear filters'} ({selectedFilterTags.length})
            </button>
          </div>
        )}

        {/* Sort */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', maxWidth: 900, margin: '0 auto 1rem' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.35rem 0.7rem',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--muted)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.8rem',
            }}
          >
            <option value="name">{lang === 'ko' ? '이름순' : 'By name'}</option>
            <option value="newest">{lang === 'ko' ? '최신순' : 'Newest'}</option>
          </select>
        </div>

        {/* Vendor cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
          maxWidth: 960,
          margin: '0 auto 3rem',
        }}>
          {filteredVendors.map(vendor => {
            const displayName = vendor.nameI18n?.[lang] || vendor.name;
            const displayBio = vendor.bioI18n?.[lang] || vendor.bio || '';
            const displayLocation = vendor.locationNames?.[lang] || vendor.locationId || '';
            const vendorTags = vendor.tags || [];

            return (
              <div
                key={vendor.id}
                onClick={() => navigate(`/vendor/${vendor.id}`)}
                style={{
                  position: 'relative',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s, transform 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Corners />
                {/* Image */}
                <div style={{
                  width: '100%',
                  height: 200,
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg2)',
                }}>
                  {imageErrors.has(vendor.id) ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--bg2)',
                    }}>
                      <div style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--muted)"
                          strokeWidth="1"
                          opacity="0.6"
                        >
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                          fontFamily: 'var(--font-serif)',
                          letterSpacing: '0.02em',
                        }}>
                          이미지 없음
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={vendor.img}
                      alt={vendor.nameI18n?.[lang] || vendor.name}
                      onError={() => setImageErrors(prev => new Set([...prev, vendor.id]))}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: 'block',
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '1.2rem' }}>
                  <h3 style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--gold)',
                    fontSize: '1.1rem',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.03em',
                  }}>
                    {displayName}
                  </h3>

                  {displayLocation && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 0.6rem' }}>
                      📍 {displayLocation}
                    </p>
                  )}

                  <p style={{
                    fontSize: '0.82rem',
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    margin: '0 0 0.8rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    opacity: 0.8,
                  }}>
                    {displayBio}
                  </p>

                  {/* Tags */}
                  {vendorTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {vendorTags.slice(0, 6).map(tagId => (
                        <span
                          key={tagId}
                          style={{
                            padding: '0.2rem 0.5rem',
                            border: `1px solid ${selectedFilterTags.includes(tagId) ? 'var(--gold)' : 'rgba(212,175,55,0.3)'}`,
                            background: selectedFilterTags.includes(tagId) ? 'rgba(212,175,55,0.12)' : 'transparent',
                            color: selectedFilterTags.includes(tagId) ? 'var(--gold)' : 'var(--muted)',
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-serif)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {getTagLabel(tagId, lang, vendorTab)}
                        </span>
                      ))}
                      {vendorTags.length > 6 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', alignSelf: 'center' }}>
                          +{vendorTags.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredVendors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
            <p style={{ fontSize: '1.1rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>
              {lang === 'ko' ? '조건에 맞는 업체가 없습니다' : 'No vendors found'}
            </p>
            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
              {lang === 'ko' ? '다른 태그를 선택하거나 검색어를 변경해보세요' : 'Try different tags or search terms'}
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Vendors;
