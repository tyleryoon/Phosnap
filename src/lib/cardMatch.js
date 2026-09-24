// ─── 카드 명세서 ↔ 쿠팡 주문 대조 ──────────────────────────────────────
//
// 왜 필요한가
//   KB 쿠팡카드 이용대금 명세서에는 '쿠팡(주) · 2026.08.12 · 35,400' 처럼
//   날짜와 금액만 있다. 그 줄이 누구 물건인지는 카드사가 모른다.
//   반대로 쿠팡 주문내역에는 수취인과 배송상태가 있다.
//   둘을 날짜+금액으로 이어야 "명세서의 이 줄은 최향숙 몫" 이라고 말할 수 있다.
//
//   돈을 사람에게 붙이는 판단이다. 조용히 틀리면 엉뚱한 사람에게 청구된다.
//   그래서 같은 날 같은 금액 후보가 둘이고 주인이 갈리면 **찍지 않는다.**
//   '모호' 로 따로 내놓고 사람이 보게 한다. 틀린 확신보다 빈칸이 낫다.
//
// 입력은 형식을 가리지 않는다 — 콘솔 수집 스니펫 결과, 엑셀 복붙, CSV
// 무엇이 와도 같은 파서를 탄다. 사이트 DOM 이 바뀌어도 복붙 경로는 산다.

