// ─── Supabase Client ────────────────────────────────────────────────────
// npm 패키지 방식 (@supabase/supabase-js)
//
// 환경변수:
//   VITE_SUPABASE_URL      = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY = eyJ...

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let _client = null;

export const getSupabase = async () => {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // OAuth 콜백 처리
    },
  });
  return _client;
};

// ─── Auth 헬퍼 ────────────────────────────────────────────────────────

// ── 휴대폰 번호 유틸 ──────────────────────────────────────────────────
/**
 * 한국 번호를 E.164 형식으로 변환
 *   '010-1234-5678' | '01012345678' → '+821012345678'
 *   이미 '+82...' 형식이면 그대로 반환
 */
export const toE164KR = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return phone;          // 이미 E.164
  if (digits.startsWith('82')) return `+${digits}`; // 82로 시작
  if (digits.startsWith('0')) return `+82${digits.slice(1)}`; // 0xx → +82xx
  return `+82${digits}`;
};

/**
 * 휴대폰 OTP 발송 (Supabase Phone Auth + Twilio)
 *
 * 사전 설정 (Supabase 대시보드):
 *   Authentication → Settings → Phone Auth → Enable phone confirmations: ON
 *   Authentication → Settings → Phone Auth → SMS Provider: Twilio
 *     - Account SID / Auth Token / Message Service SID (or From Number)
 *
 * @param {string} phone  - 한국 번호 (010-xxxx-xxxx or E.164)
 */
export const sendPhoneOtp = async (phone) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const e164 = toE164KR(phone);
  const { data, error } = await sb.auth.signInWithOtp({
    phone: e164,
  });
  return { data, error, e164 };
};

/**
 * 휴대폰 OTP 인증
 * @param {string} phone  - sendPhoneOtp에 사용한 번호 (E.164 or 원본)
 * @param {string} token  - 수신한 6자리 OTP
 */
export const verifyPhoneOtp = async (phone, token) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const e164 = toE164KR(phone);
  const { data, error } = await sb.auth.verifyOtp({
    phone: e164,
    token,
    type: 'sms',
  });
  return { data, error };
};

/**
 * 이미 로그인한 유저의 휴대폰 번호 업데이트
 * → 회원가입 후 프로필에 폰 번호를 저장할 때 사용
 * @param {string} phone  - E.164 or 한국 번호
 */
export const updateUserPhone = async (phone) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const e164 = toE164KR(phone);
  const { data, error } = await sb.auth.updateUser({ phone: e164 });
  return { data, error };
};

/** 이메일 + 비밀번호로 회원가입 */
export const signUp = async ({ email, password, name, role }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, role },   // user_metadata
    },
  });
  return { data, error };
};

/** 이메일 + 비밀번호로 로그인 */
export const signIn = async ({ email, password }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
};

/** 구글 소셜 로그인 */
export const signInWithGoogle = async () => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  return { data, error };
};

/** 로그아웃 */
export const signOut = async () => {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
};

/** 현재 세션/유저 가져오기 */
export const getSession = async () => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
};

/** 비밀번호 재설정 이메일 전송 */
export const resetPassword = async (email) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  return sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
};

// ─── 이메일 OTP (회원가입 인증) ───────────────────────────────────────

/**
 * 이메일이 이미 가입된 계정인지 확인
 * shouldCreateUser: false → 존재하면 OTP 발송(에러 없음), 없으면 에러
 */
export const checkEmailExists = async (email) => {
  const sb = await getSupabase();
  if (!sb) return { exists: false };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (!error) return { exists: true };
  const msg = error.message?.toLowerCase() ?? '';
  // "email not confirmed" → 가입은 됐지만 인증 미완료
  if (msg.includes('not confirmed') || msg.includes('email link')) return { exists: true };
  return { exists: false };
};

/**
 * 이메일 OTP 발송 (신규 유저 생성 포함)
 * 인증 완료 시 Supabase 세션이 생성됨 → verifyEmailOtp 후 updateUserData 호출
 */
export const sendEmailOtp = async (email) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return { data, error };
};

/**
 * 이메일 OTP 인증 → 세션 생성
 */
export const verifyEmailOtp = async (email, token) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  return { data, error };
};

/**
 * 로그인된 유저의 비밀번호 + 메타데이터 업데이트
 * 이메일 OTP 인증 후 세션이 생성된 상태에서 호출
 */
export const updateUserData = async ({ password, data }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  return sb.auth.updateUser({ password, data });
};

/**
 * 로그인 후 유저의 role을 전환 (customer ↔ artist)
 * user_metadata.role + profiles 테이블 동시 업데이트
 */
export const switchUserRole = async (role) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  // 1. auth user_metadata 업데이트
  const { data, error } = await sb.auth.updateUser({
    data: { role },
  });
  if (error) return { data, error };
  // 2. profiles 테이블도 동기화
  const userId = data?.user?.id;
  if (userId) {
    await sb.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', userId);
  }
  return { data, error };
};

/** auth 상태 변경 리스너 등록 */
export const onAuthChange = async (callback) => {
  const sb = await getSupabase();
  if (!sb) return { data: { subscription: { unsubscribe: () => {} } } };
  return sb.auth.onAuthStateChange(callback);
};

// ─── 멀티롤 관리 (한 이메일 = 여러 역할) ─────────────────────────────

/**
 * 유저의 등록된 역할 목록 가져오기
 * user_roles 테이블이 없거나 오류 시 user_metadata.role fallback
 */
export const getUserRoles = async (userId) => {
  const sb = await getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('user_roles').select('role, status, created_at').eq('user_id', userId).order('created_at');
    if (error || !data || data.length === 0) {
      // fallback: user_metadata.role 또는 profiles.role 사용
      const { data: { user } } = await sb.auth.getUser();
      const metaRole = user?.user_metadata?.role;
      if (metaRole) return [{ role: metaRole, status: 'active' }];
      const { data: profile } = await sb.from('profiles').select('role').eq('id', userId).single();
      return profile?.role ? [{ role: profile.role, status: 'active' }] : [{ role: 'customer', status: 'active' }];
    }
    return data;
  } catch {
    return [{ role: 'customer', status: 'active' }];
  }
};

/**
 * 유저에게 역할 추가
 * 이미 있으면 무시 (upsert)
 * customer는 자동 승인(active), 그 외(artist/dress_vendor)는 승인 대기(pending)
 */
export const addUserRole = async (userId, role) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  // customer는 승인 불필요 → active, 나머지는 관리자 승인 필요 → pending
  const status = role === 'customer' ? 'active' : 'pending';
  try {
    // user_roles 테이블에 추가 시도
    const { error } = await sb.from('user_roles').upsert(
      { user_id: userId, role, status },
      { onConflict: 'user_id,role' }
    );
    if (error) {
      // 테이블 없으면 localStorage fallback
      const key = `phosnap_roles_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.includes(role)) {
        existing.push(role);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    }
    return { error: null };
  } catch (err) {
    // localStorage fallback
    const key = `phosnap_roles_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(role)) {
      existing.push(role);
      localStorage.setItem(key, JSON.stringify(existing));
    }
    return { error: null };
  }
};

