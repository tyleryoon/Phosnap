// ─── Review Reward Points & Tier System ────────────────────────────────
// Handles point calculation, storage, and tier progression

// ─── Point Rules ───────────────────────────────────────────────────────
// Per-section base + bonuses, with caps to prevent gaming.
const POINT_RULES_BASE = {
  review_artist: 500,        // Artist (or package) review written
  review_vendor: 200,        // Each vendor review (stylist/costume/venue)
  bonus_both: 200,           // Artist review + at least one vendor review
  detail_bonus: 100,         // Per-section bonus when comment >= 100 chars
  tags_bonus: 50,            // Per-section bonus when 2+ tags selected
  detail_bonus_cap: 200,     // Cap for total detail_bonus across all sections
  tags_bonus_cap: 100,       // Cap for total tags_bonus across all sections
};

export const POINT_RULES = {
  ko: {
    review_artist: '작가 리뷰 작성',
    review_vendor: '벤더 리뷰 작성',
    bonus_both: '작가 + 벤더 리뷰 보너스',
    detail_bonus: '상세 리뷰 (100자 이상)',
    tags_bonus: '태그 2개 이상 선택',
  },
  en: {
    review_artist: 'Artist review written',
    review_vendor: 'Vendor review written',
    bonus_both: 'Artist + vendor review bonus',
    detail_bonus: 'Detailed review (100+ chars)',
    tags_bonus: 'Selected 2+ tags',
  },
  ja: {
    review_artist: 'アーティストレビュー作成',
    review_vendor: 'ベンダーレビュー作成',
    bonus_both: 'アーティスト + ベンダーレビューボーナス',
    detail_bonus: '詳細レビュー（100字以上）',
    tags_bonus: 'タグ2個以上選択',
  },
  zh: {
    review_artist: '撰写摄影师评价',
    review_vendor: '撰写供应商评价',
    bonus_both: '摄影师 + 供应商评价奖励',
    detail_bonus: '详细评价（100字以上）',
    tags_bonus: '选择2个及以上标签',
  },
};

// ─── Tier System ───────────────────────────────────────────────────────
export const TIER_INFO = {
  bronze: {
    ko: { name: '🥉 브론즈', benefits: ['기본 멤버십'] },
    en: { name: '🥉 Bronze', benefits: ['Standard membership'] },
    ja: { name: '🥉 ブロンズ', benefits: ['基本会員'] },
    zh: { name: '🥉 青铜', benefits: ['基础会员'] },
    range: [0, 2000],
    discount: 0,
  },
  silver: {
    ko: { name: '🥈 실버', benefits: ['3% 할인', '일반 예약'] },
    en: { name: '🥈 Silver', benefits: ['3% discount', 'Standard booking'] },
    ja: { name: '🥈 シルバー', benefits: ['3%割引', '通常予約'] },
    zh: { name: '🥈 白银', benefits: ['3折扣', '标准预约'] },
    range: [2001, 5000],
    discount: 0.03,
  },
  gold: {
    ko: { name: '🏆 골드', benefits: ['5% 할인', '우선 예약'] },
    en: { name: '🏆 Gold', benefits: ['5% discount', 'Priority booking'] },
    ja: { name: '🏆 ゴールド', benefits: ['5%割引', '優先予約'] },
    zh: { name: '🏆 黄金', benefits: ['5折扣', '优先预约'] },
    range: [5001, 10000],
    discount: 0.05,
  },
  platinum: {
    ko: { name: '💎 플래티넘', benefits: ['7% 할인', '우선 예약', '전담 CS'] },
    en: { name: '💎 Platinum', benefits: ['7% discount', 'Priority booking', 'Dedicated CS'] },
    ja: { name: '💎 プラチナ', benefits: ['7%割引', '優先予約', '専任CS'] },
    zh: { name: '💎 铂金', benefits: ['7折扣', '优先预约', '专属客服'] },
    range: [10001, Infinity],
    discount: 0.07,
  },
};

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Calculate reward points for a review submission
 * @param {Object} reviewData - { artist: { rating, tags, comment }, stylist: {...}, costume: {...}, venue: {...} }
 * @returns {Object} { total, base, bonus, detail: [...] }
 */
export const calculateReviewPoints = (reviewData) => {
  const detail = [];
  let base = 0;
  let bonus = 0;

  const VENDOR_KEYS = ['stylist', 'costume', 'venue'];
  const isRated = (s) => s && Number(s.rating) > 0;

  const hasArtist = isRated(reviewData?.artist);
  const ratedVendorKeys = VENDOR_KEYS.filter((k) => isRated(reviewData?.[k]));

  // Base points: artist review
  if (hasArtist) {
    base += POINT_RULES_BASE.review_artist;
    detail.push({ key: 'review_artist', amount: POINT_RULES_BASE.review_artist });
  }

  // Base points: each vendor review
  ratedVendorKeys.forEach((k) => {
    base += POINT_RULES_BASE.review_vendor;
    detail.push({ key: 'review_vendor', amount: POINT_RULES_BASE.review_vendor, section: k });
  });

  // Detail bonus (only count rated sections, capped)
  let detailBonusTotal = 0;
  ['artist', ...VENDOR_KEYS].forEach((k) => {
    const section = reviewData?.[k];
    if (!isRated(section)) return;
    if (typeof section.comment === 'string' && section.comment.trim().length >= 100) {
      const remaining = POINT_RULES_BASE.detail_bonus_cap - detailBonusTotal;
      if (remaining <= 0) return;
      const amount = Math.min(POINT_RULES_BASE.detail_bonus, remaining);
      detailBonusTotal += amount;
      bonus += amount;
      detail.push({ key: 'detail_bonus', amount, section: k });
    }
  });

  // Tags bonus (only count rated sections, capped)
  let tagsBonusTotal = 0;
  ['artist', ...VENDOR_KEYS].forEach((k) => {
    const section = reviewData?.[k];
    if (!isRated(section)) return;
    if (Array.isArray(section.tags) && section.tags.length >= 2) {
      const remaining = POINT_RULES_BASE.tags_bonus_cap - tagsBonusTotal;
      if (remaining <= 0) return;
      const amount = Math.min(POINT_RULES_BASE.tags_bonus, remaining);
      tagsBonusTotal += amount;
      bonus += amount;
      detail.push({ key: 'tags_bonus', amount, section: k });
    }
  });

  // Bonus when artist + at least one vendor are both reviewed
  if (hasArtist && ratedVendorKeys.length > 0) {
    bonus += POINT_RULES_BASE.bonus_both;
    detail.push({ key: 'bonus_both', amount: POINT_RULES_BASE.bonus_both });
  }

  return {
    total: base + bonus,
    base,
    bonus,
    detail,
  };
};

