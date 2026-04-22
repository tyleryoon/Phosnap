// ─── Tour Booking Store ─────────────────────────────────────────────────
// 투어 인스턴스(일정 오픈) 관리 — 현재 localStorage 기반 mock, 추후 Supabase 이전
//
// 데이터 모델:
//   TourInstance {
//     id:             string (uuid)
//     photographerId: number
//     tourIndex:      number (photographer.tours[idx])
//     tourName:       string
//     scheduledDate:  string (YYYY-MM-DD)
//     scheduledTime:  string (HH:MM)
//     deadline:       string (YYYY-MM-DD) — 모집 마감일
//     maxGuests:      number
//     minGuests:      number (최소 진행 인원, 기본: ceil(maxGuests/2))
//     pricingType:    'perPerson' | 'total'
//     basePrice:      number (원래 가격)
//     currentPrice:   number (인원 변동 시 재계산된 가격, total 모드 전용)
//     status:         'recruiting' | 'confirmed' | 'adjusting' | 'cancelled' | 'completed'
//     bookings:       Booking[]
//     createdAt:      string (ISO)
//   }
//
//   Booking {
//     id:           string (uuid)
//     guestName:    string
//     guestEmail:   string
//     guestPhone:   string
//     headcount:    number (1인 예약이지만 동반자 가능)
//     bookedAt:     string (ISO)
//     status:       'active' | 'cancelled' | 'pendingConfirm'
//     confirmedAt:  string | null
//   }
//
// 상태 전이:
//   recruiting → confirmed   (bookings 수 == maxGuests 자동 확정)
//   recruiting → adjusting   (deadline 도달 & minGuests ≤ bookings < maxGuests)
//   adjusting  → confirmed   (참여자들이 새 가격 수락)
//   adjusting  → cancelled   (수락 기한 내 과반 미달)
//   recruiting → cancelled   (deadline 도달 & bookings < minGuests)
//   confirmed  → recruiting  (취소로 빈자리 → deadline 전이면 재모집)

const STORAGE_KEY = 'phosnap_tour_instances';

// ── 유틸 ──
const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const save = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // 커스텀 이벤트로 구독자에게 알림
  window.dispatchEvent(new CustomEvent('tourInstancesChanged', { detail: data }));
  return data;
};

// ── CRUD ──

/** 모든 투어 인스턴스 조회 */
export const getAllInstances = () => load();

/** 특정 작가의 투어 인스턴스 (타입 무관 비교: 숫자/문자열 모두 매칭) */
export const getInstancesByPhotographer = (photographerId) =>
  load().filter(i => String(i.photographerId) === String(photographerId));

/** 특정 인스턴스 */
export const getInstance = (instanceId) =>
  load().find(i => i.id === instanceId) || null;

/** 모집 중인 투어만 (고객용) */
export const getRecruitingInstances = (photographerId) =>
  load().filter(i => i.photographerId === photographerId && (i.status === 'recruiting' || i.status === 'adjusting'));

/** 투어 인스턴스 생성 (작가가 일정 오픈) */
export const createInstance = ({
  photographerId, tourIndex, tourName,
  scheduledDate, scheduledTime = '10:00',
  deadline, maxGuests, minGuests,
  pricingType = 'perPerson', basePrice,
}) => {
  const all = load();
  const instance = {
    id: uuid(),
    photographerId,
    tourIndex,
    tourName,
    scheduledDate,
    scheduledTime,
    deadline,
    maxGuests,
    minGuests: minGuests ?? Math.ceil(maxGuests / 2),
    pricingType,
    basePrice,
    currentPrice: basePrice,
    status: 'recruiting',
    bookings: [],
    createdAt: new Date().toISOString(),
  };
  all.push(instance);
  save(all);
  return instance;
};

/** 투어 인스턴스 삭제 */
export const deleteInstance = (instanceId) => {
  const all = load().filter(i => i.id !== instanceId);
  save(all);
};

/** 투어 인스턴스 상태 변경 */
export const updateInstanceStatus = (instanceId, status) => {
  const all = load();
  const idx = all.findIndex(i => i.id === instanceId);
  if (idx === -1) return null;
  all[idx].status = status;
  save(all);
  return all[idx];
};

// ── 예약 (Booking) ──

/** 고객이 투어에 참가 신청 */
export const addBooking = (instanceId, { guestName, guestEmail, guestPhone = '', headcount = 1 }) => {
  const all = load();
  const idx = all.findIndex(i => i.id === instanceId);
  if (idx === -1) return { error: 'INSTANCE_NOT_FOUND' };

  const inst = all[idx];
  if (inst.status !== 'recruiting') return { error: 'NOT_RECRUITING' };

  const currentCount = getActiveBookingCount(inst);
  if (currentCount + headcount > inst.maxGuests) return { error: 'FULL' };

  const booking = {
    id: uuid(),
    guestName,
    guestEmail,
    guestPhone,
    headcount,
    bookedAt: new Date().toISOString(),
    status: 'active',
    confirmedAt: null,
  };
  inst.bookings.push(booking);

  // 자동 확정: 인원이 maxGuests에 도달하면
  const newCount = getActiveBookingCount(inst);
  if (newCount >= inst.maxGuests) {
    inst.status = 'confirmed';
  }

  save(all);
  return { booking, instance: inst };
};