/**
 * 유저의 역할 목록 가져오기 (localStorage fallback 포함)
 */
export const getUserRolesWithFallback = async (userId) => {
  // 1. Supabase user_roles 먼저 시도
  const roles = await getUserRoles(userId);
  if (roles.length > 0) {
    const roleNames = roles.map(r => r.role);
    // localStorage에 있는 역할도 병합
    const key = `phosnap_roles_${userId}`;
    const localRoles = JSON.parse(localStorage.getItem(key) || '[]');
    const merged = [...new Set([...roleNames, ...localRoles])];
    return merged;
  }
  // 2. localStorage fallback
  const key = `phosnap_roles_${userId}`;
  const localRoles = JSON.parse(localStorage.getItem(key) || '[]');
  return localRoles.length > 0 ? localRoles : ['customer'];
};

/**
 * 유저의 역할별 상태 (status) 포함 전체 정보 가져오기
 * 반환: [{ role: 'artist', status: 'pending' }, { role: 'customer', status: 'active' }]
 */
export const getUserRolesWithStatus = async (userId) => {
  const roles = await getUserRoles(userId);
  return roles.map(r => ({ role: r.role, status: r.status || 'active' }));
};

/**
 * 관리자: 특정 유저의 역할 승인 (pending → active)
 */
export const approveUserRole = async (userId, role) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('user_roles')
    .update({ status: 'active' })
    .eq('user_id', userId)
    .eq('role', role)
    .select();
  return { data, error };
};

/**
 * 관리자: 특정 유저의 역할 거절 (pending → rejected)
 */
export const rejectUserRole = async (userId, role) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('user_roles')
    .update({ status: 'rejected' })
    .eq('user_id', userId)
    .eq('role', role)
    .select();
  return { data, error };
};

/**
 * 관리자: 승인 대기 중인 모든 역할 조회
 */
export const getPendingRoleRequests = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('user_roles')
    .select('user_id, role, status, created_at, profiles(full_name, phone, real_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return { data: data || [], error };
};

/**
 * 기존 이메일로 로그인 시도 → 성공하면 역할 추가
 * 작가/벤더 가입 시 이미 계정이 있을 때 사용
 */
export const signInAndAddRole = async ({ email, password, role }) => {
  const result = await signIn({ email, password });
  if (result.error) return result;
  const userId = result.data?.user?.id;
  if (userId) {
    await addUserRole(userId, role);
    // activeRole을 새 역할로 전환
    await switchUserRole(role);
  }
  return result;
};

// ─── DB 헬퍼 ─────────────────────────────────────────────────────────

/** profiles 테이블에서 유저 프로필 가져오기 */
export const getProfile = async (userId) => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  return data;
};

/** profiles 테이블 upsert */
export const upsertProfile = async (profile) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  return sb.from('profiles').upsert(profile);
};

/**
 * 작가/헤메 공개 레코드를 보장한다.
 *
 * 회원가입 시 profiles 만 저장하면 고객에게 노출되는 photographers /
 * stylists 테이블에 아무 것도 남지 않아 작가가 검색되지 않는다.
 * 이 함수는 해당 user_id 의 공개 레코드가 없으면 새로 만들고,
 * 있으면 그대로 반환한다. (가입 직후 · 대시보드 진입 시 양쪽에서 호출)
 *
 * @param {string} userId          auth.users.id
 * @param {Object} info
 * @param {string} info.artistType 'photographer'|'videographer'|'both'|'hmk'
 * @param {string} info.nativeName 한글 활동명
 * @param {string} info.englishName 영문 활동명
 * @param {string[]} info.portfolioUrls
 * @param {string} info.instagram
 * @param {boolean} info.hmkSelf
 * @param {boolean} info.dressSelf
 * @returns {{ data, error, kind }}  kind: 'photographer' | 'stylist'
 */
export const ensureArtistRecord = async (userId, info = {}) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' }, kind: null };
  if (!userId) return { data: null, error: { message: 'userId 없음' }, kind: null };

  const {
    artistType = 'photographer',
    nativeName = '',
    englishName = '',
    portfolioUrls = [],
    instagram = null,
    hmkSelf = false,
    dressSelf = false,
  } = info;

  const isHmk = artistType === 'hmk';
  const table = isHmk ? 'stylists' : 'photographers';
  const kind  = isHmk ? 'stylist' : 'photographer';

  // 이미 있으면 그대로 사용
  const { data: existing, error: findErr } = await sb
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (findErr) return { data: null, error: findErr, kind };
  if (existing) return { data: existing, error: null, kind };

  const row = isHmk
    ? {
        user_id:          userId,
        name_ko:          nativeName || '이름 미설정',
        name_en:          englishName || null,
        specialty:        'both',
        instagram,
        portfolio_images: portfolioUrls,
        is_active:        false,   // 필수 정보 입력 전까지 비노출
      }
    : {
        user_id:      userId,
        name:         englishName || nativeName || 'Unnamed',
        name_ko:      nativeName || null,
        artist_type:  artistType,
        hmk_self:     hmkSelf,
        dress_self:   dressSelf,
        portfolio:    portfolioUrls.map(url => ({ url, caption: '' })),
        languages:    ['KO'],
        is_active:    false,       // 필수 정보 입력 전까지 비노출
      };

  const { data, error } = await sb.from(table).insert(row).select().maybeSingle();
  return { data, error, kind };
};

/** 로그인한 사용자의 작가 공개 레코드를 조회한다 (없으면 null) */
export const getMyArtistRecord = async (userId) => {
  const sb = await getSupabase();
  if (!sb || !userId) return { data: null, error: null, kind: null };

  const { data: photog } = await sb
    .from('photographers').select('*').eq('user_id', userId).maybeSingle();
  if (photog) return { data: photog, error: null, kind: 'photographer' };

  const { data: stylist } = await sb
    .from('stylists').select('*').eq('user_id', userId).maybeSingle();
  if (stylist) return { data: stylist, error: null, kind: 'stylist' };

  return { data: null, error: null, kind: null };
};

// ─── 결제 서버 검증 (Edge Function) ────────────────────────────────────

/**
 * TossPayments 결제를 서버에서 검증(confirm) 후 예약을 저장합니다.
 * 클라이언트에서 직접 DB insert하지 않고, Edge Function을 경유합니다.
 *
 * @param {Object} params
 * @param {string} params.paymentKey  - TossPayments paymentKey
 * @param {string} params.orderId     - 주문번호
 * @param {number} params.amount      - 결제 금액
 * @param {Object} params.meta        - 예약 메타데이터 (artist, date, etc.)
 * @returns {{ success, bookingId, error, duplicate }}
 */
