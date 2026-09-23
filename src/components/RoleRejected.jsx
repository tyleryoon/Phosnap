import { useState, useEffect } from 'react';
import { getMyRoleStatus, reapplyRole } from '../lib/supabase';

// ─── RoleRejected ──────────────────────────────────────────────────────
//
// 가입이 반려됐을 때 보는 화면. ProtectedRoute 가 status === 'rejected'
// 일 때 띄운다.
//
// 예전에는 "반려되었습니다. 고객센터로 문의해주세요" 한 줄이 전부였고,
// 실제로는 반려 자체가 불가능했다(user_roles.status 체크 제약에
// 'rejected' 가 없었다). 반려가 가능해지고 나니 이번엔 막다른 길이 됐다 —
// (user_id, role) 유니크라 새 신청을 못 만들고, 본인 수정 정책도 없다.
//
// 그래서 두 가지를 준다.
//   1) 왜 반려됐는지 — 관리자가 적은 사유를 그대로 보여준다
//   2) 보완해서 다시 올리는 길 — reapply_role() RPC

const ROLE_LABEL = {
  artist:       '작가',
  stylist:      '헤어메이크업',
  dress_vendor: '의상 업체',
  vendor:       '의상 업체',
};

const RoleRejected = ({ role }) => {
  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getMyRoleStatus(role);
      if (!cancelled) { setInfo(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [role]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await reapplyRole(role, note);
    if (err) {
      setError(err.message);
    } else if (data && data.ok === false) {
      setError(data.message || '재신청할 수 없는 상태입니다.');
    } else {
      setDone(true);
    }
    setBusy(false);
  };

  const label = ROLE_LABEL[role] || role;

  if (loading) {
    return (
      <div style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{
          width: 24, height: 24, border: '2px solid var(--gold)',
          borderTop: '2px solid transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto',
        }} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="page-enter" style={{
        paddingTop: 160, textAlign: 'center', minHeight: '60vh',
        maxWidth: 520, margin: '0 auto', padding: '160px 24px 0',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 20,
          letterSpacing: '0.1em', marginBottom: 12, color: 'var(--gold)',
        }}>
          재신청이 접수되었습니다
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          관리자가 다시 확인합니다. 결과는 이메일로 알려드립니다.
        </p>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{
      minHeight: '60vh', maxWidth: 560, margin: '0 auto', padding: '160px 24px 60px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 20,
          letterSpacing: '0.1em', marginBottom: 12, color: 'var(--danger)',
        }}>
          {label} 가입이 보류되었습니다
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          아래 내용을 보완하시면 다시 심사해 드립니다.
        </p>
      </div>

      {info?.reject_reason && (
        <div style={{
          border: '1px solid var(--border)', borderLeft: '3px solid var(--danger)',
          background: 'var(--bg2)', padding: '16px 20px', marginBottom: 24,
        }}>
          <div style={{
            fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.1em', marginBottom: 8,
          }}>
            관리자 의견
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {info.reject_reason}
          </div>
        </div>
      )}

      {info?.reapply_count > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          지금까지 {info.reapply_count}번 재신청하셨습니다.
        </div>
      )}

      <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)' }}>
        무엇을 보완하셨나요? 관리자가 이 내용을 보고 다시 확인합니다.
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={5}
        maxLength={1000}
        placeholder="예) 대표 작업물 8장으로 늘려 다시 올렸습니다. 인스타그램 계정도 연결했습니다."
        style={{
          width: '100%', background: 'var(--bg)', color: 'var(--text)',
          border: '1px solid var(--border)', padding: '12px 14px',
          fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
        }}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--muted)', marginTop: 6,
      }}>
        <span>먼저 프로필·포트폴리오를 수정한 뒤 신청해주세요.</span>
        <span>{note.length}/1000</span>
      </div>

      {error && (
        <div style={{
          border: '1px solid var(--danger)', background: 'var(--bg2)',
          padding: '12px 16px', marginTop: 16, fontSize: 13, color: 'var(--danger)',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !note.trim()}
        className="btn-primary"
        style={{
          width: '100%', marginTop: 20, padding: '14px 0',
          fontSize: 13, letterSpacing: '0.1em',
          // btn-primary 가 텍스트를 왼쪽에 붙여 놓는다. 가운데로.
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          opacity: (busy || !note.trim()) ? 0.45 : 1,
          cursor: (busy || !note.trim()) ? 'default' : 'pointer',
        }}
      >
        {busy ? '접수 중…' : '보완 완료 · 다시 심사 요청'}
      </button>
    </div>
  );
};

export default RoleRejected;
