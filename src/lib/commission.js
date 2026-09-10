// ─── Phosnap 수수료 & 이탈 방지 정책 ─────────────────────────────────
//
// 핵심 원칙: "지속 가능한 수익 + 성장 유도"
// PG 수수료(3.5%) + 운영비를 고려하여 최저 8% 보장
//
// ▸ 작가 수수료 (건수 기반 자동 하향):
//   0~29건  → 20%
//   30~99건 → 15%
//   100건+  → 12%
//
// ▸ 얼리엑세스 (론칭 6개월 이내 가입):
//   고정 10% (PG 수수료 제외 실질 마진 6.5%)
//
// ▸ 초대코드 할인 (기간: 3개월):
//   초대한 작가 완료 5건+  → 1%p 할인
//   초대한 작가 완료 10건+ → 2%p 할인
//   초대한 작가 완료 20건+ → 3%p 할인
//
// ▸ 이탈 방지:
//   - 재예약 락인 (이전 고객 재예약 버튼 + 할인)
//   - 리뷰/랭킹 = 플랫폼 거래만 반영
//   - 빠른 정산: D+3 기본, D+1 옵션 (+2%p)
//   - 프리미엄 노출: 상단 노출 월 구독
//
// ──────────────────────────────────────────────────────────────────────

/** 얼리엑세스(얼리버드) 유효 기간 (개월) — 작가/헤메/벤더 공통
 *
 *  6개월 → 12개월로 연장.
 *  공급이 0인 상태에서 6개월은 작가 입장에서 "반년 안에 성과가 없으면 손해"라는
 *  계산이 서기 때문에 유입 장벽이 됐다.
 *
 *  ※ 변경 시 아래도 함께 수정할 것
 *     - src/data/legal.js  TERMS_VENDOR 제3조
 *     - src/pages/VendorRegister.jsx  가입 동의 문구
 *     - src/pages/ArtistDashboard.jsx / ArtistSchedule.jsx  안내 문구
 */
export const EARLY_ACCESS_DURATION_MONTHS = 12;

/** 수수료 등급 */
export const COMMISSION_TIERS = {
  early_access: {
    id: 'early_access',
    label: '얼리엑세스',
    labelEn: 'Early Access',
    rate: 0.10,
    durationMonths: EARLY_ACCESS_DURATION_MONTHS,
    description: `가입 후 ${EARLY_ACCESS_DURATION_MONTHS}개월간 고정 10%`,
  },
  new: {
    id: 'new',
    label: '신규 작가',
    labelEn: 'New',
    rate: 0.20,
    description: '신규 가입 작가 (20% → 건수에 따라 하향)',
  },
};

/** 건수별 수수료 단계 (오름차순)
 *
 *  기존 20/15/12 (30·100건) 에서 18/14/11 (15·50건) 로 완화했다.
 *  거래가 거의 없는 초기 플랫폼에서 100건 문턱은 사실상 도달 불가라
 *  "많이 하면 낮아진다"는 유도가 공수표로 들렸다.
 */
export const ARTIST_COMMISSION_STEPS = [
  { minCompleted: 0,  rate: 0.18, label: '18%', tier: '신규' },
  { minCompleted: 15, rate: 0.14, label: '14%', tier: '성장' },
  { minCompleted: 50, rate: 0.11, label: '11%', tier: '상위 작가' },
];

/** 초대코드 할인 단계 (등급 유효기간: 3개월, 무제한 초대 가능) */
export const REFERRAL_DISCOUNTS = [
  { minCompleted: 5,  discount: 0.01, label: '1%p 할인' },
  { minCompleted: 10, discount: 0.02, label: '2%p 할인' },
  { minCompleted: 20, discount: 0.03, label: '3%p 할인' },
];

/** 초대 등급 유효 기간 (일) */
export const REFERRAL_VALID_DAYS = 90;

/** 초대 등급 유지/실패/재상승 정책 */
export const REFERRAL_TIER_RULES = {
  // 유지 조건: 월 3건 이상
  maintainMinMonthly: 3,
  // 등급 유효기간
  tierValidMonths: 3,
  // 실패 시: 1회 미달 → 유지, 2회 연속 미달 → 1단계 하락
  gracePeriod: 1,      // 1회까지 유지
  dropAfterFails: 2,   // 2회 연속 미달 시 하락
  // 재상승: 최근 30일 5건 → 1단계 상승
  reUpgradeCount: 5,
  reUpgradeDays: 30,
};