export const confirmPayment = async ({
  paymentKey, orderId, amount,
  photographerName, photographerLegacyId,
  date, time, packageName,
  stylistPrice, dressPrice, lang, note,
}) => {
  const sb = await getSupabase();
  if (!sb) return { success: false, error: 'Supabase 연결 실패' };

  // 현재 세션 토큰 가져오기
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) {
    return { success: false, error: 'Authentication required' };
  }

  const fnUrl = `${SUPABASE_URL}/functions/v1/confirm-payment`;

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        paymentKey, orderId, amount: Number(amount),
        photographerName, photographerLegacyId,
        date, time, packageName,
        stylistPrice: Number(stylistPrice || 0),
        dressPrice: Number(dressPrice || 0),
        lang, note,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message || 'Network error' };
  }
};

/**
 * TossPayments 결제 취소/환불을 서버에서 처리합니다.
 * 환불 정책에 따라 전액/50%/0% 자동 계산.
 *
 * @param {string} bookingId — 예약 UUID
 * @param {string} [reason]  — 취소 사유
 * @returns {{ success, cancelled, refunded, refundAmount, refundRate, error }}
 */
export const cancelPaymentServer = async (bookingId, reason = '') => {
  const sb = await getSupabase();
  if (!sb) return { success: false, error: 'Supabase 연결 실패' };

  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) {
    return { success: false, error: 'Authentication required' };
  }

  const fnUrl = `${SUPABASE_URL}/functions/v1/cancel-payment`;

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ bookingId, reason }),
    });

    return await res.json();
  } catch (err) {
    return { success: false, error: err.message || 'Network error' };
  }
};

// ─── Bookings (Legacy — confirmPayment 미사용 시 fallback) ────────────

/**
 * 예약 생성 (TossPayments 결제 성공 후 호출)
 * ⚠ 프로덕션에서는 confirmPayment()를 사용하세요.
 *
 * @param {Object} booking
 * @param {string} booking.customer_id          - auth.uid()
 * @param {string} booking.photographer_name    - 작가 이름 (URL param)
 * @param {string} [booking.photographer_legacy_id] - mock 작가 ID (숫자 문자열)
 * @param {string} booking.date                 - 'YYYY-MM-DD'
 * @param {string} booking.time                 - 'HH:MM'
 * @param {string} booking.package_name         - 패키지명
 * @param {number} booking.package_price        - 패키지 금액
 * @param {number} booking.total_price          - 최종 결제 금액
 * @param {string} booking.toss_order_id        - Toss 주문번호
 * @param {string} booking.toss_payment_key     - Toss paymentKey
 * @param {string} [booking.lang]               - 예약 시 언어 ('ko'|'en'|'ja'|'zh')
 * @param {string} [booking.note]               - 고객 메모
 */
export const createBooking = async (booking) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };

  const payload = {
    customer_id:              booking.customer_id,
    photographer_id:          booking.photographer_id || null,
    photographer_name:        booking.photographer_name || null,
    photographer_legacy_id:   booking.photographer_legacy_id || null,
    date:                     booking.date,
    time:                     booking.time,
    package_name:             booking.package_name,
    package_price:            Number(booking.package_price) || 0,
    total_price:              Number(booking.total_price)   || 0,
    stylist_price:            Number(booking.stylist_price) || 0,
    stylist_name:             booking.stylist_name || null,
    stylist_service:          booking.stylist_service || null,
    dress_name:               booking.dress_name || null,
    dress_size:               booking.dress_size || null,
    dress_price:              Number(booking.dress_price) || 0,
    toss_order_id:            booking.toss_order_id || null,
    toss_payment_key:         booking.toss_payment_key || null,
    paid_at:                  booking.toss_payment_key ? new Date().toISOString() : null,
    status:                   'pending',   // 결제 완료, 작가 확정 대기
    lang:                     booking.lang || 'ko',
    note:                     booking.note || null,
  };

  const { data, error } = await sb
    .from('bookings')
    .insert([payload])
    .select()
    .single();

  if (!error && data) {
    // Send notifications (fire-and-forget)
    const session = await getSession();
    if (session?.user?.email) {
      sendNotification({
        type: 'booking_created_customer',
        bookingId: data.id,
        recipientEmail: session.user.email,
        recipientName: session.user.user_metadata?.name || '',
        lang: payload.lang,
        data: {
          photographerName: payload.photographer_name,
          date: payload.date,
          time: payload.time,
          packageName: payload.package_name,
          totalPrice: payload.total_price,
        },
      }).catch(() => {});
    }

    // Notify artist if photographer_legacy_id exists
    if (payload.photographer_legacy_id) {
      // Try to fetch photographer email from photographers table
      const { data: photographer } = await sb
        .from('photographers')
        .select('email, name')
        .eq('legacy_id', String(payload.photographer_legacy_id))
        .maybeSingle();

      if (photographer?.email) {
        sendNotification({
          type: 'booking_created_artist',
          bookingId: data.id,
          recipientEmail: photographer.email,
          recipientName: photographer.name || '',
          lang: payload.lang,
          data: {
            customerName: session?.user?.user_metadata?.name || 'Customer',
            date: payload.date,
            time: payload.time,
            packageName: payload.package_name,
            totalPrice: payload.total_price,
          },
        }).catch(() => {});
      }
    }
  }

  return { data, error };
};

/**
 * 로그인한 고객의 예약 목록 조회 (최신순)
 */
export const getMyBookings = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/**
 * 특정 toss_order_id로 예약 존재 여부 확인
 * → 성공 페이지 새로고침 시 중복 저장 방지
 */
export const getBookingByOrderId = async (orderId) => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('bookings')
    .select('id, toss_order_id')
    .eq('toss_order_id', orderId)
    .maybeSingle();
  return data;
};

// ─── 작가 예약 확정/거절 ──────────────────────────────────────────────

