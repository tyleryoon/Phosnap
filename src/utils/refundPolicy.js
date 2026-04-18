/**
 * Phosnap Refund Policy Calculator
 *
 * Policy:
 * - 7+ days before shoot: 100% refund
 * - 3-6 days before: 50% refund
 * - 0-2 days before: No refund
 */

export const REFUND_TIERS = [
  { minDays: 7, refundPercent: 100, label: { ko: '7일 전', en: '7+ days', ja: '7日前', zh: '7天前' } },
  { minDays: 3, refundPercent: 50, label: { ko: '3~6일 전', en: '3-6 days', ja: '3〜6日前', zh: '3-6天前' } },
  { minDays: 0, refundPercent: 0, label: { ko: '2일 이내', en: 'Within 2 days', ja: '2日以内', zh: '2天内' } },
];

/**
 * Calculate refund amount based on booking date and cancellation date
 * @param {number} totalPrice - booking total price
 * @param {string} shootDate - shoot date 'YYYY-MM-DD'
 * @param {string} cancelDate - cancellation date 'YYYY-MM-DD' (defaults to today)
 * @returns {{ refundPercent, refundAmount, daysUntilShoot, tier }}
 */
export const calculateRefund = (totalPrice, shootDate, cancelDate = null) => {
  const shoot = new Date(shootDate + 'T00:00:00');
  const cancel = cancelDate ? new Date(cancelDate + 'T00:00:00') : new Date();
  cancel.setHours(0, 0, 0, 0);

  const diffMs = shoot.getTime() - cancel.getTime();
  const daysUntilShoot = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let tier = REFUND_TIERS[REFUND_TIERS.length - 1]; // default: no refund
  for (const t of REFUND_TIERS) {
    if (daysUntilShoot >= t.minDays) {
      tier = t;
      break;
    }
  }

  const refundAmount = Math.round(totalPrice * tier.refundPercent / 100);

  return {
    refundPercent: tier.refundPercent,
    refundAmount,
    daysUntilShoot,
    tier,
    canRefund: tier.refundPercent > 0,
  };
};

/**
 * Check if a booking can be cancelled with refund
 */
export const canCancelWithRefund = (shootDate) => {
  const result = calculateRefund(100, shootDate);
  return result.canRefund;
};

/**
 * Get human-readable refund status
 */
export const getRefundStatus = (shootDate, lang = 'ko') => {
  const result = calculateRefund(100, shootDate);
  if (result.refundPercent === 100) {
    return { ko: '전액 환불 가능', en: 'Full refund available', ja: '全額返金可能', zh: '可全额退款' }[lang];
  } else if (result.refundPercent === 50) {
    return { ko: '50% 환불 가능', en: '50% refund available', ja: '50%返金可能', zh: '可退款50%' }[lang];
  }
  return { ko: '환불 불가', en: 'No refund', ja: '返金不可', zh: '不可退款' }[lang];
};