/** 최저 수수료율 (PG 수수료 3.5% + 최소 운영 마진 4.5%) */
export const MIN_COMMISSION_RATE = 0.08;

// ─── 건당 수수료 상한 ────────────────────────────────────────────────
//
// 정률만 쓰면 고액 예약에서 이탈 유인이 폭발한다.
// 웨딩 패키지 ₩1,200,000 × 18% = ₩216,000 —
// 작가가 "직접 하시면 10만원 빼드릴게요" 하면 양쪽 다 이득이고
// 플랫폼만 손해다. 상한을 씌우면 그 유인이 줄어든다.
//
// 약 83만원(150,000 ÷ 0.18)까지는 아무 변화가 없고
// 그 위로만 실효 요율이 자동으로 내려간다.
export const COMMISSION_CAP = 150000;

// ─── 헤메(스타일리스트) 수수료 ───────────────────────────────────────
// 작가보다 단가가 낮고 건수가 많은 특성을 반영해 한 단계씩 낮게 잡는다.
export const STYLIST_COMMISSION_STEPS = [
  { minCompleted: 0,  rate: 0.15, label: '15%', tier: '신규' },
  { minCompleted: 15, rate: 0.12, label: '12%', tier: '성장' },
  { minCompleted: 50, rate: 0.10, label: '10%', tier: '상위' },
];

// ─── 콜라보 우대 ─────────────────────────────────────────────────────
//
// 공급자끼리 팀을 짜면 그 팀이 통째로 플랫폼을 떠날 수 있다.
// 콜라보 우대는 장려책이자 이탈 방어 장치다 —
// "플랫폼 안에서 팀을 짜야 수수료가 싸다"가 성립해야 남을 이유가 생긴다.
//
// 요율은 내려가지만 객단가가 오르므로 플랫폼 매출은 오히려 늘어난다.
//   작가 단독  ₩250,000 × 18%          = ₩45,000
//   3자 콜라보 ₩520,000 (16/13/18%)    = ₩82,600  (+84%)
export const COLLAB_DISCOUNTS = [
  { providers: 2, discount: 0.01, label: '2인 콜라보 −1%p' },
  { providers: 3, discount: 0.02, label: '3인 콜라보 −2%p' },
  { providers: 4, discount: 0.03, label: '4인 콜라보 −3%p' },
];

/** 얼리버드 선착순 정원 */
export const EARLY_BIRD_SEATS = 50;

/** 얼리버드 종료 후 완충 구간 — 10% → 13% → 일반요율 */
export const EARLY_BIRD_STEP_DOWN = { rate: 0.13, months: 6 };

/** 공급자 유형별 기본 요율표 */
export const PROVIDER_STEPS = {
  photographer: ARTIST_COMMISSION_STEPS,
  stylist:      STYLIST_COMMISSION_STEPS,
  dress:        [
    { minCompleted: 0,  rate: 0.20, tier: '신규' },
    { minCompleted: 15, rate: 0.15, tier: '성장' },
    { minCompleted: 50, rate: 0.12, tier: '상위' },
  ],
  venue: [
    { minCompleted: 0,  rate: 0.18, tier: '신규' },
    { minCompleted: 15, rate: 0.14, tier: '성장' },
    { minCompleted: 50, rate: 0.10, tier: '상위' },
  ],
};

/** 얼리버드 고정 요율 (유형별) */
export const EARLY_BIRD_RATES = {
  photographer: 0.10,
  stylist:      0.10,
  dress:        0.12,
  venue:        0.10,
};

/**
 * 아이템 1건의 수수료 계산
 *
 * 수수료는 예약 단위가 아니라 "정산받는 사람 단위"로 계산한다.
 * 작가가 헤메를 데려왔다고 작가 요율이 달라지지 않는다.
 *
 * @param {Object}  p
 * @param {'photographer'|'stylist'|'dress'|'venue'} p.providerType
 * @param {number}  p.price             - 공급가액 (부가세 제외)
 * @param {number}  [p.completedCount]  - 해당 공급자의 누적 완료 건수
 * @param {boolean} [p.isEarlyBird]     - 얼리버드 여부
 * @param {string}  [p.earlyBirdUntil]  - 얼리버드 만료 시각 (ISO)
 * @param {number}  [p.collabCount]     - 이 예약의 정산 참여자 수
 */