/** 작가가 예약 수락 */
export const approveBooking = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('bookings')
    .update({ status: 'confirmed', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select().single();

  if (!error && data) {
    // 앱 내 알림을 고객에게 보낸다.
    // 예전에는 존재하지 않는 `_customers` 테이블을 조회해 알림이 전혀
    // 발송되지 않았다. customer_id 를 바로 쓰면 조회가 필요 없다.
    sendNotificationTo(data.customer_id, {
      type:  'booking_confirmed',
      title: '예약이 확정되었습니다',
      body:  `${data.photographer_name || '작가'} · ${data.date} ${data.time}`,
      link:  '/my',
      metadata: { bookingId: data.id },
    }).catch(() => {});
  }

  return { data, error };
};

/** 작가가 예약 거절 */
export const rejectBooking = async (bookingId, reason = '') => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('bookings')
    .update({ status: 'cancelled', rejected_reason: reason, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select().single();

  if (!error && data) {
    sendNotificationTo(data.customer_id, {
      type:  'booking_rejected',
      title: '예약이 거절되었습니다',
      body:  reason ? `사유: ${reason}` : `${data.photographer_name || '작가'} · ${data.date} ${data.time}`,
      link:  '/my',
      metadata: { bookingId: data.id },
    }).catch(() => {});
  }

  return { data, error };
};

/** 특정 작가(legacy_id)의 대기 중 예약 목록 */
export const getPendingBookings = async (photographerId) => {
  const sb = await getSupabase();
  if (!sb || !photographerId) return { data: [], error: null };
  // 예약은 photographer_id(UUID) 로 저장된다. 예전에는
  // photographer_legacy_id 로 조회해 작가가 예약 요청을 볼 수 없었다.
  const { data, error } = await sb.from('bookings')
    .select('*')
    .eq('status', 'pending')
    .eq('photographer_id', photographerId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
};

/** 특정 작가의 모든 예약 목록 (대시보드용) */
export const getArtistBookings = async (photographerId) => {
  const sb = await getSupabase();
  if (!sb || !photographerId) return { data: [], error: null };
  const { data, error } = await sb.from('bookings')
    .select('*')
    .eq('photographer_id', photographerId)
    .order('date', { ascending: true });
  return { data: data || [], error };
};

/**
 * 예약 취소
 * - status → 'cancelled', cancelled_at → now()
 */
export const cancelBooking = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('bookings')
    .update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();
  return { data, error };
};

/**
 * 일정 변경 요청 저장
 * - reschedule_request 필드에 메모 저장
 */
export const requestReschedule = async (bookingId, message) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('bookings')
    .update({
      reschedule_request: message,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();
  return { data, error };
};

// ─── Reviews ─────────────────────────────────────────────────────────

/**
 * 리뷰 작성
 * @param {Object} review
 * @param {string} review.photographer_id — 작가 UUID (또는 legacy ID)
 * @param {string} review.booking_id      — 예약 UUID
 * @param {number} review.rating          — 1~5
 * @param {string} review.text            — 리뷰 텍스트
 * @param {string} [review.author_name]   — 표시 이름
 * @param {string} [review.lang]          — 작성 언어
 */
export const submitReview = async (review) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };

  const payload = {
    photographer_id: review.photographer_id,
    booking_id:      review.booking_id || null,
    customer_id:     session.user.id,
    rating:          review.rating,
    text:            review.text || '',
    // ⚠ Privacy: full_name = 활동명/업체명 (display name), NOT 실명(real_name). Safe for customer display.
    author_name:     review.author_name || session.user.user_metadata?.full_name || 'Anonymous',
    lang:            review.lang || 'ko',
  };

  const { data, error } = await sb
    .from('reviews')
    .insert([payload])
    .select()
    .single();

  return { data, error };
};

/**
 * 특정 작가의 리뷰 목록 조회 (최신순)
 * @param {string} photographerId — photographer UUID
 * @param {number} [limit=50]
 */
export const getPhotographerReviews = async (photographerId, limit = 50) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .eq('photographer_id', photographerId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

/**
 * 특정 예약에 이미 리뷰가 있는지 확인
 */
export const getReviewByBookingId = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('reviews')
    .select('id, rating')
    .eq('booking_id', bookingId)
    .maybeSingle();
  return data;
};

// ─── Dress Vendors ───────────────────────────────────────────────────

/**
 * 의상 업체 등록 (가입 후 dress_vendors 테이블에 삽입)
 */
export const createDressVendor = async (vendor) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('dress_vendors')
    .insert([vendor])
    .select()
    .single();
  return { data, error };
};

/**
 * 현재 로그인한 유저의 업체 프로필 조회
 */
/**
 * 벤더 공개 레코드를 보장한다.
 *
 * 가입 시 createDressVendor 가 스키마 불일치로 실패했던 계정, 또는
 * 구버전 가입자는 dress_vendors 레코드가 없어 대시보드가 mock 을
 * 보여준다. 작가의 ensureArtistRecord 와 같은 역할.
 *
 * @param {string} userId auth.users.id
 * @param {Object} info { nameKo, nameEn, vendorType }
 */
export const ensureVendorRecord = async (userId, info = {}) => {
  const sb = await getSupabase();
  if (!sb || !userId) return { data: null, error: null };

  const { data: existing, error: findErr } = await sb
    .from('dress_vendors').select('*').eq('user_id', userId).maybeSingle();
  if (findErr) return { data: null, error: findErr };
  if (existing) return { data: existing, error: null };

  const { nameKo = '', nameEn = '', vendorType = 'costume' } = info;
  const { data, error } = await sb.from('dress_vendors').insert({
    user_id:     userId,
    name:        nameKo || nameEn || '이름 미설정',
    name_ko:     nameKo || null,
    name_en:     nameEn || null,
    vendor_type: vendorType,
    is_active:   false,   // 업체명·소개 입력 전까지 비노출
  }).select().maybeSingle();
  return { data, error };
};

export const getMyVendorProfile = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: null };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { data: null, error: null };
  const { data, error } = await sb
    .from('dress_vendors')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return { data, error };
};

/**
 * 업체 프로필 업데이트
 */
export const updateVendorProfile = async (vendorId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('dress_vendors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
    .select()
    .single();
  return { data, error };
};

// ─── Vendor Dresses (의상 CRUD) ──────────────────────────────────────

/**
 * 업체의 의상 목록 조회
 */
export const getVendorDresses = async (vendorId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('vendor_dresses')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/**
 * 의상 등록
 */
export const addVendorDress = async (dress) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('vendor_dresses')
    .insert([dress])
    .select()
    .single();
  return { data, error };
};

/**
 * 의상 수정 (availability toggle 등)
 */
export const updateVendorDress = async (dressId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('vendor_dresses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', dressId)
    .select()
    .single();
  return { data, error };
};

/**
 * 의상 삭제
 */
export const deleteVendorDress = async (dressId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  return sb.from('vendor_dresses').delete().eq('id', dressId);
};

/**
 * 업체의 예약 현황 조회 (dress_name 기준)
 */
export const getVendorBookings = async (vendorId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  // bookings 테이블에 vendor_id가 없으므로, dress_vendor 이름으로 조회
  // 추후 bookings에 dress_vendor_id 컬럼 추가 시 직접 조인
  const { data: vendor } = await sb
    .from('dress_vendors')
    .select('name_ko')
    .eq('id', vendorId)
    .single();
  if (!vendor) return { data: [], error: null };

  // 현재는 빈 배열 반환 (bookings와 vendor 연결 후 구현)
  return { data: [], error: null };
};

// ─── Packages (상품 CRUD) ───────────────────────────────────────────

/**
 * 작가의 상품 목록 조회
 * @param {string} photographerId — photographer UUID
 * @param {string} [type] — 'snap'|'tour'|'costume'|'prop' (optional filter)
 */
export const getPackages = async (photographerId, type) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  let q = sb.from('packages').select('*')
    .eq('photographer_id', photographerId)
    .order('sort_order', { ascending: true });
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  return { data: data || [], error };
};

/** 상품 등록 */
export const createPackage = async (pkg) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('packages')
    .insert([pkg]).select().single();
  return { data, error };
};

/** 상품 수정 */
export const updatePackage = async (pkgId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('packages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', pkgId).select().single();
  return { data, error };
};

/** 상품 삭제 */
export const deletePackage = async (pkgId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  return sb.from('packages').delete().eq('id', pkgId);
};

