/**
 * Review Sentiment Analysis - Keyword-based NLP (4 languages)
 * Phosnap Platform - No external API required
 *
 * Supported Languages: Korean (ko), English (en), Japanese (ja), Chinese (zh)
 * Dictionary-based approach with strength category extraction
 */

// Positive keyword dictionaries (4 languages)
const POSITIVE_KEYWORDS = {
  ko: [
    '친절',
    '소통',
    '결과물',
    '만족',
    '추천',
    '최고',
    '예쁘',
    '자연스러',
    '빠르',
    '꼼꼼',
    '편안',
    '전문',
    '감동',
    '센스',
    '배려',
    '따뜻',
    '아름다',
    '깔끔',
    '완벽',
    '재미',
    '좋아',
    '훌륭',
    '멋진',
    '신뢰',
    '성실',
  ],
  en: [
    'kind',
    'professional',
    'beautiful',
    'natural',
    'recommend',
    'amazing',
    'comfortable',
    'talented',
    'creative',
    'satisfied',
    'wonderful',
    'gorgeous',
    'friendly',
    'detail',
    'excellent',
    'perfect',
    'fun',
    'relaxed',
    'responsive',
    'quality',
    'great',
    'fantastic',
    'love',
    'awesome',
    'trust',
  ],
  ja: [
    '親切',
    '素敵',
    '自然',
    '満足',
    'おすすめ',
    '最高',
    '綺麗',
    'プロ',
    '丁寧',
    '安心',
    '感動',
    'センス',
    '優しい',
    '楽しい',
    '美しい',
    '完璧',
    '上手',
    '素晴らしい',
    'きれい',
    '快適',
    'すばらしい',
    '好き',
    '信頼',
    '良い',
    '素晴',
  ],
  zh: [
    '专业',
    '自然',
    '满意',
    '推荐',
    '漂亮',
    '温柔',
    '细心',
    '完美',
    '舒适',
    '感动',
    '耐心',
    '美丽',
    '认真',
    '贴心',
    '优秀',
    '放松',
    '创意',
    '精致',
    '大方',
    '出色',
    '很好',
    '喜欢',
    '信任',
    '太棒',
    '高兴',
  ],
};

// Negative keyword dictionaries (4 languages)
const NEGATIVE_KEYWORDS = {
  ko: [
    '불친절',
    '늦',
    '지각',
    '불만',
    '실망',
    '비싸',
    '후회',
    '불편',
    '소통불가',
    '무성의',
    '별로',
    '나쁘',
    '짜증',
    '실망',
    '부족',
    '서툴',
    '불만족',
    '거칠',
    '대충',
  ],
  en: [
    'late',
    'rude',
    'expensive',
    'disappointing',
    'unprofessional',
    'poor',
    'regret',
    'uncomfortable',
    'slow',
    'careless',
    'bad',
    'terrible',
    'awful',
    'dislike',
    'unhappy',
    'frustrated',
    'annoyed',
    'rough',
    'sloppy',
  ],
  ja: [
    '遅い',
    '不満',
    '高い',
    '残念',
    '失礼',
    '不快',
    '後悔',
    '雑',
    '態度悪',
    '期待外れ',
    '悪い',
    '下手',
    '嫌',
    '不安',
    '不親切',
  ],
  zh: [
    '迟到',
    '不满',
    '贵',
    '失望',
    '差',
    '不专业',
    '后悔',
    '不舒服',
    '态度差',
    '粗心',
    '糟糕',
    '讨厌',
    '不愉快',
    '麻烦',
    '不好',
  ],
};

