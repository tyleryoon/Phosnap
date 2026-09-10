// ─── Artist Schedule Data Layer ────────────────────────────────────────
// localStorage 기반 MVP 구현
// 실제 서비스: Supabase / Firebase 등 DB로 교체 예정
//
// 작가 유형: photographer | videographer | stylist
// 저장 키: phosnap_schedule_{type}_{id}

// ── 기본 시간 슬롯 (1시간 단위, 00:00~24:00) ──────────────────────────
export const DEFAULT_TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  '24:00',
];

// 패키지 시간(hours)에 따른 점유 슬롯 수
// 예: Story(2h) 13:00 선택 → 13:00~14:00, 14:00~15:00 점유
export const slotsForHours = (startTime, hours) => {
  const idx = DEFAULT_TIME_SLOTS.indexOf(startTime);
  if (idx < 0) return [];
  return DEFAULT_TIME_SLOTS.slice(idx, idx + hours);
};

// ── localStorage 키 ──────────────────────────────────────────────────
const storageKey = (type, id) => `phosnap_schedule_${type}_${id}`;

// ── 스케줄 데이터 구조 ───────────────────────────────────────────────
// {
//   defaultSlots: string[],   // 기본 운영 시간대
//   dates: {
//     'YYYY-MM-DD': {
//       dayOff: boolean,        // 해당 날짜 전체 차단
//       slots: string[],        // 이 날 운영할 슬롯 (없으면 defaultSlots 사용)
//       blocked: string[],      // 차단된 슬롯 (예약됨 or 수동 차단)
//     }
//   }
// }

// ── 초기 Mock 데이터 시딩 ────────────────────────────────────────────
const seedInitialData = () => {
  const today = new Date();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const getDateStr = (daysFromNow) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysFromNow);
    return fmt(d);
  };

  // 사진작가 4명 기본 데이터
  const photographerSeeds = {
    1: { // 정미나 (교토)
      defaultSlots: ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'],
      dates: {
        [getDateStr(1)]: { dayOff: false, slots: [], blocked: ['09:00','10:00'] },
        [getDateStr(2)]: { dayOff: false, slots: [], blocked: ['13:00','14:00','15:00'] },
        [getDateStr(5)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(6)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(8)]: { dayOff: false, slots: [], blocked: ['09:00','10:00','11:00','13:00'] },
        [getDateStr(14)]: { dayOff: false, slots: [], blocked: ['14:00','15:00'] },
      }
    },
    2: { // (파리 작가)
      defaultSlots: ['10:00','11:00','12:00','14:00','15:00','16:00','17:00'],
      dates: {
        [getDateStr(1)]: { dayOff: false, slots: [], blocked: ['10:00','11:00','12:00'] },
        [getDateStr(3)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(7)]: { dayOff: false, slots: [], blocked: ['14:00','15:00'] },
        [getDateStr(10)]: { dayOff: false, slots: [], blocked: ['10:00'] },
      }
    },
    3: { // (서울 작가)
      defaultSlots: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00'],
      dates: {
        [getDateStr(2)]: { dayOff: false, slots: [], blocked: ['09:00','10:00'] },
        [getDateStr(4)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(5)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(9)]: { dayOff: false, slots: [], blocked: ['12:00','13:00','14:00','15:00'] },
      }
    },
    4: { // (제주 작가)
      defaultSlots: ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'],
      dates: {
        [getDateStr(3)]: { dayOff: false, slots: [], blocked: ['09:00','10:00','11:00'] },
        [getDateStr(6)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(7)]: { dayOff: true,  slots: [], blocked: [] },
        [getDateStr(11)]: { dayOff: false, slots: [], blocked: ['13:00','14:00'] },
      }
    },
  };

  Object.entries(photographerSeeds).forEach(([id, data]) => {
    const key = storageKey('photographer', id);
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  });
};

// ── 공개 API ─────────────────────────────────────────────────────────