/**
 * packages 테이블 row 를 대시보드가 쓰는 로컬 형태로 되돌린다.
 * 컬럼명(description/duration_hours/edit_count/regions)과 UI 필드명
 * (desc/duration/editedCount/regionIds)이 달라 변환이 없으면 불러온
 * 상품의 입력칸이 전부 비어 보인다.
 */
export const fromPackageRow = (row) => {
  const base = {
    id:        row.id,
    name:      row.name || '',
    desc:      row.description || '',
    price:     row.price ?? '',
    images:    row.images || [],
    regionIds: row.regions || [],
    coverIdx:  0,
    type:      row.type,
  };
  if (row.type === 'snap') {
    const h = row.duration_hours;
    base.duration    = h === 0.5 ? '30분' : `${Number(h) % 1 === 0 ? Number(h) : h}시간`;
    base.editedCount = row.edit_count ?? '';
  }
  if (row.type === 'tour') {
    base.durationMin = row.duration_min ?? '';
    base.spots       = row.spots || [];
  }
  if (row.type === 'costume') {
    base.gender   = row.gender === 'male' ? '남성' : row.gender === 'female' ? '여성' : '공용';
    base.category = row.category || '한복';
  }
  return base;
};

/** 대시보드의 로컬 상품 형태를 packages 테이블 row 로 변환 */
const toPackageRow = (photographerId, item, type, sortOrder) => {
  const num = (v) => {
    const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };
  const row = {
    photographer_id: photographerId,
    type,
    name:        (item.name || '').trim() || '(이름 없음)',
    description: item.desc || item.description || '',
    price:       num(item.price),
    images:      item.images || [],
    regions:     item.regionIds || [],
    sort_order:  sortOrder,
    is_active:   true,
    updated_at:  new Date().toISOString(),
  };
  if (type === 'snap') {
    row.duration_hours = parseFloat(String(item.duration || '1').replace(/[^0-9.]/g, '')) || 1;
    row.edit_count     = num(item.editedCount);
  }
  if (type === 'tour') {
    row.duration_min = num(item.durationMin) || null;
    row.spots        = item.spots || [];
  }
  if (type === 'costume') {
    const g = item.gender === '남성' ? 'male' : item.gender === '여성' ? 'female' : 'unisex';
    row.gender   = g;
    row.category = item.category || null;
  }
  return row;
};

/**
 * 작가의 상품 목록을 packages 테이블에 통째로 반영한다 (해당 type 만 교체).
 *
 * 대시보드는 상품을 photographers.packages(jsonb) 에 저장했는데 읽을 때는
 * packages 테이블에서 조회해, 저장한 상품이 다시 로드되지 않는 문제가 있었다.
 * 저장 경로를 테이블로 일원화한다.
 *
 * @param {string} photographerId
 * @param {string} type 'snap'|'tour'|'costume'|'prop'
 * @param {Array}  items 대시보드 로컬 상품 배열
 */
export const replacePackages = async (photographerId, type, items = []) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  if (!photographerId) return { error: { message: 'photographerId 없음' } };

  const { error: delErr } = await sb.from('packages')
    .delete().eq('photographer_id', photographerId).eq('type', type);
  if (delErr) return { error: delErr };

  if (!items.length) return { data: [], error: null };

  const rows = items.map((item, i) => toPackageRow(photographerId, item, type, i));
  const { data, error } = await sb.from('packages').insert(rows).select();
  return { data: data || [], error };
};

// ─── Artist Schedules (스케줄 CRUD) ─────────────────────────────────

/**
 * 작가의 특정 월 스케줄 조회
 * @param {string} photographerId — photographer UUID
 * @param {number} year
 * @param {number} month — 1~12
 */
export const getScheduleMonth = async (photographerId, year, month) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day
  const { data, error } = await sb.from('artist_schedules').select('*')
    .eq('photographer_id', photographerId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  return { data: data || [], error };
};

/** 날짜별 스케줄 upsert (차단 슬롯, 휴무 등) */
export const upsertScheduleDate = async (photographerId, date, { dayOff, slots, blocked }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const payload = {
    photographer_id: photographerId,
    date,
    day_off: dayOff ?? false,
    updated_at: new Date().toISOString(),
  };
  if (slots !== undefined) payload.slots = slots;
  if (blocked !== undefined) payload.blocked = blocked;
  const { data, error } = await sb.from('artist_schedules')
    .upsert(payload, { onConflict: 'photographer_id,date' })
    .select().single();
  return { data, error };
};

/** 여러 날짜 일괄 upsert (범위 열기) */
export const upsertScheduleBatch = async (photographerId, entries) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const payloads = entries.map(e => ({
    photographer_id: photographerId,
    date: e.date,
    day_off: e.dayOff ?? false,
    slots: e.slots || [],
    blocked: e.blocked || [],
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await sb.from('artist_schedules')
    .upsert(payloads, { onConflict: 'photographer_id,date' })
    .select();
  return { data, error };
};

/** 기본 운영 시간 조회 */
export const getDefaultSlots = async (photographerId) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: null };
  const { data, error } = await sb.from('artist_defaults').select('*')
    .eq('photographer_id', photographerId).maybeSingle();
  return { data, error };
};

/** 기본 운영 시간 upsert */
export const upsertDefaultSlots = async (photographerId, defaultSlots) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('artist_defaults')
    .upsert({
      photographer_id: photographerId,
      default_slots: defaultSlots,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'photographer_id' })
    .select().single();
  return { data, error };
};

// ─── Booking Conflict Check ─────────────────────────────────────────

/**
 * 특정 작가+날짜에 이미 확정/대기 중인 예약 시간 목록 조회
 * → Booking.jsx에서 슬롯 비활성화에 사용
 */
export const getBookedSlots = async (photographerId, date) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('bookings')
    .select('time, status')
    .eq('photographer_id', photographerId)
    .eq('date', date)
    .in('status', ['pending', 'confirmed']);
  return { data: data || [], error };
};

// ─── 48시간 자동 만료 (Edge Function 호출용) ────────────────────────

/**
 * 만료된 pending 예약 자동 취소 (서버 함수 호출)
 * pg_cron 미사용 시 클라이언트/Edge Function에서 주기적 호출
 */
export const expireStaleBookings = async () => {
  const sb = await getSupabase();
  if (!sb) return { count: 0, error: 'Supabase 연결 실패' };
  const { data, error } = await sb.rpc('expire_stale_bookings');
  return { count: data || 0, error };
};

// ─── Stylist CRUD ──────────────────────────────────────────────────

/** Get stylist profile by user_id */
export const getStylistProfile = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: null };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };
  const { data, error } = await sb.from('stylists')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return { data, error };
};

/** Update stylist profile */
export const updateStylistProfile = async (stylistId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('stylists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', stylistId)
    .select().single();
  return { data, error };
};

