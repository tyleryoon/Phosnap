import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import {
  INQUIRY_CATEGORIES, submitInquiry, getMyInquiries,
} from '../lib/supabase';

// ─── Support ───────────────────────────────────────────────────────────
//
// 문의 작성 + 내 문의 내역.
//
// 예전에는 개인정보 관리의 "유형 변경 문의" 가 mailto: 였다.
//   window.open('mailto:support@phosnap.com?subject=작가 유형 변경 요청')
// 메일 클라이언트가 없으면 아무 일도 안 일어나고(웹메일 쓰는 사람이 많다),
// 보냈는지 확인할 수 없고, 어디에도 기록이 안 남는다.
//
// ?category=role_change 처럼 열면 해당 분류가 미리 선택된다.
// 유형 변경 버튼에서 그렇게 넘어온다.

const STATUS_META = {
  open:     { label: '답변 대기', color: 'var(--gold)' },
  answered: { label: '답변 완료', color: '#22c55e' },
  closed:   { label: '종료',     color: 'var(--muted)' },
};

const fmt = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const Support = ({ onAuthOpen }) => {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [params] = useSearchParams();

  // ?order=... 로 오면 주문번호를 미리 채워준다.
  // 결제는 됐는데 예약 저장이 실패한 화면에서 넘어오는 경우다.
  // 고객이 주문번호를 옮겨 적다 틀리면 우리가 찾을 수 없다.
  const orderNo = params.get('order') || '';

  const [category, setCategory] = useState(params.get('category') || '');
  const [subject, setSubject]   = useState(orderNo ? `주문번호 ${orderNo}` : '');
  const [body, setBody]         = useState(
    orderNo ? `주문번호: ${orderNo}\n\n결제는 완료되었으나 예약이 저장되지 않았습니다.\n\n(추가로 알려주실 내용이 있으면 아래에 적어주세요)\n` : '',
  );
  const [busy, setBusy]         = useState(false);
  const [notice, setNotice]     = useState(null);   // { kind, text }

  const [list, setList]         = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [openId, setOpenId]     = useState(null);

  const load = useCallback(async () => {
    if (!isLoggedIn) { setList([]); setListLoading(false); return; }
    setListLoading(true);
    const { data } = await getMyInquiries();
    setList(data);
    setListLoading(false);
  }, [isLoggedIn]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    const { data, error } = await submitInquiry({ category, subject, body });
    if (error) {
      setNotice({ kind: 'error', text: error.message });
    } else if (data && data.ok === false) {
      setNotice({ kind: 'warn', text: data.message || '접수하지 못했습니다.' });
    } else {
      setNotice({ kind: 'ok', text: '문의가 접수되었습니다. 답변은 이메일로도 알려드립니다.' });
      setSubject(''); setBody(''); setCategory('');
      await load();
    }
    setBusy(false);
  };

  const canSubmit = category && subject.trim() && body.trim() && !busy;
  const noticeColor = notice?.kind === 'error' ? '#e85d5d'
                    : notice?.kind === 'warn'  ? 'var(--gold)' : '#22c55e';

  if (authLoading) {
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

  if (!isLoggedIn) {
    return (
      <div className="page-enter" style={{ paddingTop: 160, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 20,
          letterSpacing: '0.1em', marginBottom: 12,
        }}>
          로그인이 필요합니다
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.8 }}>
          답변을 보내드리려면 계정이 필요합니다.<br />
          문의 내역도 로그인하시면 여기서 확인하실 수 있습니다.
        </p>
        <button
          className="btn-primary"
          style={{ fontSize: 13, padding: '14px 40px', letterSpacing: '0.1em' }}
          onClick={() => onAuthOpen?.('login')}
        >
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section" style={{ maxWidth: 760, margin: '0 auto' }}>

        <div style={{ marginBottom: 36 }}>
          <div className="section-label">SUPPORT</div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 36px)',
            letterSpacing: '0.05em', marginBottom: 12,
          }}>
            문의하기
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
            이용 중 어려운 점이나 궁금한 것을 남겨주세요.
            분류를 골라주시면 담당자가 더 빨리 확인할 수 있습니다.
          </p>
        </div>

        {notice && (
          <div style={{
            border: `1px solid ${noticeColor}`, background: 'var(--bg2)',
            padding: '14px 18px', marginBottom: 24, fontSize: 13, color: noticeColor,
          }}>
            {notice.text}
          </div>
        )}

        {/* ── 작성 ── */}
        <div style={{
          border: '1px solid var(--border)', background: 'var(--bg2)',
          padding: '28px 26px', position: 'relative', marginBottom: 48,
        }}>
          <Corners />

          <div style={{
            fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.2em', marginBottom: 14,
          }}>
            분류
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 10, marginBottom: 26,
          }}>
            {INQUIRY_CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                style={{
                  textAlign: 'left', padding: '12px 14px', cursor: 'pointer',
                  border: `1px solid ${category === c.value ? 'var(--gold)' : 'var(--border)'}`,
                  background: category === c.value ? 'rgba(232,160,32,0.06)' : 'transparent',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{
                  fontSize: 13, color: category === c.value ? 'var(--gold)' : 'var(--text)',
                  fontFamily: 'var(--font-serif)', marginBottom: 3,
                }}>
                  {c.ko}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {c.desc}
                </div>
              </button>
            ))}
          </div>

          <div style={{
            fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.2em', marginBottom: 10,
          }}>
            제목
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="한 줄로 요약해주세요"
            style={{
              width: '100%', background: 'var(--bg)', color: 'var(--text)',
              border: '1px solid var(--border)', padding: '12px 14px',
              fontSize: 14, fontFamily: 'inherit', marginBottom: 22,
            }}
          />

          <div style={{
            fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
            letterSpacing: '0.2em', marginBottom: 10,
          }}>
            내용
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder={'어떤 화면에서 무엇을 하려다 막히셨는지 적어주시면 가장 빠릅니다.\n오류라면 사용하신 기기와 브라우저도 알려주세요.'}
            style={{
              width: '100%', background: 'var(--bg)', color: 'var(--text)',
              border: '1px solid var(--border)', padding: '12px 14px',
              fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7,
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {body.length}/5000
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="btn-primary"
            style={{
              width: '100%', marginTop: 20, padding: '14px 0',
              fontSize: 13, letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: canSubmit ? 1 : 0.45,
              cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            {busy ? '접수 중…' : '문의 보내기'}
          </button>
        </div>

        {/* ── 내 문의 내역 ── */}
        <div style={{
          fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
          letterSpacing: '0.2em', marginBottom: 16,
        }}>
          내 문의 내역
        </div>

        {listLoading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{
              width: 20, height: 20, border: '2px solid var(--gold)',
              borderTop: '2px solid transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto',
            }} />
          </div>
        ) : list.length === 0 ? (
          <div style={{
            border: '1px solid var(--border)', background: 'var(--bg2)',
            padding: '36px', textAlign: 'center', fontSize: 13, color: 'var(--muted)',
          }}>
            아직 문의하신 내역이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 60 }}>
            {list.map(q => {
              const meta = STATUS_META[q.status] || STATUS_META.open;
              const cat  = INQUIRY_CATEGORIES.find(c => c.value === q.category);
              const isOpen = openId === q.id;
              return (
                <div key={q.id} style={{
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : q.id)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'transparent',
                      border: 'none', padding: '16px 20px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, color: 'var(--text)', marginBottom: 5,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {q.subject}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {cat?.ko || q.category} · {fmt(q.created_at)}
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
                    <div style={{ padding: '0 20px 20px' }}>
                      <div style={{
                        fontSize: 13, color: 'var(--text)', lineHeight: 1.8,
                        whiteSpace: 'pre-wrap', paddingTop: 14,
                        borderTop: '1px solid var(--border)',
                      }}>
                        {q.body}
                      </div>

                      {q.answer ? (
                        <div style={{
                          marginTop: 18, padding: '16px 18px',
                          background: 'var(--bg)', borderLeft: '3px solid #22c55e',
                        }}>
                          <div style={{
                            fontSize: 10, color: '#22c55e', fontFamily: 'var(--font-serif)',
                            letterSpacing: '0.15em', marginBottom: 8,
                          }}>
                            답변 · {fmt(q.answered_at)}
                          </div>
                          <div style={{
                            fontSize: 13, color: 'var(--text)',
                            lineHeight: 1.8, whiteSpace: 'pre-wrap',
                          }}>
                            {q.answer}
                          </div>
                        </div>
                      ) : q.status === 'open' ? (
                        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
                          답변을 준비하고 있습니다. 등록되면 이메일로 알려드립니다.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Support;
