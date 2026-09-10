/**
 * Referral Code System
 * Code format: PH-{ROLE_PREFIX}-{RANDOM6}
 * Examples: PH-C-A3X9K2, PH-A-B7M2P5, PH-V-D4R8N1
 */

// Generate a unique referral code
export function generateReferralCode(role) {
  const prefix = role === 'customer' ? 'C' : role === 'artist' ? 'A' : role === 'vendor' ? 'V' : 'X';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0,O,1,I,l to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `PH-${prefix}-${code}`;
}

// Save referral code to user profile (call after signup)
export async function saveReferralCode(userId, role) {
  const { getSupabase } = await import('./supabase');
  const sb = await getSupabase();
  if (!sb) return null;

  const code = generateReferralCode(role);

  const { error } = await sb.from('profiles').update({
    referral_code: code
  }).eq('id', userId);

  return code;
}

// Get user's referral code
export async function getMyReferralCode(userId) {
  const { getSupabase } = await import('./supabase');
  const sb = await getSupabase();
  if (!sb) return null;

  const { data } = await sb.from('profiles').select('referral_code').eq('id', userId).maybeSingle();
  return data?.referral_code || null;
}

// Apply referral code (called when new user enters a referral code during signup)
export async function applyReferralCode(newUserId, referralCode) {
  const { getSupabase } = await import('./supabase');
  const sb = await getSupabase();
  if (!sb) return { success: false, error: 'supabase_unavailable' };

  // Find who owns this code
  const { data: referrer } = await sb.from('profiles').select('id, role').eq('referral_code', referralCode).maybeSingle();
  if (!referrer) return { success: false, error: 'invalid_code' };
  if (referrer.id === newUserId) return { success: false, error: 'self_referral' };

  // Record the referral (only insert if referrals table exists)
  try {
    const { error } = await sb.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      referral_code: referralCode,
      status: 'completed',
      referrer_reward: getReferrerReward(referrer.role),
      referred_reward: getReferredReward(),
    });

  } catch (err) {
    // Silently ignore referral tracking errors
  }

  return { success: true, referrerRole: referrer.role };
}

// Reward definitions
function getReferrerReward(role) {
  // Artist/Vendor: 다음 수수료에서 1% 할인
  // Customer: 다음 예약 5,000원 할인 쿠폰
  return role === 'customer' ? 'coupon_5000' : 'commission_1pct_off';
}

function getReferredReward() {
  // New user: 첫 예약 10,000원 할인 쿠폰
  return 'coupon_10000';
}

// Get referral stats for dashboard
export async function getReferralStats(userId) {
  const { getSupabase } = await import('./supabase');
  const sb = await getSupabase();
  if (!sb) return { totalReferred: 0, referrals: [] };

  try {
    const { data: referrals } = await sb.from('referrals')
      .select('*, referred:profiles!referred_id(full_name, role)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    return {
      totalReferred: referrals?.length || 0,
      referrals: referrals || [],
    };
  } catch (err) {
    return { totalReferred: 0, referrals: [] };
  }
}

// Reward descriptions (multilingual)
export const REWARD_INFO = {
  ko: {
    title: '추천인 혜택',
    referrerCustomer: '추천인(나): 추천 코드로 가입한 신규 회원이 첫 예약을 완료하면, 다음 예약 시 사용 가능한 ₩5,000 할인 쿠폰 1장 지급 (건당 1회, 횟수 제한 없음)',
    referrerArtist: '추천인(나): 추천 코드로 가입한 신규 회원이 첫 예약을 완료하면, 다음 1건의 정산에서 수수료 1% 할인 적용 (건당 1회, 횟수 제한 없음)',
    referrerVendor: '추천인(나): 추천 코드로 가입한 신규 회원이 첫 예약을 완료하면, 다음 1건의 정산에서 수수료 1% 할인 적용 (건당 1회, 횟수 제한 없음)',
    referred: '추천 코드로 가입하는 신규 회원: 가입 즉시 첫 예약에 사용 가능한 ₩10,000 할인 쿠폰 자동 지급',
    shareMessage: '나의 추천 코드를 공유하세요',
    copied: '복사됨!',
    noReferrals: '아직 추천 이력이 없습니다',
    totalReferred: '총 추천 수',
  },
  en: {
    title: 'Referral Benefits',
    referrerCustomer: 'You (referrer): When a new member signs up with your code and completes their first booking, you receive a ₩5,000 discount coupon for your next booking (1 coupon per referral, unlimited referrals)',
    referrerArtist: 'You (referrer): When a new member signs up with your code and completes their first booking, you get 1% off the commission on your next settlement (per referral, unlimited)',
    referrerVendor: 'You (referrer): When a new member signs up with your code and completes their first booking, you get 1% off the commission on your next settlement (per referral, unlimited)',
    referred: 'New member (via your code): Receives a ₩10,000 discount coupon for their first booking upon signup',
    shareMessage: 'Share your referral code',
    copied: 'Copied!',
    noReferrals: 'No referrals yet',
    totalReferred: 'Total Referrals',
  },
  ja: {
    title: '紹介特典',
    referrerCustomer: '紹介者(あなた): 紹介コードで登録した新規会員が初予約を完了すると、次の予約で使える¥500割引クーポン1枚付与（1件ごと、回数無制限）',
    referrerArtist: '紹介者(あなた): 紹介コードで登録した新規会員が初予約を完了すると、次の1件の精算で手数料1%割引（1件ごと、回数無制限）',
    referrerVendor: '紹介者(あなた): 紹介コードで登録した新規会員が初予約を完了すると、次の1件の精算で手数料1%割引（1件ごと、回数無制限）',
    referred: '紹介コードで登録する新規会員: 登録時に初回予約で使える¥1,000割引クーポンを自動付与',
    shareMessage: '紹介コードを共有しましょう',
    copied: 'コピーしました!',
    noReferrals: 'まだ紹介がありません',
    totalReferred: '紹介数',
  },
  zh: {
    title: '推荐奖励',
    referrerCustomer: '推荐人(你): 新用户通过你的推荐码注册并完成首次预约后，你将获得下次预约可用的¥35优惠券（每次推荐1张，无次数限制）',
    referrerArtist: '推荐人(你): 新用户通过你的推荐码注册并完成首次预约后，你的下一笔结算佣金减1%（每次推荐1次，无次数限制）',
    referrerVendor: '推荐人(你): 新用户通过你的推荐码注册并完成首次预约后，你的下一笔结算佣金减1%（每次推荐1次，无次数限制）',
    referred: '通过推荐码注册的新用户: 注册即获首次预约可用的¥70优惠券',
    shareMessage: '分享您的推荐码',
    copied: '已复制!',
    noReferrals: '还没有推荐',
    totalReferred: '推荐数',
  },
};
