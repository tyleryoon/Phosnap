// ─── Phosnap 수수료 정책 ──────────────────────────────────────────────
//
// 1) 작가 수수료 (플랫폼이 작가 수익에서 차감)
//    · 기본:     15%
//    · 실버:     13%   (월 5건 이상)
//    · 골드:     11%   (월 15건 이상)
//    · 플래티넘: 10%   (월 30건 이상)
//
// 2) 고객 서비스 수수료 (고객이 패키지 금액에 추가로 결제)
//    · 4% 고정
//    · 결제 화면에 "서비스 수수료 ₩X — 안전한 예약 보호 포함"으로 표시
//    · 작가 정산 계산에는 포함하지 않음
//
// 예시) 패키지 100,000원
//   고객 결제   = 100,000 + (100,000 × 4%)  = 104,000
//   작가 정산   = 100,000 − (100,000 × 15%) =  85,000
//   플랫폼 수익 = 4,000 (서비스 수수료) + 15,000 (작가 수수료) = 19,000
//
// ──────────────────────────────────────────────────────────────────────

/**
 * 고객이 패키지 금액 위에 추가로 결제하는 서비스 수수료율.
 * 작가 정산 계산에서는 제외된다.
 */
export const CUSTOMER_SERVICE_FEE_RATE = 0.04;

/**
 * 작가 등급 단계 (월 거래 건수 기반, 오름차순)
 *
 * 등급 판정은 결제 완료(또는 촬영 완료) 기준 최근 1개월의 건수를 사용한다.
 */
export const ARTIST_TIERS = [
  {
    id: 'standard',
    label: { ko: '기본',     en: 'Standard', ja: '基本',     zh: '基础' },
    minMonthlyBookings: 0,
    rate: 0.15,
    color: 'var(--muted)',
  },
  {
    id: 'silver',
    label: { ko: '실버',     en: 'Silver',   ja: 'シルバー',  zh: '白银' },
    minMonthlyBookings: 5,
    rate: 0.13,
    color: '#9aa3b0',
  },
  {
    id: 'gold',
    label: { ko: '골드',     en: 'Gold',     ja: 'ゴールド',  zh: '黄金' },
    minMonthlyBookings: 15,
    rate: 0.11,
    color: 'var(--gold)',
  },
  {
    id: 'platinum',
    label: { ko: '플래티넘', en: 'Platinum', ja: 'プラチナ',  zh: '铂金' },
    minMonthlyBookings: 30,
    rate: 0.10,
    color: '#c084fc',
  },
];

/**
 * 벤더 얼리억세스 기간(개월).
 * 벤더(의상/장소) 정책에서만 사용되며 작가 등급 산정에는 영향 없음.
 */
export const EARLY_ACCESS_DURATION_MONTHS = 6;

// ─── 작가 등급 / 정산 계산 ────────────────────────────────────────────

/**
 * 월 거래 건수에 해당하는 작가 등급을 반환한다.
 * @param {number} [monthlyBookings=0]
 */
export const getArtistTier = (monthlyBookings = 0) => {
  const safe = Number.isFinite(monthlyBookings) ? Math.max(0, monthlyBookings) : 0;
  const tier = [...ARTIST_TIERS]
    .reverse()
    .find((t) => safe >= t.minMonthlyBookings) || ARTIST_TIERS[0];
  const idx = ARTIST_TIERS.findIndex((t) => t.id === tier.id);
  const next = ARTIST_TIERS[idx + 1] || null;
  return {
    ...tier,
    monthlyBookings: safe,
    nextTier: next
      ? {
          ...next,
          remaining: Math.max(0, next.minMonthlyBookings - safe),
        }
      : null,
  };
};

/**
 * 작가 정산 금액을 계산한다.
 * 수수료는 패키지 금액에서만 차감된다 (의상/장소/스타일 등 부가 항목은 별도 정산).
 *
 * @param {Object} params
 * @param {number} params.packagePrice    - 작가 패키지 단가 (₩, 정수)
 * @param {number} [params.monthlyBookings=0] - 최근 1개월 완료 건수
 * @returns {{
 *   tier: object,
 *   rate: number,
 *   ratePercent: number,
 *   commission: number,
 *   payout: number
 * }}
 */
