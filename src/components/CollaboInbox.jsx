import { useState, useEffect, useCallback } from 'react';
import Corners from './Corners';
import {
  getCollaboProposals,
  getCollaboCandidates,
  createCollaboProposal,
  respondCollaboProposal,
  cancelCollaboProposal,
  expireCollaboProposals,
} from '../lib/supabase';
import { COLLABO_RULES, isSameTypeCollabo } from '../data/collabo';

// ─── 콜라보 제의함 ───────────────────────────────────────────────────
//
// 작가 쪽(ArtistSchedule)에는 콜라보 화면이 있었지만 헤메 쪽에는 없었다.
// 작가가 H&M 작가에게 제의를 보낼 수는 있는데 받는 쪽에 화면이 없어서,
// 헤메는 제의가 왔는지조차 알 수 없었다.
//
// 작가 화면은 '상대 찾기 + 제의 보내기' 까지 포함한 큰 탭이다. 여기는
// 받은 것에 답하는 일이 전부라 가볍게 따로 만든다.

const STATUS = {
  pending: { ko: '대기중', color: 'var(--warning)' },
  accepted: { ko: '수락함', color: 'var(--success)' },
  rejected: { ko: '거절함', color: 'var(--danger)' },
  expired: { ko: '만료됨', color: 'var(--muted)' },
  cancelled: { ko: '취소됨', color: 'var(--muted)' },
};

const TYPE_LABEL = {
  photographer: '📸 사진작가',
  videographer: '🎬 영상작가',
  both: '📸🎬 사진·영상작가',
  hmua: '💄 헤어메이크업',
  dress: '👗 의상 업체',
  venue: '📍 장소 업체',
};

/**
 * 콜라보 제의함.
 *
 * providerType 은 DB 어휘를 그대로 쓴다 —
 *   'photographer' | 'stylist' | 'dress' | 'venue'
 *
 * 네 유형이 서로 제의를 주고받으므로 한 컴포넌트로 다 쓴다.
 */
