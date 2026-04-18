// Vendor Review Storage & Retrieval Utility
// Supabase 기반: unified reviews는 localStorage에 남아있을 수 있으므로
// Supabase 우선 조회 + localStorage fallback 제공
//
// 향후 stylist_reviews, costume_reviews, venue_reviews 테이블이 생기면
// 각 벤더별 전용 테이블로 완전 전환

import { getSupabase } from '../lib/supabase';

const STORAGE_KEY = 'phosnap_unified_reviews';

/**
 * Get all reviews for a specific vendor type
 * Supabase unified_reviews가 없으므로 localStorage에서 읽음 (현재)
 * @param {string} vendorType - 'stylist' | 'costume' | 'venue'
 * @param {string} vendorId - vendor ID (optional)
 * @returns {array} Array of review objects
 */
export const getVendorReviews = (vendorType, vendorId = null) => {
  try {
    const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const reviews = [];

    allReviews.forEach(entry => {
      const sectionData = entry.reviews?.[vendorType];
      if (sectionData && sectionData.rating > 0) {
        reviews.push({
          id: `${entry.bookingId}-${vendorType}`,
          bookingId: entry.bookingId,
          photographerId: entry.photographerId || null,
          vendorType,
          vendorId,
          stars: sectionData.rating,
          tags: sectionData.tags || [],
          text: sectionData.comment || '',
          createdAt: entry.createdAt,
          author: 'Guest',
        });
      }
    });

    return reviews;
  } catch (err) {
    console.error('[vendorReviews] Error reading reviews:', err);
    return [];
  }
};

/**
 * Get average rating for a vendor type
 * @param {string} vendorType - 'stylist' | 'costume' | 'venue'
 * @returns {object} { avg: number, count: number }
 */
export const getAverageRating = (vendorType) => {
  const reviews = getVendorReviews(vendorType);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + (r.stars || 0), 0);
  return {
    avg: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
  };
};

/**
 * Format a review for display
 */
export const formatReview = (review, lang = 'ko') => {
  const date = new Date(review.createdAt);
  const dateStr = lang === 'ko'
    ? date.toLocaleDateString('ko-KR')
    : date.toLocaleDateString('en-US');
  return {
    ...review,
    dateStr,
    formattedStars: '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars),
  };
};

/**
 * Get all reviews for all vendor types
 * @returns {object} { stylist: [], costume: [], venue: [] }
 */
export const getAllVendorReviews = () => {
  return {
    stylist: getVendorReviews('stylist'),
    costume: getVendorReviews('costume'),
    venue: getVendorReviews('venue'),
  };
};
