import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Custom Date Picker ─────────────────────────────────────────────
// 네이티브 <input type="date">의 브라우저 달력 팝업이
// 월 이동 화살표 클릭 시 닫히는 Chromium 버그를 해결하기 위한 커스텀 컴포넌트.
// 날짜를 직접 선택해야만 닫히는 구조.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

const DatePicker = ({ value, onChange, disabled, style, placeholder = '연도-월-일' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 현재 보여줄 달력의 연/월
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : new Date().getMonth());

  // value 변경 시 viewYear/viewMonth 동기화
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevYear = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setViewYear(y => y - 1);
  }, []);

  const nextYear = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setViewYear(y => y + 1);
  }, []);

  const prevMonth = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const selectDate = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);

  // 선택된 날짜 하이라이트
  const selectedStr = value || '';

  // 달력 셀 생성
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const displayValue = value || '';

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* 표시 인풋 (읽기 전용, 클릭 시 달력 오픈) */}
      <div
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', boxSizing: 'border-box',
          background: disabled ? 'rgba(30,30,30,0.5)' : 'var(--bg)',
          border: open ? '1px solid var(--gold)' : '1px solid var(--border)',
          color: displayValue ? 'var(--text)' : 'var(--muted)',
          padding: '8px 12px',
          fontFamily: 'var(--font-serif)', fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.2s',
        }}
      >
        <span>{displayValue || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </div>

      {/* 달력 드롭다운 */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 1050,
            marginTop: 4,
            width: 280,
            background: '#1a1a1a',
            border: '1px solid var(--gold-border, rgba(232,160,32,0.3))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            padding: '16px',
            userSelect: 'none',
          }}
        >
          {/* 헤더: « ‹ 2025년 3월 › » */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={prevYear}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--muted)', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 12,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                title="이전 연도"
              >
                «
              </button>
              <button
                type="button"
                onClick={prevMonth}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text)', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                ‹
              </button>
            </div>
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 13,
              letterSpacing: '0.08em', color: 'var(--text)',
            }}>
              {viewYear}년 {MONTHS[viewMonth]}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={nextMonth}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text)', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 14,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                ›
              </button>
              <button
                type="button"
                onClick={nextYear}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--muted)', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 12,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                title="다음 연도"
              >
                »
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0, marginBottom: 4,
          }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-sans)',
                color: i === 0 ? 'rgba(232,80,80,0.7)' : i === 6 ? 'rgba(100,149,237,0.7)' : 'var(--muted)',
                padding: '4px 0', letterSpacing: '0.05em',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
          }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;

              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateStr = `${viewYear}-${mm}-${dd}`;
              const isSelected = dateStr === selectedStr;
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              const dayOfWeek = (firstDay + day - 1) % 7;
              const isSun = dayOfWeek === 0;
              const isSat = dayOfWeek === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); selectDate(day); }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    background: isSelected ? 'var(--gold, #e8a020)' : 'transparent',
                    border: isToday && !isSelected ? '1px solid var(--gold-border, rgba(232,160,32,0.4))' : '1px solid transparent',
                    color: isSelected ? '#000' : isSun ? 'rgba(232,80,80,0.8)' : isSat ? 'rgba(100,149,237,0.8)' : 'var(--text)',
                    fontFamily: 'var(--font-serif)', fontSize: 12,
                    padding: '6px 0', textAlign: 'center',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(232,160,32,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(232,160,32,0.3)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = isToday ? 'rgba(232,160,32,0.4)' : 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 하단: 오늘 / 초기화 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 12, paddingTop: 10,
            borderTop: '1px solid var(--border)',
          }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const today = new Date();
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                selectDate(today.getDate());
              }}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--gold)', fontSize: 11,
                fontFamily: 'var(--font-serif)', cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              오늘
            </button>
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  setOpen(false);
                }}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--muted)', fontSize: 11,
                  fontFamily: 'var(--font-serif)', cursor: 'pointer',
                }}
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
