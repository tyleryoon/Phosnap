// Vendor Review Storage & Retrieval Utility
// Supabase vendor_reviews 테이블 우선 + localStorage fallback
//
// vendor_type: 'stylist' | 'costume' | 'venue'

import { getSupabase, getVendorReviewsByType, getVendorReviewStats } from '../lib/supabase';

const STORAGE_KEY = 'phosnap_unified_reviews';

// Supabase 사용 가능 여부 체크
let _sbAvailable = null;
const isSupabaseAvailable = async () => {
  if (_sbAvailable !== null) return _sbAvailable;
  try {
    const sb = await getSupabase();
    _sbAvailable = !!sb;
  } catch {
    _sbAvailable = false;
  }
  return _sbAvailable;
};

/**
 * Get all reviews for a specific vendor type
 * Supabase 우선 → localStorage fallback
 * @param {string} vendorType - 'stylist' | 'costume' | 'venue'
 * @param {string} vendorId - vendor ID (optional)
 * @returns {Promise<array>} Array of review objects
 */
export const getVendorReviews = async (vendorType, vendorId = null) => {
  // Supabase 우선
  if (await isSupabaseAvailable()) {
    const { data } = await getVendorReviewsByType(vendorType, vendorId);
    if (data && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        bookingId: r.booking_id,
        photographerId: r.photographer_id,
        vendorType: r.vendor_type,
        vendorId: r.vendor_id,
        stars: r.rating,
        tags: r.tags || [],
        text: r.body || '',
        createdAt: r.created_at,
        author: 'Guest',
      }));
    }
  }

  // localStorage fallback
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
 * Supabase 우선 → localStorage fallback
 * @param {string} vendorType - 'stylist' | 'costume' | 'venue'
 * @returns {Promise<object>} { avg: number, count: number }
 */
export const getAverageRating = async (vendorType, vendorId = null) => {
  if (await isSupabaseAvailable()) {
    return await getVendorReviewStats(vendorType, vendorId);
  }
  // localStorage fallback
  const reviews = await getVendorReviews(vendorType);
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
 * @returns {Promise<object>} { stylist: [], costume: [], venue: [] }
 */
export const getAllVendorReviews = async () => {
  const [stylist, costume, venue] = await Promise.all([
    getVendorReviews('stylist'),
    getVendorReviews('costume'),
    getVendorReviews('venue'),
  ]);
  return { stylist, costume, venue };
};
