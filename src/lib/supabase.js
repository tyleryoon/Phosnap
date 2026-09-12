// ─── Supabase Client ────────────────────────────────────────────────────
// npm 패키지 방식 (@supabase/supabase-js)
//
// 환경변수:
//   VITE_SUPABASE_URL      = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY = eyJ...

import { createClient } from '@supabase/supabase-js';
import { computeSlot, buildShootWindow } from './scheduling';
import { calculateBookingCommissions } from './commission';

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
 *
 * ⚠ user_roles 테이블이 **유일한** 권한 출처다. 다른 곳을 보지 않는다.
 *
 *   예전에는 테이블이 비어 있으면 user_metadata.role → profiles.role 순으로
 *   대체했다. 둘 다 클라이언트가 직접 고칠 수 있는 값이다.
 *   user_metadata 는 auth.updateUser({ data: { role: 'admin' } }) 한 줄이면
 *   바뀌고, 그렇게 들어온 역할에 status: 'active' 까지 붙여 줬으므로
 *   관리자 승인 절차가 통째로 건너뛰어졌다.
 *
 *   역할을 못 찾으면 고객으로 떨어뜨린다(fail closed).
 *   공급자인데 고객으로 보인다면 user_roles 에 행이 없는 것이므로
 *   화면을 열어 주는 게 아니라 그 행을 만들어야 한다.
 */