/** Get stylist's bookings (by stylist name match in bookings table) */
export const getStylistBookings = async (stylistId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  // First get stylist name
  const { data: stylist } = await sb.from('stylists').select('name_ko, name_en').eq('id', stylistId).maybeSingle();
  if (!stylist) return { data: [], error: null };
  // Search bookings where stylist_name matches
  const { data, error } = await sb.from('bookings')
    .select('*')
    .or(`stylist_name.eq.${stylist.name_ko},stylist_name.eq.${stylist.name_en}`)
    .order('date', { ascending: false });
  return { data: data || [], error };
};

// ─── Stylist Services CRUD ─────────────────────────────────────────

/** Get all services for a stylist */
export const getStylistServices = async (stylistId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('stylist_services')
    .select('*')
    .eq('stylist_id', stylistId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return { data: data || [], error };
};

/** Create a new stylist service */
export const createStylistService = async (serviceData) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('stylist_services')
    .insert([serviceData]).select().single();
  return { data, error };
};

/** Update a stylist service */
export const updateStylistService = async (serviceId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('stylist_services')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .select().single();
  return { data, error };
};

/** Delete a stylist service (soft delete) */
export const deleteStylistService = async (serviceId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { error } = await sb.from('stylist_services')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', serviceId);
  return { error };
};

// ─── Dress Items (DB version of dresses.js) ────────────────────────

/** Get dress items, optionally filtered by vendor or location */
export const getDressItems = async ({ vendorId, locationId, category } = {}) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  let q = sb.from('dress_items').select('*, dress_vendors(id, name_ko, location_id)')
    .eq('is_available', true);
  if (vendorId) q = q.eq('vendor_id', vendorId);
  if (category) q = q.eq('category', category);
  if (locationId) {
    q = q.eq('dress_vendors.location_id', locationId);
  }
  q = q.order('sort_order', { ascending: true });
  const { data, error } = await q;
  return { data: data || [], error };
};

/** Get dress items booked for a specific date (for availability check) */
export const getBookedDresses = async (date) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('bookings')
    .select('dress_name, dress_size')
    .eq('date', date)
    .in('status', ['pending', 'confirmed']);
  return { data: data || [], error };
};

// ─── Stylists listing (for Booking Step 3) ─────────────────────────

/** Get active stylists, optionally filtered by location */
export const getStylists = async (locationId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  let q = sb.from('stylists')
    .select('*, stylist_services(*)')
    .eq('is_active', true);
  if (locationId) q = q.eq('location_id', locationId);
  q = q.order('rating', { ascending: false });
  const { data, error } = await q;
  return { data: data || [], error };
};

// ─── Photo Delivery (드라이브 링크 전달) ───────────────────────────

/** Artist delivers photos (updates booking with delivery URL) */
export const deliverPhotos = async (bookingId, { deliveryUrl, deliveryMemo }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('bookings')
    .update({
      delivery_url: deliveryUrl,
      delivery_memo: deliveryMemo || null,
      delivered_at: new Date().toISOString(),
      status: 'delivered',
    })
    .eq('id', bookingId)
    .select().single();

  if (!error && data) {
    // 사진 전달 알림 (앱 내). `_customers` 테이블은 존재하지 않는다.
    sendNotificationTo(data.customer_id, {
      type:  'photos_delivered',
      title: '사진이 전달되었습니다',
      body:  `${data.photographer_name || '작가'} · ${data.date}`,
      link:  '/my',
      metadata: { bookingId: data.id, deliveryUrl },
    }).catch(() => {});
  }

  return { data, error };
};

// ─── Photographers (DB queries replacing mock) ────────────────────

/**
 * photographers 테이블 row 를 화면 컴포넌트가 기대하는 형태로 변환한다.
 *
 * PhotographerCard / Profile 등은 원래 mock 데이터(camelCase, price/reviews)
 * 를 기준으로 만들어져 있어 DB row(snake_case, price_from/reviews_count)를
 * 그대로 넘기면 `undefined.toLocaleString()` 으로 화면이 통째로 깨진다.
 */
export const toPhotographerCard = (row) => {
  if (!row) return null;
  return {
    ...row,
    id:            row.id,
    name:          row.name || row.name_ko || 'Unnamed',
    nameKo:        row.name_ko || row.name || '',
    price:         row.price_from ?? 0,
    rating:        row.rating ?? 0,
    reviews:       row.reviews_count ?? 0,
    location:      row.location_id || '',
    locationNames: row.location_names || {},
    languages:     row.languages || [],
    tags:          row.tags || [],
    img:           row.img || null,
    portfolio:     Array.isArray(row.portfolio) ? row.portfolio : [],
    packages:      Array.isArray(row.packages) ? row.packages : [],
    featuredPortfolio: Array.isArray(row.portfolio) ? row.portfolio.slice(0, 5) : [],
    hmkAvailable:  row.hmk_available ?? false,
    countryCode:   row.country_code || 'KR',
    city:          row.city || '',
  };
};

/** Fetch photographers with filters (replaces client-side filtering) */
export const fetchPhotographers = async ({
  countryCode, city, genre, language, tags,
  minPrice, maxPrice, minRating,
  sortBy, search, limit = 50, offset = 0
} = {}) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };

  let q = sb.from('photographers').select('*', { count: 'exact' })
    .eq('is_active', true);

  if (countryCode) q = q.eq('country_code', countryCode);
  if (city) q = q.eq('city', city);
  if (genre) q = q.contains('tags', [genre]);
  if (language) q = q.contains('languages', [language]);
  if (minRating) q = q.gte('rating', parseFloat(minRating));
  if (minPrice) q = q.gte('price_from', parseInt(minPrice));
  if (maxPrice) q = q.lte('price_from', parseInt(maxPrice));
  if (search) q = q.or(`name.ilike.%${search}%,name_ko.ilike.%${search}%`);

  // Sort
  switch (sortBy) {
    case 'rating': q = q.order('rating', { ascending: false }); break;
    case 'priceLow': q = q.order('price_from', { ascending: true }); break;
    case 'priceHigh': q = q.order('price_from', { ascending: false }); break;
    case 'newest': q = q.order('created_at', { ascending: false }); break;
    default: q = q.order('reviews_count', { ascending: false }); // popular
  }

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  return { data: (data || []).map(toPhotographerCard), error, count };
};

/** Fetch single photographer by ID (legacy_id or UUID) */
export const fetchPhotographer = async (idOrLegacy) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: null };

  const isUuid = typeof idOrLegacy === 'string' && idOrLegacy.includes('-');
  // photographers 테이블에는 legacy_id 컬럼이 없으므로 UUID 조회만 지원한다.
  if (!isUuid) return { data: null, error: null };
  const { data, error } = await sb.from('photographers')
    .select('*')
    .eq('id', idOrLegacy)
    .maybeSingle();
  return { data: toPhotographerCard(data), error };
};

/** Fetch featured photographers for Home page */
export const fetchFeaturedPhotographers = async (limit = 6) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('photographers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .order('reviews_count', { ascending: false })   // 컬럼명은 reviews_count
    .limit(limit);
  return { data: (data || []).map(toPhotographerCard), error };
};

