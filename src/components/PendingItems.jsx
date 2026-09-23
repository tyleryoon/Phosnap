import { useState, useEffect, useCallback } from 'react';
import Corners from './Corners';
import { getMyPendingItems, acceptBookingItem, declineBookingItem } from '../lib/supabase';

// ─── 내가 결정해야 할 예약 항목 ─────────────────────────────────────────
//
// 왜 공용인가
//   예전에는 작가만 수락할 수 있었다. approve_booking() 이 작가 본인인지
//   확인한 뒤 예약의 **모든** 아이템을 confirmed 로 바꿨다.
//   헤메·벤더는 자기가 불려간 줄도 모르는데 확정돼 있었다.
//   (벤더 대시보드에 버튼은 있었지만 React 상태만 바꿨다 — DB 에 안 갔다)
//
//   이제 각자 자기 아이템만 처리한다(FIX_40). 역할마다 화면을 따로 만들면
//   한쪽만 고치는 일이 반드시 생기므로 하나로 둔다.
//
// 같은 예약의 다른 참여자를 함께 보여준다.
//   "누구와 함께 가는 일인가" 를 알아야 수락할지 판단할 수 있다.

const fmt = (n) => `₩${Number(n || 0).toLocaleString('ko-KR')}`;

const TYPE_LABEL = {
  photographer: '촬영', stylist: '헤어메이크업', dress: '의상', venue: '장소',
};

const hm = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

const PendingItems = ({ onChanged }) => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [busyId,  setBusyId]  = useState(null);
  const [declining, setDeclining] = useState(null);   // { itemId, reason }

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await getMyPendingItems();
    setLoading(false);
    if (e) {
      // 조용히 빈 목록을 보여주면 "요청이 없다" 로 읽힌다.
      // 못 불러온 것과 없는 것은 다르다.
      setError(e.message || '불러오지 못했습니다.');
      setItems([]);
      return;
    }
    setError(null);
    setItems(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (itemId, accept, reason) => {
    setBusyId(itemId);
    setError(null);
    const { error: e } = accept
      ? await acceptBookingItem(itemId)
      : await declineBookingItem(itemId, reason || '');
    setBusyId(null);
    if (e) {
      setError(e.message || '처리하지 못했습니다.');
      return;
    }
    setDeclining(null);
    await load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
        요청을 확인하는 중…
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div style={{
        border: '1px solid rgba(232,85,85,0.4)', background: 'rgba(232,85,85,0.08)',
        padding: '14px 18px', marginBottom: 20, fontSize: 13, color: 'var(--danger)', lineHeight: 1.7,
      }}>
        예약 요청을 불러오지 못했습니다 — {error}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
          요청이 없는 것과 다릅니다. 새로고침 후 다시 확인해주세요.
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div style={{
      border: '1px solid var(--gold-border)', background: 'var(--gold-dim)',
      padding: '20px 22px', marginBottom: 24, position: 'relative',
    }}>
      <Corners />
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.2em',
        color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4,
      }}>
        확인이 필요한 예약 {items.length}건
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 18 }}>
        내 항목만 결정합니다. 같은 예약의 다른 참여자는 각자 결정합니다.
      </p>

      {error && (
        <div style={{
          border: '1px solid rgba(232,85,85,0.4)', background: 'rgba(232,85,85,0.08)',
          padding: '10px 12px', marginBottom: 14, fontSize: 12.5, color: 'var(--danger)',
        }}>
          처리하지 못했습니다 — {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map(it => (
          <div key={it.item_id} style={{
            border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {TYPE_LABEL[it.provider_type] || it.provider_type}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14.5, marginBottom: 6 }}>
                  {it.item_name}{it.item_option ? ` (${it.item_option})` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
                  {it.booking_date} {it.booking_time}
                  {it.start_at && ` · 내 담당 ${hm(it.start_at)} ~ ${hm(it.end_at)}`}
                  {it.customer_name && ` · ${it.customer_name} 님`}
                </div>

                {/* 같은 예약의 다른 참여자 */}
                {Array.isArray(it.siblings) && it.siblings.length > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.8 }}>
                    함께 가는 팀 ·{' '}
                    {it.siblings.map((s, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        {TYPE_LABEL[s.type] || s.type} {s.name || ''}
                        <span style={{
                          color: s.status === 'confirmed' ? 'var(--success)'
                               : s.status === 'cancelled' ? '#e85d5d' : 'var(--muted)',
                        }}>
                          {s.status === 'confirmed' ? ' 수락' : s.status === 'cancelled' ? ' 거절' : ' 대기'}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 17, marginBottom: 12 }}>
                  {fmt(it.price)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={busyId === it.item_id}
                    onClick={() => act(it.item_id, true)}
                    style={{
                      padding: '9px 18px', border: 'none', background: 'var(--gold)',
                      color: 'var(--on-accent)', fontFamily: 'var(--font-serif)', fontSize: 12.5,
                      cursor: busyId === it.item_id ? 'default' : 'pointer',
                      opacity: busyId === it.item_id ? 0.6 : 1,
                    }}
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    disabled={busyId === it.item_id}
                    onClick={() => setDeclining({ itemId: it.item_id, reason: '' })}
                    style={{
                      padding: '9px 16px', border: '1px solid rgba(232,85,85,0.5)',
                      background: 'transparent', color: 'var(--danger)',
                      fontFamily: 'var(--font-serif)', fontSize: 12.5, cursor: 'pointer',
                    }}
                  >
                    거절
                  </button>
                </div>
              </div>
            </div>

            {/* 거절 사유 — 고객에게 그대로 전달된다 */}
            {declining?.itemId === it.item_id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <textarea
                  value={declining.reason}
                  onChange={e => setDeclining(d => ({ ...d, reason: e.target.value }))}
                  rows={2}
                  placeholder="사유 (고객에게 그대로 전달됩니다)"
                  style={{
                    width: '100%', boxSizing: 'border-box', marginBottom: 10,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text)', padding: '10px 12px', fontSize: 12.5,
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
                  거절하면 이 항목만 취소되고 나머지는 그대로 진행됩니다.
                  해당 금액은 관리자 확인 후 환불됩니다.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={busyId === it.item_id}
                    onClick={() => act(it.item_id, false, declining.reason)}
                    style={{
                      padding: '9px 18px', border: 'none', background: 'var(--danger)',
                      color: '#fff', fontFamily: 'var(--font-serif)', fontSize: 12.5,
                      cursor: busyId === it.item_id ? 'default' : 'pointer',
                      opacity: busyId === it.item_id ? 0.6 : 1,
                    }}
                  >
                    거절 확정
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeclining(null)}
                    style={{
                      padding: '9px 16px', border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--muted)',
                      fontFamily: 'var(--font-serif)', fontSize: 12.5, cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingItems;