export const getUserRoles = async (userId) => {
  const sb = await getSupabase();
  if (!sb || !userId) return [];
  try {
    const { data, error } = await sb
      .from('user_roles')
      .select('role, status, created_at')
      .eq('user_id', userId)
      .order('created_at');
    if (error) {
      console.error('[getUserRoles] 역할 조회 실패 — 고객으로 처리:', error);
      return [{ role: 'customer', status: 'active' }];
    }
    if (!data || data.length === 0) return [{ role: 'customer', status: 'active' }];
    return data;
  } catch (e) {
    console.error('[getUserRoles] 역할 조회 예외 — 고객으로 처리:', e);
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

  // 실패를 삼키지 않는다.
  //   예전에는 여기서 DB 쓰기가 실패하면 localStorage 에 역할을 적고
  //   error: null 을 돌려줬다. 호출부는 성공으로 알고 넘어가는데
  //   실제로는 역할이 등록되지 않은 상태였다.
  //   그 localStorage 값이 나중에 권한 검사를 통과시키는 열쇠가 됐다.
  const { error } = await sb.from('user_roles').upsert(
    { user_id: userId, role, status },
    { onConflict: 'user_id,role' }
  );
  if (error) console.error('[addUserRole] 역할 등록 실패:', role, error);
  return { error };
};

/**
 * 유저의 역할 이름 배열
 *
 * ⚠ 이름은 남겨 두지만 더 이상 fallback 하지 않는다. getUserRoles 와 같은
 *   출처(user_roles)만 본다. 호출부가 많아 시그니처만 유지한 것이다.
 *
 *   예전에는 localStorage 의 `phosnap_roles_<uid>` 를 DB 결과에 **병합**했다.
 *   그래서 브라우저 콘솔에서 한 줄이면 아무 역할이나 얻을 수 있었고,
 *   더 나쁘게는 그렇게 주입된 역할이 roleStatuses(=DB 전용)에는 없어서
 *   ProtectedRoute 의 승인대기(pending) 검사까지 통과했다.
 *   실제로 헤메·의상벤더 계정이 이 경로로 작가 페이지에 들어가
 *   photographers 레코드를 만들었다.
 */
export const getUserRolesWithFallback = async (userId) => {
  const roles = await getUserRoles(userId);
  const names = roles.map(r => r.role).filter(Boolean);
  return names.length > 0 ? [...new Set(names)] : ['customer'];
};

/**
 * 특정 역할의 승인 상태를 돌려준다. 없으면 null.
 * 'vendor' 와 'dress_vendor' 는 같은 것으로 본다.
 */
export const getRoleStatus = async (userId, role) => {
  const roles = await getUserRoles(userId);
  const aliases = (role === 'vendor' || role === 'dress_vendor')
    ? ['vendor', 'dress_vendor']
    : [role];
  const hit = roles.find(r => aliases.includes(r.role));
  return hit ? (hit.status || 'active') : null;
};

/**
 * 공개 레코드(photographers/stylists/…)를 만들어도 되는 역할인가.
 *
 * ⚠ 'active' 가 아니라 "행이 존재하고 반려되지 않았다" 를 본다.
 *   가입 절차가 addUserRole(→ status 'pending') 직후에 공개 레코드를
 *   만들기 때문이다. 여기서 active 를 요구하면 정상 가입이 막힌다.
 *   승인 전 노출은 레코드의 is_active=false 가 따로 막는다.
 *
 *   막으려는 건 "역할 행이 아예 없는 사람" 이다. 문제가 됐던
 *   헤메·의상벤더 계정에는 artist 행이 없었다.
 */
export const canOwnProviderRecord = async (userId, role) => {
  const status = await getRoleStatus(userId, role);
  return !!status && status !== 'rejected';
};

/**
 * 유저의 역할별 상태 (status) 포함 전체 정보 가져오기
 * 반환: [{ role: 'artist', status: 'pending' }, { role: 'customer', status: 'active' }]
 */
export const getUserRolesWithStatus = async (userId) => {
  const roles = await getUserRoles(userId);
  return roles.map(r => ({ role: r.role, status: r.status || 'active' }));
};

// 관리자 승인 함수는 파일 하단(FIX_25 절)으로 옮겼다.
//
// 여기 있던 approveUserRole / rejectUserRole / getPendingRoleRequests 는
// 클라이언트에서 user_roles 를 직접 UPDATE 했다. 규칙 5-11 위반이고,
// FIX_25 가 self_update 정책을 없앤 뒤로는 조용히 0행이 됐을 것이다.
// 지금은 approve_role / reject_role RPC 를 쓴다. 아무 데서도 쓰지 않아 삭제.

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

  // ── 여기부터는 새로 만드는 경로다. 역할을 반드시 확인한다. ──
  //
  // 이 함수는 대시보드 진입 시에도 불린다("구버전 가입자 구제"). 그래서
  // 화면 접근만 뚫리면 조용히 공개 레코드가 생겼다.
  // 실제로 헤메(stylist) 계정과 의상벤더(dress_vendor) 계정에
  // 빈 photographers 레코드가 만들어져 있었다. is_active=false 라
  // 고객 눈에는 안 띄었을 뿐, 누군가 켜면 헤메가 작가 목록에 뜬다.
  //
  // 화면 가드(ProtectedRoute)는 UI 사정으로 언제든 느슨해질 수 있으니
  // 레코드를 만드는 쪽에서도 한 번 더 본다.
  const neededRole = isHmk ? 'stylist' : 'artist';
  const allowed = await canOwnProviderRecord(userId, neededRole);
  if (!allowed) {
    console.warn(`[ensureArtistRecord] ${neededRole} 역할이 없어 ${table} 레코드를 만들지 않는다.`, userId);
    return {
      data: null,
      error: { message: `${neededRole} 역할이 없어 공개 레코드를 만들 수 없습니다.`, code: 'ROLE_REQUIRED' },
      kind,
    };
  }

  const row = isHmk
    ? {
        user_id:          userId,
        name_ko:          nativeName || '이름 미설정',
        name_en:          englishName || null,
        specialty:        'both',
        instagram,
        portfolio_images: portfolioUrls,
        // 헤메도 자체 의상을 가질 수 있다 (FIX_33).
        // 작가에게만 묻던 질문이라 헤메 값은 여기까지 오지 못했다.
        dress_self:       dressSelf,
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
  // reached: 서버가 실제로 판단을 내렸는가.
  //   true  → 서버가 거부했다. 클라이언트가 우회 저장하면 안 된다.
  //   false → 서버에 닿지 못했다(네트워크·미배포). 이때만 대체 경로가 의미 있다.
  if (!sb) return { success: false, reached: false, error: 'Supabase 연결 실패' };

  // 현재 세션 토큰 가져오기
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) {
    return { success: false, reached: false, code: 'NO_SESSION', error: 'Authentication required' };
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

    // 404 는 함수가 배포되지 않은 것이다 — 서버가 판단한 게 아니다.
    const deployed = res.status !== 404;

    let data = null;
    try {
      data = await res.json();
    } catch {
      // JSON 이 아니면 게이트웨이 오류다. 서버 판단이 아니다.
      return {
        success: false, reached: false, status: res.status,
        error: `서버 응답을 읽지 못했습니다 (HTTP ${res.status})`,
      };
    }

    // 서버가 400/401/409 등으로 명시적으로 거부한 경우 reached=true.
    // 이 값을 무시하고 클라이언트가 직접 저장하면 금액 검증이 무력화된다.
    return { ...data, reached: deployed, status: res.status };
  } catch (err) {
    // fetch 자체가 실패 — 네트워크 문제. 서버는 아무 판단도 하지 않았다.
    return { success: false, reached: false, error: err.message || 'Network error' };
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

    // reached 의 뜻은 confirmPayment 와 같다 — 5-19 규칙 참조.
    // 404 면 함수가 배포되지 않은 것이다. 환불이 "실패" 가 아니라
    // **시도조차 되지 않은** 상태라서, 사람이 손으로 처리해야 한다.
    if (res.status === 404) {
      console.error('[cancelPaymentServer] cancel-payment 함수가 배포되어 있지 않습니다.');
      return { success: false, reached: false, status: 404, error: '환불 기능이 배포되지 않았습니다' };
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      return { success: false, reached: false, status: res.status,
               error: `서버 응답을 읽지 못했습니다 (HTTP ${res.status})` };
    }
    return { ...data, reached: true, status: res.status };
  } catch (err) {
    return { success: false, reached: false, error: err.message || 'Network error' };
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
    // 장소 금액. 예전엔 이 줄이 없어서 고객이 낸 장소 비용이
    // total_price 에만 섞여 들어가고 항목으로는 사라졌다.
    // bookings 에는 venue_name 컬럼이 없으므로 이름은 note 와 라인 아이템에 남긴다.
    venue_price:              Number(booking.venue_price) || 0,
    toss_order_id:            booking.toss_order_id || null,
    toss_payment_key:         booking.toss_payment_key || null,
    paid_at:                  booking.toss_payment_key ? new Date().toISOString() : null,
    status:                   'pending',   // 결제 완료, 작가 확정 대기
    lang:                     booking.lang || 'ko',
    note:                     booking.note || null,
  };

  // 고객 이름을 스냅샷으로 남긴다.
  // profiles 의 RLS 는 본인만 읽을 수 있어서, 이게 없으면 헤메·벤더는
  // 촬영 당일 누구를 만나는지 알 수 없다.
  if (!payload.customer_name) {
    const s = await getSession();
    payload.customer_name =
      booking.customer_name
      || s?.user?.user_metadata?.name
      || s?.user?.user_metadata?.full_name
      || (s?.user?.email ? s.user.email.split('@')[0] : null);
  }

  // ── 촬영 시간대 ────────────────────────────────────────────────────
  const shoot = buildShootWindow(booking.date, booking.time, booking.hours || 2);
  if (shoot) {
    payload.shoot_start_at = shoot.start.toISOString();
    payload.shoot_end_at   = shoot.end.toISOString();
  }

  // ── 참여자별 라인 아이템 ───────────────────────────────────────────
  //
  // items 가 없으면 레거시 필드로부터 만들어 준다.
  // 예전에는 작가 항목 하나만 만들었다. 그래서 고객이 헤메·의상·장소까지
  // 결제했는데 초안이 없으면 그 금액이 total_price 에만 남고
  // 어떤 항목이었는지는 아무 데도 남지 않았다. 정산도 불가능했다.
  //
  // 공급자 id 를 모르면 라인 아이템으로는 못 넣는다(정산 대상이 없다).
  // 그래도 무엇을 팔았는지는 note 에 남겨서 사람이 추적할 수 있게 한다.
  const legacyExtras = [
    { label: '헤메',   name: booking.stylist_name, detail: booking.stylist_service, price: Number(booking.stylist_price) || 0 },
    { label: '의상',   name: booking.dress_name,   detail: booking.dress_size,      price: Number(booking.dress_price)   || 0 },
    { label: '장소',   name: booking.venue_name,   detail: null,                    price: Number(booking.venue_price)   || 0 },
  ].filter(x => x.name || x.price > 0);

  const hasItems = Array.isArray(booking.items) && booking.items.length > 0;

  if (!hasItems && legacyExtras.length) {
    const memo = legacyExtras
      .map(x => `${x.label}: ${x.name || '(이름 없음)'}${x.detail ? ` / ${x.detail}` : ''} ₩${x.price.toLocaleString()}`)
      .join('\n');
    payload.note = [payload.note, '[항목 복원 필요 — 결제 초안 없음]', memo]
      .filter(Boolean).join('\n');
    console.warn('[createBooking] 라인 아이템 없이 저장합니다. note 에 남겼습니다:\n' + memo);
  }

  const rawItems = hasItems
    ? booking.items
    : [{
        providerType: 'photographer',
        providerId:   booking.photographer_id,
        providerName: booking.photographer_name,
        itemName:     booking.package_name,
        price:        Number(booking.package_price) || 0,
        timing:       'shoot',
      }].filter(i => i.providerId);

  // 각 공급자의 실제 소유자(auth uid)를 붙인다.
  // 콜라보 인원을 사람 기준으로 세야 한 사람이 여러 역할을 겸할 때
  // 혼자서 2인 콜라보가 되는 일이 없다.
  const withOwners = await attachProviderOwners(sb, rawItems);

  const priced = calculateBookingCommissions(withOwners);
  payload.collab_count     = priced.collabCount;
  payload.commission_total = priced.commissionTotal;

  const { data, error } = await sb
    .from('bookings')
    .insert([payload])
    .select()
    .single();

  if (error || !data) return { data, error };

  // ── booking_items 저장 ─────────────────────────────────────────────
  // 실패를 조용히 삼키면 "예약은 됐는데 헤메·벤더는 모르는" 상태가 된다.
  // 아이템 저장이 실패하면 예약 자체를 롤백한다.
  const itemRows = priced.items.map((it) => {
    const slot = shoot
      ? computeSlot({
          timing:          it.timing || 'shoot',
          shootStart:      shoot.start,
          shootEnd:        shoot.end,
          durationMinutes: it.durationMinutes,
          offsetMinutes:   it.offsetMinutes,
        })
      : null;
    return {
      booking_id:        data.id,
      provider_type:     it.providerType,
      // 요율 기준. provider_type 과 다를 수 있다 — 작가 자체 헤메가 그 경우다.
      // 나중에 정산을 재계산할 때 무슨 요율을 썼는지 알아야 한다.
      rate_type:         it.rateType || it.providerType,
      provider_id:       it.providerId,
      provider_name:     it.providerName || null,
      item_id:           it.itemId || null,
      item_name:         it.itemName || '항목',
      item_option:       it.itemOption || null,
      quantity:          it.quantity || 1,
      price:             Number(it.price) || 0,
      timing:            it.timing || 'shoot',
      // 소요·버퍼를 같이 남긴다. 이게 없으면 촬영 시간이 바뀌었을 때
      // 점유 구간을 다시 계산할 수가 없다 (FIX_38).
      duration_minutes:  it.durationMinutes ?? null,
      offset_minutes:    it.offsetMinutes ?? null,
      start_at:          slot ? (slot.busyStart ?? slot.start).toISOString() : null,
      end_at:            slot ? (slot.busyEnd   ?? slot.end).toISOString()   : null,
      commission_rate:   it.rate,
      commission_amount: it.commission,
      payout_amount:     it.payout,
      collab_count:      priced.collabCount,
      status:            'pending',
    };
  });

  if (itemRows.length) {
    const { error: itemErr } = await sb.from('booking_items').insert(itemRows);
    if (itemErr) {
      await sb.from('bookings').delete().eq('id', data.id);
      console.error('[createBooking] 아이템 저장 실패 — 예약을 롤백했습니다:', itemErr);
      return { data: null, error: itemErr };
    }
  }

  // ── 알림 ───────────────────────────────────────────────────────────
  const session = await getSession();
  const customerName = session?.user?.user_metadata?.name || '고객';

  if (session?.user?.email) {
    sendNotification({
      type: 'booking_created_customer',
      bookingId: data.id,
      recipientEmail: session.user.email,
      recipientName: customerName,
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

  // 참여자 전원에게 앱 내 알림 — 서버 함수로 보낸다.
  //
  // 예전에는 작가에게만, 그것도 항상 null 인 legacy_id 로 조회해서
  // 아무에게도 발송되지 않았다. 이후 클라이언트에서 직접 넣도록 고쳤지만
  // notifications 의 INSERT 정책이 user_id = auth.uid() 라 고객이
  // 공급자에게 알림을 넣는 것 자체가 42501 로 막힌다.
  sb.rpc('notify_new_booking', { p_booking: data.id })
    .then(({ error: nErr }) => {
      if (nErr) console.error('[createBooking] 공급자 알림 실패:', nErr);
    });

  return { data, error };
};

/**
 * 각 아이템에 공급자의 소유자(auth uid)를 붙인다.
 *
 * 한 사람이 헤메이면서 의상 벤더일 수 있다. 그때 stylists.id 와
 * dress_vendors.id 는 서로 다르지만 정산받는 사람은 한 명이다.
 * 콜라보 인원을 사람 기준으로 세기 위해 필요하다.
 */
const attachProviderOwners = async (sb, items = []) => {
  const byTable = new Map();
  for (const it of items) {
    const table = PROVIDER_TABLE[it.providerType];
    if (!table || !it.providerId) continue;
    if (!byTable.has(table)) byTable.set(table, new Set());
    byTable.get(table).add(it.providerId);
  }

  const owners = new Map();
  await Promise.all([...byTable.entries()].map(async ([table, ids]) => {
    const { data, error } = await sb.from(table).select('id, user_id').in('id', [...ids]);
    if (error) {
      // 소유자를 못 찾으면 provider_id 로 대체 계산된다.
      // 인원이 실제보다 많게 잡힐 수는 있어도 예약은 진행돼야 한다.
      console.error('[attachProviderOwners] 소유자 조회 실패:', table, error);
      return;
    }
    for (const row of data || []) owners.set(`${table}:${row.id}`, row.user_id);
  }));

  return items.map(it => ({
    ...it,
    ownerId: owners.get(`${PROVIDER_TABLE[it.providerType]}:${it.providerId}`) || null,
  }));
};

/** provider_type → 대시보드 경로 */
const PROVIDER_LINK = {
  photographer: '/artist/dashboard',
  stylist:      '/stylist/dashboard',
  dress:        '/vendor/dashboard',
  venue:        '/vendor/dashboard',
};

/** provider_id(공개 레코드 ID) → user_id(auth uid) 로 변환 */
const PROVIDER_TABLE = {
  photographer: 'photographers',
  stylist:      'stylists',
  dress:        'dress_vendors',
  venue:        'venue_vendors',
};

/**
 * 예약 참여자 전원에게 앱 내 알림을 보낸다.
 *
 * 알림은 auth uid 기준으로 저장되는데 아이템에 담긴 것은 공개 레코드 ID라
 * 유형별 테이블을 거쳐 user_id 를 찾아야 한다.
 */
export const notifyBookingProviders = async (items = [], { title, body, type, link, bookingId }) => {
  const sb = await getSupabase();
  if (!sb) return;

  // 같은 사람이 여러 아이템을 맡았을 수 있으므로 중복 제거
  const targets = new Map();
  for (const it of items) {
    if (!it?.providerId || !PROVIDER_TABLE[it.providerType]) continue;
    targets.set(`${it.providerType}:${it.providerId}`, it);
  }

  await Promise.all([...targets.values()].map(async (it) => {
    const { data: row, error } = await sb
      .from(PROVIDER_TABLE[it.providerType])
      .select('user_id')
      .eq('id', it.providerId)
      .maybeSingle();

    if (error || !row?.user_id) {
      console.error('[notifyBookingProviders] 대상 조회 실패:', it.providerType, it.providerId, error);
      return;
    }

    return sendNotificationTo(row.user_id, {
      type,
      title,
      body,
      link: link || PROVIDER_LINK[it.providerType] || '/',
      metadata: { bookingId, providerType: it.providerType },
    });
  }));
};

/** 예약 1건의 아이템 목록 */
export const getBookingItems = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb || !bookingId) return { data: [], error: null };
  const { data, error } = await sb
    .from('booking_items')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) console.error('[getBookingItems] 조회 실패:', error);
  return { data: data || [], error };
};