export const calculateArtistPayout = ({ packagePrice, monthlyBookings = 0 } = {}) => {
  const price = Math.max(0, Math.round(Number(packagePrice) || 0));
  const tier = getArtistTier(monthlyBookings);
  const commission = Math.round(price * tier.rate);
  const payout = price - commission;
  return {
    tier,
    rate: tier.rate,
    ratePercent: Math.round(tier.rate * 100),
    commission,
    payout,
  };
};

// ─── 고객 서비스 수수료 ───────────────────────────────────────────────

/**
 * 고객에게 부과되는 서비스 수수료(₩, 정수)를 계산한다.
 * 패키지 + 부가 항목(의상/스타일/장소 등)을 모두 포함한 합계를 기준으로 한다.
 *
 * @param {number} subtotal - 서비스 수수료가 더해지기 전의 합계
 * @returns {number} 서비스 수수료 (₩, 반올림 정수)
 */
export const calculateCustomerServiceFee = (subtotal) => {
  const base = Math.max(0, Math.round(Number(subtotal) || 0));
  return Math.round(base * CUSTOMER_SERVICE_FEE_RATE);
};

/**
 * 고객 결제 총액 분해.
 *
 * @param {number} subtotal
 * @returns {{ subtotal: number, serviceFee: number, total: number, ratePercent: number }}
 */
export const calculateCustomerTotal = (subtotal) => {
  const base = Math.max(0, Math.round(Number(subtotal) || 0));
  const serviceFee = calculateCustomerServiceFee(base);
  return {
    subtotal: base,
    serviceFee,
    total: base + serviceFee,
    ratePercent: Math.round(CUSTOMER_SERVICE_FEE_RATE * 100),
  };
};

// ─── 결제 화면 / 정책 안내 텍스트 ─────────────────────────────────────

/**
 * 결제 라인 아이템 라벨 (다국어).
 * "서비스 수수료 ₩X — 안전한 예약 보호 포함" 형식으로 표시된다.
 */
export const SERVICE_FEE_LABEL = {
  ko: '서비스 수수료',
  en: 'Service Fee',
  ja: 'サービス手数料',
  zh: '服务费',
};

export const SERVICE_FEE_DESCRIPTION = {
  ko: '안전한 예약 보호 포함',
  en: 'Includes booking protection',
  ja: '予約保護を含む',
  zh: '含安全预约保障',
};

export const ARTIST_COMMISSION_POLICY_TEXT = {
  ko: '작가 수수료: 기본 15% · 실버(월 5건+) 13% · 골드(월 15건+) 11% · 플래티넘(월 30건+) 10%. 월 거래 건수에 따라 자동 적용됩니다.',
  en: 'Artist commission: Standard 15%, Silver 13% (5+/mo), Gold 11% (15+/mo), Platinum 10% (30+/mo). Tier is calculated from monthly bookings.',
  ja: '作家手数料：基本 15% / シルバー(月5件+) 13% / ゴールド(月15件+) 11% / プラチナ(月30件+) 10%。月間取引件数で自動判定。',
  zh: '摄影师佣金：基础 15%、白银(月5单+) 13%、黄金(月15单+) 11%、铂金(月30单+) 10%。按月成单数自动判定。',
};

export const CUSTOMER_FEE_POLICY_TEXT = {
  ko: '고객 결제 시 4% 서비스 수수료가 추가됩니다 (안전한 예약 보호 포함). 작가 정산에는 포함되지 않습니다.',
  en: 'A 4% service fee (incl. booking protection) is added at checkout. It does not affect the artist payout.',
  ja: 'お会計時に4%のサービス手数料（予約保護含む）が加算されます。作家への精算には含まれません。',
  zh: '结算时另收4%服务费（含安全预约保障），不计入摄影师结算。',
};

/**
 * 정산 흐름 안내 텍스트 (대시보드, 약관 등에서 공유)
 */
export const SETTLEMENT_FLOW_TEXT = {
  ko: '결제 흐름: 고객이 패키지 금액 + 4% 서비스 수수료를 Phosnap에 결제 → Phosnap이 작가 등급별 수수료를 차감 후 작가에게 정산.',
  en: 'Payment flow: Customer pays the package price + 4% service fee to Phosnap → Phosnap deducts the tier-based commission and settles the rest to the artist.',
  ja: '決済フロー：お客様がパッケージ料金＋4%サービス手数料をPhosnapに決済 → 作家等級別の手数料を差し引いた残額を作家に精算。',
  zh: '结算流程：顾客向Phosnap支付套餐金额 + 4%服务费 → Phosnap按等级扣除佣金后将余额结算给摄影师。',
};
