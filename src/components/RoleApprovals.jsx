import { useState, useEffect, useCallback } from 'react';
import Corners from './Corners';
import { getPendingRoleRequests, approveRole, rejectRole } from '../lib/supabase';

// ─── RoleApprovals ─────────────────────────────────────────────────────
//
// 관리자 승인 도구. user_roles.status = 'pending' 인 신청을 처리한다.
//
// 이전 버전은 화면만 있었다. 버튼이 setProfiles() 로 React 상태만 바꿔서
// 새로고침하면 되돌아갔고, 실제 승인은 SQL 로만 가능했다.
// 게다가 profiles.approved 라는 다른 컬럼을 읽고 있어서 진짜 승인 상태
// (user_roles.status)와 무관한 목록을 보여줬다.
//
// 지금은 전부 서버 함수(FIX_25)를 거친다.
//   pending_role_requests()  목록
//   approve_role(uuid, text) 승인 + 알림 + 메일
//   reject_role(uuid, text, text) 반려 + 사유 + 알림 + 메일

const ROLE_LABEL = {
  artist:       '작가',
  stylist:      '헤어메이크업',
  dress_vendor: '의상 업체',
  vendor:       '의상 업체',
};

const ARTIST_TYPE_LABEL = {
  photographer: '사진',
  videographer: '영상',
  both:         '사진·영상',
  hmk:          '헤어메이크업',
};

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR');
};