// Strength categories and associated keywords by language
const STRENGTH_CATEGORIES = {
  ko: {
    '친절한 소통': ['친절', '소통', '배려', '따뜻', '편안', '신뢰', '성실'],
    '전문적인 촬영': ['전문', '꼼꼼', '센스', '결과물', '훌륭', '멋진', '훌'],
    '자연스러운 포즈': ['자연스러', '편안', '재미', '편함', '편한'],
    '뛰어난 결과물': ['예쁘', '아름다', '깔끔', '완벽', '감동', '좋아'],
    '높은 만족도': ['만족', '추천', '최고', '좋아', '훌륭'],
  },
  en: {
    'Great Communication': ['kind', 'friendly', 'responsive', 'comfortable', 'trust', 'caring'],
    'Professional Quality': [
      'professional',
      'detail',
      'excellent',
      'quality',
      'talented',
      'skilled',
    ],
    'Natural Posing': ['natural', 'relaxed', 'fun', 'comfortable', 'easy'],
    'Beautiful Results': [
      'beautiful',
      'gorgeous',
      'wonderful',
      'perfect',
      'amazing',
      'stunning',
    ],
    'Highly Recommended': [
      'satisfied',
      'recommend',
      'creative',
      'impressed',
      'fantastic',
    ],
  },
  ja: {
    '親切な対応': ['親切', '丁寧', '優しい', '安心', '信頼', 'やさしい'],
    'プロフェッショナル': ['プロ', '素敵', '上手', '高い', 'スキル'],
    '自然なポーズ': ['自然', '楽しい', '快適', 'リラックス'],
    '美しい結果': ['綺麗', '美しい', '素晴らしい', '完璧', 'きれい'],
    '高い満足度': ['満足', 'おすすめ', '最高', '素晴らしい'],
  },
  zh: {
    '亲切的沟通': ['专业', '细心', '温柔', '耐心', '贴心', '亲切'],
    '专业的拍摄': ['专业', '认真', '优秀', '高素质', '能力强'],
    '自然的姿态': ['自然', '放松', '舒适', '自在'],
    '美丽的成果': ['漂亮', '美丽', '精致', '完美', '出色'],
    '高度满意': ['满意', '推荐', '很好', '高兴', '喜欢'],
  },
};

/**
 * Analyze sentiment of a review text
 * @param {string} text - Review text to analyze
 * @param {string} lang - Language code (ko, en, ja, zh) default: ko
 * @returns {Object} Sentiment analysis result
 * @returns {number} score - Sentiment score (-1 to 1, negative to positive)
 * @returns {number} positiveCount - Number of positive keywords found
 * @returns {number} negativeCount - Number of negative keywords found
 * @returns {string[]} positiveKeywords - Found positive keywords
 * @returns {string[]} negativeKeywords - Found negative keywords
 * @returns {boolean} isPositive - Whether overall sentiment is positive
 */
export function analyzeReviewSentiment(text, lang = 'ko') {
  if (!text || typeof text !== 'string') {
    return {
      score: 0,
      positiveCount: 0,
      negativeCount: 0,
      positiveKeywords: [],
      negativeKeywords: [],
      isPositive: null,
    };
  }

  const lowerText = text.toLowerCase();
  const positiveKeywords = POSITIVE_KEYWORDS[lang] || POSITIVE_KEYWORDS.en;
  const negativeKeywords = NEGATIVE_KEYWORDS[lang] || NEGATIVE_KEYWORDS.en;

  // Find matching keywords
  const foundPositive = [];
  const foundNegative = [];

  positiveKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundPositive.push(keyword);
    }
  });

  negativeKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundNegative.push(keyword);
    }
  });

  const positiveCount = foundPositive.length;
  const negativeCount = foundNegative.length;

  // Calculate sentiment score (-1 to 1)
  const total = positiveCount + negativeCount;
  let score = 0;

  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
  }

  const isPositive = positiveCount > negativeCount;

  return {
    score: Math.round(score * 100) / 100,
    positiveCount,
    negativeCount,
    positiveKeywords: foundPositive,
    negativeKeywords: foundNegative,
    isPositive,
  };
}

/**
 * Extract strength tags from an array of reviews
 * @param {string[]} reviews - Array of review texts
 * @param {string} lang - Language code (ko, en, ja, zh) default: ko
 * @param {number} limit - Maximum number of tags to return default: 5
 * @returns {Object[]} Top strength categories with frequencies
 * @returns {string} tag - Strength category name
 * @returns {number} count - Number of reviews mentioning this strength
 * @returns {number} percentage - Percentage of reviews mentioning this strength
 */
