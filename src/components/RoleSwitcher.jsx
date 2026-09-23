import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── RoleSwitcher ──────────────────────────────────────────────────────
//
// 한 계정이 여러 역할을 가질 수 있는데(멀티롤) 정작 전환할 방법이 없었다.
// switchRole() 은 가입 페이지에서만 불렸고, Nav 는 "지금 활성 역할" 에
// 해당하는 링크 하나만 보여줬다.
//
// 그래서 이런 일이 생겼다.
//   · 관리자 역할을 받아도 활성 역할이 artist 면 ⚙ Admin 링크가 안 보인다
//     (주소창에 /admin 을 직접 쳐야 ProtectedRoute 가 자동 전환해 준다)
//   · 헤메 겸 의상벤더는 한쪽 대시보드로 가면 돌아올 길이 없다
//
// 역할이 하나뿐이면 아무것도 그리지 않는다.

const ROLE_META = {
  admin:        { label: '관리자',   path: '/admin',              color: '#f472b6' },
  artist:       { label: '작가',     path: '/artist/dashboard',   color: 'var(--gold)' },
  stylist:      { label: '헤메',     path: '/stylist/dashboard',  color: 'var(--gold)' },
  dress_vendor: { label: '벤더',     path: '/vendor/dashboard',   color: 'var(--gold)' },
  vendor:       { label: '벤더',     path: '/vendor/dashboard',   color: 'var(--gold)' },
  customer:     { label: '고객',     path: '/my',                 color: 'var(--muted)' },
};

// 같은 대상을 가리키는 두 이름이 동시에 들어 있으면 하나만 남긴다.
const dedupe = (roles = []) => {
  const seen = new Set();
  return roles.filter(r => {
    const key = (r === 'vendor' || r === 'dress_vendor') ? 'vendor' : r;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const STATUS_NOTE = {
  pending:   '승인 대기',
  rejected:  '반려됨',
  suspended: '정지',
};

const RoleSwitcher = ({ onNavigate }) => {
  const { roles, activeRole, switchRole, roleStatuses } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const list = dedupe(roles || []);
  if (list.length < 2) return null;

  const current = ROLE_META[activeRole] || ROLE_META.customer;

  const pick = async (role) => {
    setOpen(false);
    if (role === activeRole) return;
    await switchRole(role);
    const meta = ROLE_META[role] || ROLE_META.customer;
    onNavigate?.();
    navigate(meta.path);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'transparent', border: '1px solid var(--border)',
          color: current.color, fontSize: 11, fontFamily: 'var(--font-serif)',
          letterSpacing: '0.08em', padding: '5px 10px', cursor: 'pointer',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.label}
        <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            minWidth: 150, background: 'var(--bg2)',
            border: '1px solid var(--border)', zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {list.map(role => {
            const meta = ROLE_META[role] || { label: role, color: 'var(--muted)' };
            const status = roleStatuses?.[role];
            const note = status && status !== 'active' ? STATUS_NOTE[status] : null;
            const isCurrent = role === activeRole;
            return (
              <button
                key={role}
                role="option"
                aria-selected={isCurrent}
                onClick={() => pick(role)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', gap: 10, padding: '10px 12px',
                  background: isCurrent ? 'var(--accent-a06)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)',
                  color: meta.color, fontSize: 12, fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span>
                  {isCurrent ? '· ' : ''}{meta.label}
                </span>
                {note && (
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{note}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
