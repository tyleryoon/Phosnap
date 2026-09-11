import { useState, useEffect, useCallback } from 'react';
import Corners from './Corners';
import {
  INQUIRY_CATEGORIES, getAdminInquiries, answerInquiry, closeInquiry,
} from '../lib/supabase';

// ─── InquiryAdmin ──────────────────────────────────────────────────────
//
// 관리자 문의 처리. 미답변이 위로 올라오고, 오래 기다린 것부터 보인다.
//
// 답변은 answer_inquiry() RPC 를 거친다. 클라이언트에서 inquiries 를
// 직접 UPDATE 하면 남의 행이라 RLS 에 막히는데, PostgREST 는 그걸
// 200 + 0행 으로 돌려준다. 화면은 성공한 줄 알고 문의자는 답을 못 받는다.

const STATUS_META = {
  open:     { label: '답변 대기', color: 'var(--gold)' },
  answered: { label: '답변 완료', color: '#22c55e' },
  closed:   { label: '종료',     color: 'var(--muted)' },
};

const ROLE_LABEL = {
  artist: '작가', stylist: '헤메', dress_vendor: '벤더',
  vendor: '벤더', customer: '고객', admin: '관리자',
};

const fmt = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR');
};

const InquiryAdmin = ({ onChanged }) => {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('open');
  const [openId, setOpenId]   = useState(null);
  const [draft, setDraft]     = useState({});     // { [id]: 답변 초안 }
  const [busyId, setBusyId]   = useState(null);
  const [notice, setNotice]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAdminInquiries(filter === 'all' ? null : filter);
    if (error) {
      setNotice({ kind: 'error', text: `목록을 불러오지 못했습니다: ${error.message}` });
      setRows([]);
    } else {
      setRows(data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const send = async (row) => {
    setBusyId(row.id);
    setNotice(null);
    const { error } = await answerInquiry(row.id, draft[row.id] || '');
    if (error) {
      setNotice({ kind: 'error', text: `답변 실패: ${error.message}` });
    } else {
      setNotice({ kind: 'ok', text: `${row.full_name || row.email} 님께 답변을 보냈습니다. 메일도 발송됩니다.` });
      setDraft(d => ({ ...d, [row.id]: '' }));
      setOpenId(null);
      await load();
      onChanged?.();
    }
    setBusyId(null);
  };

  const close = async (row) => {
    setBusyId(row.id);
    setNotice(null);
    const { error } = await closeInquiry(row.id);
    if (error) {
      setNotice({ kind: 'error', text: `처리 실패: ${error.message}` });
    } else {
      setNotice({ kind: 'ok', text: '답변 없이 종료했습니다. 문의자에게 알림은 가지 않습니다.' });
      await load();
      onChanged?.();
    }
    setBusyId(null);
  };

  const noticeColor = notice?.kind === 'error' ? '#e85d5d'
                    : notice?.kind === 'warn'  ? 'var(--gold)' : '#22c55e';

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
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { k: 'open',     label: '답변 대기' },
            { k: 'answered', label: '답변 완료' },
            { k: 'closed',   label: '종료' },
            { k: 'all',      label: '전체' },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              style={{
                padding: '6px 14px', fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
                background: filter === f.k ? 'rgba(232,160,32,0.08)' : 'transparent',
                border: `1px solid ${filter === f.k ? 'var(--gold)' : 'var(--border)'}`,
                color: filter === f.k ? 'var(--gold)' : 'var(--muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
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

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{
            width: 24, height: 24, border: '2px solid var(--gold)',
            borderTop: '2px solid transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
        </div>
      ) : rows.length === 0 ? (
        <div style={{
          padding: '48px 32px', textAlign: 'center', color: 'var(--muted)',
          border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 13,
        }}>
          해당하는 문의가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.map(row => {
            const meta   = STATUS_META[row.status] || STATUS_META.open;
            const cat    = INQUIRY_CATEGORIES.find(c => c.value === row.category);
            const isOpen = openId === row.id;
            const busy   = busyId === row.id;
            return (
              <div key={row.id} style={{
                border: '1px solid var(--border)', background: 'var(--bg2)',
                position: 'relative', opacity: busy ? 0.55 : 1,
              }}>
                <Corners />
                <button
                  onClick={() => setOpenId(isOpen ? null : row.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'transparent',
                    border: 'none', padding: '18px 22px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 16,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, color: 'var(--text)', marginBottom: 6,
                      fontFamily: 'var(--font-serif)',
                    }}>
                      {row.subject}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {row.full_name || row.email}
                      {row.role_at_time ? ` · ${ROLE_LABEL[row.role_at_time] || row.role_at_time}` : ''}
                      {' · '}{cat?.ko || row.category}
                      {' · '}{fmt(row.created_at)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, color: meta.color, whiteSpace: 'nowrap',
                    border: `1px solid ${meta.color}`, padding: '3px 10px',
                  }}>
                    {meta.label}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 22px 22px' }}>
                    <div style={{
                      fontSize: 13, color: 'var(--text)', lineHeight: 1.8,
                      whiteSpace: 'pre-wrap', paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}>
                      {row.body}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                      회신 주소 — {row.email}
                    </div>

                    {row.answer ? (
                      <div style={{
                        marginTop: 18, padding: '16px 18px',
                        background: 'var(--bg)', borderLeft: '3px solid #22c55e',
                      }}>
                        <div style={{
                          fontSize: 10, color: '#22c55e', fontFamily: 'var(--font-serif)',
                          letterSpacing: '0.15em', marginBottom: 8,
                        }}>
                          답변 · {fmt(row.answered_at)}
                        </div>
                        <div style={{
                          fontSize: 13, color: 'var(--text)',
                          lineHeight: 1.8, whiteSpace: 'pre-wrap',
                        }}>
                          {row.answer}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                          답변 — 문의자에게 그대로 전달되고 메일로도 발송됩니다.
                        </div>
                        <textarea
                          value={draft[row.id] || ''}
                          onChange={(e) => setDraft(d => ({ ...d, [row.id]: e.target.value }))}
                          rows={5}
                          style={{
                            width: '100%', background: 'var(--bg)', color: 'var(--text)',
                            border: '1px solid var(--border)', padding: '12px 14px',
                            fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                            lineHeight: 1.7,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                          <button
                            onClick={() => send(row)}
                            disabled={busy || !(draft[row.id] || '').trim()}
                            style={{
                              padding: '10px 20px', border: 'none', color: '#fff',
                              fontSize: 12, fontFamily: 'var(--font-serif)',
                              letterSpacing: '0.1em',
                              background: (draft[row.id] || '').trim() ? '#22c55e' : 'var(--border)',
                              cursor: (busy || !(draft[row.id] || '').trim()) ? 'default' : 'pointer',
                            }}
                          >
                            답변 보내기
                          </button>
                          <button
                            onClick={() => close(row)}
                            disabled={busy}
                            style={{
                              padding: '10px 20px', background: 'transparent',
                              color: 'var(--muted)', border: '1px solid var(--border)',
                              fontSize: 12, fontFamily: 'var(--font-serif)',
                              letterSpacing: '0.1em', cursor: busy ? 'default' : 'pointer',
                            }}
                          >
                            답변 없이 종료
                          </button>
                        </div>
                      </div>
                    )}
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

export default InquiryAdmin;
