import { useEffect, useState } from 'react';
import { getListingStatus } from '../lib/supabase';

/**
 * "고객에게 보이고 있는가" 배너.
 *
 * 왜 필요한가
 *   노출 조건은 승인 하나가 아니다. 지역도 있어야 하고 팔 것도 있어야 한다.
 *   그런데 공급자 화면에는 그 사실이 어디에도 없었다.
 *   승인 메일을 받고도 예약이 안 들어오면 이유를 알 수 없다.
 *
 *   조용히 비노출로 두는 건 실패를 숨기는 것과 같다 (5-18).
 *   무엇이 비었는지 이름으로 말해준다.
 *
 * @param {'photographer'|'stylist'|'dress_vendor'|'venue_vendor'} kind
 * @param {string} id  해당 테이블의 레코드 id
 */
const ListingStatus = ({ kind, id }) => {
  const [state, setState] = useState(null);   // { ok, listed, missing[] }
  const [err, setErr]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!kind || !id) { setState(null); return undefined; }
    (async () => {
      const { data, error } = await getListingStatus(kind, id);
      if (cancelled) return;
      if (error) {
        // 못 읽었으면 "정상" 인 척하지 않는다. 배너를 숨긴다.
        console.error('[ListingStatus] 노출 상태 조회 실패:', error);
        setErr(error.message || '조회 실패');
        setState(null);
        return;
      }
      setState(data);
    })();
    return () => { cancelled = true; };
  }, [kind, id]);

  if (err) {
    return (
      <div style={{
        border: '1px solid var(--border)', background: 'var(--bg2)',
        padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--muted)',
      }}>
        노출 상태를 확인하지 못했습니다 — {err}
      </div>
    );
  }

  if (!state) return null;

  const listed  = state.listed === true;
  const missing = Array.isArray(state.missing) ? state.missing : [];

  if (listed && missing.length === 0) {
    return (
      <div style={{
        border: '1px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.06)',
        padding: '12px 16px', marginBottom: 20, fontSize: 12.5, color: '#4ade80',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>✓</span> 고객 검색 결과에 노출되고 있습니다.
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid rgba(232,160,32,0.45)', background: 'rgba(232,160,32,0.07)',
      padding: '16px 18px', marginBottom: 20, fontSize: 12.5, lineHeight: 1.8,
      color: 'var(--text)',
    }}>
      <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: 6 }}>
        아직 고객에게 보이지 않습니다
      </div>
      {missing.length > 0 ? (
        <>
          <div style={{ color: 'var(--muted)', marginBottom: 8 }}>
            아래를 채우면 자동으로 노출됩니다.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text)' }}>
            {missing.map(m => <li key={m}>{m}</li>)}
          </ul>
        </>
      ) : (
        <div style={{ color: 'var(--muted)' }}>
          조건은 모두 충족했습니다. 잠시 후 다시 확인해주세요.
        </div>
      )}
    </div>
  );
};

export default ListingStatus;