const RoleApprovals = ({ onChanged }) => {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyKey, setBusyKey]   = useState(null);   // 처리 중인 행
  const [rejectFor, setRejectFor] = useState(null); // 반려 입력 중인 행
  const [reason, setReason]     = useState('');
  const [notice, setNotice]     = useState(null);   // { kind, text }

  const keyOf = (r) => `${r.user_id}:${r.role}`;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getPendingRoleRequests();
    if (error) {
      setNotice({ kind: 'error', text: `목록을 불러오지 못했습니다: ${error.message}` });
      setRows([]);
    } else {
      setRows(data);
      // 관리자가 아니면 서버가 0행을 준다. 빈 목록과 구분이 안 되므로
      // 여기서 단정하지 않는다. 그냥 "없음"으로 보여준다.
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (row) => {
    setBusyKey(keyOf(row));
    setNotice(null);
    const { data, error } = await approveRole(row.user_id, row.role);
    if (error) {
      setNotice({ kind: 'error', text: `승인 실패: ${error.message}` });
    } else if (data && data.ok === false) {
      setNotice({ kind: 'warn', text: data.message || '이미 처리된 신청입니다.' });
      await load();
    } else {
      setNotice({ kind: 'ok', text: `${row.full_name || row.email} · ${ROLE_LABEL[row.role] || row.role} 승인 완료. 안내 메일이 발송됩니다.` });
      await load();
      onChanged?.();   // Nav·탭 배지도 같이 줄어야 한다
    }
    setBusyKey(null);
  };

  const handleReject = async (row) => {
    setBusyKey(keyOf(row));
    setNotice(null);
    const { data, error } = await rejectRole(row.user_id, row.role, reason);
    if (error) {
      setNotice({ kind: 'error', text: `반려 실패: ${error.message}` });
    } else if (data && data.ok === false) {
      setNotice({ kind: 'warn', text: data.message || '이미 처리된 신청입니다.' });
      await load();
    } else {
      setNotice({ kind: 'ok', text: `${row.full_name || row.email} · ${ROLE_LABEL[row.role] || row.role} 반려 완료. 사유가 메일로 전달됩니다.` });
      setRejectFor(null);
      setReason('');
      await load();
      onChanged?.();
    }
    setBusyKey(null);
  };

  const noticeColor = notice?.kind === 'error' ? '#e85d5d'
                    : notice?.kind === 'warn'  ? 'var(--gold)'
                    : '#22c55e';

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{
          width: 24, height: 24, border: '2px solid var(--gold)',
          borderTop: '2px solid transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto',
        }} />
      </div>
    );
  }

  return (
    <div>
      {notice && (
        <div style={{
          border: `1px solid ${noticeColor}`, background: 'var(--bg2)',
          padding: '12px 16px', marginBottom: 16, fontSize: 13, color: noticeColor,
        }}>
          {notice.text}
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, fontSize: 12, color: 'var(--muted)',
      }}>
        <span>승인 대기 {rows.length}건</span>
        <button
          onClick={load}
          style={{
            padding: '6px 14px', background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', fontSize: 11, cursor: 'pointer',
            fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
          }}
        >
          새로고침
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{
          padding: '48px 32px', textAlign: 'center', color: 'var(--muted)',
          border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 13,
        }}>
          승인 대기 중인 신청이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map(row => {
            const k = keyOf(row);
            const busy = busyKey === k;
            const portfolio = Array.isArray(row.portfolio_urls) ? row.portfolio_urls : [];
            return (
              <div key={k} style={{
                border: '1px solid var(--border)', background: 'var(--bg2)',
                padding: '20px 24px', position: 'relative', opacity: busy ? 0.55 : 1,
              }}>
                <Corners />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        fontSize: 15, fontFamily: 'var(--font-serif)',
                        color: 'var(--text)', marginBottom: 4,
                      }}>
                        {row.full_name || '(활동명 미입력)'}
                        <span style={{
                          marginLeft: 10, fontSize: 11, color: 'var(--gold)',
                          border: '1px solid var(--gold)', padding: '2px 8px',
                        }}>
                          {ROLE_LABEL[row.role] || row.role}
                          {row.artist_type ? ` · ${ARTIST_TYPE_LABEL[row.artist_type] || row.artist_type}` : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.email}</div>
                    </div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 14, fontSize: 12, marginBottom: 12,
                    }}>
                      {[
                        ['실명',   row.real_name || '-'],
                        ['연락처', row.phone || '-'],
                        ['신청일', fmtDate(row.requested_at)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{
                            fontSize: 10, color: 'var(--muted)',
                            fontFamily: 'var(--font-serif)', marginBottom: 4,
                          }}>
                            {label}
                          </div>
                          <div style={{ color: 'var(--text)' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* 재신청이면 맥락을 먼저 보여준다.
                        이전에 뭘 지적했고 이번에 뭘 고쳤다는지 나란히 놓아야
                        재심사가 의미가 있다. */}
                    {row.reapply_count > 0 && (
                      <div style={{
                        border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)',
                        background: 'var(--bg)', padding: '12px 16px', marginBottom: 14,
                      }}>
                        <div style={{
                          fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                          letterSpacing: '0.1em', marginBottom: 8,
                        }}>
                          {row.reapply_count}번째 재신청 · {fmtDate(row.reapplied_at)}
                        </div>
                        {row.reject_reason && (
                          <div style={{ fontSize: 12, marginBottom: 8 }}>
                            <span style={{ color: 'var(--muted)' }}>이전 반려 사유 — </span>
                            <span style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{row.reject_reason}</span>
                          </div>
                        )}
                        {row.reapply_note && (
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--muted)' }}>보완했다는 내용 — </span>
                            <span style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{row.reapply_note}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(row.instagram || row.website || portfolio.length > 0) && (
                      <div style={{ fontSize: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {row.instagram && (
                          <span style={{ color: 'var(--muted)' }}>
                            IG <span style={{ color: 'var(--text)' }}>{row.instagram}</span>
                          </span>
                        )}
                        {row.website && (
                          <span style={{ color: 'var(--muted)' }}>
                            웹 <span style={{ color: 'var(--text)' }}>{row.website}</span>
                          </span>
                        )}
                        {portfolio.length > 0 && (
                          <span style={{ color: 'var(--muted)' }}>
                            포트폴리오 <span style={{ color: 'var(--text)' }}>{portfolio.length}장</span>
                          </span>
                        )}
                      </div>
                    )}

                    {portfolio.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {portfolio.slice(0, 6).map((url, i) => (
                          <img
                            key={i} src={url} alt=""
                            style={{
                              width: 64, height: 64, objectFit: 'cover',
                              border: '1px solid var(--border)',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', gap: 10, flexDirection: 'column',
                    justifyContent: 'center', minWidth: 110,
                  }}>
                    <button
                      onClick={() => handleApprove(row)}
                      disabled={busy}
                      style={{
                        padding: '10px 20px', background: '#22c55e', color: '#fff',
                        border: 'none', fontSize: 12, fontFamily: 'var(--font-serif)',
                        cursor: busy ? 'default' : 'pointer', letterSpacing: '0.1em',
                      }}
                    >
                      승인
                    </button>
                    <button
                      onClick={() => {
                        setRejectFor(rejectFor === k ? null : k);
                        setReason('');
                        setNotice(null);
                      }}
                      disabled={busy}
                      style={{
                        padding: '10px 20px', background: 'transparent', color: 'var(--danger)',
                        border: '1px solid #e85d5d', fontSize: 12,
                        fontFamily: 'var(--font-serif)',
                        cursor: busy ? 'default' : 'pointer', letterSpacing: '0.1em',
                      }}
                    >
                      반려
                    </button>
                  </div>
                </div>

                {rejectFor === k && (
                  <div style={{
                    marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                      반려 사유 — 신청자에게 그대로 전달됩니다. 무엇을 보완하면 되는지 적어주세요.
                    </div>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="예) 포트폴리오 사진이 3장 미만입니다. 대표 작업물 5장 이상 올려주시면 재심사해드립니다."
                      style={{
                        width: '100%', background: 'var(--bg)', color: 'var(--text)',
                        border: '1px solid var(--border)', padding: '10px 12px',
                        fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        onClick={() => handleReject(row)}
                        disabled={busy || !reason.trim()}
                        style={{
                          padding: '9px 18px',
                          background: reason.trim() ? '#e85d5d' : 'var(--border)',
                          color: '#fff', border: 'none', fontSize: 12,
                          fontFamily: 'var(--font-serif)',
                          cursor: (busy || !reason.trim()) ? 'default' : 'pointer',
                          letterSpacing: '0.1em',
                        }}
                      >
                        반려 확정
                      </button>
                      <button
                        onClick={() => { setRejectFor(null); setReason(''); }}
                        style={{
                          padding: '9px 18px', background: 'transparent',
                          color: 'var(--muted)', border: '1px solid var(--border)',
                          fontSize: 12, fontFamily: 'var(--font-serif)',
                          cursor: 'pointer', letterSpacing: '0.1em',
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoleApprovals;
