import { useMemo } from 'react';
import { calculateTrustScore, getTrustDisplay } from '../lib/trustScore';
import { useLanguage } from '../contexts/LanguageContext';

const TrustBadge = ({ photographer, size = 'small', showDetails = false }) => {
  const { lang } = useLanguage();

  // Generate mock stats from photographer data
  const stats = useMemo(() => {
    const avgRating = photographer.rating || 4.5;
    const totalBookings = (photographer.reviews || 0) * 3;
    const completedBookings = Math.round(totalBookings * 0.92);
    const totalMessagesReceived = totalBookings * 5;
    const messagesResponded = Math.round(totalMessagesReceived * 0.88);
    const cancelledBookings = Math.round(totalBookings * 0.05);
    const joinedDate = new Date();
    joinedDate.setMonth(joinedDate.getMonth() - 12); // 12 months ago default

    return {
      avgRating,
      totalBookings,
      completedBookings,
      totalMessagesReceived,
      messagesResponded,
      cancelledBookings,
      joinedDate,
    };
  }, [photographer]);

  // Calculate trust score
  const trustData = useMemo(
    () => calculateTrustScore(photographer, stats),
    [photographer, stats]
  );

  const display = getTrustDisplay(trustData.score);

  // Text translations
  const textMap = {
    ko: {
      verifiedPhotographer: '인증 작가',
      trustBreakdown: '신뢰도 분석',
      ratingScore: '평점',
      completionRate: '완료율',
      responseRate: '응답률',
      cancelInverse: '신뢰성',
      activity: '활동기간',
      platinum: '플래티넘',
      gold: '골드',
      silver: '실버',
      bronze: '브론즈',
      out: '만점',
    },
    en: {
      verifiedPhotographer: 'Verified Photographer',
      trustBreakdown: 'Trust Breakdown',
      ratingScore: 'Rating',
      completionRate: 'Completion',
      responseRate: 'Response Rate',
      cancelInverse: 'Reliability',
      activity: 'Activity',
      platinum: 'Platinum',
      gold: 'Gold',
      silver: 'Silver',
      bronze: 'Bronze',
      out: 'pts',
    },
    ja: {
      verifiedPhotographer: '認証済みフォトグラファー',
      trustBreakdown: '信頼スコア分析',
      ratingScore: '評価',
      completionRate: '完了率',
      responseRate: '応答率',
      cancelInverse: '信頼性',
      activity: 'アクティビティ',
      platinum: 'プラチナ',
      gold: 'ゴールド',
      silver: 'シルバー',
      bronze: 'ブロンズ',
      out: 'ポイント',
    },
    zh: {
      verifiedPhotographer: '认证摄影师',
      trustBreakdown: '信任分析',
      ratingScore: '评分',
      completionRate: '完成率',
      responseRate: '应答率',
      cancelInverse: '可靠性',
      activity: '活动',
      platinum: '白金',
      gold: '黄金',
      silver: '白银',
      bronze: '青铜',
      out: '分',
    },
  };

  const t = (key) => textMap[lang]?.[key] || textMap.en[key];

  // Render small badge (card view)
  if (size === 'small') {
    const filledDots = display.filledDots;
    return (
      <div style={styles.smallContainer}>
        <div style={styles.dots}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.dot,
                color: i < filledDots ? 'var(--gold)' : 'var(--muted)',
              }}
            >
              ●
            </span>
          ))}
        </div>
        <span style={styles.smallScore}>{trustData.score}</span>
      </div>
    );
  }

  // Render medium badge (with certification)
  if (size === 'medium') {
    const filledDots = display.filledDots;
    return (
      <div style={styles.mediumContainer}>
        <div style={styles.dotsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.dot,
                color: i < filledDots ? 'var(--gold)' : 'var(--muted)',
              }}
            >
              ●
            </span>
          ))}
        </div>

        {trustData.isVerified && (
          <div style={styles.verifiedBadge}>
            <span style={styles.verifiedIcon}>✓</span>
            <span style={styles.verifiedText}>{t('verifiedPhotographer')}</span>
          </div>
        )}

        <p style={styles.levelLabel}>{display.label}</p>
      </div>
    );
  }

  // Render large badge (profile with full breakdown)
  return (
    <div style={styles.largeContainer}>
      {/* Header */}
      <div style={styles.largeHeader}>
        <div>
          <h3 style={styles.largeTitle}>{t('trustBreakdown')}</h3>
          <p style={styles.largeScore}>
            {trustData.score}
            <span style={styles.largeOut}>/100</span>
          </p>
        </div>
        <div style={styles.levelBadge}>
          <span style={styles.levelEmoji}>{display.badge}</span>
          <p style={styles.levelName}>{display.label}</p>
        </div>
      </div>

      {/* Breakdown Chart */}
      <div style={styles.breakdownGrid}>
        {/* Rating */}
        <div style={styles.breakdownItem}>
          <p style={styles.breakdownLabel}>{t('ratingScore')}</p>
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.breakdownBar,
                width: `${Math.min((trustData.breakdown.rating / 30) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={styles.breakdownValue}>
            {trustData.breakdown.rating.toFixed(1)}/30
          </p>
        </div>

        {/* Completion Rate */}
        <div style={styles.breakdownItem}>
          <p style={styles.breakdownLabel}>{t('completionRate')}</p>
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.breakdownBar,
                width: `${Math.min((trustData.breakdown.completion / 25) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={styles.breakdownValue}>
            {trustData.breakdown.completion.toFixed(1)}/25
          </p>
        </div>

        {/* Response Rate */}
        <div style={styles.breakdownItem}>
          <p style={styles.breakdownLabel}>{t('responseRate')}</p>
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.breakdownBar,
                width: `${Math.min((trustData.breakdown.response / 20) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={styles.breakdownValue}>
            {trustData.breakdown.response.toFixed(1)}/20
          </p>
        </div>

        {/* Cancel Inverse */}
        <div style={styles.breakdownItem}>
          <p style={styles.breakdownLabel}>{t('cancelInverse')}</p>
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.breakdownBar,
                width: `${Math.min((trustData.breakdown.cancelInverse / 15) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={styles.breakdownValue}>
            {trustData.breakdown.cancelInverse.toFixed(1)}/15
          </p>
        </div>

        {/* Activity */}
        <div style={styles.breakdownItem}>
          <p style={styles.breakdownLabel}>{t('activity')}</p>
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.breakdownBar,
                width: `${Math.min((trustData.breakdown.activity / 10) * 100, 100)}%`,
              }}
            />
          </div>
          <p style={styles.breakdownValue}>
            {trustData.breakdown.activity.toFixed(1)}/10
          </p>
        </div>
      </div>

      {/* Platinum Shimmer Animation for high scores */}
      {trustData.isVerified && (
        <style>{`
          @keyframes platinum-shimmer {
            0%, 100% { text-shadow: 0 0 0 transparent; }
            50% { text-shadow: 0 0 8px rgba(232, 160, 32, 0.6); }
          }
          .platinum-shimmer {
            animation: platinum-shimmer 2s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
};

const styles = {
  smallContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dots: {
    display: 'flex',
    gap: 2,
  },
  dot: {
    fontSize: 10,
    lineHeight: 1,
  },
  smallScore: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    minWidth: 20,
  },

  // Medium
  mediumContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dotsRow: {
    display: 'flex',
    gap: 3,
  },
  verifiedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--gold)',
    color: '#0B0B0B',
    padding: '4px 8px',
    borderRadius: 2,
  },
  verifiedIcon: {
    fontSize: 10,
    fontWeight: 700,
  },
  verifiedText: {
    fontSize: 9,
    fontFamily: 'var(--font-serif)',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  levelLabel: {
    margin: 0,
    fontSize: 10,
    color: 'var(--muted)',
    fontFamily: 'var(--font-sans)',
  },

  // Large
  largeContainer: {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg2)',
    padding: '24px',
    borderRadius: 0,
  },
  largeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border)',
  },
  largeTitle: {
    margin: '0 0 8px 0',
    fontSize: 14,
    fontFamily: 'var(--font-serif)',
    color: 'var(--text)',
    fontWeight: 600,
  },
  largeScore: {
    margin: 0,
    fontSize: 32,
    fontFamily: 'var(--font-serif)',
    color: 'var(--gold)',
    fontWeight: 700,
  },
  largeOut: {
    fontSize: 14,
    color: 'var(--muted)',
    marginLeft: 4,
  },
  levelBadge: {
    textAlign: 'center',
  },
  levelEmoji: {
    fontSize: 32,
    display: 'block',
    marginBottom: 4,
  },
  levelName: {
    margin: 0,
    fontSize: 11,
    fontFamily: 'var(--font-serif)',
    color: 'var(--text)',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  breakdownLabel: {
    margin: 0,
    fontSize: 10,
    fontFamily: 'var(--font-sans)',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  barContainer: {
    height: 4,
    backgroundColor: 'var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: 'var(--gold)',
    transition: 'width 0.6s ease-out',
  },
  breakdownValue: {
    margin: 0,
    fontSize: 11,
    fontFamily: 'var(--font-sans)',
    color: 'var(--text)',
    fontWeight: 600,
  },
};

export default TrustBadge;
