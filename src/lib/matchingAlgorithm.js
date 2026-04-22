/**
 * Photographer Matching & Recommendation Algorithm
 * Phosnap Platform - Luxury Photography Booking
 *
 * Scoring System (0-100):
 * - Location match: 30 pts (exact city match = 30, same country = 15)
 * - Style tag match: 20 pts (proportional to matched tags)
 * - Budget range: 20 pts (within range = 20, close = 10, far = 0)
 * - Language match: 15 pts (each matched language adds points)
 * - Rating: 10 pts (scaled from 0-5 → 0-10)
 * - Instant booking: 5 pts (if preferred and available)
 */

/**
 * Calculate a match score between a photographer and user preferences
 * @param {Object} photographer - Photographer profile object
 * @param {string} photographer.id - Photographer ID
 * @param {Object} photographer.location - Location {country, city}
 * @param {string[]} photographer.styleTags - Photography style tags
 * @param {Object} photographer.priceRange - {min, max} in USD
 * @param {string[]} photographer.languages - Spoken languages
 * @param {number} photographer.rating - Average rating (0-5)
 * @param {boolean} photographer.instantBooking - Instant booking available
 * @param {Object} preferences - User preferences
 * @param {Object} preferences.location - Desired location {country, city}
 * @param {string[]} preferences.styleTags - Preferred style tags
 * @param {number} preferences.budgetMin - Minimum budget in USD
 * @param {number} preferences.budgetMax - Maximum budget in USD
 * @param {string[]} preferences.languages - Preferred languages
 * @param {boolean} preferences.wantInstantBooking - Want instant booking available
 * @param {boolean} preferences.wantHMU - Want hair & makeup service
 * @returns {Object} Match score breakdown
 * @returns {number} score - Total match score (0-100)
 * @returns {Object} breakdown - Individual category scores
 * @returns {string[]} matchReasons - Human-readable match reasons
 */
export function calculateMatchScore(photographer, preferences) {
  const breakdown = {
    location: 0,
    style: 0,
    budget: 0,
    language: 0,
    rating: 0,
    instant: 0,
  };

  const matchReasons = [];

  // Location matching (30 pts max)
  if (
    photographer.location.city.toLowerCase() ===
    preferences.location.city.toLowerCase()
  ) {
    breakdown.location = 30;
    matchReasons.push(`Located in ${photographer.location.city}`);
  } else if (
    photographer.location.country.toLowerCase() ===
    preferences.location.country.toLowerCase()
  ) {
    breakdown.location = 15;
    matchReasons.push(`Based in ${photographer.location.country}`);
  }

  // Style tag matching (20 pts max)
  if (
    photographer.styleTags &&
    photographer.styleTags.length > 0 &&
    preferences.styleTags &&
    preferences.styleTags.length > 0
  ) {
    const matchedTags = photographer.styleTags.filter((tag) =>
      preferences.styleTags.some((pref) => pref.toLowerCase() === tag.toLowerCase())
    );
    const matchRatio = matchedTags.length / Math.max(preferences.styleTags.length, 1);
    breakdown.style = Math.round(matchRatio * 20);
    if (matchedTags.length > 0) {
      matchReasons.push(`Specializes in ${matchedTags.join(', ')}`);
    }
  }

  // Budget range matching (20 pts max)
  const photographerMidpoint = (photographer.priceRange.min + photographer.priceRange.max) / 2;
  const preferencesMidpoint = (preferences.budgetMin + preferences.budgetMax) / 2;

  if (
    photographer.priceRange.min <= preferences.budgetMax &&
    photographer.priceRange.max >= preferences.budgetMin
  ) {
    breakdown.budget = 20;
    matchReasons.push(
      `Pricing: $${photographer.priceRange.min}-$${photographer.priceRange.max}`
    );
  } else if (
    Math.abs(photographerMidpoint - preferencesMidpoint) <= preferencesMidpoint * 0.25
  ) {
    breakdown.budget = 10;
    matchReasons.push(
      `Pricing close: $${photographer.priceRange.min}-$${photographer.priceRange.max}`
    );
  }

  // Language matching (15 pts max)
  if (photographer.languages && photographer.languages.length > 0 && preferences.languages) {
    const matchedLanguages = photographer.languages.filter((lang) =>
      preferences.languages.some((pref) => pref.toLowerCase() === lang.toLowerCase())
    );
    breakdown.language = Math.min(matchedLanguages.length * 5, 15);
    if (matchedLanguages.length > 0) {
      matchReasons.push(`Speaks ${matchedLanguages.join(', ')}`);
    }
  }

  // Rating score (10 pts max)
  if (photographer.rating && photographer.rating > 0) {
    breakdown.rating = (photographer.rating / 5) * 10;
    matchReasons.push(`Rating: ${photographer.rating.toFixed(1)}/5`);
  }

  // Instant booking bonus (5 pts max)
  if (
    preferences.wantInstantBooking &&
    photographer.instantBooking
  ) {
    breakdown.instant = 5;
    matchReasons.push('Instant booking available');
  }

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score: Math.min(score, 100),
    breakdown,
    matchReasons,
  };
}

