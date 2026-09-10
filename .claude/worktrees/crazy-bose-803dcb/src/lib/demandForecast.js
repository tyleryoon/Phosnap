/**
 * 동적 수요 예측 (기본 버전)
 * Analyzes booking data patterns to predict demand
 */

// Season definitions for photography (Northern hemisphere, Korea-centric)
const PEAK_SEASONS = {
  spring: { months: [3, 4, 5], label: '봄 시즌', multiplier: 1.4 },
  autumn: { months: [9, 10, 11], label: '가을 시즌', multiplier: 1.5 },
  cherry: { months: [4], weeks: [1, 2], label: '벚꽃 시즌', multiplier: 1.8 },
  wedding: { months: [5, 6, 9, 10], label: '웨딩 시즌', multiplier: 1.6 },
};

// Day weights: Sunday=1.3 (weekend), Mon-Thu=low, Fri-Sat=high
const DAY_WEIGHTS = { 0: 1.3, 1: 0.6, 2: 0.6, 3: 0.7, 4: 0.8, 5: 1.4, 6: 1.5 };

/**
 * Analyzes booking patterns from historical data
 * @param {Array} bookings - Array of booking objects with date and price
 * @returns {Object} Pattern analysis with trends and distributions
 */
export function analyzeBookingPatterns(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return {
      monthlyTrend: [],
      weekdayDistribution: Array.from({ length: 7 }, (_, i) => ({ day: i, count: 0 })),
      peakDates: [],
      seasonalMultipliers: {},
    };
  }

  // Monthly trend
  const monthlyMap = new Map();
  const weekdayMap = new Map();

  bookings.forEach((booking) => {
    const date = new Date(booking.date || booking.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const weekday = date.getDay();

    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
    weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1);
  });

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort()
    .map(([month, count]) => {
      const monthBookings = bookings.filter(
        (b) => {
          const d = new Date(b.date || b.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
        }
      );
      const avgPrice = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0) / monthBookings.length || 0;
      return { month, count, avgPrice };
    });

  const weekdayDistribution = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
    count: weekdayMap.get(i) || 0,
  }));

  // Peak dates (top 10 dates by booking count)
  const dateMap = new Map();
  bookings.forEach((booking) => {
    const dateStr = new Date(booking.date || booking.createdAt).toISOString().split('T')[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
  });
  const peakDates = Array.from(dateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([date, count]) => ({ date, count }));

  // Calculate seasonal multipliers
  const seasonalMultipliers = {};
  Object.entries(PEAK_SEASONS).forEach(([season, config]) => {
    const seasonBookings = bookings.filter((b) => {
      const d = new Date(b.date || b.createdAt);
      return config.months.includes(d.getMonth() + 1);
    }).length;
    seasonalMultipliers[season] = seasonBookings > 0 ? config.multiplier : 1;
  });

  return { monthlyTrend, weekdayDistribution, peakDates, seasonalMultipliers };
}

/**
 * Predicts monthly demand for a target month
 * @param {Array} bookings - Historical booking data
 * @param {number} targetMonth - Target month (1-12)
 * @param {number} targetYear - Target year
 * @returns {Object} Demand prediction with confidence level
 */
export function predictMonthlyDemand(bookings, targetMonth, targetYear) {
  if (!Array.isArray(bookings) || bookings.length < 3) {
    return {
      predictedBookings: 0,
      confidence: 'low',
      isPeakSeason: false,
      seasonLabel: 'Standard',
      priceRecommendation: 'maintain',
      demandLevel: 'low',
    };
  }

  // Calculate average bookings per month
  const monthlyData = analyzeBookingPatterns(bookings);
  const avgMonthly = monthlyData.monthlyTrend.length > 0
    ? monthlyData.monthlyTrend.reduce((sum, m) => sum + m.count, 0) / monthlyData.monthlyTrend.length
    : 0;

  // Check if target month is a peak season
  let isPeakSeason = false;
  let seasonLabel = 'Standard';
  let seasonMultiplier = 1;

  Object.entries(PEAK_SEASONS).forEach(([key, season]) => {
    if (season.months.includes(targetMonth)) {
      isPeakSeason = true;
      seasonLabel = season.label;
      seasonMultiplier = season.multiplier;
    }
  });

  const predictedBookings = Math.round(avgMonthly * seasonMultiplier);

  // Determine confidence based on data volume
  const confidence = bookings.length >= 24 ? 'high' : bookings.length >= 12 ? 'medium' : 'low';

  // Determine demand level
  let demandLevel = 'low';
  if (predictedBookings > avgMonthly * 1.5) demandLevel = 'very_high';
  else if (predictedBookings > avgMonthly * 1.2) demandLevel = 'high';
  else if (predictedBookings > avgMonthly * 0.8) demandLevel = 'medium';

  // Price recommendation
  let priceRecommendation = 'maintain';
  if (demandLevel === 'very_high') priceRecommendation = 'increase';
  else if (demandLevel === 'low') priceRecommendation = 'decrease';

  return {
    predictedBookings,
    confidence,
    isPeakSeason,
    seasonLabel,
    priceRecommendation,
    demandLevel,
  };
}