/** 작가 스케줄 전체를 가져옵니다 */
export const getSchedule = (type, id) => {
  try {
    const raw = localStorage.getItem(storageKey(type, id));
    if (raw) return JSON.parse(raw);
  } catch {}
  // 기본값: 모든 시간 슬롯이 닫혀있음 (모두 차단 상태)
  // 작가가 필요한 시간대만 수동으로 오픈하도록 변경
  return { defaultSlots: [], dates: {} };
};

/** 작가 스케줄 전체를 저장합니다 */
export const saveSchedule = (type, id, schedule) => {
  localStorage.setItem(storageKey(type, id), JSON.stringify(schedule));
};

/**
 * 특정 날짜의 가용 슬롯 목록 반환
 * @returns { slots: string[], blocked: string[], dayOff: boolean }
 */
export const getDaySchedule = (type, id, dateStr) => {
  const schedule = getSchedule(type, id);
  const dateData = schedule.dates?.[dateStr];

  if (dateData?.dayOff) {
    return { slots: [], blocked: [], dayOff: true };
  }

  const slots = (dateData?.slots && dateData.slots.length > 0)
    ? dateData.slots
    : schedule.defaultSlots ?? DEFAULT_TIME_SLOTS;

  const blocked = dateData?.blocked ?? [];

  return { slots, blocked, dayOff: false };
};

/**
 * 특정 날짜에서 실제 선택 가능한 슬롯만 반환
 */
export const getAvailableSlots = (type, id, dateStr) => {
  const { slots, blocked, dayOff } = getDaySchedule(type, id, dateStr);
  if (dayOff) return [];
  return slots.filter(s => !blocked.includes(s));
};

/**
 * 슬롯 차단/해제 토글
 */
export const toggleSlotBlocked = (type, id, dateStr, time) => {
  const schedule = getSchedule(type, id);
  if (!schedule.dates) schedule.dates = {};
  if (!schedule.dates[dateStr]) {
    schedule.dates[dateStr] = { dayOff: false, slots: [], blocked: [] };
  }
  const dateData = schedule.dates[dateStr];
  const idx = dateData.blocked.indexOf(time);
  if (idx >= 0) {
    dateData.blocked.splice(idx, 1);
  } else {
    dateData.blocked.push(time);
  }
  saveSchedule(type, id, schedule);
};

/**
 * 하루 전체 차단/해제
 */
export const toggleDayOff = (type, id, dateStr) => {
  const schedule = getSchedule(type, id);
  if (!schedule.dates) schedule.dates = {};
  if (!schedule.dates[dateStr]) {
    schedule.dates[dateStr] = { dayOff: false, slots: [], blocked: [] };
  }
  schedule.dates[dateStr].dayOff = !schedule.dates[dateStr].dayOff;
  saveSchedule(type, id, schedule);
};

/**
 * 특정 날짜의 운영 슬롯 설정 (기본값이 아닌 날짜별 커스텀)
 */
export const setDaySlots = (type, id, dateStr, slots) => {
  const schedule = getSchedule(type, id);
  if (!schedule.dates) schedule.dates = {};
  if (!schedule.dates[dateStr]) {
    schedule.dates[dateStr] = { dayOff: false, slots: [], blocked: [] };
  }
  schedule.dates[dateStr].slots = slots;
  saveSchedule(type, id, schedule);
};

/**
 * 기본 운영 시간 업데이트
 */
export const updateDefaultSlots = (type, id, slots) => {
  const schedule = getSchedule(type, id);
  schedule.defaultSlots = slots;
  saveSchedule(type, id, schedule);
};

/**
 * 날짜 범위 일괄 오픈
 * @param {string} startStr - 'YYYY-MM-DD'
 * @param {string} endStr   - 'YYYY-MM-DD'
 * @param {string[]} slots  - 이 범위에 적용할 시간 슬롯 배열
 * @param {string[]} excludeDays - 제외할 요일 인덱스 ['0'=일, '6'=토] etc.
 */
