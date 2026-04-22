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

/** 얼리엑세스 유효 기간 (개월) — 작가/벤더 공통 */
export const EARLY_ACCESS_DURATION_MONTHS = 6;

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

/** 건수별 수수료 단계 (오름차순) */
export const ARTIST_COMMISSION_STEPS = [
  { minCompleted: 0,   rate: 0.20, label: '20%', tier: '신규' },
  { minCompleted: 30,  rate: 0.15, label: '15%', tier: '성장' },
  { minCompleted: 100, rate: 0.12, label: '12%', tier: '상위 작가' },
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