/** 고객이 예약 취소 */
export const cancelBooking = (instanceId, bookingId) => {
  const all = load();
  const idx = all.findIndex(i => i.id === instanceId);
  if (idx === -1) return { error: 'INSTANCE_NOT_FOUND' };

  const inst = all[idx];
  const bIdx = inst.bookings.findIndex(b => b.id === bookingId);
  if (bIdx === -1) return { error: 'BOOKING_NOT_FOUND' };

  inst.bookings[bIdx].status = 'cancelled';

  // 확정 상태에서 취소 → deadline 전이면 재모집
  if (inst.status === 'confirmed') {
    const today = new Date().toISOString().slice(0, 10);
    if (today <= inst.deadline) {
      inst.status = 'recruiting';
    }
  }

  save(all);
  return { instance: inst };
};

/** 마감 도달 시 상태 평가 (cron 대용, 페이지 로드 시 호출) */
export const evaluateDeadlines = () => {
  const all = load();
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;

  all.forEach(inst => {
    if (inst.status !== 'recruiting') return;
    if (today < inst.deadline) return; // 아직 마감 전

    const count = getActiveBookingCount(inst);

    if (count >= inst.maxGuests) {
      // 이미 풀 → 확정
      inst.status = 'confirmed';
      changed = true;
    } else if (count >= inst.minGuests) {
      // 과반 이상 모임 → adjusting (가격 재계산 후 확인 요청)
      inst.status = 'adjusting';
      if (inst.pricingType === 'total') {
        // total 모드: 총액을 현재 인원으로 나눈 가격 재계산
        inst.currentPrice = Math.ceil(inst.basePrice / count);
      }
      // 참여자 상태를 pendingConfirm으로 변경
      inst.bookings.forEach(b => {
        if (b.status === 'active') b.status = 'pendingConfirm';
      });
      changed = true;
    } else {
      // 최소 인원 미달 → 취소
      inst.status = 'cancelled';
      changed = true;
    }
  });

  if (changed) save(all);
  return all;
};

/** adjusting 상태에서 고객이 새 가격 수락 */
export const confirmAdjustedPrice = (instanceId, bookingId) => {
  const all = load();
  const inst = all.find(i => i.id === instanceId);
  if (!inst || inst.status !== 'adjusting') return { error: 'NOT_ADJUSTING' };

  const booking = inst.bookings.find(b => b.id === bookingId);
  if (!booking) return { error: 'BOOKING_NOT_FOUND' };

  booking.status = 'active';
  booking.confirmedAt = new Date().toISOString();

  // 모든 pendingConfirm이 active로 바뀌면 → confirmed
  const pending = inst.bookings.filter(b => b.status === 'pendingConfirm');
  if (pending.length === 0) {
    inst.status = 'confirmed';
  }

  save(all);
  return { instance: inst };
};

/** adjusting 상태에서 고객이 새 가격 거절 (= 취소) */
export const declineAdjustedPrice = (instanceId, bookingId) => {
  const all = load();
  const inst = all.find(i => i.id === instanceId);
  if (!inst || inst.status !== 'adjusting') return { error: 'NOT_ADJUSTING' };

  const booking = inst.bookings.find(b => b.id === bookingId);
  if (!booking) return { error: 'BOOKING_NOT_FOUND' };

  booking.status = 'cancelled';

  // 남은 active + pendingConfirm 수 확인
  const remaining = inst.bookings.filter(b => b.status === 'active' || b.status === 'pendingConfirm');
  const remainCount = remaining.reduce((s, b) => s + b.headcount, 0);

  if (remainCount < inst.minGuests) {
    // 최소인원 미달 → 전체 취소
    inst.status = 'cancelled';
  } else {
    // 다시 가격 재계산
    if (inst.pricingType === 'total') {
      inst.currentPrice = Math.ceil(inst.basePrice / remainCount);
    }
  }

  save(all);
  return { instance: inst };
};

// ── 헬퍼 ──

/** 활성 예약 인원 수 */
export const getActiveBookingCount = (instance) =>
  instance.bookings
    .filter(b => b.status === 'active' || b.status === 'pendingConfirm')
    .reduce((sum, b) => sum + b.headcount, 0);

/** 투어 인스턴스의 현재 1인당 가격 (고객 표시용) */
export const getPerPersonPrice = (instance) => {
  if (instance.pricingType === 'perPerson') return instance.basePrice;
  // total 모드
  const count = getActiveBookingCount(instance);
  if (count === 0) return Math.ceil(instance.basePrice / instance.maxGuests);
  if (instance.status === 'adjusting') return instance.currentPrice;
  return Math.ceil(instance.basePrice / instance.maxGuests);
};