export const openDateRange = (type, id, startStr, endStr, slots, excludeDays = []) => {
  const schedule = getSchedule(type, id);
  if (!schedule.dates) schedule.dates = {};

  const start = new Date(startStr);
  const end   = new Date(endStr);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (excludeDays.includes(String(d.getDay()))) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    schedule.dates[key] = { dayOff: false, slots: [...slots], blocked: [] };
  }
  saveSchedule(type, id, schedule);
};

/** 선택 기간 전체 클로즈 (dayOff 처리) */
export const closeDateRange = (type, id, startStr, endStr, excludeDays = []) => {
  const schedule = getSchedule(type, id);
  if (!schedule.dates) schedule.dates = {};

  const start = new Date(startStr);
  const end   = new Date(endStr);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (excludeDays.includes(String(d.getDay()))) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    schedule.dates[key] = { dayOff: true, slots: [], blocked: [] };
  }
  saveSchedule(type, id, schedule);
};

/**
 * 달력에서 날짜별 상태 요약: 'off' | 'full' | 'partial' | 'open'
 */
export const getDateStatus = (type, id, dateStr) => {
  const { slots, blocked, dayOff } = getDaySchedule(type, id, dateStr);
  if (dayOff) return 'off';
  if (slots.length === 0) return 'off';
  const available = slots.filter(s => !blocked.includes(s));
  if (available.length === 0) return 'full';
  if (blocked.length > 0) return 'partial';
  return 'open';
};

/**
 * 패키지 시간(hours)을 고려하여 예약 가능한 시간 슬롯 반환
 * startTime + hours 범위가 blocked 슬롯과 겹치지 않는 시간만 반환
 * @param {string} type - 'photographer' | 'stylist'
 * @param {number|string} id - 작가 ID
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {number} hours - 패키지 시간 (시간 단위)
 * @returns {Array<{time: string, available: boolean, reason?: string}>}
 */
/**
 * 운영/차단 슬롯 배열로부터 예약 가능 시간대를 계산한다.
 *
 * getAvailableSlotsForDuration 은 localStorage 를 읽기 때문에 고객 화면에서는
 * 작가의 운영 시간을 알 수 없다. Supabase 에서 가져온 슬롯을 그대로 넣어
 * 같은 규칙(연속 시간 확보 · 차단 검사)을 적용하기 위한 순수 함수 버전이다.
 *
 * @param {string[]} slots   운영 슬롯 ('10:00' 형식)
 * @param {string[]} blocked 차단 슬롯
 * @param {number}   hours   패키지 소요 시간
 */
export const buildSlotData = (slots = [], blocked = [], hours = 1) => {
  if (!slots.length) return [];
  if (hours <= 1) {
    return slots.filter(s => !blocked.includes(s)).map(time => ({ time, available: true }));
  }
  return slots.map(time => {
    if (blocked.includes(time)) return { time, available: false, reason: 'blocked' };
    const needed = slotsForHours(time, hours);
    if (needed.length < hours) return { time, available: false, reason: 'overflow' };
    const conflict = needed.find(s => blocked.includes(s));
    if (conflict) return { time, available: false, reason: `conflict_${conflict}` };
    const outside = needed.find(s => !slots.includes(s));
    if (outside) return { time, available: false, reason: 'outside_hours' };
    return { time, available: true };
  }).filter(s => !blocked.includes(s.time));
};

