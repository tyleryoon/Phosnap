import { useMemo } from 'react';
import { extractStrengthTags, getReviewSummary, getKeywordCloud } from '../lib/sentimentAnalysis';
import { useLanguage } from '../contexts/LanguageContext';

const SentimentTags = ({ reviews = [], compact = false }) => {
  const { lang } = useLanguage();

  // Extract review texts
  const reviewTexts = useMemo(() => {
    return reviews.map((r) => r.textI18n?.[lang] || r.text || '');
  }, [reviews, lang]);

  // Analyze sentiment
  const summary = useMemo(
    () => getReviewSummary(reviewTexts, lang),
    [reviewTexts, lang]
  );

  const strengthTags = useMemo(
    () => extractStrengthTags(reviewTexts, lang, 5),
    [reviewTexts, lang]
  );

  const keywordCloud = useMemo(
    () => getKeywordCloud(reviewTexts, lang),
    [reviewTexts, lang]
  );

  // Text translations
  const textMap = {
    ko: {
      strengths: '이 작가의 강점',
      keywords: '고객들이 가장 많이 언급한 키워드',
      sentiment: '전체 감성 분석',
      noReviews: '아직 리뷰가 없습니다',
      positive: '긍정적',
      negative: '부정적',
    },
    en: {
      strengths: 'Photographer Strengths',
      keywords: 'Most Mentioned Keywords',
      sentiment: 'Overall Sentiment',
      noReviews: 'No reviews yet',
      positive: 'Positive',
      negative: 'Negative',
    },
    ja: {
      strengths: 'カメラマンの強み',
      keywords: '最も多くのキーワード',
      sentiment: '全体的な感性',
      noReviews: 'まだレビューがありません',
      positive: 'ポジティブ',
      negative: 'ネガティブ',
    },
    zh: {
      strengths: '摄影师优势',
      keywords: '最常提及的关键词',
      sentiment: '整体情感',
      noReviews: '尚无评论',
      positive: '正面',
      negative: '负面',
    },
  };

  const t = (key) => textMap[lang]?.[key] || textMap.en[key];

  if (reviewTexts.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>{t('noReviews')}</p>
      </div>
    );
  }

  // Compact mode: just top 3 tags
  if (compact) {
    const topTags = strengthTags.slice(0, 3);
    return (
      <div style={styles.compactContainer}>
        <div style={styles.compactChips}>
          {topTags.map((item, i) => (
            <span key={i} style={styles.compactChip}>
              {item.tag}
              <span style={styles.compactCount}>({item.count})</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Full mode: all sections with animation
  const positiveRatio = summary.positiveRatio;
  const topKeywords = keywordCloud.slice(0, 10);
  const maxKeywordCount = Math.max(...topKeywords.map((k) => k.count), 1);

  return (
    <div style={styles.fullContainer}>
      {/* Section 1: Strengths */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('strengths')}</h3>
        <div style={styles.strengthPills}>
          {strengthTags.map((item, i) => {
            const percentage = item.percentage / 100;
            const goldHue = 40;
            const greenHue = 120;
            const hue = goldHue + (greenHue - goldHue) * percentage;

            return (
              <div
                key={i}
                style={{
                  ...styles.strengthPill,
                  background: `linear-gradient(135deg, hsl(${hue}, 100%, 50%) 0%, hsl(${hue}, 80%, 45%) 100%)`,
                }}
              >
                <span style={styles.strengthTag}>{item.tag}</span>
                <span style={styles.strengthCount}>({item.count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Keyword Cloud */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('keywords')}</h3>
        <div style={styles.wordCloud}>
          {topKeywords.map((item, i) => {
            const sizeRatio = item.count / maxKeywordCount;
            const baseFontSize = 11;
            const fontSize = baseFontSize + sizeRatio * 8;
            const color = item.sentiment === 'positive' ? 'var(--gold)' : '#E74C3C';
            const opacity = 0.5 + sizeRatio * 0.5;

            return (
              <span
                key={i}
                style={{
                  ...styles.wordCloudItem,
                  fontSize: `${fontSize}px`,
                  color,
                  opacity,
                }}
              >
                {item.word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Section 3: Sentiment Meter */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t('sentiment')}</h3>
        <div style={styles.sentimentMeterContainer}>
          {/* Color bar from red to green */}
          <div style={styles.sentimentBar}>
            {/* Red section */}
            <div
              style={{
                ...styles.sentimentSegment,
                flex: 1,
                background: 'linear-gradient(to right, #E74C3C, #F39C12)',
              }}
            />
            {/* Yellow section */}
            <div
              style={{
                ...styles.sentimentSegment,
                flex: 1,
                background: 'linear-gradient(to right, #F39C12, #F1C40F)',
              }}
            />
            {/* Green section */}
            <div
              style={{
                ...styles.sentimentSegment,
                flex: 1,
                background: 'linear-gradient(to right, #F1C40F, #2ECC71)',
              }}
            />
          </div>

          {/* Needle */}
          <div
            style={{
              ...styles.sentimentNeedle,
              left: `${positiveRatio}%`,
            }}
          />

          {/* Labels */}
          <div style={styles.sentimentLabels}>
            <span style={styles.sentimentLabel}>{t('negative')}</span>
            <span style={styles.sentimentLabel}>{positiveRatio}%</span>
            <span style={styles.sentimentLabel}>{t('positive')}</span>
          </div>
        </div>

        {/* Summary text */}
        <p style={styles.sentimentSummary}>
          {lang === 'ko' && `고객 만족도: ${positiveRatio}% 긍정적 평가`}
          {lang === 'en' && `Customer Satisfaction: ${positiveRatio}% Positive Reviews`}
          {lang === 'ja' && `顧客満足度: ${positiveRatio}%の肯定的な評価`}
          {lang === 'zh' && `客户满意度: ${positiveRatio}%正面评价`}
        </p>
      </div>
    </div>
  );
};

const styles = {
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center',
    backgroundColor: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 0,
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: 'var(--muted)',
    fontFamily: 'var(--font-sans)',
  },

  // Compact
  compactContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChip: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: 'rgba(232, 160, 32, 0.1)',
    border: '1px solid rgba(232, 160, 32, 0.2)',
    color: 'var(--gold)',
    fontSize: 11,
    fontFamily: 'var(--font-sans)',
    borderRadius: 16,
    whiteSpace: 'nowrap',
  },
  compactCount: {
    marginLeft: 4,
    opacity: 0.8,
    fontSize: 10,
  },

  // Full mode
  fullContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    animation: 'fadeIn 0.5s ease-in',
  },

  section: {
    borderBottom: '1px solid var(--border)',
    paddingBottom: '24px',
  },

  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 12,
    fontFamily: 'var(--font-serif)',
    color: 'var(--text)',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },

  // Strengths Pills
  strengthPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  strengthPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 20,
    color: '#0B0B0B',
    fontSize: 11,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  strengthTag: {
    display: 'inline-block',
  },
  strengthCount: {
    opacity: 0.8,
    fontSize: 10,
  },

  // Keyword Cloud
  wordCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px 16px',
    padding: '16px 0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordCloudItem: {
    fontFamily: 'var(--font-serif)',
    fontWeight: 500,
    letterSpacing: '0.02em',
    transition: 'all 0.2s',
    cursor: 'default',
  },

  // Sentiment Meter
  sentimentMeterContainer: {
    position: 'relative',
    padding: '24px 0',
  },
  sentimentBar: {
    display: 'flex',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: '32px',
    border: '1px solid var(--border)',
  },
  sentimentSegment: {
    flex: 1,
  },
  sentimentNeedle: {
    position: 'absolute',
    top: 12,
    width: 2,
    height: 20,
    backgroundColor: 'var(--text)',
    transform: 'translateX(-50%)',
    transition: 'left 0.8s ease-out',
  },
  sentimentLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '12px',
    fontSize: 10,
    color: 'var(--muted)',
    fontFamily: 'var(--font-sans)',
  },
  sentimentLabel: {
    flex: 1,
    textAlign: 'center',
  },
  sentimentSummary: {
    margin: '16px 0 0 0',
    fontSize: 12,
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    textAlign: 'center',
  },
};

// Add global animation
const globalStyle = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject global animation
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = globalStyle;
  document.head.appendChild(styleTag);
}

export default SentimentTags;
