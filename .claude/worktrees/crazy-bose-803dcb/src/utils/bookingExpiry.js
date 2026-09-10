/**
 * Booking Expiry System
 * Manual-confirm bookings auto-expire after 48 hours if artist doesn't accept
 *
 * Supabase 기반: expires_at 컬럼 + expire_stale_bookings() RPC 사용
 */

import { expireStaleBookings } from '../lib/supabase';

const EXPIRY_HOURS = 48;

/**
 * Check if a pending booking has expired
 * @param {object} booking - booking object with created_at/createdAt and expires_at
 * @returns {{ expired, hoursRemaining, expiresAt }}
 */
export const checkBookingExpiry = (booking) => {
  if (booking.status !== 'pending') {
    return { expired: false, hoursRemaining: null, expiresAt: null };
  }

  // Supabase에서 expires_at이 설정돼 있으면 그걸 사용
  const expiresAt = booking.expires_at
    ? new Date(booking.expires_at)
    : new Date(new Date(booking.created_at || booking.createdAt).getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

  const now = new Date();
  const hoursRemaining = Math.max(0, (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

  return {
    expired: now >= expiresAt,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    expiresAt: expiresAt.toISOString(),
  };
};

/**
 * Process all pending bookings and expire overdue ones
 * Supabase RPC 호출 — DB 서버에서 직접 처리
 * @returns {{ processed: number, expired: number }}
 */
export const processExpiredBookings = async () => {
  try {
    const { count, error } = await expireStaleBookings();
    if (error) {
      return { processed: 0, expired: 0 };
    }
    return { processed: count, expired: count };
  } catch {
    return { processed: 0, expired: 0 };
  }
};

/**
 * Get formatted time remaining
 */
export const getExpiryLabel = (booking, lang = 'ko') => {
  const { expired, hoursRemaining } = checkBookingExpiry(booking);
  if (expired) {
    return { ko: '만료됨', en: 'Expired', ja: '期限切れ', zh: '已过期' }[lang];
  }
  if (hoursRemaining === null) return '';

  if (hoursRemaining < 1) {
    const mins = Math.round(hoursRemaining * 60);
    return { ko: `${mins}분 남음`, en: `${mins}m left`, ja: `残り${mins}分`, zh: `剩余${mins}分钟` }[lang];
  }
  const hrs = Math.round(hoursRemaining);
  return { ko: `${hrs}시간 남음`, en: `${hrs}h left`, ja: `残り${hrs}時間`, zh: `剩余${hrs}小时` }[lang];
};

export { EXPIRY_HOURS };