/**
 * 특정 공급자가 이미 점유한 시간 구간
 * 콜라보 추천 / 충돌 판정에 쓴다.
 *
 * @param {'photographer'|'stylist'|'dress'|'venue'} providerType
 * @param {string|string[]} providerId - 여러 명을 한 번에 조회할 수 있다
 * @param {string} date - 'YYYY-MM-DD'
 */
export const getProviderBusyBlocks = async (providerType, providerId, date) => {
  const sb = await getSupabase();
  if (!sb || !providerId || !date) return { data: [], error: null };

  const ids = Array.isArray(providerId) ? providerId : [providerId];
  if (!ids.length) return { data: [], error: null };

  // 하루 앞뒤로 여유를 둔다 — 헤메 시술은 촬영 전날 밤으로 역산될 수 있다
  const from = new Date(`${date}T00:00:00`);
  from.setDate(from.getDate() - 1);
  const to = new Date(`${date}T23:59:59`);
  to.setDate(to.getDate() + 1);

  const { data, error } = await sb
    .from('booking_items')
    .select('provider_id, item_id, start_at, end_at, timing, status')
    .eq('provider_type', providerType)
    .in('provider_id', ids)
    .in('status', ['pending', 'confirmed', 'completed'])
    .gte('start_at', from.toISOString())
    .lte('start_at', to.toISOString());

  if (error) console.error('[getProviderBusyBlocks] 조회 실패:', error);

  return {
    data: (data || []).map(r => ({
      providerId: r.provider_id,
      itemId:     r.item_id,
      start:      r.start_at ? new Date(r.start_at) : null,
      end:        r.end_at   ? new Date(r.end_at)   : null,
      timing:     r.timing,
    })).filter(b => b.start && b.end),
    error,
  };
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

/**
 * 작가가 예약 수락
 *
 * 확정 처리 전체를 서버 함수(approve_booking)에 맡긴다.
 * 클라이언트에서 하면 RLS 가 (의도대로) 막아서 반쪽만 처리됐다.
 *   · notifications INSERT → user_id = auth.uid() 만 허용 (42501)
 *     → 고객·헤메·벤더 알림이 전부 조용히 실패
 *   · booking_items UPDATE → 자기 아이템만 → 나머지는 pending 으로 잔류
 *   · booking_items SELECT → 자기 것만 보여 알림 대상이 빈 목록
 *
 * 정책을 열면 누구나 아무에게나 알림을 보낼 수 있어 더 위험하다.
 * 권한 확인은 함수 안에서 한다.
 */
export const approveBooking = async (bookingId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };

  const { data, error } = await sb.rpc('approve_booking', { p_booking: bookingId });
  if (error) console.error('[approveBooking] 확정 실패:', error);
  return { data, error };
};

