// ─── Review Reward Points & Tier System ────────────────────────────────
// Handles point calculation, storage, and tier progression

// ─── Point Rules ───────────────────────────────────────────────────────
const POINT_RULES_BASE = {
  review_package: 500,       // Package review written
  review_artist: 500,        // Artist review written
  bonus_both: 200,           // Both package + artist (same booking)
  detail_bonus: 100,         // Review body >= 100 chars
  tags_bonus: 50,            // Tags >= 2 selected
};

export const POINT_RULES = {
  ko: {
    review_package: '패키지 리뷰 작성',
    review_artist: '작가 리뷰 작성',
    bonus_both: '패키지 + 작가 리뷰 보너스',
    detail_bonus: '상세 리뷰 (100자 이상)',
    tags_bonus: '태그 2개 이상 선택',
  },
  en: {
    review_package: 'Package review written',
    review_artist: 'Artist review written',
    bonus_both: 'Both reviews bonus',
    detail_bonus: 'Detailed review (100+ chars)',
    tags_bonus: 'Selected 2+ tags',
  },
  ja: {
    review_package: 'パッケージレビュー作成',
    review_artist: 'アーティストレビュー作成',
    bonus_both: 'ダブルレビューボーナス',
    detail_bonus: '詳細レビュー（100字以上）',
    tags_bonus: 'タグ2個以上選択',
  },
  zh: {
    review_package: '撰写套餐评价',
    review_artist: '撰写摄影师评价',
    bonus_both: '双重评价奖励',
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
 * @param {Object} reviewData - { artist: { rating, tags, comment }, ... }
 * @returns {Object} { total, base, bonus, detail: [...] }
 */
export const calculateReviewPoints = (reviewData) => {
  const detail = [];
  let base = 0;
  let bonus = 0;

  // Check which reviews are being submitted
  const hasArtist = reviewData.artist?.rating > 0;
  const hasPackage = reviewData.artist?.rating > 0; // Package review same as artist review in this flow

  // Base points
  if (hasArtist) {
    base += POINT_RULES_BASE.review_artist;
    detail.push({ key: 'review_artist', amount: POINT_RULES_BASE.review_artist });
  }

  // Detail bonus (check all sections for long comments)
  Object.values(reviewData).forEach((section) => {
    if (section.comment && section.comment.length >= 100) {
      bonus += POINT_RULES_BASE.detail_bonus;
      detail.push({ key: 'detail_bonus', amount: POINT_RULES_BASE.detail_bonus });
    }
  });

  // Tags bonus (check all sections for multiple tags)
  Object.values(reviewData).forEach((section) => {
    if (Array.isArray(section.tags) && section.tags.length >= 2) {
      bonus += POINT_RULES_BASE.tags_bonus;
      detail.push({ key: 'tags_bonus', amount: POINT_RULES_BASE.tags_bonus });
    }
  });

  // Both reviews bonus (if both artist and package reviews)
  if (hasArtist && hasPackage && bonus > 0) {
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
 * @param {string} userId - User ID
 * @param {number} amount - Points to add
 * @param {string} reason - Reason code (e.g., 'review_reward')
 * @param {string} bookingId - Related booking ID
 * @returns {Object} { success, error }
 */
export const addPoints = async (userId, amount, reason, bookingId) => {
  if (!userId || amount <= 0) return { success: false, error: 'Invalid input' };

  try {
    const { getSupabase } = await import('./supabase');
    const sb = await getSupabase();
    if (!sb) return { success: false, error: 'Supabase unavailable' };

    // Insert into point_history
    const { error: historyError } = await sb.from('point_history').insert({
      user_id: userId,
      amount,
      reason,
      booking_id: bookingId,
    });

    if (historyError) {
      return { success: false, error: historyError.message };
    }

    // Upsert user_points (create if not exists, update if exists)
    const { error: upsertError } = await sb.from('user_points').upsert(
      {
        user_id: userId,
        points: amount, // Will be set via the RPC call below ideally
        total_earned: amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      // Try to manually fetch and update if upsert has issues
      const { data: existing } = await sb
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const { error: updateError } = await sb
          .from('user_points')
          .update({
            points: existing.points + amount,
            total_earned: existing.total_earned + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      } else {
        const { error: insertError } = await sb.from('user_points').insert({
          user_id: userId,
          points: amount,
          total_earned: amount,
        });

        if (insertError) {
          return { success: false, error: insertError.message };
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Deduct points from a user (for discounts, purchases, etc.)
 * @param {string} userId - User ID
 * @param {number} amount - Points to deduct
 * @param {string} reason - Reason code
 * @param {string} bookingId - Related booking ID
 * @returns {Object} { success, error }
 */
export const deductPoints = async (userId, amount, reason, bookingId) => {
  if (!userId || amount <= 0) return { success: false, error: 'Invalid input' };

  try {
    const { getSupabase } = await import('./supabase');
    const sb = await getSupabase();
    if (!sb) return { success: false, error: 'Supabase unavailable' };

    // Check current balance
    const { data: current, error: fetchError } = await sb
      .from('user_points')
      .select('points')
      .eq('user_id', userId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'User points not found' };
    }

    if (current.points < amount) {
      return { success: false, error: 'Insufficient points' };
    }

    // Insert negative amount into history
    const { error: historyError } = await sb.from('point_history').insert({
      user_id: userId,
      amount: -amount,
      reason,
      booking_id: bookingId,
    });

    if (historyError) {
      return { success: false, error: historyError.message };
    }

    // Update points
    const { error: updateError } = await sb
      .from('user_points')
      .update({
        points: current.points - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
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
    nextTier: nextTier ? { tier: nextTier, label: TIER_INFO[nextTier] } : null,
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
