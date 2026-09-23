// ─── 장바구니 규칙 ─────────────────────────────────────────────────────
//
// BookCompose 안에 있던 것을 여기로 옮겼다. 전역 장바구니(CartContext)가
// 이 규칙을 써야 하는데, 컨텍스트가 페이지를 import 하면 순환 참조가 된다.
// 규칙은 화면이 아니라 규칙이 있을 곳에 둔다.

/**
 * 담은 구성에서 '주인 없는 자체 의상' 을 걷어낸다.
 *
 * 왜 필요한가
 *   자체 의상은 그 사람이 현장에 와야 입을 수 있다. 그런데 옷을 담아둔
 *   상태에서 주인(작가·헤메)을 빼거나 다른 사람으로 바꾸면, 의상 탭에서는
 *   그 옷이 사라지지만 **담은 목록에는 남는다.** 합계에도 계속 더해진다.
 *   아무도 안 가져오는 옷에 고객이 돈을 내게 된다. (규칙 5-18)
 *
 *   담기·빼기·패키지 선택·재조회 — 호출부마다 막으면 새 경로가 생길 때
 *   또 샌다. 쓰기를 한 곳으로 모아 여기서만 판단한다.
 *
 * 벤더 의상은 artistId·ownerStylistId 가 둘 다 null 이라 걸리지 않는다.
 * 누구를 담든 빼든 그대로 남는 게 맞다 — 벤더는 옷만 빌려주니까.
 */
export const normalizeCart = (c) => {
  const d = c.dress;
  if (!d) return c;
  if (d.artistId && c.photographer?.id !== d.artistId) return { ...c, dress: null };
  if (d.ownerStylistId && c.stylist?.stylistId !== d.ownerStylistId) return { ...c, dress: null };
  return c;
};