export const getAvailableSlotsForDuration = (type, id, dateStr, hours = 1) => {
  const { slots, blocked, dayOff } = getDaySchedule(type, id, dateStr);
  if (dayOff) return [];

  const available = slots.filter(s => !blocked.includes(s));
  if (hours <= 1) {
    return available.map(time => ({ time, available: true }));
  }

  // hours > 1인 경우: startTime부터 hours개의 연속 슬롯이 모두 available해야 함
  return slots.map(time => {
    if (blocked.includes(time)) {
      return { time, available: false, reason: 'blocked' };
    }
    // 이 시간부터 hours 시간동안 필요한 슬롯들
    const needed = slotsForHours(time, hours);
    if (needed.length < hours) {
      // 운영 시간 밖으로 넘어감
      return { time, available: false, reason: 'overflow' };
    }
    // 필요한 슬롯 중 하나라도 blocked면 불가
    const conflict = needed.find(s => blocked.includes(s));
    if (conflict) {
      return { time, available: false, reason: `conflict_${conflict}` };
    }
    // 필요한 슬롯이 모두 운영 슬롯에 포함되어야 함
    const outsideSlot = needed.find(s => !slots.includes(s));
    if (outsideSlot) {
      return { time, available: false, reason: 'outside_hours' };
    }
    return { time, available: true };
  }).filter(s => !blocked.includes(s.time)); // blocked 시간은 아예 표시 안 함
};

// ── 초기화 (앱 시작 시 한 번 실행) ──────────────────────────────────
export const initSchedules = () => {
  try { seedInitialData(); } catch {}
};

// ─── Stylist Scheduling ─────────────────────────────────────────────────

const STYLIST_SCHEDULE_KEY = 'phosnap_stylist_schedules';

/**
 * 스타일리스트 스케줄 초기화
 * Mock 데이터로 3명의 스타일리스트 예약을 미리 설정
 */
export const initStylistSchedules = () => {
  try {
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const getDateStr = (daysFromNow) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromNow);
      return fmt(d);
    };

    // 스타일리스트 3명 Mock 데이터
    const stylistSeeds = {
      101: { // Hana Y. (야마모토 하나)
        defaultSlots: ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'],
        dates: {
          [getDateStr(1)]: { dayOff: false, slots: [], blocked: ['08:00','09:00','10:00'] },
          [getDateStr(2)]: { dayOff: false, slots: [], blocked: ['13:00','14:00','15:00'] },
          [getDateStr(3)]: { dayOff: true,  slots: [], blocked: [] },
          [getDateStr(6)]: { dayOff: false, slots: [], blocked: ['14:00','15:00','16:00'] },
          [getDateStr(10)]: { dayOff: false, slots: [], blocked: ['08:00','09:00'] },
        }
      },
      102: { // Soyeon P. (박소연)
        defaultSlots: ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'],
        dates: {
          [getDateStr(1)]: { dayOff: false, slots: [], blocked: ['09:00'] },
          [getDateStr(2)]: { dayOff: true,  slots: [], blocked: [] },
          [getDateStr(4)]: { dayOff: false, slots: [], blocked: ['14:00','15:00','16:00','17:00'] },
          [getDateStr(7)]: { dayOff: false, slots: [], blocked: ['11:00','12:00'] },
          [getDateStr(9)]: { dayOff: false, slots: [], blocked: ['09:00','10:00','11:00','12:00'] },
        }
      },
      103: { // Marie C. (마리 샤를로)
        defaultSlots: ['10:00','11:00','12:00','13:00','15:00','16:00','17:00','18:00'],
        dates: {
          [getDateStr(1)]: { dayOff: true,  slots: [], blocked: [] },
          [getDateStr(3)]: { dayOff: false, slots: [], blocked: ['10:00','11:00'] },
          [getDateStr(5)]: { dayOff: true,  slots: [], blocked: [] },
          [getDateStr(6)]: { dayOff: false, slots: [], blocked: ['15:00','16:00','17:00'] },
          [getDateStr(8)]: { dayOff: false, slots: [], blocked: ['13:00','15:00'] },
        }
      },
    };

    Object.entries(stylistSeeds).forEach(([id, data]) => {
      const key = storageKey('stylist', id);
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    });
  } catch {}
};

