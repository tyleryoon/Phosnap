/**
 * Phosnap Waitlist Submission
 * ──────────────────────────
 * 백엔드: Formspree (https://formspree.io)
 *
 * 세팅 방법:
 *  1. https://formspree.io 에서 무료 계정 생성
 *  2. New Form 생성 → Form ID 복사 (예: xldgjrwq)
 *  3. 프로젝트 루트에 .env.local 파일 생성:
 *       VITE_FORMSPREE_ID=xldgjrwq
 *  4. npm run dev 재시작
 *
 * 환경변수 미설정 시: 콘솔 경고만 표시하고 성공 처리 (개발 편의용)
 */

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ID
  ? `https://formspree.io/f/${import.meta.env.VITE_FORMSPREE_ID}`
  : null;

/**
 * @param {object} data  제출 데이터
 * @param {string} data.email      이메일 (필수)
 * @param {string} [data.name]     이름
 * @param {string} [data.role]     역할 (customer / photographer / stylist)
 * @param {string} [data.instagram] 인스타그램 ID
 * @returns {Promise<void>}
 */
export async function submitWaitlist(data) {
  if (!FORMSPREE_ENDPOINT) {
    // FORMSPREE_ENDPOINT not configured
    return;
  }

  const res = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      name: data.name || '',
      role: data.role || 'customer',
      instagram: data.instagram || '',
      _subject: `[Phosnap] New waitlist signup — ${data.role || 'customer'}`,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Submission failed (${res.status})`);
  }
}