/** 남은 자리 수 */
export const getRemainingSlots = (instance) =>
  instance.maxGuests - getActiveBookingCount(instance);

/** 상태 라벨 (i18n) */
export const getStatusLabel = (status, lang = 'ko') => {
  const map = {
    recruiting:  { ko: '모집 중', en: 'Recruiting', ja: '募集中' },
    confirmed:   { ko: '확정',    en: 'Confirmed',  ja: '確定' },
    adjusting:   { ko: '가격 조정 중', en: 'Price Adjusting', ja: '価格調整中' },
    cancelled:   { ko: '취소됨',  en: 'Cancelled',  ja: 'キャンセル' },
    completed:   { ko: '완료',    en: 'Completed',  ja: '完了' },
  };
  return map[status]?.[lang] || map[status]?.en || status;
};

/** 상태별 색상 */
export const getStatusColor = (status) => {
  const map = {
    recruiting: '#e8a020',
    confirmed:  '#4caf50',
    adjusting:  '#ff9800',
    cancelled:  '#e85d5d',
    completed:  '#888',
  };
  return map[status] || '#888';
};

// ── Mock 데이터 시딩 (개발용) ──
export const seedMockInstances = (photographers) => {
  const existing = load();
  if (existing.length > 0) return; // 이미 있으면 스킵

  const today = new Date();
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().slice(0, 10); };

  const mocks = [];

  // 교토 골목 스냅 투어 (id:1, tourIdx:0) — 모집 중, 3/6명
  const p1 = photographers.find(p => p.id === 1);
  if (p1?.tours?.[0]) {
    mocks.push({
      id: 'mock-kyoto-1',
      photographerId: 1,
      tourIndex: 0,
      tourName: p1.tours[0].name,
      scheduledDate: addDays(today, 14),
      scheduledTime: '10:00',
      deadline: addDays(today, 7),
      maxGuests: 6,
      minGuests: 3,
      pricingType: 'total',
      basePrice: 350000,
      currentPrice: 350000,
      status: 'recruiting',
      bookings: [
        { id: 'bk-1', guestName: '김서윤', guestEmail: 'sy@test.com', guestPhone: '', headcount: 1, bookedAt: addDays(today, -3), status: 'active', confirmedAt: null },
        { id: 'bk-2', guestName: '이준호', guestEmail: 'jh@test.com', guestPhone: '', headcount: 2, bookedAt: addDays(today, -2), status: 'active', confirmedAt: null },
      ],
      createdAt: addDays(today, -5),
    });
  }

  // 경복궁 한복 스냅 투어 (id:2, tourIdx:0) — 모집 중, 4/5명
  const p2 = photographers.find(p => p.id === 2);
  if (p2?.tours?.[0]) {
    mocks.push({
      id: 'mock-seoul-1',
      photographerId: 2,
      tourIndex: 0,
      tourName: p2.tours[0].name,
      scheduledDate: addDays(today, 10),
      scheduledTime: '14:00',
      deadline: addDays(today, 3),
      maxGuests: 5,
      minGuests: 3,
      pricingType: 'total',
      basePrice: 300000,
      currentPrice: 300000,
      status: 'recruiting',
      bookings: [
        { id: 'bk-3', guestName: '박지민', guestEmail: 'jm@test.com', guestPhone: '', headcount: 2, bookedAt: addDays(today, -4), status: 'active', confirmedAt: null },
        { id: 'bk-4', guestName: 'Tanaka Yuki', guestEmail: 'tanaka@test.com', guestPhone: '', headcount: 1, bookedAt: addDays(today, -3), status: 'active', confirmedAt: null },
        { id: 'bk-5', guestName: '최예진', guestEmail: 'yj@test.com', guestPhone: '', headcount: 1, bookedAt: addDays(today, -1), status: 'active', confirmedAt: null },
      ],
      createdAt: addDays(today, -6),
    });
  }

  // 파리 로맨틱 투어 (id:3, tourIdx:0) — 확정 상태
  const p3 = photographers.find(p => p.id === 3);
  if (p3?.tours?.[0]) {
    mocks.push({
      id: 'mock-paris-1',
      photographerId: 3,
      tourIndex: 0,
      tourName: p3.tours[0].name,
      scheduledDate: addDays(today, 7),
      scheduledTime: '08:00',
      deadline: addDays(today, -1),
      maxGuests: 4,
      minGuests: 2,
      pricingType: 'total',
      basePrice: 450000,
      currentPrice: 450000,
      status: 'confirmed',
      bookings: [
        { id: 'bk-6', guestName: 'Emma Wilson', guestEmail: 'emma@test.com', guestPhone: '', headcount: 2, bookedAt: addDays(today, -8), status: 'active', confirmedAt: null },
        { id: 'bk-7', guestName: '강민수', guestEmail: 'ms@test.com', guestPhone: '', headcount: 2, bookedAt: addDays(today, -5), status: 'active', confirmedAt: null },
      ],
      createdAt: addDays(today, -10),
    });
  }

  if (mocks.length > 0) save(mocks);
};
