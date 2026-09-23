import React from 'react';

// ─── 의상 수령 방식 · 보증금 ────────────────────────────────────────────
//
// 옷이 주인 손을 떠나는지로 갈린다.
//
//   byOwner   주인이 현장에 들고 온다 → 보증금 없음
//   pickup    고객이 매장에서 찾아간다 → 보증금
//   delivery  배송 → 보증금 + 배송비
//
// 헤메가 자기 옷을 입혀주는 경우가 byOwner 다. 같은 옷이라도 고객이
// 픽업하거나 배송받으면 그때부터는 옷이 주인 손을 떠나므로 보증금을
// 받는다. (FIX_43)
//
// Props
//   value        { fulfillment: string[], deposit: number, deliveryFee: number }
//   onChange     (next) => void   — value 와 같은 모양
//   allowByOwner 주인이 들고 갈 수 있는 의상인가 (헤메 자체 의상만 true)
// ────────────────────────────────────────────────────────────────────────

export const FULFILLMENT_LABELS = {
  byOwner: {
    ko: '주인이 현장에 들고 감',
    en: 'Brought by owner',
    ja: '本人が現場へ持参',
    zh: '本人携带至现场',
  },
  pickup: { ko: '매장 픽업', en: 'Pickup in store', ja: '店舗でピックアップ', zh: '门店自取' },
  delivery: { ko: '배송', en: 'Delivery', ja: '配送', zh: '配送' },
};

/** 이 수령 방식에 보증금을 받는가. 주인이 들고 가면 안 받는다. */
export const needsDeposit = (method) => method !== 'byOwner';

const labelStyle = {
  display: 'block',
  fontSize: '0.9rem',
  marginBottom: '0.5rem',
  color: 'var(--muted)',
};
const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  backgroundColor: 'var(--bg)',
  color: 'var(--text)',
  border: '1px solid var(--gold-dim)',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
};

export default function DressFulfillment({ value, onChange, allowByOwner = false, lang = 'ko' }) {
  const methods = value?.fulfillment?.length
    ? value.fulfillment
    : allowByOwner
      ? ['byOwner']
      : ['pickup'];
  const deposit = value?.deposit ?? 0;
  const deliveryFee = value?.deliveryFee ?? 0;

  const options = allowByOwner ? ['byOwner', 'pickup', 'delivery'] : ['pickup', 'delivery'];
  // 보증금을 받는 방식이 하나라도 켜져 있을 때만 보증금 칸을 묻는다.
  const showDeposit = methods.some(needsDeposit);
  const showDelivery = methods.includes('delivery');

  const toggle = (m) => {
    const next = methods.includes(m) ? methods.filter((x) => x !== m) : [...methods, m];
    // 하나도 없으면 아무도 이 옷을 받을 수 없다. 마지막 하나는 못 끈다.
    if (!next.length) return;
    onChange({ fulfillment: next, deposit, deliveryFee });
  };

  const num = (v) => {
    const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div>
      <label style={labelStyle}>수령 방식</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {options.map((m) => {
          const on = methods.includes(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              aria-pressed={on}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                background: on ? 'var(--accent-a10)' : 'transparent',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                color: on ? 'var(--text)' : 'var(--muted)',
              }}
            >
              {FULFILLMENT_LABELS[m][lang] || FULFILLMENT_LABELS[m].ko}
            </button>
          );
        })}
      </div>
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--muted)',
          marginBottom: '1.25rem',
          lineHeight: 1.7,
        }}
      >
        {allowByOwner
          ? '현장에 직접 들고 가면 보증금을 받지 않습니다. 옷이 손을 떠나지 않기 때문입니다.'
          : '고객이 고를 수 있는 방식입니다. 배송을 켜면 배송비를 따로 받습니다.'}
      </p>

      {showDeposit && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>보증금 (원)</label>
          <input
            type="number"
            min="0"
            step="10000"
            inputMode="numeric"
            value={deposit}
            onChange={(e) =>
              onChange({ fulfillment: methods, deposit: num(e.target.value), deliveryFee })
            }
            placeholder="0"
            style={inputStyle}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
            반납 시 옷 상태를 확인하고 돌려줍니다. 0 이면 받지 않습니다.
          </p>
        </div>
      )}

      {showDelivery && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>배송비 (원)</label>
          <input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={deliveryFee}
            onChange={(e) =>
              onChange({ fulfillment: methods, deposit, deliveryFee: num(e.target.value) })
            }
            placeholder="0"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}