export function extractStrengthTags(reviews, lang = 'ko', limit = 5) {
  const categories = STRENGTH_CATEGORIES[lang] || STRENGTH_CATEGORIES.en;
  const strengths = {};

  // Initialize strength counts
  Object.keys(categories).forEach((category) => {
    strengths[category] = 0;
  });

  // Count occurrences (each category counted once per review)
  reviews.forEach((review) => {
    const lowerReview = review.toLowerCase();
    Object.entries(categories).forEach(([category, keywords]) => {
      const matched = keywords.some((keyword) => lowerReview.includes(keyword.toLowerCase()));
      if (matched) {
        strengths[category]++;
      }
    });
  });

  // Calculate percentages and sort
  const strengthArray = Object.entries(strengths)
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return strengthArray;
}

/**
 * Get a comprehensive summary of reviews
 * @param {string[]} reviews - Array of review texts
 * @param {string} lang - Language code (ko, en, ja, zh) default: ko
 * @returns {Object} Review summary
 * @returns {number} overallSentiment - Average sentiment score (-1 to 1)
 * @returns {Object[]} topStrengths - Top strength categories
 * @returns {string[]} topKeywords - Most frequently mentioned positive keywords
 * @returns {number} positiveRatio - Percentage of positive reviews
 */
export function getReviewSummary(reviews, lang = 'ko') {
  if (!reviews || reviews.length === 0) {
    return {
      overallSentiment: 0,
      topStrengths: [],
      topKeywords: [],
      positiveRatio: 0,
      totalReviews: 0,
    };
  }

  // Analyze all reviews
  const sentiments = reviews.map((review) => analyzeReviewSentiment(review, lang));

  // Calculate overall sentiment
  const overallSentiment =
    sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

  // Count positive reviews
  const positiveCount = sentiments.filter((s) => s.isPositive).length;
  const positiveRatio = (positiveCount / reviews.length) * 100;

  // Get top strengths
  const topStrengths = extractStrengthTags(reviews, lang, 5);

  // Get top keywords
  const keywordCounts = {};
  const positiveKeywords = POSITIVE_KEYWORDS[lang] || POSITIVE_KEYWORDS.en;

  reviews.forEach((review) => {
    const lowerReview = review.toLowerCase();
    positiveKeywords.forEach((keyword) => {
      if (lowerReview.includes(keyword.toLowerCase())) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    });
  });

  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword]) => keyword);

  return {
    overallSentiment: Math.round(overallSentiment * 100) / 100,
    topStrengths,
    topKeywords,
    positiveRatio: Math.round(positiveRatio),
    totalReviews: reviews.length,
  };
}

/**
 * Generate a keyword cloud for visualization
 * @param {string[]} reviews - Array of review texts
 * @param {string} lang - Language code (ko, en, ja, zh) default: ko
 * @returns {Object[]} Keywords with frequencies and sentiment
 * @returns {string} word - The keyword
 * @returns {number} count - Frequency in reviews
 * @returns {string} sentiment - Sentiment type (positive or negative)
 */
export function getKeywordCloud(reviews, lang = 'ko') {
  const positiveKeywords = POSITIVE_KEYWORDS[lang] || POSITIVE_KEYWORDS.en;
  const negativeKeywords = NEGATIVE_KEYWORDS[lang] || NEGATIVE_KEYWORDS.en;
  const wordCounts = {};

  reviews.forEach((review) => {
    const lowerReview = review.toLowerCase();

    positiveKeywords.forEach((keyword) => {
      if (lowerReview.includes(keyword.toLowerCase())) {
        if (!wordCounts[keyword]) {
          wordCounts[keyword] = { count: 0, sentiment: 'positive' };
        }
        wordCounts[keyword].count++;
      }
    });

    negativeKeywords.forEach((keyword) => {
      if (lowerReview.includes(keyword.toLowerCase())) {
        if (!wordCounts[keyword]) {
          wordCounts[keyword] = { count: 0, sentiment: 'negative' };
        }
        wordCounts[keyword].count++;
      }
    });
  });

  return Object.entries(wordCounts)
    .map(([word, data]) => ({
      word,
      count: data.count,
      sentiment: data.sentiment,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get supported languages
 * @returns {string[]} Array of supported language codes
 */
export function getSupportedLanguages() {
  return ['ko', 'en', 'ja', 'zh'];
}

/**
 * Check if a language is supported
 * @param {string} lang - Language code to check
 * @returns {boolean} Whether language is supported
 */
export function isLanguageSupported(lang) {
  return getSupportedLanguages().includes(lang);
}