/**
 * Get top photographer recommendations sorted by match score
 * @param {Object[]} photographers - Array of photographer profiles
 * @param {Object} preferences - User preferences
 * @param {number} limit - Number of recommendations to return (default: 3)
 * @returns {Object[]} Array of photographers with scores, sorted by score descending
 */
export function getTopRecommendations(photographers, preferences, limit = 3) {
  const scored = photographers
    .map((photographer) => ({
      ...photographer,
      matchData: calculateMatchScore(photographer, preferences),
    }))
    .sort((a, b) => b.matchData.score - a.matchData.score)
    .slice(0, limit);

  return scored;
}

/**
 * Get personalized recommendations enhanced by booking history
 * Photographers with previously booked style tags or locations get bonus points
 * @param {Object[]} photographers - Array of photographer profiles
 * @param {Object} preferences - User preferences
 * @param {Object[]} bookingHistory - Array of previous bookings
 * @param {string} bookingHistory[].photographerId - Photographer ID
 * @param {string[]} bookingHistory[].usedStyleTags - Tags used in that booking
 * @param {Object} bookingHistory[].location - Booking location
 * @returns {Object[]} Array of photographers with personalized scores
 */
export function getPersonalizedRecommendations(
  photographers,
  preferences,
  bookingHistory = []
) {
  // Extract booking history insights
  const previouslyBookedPhotographers = new Set(
    bookingHistory.map((b) => b.photographerId)
  );

  const bookedStyleTags = bookingHistory.reduce((tags, booking) => {
    if (booking.usedStyleTags) {
      tags.push(...booking.usedStyleTags);
    }
    return tags;
  }, []);

  const bookedLocations = bookingHistory.map((b) => b.location.city.toLowerCase());

  // Calculate scores with history bonuses
  const scored = photographers
    .map((photographer) => {
      const baseMatch = calculateMatchScore(photographer, preferences);
      let personalizedScore = baseMatch.score;
      const bonusReasons = [];

      // Bonus for previously booked photographer
      if (previouslyBookedPhotographers.has(photographer.id)) {
        personalizedScore += 5;
        bonusReasons.push('Previously booked');
      }

      // Bonus for previously booked style tags
      if (photographer.styleTags) {
        const matchedHistoryTags = photographer.styleTags.filter((tag) =>
          bookedStyleTags.some((booked) => booked.toLowerCase() === tag.toLowerCase())
        );
        personalizedScore += Math.min(matchedHistoryTags.length * 5, 5);
        if (matchedHistoryTags.length > 0) {
          bonusReasons.push('Matches your previous bookings');
        }
      }

      // Bonus for previously booked locations
      if (
        photographer.location.city.toLowerCase() &&
        bookedLocations.includes(photographer.location.city.toLowerCase())
      ) {
        personalizedScore += 5;
        bonusReasons.push('Available in your previous locations');
      }

      return {
        ...photographer,
        matchData: baseMatch,
        personalizedScore: Math.min(personalizedScore, 100),
        bonusReasons,
      };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore);

  return scored;
}