const CollaboInbox = ({ providerType, providerId, myLocationId = null }) => {
  const stylistId = providerId; // 아래 필터들이 쓰는 이름
  const [proposals, setProposals] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('browse'); // 'browse' | 'received' | 'sent'
  // 제의 보내기
  const [target, setTarget] = useState(null); // 상대 후보 객체
  const [sendDate, setSendDate] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendRole, setSendRole] = useState('main');
  const [typeFilter, setTypeFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const [rejecting, setRejecting] = useState(null); // proposalId
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (text, ms = 2500) => {
    setMsg(text);
    setTimeout(() => setMsg(''), ms);
  };

  const load = useCallback(async () => {
    if (!stylistId) return;
    setLoading(true);
    // 7일 미응답 만료. 크론이 없어서 화면을 열 때 한 번 돌린다.
    await expireCollaboProposals();
    const [{ data: props }, { data: cands }] = await Promise.all([
      getCollaboProposals(providerType, providerId),
      getCollaboCandidates(),
    ]);
    setProposals(props || []);
    // 나 자신은 상대 목록에서 뺀다.
    setPeople(
      (cands || []).filter((c) => !(c.providerType === providerType && c.id === providerId))
    );
    setLoading(false);
  }, [providerType, providerId]);

  useEffect(() => {
    load();
  }, [load]);

  const received = proposals.filter((p) => p.to_id === stylistId);
  const sent = proposals.filter((p) => p.from_id === stylistId);
  const pendingCount = received.filter((p) => p.status === 'pending').length;

  const nameOf = (type, id) => people.find((c) => c.id === id && c.providerType === type) || null;

  const respond = async (id, status, reason = '') => {
    setBusy(true);
    const { error } = await respondCollaboProposal(id, status, reason);
    setBusy(false);
    if (error) {
      flash(`처리 실패 — ${error.message || '잠시 후 다시 시도해주세요.'}`, 4000);
      return false;
    }
    await load();
    return true;
  };

  const handleAccept = async (id) => {
    if (await respond(id, 'accepted')) flash('콜라보를 수락했습니다 ✓');
  };

  const handleReject = async (id) => {
    if (await respond(id, 'rejected', rejectReason)) {
      setRejecting(null);
      setRejectReason('');
      flash('제의를 거절했습니다');
    }
  };

  // ── 상대 찾기 ──
  //
  // 같은 지역에서 활동하는 상대만 보여준다. 콜라보는 같은 날 같은 곳에서
  // 같이 찍는 일이라, 지역이 다르면 성사될 수가 없다.
  // 내 지역을 모르면(아직 안 정했으면) 거르지 않고 전부 보여준다.
  const candidates = people.filter((c) => {
    if (typeFilter !== 'all' && c.artistType !== typeFilter) return false;
    if (!myLocationId) return true;
    return c.locationId === myLocationId;
  });

  // 이미 대기 중인 제의가 있는 상대는 버튼을 막는다.
  const pendingWith = (c) =>
    proposals.some(
      (p) =>
        p.status === 'pending' &&
        ((p.to_type === c.providerType && p.to_id === c.id) ||
          (p.from_type === c.providerType && p.from_id === c.id))
    );

  const myTypeForMatrix = providerType === 'stylist' ? 'hmua' : providerType;
  const dailyUsed = proposals.filter(
    (p) => p.from_id === providerId && new Date(p.created_at) >= new Date().setHours(0, 0, 0, 0)
  ).length;

  const handleSend = async () => {
    if (!target) return;
    if (!sendDate) {
      flash('희망 날짜를 선택해주세요.', 3000);
      return;
    }
    const sameType = isSameTypeCollabo(myTypeForMatrix, target.artistType);
    setBusy(true);
    const { error } = await createCollaboProposal({
      fromType: providerType,
      fromId: providerId,
      toType: target.providerType,
      toId: target.id,
      dates: [sendDate],
      locationId: myLocationId,
      message: sendMessage,
      isSameType: sameType,
      collaboRole: sameType ? sendRole : null,
    });
    setBusy(false);
    if (error) {
      flash(`제의 실패 — ${error.message || '잠시 후 다시 시도해주세요.'}`, 4000);
      return;
    }
    setTarget(null);
    setSendDate('');
    setSendMessage('');
    await load();
    flash('콜라보 제의를 보냈습니다 ✓');
  };

  const handleCancel = async (id) => {
    if (!window.confirm('이 제의를 취소할까요? 상대에게도 취소 알림이 갑니다.')) return;
    setBusy(true);
    const { error } = await cancelCollaboProposal(id);
    setBusy(false);
    if (error) {
      flash(`취소 실패 — ${error.message || '잠시 후 다시 시도해주세요.'}`, 4000);
      return;
    }
    await load();
    flash('제의를 취소했습니다');
  };

  const card = (p, direction) => {
    const otherType = direction === 'received' ? p.from_type : p.to_type;
    const otherId = direction === 'received' ? p.from_id : p.to_id;
    const other = nameOf(otherType, otherId);
    const st = STATUS[p.status] || STATUS.pending;

    return (
      <div
        key={p.id}
        style={{
          border: `1px solid ${st.color}33`,
          background: 'var(--bg2)',
          padding: '16px 20px',
          position: 'relative',
        }}
      >
        <Corners />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: other?.img ? `url(${other.img}) center/cover` : 'var(--border)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                {other?.name || '알 수 없음'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                {TYPE_LABEL[other?.artistType] || ''}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.08em',
              padding: '3px 10px',
              border: `1px solid ${st.color}44`,
              color: st.color,
              flexShrink: 0,
            }}
          >
            {st.ko}
          </span>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          일정: <span style={{ color: 'var(--text)' }}>{(p.dates || []).join(', ')}</span>
        </div>

        {p.message && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              padding: '8px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              marginBottom: 12,
              lineHeight: 1.7,
            }}
          >
            {p.message}
          </div>
        )}

        {/* 만료까지 남은 날. 7일 안에 답하지 않으면 자동 만료된다. */}
        {p.status === 'pending' && p.expires_at && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            {(() => {
              const left = Math.ceil((new Date(p.expires_at) - Date.now()) / 86400000);
              return left > 0 ? `${left}일 안에 답해주세요` : '곧 만료됩니다';
            })()}
          </div>
        )}

        {direction === 'received' && p.status === 'pending' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: 12 }}
              disabled={busy}
              onClick={() => handleAccept(p.id)}
            >
              ✓ 수락
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(232,80,80,0.3)' }}
              disabled={busy}
              onClick={() => setRejecting(p.id)}
            >
              거절
            </button>
          </div>
        )}

        {direction === 'sent' && p.status === 'pending' && (
          <button
            className="btn-ghost"
            style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 12px' }}
            disabled={busy}
            onClick={() => handleCancel(p.id)}
          >
            제의 취소
          </button>
        )}

        {p.status === 'rejected' && p.reject_reason && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
            사유: {p.reject_reason}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)', fontSize: 13 }}>불러오는 중…</div>;
  }

  const list = view === 'received' ? received : sent;

  return (
    <div>
      {msg && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            border: '1px solid var(--gold-border)',
            background: 'var(--accent-a08)',
            color: 'var(--gold)',
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'browse', label: `상대 찾기 (${candidates.length})` },
          { id: 'received', label: `받은 제의 (${received.length})` },
          { id: 'sent', label: `보낸 제의 (${sent.length})` },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 0',
              color: view === v.id ? 'var(--gold)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: 600,
              borderBottom: view === v.id ? '2px solid var(--gold)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {v.label}
            {v.id === 'received' && pendingCount > 0 && (
              <span style={{ marginLeft: 6, color: 'var(--warning)' }}>●</span>
            )}
          </button>
        ))}
      </div>

      {view === 'browse' ? (
        <div>
          <div
            style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.7 }}
          >
            오늘 남은 제안 {Math.max(0, COLLABO_RULES.maxDailyProposals - dailyUsed)}회 · 같은
            상대에게는 {COLLABO_RULES.cooldownSamePerson}일 뒤에 다시 보낼 수 있습니다
            {myLocationId ? '' : ' · 활동 지역을 정하면 같은 지역 상대만 보입니다'}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: '전체' },
              { id: 'photographer', label: '📸 사진' },
              { id: 'videographer', label: '🎬 영상' },
              { id: 'both', label: '📸🎬 사진·영상' },
              { id: 'hmua', label: '💄 H&M' },
              { id: 'dress', label: '👗 의상' },
              { id: 'venue', label: '📍 장소' },
            ].map((f) => {
              const n =
                f.id === 'all'
                  ? candidates.length
                  : people.filter(
                      (c) =>
                        c.artistType === f.id && (!myLocationId || c.locationId === myLocationId)
                    ).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: typeFilter === f.id ? 'var(--accent-a08)' : 'transparent',
                    border: `1px solid ${typeFilter === f.id ? 'var(--gold-border)' : 'var(--border)'}`,
                    color: typeFilter === f.id ? 'var(--gold)' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label} ({n})
                </button>
              );
            })}
          </div>

          {candidates.length === 0 ? (
            <div
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              콜라보 가능한 상대가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidates.map((c) => {
                const waiting = pendingWith(c);
                return (
                  <div
                    key={`${c.providerType}:${c.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg2)',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: c.img ? `url(${c.img}) center/cover` : 'var(--border)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontFamily: 'var(--font-serif)',
                          color: 'var(--text)',
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {TYPE_LABEL[c.artistType] || ''}
                        {isSameTypeCollabo(myTypeForMatrix, c.artistType) && ' · 동종'}
                      </div>
                    </div>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12, flexShrink: 0 }}
                      disabled={waiting}
                      onClick={() => setTarget(c)}
                    >
                      {waiting ? '제의 대기 중' : '콜라보 제의'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : list.length === 0 ? (
        <div
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13,
          }}
        >
          {view === 'received' ? '받은 콜라보 제의가 없습니다.' : '보낸 콜라보 제의가 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => card(p, view))}
        </div>
      )}

      {/* 제의 보내기 */}
      {target && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1003,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--gold-border)',
              maxWidth: 440,
              width: '100%',
              padding: '32px 28px',
              position: 'relative',
            }}
          >
            <Corners />
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 15,
                color: 'var(--text)',
                marginBottom: 4,
              }}
            >
              {target.name} 님에게 콜라보 제의
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>
              {TYPE_LABEL[target.artistType] || ''}
            </div>

            {isSameTypeCollabo(myTypeForMatrix, target.artistType) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  동종 콜라보 — 역할을 정해야 합니다 (수익 배분 기준)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { id: 'main', label: '내가 메인 (60%)' },
                    { id: 'sub', label: '내가 서브 (40%)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSendRole(r.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: 12,
                        background: sendRole === r.id ? 'var(--accent-a08)' : 'transparent',
                        border: `1px solid ${sendRole === r.id ? 'var(--gold-border)' : 'var(--border)'}`,
                        color: sendRole === r.id ? 'var(--gold)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>희망 날짜</div>
            <input
              type="date"
              value={sendDate}
              onChange={(e) => setSendDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />

            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              메시지 (선택)
            </div>
            <textarea
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="예: 12월 5일 서울 웨딩 촬영건입니다. 함께 해주실 수 있을까요?"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
                marginBottom: 16,
                resize: 'vertical',
              }}
            />

            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
              상대가 {COLLABO_RULES.autoExpireDays}일 안에 답하지 않으면 자동으로 만료됩니다.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, fontSize: 13 }}
                disabled={busy}
                onClick={handleSend}
              >
                제의 보내기 →
              </button>
              <button
                className="btn-ghost"
                style={{ fontSize: 13 }}
                disabled={busy}
                onClick={() => {
                  setTarget(null);
                  setSendDate('');
                  setSendMessage('');
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거절 사유 입력 */}
      {rejecting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1003,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--gold-border)',
              maxWidth: 420,
              width: '100%',
              padding: '32px 28px',
              position: 'relative',
            }}
          >
            <Corners />
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 15,
                color: 'var(--text)',
                marginBottom: 8,
              }}
            >
              제의를 거절합니다
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              사유는 상대에게 그대로 보입니다. 비워 두어도 됩니다.
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="예: 그 날짜에 이미 예약이 있습니다."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
                marginBottom: 16,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, fontSize: 13 }}
                disabled={busy}
                onClick={() => handleReject(rejecting)}
              >
                거절하기
              </button>
              <button
                className="btn-ghost"
                style={{ fontSize: 13 }}
                disabled={busy}
                onClick={() => {
                  setRejecting(null);
                  setRejectReason('');
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboInbox;
