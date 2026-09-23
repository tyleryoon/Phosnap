// 장바구니 지역 규칙 자체 검사
//
//   node src/lib/cart.check.mjs
//
// 이 규칙은 결제를 막는 판단이라 조용히 틀리면 안 된다. 서울 헤메와 부산
// 장소가 통과하면 고객이 못 오는 촬영에 돈을 낸다. 반대로 지나치게 막으면
// 서울·부산 둘 다 뛰는 헤메가 부산 촬영에서 사라진다. 양쪽을 다 잡아둔다.

import assert from 'node:assert/strict';
import { commonLocations, dressCharges, locationConflict, normalizeCart } from './cart.js';

const S = (ids) => ({ locationIds: ids });

// ── 어긋나는 경우 ────────────────────────────────────────────────────
assert.equal(
  locationConflict({ stylist: S(['seoul']), venue: S(['busan']) }),
  true,
  '서울 헤메 + 부산 장소는 막아야 한다',
);

// ── 겹치면 통과 (사용자가 말한 바로 그 경우) ─────────────────────────
assert.equal(
  locationConflict({ stylist: S(['seoul', 'busan', 'kyoto']), venue: S(['busan']) }),
  false,
  '헤메 활동지역에 부산이 있으면 부산 장소와 만날 수 있다',
);
assert.deepEqual(
  commonLocations({ stylist: S(['seoul', 'busan', 'kyoto']), venue: S(['busan']) }),
  ['busan'],
  '만날 수 있는 지역은 부산이다',
);

// ── 넷 다 걸린다 (작가·헤메·의상·장소 동일 규칙) ─────────────────────
assert.equal(
  locationConflict({
    photographer: S(['seoul', 'busan']),
    stylist: S(['busan', 'kyoto']),
    dress: S(['busan']),
    venue: S(['busan']),
  }),
  false,
  '넷 모두 부산을 포함하면 성립한다',
);
assert.equal(
  locationConflict({
    photographer: S(['seoul']),
    stylist: S(['seoul']),
    dress: S(['seoul']),
    venue: S(['busan']),
  }),
  true,
  '하나만 어긋나도 막아야 한다',
);

// ── 혼자면 어긋날 수 없다 ────────────────────────────────────────────
assert.equal(locationConflict({ venue: S(['busan']) }), false, '하나만 담으면 통과');
assert.equal(locationConflict({}), false, '빈 장바구니는 통과');

// ── 지역 정보가 없으면 판단하지 않는다 ───────────────────────────────
// 옛 데이터에는 locationIds 가 없다. 모른다고 막아버리면 멀쩡한 예약까지
// 멈춘다. 모를 때는 통과시키고, 아는 것끼리만 본다.
assert.equal(
  locationConflict({ stylist: { name: '헤메' }, venue: S(['busan']) }),
  false,
  '지역을 모르는 항목은 판단에서 뺀다',
);

// 단일 locationId 만 있는 옛 모양도 읽는다
assert.equal(
  locationConflict({ stylist: { locationId: 'seoul' }, venue: S(['busan']) }),
  true,
  '옛 단일 지역 필드도 판단에 쓴다',
);

// ── 자체 의상 규칙은 그대로 (회귀 방지) ──────────────────────────────
assert.equal(
  normalizeCart({ photographer: null, stylist: null, dress: { ownerStylistId: 'x' } }).dress,
  null,
  '주인이 빠지면 자체 의상도 빠진다',
);
assert.notEqual(
  normalizeCart({ stylist: { stylistId: 'x' }, dress: { ownerStylistId: 'x' } }).dress,
  null,
  '주인이 있으면 남는다',
);

// ── 의상 수령 방식 · 보증금 · 배송비 ────────────────────────────────
// 조용히 틀리면 고객이 안 내도 될 보증금을 내거나, 업체가 배송비를
// 못 받는다. 양쪽 다 나중에 사람이 전화로 푸는 일이 된다.

const 한복 = { fulfillment: ['byOwner', 'pickup', 'delivery'], deposit: 50000, deliveryFee: 12000 };

assert.deepEqual(
  dressCharges(한복, 'byOwner'),
  { methods: 한복.fulfillment, method: 'byOwner', deposit: 0, deliveryFee: 0 },
  '주인이 들고 가면 보증금도 배송비도 없다',
);
assert.deepEqual(
  dressCharges(한복, 'pickup'),
  { methods: 한복.fulfillment, method: 'pickup', deposit: 50000, deliveryFee: 0 },
  '픽업은 보증금만',
);
assert.deepEqual(
  dressCharges(한복, 'delivery'),
  { methods: 한복.fulfillment, method: 'delivery', deposit: 50000, deliveryFee: 12000 },
  '배송은 보증금 + 배송비',
);

// 고르지 않았으면 첫 번째 방식
assert.equal(dressCharges(한복).method, 'byOwner', '안 고르면 첫 번째');

// 이 의상이 안 받는 방식을 들고 있으면 무시한다.
// 장바구니에 남은 옛 선택이 의상을 바꾼 뒤에도 살아남으면,
// 배송이 안 되는 옷에 배송비가 붙는다.
const 픽업만 = { fulfillment: ['pickup'], deposit: 30000, deliveryFee: 9000 };
assert.deepEqual(
  dressCharges(픽업만, 'delivery'),
  { methods: ['pickup'], method: 'pickup', deposit: 30000, deliveryFee: 0 },
  '안 받는 방식은 무시하고 배송비도 안 붙는다',
);

// 옛 데이터 — fulfillment 칸이 없다
assert.equal(
  dressCharges({ ownerStylistId: 'x', deposit: 50000 }).deposit, 0,
  '옛 자체 의상은 주인이 들고 오는 것으로 본다',
);
assert.equal(
  dressCharges({ deposit: 50000 }).method, 'pickup',
  '옛 벤더 의상은 픽업으로 본다',
);

assert.deepEqual(
  dressCharges(null),
  { methods: [], method: null, deposit: 0, deliveryFee: 0 },
  '의상을 안 담았으면 받을 돈이 없다',
);

console.log('cart.check: 통과');
