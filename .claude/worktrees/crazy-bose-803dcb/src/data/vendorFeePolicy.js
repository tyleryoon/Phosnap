// ═══════════════════════════════════════════════════════════════════════
// Phosnap 벤더 수수료 정책 상수
// 변경 시 legal.js TERMS_VENDOR 제3조와 VendorRegister.jsx 동의 텍스트도 함께 업데이트
// ═══════════════════════════════════════════════════════════════════════
import { EARLY_ACCESS_DURATION_MONTHS } from '../lib/commission';

/**
 * 의상대여 수수료 단계 (단가 낮음 · 건수 많음)
 */
export const COSTUME_FEE_TIERS = [
  { tier: '월 10건 이하',   maxBookings: 10,       rate: 20 },
  { tier: '월 11~30건',     maxBookings: 30,       rate: 15 },
  { tier: '월 31건 이상',   maxBookings: Infinity, rate: 12 },
];

/**
 * 장소대여 수수료 단계 (단가 높음 · 건수 적음)
 */
export const VENUE_FEE_TIERS = [
  { tier: '월 10건 이하',   maxBookings: 10,       rate: 18 },
  { tier: '월 11~30건',     maxBookings: 30,       rate: 14 },
  { tier: '월 31건 이상',   maxBookings: Infinity, rate: 10 },
];

/**
 * 런칭 프로모션 (얼리억세스)
 */
export const VENDOR_EARLY_ACCESS = {
  durationMonths: EARLY_ACCESS_DURATION_MONTHS, // 런칭 후 6개월 이내 가입
  costumeRate: 12,           // 의상대여 프로모션 수수료 %
  venueRate: 10,             // 장소대여 프로모션 수수료 %
};

/**
 * 정산 관련 상수
 */
export const VENDOR_SETTLEMENT = {
  settlementDays: 3,         // D+3 영업일
  withholdingTaxRate: 3.3,   // 원천징수 %
  rateChangeNoticeDays: 30,  // 수수료 변경 사전 공지 일수
};

/**
 * 주어진 월 거래 건수에 대한 수수료율 계산
 * @param {'costume'|'venue'} vendorType - 벤더 유형
 * @param {number} monthlyBookings - 해당 월 거래 건수
 * @param {object} options - { isEarlyAccess: boolean }
 * @returns {number} 수수료율 (%)
 */
export const getVendorCommissionRate = (vendorType, monthlyBookings, options = {}) => {
  const { isEarlyAccess = false } = options;

  // 얼리억세스 기간 중이면 고정 수수료
  if (isEarlyAccess) {
    return vendorType === 'venue'
      ? VENDOR_EARLY_ACCESS.venueRate
      : VENDOR_EARLY_ACCESS.costumeRate;
  }

  // 유형별 거래량 기반 단계 수수료
  const tiers = vendorType === 'venue' ? VENUE_FEE_TIERS : COSTUME_FEE_TIERS;
  for (const t of tiers) {
    if (monthlyBookings <= t.maxBookings) return t.rate;
  }
  return tiers[tiers.length - 1].rate;
};
