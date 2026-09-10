import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getPersonalizedRecommendations } from '../lib/matchingAlgorithm';
import Corners from './Corners';

const MatchingRecommendation = ({ photographers = [], onAuthOpen = () => {} }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [preferences, setPreferences] = useState({
    location: { city: '', country: 'Korea' },
    styleTags: [],
    budgetMin: 0,
    budgetMax: 5000000,
    languages: [],
    wantInstantBooking: false,
    wantHMU: false,
  });

  // Recommendation results
  const [results, setResults] = useState(null);

  // Inline text lookup - no t() function
  const textMap = {
    ko: {
      label: '추천',
      title: '나에게 맞는 작가 추천',
      subtitle: 'AI 알고리즘이 당신의 취향에 맞는 작가를 찾아드립니다',
      locationLabel: '촬영 지역',
      styleLabel: '사진 스타일',
      budgetLabel: '예산 (₩)',
      languageLabel: '언어',
      instantLabel: '즉시 예약 가능',
      hmuLabel: '헤어메이크업 포함',
      submitBtn: '추천 받기',
      loginCTA: '추천받으려면 로그인하세요',
      loginBtn: '로그인',
      aiRecommended: 'AI 추천 작가',
      matchScore: '매칭도',
      matchReason: '매칭 이유',
      noResults: '조건에 맞는 작가가 없습니다',
      expand: '필터 설정',
      collapse: '필터 숨기기',
    },
    en: {
      label: 'RECOMMENDATIONS',
      title: 'Find Your Perfect Photographer',
      subtitle: 'AI-powered matching to find photographers tailored to your needs',
      locationLabel: 'Preferred Location',
      styleLabel: 'Photography Style',
      budgetLabel: 'Budget (₩)',
      languageLabel: 'Languages',
      instantLabel: 'Instant Booking',
      hmuLabel: 'Hair & Makeup Included',
      submitBtn: 'Get Recommendations',
      loginCTA: 'Sign in to get personalized recommendations',
      loginBtn: 'Sign In',
      aiRecommended: 'AI Recommended',
      matchScore: 'Match Score',
      matchReason: 'Why This Match',
      noResults: 'No photographers match your criteria',
      expand: 'Set Filters',
      collapse: 'Hide Filters',
    },
    ja: {
      label: 'おすすめ',
      title: 'あなたに合うカメラマンを探す',
      subtitle: 'AI マッチングで、あなたのニーズに合ったカメラマンを見つけます',
      locationLabel: '撮影地域',
      styleLabel: '写真スタイル',
      budgetLabel: '予算 (₩)',
      languageLabel: '言語',
      instantLabel: '即時予約',
      hmuLabel: 'ヘアメイク込み',
      submitBtn: 'おすすめを受ける',
      loginCTA: 'ログインしてパーソナライズされたおすすめを受け取る',
      loginBtn: 'ログイン',
      aiRecommended: 'AIおすすめ',
      matchScore: 'マッチスコア',
      matchReason: 'マッチ理由',
      noResults: 'あなたの条件に合うカメラマンはいません',
      expand: 'フィルターを設定',
      collapse: 'フィルターを非表示',
    },
    zh: {
      label: '推荐',
      title: '找到完美的摄影师',
      subtitle: '使用 AI 匹配找到符合您需求的摄影师',
      locationLabel: '拍摄地点',
      styleLabel: '摄影风格',
      budgetLabel: '预算 (₩)',
      languageLabel: '语言',
      instantLabel: '即时预订',
      hmuLabel: '包含化妆',
      submitBtn: '获取推荐',
      loginCTA: '登录以获得个性化推荐',
      loginBtn: '登录',
      aiRecommended: 'AI 推荐',
      matchScore: '匹配度',
      matchReason: '为什么匹配',
      noResults: '没有摄影师符合您的条件',
      expand: '设置筛选器',
      collapse: '隐藏筛选器',
    },
  };

  const t = (key) => textMap[lang]?.[key] || textMap.en[key];

  // Get unique styles and locations
  const uniqueStyles = useMemo(() => {
    const styles = new Set();
    photographers.forEach((p) => {
      (p.tags || []).forEach((tag) => styles.add(tag));
    });
    return Array.from(styles);
  }, [photographers]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set();
    photographers.forEach((p) => {
      if (p.location) locs.add(p.location);
    });
    return Array.from(locs);
  }, [photographers]);

  const handleRecommend = () => {
    if (!user) {
      onAuthOpen?.();
      return;
    }

    const scored = getPersonalizedRecommendations(photographers, preferences);
    setResults(scored.slice(0, 3));
  };

  const toggleFilter = () => {
    setIsExpanded(!isExpanded);
    setResults(null);
  };

  return (
    <div style={styles.container}>
      <Corners />

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.label}>{t('label')}</span>
        <h2 style={styles.title}>{t('title')}</h2>
        <p style={styles.subtitle}>{t('subtitle')}</p>
      </div>

      {/* Collapsible Filter Panel */}
      <button
        onClick={toggleFilter}
        style={{
          ...styles.toggleBtn,
          borderColor: isExpanded ? 'var(--gold)' : 'var(--border)',
          color: isExpanded ? 'var(--gold)' : 'var(--text)',
        }}
      >
        <span>{isExpanded ? t('collapse') : t('expand')}</span>
        <span style={{ fontSize: 14, marginLeft: 8 }}>{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div style={styles.filterPanel}>
          {/* Location */}
          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>{t('locationLabel')}</label>
            <select
              value={preferences.location.city}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  location: { ...preferences.location, city: e.target.value },
                })
              }
              style={styles.select}
            >
              <option value="">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Style Tags */}
          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>{t('styleLabel')}</label>
            <div style={styles.pillContainer}>
              {uniqueStyles.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setPreferences({
                      ...preferences,
                      styleTags: preferences.styleTags.includes(tag)
                        ? preferences.styleTags.filter((t) => t !== tag)
                        : [...preferences.styleTags, tag],
                    });
                  }}
                  style={{
                    ...styles.pill,
                    backgroundColor: preferences.styleTags.includes(tag)
                      ? 'var(--gold)'
                      : 'transparent',
                    color: preferences.styleTags.includes(tag) ? '#0B0B0B' : 'var(--text)',
                    borderColor: preferences.styleTags.includes(tag) ? 'var(--gold)' : 'var(--border)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>{t('budgetLabel')}</label>
            <div style={styles.budgetRow}>
              <input
                type="number"
                placeholder="Min"
                value={preferences.budgetMin}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    budgetMin: Number(e.target.value),
                  })
                }
                style={styles.input}
              />
              <span style={{ color: 'var(--muted)' }}>−</span>
              <input
                type="number"
                placeholder="Max"
                value={preferences.budgetMax}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    budgetMax: Number(e.target.value),
                  })
                }
                style={styles.input}
              />
            </div>
          </div>

          {/* Languages */}
          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>{t('languageLabel')}</label>
            <div style={styles.checkboxGroup}>
              {['ko', 'en', 'ja', 'zh'].map((langCode) => (
                <label key={langCode} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={preferences.languages.includes(langCode)}
                    onChange={(e) => {
                      setPreferences({
                        ...preferences,
                        languages: e.target.checked
                          ? [...preferences.languages, langCode]
                          : preferences.languages.filter((l) => l !== langCode),
                      });
                    }}
                  />
                  <span>{langCode.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div style={styles.filterRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={preferences.wantInstantBooking}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    wantInstantBooking: e.target.checked,
                  })
                }
              />
              <span>{t('instantLabel')}</span>
            </label>
          </div>

          <div style={styles.filterRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={preferences.wantHMU}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    wantHMU: e.target.checked,
                  })
                }
              />
              <span>{t('hmuLabel')}</span>
            </label>
          </div>

          {/* Submit Button */}
          <button onClick={handleRecommend} style={styles.submitBtn}>
            {t('submitBtn')}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={styles.resultsContainer}>
          {results.length > 0 ? (
            results.map((p, idx) => (
              <div key={p.id} style={styles.resultCard}>
                {/* AI Badge */}
                <div style={styles.aiBadge}>{t('aiRecommended')}</div>

                {/* Photographer Avatar & Name */}
                <div style={styles.photographerInfo}>
                  {p.img && (
                    <div
                      style={{
                        ...styles.avatar,
                        backgroundImage: `url(${p.img})`,
                      }}
                    />
                  )}
                  <div style={styles.infoText}>
                    <h3 style={styles.photographerName}>{p.name}</h3>
                    {p.location && (
                      <p style={styles.location}>📍 {p.location}</p>
                    )}
                  </div>
                </div>

                {/* Match Score Bar */}
                <div style={styles.scoreSection}>
                  <div style={styles.scoreLabel}>
                    <span>{t('matchScore')}</span>
                    <span style={styles.scoreNumber}>
                      {p.personalizedScore || p.matchData.score}%
                    </span>
                  </div>
                  <div style={styles.scoreBar}>
                    <div
                      style={{
                        ...styles.scoreBarFill,
                        width: `${p.personalizedScore || p.matchData.score}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Match Reasons */}
                <div style={styles.reasonsSection}>
                  <p style={styles.reasonsLabel}>{t('matchReason')}</p>
                  <div style={styles.reasonChips}>
                    {(p.matchData.matchReasons || []).slice(0, 3).map((reason, i) => (
                      <span key={i} style={styles.reasonChip}>
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={styles.noResults}>{t('noResults')}</div>
          )}
        </div>
      )}

      {/* Unauthenticated CTA */}
      {!user && results && (
        <div style={styles.loginCTAContainer}>
          <p style={styles.loginCTAText}>{t('loginCTA')}</p>
          <button onClick={onAuthOpen} style={styles.loginBtn}>
            {t('loginBtn')}
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg2)',
    padding: '32px 24px',
    marginBottom: '32px',
    borderRadius: 0,
  },
  header: {
    marginBottom: '24px',
  },
  label: {
    fontSize: 10,
    letterSpacing: '0.2em',
    color: 'var(--gold)',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-serif)',
    display: 'block',
    marginBottom: 8,
  },
  title: {
    fontSize: 'clamp(16px, 2vw, 22px)',
    fontFamily: 'var(--font-serif)',
    color: 'var(--text)',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--muted)',
    margin: 0,
    fontFamily: 'var(--font-sans)',
  },
  toggleBtn: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text)',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s',
    marginBottom: '16px',
  },
  filterPanel: {
    borderTop: '1px solid var(--border)',
    paddingTop: '20px',
    marginBottom: '24px',
    animation: 'slideDown 0.3s ease',
  },
  filterRow: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
  },
  select: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    borderRadius: 0,
    cursor: 'pointer',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    borderRadius: 0,
  },
  budgetRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  pillContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    padding: '6px 12px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    borderRadius: 20,
    transition: 'all 0.2s',
  },
  checkboxGroup: {
    display: 'flex',
    gap: 16,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'var(--gold)',
    color: '#0B0B0B',
    border: 'none',
    fontSize: 13,
    fontFamily: 'var(--font-serif)',
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '0.05em',
    transition: 'all 0.2s',
    marginTop: '16px',
  },
  resultsContainer: {
    display: 'grid',
    gap: 16,
    marginTop: '24px',
  },
  resultCard: {
    position: 'relative',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    padding: '20px',
    transition: 'border-color 0.2s',
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'var(--gold)',
    color: '#0B0B0B',
    fontSize: 9,
    fontFamily: 'var(--font-serif)',
    padding: '4px 8px',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  photographerInfo: {
    display: 'flex',
    gap: 12,
    marginBottom: '16px',
    paddingRight: '100px',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '1px solid var(--border)',
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
  },
  photographerName: {
    margin: '0 0 4px 0',
    fontSize: 14,
    fontFamily: 'var(--font-serif)',
    color: 'var(--text)',
    fontWeight: 600,
  },
  location: {
    margin: 0,
    fontSize: 11,
    color: 'var(--muted)',
    fontFamily: 'var(--font-sans)',
  },
  scoreSection: {
    marginBottom: '16px',
  },
  scoreLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: '6px',
    fontFamily: 'var(--font-sans)',
  },
  scoreNumber: {
    color: 'var(--gold)',
    fontWeight: 600,
  },
  scoreBar: {
    height: 4,
    backgroundColor: 'var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: 'var(--gold)',
    transition: 'width 0.6s ease-out',
  },
  reasonsSection: {
    marginTop: '12px',
  },
  reasonsLabel: {
    fontSize: 10,
    color: 'var(--muted)',
    margin: '0 0 8px 0',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  reasonChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonChip: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: 'rgba(232, 160, 32, 0.08)',
    color: 'var(--gold)',
    fontSize: 10,
    fontFamily: 'var(--font-sans)',
    borderRadius: 2,
    whiteSpace: 'nowrap',
  },
  noResults: {
    textAlign: 'center',
    padding: '32px 16px',
    color: 'var(--muted)',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
  },
  loginCTAContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px',
    backgroundColor: 'rgba(232, 160, 32, 0.05)',
    border: '1px solid rgba(232, 160, 32, 0.15)',
    marginTop: '16px',
  },
  loginCTAText: {
    flex: 1,
    margin: 0,
    fontSize: 12,
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
  },
  loginBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--gold)',
    color: '#0B0B0B',
    border: 'none',
    fontSize: 11,
    fontFamily: 'var(--font-serif)',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
};

export default MatchingRecommendation;
