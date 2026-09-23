// ─── AlertDot ──────────────────────────────────────────────────────────
//
// 확인이 필요한 항목에 붙이는 빨간 점.
//
// count 를 주면 숫자 배지, 안 주면 작은 점만 그린다.
// 0 이하이거나 show 가 false 면 아무것도 그리지 않는다 — 부르는 쪽에서
// 조건문을 쓰지 않아도 되게.
//
// 색은 var(--gold) 를 쓰지 않는다. 금색은 이 사이트에서 "강조" 이지
// "처리 필요" 가 아니라서, 평소 화면과 구분이 안 된다.

const AlertDot = ({ count = null, show = true, title = '' }) => {
  if (!show) return null;
  if (count !== null && !(count > 0)) return null;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--danger)',
    color: '#fff',
    verticalAlign: 'middle',
  };

  if (count === null) {
    return (
      <span
        title={title}
        aria-label={title || '확인 필요'}
        style={{ ...base, width: 6, height: 6, borderRadius: '50%', marginLeft: 5 }}
      />
    );
  }

  return (
    <span
      title={title}
      aria-label={title || `확인 필요 ${count}건`}
      style={{
        ...base,
        minWidth: 16,
        height: 16,
        padding: '0 5px',
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        marginLeft: 6,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default AlertDot;