export const calculateItemCommission = ({
  providerType = 'photographer',
  price = 0,
  completedCount = 0,
  isEarlyBird = false,
  earlyBirdUntil = null,
  collabCount = 1,
}) => {
  const amount = Number(price) || 0;
  const steps = PROVIDER_STEPS[providerType] || PROVIDER_STEPS.photographer;

  // 1) 기본 요율 — 누적 건수 기반
  const step = [...steps].reverse().find(s => completedCount >= s.minCompleted);
  let rate = step ? step.rate : steps[0].rate;
  let tierLabel = step?.tier || '신규';

  // 2) 얼리버드 — 기본 요율과 비교해 낮은 쪽
  const earlyActive = isEarlyBird &&
    (!earlyBirdUntil || Date.now() < new Date(earlyBirdUntil).getTime());
  if (earlyActive) {
    const earlyRate = EARLY_BIRD_RATES[providerType] ?? 0.10;
    if (earlyRate < rate) {
      rate = earlyRate;
      tierLabel = '얼리버드';
    }
  }

  // 3) 콜라보 우대 — 정산받는 참여자가 2인 이상일 때
  const collabStep = [...COLLAB_DISCOUNTS]
    .reverse()
    .find(d => collabCount >= d.providers);
  const collabDiscount = collabStep ? collabStep.discount : 0;
  rate -= collabDiscount;

  // 4) 하한 보장 (PG 3.5% + 최소 운영 마진 4.5%)
  rate = Math.max(rate, MIN_COMMISSION_RATE);

  // 5) 건당 상한 적용
  const uncapped = Math.round(amount * rate);
  const commission = Math.min(uncapped, COMMISSION_CAP);
  const capped = uncapped > COMMISSION_CAP;

  return {
    rate,                                        // 상한 적용 전 요율
    ratePercent: Math.round(rate * 1000) / 10,
    commission,                                  // 실제 수수료
    payout: amount - commission,                 // 공급자 실수령 (원천징수 전)
    capped,                                      // 상한에 걸렸는지
    effectiveRate: amount > 0 ? commission / amount : 0,
    collabDiscount,
    tierLabel,
  };
};

/**
 * 예약 1건의 전체 수수료 계산
 *
 * 콜라보 인원수는 "금액이 0보다 큰 고유 provider 수"로 센다.
 * 금액 0원짜리를 끼워 넣어 인원수만 늘리는 어뷰징을 막기 위함이다.
 *
 * @param {Array} items - [{ providerType, providerId, price, completedCount, isEarlyBird, earlyBirdUntil }]
 */
export const calculateBookingCommissions = (items = []) => {
  const billable = items.filter(i => (Number(i.price) || 0) > 0);
  const collabCount = new Set(billable.map(i => i.providerId)).size || 1;

  const priced = items.map(item => ({
    ...item,
    ...calculateItemCommission({ ...item, collabCount }),
  }));

  return {
    items: priced,
    collabCount,
    subtotal:        priced.reduce((s, i) => s + (Number(i.price) || 0), 0),
    commissionTotal: priced.reduce((s, i) => s + (i.commission || 0), 0),
    payoutTotal:     priced.reduce((s, i) => s + (i.payout || 0), 0),
  };
};

// ─── 이탈 방지 전략 상수 ──────────────────────────────────────────────

/** 정산 옵션 */
export const SETTLEMENT_OPTIONS = {
  standard: { days: 3, label: 'D+3 정산', extraFee: 0 },
  express:  { days: 1, label: 'D+1 빠른 정산', extraFee: 0.02 },
};

/** 재예약 할인 (이전 고객이 같은 작가 재예약 시) */
export const REBOOKING_DISCOUNT = {
  rate: 0.05,
  label: '재예약 할인 5%',
};

/** 프리미엄 노출 구독 */
export const PREMIUM_EXPOSURE = {
  monthly: 50000,
  label: '프리미엄 상단 노출',
  benefits: ['지역 검색 상단 노출', '추천 작가 뱃지', '프로필 하이라이트'],
};

// ─── Phase 로드맵 (참조용) ──────────────────────────────────────────
export const PHASE_ROADMAP = {
  phase1: {
    label: 'Phase 1 — 초기 (6개월)',
    commissionRange: '10~20%',
    goal: '작가 50명 확보',
    strategy: '얼리엑세스 10% 고정으로 초기 유입, 일반 20%로 수익 확보',
  },
  phase2: {
    label: 'Phase 2 — 성장',
    commissionRange: '12~20%',
    goal: '노출/광고 상품 추가, 고객 유입 증가',
    strategy: '건수 기반 자동 하향으로 "많이 하면 수수료 낮아진다" 유도',
  },
  phase3: {
    label: 'Phase 3 — 안착',
    commissionRange: '상위 12%, 신규 20%',
    goal: '안정적 수익 구조',
    strategy: '상위 작가 12% + 프리미엄 구독으로 이탈 방지',
  },
};

