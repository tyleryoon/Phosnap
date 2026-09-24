// 장바구니 지역 규칙 자체 검사
//
//   node src/lib/cart.check.mjs
//
// 이 규칙은 결제를 막는 판단이라 조용히 틀리면 안 된다. 서울 헤메와 부산
// 장소가 통과하면 고객이 못 오는 촬영에 돈을 낸다. 반대로 지나치게 막으면
// 서울·부산 둘 다 뛰는 헤메가 부산 촬영에서 사라진다. 양쪽을 다 잡아둔다.

import assert from 'node:assert/strict';
import {
  commonLocations,
  dressCharges,
  locationConflict,
  normalizeCart,
  stylistCharges,
} from './cart.js';

const S = (ids) => ({ locationIds: ids });

// ── 어긋나는 경우 ────────────────────────────────────────────────────
assert.equal(
  locationConflict({ stylist: S(['seoul']), venue: S(['busan']) }),
  true,
  '서울 헤메 + 부산 장소는 막아야 한다'
);

// ── 겹치면 통과 (사용자가 말한 바로 그 경우) ─────────────────────────
assert.equal(
  locationConflict({ stylist: S(['seoul', 'busan', 'kyoto']), venue: S(['busan']) }),
  false,
  '헤메 활동지역에 부산이 있으면 부산 장소와 만날 수 있다'
);
assert.deepEqual(
  commonLocations({ stylist: S(['seoul', 'busan', 'kyoto']), venue: S(['busan']) }),
  ['busan'],
  '만날 수 있는 지역은 부산이다'
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
  '넷 모두 부산을 포함하면 성립한다'
);
assert.equal(
  locationConflict({
    photographer: S(['seoul']),
    stylist: S(['seoul']),
    dress: S(['seoul']),
    venue: S(['busan']),
  }),
  true,
  '하나만 어긋나도 막아야 한다'
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
  '지역을 모르는 항목은 판단에서 뺀다'
);

// 단일 locationId 만 있는 옛 모양도 읽는다
assert.equal(
  locationConflict({ stylist: { locationId: 'seoul' }, venue: S(['busan']) }),
  true,
  '옛 단일 지역 필드도 판단에 쓴다'
);

// ── 자체 의상 규칙은 그대로 (회귀 방지) ──────────────────────────────
assert.equal(
  normalizeCart({ photographer: null, stylist: null, dress: { ownerStylistId: 'x' } }).dress,
  null,
  '주인이 빠지면 자체 의상도 빠진다'
);
assert.notEqual(
  normalizeCart({ stylist: { stylistId: 'x' }, dress: { ownerStylistId: 'x' } }).dress,
  null,
  '주인이 있으면 남는다'
);

// ── 의상 수령 방식 · 보증금 · 배송비 ────────────────────────────────
// 조용히 틀리면 고객이 안 내도 될 보증금을 내거나, 업체가 배송비를
// 못 받는다. 양쪽 다 나중에 사람이 전화로 푸는 일이 된다.

const 한복 = { fulfillment: ['byOwner', 'pickup', 'delivery'], deposit: 50000, deliveryFee: 12000 };

assert.deepEqual(
  dressCharges(한복, 'byOwner'),
  { methods: 한복.fulfillment, method: 'byOwner', deposit: 0, deliveryFee: 0 },
  '주인이 들고 가면 보증금도 배송비도 없다'
);
assert.deepEqual(
  dressCharges(한복, 'pickup'),
  { methods: 한복.fulfillment, method: 'pickup', deposit: 50000, deliveryFee: 0 },
  '픽업은 보증금만'
);
assert.deepEqual(
  dressCharges(한복, 'delivery'),
  { methods: 한복.fulfillment, method: 'delivery', deposit: 50000, deliveryFee: 12000 },
  '배송은 보증금 + 배송비'
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
  '안 받는 방식은 무시하고 배송비도 안 붙는다'
);

// 옛 데이터 — fulfillment 칸이 없다
assert.equal(
  dressCharges({ ownerStylistId: 'x', deposit: 50000 }).deposit,
  0,
  '옛 자체 의상은 주인이 들고 오는 것으로 본다'
);
assert.equal(dressCharges({ deposit: 50000 }).method, 'pickup', '옛 벤더 의상은 픽업으로 본다');

assert.deepEqual(
  dressCharges(null),
  { methods: [], method: null, deposit: 0, deliveryFee: 0 },
  '의상을 안 담았으면 받을 돈이 없다'
);

// ── 헤메 시술비 · 동행비 ─────────────────────────────────────────────
// 동행값을 시술값에 섞지 않는다. 섞이면 고객은 왜 비싼지 모르고,
// 촬영 전 시술에까지 동행비가 붙으면 안 받을 돈을 받는다.

const fee = (o) => {
  const c = stylistCharges(o);
  return { service: c.service, accompany: c.accompany, total: c.total };
};

assert.deepEqual(
  fee({ price: 120000, timing: 'before', accompanyFee: 50000, shootHours: 4 }),
  { service: 120000, accompany: 0, total: 120000 },
  '촬영 전 시술은 현장에 남지 않으므로 동행비가 없다'
);
assert.deepEqual(
  fee({ price: 120000, timing: 'during', accompanyFee: 50000, shootHours: 4 }),
  { service: 120000, accompany: 50000, total: 170000 },
  '촬영 중 합류는 정액 — 촬영이 길어져도 머무는 시간은 그대로다'
);
assert.deepEqual(
  fee({ price: 90000, timing: 'full' }),
  { service: 90000, accompany: 0, total: 90000 },
  '동행비를 안 정했으면 0 이다 — 없는 돈을 지어내지 않는다'
);
assert.deepEqual(
  stylistCharges(null),
  { service: 0, accompany: 0, total: 0, unit: 'flat', rate: 0, hours: 0 },
  '헤메를 안 담았으면 받을 돈이 없다'
);

// ── 시간당 동행 (FIX_48) ─────────────────────────────────────────────
// 종일 동행은 촬영 길이만큼 붙어 있다. 2시간과 8시간에 같은 값을
// 받으면 긴 촬영에서 헤메가 손해를 본다.

const 종일 = { price: 200000, timing: 'full', accompanyFee: 30000, accompanyUnit: 'hour' };

assert.equal(fee({ ...종일, shootHours: 2 }).accompany, 60000, '2시간이면 30,000 × 2');
assert.equal(fee({ ...종일, shootHours: 8 }).accompany, 240000, '8시간이면 30,000 × 8');
assert.equal(fee({ ...종일, shootHours: 8 }).total, 440000, '합계는 시술비 + 동행비');

// 단위가 hour 여도 촬영 전 시술이면 안 받는다
assert.equal(
  fee({
    price: 100000,
    timing: 'before',
    accompanyFee: 30000,
    accompanyUnit: 'hour',
    shootHours: 8,
  }).accompany,
  0,
  '촬영 전 시술은 단위와 무관하게 동행비가 없다'
);

// 시간을 모르면 곱하지 않는다. 0 을 곱해 공짜로 만들면 안 된다.
assert.equal(
  fee({ ...종일, shootHours: undefined }).accompany,
  30000,
  '촬영 길이를 모르면 정액으로 한 번 받는다 — 공짜로 만들지 않는다'
);
assert.equal(fee({ ...종일, shootHours: 0 }).accompany, 30000, '0시간도 같다');

console.log('cart.check: 통과');
