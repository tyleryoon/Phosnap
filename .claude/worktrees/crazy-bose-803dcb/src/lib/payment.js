// ─── TossPayments CDN Loader ───────────────────────────────────────────
// TossPayments는 npm 대신 CDN 스크립트 방식으로 로드합니다.
// https://docs.tosspayments.com

const TOSS_CDN_URL = 'https://js.tosspayments.com/v1/payment';

/**
 * TossPayments SDK를 동적으로 로드하고 인스턴스를 반환합니다.
 * @param {string} clientKey - VITE_TOSS_CLIENT_KEY (test_ck_... 또는 live_ck_...)
 * @returns {Promise<object>} tossPayments 인스턴스
 */
export const loadTossPayments = (clientKey) => {
  return new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if (window.TossPayments) {
      resolve(window.TossPayments(clientKey));
      return;
    }

    const script = document.createElement('script');
    script.src = TOSS_CDN_URL;
    script.onload = () => {
      if (window.TossPayments) {
        resolve(window.TossPayments(clientKey));
      } else {
        reject(new Error('TossPayments SDK 로드 실패'));
      }
    };
    script.onerror = () => reject(new Error('TossPayments 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
};

/**
 * 고유한 주문 ID 생성 (TossPayments는 orderId 중복 불가)
 * 형식: phosnap-{timestamp}-{random6}
 */
export const generateOrderId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PHOSNAP-${ts}-${rand}`;
};