/**
 * 특정 날짜에서 스타일리스트의 가용 슬롯 반환
 * @param {number|string} stylistId - 스타일리스트 ID
 * @param {string} date - 'YYYY-MM-DD' 형식
 * @returns {string[]} 사용 가능한 시간 슬롯 배열
 */
export const getStylistAvailableSlots = (stylistId, date) => {
  const available = getAvailableSlots('stylist', stylistId, date);
  return available;
};

/**
 * 스타일리스트 특정 시간 슬롯 예약
 * @param {number|string} stylistId - 스타일리스트 ID
 * @param {string} date - 'YYYY-MM-DD' 형식
 * @param {string} timeSlot - 'HH:MM' 형식
 * @param {string} bookingId - 예약 ID (추적용)
 */
export const bookStylistSlot = (stylistId, date, timeSlot, bookingId) => {
  const schedule = getSchedule('stylist', stylistId);
  if (!schedule.dates) schedule.dates = {};
  if (!schedule.dates[date]) {
    schedule.dates[date] = { dayOff: false, slots: [], blocked: [] };
  }

  // 이미 차단된 슬롯이면 예외 발생
  if (schedule.dates[date].blocked.includes(timeSlot)) {
    throw new Error(`Stylist ${stylistId} is not available at ${date} ${timeSlot}`);
  }

  // 슬롯 차단 (예약으로 마킹)
  schedule.dates[date].blocked.push(timeSlot);

  // 예약 ID를 메타데이터로 저장 (선택적)
  if (!schedule.dates[date].bookings) {
    schedule.dates[date].bookings = {};
  }
  schedule.dates[date].bookings[timeSlot] = bookingId;

  saveSchedule('stylist', stylistId, schedule);
};

/**
 * 스타일리스트 예약 취소
 * @param {number|string} stylistId
 * @param {string} date
 * @param {string} timeSlot
 */
export const cancelStylistBooking = (stylistId, date, timeSlot) => {
  const schedule = getSchedule('stylist', stylistId);
  if (!schedule.dates || !schedule.dates[date]) return;

  const dateData = schedule.dates[date];
  const idx = dateData.blocked.indexOf(timeSlot);
  if (idx >= 0) {
    dateData.blocked.splice(idx, 1);
  }

  // 메타데이터 정리
  if (dateData.bookings) {
    delete dateData.bookings[timeSlot];
  }

  saveSchedule('stylist', stylistId, schedule);
};

/**
 * 스타일리스트 특정 날짜의 예약된 슬롯 조회
 * @param {number|string} stylistId
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {string[]} 예약된 시간 슬롯 배열
 */
export const getStylistBookedSlots = (stylistId, date) => {
  const { blocked } = getDaySchedule('stylist', stylistId, date);
  return blocked;
};

/**
 * 스타일리스트 날짜 상태 조회 (달력 표시용)
 * @param {number|string} stylistId
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {'off' | 'full' | 'partial' | 'open'} 상태
 */
export const getStylistDateStatus = (stylistId, date) => {
  return getDateStatus('stylist', stylistId, date);
};

/**
 * 스타일리스트 일정 범위 오픈 (날짜 범위)
 * @param {number|string} stylistId
 * @param {string} startStr - 'YYYY-MM-DD'
 * @param {string} endStr - 'YYYY-MM-DD'
 * @param {string[]} slots - 시간 슬롯 배열
 * @param {string[]} excludeDays - 제외할 요일
 */
export const openStylistDateRange = (stylistId, startStr, endStr, slots, excludeDays = []) => {
  openDateRange('stylist', stylistId, startStr, endStr, slots, excludeDays);
};

/**
 * 스타일리스트 일정 범위 클로즈
 * @param {number|string} stylistId
 * @param {string} startStr - 'YYYY-MM-DD'
 * @param {string} endStr - 'YYYY-MM-DD'
 * @param {string[]} excludeDays - 제외할 요일
 */