/** Save waitlist entry */
export const saveWaitlistEntry = async (email, name, lang) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('waitlist')
    .upsert({ email, name, lang }, { onConflict: 'email' })
    .select().single();
  return { data, error };
};

// ─── Email Notification Helper ─────────────────────────────────────

/** Send email notification via Edge Function */
export const sendNotification = async ({ type, bookingId, recipientEmail, recipientName, lang = 'ko', data = {} }) => {
  const sb = await getSupabase();
  if (!sb) return { error: 'Supabase 연결 실패' };
  try {
    const { data: result, error } = await sb.functions.invoke('send-notification', {
      body: { type, bookingId, recipientEmail, recipientName, lang, data },
    });
    if (error) throw error;
    return { data: result, error: null };
  } catch (err) {
    return { error: err.message };
  }
};

// ─── Package Reviews ───────────────────────────────────────────────

export const submitPackageReview = async (review) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };
  const { data, error } = await sb.from('package_reviews').insert([{
    booking_id: review.booking_id,
    package_id: review.package_id || null,
    photographer_id: review.photographer_id,
    customer_id: session.user.id,
    rating: review.rating,
    title: review.title || '',
    body: review.body || '',
  }]).select().single();
  return { data, error };
};

export const getPackageReviewByBookingId = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('package_reviews')
    .select('*').eq('booking_id', bookingId).maybeSingle();
  return data;
};

export const getPackageReviews = async (photographerId, limit = 50) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('package_reviews')
    .select('*').eq('photographer_id', photographerId)
    .order('created_at', { ascending: false }).limit(limit);
  return { data: data || [], error };
};

// ─── Photographer Reviews ──────────────────────────────────────────

export const submitPhotographerReview = async (review) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };
  const { data, error } = await sb.from('photographer_reviews').insert([{
    booking_id: review.booking_id,
    photographer_id: review.photographer_id,
    customer_id: session.user.id,
    rating: review.rating,
    title: review.title || '',
    body: review.body || '',
    tags: review.tags || [],
  }]).select().single();
  return { data, error };
};

export const getPhotographerReviewByBookingId = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('photographer_reviews')
    .select('*').eq('booking_id', bookingId).maybeSingle();
  return data;
};

export const getPhotographerReviewsV2 = async (photographerId, limit = 50) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('photographer_reviews')
    .select('*').eq('photographer_id', photographerId)
    .order('created_at', { ascending: false }).limit(limit);
  return { data: data || [], error };
};

// ─── 리뷰 수 + 평균 평점 (패키지 + 작가 합산) ──────────────────────────
export const getReviewStats = async (photographerId) => {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const [pkg, art] = await Promise.all([
      sb.from('package_reviews').select('rating', { count: 'exact' }).eq('photographer_id', photographerId),
      sb.from('photographer_reviews').select('rating', { count: 'exact' }).eq('photographer_id', photographerId),
    ]);
    const pkgRows = pkg.data || [];
    const artRows = art.data || [];
    const totalCount = (pkg.count || pkgRows.length) + (art.count || artRows.length);
    const allRatings = [...pkgRows, ...artRows].map(r => r.rating);
    const avgRating = allRatings.length > 0
      ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
      : null;
    return { count: totalCount, rating: avgRating };
  } catch {
    return null;
  }
};

// ─── Review Replies (작가 답글) ────────────────────────────────────

/** 작가가 리뷰에 답글 작성 / 수정 (upsert) */
export const submitReviewReply = async ({ reviewId, reviewType, body }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };
  const { data, error } = await sb.from('review_replies').upsert({
    review_id: reviewId,
    review_type: reviewType,
    photographer_id: session.user.id,
    body,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'review_id,review_type' }).select().single();
  return { data, error };
};

/** 특정 작가의 모든 답글 가져오기 */
export const getReviewRepliesByPhotographer = async (photographerId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('review_replies')
    .select('*').eq('photographer_id', photographerId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/** 여러 리뷰 ID에 대한 답글 가져오기 (프로필 페이지용) */
export const getReviewReplies = async (reviewIds, reviewType) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  if (!reviewIds?.length) return { data: [], error: null };
  const { data, error } = await sb.from('review_replies')
    .select('*')
    .in('review_id', reviewIds)
    .eq('review_type', reviewType);
  return { data: data || [], error };
};

// ─── Venue Vendors ──────────────────────────────────────────────────

/**
 * 모든 활성 venue vendors 조회
 */
export const getVenueVendors = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('venue_vendors')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/**
 * 특정 venue vendor를 ID로 조회
 */
export const getVenueVendorById = async (id) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: null };
  const { data, error } = await sb
    .from('venue_vendors')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return { data, error };
};

/**
 * 현재 로그인한 유저의 venue vendor 프로필 조회
 */
export const getMyVenueVendorProfile = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: null };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { data: null, error: null };
  const { data, error } = await sb
    .from('venue_vendors')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return { data, error };
};

/**
 * 새로운 venue vendor 등록 (현재 사용자가 소유)
 */
export const createVenueVendor = async (data) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };

  const payload = {
    ...data,
    user_id: session.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: result, error } = await sb
    .from('venue_vendors')
    .insert([payload])
    .select()
    .single();
  return { data: result, error };
};

/**
 * venue vendor 프로필 업데이트
 */
export const updateVenueVendorProfile = async (vendorId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('venue_vendors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
    .select()
    .single();
  return { data, error };
};

/**
 * venue vendor의 모든 items 조회
 */
export const getVenueItems = async (vendorId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('venue_items')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/**
 * 새로운 venue item 추가
 */
export const addVenueItem = async (vendorId, item) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const payload = {
    ...item,
    vendor_id: vendorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from('venue_items')
    .insert([payload])
    .select()
    .single();
  return { data, error };
};

/**
 * venue item 업데이트
 */
export const updateVenueItem = async (itemId, updates) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('venue_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();
  return { data, error };
};

/**
 * venue item 소프트 삭제 (is_available = false)
 */
export const deleteVenueItem = async (itemId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('venue_items')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();
  return { data, error };
};

/**
 * venue vendor의 예약 현황 조회 (venue_vendor_id 기준)
 */
export const getVenueVendorBookings = async (vendorId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('bookings')
    .select('*')
    .eq('venue_vendor_id', vendorId)
    .order('date', { ascending: true });
  return { data: data || [], error };
};

// ─── Chat (Supabase Realtime) ─────────────────────────────────────

/** 예약에 대한 채팅방 생성 또는 조회 */
export const getOrCreateChatRoom = async (bookingId, photographerId) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { data: null, error: { message: 'Auth required' } };
  const { data: existing } = await sb.from('chat_rooms')
    .select('*').eq('booking_id', bookingId).maybeSingle();
  if (existing) return { data: existing, error: null };
  const { data, error } = await sb.from('chat_rooms').insert([{
    booking_id: bookingId,
    photographer_id: photographerId,
    customer_id: session.user.id,
  }]).select().single();
  return { data, error };
};

/** 내가 참여한 채팅방 목록 */
export const getMyChatRooms = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('chat_rooms')
    .select('*, messages(content, created_at, sender_id)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/** 채팅방의 메시지 목록 */
export const getChatMessages = async (roomId, limit = 100) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('messages')
    .select('*').eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return { data: data || [], error };
};

/** 메시지 전송 */
export const sendChatMessage = async (roomId, content) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Auth required' } };
  const { data, error } = await sb.from('messages').insert([{
    room_id: roomId,
    sender_id: session.user.id,
    content,
  }]).select().single();
  return { data, error };
};

