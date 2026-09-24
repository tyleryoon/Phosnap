// 명세서 ↔ 주문 대조 자체 검사
//
//   node src/lib/cardMatch.check.mjs
//
// 돈을 사람에게 붙이는 판단이라 조용히 틀리면 안 된다. 양쪽을 다 잡는다.
//   - 남의 결제를 최향숙 앞으로 끌어오면 안 된다
//   - 최향숙 것을 놓쳐도 안 된다

import assert from 'node:assert/strict';
import { matchStatement, parseAmount, parseDate, parseRows } from './cardMatch.js';

// ── 파서 ──────────────────────────────────────────────────────────────
assert.equal(parseDate('2026.08.12 쿠팡(주)'), '2026-08-12');
assert.equal(parseDate('26/8/2 쿠팡'), '2026-08-02', '두 자리 연도와 한 자리 월일도 읽는다');
assert.equal(parseDate('가맹점명 쿠팡'), null);

assert.equal(parseAmount('35,400원'), 35400);
assert.equal(parseAmount('900원'), 900, '천 원 미만은 쉼표가 없으니 원 표기로 잡는다');
assert.equal(
  parseAmount('20260812123456'),
  null,
  '주문번호를 금액으로 읽으면 대조 전체가 무너진다',
);

// 날짜·금액이 둘 다 있는 줄만 남는다 — 머리글과 합계는 저절로 떨어진다.
const rows = parseRows(
  ['이용일자\t가맹점\t이용금액', '2026.08.12\t쿠팡(주)\t35,400\t일시불', '합계\t101,900'].join('\n'),
);
assert.equal(rows.length, 1);
assert.deepEqual({ date: rows[0].date, amount: rows[0].amount }, { date: '2026-08-12', amount: 35400 });

// ── 기본 대조 ─────────────────────────────────────────────────────────
const card = [
  '2026.08.12\t쿠팡(주)\t35,400\t일시불',
  '2026.08.13\t쿠팡페이\t12,000\t일시불',
  '2026.08.14\t스타벅스\t5,500\t일시불',
].join('\n');

const base = matchStatement({
  cardText: card,
  orderText: [
    '2026.08.12\t20260812111\t텀블러\t최향숙\t35,400\t배송완료',
    '2026.08.13\t20260813222\t충전기\t김민수\t12,000\t배송완료',
  ].join('\n'),
  name: '최향숙',
});

assert.equal(base.mine.length, 1, '최향숙 배송완료 한 건');
assert.equal(base.totals.mine, 35400);
assert.equal(base.others.length, 1, '김민수 건은 남의 몫으로 간다');
assert.equal(base.unmatchedCards.length, 0);
assert.ok(
  !base.mine.concat(base.others).some((p) => /스타벅스/.test(p.card.text)),
  '쿠팡이 아닌 가맹점은 대조 대상이 아니다',
);

// ── 같은 날 같은 금액인데 주인이 갈리면 찍지 않는다 ───────────────────
const tie = matchStatement({
  cardText: '2026.08.12\t쿠팡(주)\t9,900\t일시불',
  orderText: [
    '2026.08.12\t20260812111\t양말\t최향숙\t9,900\t배송완료',
    '2026.08.12\t20260812222\t양말\t김민수\t9,900\t배송완료',
  ].join('\n'),
  name: '최향숙',
});
assert.equal(tie.ambiguous.length, 1, '주인이 갈리면 모호로 내놓는다');
assert.equal(tie.mine.length, 0, '모호한 건을 최향숙 합계에 넣으면 안 된다');
assert.equal(tie.totals.mine, 0);

// ── 배송완료가 아닌 건은 합계에서 뺀다 ────────────────────────────────
const pending = matchStatement({
  cardText: '2026.08.12\t쿠팡(주)\t9,900\t일시불',
  orderText: '2026.08.12\t20260812111\t양말\t최향숙\t9,900\t배송중',
  name: '최향숙',
});
assert.equal(pending.mine.length, 0);
assert.equal(pending.minePending.length, 1, '최향숙 건이지만 배송완료가 아니라 따로 센다');
assert.equal(pending.totals.mine, 0);

// ── 승인일이 주문일보다 하루 늦어도 잇는다 ────────────────────────────
const lag = matchStatement({
  cardText: '2026.08.13\t쿠팡(주)\t9,900\t일시불',
  orderText: '2026.08.12\t20260812111\t양말\t최향숙\t9,900\t배송완료',
  name: '최향숙',
  dayWindow: 3,
});
assert.equal(lag.mine.length, 1, '결제 승인일이 며칠 밀리는 건 흔하다');

// 범위를 0으로 좁히면 같은 건이 안 붙어야 한다 — 창이 실제로 동작한다는 증거.
const lag0 = matchStatement({
  cardText: '2026.08.13\t쿠팡(주)\t9,900\t일시불',
  orderText: '2026.08.12\t20260812111\t양말\t최향숙\t9,900\t배송완료',
  name: '최향숙',
  dayWindow: 0,
});
assert.equal(lag0.mine.length, 0);
assert.equal(lag0.unmatchedCards.length, 1);

// ── 이름이 아예 없으면 조용히 0원을 내놓지 않고 경고한다 ──────────────
const noName = matchStatement({
  cardText: '2026.08.12\t쿠팡(주)\t9,900\t일시불',
  orderText: '2026.08.12\t20260812111\t양말\t김민수\t9,900\t배송완료',
  name: '최향숙',
});
assert.equal(noName.warnings.length, 1, "수취인이 없는 내역을 넣으면 알려줘야 한다");

// ── 한 주문은 한 번만 쓰인다 ──────────────────────────────────────────
const dup = matchStatement({
  cardText: ['2026.08.12\t쿠팡(주)\t9,900', '2026.08.12\t쿠팡(주)\t9,900'].join('\n'),
  orderText: '2026.08.12\t20260812111\t양말\t최향숙\t9,900\t배송완료',
  name: '최향숙',
});
assert.equal(dup.mine.length, 1);
assert.equal(dup.unmatchedCards.length, 1, '주문 하나로 명세서 두 줄을 덮으면 두 배로 청구된다');
assert.equal(dup.totals.mine, 9900);

console.log('cardMatch 자체 검사 통과');
