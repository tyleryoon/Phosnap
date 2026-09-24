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

// ─── 헤메 요금 (시술비 + 동행비) ───────────────────────────────────────
//
// 현장에 함께 있어주는 값은 시술값에 섞지 않고 따로 받는다 (FIX_47).
//
//   before  촬영 전에 끝내고 현장에 남지 않는다 → 동행비 없음
//   during  촬영 중 합류 → 동행비
//   full    종료까지 동행 → 동행비
//
// 섞어두면 고객은 왜 비싼지 모르고, 헤메는 동행만 값을 조정할 수 없다.
// 화면이 아니라 여기서 판단한다 — 돈이 걸린 규칙이라 검사가 있어야 한다.

/** 이 시술이 현장에 남는가 */
export const isAccompany = (timing) => timing === 'during' || timing === 'full';

/**
 * 담은 헤메의 요금 내역.
 *
 * 동행비 단위 (FIX_48)
 *   flat  건당 정액 — 머무는 시간이 시술 길이로 고정인 '촬영 중 합류'
 *   hour  시간당    — 촬영 길이만큼 함께 있는 '종일 동행'
 *
 * 촬영 길이는 담을 때 항목에 같이 넣어둔다(shootHours). 앵커를 바꾸면
 * 장바구니가 비워지므로 값이 어긋날 일이 없고, 합계를 내는 쪽이 앵커를
 * 따로 들고 다니지 않아도 된다.
 *
 * before 에 동행비가 실려 와도 받지 않는다. 서버도 0 으로 내려보내지만,
 * 옛 장바구니에 남아 있던 값이 되살아나면 안 된다.
 */
export const stylistCharges = (stylist) => {
  if (!stylist) return { service: 0, accompany: 0, total: 0, unit: 'flat', rate: 0, hours: 0 };

  const service = stylist.price || 0;
  const unit = stylist.accompanyUnit === 'hour' ? 'hour' : 'flat';
  const rate = isAccompany(stylist.timing) ? stylist.accompanyFee || 0 : 0;

  // 시간을 모르면 곱하지 않는다. 0 을 곱해 공짜로 만드는 것보다
  // 정액으로 한 번 받는 쪽이 덜 틀린다.
  const hours = Number(stylist.shootHours) > 0 ? Number(stylist.shootHours) : 0;
  const accompany = unit === 'hour' && hours > 0 ? rate * hours : rate;

  return { service, accompany, total: service + accompany, unit, rate, hours };
};

// ─── 의상 수령 방식 · 보증금 · 배송비 ──────────────────────────────────
//
// 옷이 주인 손을 떠나는지로 갈린다.
//
//   byOwner   주인이 현장에 들고 온다 → 보증금 없음
//   pickup    고객이 매장에서 찾아간다 → 보증금
//   delivery  배송 → 보증금 + 배송비
//
// 화면이 아니라 여기서 판단한다. 돈이 걸린 규칙이고, 조용히 틀리면
// 고객이 안 내도 될 보증금을 내거나 업체가 배송비를 못 받는다.

/** 이 의상이 받을 수 있는 수령 방식. 옛 데이터도 읽는다. */
export const dressMethods = (dress) => {
  if (!dress) return [];
  if (dress.fulfillment?.length) return dress.fulfillment;
  // fulfillment 칸이 생기기 전 데이터 — 주인이 들고 오는 옷인지로 가른다
  return dress.ownerStylistId || dress.artistId ? ['byOwner'] : ['pickup'];
};

/**
 * 고른 수령 방식과 그에 따른 금액.
 *
 * 고른 게 없거나 이 의상이 안 받는 방식이면 첫 번째 방식으로 본다 —
 * 장바구니에 남아 있던 선택이 의상을 바꾼 뒤에도 살아남으면 안 된다.
 */
export const dressCharges = (dress, picked = null) => {
  const methods = dressMethods(dress);
  const method = picked && methods.includes(picked) ? picked : methods[0] || null;
  if (!dress || !method) return { methods, method: null, deposit: 0, deliveryFee: 0 };
  return {
    methods,
    method,
    deposit: method === 'byOwner' ? 0 : dress.deposit || 0,
    deliveryFee: method === 'delivery' ? dress.deliveryFee || 0 : 0,
  };
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