/** 작가가 예약 거절 */
/**
 * 작가가 예약 거절
 *
 * approveBooking 과 같은 이유로 서버 함수에 맡긴다.
 * 아이템까지 함께 취소해야 헤메·벤더의 시간이 다시 풀린다.
 * 그러지 않으면 성사되지 않은 예약이 스케줄을 계속 점유한다.
 */
export const rejectBooking = async (bookingId, reason = '') => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };

  const { data, error } = await sb.rpc('reject_booking', {
    p_booking: bookingId,
    p_reason:  reason || '',
  });
  if (error) console.error('[rejectBooking] 거절 실패:', error);
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
// vendor_dresses 는 dress_items 의 단순 VIEW 라 INSERT/UPDATE/DELETE 가
// 불가능하고, 현재 DB 에는 그 뷰조차 없다. 실제 테이블을 직접 사용한다.
export const getVendorDresses = async (vendorId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb
    .from('dress_items')
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
    .from('dress_items')
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
    .from('dress_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', dressId)
    .select()
    .single();
  return { data, error };
};

/**
 * 의상 삭제
 */
// ─── 앵커 조회 (FIX_38) ────────────────────────────────────────────────

/**
 * "이 시간에 가능한 공급자" 를 한 번에 가져온다.
 *
 * 새 예약 흐름은 지역·날짜·시각·길이를 먼저 정하고, 그 조건에
 * 가능한 것만 보여준다. 판정은 서버가 한다 —
 * 작가가 100명이면 스케줄 조회가 100번 나갈 수는 없다.
 *
 * 돌아오는 모양
 *   { shootStart, shootEnd, photographers[], stylists[], dresses[], venues[] }
 *
 *   stylists 는 **사람이 아니라 시술 메뉴 단위**다.
 *   같은 헤메라도 샵 시술은 되는데 종일 동행은 안 될 수 있다.
 *
 *   dresses 의 booked_sizes 는 그 날 이미 나간 사이즈별 개수다.
 *   화면이 size_stock 과 비교해 사이즈 버튼을 잠근다.
 *
 * @param {Object} anchor
 * @param {string} anchor.locationId  'seoul' 등. 없으면 전 지역
 * @param {string} anchor.date        'YYYY-MM-DD'
 * @param {string} anchor.time        'HH:MM'
 * @param {number} anchor.hours       촬영 길이
 */
export const getAvailableProviders = async ({ locationId, date, time, hours = 2 }) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  if (!date || !time) {
    return { data: null, error: { message: '날짜와 시각이 필요합니다.' } };
  }

  const { data, error } = await sb.rpc('available_providers', {
    p_location: locationId || null,
    p_date:     date,
    p_start:    time.length === 5 ? `${time}:00` : time,
    p_hours:    Number(hours) || 2,
  });

  if (error) {
    // 조용히 빈 목록을 주면 "그 시간엔 아무도 없다" 로 보인다.
    // 못 물어본 것과 없는 것은 다르다.
    console.error('[getAvailableProviders] 조회 실패:', error);
    return { data: null, error };
  }
  if (data?.error) {
    return { data: null, error: { message: data.error } };
  }
  return { data, error: null };
};

// ─── 헤메 자체 의상 (FIX_33) ───────────────────────────────────────────
//
// dress_items 를 벤더와 헤메가 같이 쓴다. vendor_id / stylist_id 중
// 하나만 채워진다 (DB 제약으로 강제).
//
// 예전에는 헤메가 의상을 팔려면 dress_vendors 레코드를 따로 만들었는데,
// 역할 가드(FIX_23) 때문에 vendor 역할이 없는 헤메는 그 insert 가 막혔다.
// 버튼은 있는데 눌러도 안 되는 상태였다.

/**
 * 공급자가 고객에게 노출되고 있는지, 아니면 무엇이 비었는지 (FIX_35).
 *
 * 노출 조건은 승인 하나가 아니다 — 지역과 판매 항목도 있어야 한다.
 * 그 사실을 화면에 보여주지 않으면 공급자는 이유를 알 수 없다.
 *
 * @param {'photographer'|'stylist'|'dress_vendor'|'venue_vendor'} kind
 * @param {string} id
 */
export const getListingStatus = async (kind, id) => {
  const sb = await getSupabase();
  if (!sb || !kind || !id) return { data: null, error: null };
  const { data, error } = await sb.rpc('provider_listing_status', {
    p_kind: kind,
    p_id:   id,
  });
  if (error) return { data: null, error };
  return { data, error: null };
};

/** 헤메 본인의 자체 의상 목록 */
export const getStylistDresses = async (stylistId) => {
  const sb = await getSupabase();
  if (!sb || !stylistId) return { data: [], error: null };
  const { data, error } = await sb
    .from('dress_items')
    .select('*')
    .eq('stylist_id', stylistId)
    .order('created_at', { ascending: false });
  if (error) console.error('[getStylistDresses] 조회 실패:', error);
  return { data: data || [], error };
};

