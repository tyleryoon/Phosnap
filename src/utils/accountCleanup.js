/**
 * Account Deletion Data Cleanup
 * Supabase RLS + CASCADE 기반: 대부분의 데이터는 DB에서 자동 삭제됨
 * localStorage에 남아 있는 클라이언트 데이터도 함께 정리
 */

import { getSupabase } from '../lib/supabase';

// localStorage에 남아있을 수 있는 클라이언트 전용 키들
const LOCAL_CLEANUP_KEYS = [
  'phosnap_unified_reviews',   // 벤더 리뷰 (아직 DB 테이블 없음)
  'phosnap_fav_artists',       // 즐겨찾기
  'phosnap_fav_countries',     // 국가 즐겨찾기
  'phosnap_currency',          // 통화 설정
  'phosnap_chat',              // 레거시 채팅 데이터
  'phosnap_sim_bookings',      // 시뮬레이션 데이터
  'phosnap_sim_reviews',
  'phosnap_sim_replies',
  'phosnap_sim_chats',
];

/**
 * Clean up all data associated with a user
 * Supabase: profiles CASCADE로 bookings, reviews, chat 자동 삭제
 * localStorage: 클라이언트 전용 데이터 정리
 * @param {string} userId - auth.uid()
 * @returns {{ cleaned: object, errors: string[] }}
 */
export const cleanupUserData = async (userId) => {
  const cleaned = {};
  const errors = [];

  // 1. Supabase 데이터 삭제 (CASCADE 처리되는 것들은 profiles 삭제 시 자동)
  try {
    const sb = await getSupabase();
    if (sb) {
      // review_replies (photographer_id = userId)
      const { error: replyErr } = await sb.from('review_replies')
        .delete().eq('photographer_id', userId);
      if (!replyErr) cleaned.reviewReplies = 'deleted';

      // chat messages (sender_id = userId)
      const { error: msgErr } = await sb.from('messages')
        .delete().eq('sender_id', userId);
      if (!msgErr) cleaned.messages = 'deleted';

      // vendor_reviews (customer_id = userId)
      const { error: vrErr } = await sb.from('vendor_reviews')
        .delete().eq('customer_id', userId);
      if (!vrErr) cleaned.vendorReviews = 'deleted';

      // Supabase auth user 삭제는 AuthContext에서 처리
      // profiles → bookings, reviews 등은 CASCADE로 자동 삭제
      cleaned.supabase = 'cascade_ready';
    }
  } catch (e) { errors.push('supabase: ' + e.message); }

  // 2. localStorage 정리
  try {
    LOCAL_CLEANUP_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
    // 동적 키 정리
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('phosnap_') && (
        key.includes(userId) ||
        key.startsWith('phosnap_schedule_') ||
        key.startsWith('phosnap_profile_') ||
        key.startsWith('phosnap_sales_') ||
        key.startsWith('phosnap_lastLogin_') ||
        key.startsWith('phosnap_roles_')
      )) {
        localStorage.removeItem(key);
      }
    });
    cleaned.localStorage = 'cleared';
  } catch (e) { errors.push('localStorage: ' + e.message); }

  // 3. sessionStorage 정리
  try {
    sessionStorage.removeItem('phosnap_active_role');
    cleaned.sessionStorage = 'cleared';
  } catch (e) { errors.push('sessionStorage: ' + e.message); }

  return { cleaned, errors };
};

/**
 * Get summary of data that will be deleted
 * Supabase에서 카운트 조회
 */
export const getCleanupPreview = async (userId) => {
  const preview = {};
  try {
    const sb = await getSupabase();
    if (sb) {
      const { count: bookingCount } = await sb.from('bookings')
        .select('*', { count: 'exact', head: true }).eq('customer_id', userId);
      if (bookingCount > 0) preview.bookings = bookingCount;

      const { count: reviewCount } = await sb.from('reviews')
        .select('*', { count: 'exact', head: true }).eq('customer_id', userId);
      if (reviewCount > 0) preview.reviews = reviewCount;

      const { count: chatCount } = await sb.from('chat_rooms')
        .select('*', { count: 'exact', head: true }).eq('customer_id', userId);
      if (chatCount > 0) preview.chats = chatCount;
    }
  } catch {}
  return preview;
};
