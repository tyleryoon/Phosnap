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

// ─── 지역이 서로 맞는가 ────────────────────────────────────────────────
//
// 한 촬영에 서울 헤메와 부산 장소를 함께 부를 수는 없다.
//
// 그런데 '서울 사람' 이라고 못 박을 수도 없다. 헤메가 서울·부산·교토에서
// 활동하면 그 셋 중 어디서든 만날 수 있다. 그래서 각자가 '가능한 지역
// 목록' 을 들고 다니고, 담은 것들의 **교집합**이 비지 않으면 성립한다.
//
//   헤메  [서울, 부산, 교토]
//   장소  [부산]              → 교집합 [부산]  → 부산에서 만나면 된다
//
//   헤메  [서울]
//   장소  [부산]              → 교집합 []      → 만날 수 없다
//
// 지역을 지정하고 조회하면 목록 자체가 그 지역 것만 나오므로 교집합이
// 늘 성립한다. 이 검사가 실제로 일하는 건 '전 지역' 으로 볼 때다.

const CART_KEYS = ['photographer', 'stylist', 'dress', 'venue'];

/** 항목이 가능한 지역 목록. 모르면 null (아직 판단하지 않는다는 뜻) */
const locationsOf = (v) => {
  if (!v) return null;
  const ids = v.locationIds;
  if (Array.isArray(ids) && ids.length) return ids;
  // 옛 데이터는 단일 지역만 들고 있다
  if (v.locationId) return [v.locationId];
  return null;
};

/**
 * 담은 것들이 함께 만날 수 있는 지역.
 *
 * - []   : 담은 게 서로 안 맞는다 (결제를 막아야 한다)
 * - null : 판단할 정보가 없다 (지역을 안 가진 항목뿐)
 */
export const commonLocations = (cart) => {
  const lists = CART_KEYS.map((k) => locationsOf(cart?.[k])).filter(Boolean);
  if (!lists.length) return null;
  return lists.reduce((acc, list) => acc.filter((x) => list.includes(x)));
};

/**
 * 지역이 어긋났는가.
 *
 * 담은 게 둘 미만이면 어긋날 수가 없다 — 혼자서는 늘 자기 지역에 있다.
 */
export const locationConflict = (cart) => {
  const withLoc = CART_KEYS.filter((k) => locationsOf(cart?.[k]));
  if (withLoc.length < 2) return false;
  const common = commonLocations(cart);
  return Array.isArray(common) && common.length === 0;
};