/** 헤메 자체 의상 등록 */
export const addStylistDress = async (stylistId, dress) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  if (!stylistId) return { data: null, error: { message: '헤메 정보를 찾을 수 없습니다.' } };
  const { data, error } = await sb
    .from('dress_items')
    .insert([{ ...dress, stylist_id: stylistId, vendor_id: null }])
    .select()
    .single();
  return { data, error };
};

/**
 * 헤메의 "자체 의상 보유" 스위치.
 *
 * 0행이 돌아오면 실패다 — RLS 가 막았거나 내 레코드가 아니다.
 * PostgREST 는 그걸 오류가 아니라 200 + 빈 배열로 준다.
 */
export const setStylistDressSelf = async (stylistId, on) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.from('stylists')
    .update({ dress_self: !!on })
    .eq('id', stylistId)
    .select('id');
  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: { message: '변경 권한이 없습니다. 다시 로그인해주세요.' } };
  }
  return { error: null };
};

export const deleteVendorDress = async (dressId) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };
  return sb.from('dress_items').delete().eq('id', dressId);
};

/**
 * 업체의 예약 현황 조회 (dress_name 기준)
 */
export const getVendorBookings = async (vendorId, vendorType = 'dress') =>
  getProviderBookings(vendorType, vendorId);

/**
 * 공급자(작가·헤메·의상·장소)가 참여한 예약 목록
 *
 * 예전에는 이름 문자열로 예약을 찾았다. 동명이인이면 남의 예약이 보이고
 * 개명하면 과거 예약이 통째로 사라졌으며, 벤더 쪽은 아예 빈 배열을
 * 반환하도록 방치돼 있어 자기 의상이 예약돼도 알 방법이 없었다.
 * 이제 booking_items 의 provider_id 로 정확히 찾는다.
 *
 * @param {'photographer'|'stylist'|'dress'|'venue'} providerType
 * @param {string} providerId
 * @returns {{data: Array, error: Object|null}} 예약 + 내가 맡은 아이템(myItems)
 */
export const getProviderBookings = async (providerType, providerId) => {
  const sb = await getSupabase();
  if (!sb || !providerId) return { data: [], error: null };

  const { data: items, error } = await sb
    .from('booking_items')
    .select('*, bookings(*)')
    .eq('provider_type', providerType)
    .eq('provider_id', providerId)
    .order('start_at', { ascending: false });

  if (error) {
    console.error('[getProviderBookings] 조회 실패:', providerType, error);
    return { data: [], error };
  }

  // 한 예약에서 같은 사람이 여러 아이템을 맡을 수 있다
  // (신부 헤메 + 신랑 그루밍 + 헤어변형 → 아이템 3개, 예약 1건)
  const byBooking = new Map();
  for (const it of items || []) {
    const booking = it.bookings;
    if (!booking) continue;
    const { bookings: _drop, ...item } = it;
    const cur = byBooking.get(booking.id);
    if (cur) {
      cur.myItems.push(item);
      cur.myTotal += Number(item.price) || 0;
      cur.myPayout += Number(item.payout_amount) || 0;
    } else {
      byBooking.set(booking.id, {
        ...booking,
        myItems:  [item],
        myTotal:  Number(item.price) || 0,
        myPayout: Number(item.payout_amount) || 0,
        myStatus: item.status,
      });
    }
  }

  return { data: [...byBooking.values()], error: null };
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
export const getStylistBookings = async (stylistId) =>
  getProviderBookings('stylist', stylistId);

// ─── 공통 스케줄 (작가 · 헤메 · 벤더) ────────────────────────────────
//
// 예전에는 역할마다 저장 방식이 달랐다.
//   작가 : artist_schedules (DB)
//   헤메 : 관리 화면 자체가 없음
//   벤더 : localStorage — 고객이 볼 수 없었다
// provider_schedules 하나로 합쳐 같은 로직을 세 번 쓰지 않는다.

/** 기본 운영 시간 (평상시 슬롯 + 정기 휴무 요일) */
export const getProviderDefaults = async (providerType, providerId) => {
  const sb = await getSupabase();
  if (!sb || !providerId) return { data: null, error: null };
  const { data, error } = await sb
    .from('provider_defaults')
    .select('*')
    .eq('provider_type', providerType)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) console.error('[getProviderDefaults] 조회 실패:', error);
  return { data, error };
};

export const upsertProviderDefaults = async (providerType, providerId, { defaultSlots, weeklyOff }) => {
  const sb = await getSupabase();
  if (!sb || !providerId) return { error: { message: 'Supabase 연결 실패' } };
  const payload = {
    provider_type: providerType,
    provider_id:   providerId,
    updated_at:    new Date().toISOString(),
  };
  if (defaultSlots) payload.default_slots = defaultSlots;
  if (weeklyOff)    payload.weekly_off    = weeklyOff;

  const { data, error } = await sb
    .from('provider_defaults')
    .upsert(payload, { onConflict: 'provider_type,provider_id' })
    .select()
    .maybeSingle();
  if (error) console.error('[upsertProviderDefaults] 저장 실패:', error);
  return { data, error };
};