/**
 * 얼리엑세스 만료 여부 확인
 * @param {string|Date} joinedAt - 가입일
 * @returns {boolean} 아직 유효하면 true
 */
export const isEarlyAccessValid = (joinedAt) => {
  if (!joinedAt) return false;
  const joined = new Date(joinedAt);
  const expiry = new Date(joined);
  expiry.setMonth(expiry.getMonth() + EARLY_ACCESS_DURATION_MONTHS);
  return Date.now() < expiry.getTime();
};

/**
 * 작가의 현재 수수료율 계산
 *
 * @param {Object} params
 * @param {boolean} params.isEarlyAccess - 얼리엑세스 여부
 * @param {string}  [params.joinedAt=null] - 가입일 (얼리엑세스 만료 체크용)
 * @param {number}  params.completedCount - 본인 촬영 완료 건수
 * @param {number}  [params.referredCompletedCount=0] - 초대한 작가의 촬영 완료 건수
 * @param {Date}    [params.referralDate=null] - 초대 코드 사용일
 * @param {boolean} [params.expressSettlement=false] - 빠른 정산 사용 여부
 */
export const calculateCommission = ({
  isEarlyAccess = false,
  joinedAt = null,
  completedCount = 0,
  referredCompletedCount = 0,
  referralDate = null,
  expressSettlement = false,
}) => {
  // 기본 수수료 (건수 기반)
  const step = [...ARTIST_COMMISSION_STEPS]
    .reverse()
    .find(s => completedCount >= s.minCompleted);
  let baseRate = step ? step.rate : ARTIST_COMMISSION_STEPS[0].rate;
  let tierLabel = step ? step.tier : '신규';

  // 얼리엑세스: 가입 후 6개월 이내 + 기본 수수료와 10% 중 낮은 것 적용
  const earlyAccessActive = isEarlyAccess && isEarlyAccessValid(joinedAt);
  if (earlyAccessActive) {
    baseRate = Math.min(baseRate, COMMISSION_TIERS.early_access.rate);
    tierLabel = '얼리엑세스';
  }

  // 초대코드 할인 (3개월 유효)
  let referralDiscount = 0;
  if (referredCompletedCount > 0) {
    const isValid = !referralDate ||
      (Date.now() - new Date(referralDate).getTime()) < REFERRAL_VALID_DAYS * 86400000;
    if (isValid) {
      const discount = [...REFERRAL_DISCOUNTS]
        .reverse()
        .find(d => referredCompletedCount >= d.minCompleted);
      if (discount) referralDiscount = discount.discount;
    }
  }

  // 빠른 정산 추가 수수료
  const expressExtra = expressSettlement ? SETTLEMENT_OPTIONS.express.extraFee : 0;

  // 최종 수수료 (최저 보장)
  const rate = Math.max(baseRate - referralDiscount + expressExtra, MIN_COMMISSION_RATE);

  // 다음 단계 안내
  const nextStep = ARTIST_COMMISSION_STEPS.find(s => completedCount < s.minCompleted);
  const nextStepInfo = nextStep ? {
    remaining: nextStep.minCompleted - completedCount,
    targetRate: nextStep.rate,
    label: `${nextStep.minCompleted}건 완료 시 ${Math.round(nextStep.rate * 100)}%`,
  } : null;

  return {
    rate,
    baseRate,
    referralDiscount,
    expressExtra,
    tierLabel,
    nextStep: nextStepInfo,
    ratePercent: Math.round(rate * 100),
    baseRatePercent: Math.round(baseRate * 100),
  };
};

/**
 * 수수료 정책 안내 텍스트
 */
export const COMMISSION_POLICY_TEXT = {
  ko: '결제는 고객 → Phosnap → 작가 순으로 정산됩니다. 수수료는 얼리엑세스 10% 고정, 신규 작가 20%(촬영 완료 30건 이상 15%, 100건 이상 12%)가 적용됩니다.',
  en: 'Payments are settled: Customer → Phosnap → Artist. Commission: Early Access 10% fixed, New 20% (15% after 30 shoots, 12% after 100).',
  ja: '決済は顧客→Phosnap→作家の順で精算。手数料：アーリーアクセス10%固定、新規20%（30件以上15%、100件以上12%）。',
};