/** 메시지 읽음 처리 */
export const markMessagesRead = async (roomId) => {
  const sb = await getSupabase();
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return;
  await sb.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .neq('sender_id', session.user.id)
    .is('read_at', null);
};

/** Realtime 구독 — 새 메시지 수신 */
export const subscribeChatMessages = async (roomId, callback) => {
  const sb = await getSupabase();
  if (!sb) return null;
  return sb.channel(`room-${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}`,
    }, (payload) => callback(payload.new))
    .subscribe();
};

/** Realtime 구독 해제 */
export const unsubscribeChat = async (channel) => {
  if (!channel) return;
  const sb = await getSupabase();
  if (!sb) return;
  sb.removeChannel(channel);
};

// ─── Vendor Reviews (stylist / costume / venue) ──────────────────

/** 벤더 리뷰 저장 */
export const submitVendorReview = async (review) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };
  const { data, error } = await sb.from('vendor_reviews').insert([{
    booking_id: review.booking_id,
    customer_id: session.user.id,
    vendor_type: review.vendor_type,
    vendor_id: review.vendor_id || null,
    photographer_id: review.photographer_id || null,
    rating: review.rating,
    tags: review.tags || [],
    body: review.body || '',
  }]).select().single();
  return { data, error };
};

/** 벤더 타입별 리뷰 조회 */
export const getVendorReviewsByType = async (vendorType, vendorId = null) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  let query = sb.from('vendor_reviews')
    .select('*')
    .eq('vendor_type', vendorType)
    .eq('is_visible', true)
    .order('created_at', { ascending: false });
  if (vendorId) query = query.eq('vendor_id', vendorId);
  const { data, error } = await query;
  return { data: data || [], error };
};

/** 특정 예약의 벤더 리뷰 조회 */
export const getVendorReviewsByBooking = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('vendor_reviews')
    .select('*').eq('booking_id', bookingId);
  return { data: data || [], error };
};

/** 벤더 타입별 평균 평점 */
export const getVendorReviewStats = async (vendorType, vendorId = null) => {
  const sb = await getSupabase();
  if (!sb) return { avg: 0, count: 0 };
  let query = sb.from('vendor_reviews')
    .select('rating')
    .eq('vendor_type', vendorType)
    .eq('is_visible', true);
  if (vendorId) query = query.eq('vendor_id', vendorId);
  const { data } = await query;
  if (!data || data.length === 0) return { avg: 0, count: 0 };
  const sum = data.reduce((a, r) => a + r.rating, 0);
  return {
    avg: Math.round((sum / data.length) * 10) / 10,
    count: data.length,
  };
};

/** 벤더 리뷰 답글 제출 (업데이트) */
export const submitVendorReviewReply = async ({ reviewId, body }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Authentication required' } };
  const { data, error } = await sb.from('vendor_review_replies').upsert({
    review_id: reviewId,
    vendor_id: session.user.id,
    body,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'review_id' }).select().single();
  return { data, error };
};

/** 특정 벤더의 모든 리뷰 답글 가져오기 */
export const getVendorReviewRepliesByVendor = async (vendorId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.from('vendor_review_replies')
    .select('*').eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/** 여러 리뷰 ID에 대한 벤더 답글 가져오기 */
export const getVendorReviewReplies = async (reviewIds) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  if (!reviewIds?.length) return { data: [], error: null };
  const { data, error } = await sb.from('vendor_review_replies')
    .select('*')
    .in('review_id', reviewIds);
  return { data: data || [], error };
};

// ─── Profile Avatar (Supabase Storage) ────────────────────────────

/** 프로필 아바타 업로드 (Supabase Storage: avatars 버킷) */
export const uploadAvatar = async (file) => {
  const sb = await getSupabase();
  if (!sb) return { url: null, error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { url: null, error: { message: 'Auth required' } };
  const userId = session.user.id;
  const ext = file.name?.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  // 기존 파일 덮어쓰기 (upsert)
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return { url: null, error };
  const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
  // 캐시 방지용 timestamp
  const url = `${urlData.publicUrl}?t=${Date.now()}`;
  // profiles 테이블에도 avatar_url 저장
  await sb.from('profiles').update({ avatar_url: url }).eq('id', userId);
  return { url, error: null };
};

/** 프로필 아바타 URL 조회 */
export const getAvatarUrl = async () => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return null;
  const { data } = await sb.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle();
  return data?.avatar_url || null;
};

// ─── Notifications ────────────────────────────────────────────────

/** 내 알림 목록 조회 */
export const getMyNotifications = async (limit = 30) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { data: [], error: null };
  // RLS 가 막아주긴 하지만, 정책이 바뀌어도 남의 알림이 새지 않도록
  // 쿼리에서도 명시적으로 본인 것만 조회한다.
  const { data, error } = await sb.from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

/** 읽지 않은 알림 수 */
export const getUnreadNotificationCount = async () => {
  const sb = await getSupabase();
  if (!sb) return 0;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return 0;
  const { count } = await sb.from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .is('read_at', null);
  return count || 0;
};

/** 알림 읽음 처리 */
export const markNotificationRead = async (notificationId) => {
  const sb = await getSupabase();
  if (!sb) return;
  // 실제 컬럼은 read_at 이다 (기존 코드는 없는 is_read 를 갱신했다).
  await sb.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
};

/** 전체 알림 읽음 처리 */
export const markAllNotificationsRead = async () => {
  const sb = await getSupabase();
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return;
  await sb.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .is('read_at', null);
};

/** 알림 생성 (자기 자신에게) */
export const createNotification = async ({ type = 'info', title, body = '', link = '', metadata = {} }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return { error: { message: 'Auth required' } };
  const { data, error } = await sb.from('notifications').insert([{
    user_id: session.user.id,
    type, title, body, link, metadata,
  }]).select().single();
  return { data, error };
};

/** 다른 사용자에게 알림 전송 (서비스용) */
export const sendNotificationTo = async (userId, { type = 'info', title, body = '', link = '', metadata = {} }) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('notifications').insert([{
    user_id: userId,
    type, title, body, link, metadata,
  }]).select().single();
  return { data, error };
};

/** 알림 Realtime 구독 */
export const subscribeNotifications = async (callback) => {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return null;
  return sb.channel('my-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${session.user.id}`,
    }, (payload) => callback(payload.new))
    .subscribe();
};

/** 알림 Realtime 구독 해제 */
export const unsubscribeNotifications = async (channel) => {
  if (!channel) return;
  const sb = await getSupabase();
  if (!sb) return;
  sb.removeChannel(channel);
};