/** 월 단위 스케줄 — 달력 렌더링용 */
export const getProviderScheduleMonth = async (providerType, providerId, year, month) => {
  const sb = await getSupabase();
  if (!sb || !providerId) return { data: [], error: null };
  const pad = (n) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month)}-01`;
  const to   = `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}`;

  const { data, error } = await sb
    .from('provider_schedules')
    .select('*')
    .eq('provider_type', providerType)
    .eq('provider_id', providerId)
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (error) console.error('[getProviderScheduleMonth] 조회 실패:', error);
  return { data: data || [], error };
};

/** 하루 설정 (열기/닫기, 슬롯 조정) */
export const upsertProviderScheduleDate = async (providerType, providerId, date, patch = {}) => {
  const sb = await getSupabase();
  if (!sb || !providerId || !date) return { error: { message: '잘못된 요청' } };
  const payload = {
    provider_type: providerType,
    provider_id:   providerId,
    date,
    ...(patch.dayOff  !== undefined ? { day_off: patch.dayOff }  : {}),
    ...(patch.slots   !== undefined ? { slots:   patch.slots }   : {}),
    ...(patch.blocked !== undefined ? { blocked: patch.blocked } : {}),
    ...(patch.note    !== undefined ? { note:    patch.note }    : {}),
  };
  const { data, error } = await sb
    .from('provider_schedules')
    .upsert(payload, { onConflict: 'provider_type,provider_id,date' })
    .select()
    .maybeSingle();
  if (error) console.error('[upsertProviderScheduleDate] 저장 실패:', error);
  return { data, error };
};

/**
 * 날짜 범위 일괄 오픈/클로즈
 *
 * 확정된 예약이 있는 날짜는 닫지 않는다. 닫아버리면 고객은 예약을
 * 들고 있는데 공급자 일정에는 없는 상태가 되어 촬영 당일 아무도
 * 나오지 않는다. 건너뛴 날짜는 목록으로 돌려주어 화면에서 안내한다.
 *
 * @returns {{ data: { updated:number, skipped:string[], holiday:string[] } }}
 *   skipped — 예약이 있어 닫지 못한 날짜
 *   holiday — 정기 휴무 요일이라 열지 않은 날짜
 */
export const bulkSetSchedule = async (providerType, providerId, { from, to, open, slots = null }) => {
  const sb = await getSupabase();
  if (!sb || !providerId) return { error: { message: 'Supabase 연결 실패' } };

  const { data, error } = await sb.rpc('bulk_set_schedule', {
    p_type:  providerType,
    p_id:    providerId,
    p_from:  from,
    p_to:    to,
    p_open:  open,
    p_slots: slots,
  });
  if (error) console.error('[bulkSetSchedule] 일괄 설정 실패:', error);
  return { data, error };
};

/**
 * 특정 날짜에 실제로 운영하는 슬롯
 * 날짜별 설정 → 없으면 기본 운영시간. blocked 는 제외한다.
 */
export const resolveProviderSlots = (daySchedule, defaults, date = null) => {
  if (daySchedule?.day_off) return [];

  // 정기 휴무 요일. 날짜별 설정이 없는 날에 적용된다.
  // 이걸 빠뜨리면 "매주 월요일 휴무" 로 설정해도 날짜별 행이 없는
  // 월요일은 영업으로 계산되어 고객에게 열린 것처럼 보인다.
  if (!daySchedule && date && defaults?.weekly_off?.length) {
    const d = date instanceof Date ? date : new Date(`${date}T00:00:00`);
    if (!Number.isNaN(d.getTime()) && defaults.weekly_off.includes(d.getDay())) return [];
  }

  const base = (daySchedule?.slots?.length ? daySchedule.slots : defaults?.default_slots) || [];
  const blocked = new Set(daySchedule?.blocked || []);
  return base.filter(s => !blocked.has(s));
};

/**
 * 특정 날짜의 실효 상태
 *   closed    — 명시적 휴무
 *   weeklyOff — 정기 휴무 요일 (날짜별 설정 없음)
 *   open      — 명시적 영업
 *   default   — 설정 없음 → 기본 운영시간 적용
 */
export const resolveDayState = (daySchedule, defaults, date) => {
  if (daySchedule) return daySchedule.day_off ? 'closed' : 'open';
  const d = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  if (!Number.isNaN(d.getTime()) && defaults?.weekly_off?.includes(d.getDay())) return 'weeklyOff';
  return 'default';
};

/**
 * 현재 로그인한 사람이 소유한 모든 공급자 레코드
 *
 * 한 사람이 헤메이면서 의상 벤더일 수 있다.
 * (헤메 대시보드의 "의상 대여" 를 켜면 dress_vendors 레코드가 생긴다)
 */
export const getMyProviderRefs = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  const session = await getSession();
  const uid = session?.user?.id;
  if (!uid) return { data: [], error: null };

  const refs = [];
  await Promise.all(Object.entries(PROVIDER_TABLE).map(async ([type, table]) => {
    const { data, error } = await sb.from(table).select('id').eq('user_id', uid);
    if (error) {
      console.error('[getMyProviderRefs] 조회 실패:', table, error);
      return;
    }
    for (const row of data || []) refs.push({ providerType: type, providerId: row.id });
  }));

  return { data: refs, error: null };
};

/**
 * 내가 참여한 모든 예약 — 역할을 가리지 않고 하나로 묶는다.
 *
 * 헤메가 의상 대여도 한다면 같은 예약에서 시술과 의상 두 아이템을
 * 맡게 되는데, 카드 두 장이 아니라 한 장에 둘 다 보여야 한다.
 * "그날 내가 할 일" 이 한눈에 들어와야 하기 때문이다.
 */
export const getMyProviderBookings = async () => {
  const { data: refs } = await getMyProviderRefs();
  if (!refs.length) return { data: [], error: null };

  const results = await Promise.all(
    refs.map(r => getProviderBookings(r.providerType, r.providerId)),
  );

  const merged = new Map();
  for (const { data } of results) {
    for (const bk of data || []) {
      const cur = merged.get(bk.id);
      if (cur) {
        cur.myItems.push(...bk.myItems);
        cur.myTotal  += bk.myTotal;
        cur.myPayout += bk.myPayout;
      } else {
        merged.set(bk.id, { ...bk, myItems: [...bk.myItems] });
      }
    }
  }

  const list = [...merged.values()];
  list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return { data: list, error: null };
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
  // 의상 벤더의 의상만 돌려준다.
  //
  // FIX_33 이후 dress_items 에는 헤메 소유(stylist_id)도 들어 있다.
  // 그건 그 헤메를 선택했을 때만 보여야 하는데, 여기서 같이 가져오면
  // 헤메를 고르지 않아도 목록에 뜨고, 고른 뒤에는 두 번 뜬다.
  // (실제로 "웨딩 드레스 (A라인)" 이 두 줄로 나왔다)
  let q = sb.from('dress_items').select('*, dress_vendors(id, name_ko, location_id)')
    .eq('is_available', true)
    .not('vendor_id', 'is', null);
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
  if (!sb || !date) return { data: [], error: null };

  // 예전에는 dress_name(텍스트)으로 비교해서, 서로 다른 벤더가 둘 다
  // "웨딩드레스"라고 이름 붙이면 한쪽이 예약될 때 다른 쪽까지 막혔다.
  // 이제 item_id 로 정확히 판정한다.
  const from = new Date(`${date}T00:00:00`);
  const to   = new Date(`${date}T23:59:59`);

  const { data, error } = await sb.from('booking_items')
    .select('item_id, item_option, quantity, provider_id')
    .eq('provider_type', 'dress')
    .in('status', ['pending', 'confirmed', 'completed'])
    .gte('start_at', from.toISOString())
    .lte('start_at', to.toISOString());

  if (error) console.error('[getBookedDresses] 조회 실패:', error);

  return {
    data: (data || []).map(r => ({
      itemId:   r.item_id,
      size:     r.item_option,
      quantity: r.quantity || 1,
      vendorId: r.provider_id,
    })),
    error,
  };
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
    // DB 는 snake_case, 화면 코드는 camelCase 를 쓴다.
    // 별칭을 안 만들면 p.dressSelf 가 영원히 undefined 라
    // "작가 자체 의상" 분기가 한 번도 타지 않는다.
    artistType:    row.artist_type || 'photographer',
    dressSelf:     row.dress_self ?? false,
    // 자체 헤어메이크업 여부. 메뉴 자체는 packages(type='hmk') 에 있다.
    // profiles.hmk_options 에 두면 고객이 못 읽는다 — profiles 는 본인만
    // 조회 가능하다. FIX_29 에서 packages 로 옮겼다.
    hmkSelf:       row.hmk_self ?? false,
    countryCode:   row.country_code || 'KR',
    city:          row.city || '',
  };
};

/** 작가 유형 표시 정보 */
export const ARTIST_TYPES = {
  photographer: { icon: '📸',   ko: '사진',      en: 'Photo' },
  videographer: { icon: '🎬',   ko: '영상',      en: 'Video' },
  both:         { icon: '📸🎬', ko: '사진·영상', en: 'Photo & Video' },
  hmk:          { icon: '💄',   ko: '헤어메이크업', en: 'Hair & Makeup' },
};

/** Fetch photographers with filters (replaces client-side filtering) */
export const fetchPhotographers = async ({
  countryCode, city, genre, language, tags,
  artistType,
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
  // 작가 유형(사진/영상/사진+영상). genre 는 tags 기반이라 별개다.
  // '사진+영상' 작가는 사진으로도 영상으로도 검색돼야 한다.
  if (artistType === 'photographer') q = q.in('artist_type', ['photographer', 'both']);
  else if (artistType === 'videographer') q = q.in('artist_type', ['videographer', 'both']);
  else if (artistType) q = q.eq('artist_type', artistType);
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
/**
 * 활성 장소 벤더 목록
 *
 * 지역 필터가 없어서 서울 고객에게 부산 장소가 노출되고 있었다.
 * 헤메(getStylists)·의상(getDressItems)은 지역으로 거르는데
 * 장소만 빠져 있었다. 장소가 0개라 드러나지 않았다.
 *
 * @param {string} [locationId] - 없으면 전체 (관리자/디버그용)
 */
export const getVenueVendors = async (locationId) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: null };
  let q = sb.from('venue_vendors').select('*').eq('is_active', true);
  if (locationId) q = q.eq('location_id', locationId);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) console.error('[getVenueVendors] 조회 실패:', error);
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
/**
 * 장소 벤더 공개 레코드 확보 (없으면 생성)
 *
 * 고객 예약 STEP 05 는 venue_vendors / venue_items 에서 읽는데
 * 지금까지 여기에 쓰는 화면이 하나도 없었다 (addVenueItem 호출처 0건).
 * 벤더가 장소 탭에서 무엇을 등록해도 dress_items 로 들어가
 * 고객에게는 영원히 보이지 않았다.
 *
 * @param {object} info - 의상 벤더 프로필에서 지역·이름을 승계한다
 */
export const ensureVenueVendor = async (info = {}) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };

  const session = await getSession();
  if (!session?.user) return { data: null, error: { message: '로그인이 필요합니다' } };

  // 호출하는 쪽이 프로필을 미리 실어놨는지에 의존하면 안 된다.
  // 대시보드 진입 시점에 vendorProfile 이 아직 없으면 locationId 가
  // undefined 로 들어와 location_id = null 인 레코드가 만들어지고,
  // 그러면 지역 필터에 영원히 걸리지 않아 고객에게 보이지 않는다.
  // 여기서 직접 의상 벤더 레코드를 찾아 승계한다.
  let seed = {
    name:          info.name || info.nameKo,
    locationId:    info.locationId,
    locationNames: info.locationNames,
    bio:           info.bio,
  };
  if (!seed.locationId || !seed.name) {
    const { data: dv, error: dvErr } = await sb
      .from('dress_vendors')
      .select('name_ko, name, location_id, location_names, intro')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (dvErr) console.error('[ensureVenueVendor] 의상 벤더 조회 실패:', dvErr);
    if (dv) {
      seed = {
        name:          seed.name          || dv.name_ko || dv.name,
        locationId:    seed.locationId    || dv.location_id,
        locationNames: seed.locationNames || dv.location_names,
        bio:           seed.bio           || dv.intro,
      };
    }
  }

  const { data: existing, error: findErr } = await getMyVenueVendorProfile();
  if (findErr) console.error('[ensureVenueVendor] 조회 실패:', findErr);
  if (existing) {
    // 레코드는 있는데 지역이 비어 있으면 채운다
    if (!existing.location_id && seed.locationId) {
      const { data: fixed, error: fixErr } = await updateVenueVendorProfile(existing.id, {
        location_id:    seed.locationId,
        location_names: seed.locationNames || existing.location_names || {},
      });
      if (fixErr) console.error('[ensureVenueVendor] 지역 보정 실패:', fixErr);
      else if (fixed) return { data: fixed, error: null };
    }
    return { data: existing, error: null };
  }

  return createVenueVendor({
    name:           seed.name || '장소 대여',
    name_i18n:      info.nameI18n || {},
    bio:            seed.bio || '',
    location_id:    seed.locationId || null,
    location_names: seed.locationNames || {},
    categories:     info.categories || [],
    img:            info.img || null,
    is_active:      false,   // 아이템을 등록해야 고객에게 노출된다
  });
};

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
/**
 * 채팅 메시지 전송
 *
 * 서버 함수를 쓴다. 예전에는 messages 에 INSERT 만 하고 끝나서
 * 상대방에게 알림이 가지 않았다 — 채팅창을 직접 열어보기 전에는
 * 메시지가 온 줄도 몰랐다.
 *
 * 클라이언트에서 상대방 알림을 만들려 해도 RLS 가 막는다
 * (notifications INSERT 는 user_id = auth.uid() 만 허용).
 *
 * 알림에는 5분 유예가 붙는다. 그 안에 읽으면 메일을 보내지 않는다.
 */
export const sendChatMessage = async (roomId, content) => {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Supabase 연결 실패' } };

  const { data, error } = await sb.rpc('send_chat_message', {
    p_room:    roomId,
    p_content: content,
  });
  if (error) console.error('[sendChatMessage] 전송 실패:', error);
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

// ─── 관리자 승인 (FIX_25) ──────────────────────────────────────────────
//
// 승인·반려는 전부 서버 함수다. 규칙 5-11.
//   · user_roles 의 UPDATE 정책을 관리자에게만 열어 두면, 관리자가 아닌
//     사람이 눌렀을 때 PostgREST 가 200 + 0행 을 돌려준다. 화면은 성공한
//     줄 안다. 그 구분이 안 되는 게 이 프로젝트에서 제일 비쌌던 실수다.
//   · RPC 는 raise exception 으로 실패가 그대로 올라온다.

/** 승인 대기 중인 역할 신청 목록 (관리자 전용 — 아니면 빈 배열) */
export const getPendingRoleRequests = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('pending_role_requests');
  if (error) {
    console.error('[getPendingRoleRequests] 실패:', error);
    return { data: [], error };
  }
  return { data: data || [], error: null };
};

/** 역할 승인 — 성공 시 신청자에게 알림 + 메일이 나간다 */
export const approveRole = async (userId, role) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('approve_role', { p_user: userId, p_role: role });
  if (error) return { data: null, error };
  // 서버가 { ok: false, message } 를 돌려주는 경우가 있다 (이미 처리된 신청).
  // 에러는 아니지만 성공도 아니므로 호출부가 구분할 수 있게 넘긴다.
  return { data, error: null };
};

/** 역할 반려 — 사유 필수. 사유가 그대로 신청자에게 전달된다 */
export const rejectRole = async (userId, role, reason) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const trimmed = (reason || '').trim();
  if (!trimmed) return { data: null, error: { message: '반려 사유를 입력해주세요' } };
  const { data, error } = await sb.rpc('reject_role', {
    p_user: userId, p_role: role, p_reason: trimmed,
  });
  if (error) return { data: null, error };
  return { data, error: null };
};

/** 내 역할 신청 상태 (반려 사유 포함) */
export const getMyRoleStatus = async (role) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('my_role_status', { p_role: role });
  if (error) return { data: null, error };
  return { data, error: null };
};

/**
 * 반려된 신청을 보완해서 다시 올린다.
 *
 * 보완 메모를 필수로 받는다. 버튼만 다시 누르는 재신청을 막고,
 * 관리자가 이전 반려 사유와 나란히 놓고 재심사할 수 있게 하기 위해서다.
 */
export const reapplyRole = async (role, note) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const trimmed = (note || '').trim();
  if (!trimmed) return { data: null, error: { message: '무엇을 보완했는지 적어주세요' } };
  const { data, error } = await sb.rpc('reapply_role', { p_role: role, p_note: trimmed });
  if (error) return { data: null, error };
  return { data, error: null };
};

/**
 * 관리자 확인이 필요한 항목 수 (Nav 배지용)
 *
 * 목록 조회(getPendingRoleRequests)를 배지에 쓰지 않는다. 프로필과
 * 포트폴리오까지 끌고 오는 쿼리를 1분마다 돌릴 이유가 없다.
 * 관리자가 아니면 서버가 전부 0 을 준다.
 */
export const getAdminAttention = async () => {
  const sb = await getSupabase();
  const zero = { pending_roles: 0, reapplied: 0, open_inquiries: 0, failed_emails: 0, stale_bookings: 0 };
  if (!sb) return { data: zero, error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('admin_attention');
  if (error) {
    console.error('[getAdminAttention] 실패:', error);
    return { data: zero, error };
  }
  return { data: { ...zero, ...(data || {}) }, error: null };
};

// ─── 문의 (FIX_31) ─────────────────────────────────────────────────────
//
// 접수·답변 모두 서버 함수다. 규칙 5-11.
// 특히 답변은 남의 행을 고치는 일이라 클라이언트에 두면 RLS 에 막혀
// 조용히 0행이 된다. 화면은 성공한 줄 알고, 문의자는 답을 못 받는다.

export const INQUIRY_CATEGORIES = [
  { value: 'role_change', ko: '작가 유형 변경', desc: '사진 ↔ 영상 ↔ 사진+영상 등' },
  { value: 'account',     ko: '계정 · 개인정보', desc: '로그인, 정보 수정, 탈퇴' },
  { value: 'booking',     ko: '예약 · 일정',    desc: '예약 확정, 변경, 스케줄' },
  { value: 'payment',     ko: '결제 · 환불',    desc: '결제 오류, 환불 요청' },
  { value: 'settlement',  ko: '정산 · 수수료',  desc: '정산 금액, 입금일' },
  { value: 'bug',         ko: '오류 신고',      desc: '화면이 안 뜨거나 버튼이 안 될 때' },
  { value: 'suggestion',  ko: '개선 제안',      desc: '있으면 좋겠는 기능' },
  { value: 'other',       ko: '기타',          desc: '위에 없는 문의' },
];

/** 문의 접수 */
export const submitInquiry = async ({ category, subject, body }) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('submit_inquiry', {
    p_category: category,
    p_subject:  (subject || '').trim(),
    p_body:     (body || '').trim(),
  });
  if (error) return { data: null, error };
  return { data, error: null };
};

/** 내 문의 목록 (RLS 로 본인 것만 보인다) */
export const getMyInquiries = async () => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb
    .from('inquiries')
    .select('id, category, subject, body, status, answer, answered_at, created_at')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
};

/** 관리자: 문의 목록 */
export const getAdminInquiries = async (status = null) => {
  const sb = await getSupabase();
  if (!sb) return { data: [], error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('admin_inquiries', { p_status: status });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
};

/** 관리자: 답변 등록 — 문의자에게 알림 + 메일 */
export const answerInquiry = async (id, answer) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const trimmed = (answer || '').trim();
  if (!trimmed) return { data: null, error: { message: '답변 내용을 입력해주세요' } };
  const { data, error } = await sb.rpc('answer_inquiry', { p_id: id, p_answer: trimmed });
  if (error) return { data: null, error };
  return { data, error: null };
};

/** 관리자: 답변 없이 종료 (중복·이미 해결된 문의) */
export const closeInquiry = async (id) => {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase 연결 실패' } };
  const { data, error } = await sb.rpc('close_inquiry', { p_id: id });
  if (error) return { data: null, error };
  return { data, error: null };
};

/**
 * 여러 공급자의 **특정 날짜 영업 여부**를 한 번에 판정한다.
 *
 * 왜 필요한가
 *   예약 화면은 지금까지 getProviderBusyBlocks 만 봤다. 그건
 *   booking_items — **이미 잡힌 예약**이지 휴무가 아니다.
 *   헤메·벤더가 ScheduleManager 에서 "이 날 휴무" 로 설정하고
 *   저장 성공까지 확인해도, 고객 화면에서는 그대로 선택됐다.
 *
 *   공급자는 자기가 쉰다고 알고 있는데 예약이 들어온다.
 *   설정한 사람 입장에서는 저장이 된 것처럼 보이니 원인을 찾을 수도 없다.
 *
 * 반환: { [providerId]: true }  — 그 날 영업하지 않는 공급자
 */
export const getProvidersClosedOn = async (providerType, providerIds, date) => {
  const closed = {};
  const sb = await getSupabase();
  const ids = [...new Set((providerIds || []).filter(Boolean))];
  if (!sb || !ids.length || !date) return { data: closed, error: null };

  try {
    const [schedRes, defRes] = await Promise.all([
      sb.from('provider_schedules')
        .select('provider_id, day_off, slots')
        .eq('provider_type', providerType)
        .in('provider_id', ids)
        .eq('date', date),
      sb.from('provider_defaults')
        .select('provider_id, default_slots, weekly_off')
        .eq('provider_type', providerType)
        .in('provider_id', ids),
    ]);

    // 조회가 실패하면 아무도 막지 않는다.
    // 확실하지 않은데 막아버리면 멀쩡한 공급자가 사라진다.
    // 다만 조용히 넘어가지는 않는다 — 로그는 남긴다.
    if (schedRes.error) console.error('[getProvidersClosedOn] 일정 조회 실패:', schedRes.error);
    if (defRes.error)   console.error('[getProvidersClosedOn] 기본값 조회 실패:', defRes.error);
    if (schedRes.error || defRes.error) return { data: closed, error: schedRes.error || defRes.error };

    const byDay = {};
    (schedRes.data || []).forEach(r => { byDay[r.provider_id] = r; });
    const byDefault = {};
    (defRes.data || []).forEach(r => { byDefault[r.provider_id] = r; });

    const d = new Date(`${date}T00:00:00`);
    const dow = Number.isNaN(d.getTime()) ? null : d.getDay();

    ids.forEach(id => {
      const row = byDay[id];
      if (row) {
        // 그 날짜에 레코드가 있으면 그게 우선이다.
        if (row.day_off) closed[id] = true;
        else if (Array.isArray(row.slots) && row.slots.length === 0) closed[id] = true;
        return;
      }
      // 레코드가 없으면 정기 휴무 요일을 본다.
      const def = byDefault[id];
      if (def && dow !== null && (def.weekly_off || []).includes(dow)) closed[id] = true;
    });

    return { data: closed, error: null };
  } catch (e) {
    console.error('[getProvidersClosedOn] 예외:', e);
    return { data: closed, error: { message: e.message } };
  }
};