export const closeStylistDateRange = (stylistId, startStr, endStr, excludeDays = []) => {
  closeDateRange('stylist', stylistId, startStr, endStr, excludeDays);
};

/**
 * 스타일리스트 전체 스케줄 조회
 * @param {number|string} stylistId
 * @returns {Object} 스케줄 객체
 */
export const getStylistSchedule = (stylistId) => {
  return getSchedule('stylist', stylistId);
};

/**
 * 스타일리스트 전체 스케줄 저장
 * @param {number|string} stylistId
 * @param {Object} schedule - 스케줄 객체
 */
export const saveStylistSchedule = (stylistId, schedule) => {
  saveSchedule('stylist', stylistId, schedule);
};

// ─── Venue Scheduling ───────────────────────────────────────
const VENUE_SCHEDULE_KEY = 'phosnap_venue_schedules';

export const initVenueSchedules = () => {
  if (localStorage.getItem(VENUE_SCHEDULE_KEY)) return;

  const mock = {
    'vi-1': {  // 경복궁 한옥 스튜디오 Main Hall
      '2026-04-20': { open: true, blocked: ['10:00', '11:00', '12:00'] },
      '2026-04-22': { open: true, blocked: ['14:00', '15:00', '16:00'] },
    },
    'vi-2': {  // another venue
      '2026-04-21': { open: true, blocked: ['09:00', '10:00'] },
    },
  };
  localStorage.setItem(VENUE_SCHEDULE_KEY, JSON.stringify(mock));
};

export const getVenueSchedule = (venueItemId) => {
  const all = JSON.parse(localStorage.getItem(VENUE_SCHEDULE_KEY) || '{}');
  return all[venueItemId] || {};
};

export const saveVenueSchedule = (venueItemId, schedule) => {
  const all = JSON.parse(localStorage.getItem(VENUE_SCHEDULE_KEY) || '{}');
  all[venueItemId] = schedule;
  localStorage.setItem(VENUE_SCHEDULE_KEY, JSON.stringify(all));
};

export const getVenueAvailableSlots = (venueItemId, dateStr) => {
  const schedule = getVenueSchedule(venueItemId);
  const day = schedule[dateStr];
  if (!day || !day.open) return DEFAULT_TIME_SLOTS.slice(); // all available if not configured
  return DEFAULT_TIME_SLOTS.filter(slot => !(day.blocked || []).includes(slot));
};

export const bookVenueSlot = (venueItemId, dateStr, timeSlot, bookingId) => {
  const schedule = getVenueSchedule(venueItemId);
  if (!schedule[dateStr]) schedule[dateStr] = { open: true, blocked: [] };

  if (schedule[dateStr].blocked.includes(timeSlot)) {
    return { success: false, error: 'VENUE_DOUBLE_BOOKING' };
  }

  schedule[dateStr].blocked.push(timeSlot);
  saveVenueSchedule(venueItemId, schedule);
  return { success: true };
};

export const cancelVenueBooking = (venueItemId, dateStr, timeSlot) => {
  const schedule = getVenueSchedule(venueItemId);
  if (!schedule[dateStr]) return { success: false, error: 'NOT_FOUND' };
  schedule[dateStr].blocked = (schedule[dateStr].blocked || []).filter(s => s !== timeSlot);
  saveVenueSchedule(venueItemId, schedule);
  return { success: true };
};

export const getVenueBookedSlots = (venueItemId, dateStr) => {
  const schedule = getVenueSchedule(venueItemId);
  return schedule[dateStr]?.blocked || [];
};

export const getVenueDateStatus = (venueItemId, dateStr) => {
  const schedule = getVenueSchedule(venueItemId);
  const day = schedule[dateStr];
  if (!day) return 'open';
  const blocked = day.blocked?.length || 0;
  if (blocked >= DEFAULT_TIME_SLOTS.length) return 'full';
  if (blocked > 0) return 'partial';
  return 'open';
};
