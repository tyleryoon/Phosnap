// ─── 예약 아이템의 시간 점유 계산 ────────────────────────────────────
//
// 참여자마다 "언제 일하는가"가 전혀 다르다.
// 촬영 시간만 보고 판단하면 헤메 추천이 통째로 틀린다.
//
//   촬영 16:00 ~ 19:00 인 경우
//   ├ 작가 · 장소   16:00 ~ 19:00   촬영 시간 그대로
//   ├ 샵 헤메       14:00 ~ 16:00   시술 90분 + 이동 30분 (촬영 전 완료)
//   ├ 헤어변형      16:30 ~ 17:00   촬영 시작 30분 후 현장 합류
//   ├ 종일 동행     15:00 ~ 19:00   현장 시술 60분 후 종료까지 상주
//   └ 의상          하루 단위
//
// "16시에 가능한 헤메"를 찾으면 전원 오답이다. 샵 헤메는 그 시각에
// 이미 끝나 있어야 하고, 헤어변형은 아직 시작도 안 했다.
// ─────────────────────────────────────────────────────────────────────

const MIN = 60 * 1000;

const toDate = (v) => (v instanceof Date ? v : new Date(v));

/**
 * 아이템 1건의 시간 계산
 *
 * 두 가지 구간을 따로 돌려준다.
 *   start / end         — 실제 시술 구간. 고객에게 "14:00 시술 시작"으로 안내한다.
 *   busyStart / busyEnd — 공급자가 묶이는 구간. 충돌 판정에 쓴다.
 *
 * 둘을 구분해야 하는 이유는 이동 시간 때문이다.
 * 샵 시술이 15:30 에 끝나도 16:00 까지 이동 중이라
 * 그 30분에 다른 예약을 받으면 안 된다.
 *
 * @param {Object} p
 * @param {'shoot'|'before'|'during'|'full'|'day'} p.timing
 * @param {Date|string} p.shootStart
 * @param {Date|string} p.shootEnd
 * @param {number} [p.durationMinutes=0] - 시술 소요 시간
 * @param {number} [p.offsetMinutes=0]   - before·full=이동 버퍼, during=합류 지연
 * @returns {{start:Date, end:Date, busyStart:Date, busyEnd:Date}|null}
 */
export const computeSlot = ({
  timing = 'shoot',
  shootStart,
  shootEnd,
  durationMinutes = 0,
  offsetMinutes = 0,
}) => {
  if (!shootStart) return null;
  const s = toDate(shootStart);
  const e = shootEnd ? toDate(shootEnd) : new Date(s.getTime() + 120 * MIN);
  if (Number.isNaN(s.getTime())) return null;

  const dur = Math.max(0, Number(durationMinutes) || 0);
  const off = Math.max(0, Number(offsetMinutes) || 0);
  const at = (base, mins) => new Date(base.getTime() + mins * MIN);

  switch (timing) {
    // 작가 · 장소 — 촬영 시간 그대로
    case 'shoot':
      return { start: s, end: e, busyStart: s, busyEnd: e };

    // 촬영 전 완료 + 이동. 현장 시술이면 offset 0.
    //   시술 14:00~15:30 / 점유 14:00~16:00 (이동 30분 포함)
    case 'before': {
      const end = at(s, -off);
      const start = at(end, -dur);
      return { start, end, busyStart: start, busyEnd: s };
    }

    // 촬영 중 합류 (헤어변형). 이미 현장이라 이동 버퍼가 없다.
    case 'during': {
      const start = at(s, off);
      const raw = at(start, dur);
      const end = raw > e ? e : raw;
      return { start, end, busyStart: start, busyEnd: end };
    }

    // 촬영 전 시술 후 종료까지 상주 (야외스냅 종일 동행)
    //   시술 15:00~16:00 / 점유 15:00~19:00
    case 'full': {
      const start = at(s, -(off + dur));
      return { start, end: s, busyStart: start, busyEnd: e };
    }

    // 의상 — 하루 단위 점유
    case 'day': {
      const start = new Date(s); start.setHours(0, 0, 0, 0);
      const end = new Date(s);   end.setHours(23, 59, 59, 999);
      return { start, end, busyStart: start, busyEnd: end };
    }

    default:
      return { start: s, end: e, busyStart: s, busyEnd: e };
  }
};

/** 충돌 판정용 구간만 뽑기 */
export const busyRange = (slot) =>
  slot ? { start: slot.busyStart ?? slot.start, end: slot.busyEnd ?? slot.end } : null;