/**
 * Gets popularity indicator for customer-facing display
 * @param {Array} bookings - Historical booking data
 * @param {Date|string} targetDate - Target date to check
 * @returns {Object} Popularity level with localized messages
 */
export function getPopularityIndicator(bookings, targetDate) {
  const dateStr = new Date(targetDate).toISOString().split('T')[0];

  const dateMap = new Map();
  bookings.forEach((booking) => {
    const d = new Date(booking.date || booking.createdAt).toISOString().split('T')[0];
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  });

  const bookingCount = dateMap.get(dateStr) || 0;
  const avgDaily = bookings.length / 365;
  const ratio = avgDaily > 0 ? bookingCount / avgDaily : 0;

  let level = 1;
  if (ratio > 3) level = 5;
  else if (ratio > 2) level = 4;
  else if (ratio > 1.2) level = 3;
  else if (ratio > 0.5) level = 2;

  const messages = {
    1: {
      message_ko: '예약 가능 일정입니다',
      message_en: 'Available slot',
      message_ja: '空いている日程です',
      message_zh: '可预约日期',
    },
    2: {
      message_ko: '인기 일정입니다',
      message_en: 'Popular slot',
      message_ja: '人気の日程です',
      message_zh: '热门日期',
    },
    3: {
      message_ko: '매우 인기 있는 일정입니다',
      message_en: 'Very popular',
      message_ja: 'とても人気です',
      message_zh: '非常热门',
    },
    4: {
      message_ko: '거의 마감되는 일정입니다',
      message_en: 'Almost fully booked',
      message_ja: 'ほぼ満席です',
      message_zh: '即将满员',
    },
    5: {
      message_ko: '마감 임박! 서둘러 예약하세요',
      message_en: 'Almost sold out!',
      message_ja: 'まもなく満席です',
      message_zh: '即将售罄',
    },
  };

  return {
    level,
    ...messages[level],
    isPopular: level >= 3,
  };
}

/**
 * Generates forecast chart data for visualization
 * @param {Array} bookings - Historical booking data
 * @param {number} months - Number of months to forecast
 * @returns {Array} Chart data with actual and predicted values
 */
export function generateForecastChart(bookings, months = 6) {
  const monthlyData = analyzeBookingPatterns(bookings);
  const avgMonthly = monthlyData.monthlyTrend.reduce((sum, m) => sum + m.count, 0) / (monthlyData.monthlyTrend.length || 1);

  const now = new Date();
  const result = [];

  // Add historical data
  monthlyData.monthlyTrend.slice(-3).forEach((entry) => {
    result.push({
      month: entry.month,
      actual: entry.count,
      predicted: null,
      confidence: 1,
    });
  });

  // Generate forecasts
  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

    const prediction = predictMonthlyDemand(bookings, forecastDate.getMonth() + 1, forecastDate.getFullYear());

    result.push({
      month: monthStr,
      actual: null,
      predicted: prediction.predictedBookings,
      confidence: prediction.confidence === 'high' ? 1 : prediction.confidence === 'medium' ? 0.7 : 0.5,
    });
  }

  return result;
}

/**
 * Gets pricing recommendation based on demand forecast
 * @param {Array} bookings - Historical booking data
 * @param {number} currentPrice - Current price
 * @param {number} targetMonth - Target month for pricing
 * @returns {Object} Pricing recommendation with reasoning
 */
export function getPricingRecommendation(bookings, currentPrice, targetMonth) {
  const prediction = predictMonthlyDemand(bookings, targetMonth, new Date().getFullYear());

  let changePercent = 0;
  let recommendedPrice = currentPrice;
  let reason_ko = '현재 가격 유지';
  let reason_en = 'Maintain current price';

  if (prediction.demandLevel === 'very_high') {
    changePercent = 15;
    recommendedPrice = Math.round(currentPrice * 1.15);
    reason_ko = '수요가 매우 높습니다. 가격 인상을 권장합니다.';
    reason_en = 'Demand is very high. Price increase recommended.';
  } else if (prediction.demandLevel === 'high') {
    changePercent = 10;
    recommendedPrice = Math.round(currentPrice * 1.1);
    reason_ko = '수요가 높습니다. 가격 인상을 고려하세요.';
    reason_en = 'Demand is high. Consider price increase.';
  } else if (prediction.demandLevel === 'low') {
    changePercent = -10;
    recommendedPrice = Math.round(currentPrice * 0.9);
    reason_ko = '수요가 낮습니다. 가격 인하를 권장합니다.';
    reason_en = 'Demand is low. Price decrease recommended.';
  }

  return {
    recommendedPrice,
    changePercent,
    reason_ko,
    reason_en,
  };
}