// 2026-08-12 / 2026.8.12 / 26/08/12 를 모두 받는다.
const DATE_RE = /(\d{4}|\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/;

// 금액으로 인정하는 것: 천단위 쉼표가 있거나 '원' 이 붙은 수.
// 이 조건이 주문번호(20260812123456)와 금액을 가른다. 쉼표도 '원' 도
// 없는 맨 숫자는 금액으로 보지 않는다 — 주문번호를 금액으로 읽는 순간
// 대조 전체가 무너진다.
const AMOUNT_RE = /(\d{1,3}(?:,\d{3})+)\s*원?|(\d+)\s*원/;

export const parseDate = (s) => {
  const m = String(s).match(DATE_RE);
  if (!m) return null;
  let [, y, mo, d] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const parseAmount = (s) => {
  const m = String(s).match(AMOUNT_RE);
  if (!m) return null;
  return Number((m[1] || m[2]).replace(/,/g, ''));
};

const dayDiff = (a, b) =>
  Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);

/**
 * 붙여넣은 덩어리를 행으로 끊는다.
 *
 * 날짜와 금액이 **둘 다** 있는 줄만 남긴다. 머리글·합계·안내문구는
 * 이 조건에서 저절로 떨어진다. 컬럼 위치는 보지 않는다 — 카드사와
 * 쿠팡의 컬럼 순서가 다르고, 어느 쪽도 우리 마음대로 못 바꾼다.
 *
 * ponytail: 한 줄에 금액이 여럿이면 첫 번째를 쓴다. KB 는 이용금액이,
 * 쿠팡은 결제금액이 앞에 온다. 배송비가 앞서는 표를 만나면 그때 컬럼
 * 지정 UI 를 붙인다.
 */
export const parseRows = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter(Boolean)
    .map((line) => {
      const date = parseDate(line);
      if (!date) return null;
      // 날짜 부분을 지우고 금액을 찾는다. '2026.08.12' 는 쉼표도 '원' 도
      // 없어 금액으로 안 읽히지만, 지워두면 한 번 더 확실하다.
      const rest = line.replace(DATE_RE, ' ');
      const amount = parseAmount(rest);
      if (amount == null) return null;
      return { date, amount, text: line.replace(/[\t|]+/g, ' · ').replace(/\s{2,}/g, ' ').trim() };
    })
    .filter(Boolean);

const MERCHANT_RE = /쿠팡|coupang/i;
const DELIVERED_RE = /배송\s*완료|배달\s*완료|delivered/i;

/**
 * 명세서 행과 주문 행을 잇는다.
 *
 * 중요한 설계 하나 — 주문은 **최향숙 것만** 넣지 않는다. 전체를 넣는다.
 * 같은 날 같은 금액으로 다른 사람 주문이 있는데 최향숙 것만 들고 오면,
 * 남의 결제를 최향숙 앞으로 끌어올 수 있다. 전부 놓고 이은 뒤에
 * 이름으로 거른다.
 */
export const matchStatement = ({ cardText, orderText, name = '', dayWindow = 3 }) => {
  const warnings = [];
  const allCards = parseRows(cardText);
  const orders = parseRows(orderText).map((o, i) => ({
    ...o,
    i,
    mine: !!name && o.text.includes(name),
    delivered: DELIVERED_RE.test(o.text),
    used: false,
  }));

  // 명세서 전체를 붙여넣어도 되게 쿠팡 가맹점만 남긴다.
  const coupang = allCards.filter((c) => MERCHANT_RE.test(c.text));
  const cards = coupang.length ? coupang : allCards;
  if (allCards.length && !coupang.length) {
    warnings.push("명세서에서 '쿠팡' 가맹점 줄을 못 찾아 전체 행으로 대조했다.");
  }
  if (name && orders.length && !orders.some((o) => o.mine)) {
    warnings.push(`주문 내역에 '${name}' 이 한 줄도 없다. 수취인이 들어간 내역으로 다시 넣어라.`);
  }

  const mine = [];
  const minePending = [];  // 최향숙인데 배송완료가 아닌 것
  const others = [];
  const ambiguous = [];
  const unmatchedCards = [];

  // 날짜 순으로 돌며 가장 가까운 주문부터 소진한다.
  [...cards]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((card) => {
      const cands = orders
        .filter((o) => !o.used && o.amount === card.amount && dayDiff(o.date, card.date) <= dayWindow)
        .sort((a, b) => dayDiff(a.date, card.date) - dayDiff(b.date, card.date) || a.i - b.i);

      if (!cands.length) return unmatchedCards.push(card);

      // 주인이 갈리는 후보가 섞여 있으면 찍지 않는다.
      if (cands.length > 1 && cands.some((o) => o.mine) && cands.some((o) => !o.mine)) {
        return ambiguous.push({ card, candidates: cands });
      }

      const order = cands[0];
      order.used = true;
      const pair = { card, order };
      if (!order.mine) others.push(pair);
      else if (order.delivered) mine.push(pair);
      else minePending.push(pair);
    });

  const sum = (list) => list.reduce((t, x) => t + (x.card ? x.card.amount : x.amount), 0);

  return {
    mine,
    minePending,
    others,
    ambiguous,
    unmatchedCards,
    unusedOrders: orders.filter((o) => !o.used),
    warnings,
    totals: {
      mine: sum(mine),
      minePending: sum(minePending),
      others: sum(others),
      ambiguous: sum(ambiguous),
      unmatched: sum(unmatchedCards),
      cards: sum(cards),
    },
  };
};

// 각 사이트에 로그인한 탭의 개발자도구 콘솔에 붙여넣는다.
// 표(tr/td)면 표를, 아니면 페이지 전문을 클립보드에 담는다.
// 선택자를 특정 사이트에 맞추지 않는 건 KB·쿠팡 어느 쪽이 마크업을
// 바꿔도 이 한 줄이 계속 돌게 하려는 것이다.
// ponytail: 화면에 보이는 것만 가져온다. 목록이 여러 장이면 장마다 실행해 이어붙인다.
export const COLLECT_SNIPPET = `(() => {
  const rows = [];
  document.querySelectorAll('tr').forEach((tr) => {
    const cells = [...tr.querySelectorAll('td,th')].map((td) => td.innerText.replace(/\s+/g, ' ').trim());
    if (cells.filter(Boolean).length > 1) rows.push(cells.join('\t'));
  });
  const out = rows.length ? rows.join('\n') : document.body.innerText;
  if (typeof copy === 'function') copy(out); else navigator.clipboard.writeText(out);
  console.log('복사됨 · ' + (rows.length ? rows.length + '행' : '페이지 전문'));
})()`;