/** 두 구간이 겹치는가 */
export const overlaps = (a, b) => {
  if (!a || !b) return false;
  return toDate(a.start) < toDate(b.end) && toDate(b.start) < toDate(a.end);
};

/**
 * 같은 공급자가 여러 아이템을 맡으면 하나의 블록으로 합친다.
 *
 * 헤메가 샵 시술(14:00~16:00)과 헤어변형(16:30~17:00)을 둘 다 맡으면
 * 계산상 16:00~16:30 이 비어 보이지만, 그 30분에 다른 예약을 받으면
 * 물리적으로 불가능하다. 중간 공백은 무시하고 통으로 막는다.
 *
 * @param {Array} items - [{ providerId, start, end }]
 * @returns {Array} [{ providerId, start, end }]
 */
export const mergeProviderBlocks = (items = []) => {
  const byProvider = new Map();
  for (const it of items) {
    if (!it?.providerId) continue;
    const from = it.busyStart ?? it.start;
    const to = it.busyEnd ?? it.end;
    if (!from || !to) continue;
    const cur = byProvider.get(it.providerId);
    const start = toDate(from);
    const end = toDate(to);
    if (!cur) {
      byProvider.set(it.providerId, { providerId: it.providerId, start, end });
    } else {
      if (start < cur.start) cur.start = start;
      if (end > cur.end) cur.end = end;
    }
  }
  return [...byProvider.values()];
};

/**
 * 헤메 시술 메뉴가 이 촬영에 가능한지 판정
 *
 * @param {Object} service   - stylist_services 행 (timing, duration_minutes, offset_minutes, max_hours)
 * @param {Object} shoot     - { start, end }
 * @param {Array}  busy      - 해당 헤메가 이미 점유한 구간 [{ start, end }]
 * @returns {{ available: boolean, slot: Object|null, reason: string|null }}
 */
export const isServiceAvailable = (service, shoot, busy = []) => {
  if (!service || !shoot?.start) {
    return { available: false, slot: null, reason: 'invalid' };
  }

  const shootStart = toDate(shoot.start);
  const shootEnd = shoot.end ? toDate(shoot.end) : new Date(shootStart.getTime() + 120 * MIN);
  const shootHours = (shootEnd - shootStart) / (60 * MIN);

  // 종일 동행 메뉴는 감당 가능한 촬영 길이가 정해져 있다
  if (service.timing === 'full' && service.max_hours && shootHours > Number(service.max_hours)) {
    return { available: false, slot: null, reason: 'exceeds_max_hours' };
  }

  const slot = computeSlot({
    timing: service.timing || 'before',
    shootStart,
    shootEnd,
    durationMinutes: service.duration_minutes,
    offsetMinutes: service.offset_minutes ?? 30,
  });
  if (!slot) return { available: false, slot: null, reason: 'invalid' };

  // 과거 시각으로 역산되면(새벽 시술 등) 안내가 필요하다
  if (slot.start < new Date()) {
    return { available: false, slot, reason: 'past' };
  }

  // 충돌은 시술 구간이 아니라 점유 구간(이동 포함)으로 판정한다
  const conflict = busy.some(b => overlaps(busyRange(slot), b));
  return {
    available: !conflict,
    slot,
    reason: conflict ? 'conflict' : null,
  };
};

/** 시술 시점 라벨 (고객 안내용) */
export const timingLabel = (service, lang = 'ko') => {
  const off = service?.offset_minutes ?? 30;
  const ko = {
    before: off === 0 ? '촬영 전 현장에서 진행' : `촬영 시작 ${off}분 전까지 완료`,
    during: `촬영 시작 ${off}분 후 현장 합류`,
    full:   '촬영 전 시술 후 종료까지 동행',
  };
  const en = {
    before: off === 0 ? 'On-site before the shoot' : `Finishes ${off} min before the shoot`,
    during: `Joins on-site ${off} min after the shoot starts`,
    full:   'Prep before the shoot, stays through the end',
  };
  const table = lang === 'ko' ? ko : en;
  return table[service?.timing] || table.before;
};

/** date('YYYY-MM-DD') + time('HH:MM') + 시간 → { start, end } */
export const buildShootWindow = (date, time, hours = 2) => {
  if (!date || !time) return null;
  const start = new Date(`${date}T${time.length === 5 ? time : `${time}:00`}`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + (Number(hours) || 2) * 60 * MIN) };
};