/**
 * Get user's current points and earned total
 * @param {string} userId - User ID
 * @returns {Object} { points, totalEarned } or null
 */
export const getUserPoints = async (userId) => {
  if (!userId) return null;

  try {
    const { getSupabase } = await import('./supabase');
    const sb = await getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
      .from('user_points')
      .select('points, total_earned')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data || { points: 0, total_earned: 0 };
  } catch (err) {
    return null;
  }
};

/**
 * Award points to a user (for rewards, reviews, etc.)
 * Atomic via RPC `award_points` (see migration_points_v2.sql).
 * Falls back to read-then-write if the RPC is missing.
 * @param {string} userId - User ID
 * @param {number} amount - Points to add (positive integer)
 * @param {string} reason - Reason code (e.g., 'review_reward')
 * @param {string} bookingId - Related booking ID
 * @returns {Object} { success, error }
 */
export const addPoints = async (userId, amount, reason, bookingId) => {
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const { getSupabase } = await import('./supabase');
    const sb = await getSupabase();
    if (!sb) return { success: false, error: 'Supabase unavailable' };

    // Prefer atomic RPC (transactional, race-free).
    const { error: rpcError } = await sb.rpc('award_points', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_booking_id: bookingId || null,
    });

    if (!rpcError) return { success: true };

    // Fallback path: only used if the RPC has not been deployed yet.
    // Read existing balance, then increment via update or insert.
    const { data: existing, error: fetchError } = await sb
      .from('user_points')
      .select('points, total_earned')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };

    const nowIso = new Date().toISOString();
    if (existing) {
      const { error: updateError } = await sb
        .from('user_points')
        .update({
          points: (existing.points || 0) + amount,
          total_earned: (existing.total_earned || 0) + amount,
          updated_at: nowIso,
        })
        .eq('user_id', userId);
      if (updateError) return { success: false, error: updateError.message };
    } else {
      const { error: insertError } = await sb.from('user_points').insert({
        user_id: userId,
        points: amount,
        total_earned: amount,
      });
      if (insertError) return { success: false, error: insertError.message };
    }

    const { error: historyError } = await sb.from('point_history').insert({
      user_id: userId,
      amount,
      reason,
      booking_id: bookingId || null,
    });
    if (historyError) return { success: false, error: historyError.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Deduct points from a user (for discounts, purchases, etc.)
 * Atomic via RPC `deduct_points`. Returns `Insufficient points` if the
 * user does not have enough balance.
 * @param {string} userId - User ID
 * @param {number} amount - Points to deduct (positive integer)
 * @param {string} reason - Reason code
 * @param {string} bookingId - Related booking ID
 * @returns {Object} { success, error }
 */
export const deductPoints = async (userId, amount, reason, bookingId) => {
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const { getSupabase } = await import('./supabase');
    const sb = await getSupabase();
    if (!sb) return { success: false, error: 'Supabase unavailable' };

    const { error: rpcError } = await sb.rpc('deduct_points', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_booking_id: bookingId || null,
    });

    if (rpcError) {
      const msg = rpcError.message || '';
      if (msg.includes('insufficient balance')) {
        return { success: false, error: 'Insufficient points' };
      }
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Get user's tier information based on total earned points
 * @param {number} totalEarned - Total points earned (lifetime)
 * @returns {Object} { tier, label, benefits, discount, nextTier, pointsToNext }
 */
export const getTier = (totalEarned = 0) => {
  let currentTier = 'bronze';
  let nextTier = 'silver';
  let pointsToNext = 2001;

  if (totalEarned >= 10001) {
    currentTier = 'platinum';
    nextTier = null;
    pointsToNext = 0;
  } else if (totalEarned >= 5001) {
    currentTier = 'gold';
    nextTier = 'platinum';
    pointsToNext = 10001 - totalEarned;
  } else if (totalEarned >= 2001) {
    currentTier = 'silver';
    nextTier = 'gold';
    pointsToNext = 5001 - totalEarned;
  }

  return {
    tier: currentTier,
    label: TIER_INFO[currentTier],
    benefits: TIER_INFO[currentTier],
    discount: TIER_INFO[currentTier].discount,
    nextTier: nextTier
      ? {
          tier: nextTier,
          label: TIER_INFO[nextTier],
          range: TIER_INFO[nextTier].range,
        }
      : null,
    pointsToNext,
  };
};

/**
 * Get point history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to fetch (default 20)
 * @returns {Array} Point history records
 */
export const getPointHistory = async (userId, limit = 20) => {
  if (!userId) return [];

  try {
    const { getSupabase } = await import('./supabase');
    const sb = await getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from('point_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
};
