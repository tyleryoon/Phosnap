/**
 * Platform Trust Score System
 * Phosnap Platform - Photographer Credibility & Verification
 *
 * Trust Score: 0-100
 * Weights:
 * - Average rating (30%): 5.0 → 30pts, 4.0 → 24pts, etc
 * - Booking completion rate (25%): completed/total bookings
 * - Response rate (20%): responded messages / total received
 * - Cancel rate inverse (15%): (1 - cancelRate) * 15
 * - Activity duration (10%): months active, capped at 24 months = 10pts
 *
 * Trust Levels:
 * - Bronze: 0-39 points
 * - Silver: 40-59 points
 * - Gold: 60-89 points
 * - Platinum: 90-100 points (verified)
 */

/**
 * Calculate overall trust score for a photographer
 * @param {Object} photographer - Photographer profile
 * @param {string} photographer.id - Photographer ID
 * @param {Object} stats - Photographer statistics
 * @param {number} stats.avgRating - Average rating (0-5)
 * @param {number} stats.totalBookings - Total number of bookings
 * @param {number} stats.completedBookings - Number of completed bookings
 * @param {number} stats.totalMessagesReceived - Total messages received
 * @param {number} stats.messagesResponded - Number of messages responded to
 * @param {number} stats.cancelledBookings - Number of cancelled bookings
 * @param {Date|string} stats.joinedDate - When photographer joined platform
 * @returns {Object} Trust score data
 * @returns {number} score - Trust score (0-100)
 * @returns {Object} breakdown - Individual component scores
 * @returns {string} level - Trust level (bronze|silver|gold|platinum)
 * @returns {boolean} isVerified - Whether verified (score >= 90)
 */
export function calculateTrustScore(photographer, stats) {
  const breakdown = {
    rating: 0,
    completion: 0,
    response: 0,
    cancelInverse: 0,
    activity: 0,
  };

  // Rating component (30%)
  if (stats.avgRating && stats.avgRating > 0) {
    breakdown.rating = (stats.avgRating / 5) * 30;
  }

  // Booking completion rate (25%)
  if (stats.totalBookings && stats.totalBookings > 0) {
    const completionRate = stats.completedBookings / stats.totalBookings;
    breakdown.completion = completionRate * 25;
  }

  // Response rate (20%)
  if (stats.totalMessagesReceived && stats.totalMessagesReceived > 0) {
    const responseRate = stats.messagesResponded / stats.totalMessagesReceived;
    breakdown.response = Math.min(responseRate, 1) * 20;
  }

  // Cancel rate inverse (15%)
  if (stats.totalBookings && stats.totalBookings > 0) {
    const cancelRate = stats.cancelledBookings / stats.totalBookings;
    breakdown.cancelInverse = (1 - cancelRate) * 15;
  }

  // Activity duration (10%, capped at 24 months)
  if (stats.joinedDate) {
    const joinedDate = new Date(stats.joinedDate);
    const now = new Date();
    const monthsActive = Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24 * 30));
    const activityScore = Math.min(monthsActive / 24, 1) * 10;
    breakdown.activity = activityScore;
  }

  const score = Math.round(
    Object.values(breakdown).reduce((sum, val) => sum + val, 0)
  );

  const level = getTrustLevel(score);
  const isVerified = score >= 90;

  return {
    score: Math.min(score, 100),
    breakdown,
    level,
    isVerified,
  };
}

/**
 * Get trust level name based on score
 * @param {number} score - Trust score (0-100)
 * @returns {string} Trust level (bronze|silver|gold|platinum)
 */
export function getTrustLevel(score) {
  if (score >= 90) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  return 'bronze';
}

/**
 * Get visual display properties for trust score
 * @param {number} score - Trust score (0-100)
 * @returns {Object} Display properties
 * @returns {string} label - Human-readable label
 * @returns {string} color - Hex color code
 * @returns {number} filledDots - Number of filled dots (0-5)
 * @returns {string} badge - Badge emoji
 */
export function getTrustDisplay(score) {
  const trustLevel = getTrustLevel(score);

  const displayMap = {
    bronze: {
      label: 'Bronze Member',
      color: '#CD7F32',
      filledDots: 1,
      badge: '🥉',
    },
    silver: {
      label: 'Silver Member',
      color: '#C0C0C0',
      filledDots: 2,
      badge: '🥈',
    },
    gold: {
      label: 'Gold Member',
      color: '#FFD700',
      filledDots: 4,
      badge: '⭐',
    },
    platinum: {
      label: 'Platinum Verified',
      color: '#E5E4E2',
      filledDots: 5,
      badge: '✨',
    },
  };

  return displayMap[trustLevel];
}

/**
 * Get detailed trust score explanation for user education
 * @param {Object} trustScoreData - Result from calculateTrustScore
 * @returns {Object} Detailed explanation with tips
 */
export function getTrustScoreExplanation(trustScoreData) {
  const { score, breakdown, level, isVerified } = trustScoreData;

  const explanations = {
    rating:
      breakdown.rating > 0
        ? `Rating contribution: ${breakdown.rating.toFixed(1)}/30 pts`
        : 'No ratings yet',
    completion:
      breakdown.completion > 0
        ? `Completion rate: ${breakdown.completion.toFixed(1)}/25 pts`
        : 'No bookings completed',
    response:
      breakdown.response > 0
        ? `Message response rate: ${breakdown.response.toFixed(1)}/20 pts`
        : 'Not responding to messages',
    cancelInverse:
      breakdown.cancelInverse > 0
        ? `Low cancellation rate: ${breakdown.cancelInverse.toFixed(1)}/15 pts`
        : 'High cancellation rate',
    activity:
      breakdown.activity > 0
        ? `Platform activity: ${breakdown.activity.toFixed(1)}/10 pts`
        : 'Recently joined',
  };

  const tips = [];
  if (breakdown.response < 15) tips.push('Improve message response time');
  if (breakdown.completion < 20) tips.push('Increase booking completion rate');
  if (breakdown.rating < 20) tips.push('Work on building higher ratings');
  if (breakdown.cancelInverse < 10) tips.push('Reduce booking cancellations');

  return {
    score,
    level,
    isVerified,
    explanations,
    improvementTips: tips,
    nextLevelScore: level === 'platinum' ? null : getNextLevelThreshold(level),
  };
}

/**
 * Get the score needed to reach the next trust level
 * @param {string} currentLevel - Current trust level
 * @returns {number} Score needed for next level (null if platinum)
 */
function getNextLevelThreshold(currentLevel) {
  const thresholds = {
    bronze: 40,
    silver: 60,
    gold: 90,
    platinum: null,
  };
  return thresholds[currentLevel];
}

/**
 * Compare two photographers by trust score
 * @param {Object} photographer1 - First photographer with trust data
 * @param {Object} photographer2 - Second photographer with trust data
 * @returns {Object} Comparison result
 */
export function compareTrustScores(photographer1, photographer2) {
  const score1 = photographer1.trustScore || 0;
  const score2 = photographer2.trustScore || 0;
  const difference = Math.abs(score1 - score2);

  return {
    photographer1: {
      name: photographer1.name,
      score: score1,
      level: getTrustLevel(score1),
    },
    photographer2: {
      name: photographer2.name,
      score: score2,
      level: getTrustLevel(score2),
    },
    winner: score1 > score2 ? 'photographer1' : score2 > score1 ? 'photographer2' : 'tie',
    scoreDifference: difference,
  };
}
