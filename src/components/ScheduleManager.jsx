import { useState, useEffect, useCallback } from 'react';
import {
  getProviderDefaults, upsertProviderDefaults,
  getProviderScheduleMonth, upsertProviderScheduleDate,
  bulkSetSchedule, resolveProviderSlots,
} from '../lib/supabase';

// ─── 공급자 운영 일정 관리 ────────────────────────────────────────────
//
// 작가 · 헤메 · 벤더가 같이 쓴다. provider_schedules 한 테이블을 보므로
// 역할이 늘어도 이 컴포넌트만 쓰면 된다.
//
// 핵심 기능
//   · 달력에서 하루씩 열기/닫기
//   · 날짜 범위 일괄 오픈/클로즈
//   · 기본 운영시간 + 정기 휴무 요일 설정
//
// 일괄 처리 시 확정된 예약이 있는 날짜는 서버에서 건너뛰고,
// 그 목록을 돌려받아 화면에 안내한다.
// ─────────────────────────────────────────────────────────────────────

const ALL_SLOTS = [
  '09:00','10:00','11:00','12:00','13:00','14:00',
  '15:00','16:00','17:00','18:00','19:00','20:00',
];

const DOW = ['일','월','화','수','목','금','토'];

const i18n = {
  ko: {
    title: '운영 일정',
    defaults: '기본 운영시간',
    weeklyOff: '정기 휴무 요일',
    bulk: '기간 일괄 설정',
    from: '시작일', to: '종료일',
    openAll: '기간 전체 오픈', closeAll: '기간 전체 휴무',
    save: '저장', saving: '처리 중…',
    saved: '저장되었습니다',
    open: '영업', closed: '휴무',
    legendOpen: '영업일', legendClosed: '휴무일', legendNone: '미설정',
    hint: '날짜를 누르면 영업/휴무가 바뀝니다',
    bulkDone: (n) => `${n}일 설정 완료`,
    skipped: '예약이 있어 휴무로 바꾸지 못한 날',
    holiday: '정기 휴무라 건너뛴 날',
    noDefaults: '기본 운영시간을 먼저 지정하세요',
    prev: '← 이전', next: '다음 →',
  },
  en: {
    title: 'Availability',
    defaults: 'Default hours',
    weeklyOff: 'Weekly days off',
    bulk: 'Bulk update',
    from: 'From', to: 'To',
    openAll: 'Open all', closeAll: 'Close all',
    save: 'Save', saving: 'Working…',
    saved: 'Saved',
    open: 'Open', closed: 'Closed',
    legendOpen: 'Open', legendClosed: 'Closed', legendNone: 'Not set',
    hint: 'Click a date to toggle open/closed',
    bulkDone: (n) => `${n} day(s) updated`,
    skipped: 'Kept open — bookings exist',
    holiday: 'Skipped — weekly day off',
    noDefaults: 'Set your default hours first',
    prev: '← Prev', next: 'Next →',
  },
};

export default function ScheduleManager({ providerType, providerId, lang = 'ko' }) {
  const t = i18n[lang] || i18n.ko;
  const today = new Date();

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [days, setDays]   = useState({});   // 'YYYY-MM-DD' → row
  const [defaults, setDefaults] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  const [draftSlots, setDraftSlots] = useState([]);
  const [draftOff, setDraftOff]     = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${year}-${pad(month)}-${pad(d)}`;

  const loadMonth = useCallback(async () => {
    if (!providerId) return;
    const { data } = await getProviderScheduleMonth(providerType, providerId, year, month);
    const map = {};
    for (const row of data) map[row.date] = row;
    setDays(map);
  }, [providerType, providerId, year, month]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!providerId) { setLoading(false); return; }
      setLoading(true);
      const { data: def } = await getProviderDefaults(providerType, providerId);
      if (cancelled) return;
      setDefaults(def);
      setDraftSlots(def?.default_slots || ALL_SLOTS.slice(0, 10));
      setDraftOff(def?.weekly_off || []);
      await loadMonth();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [providerType, providerId, loadMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const flash = (text, isError = false) => {
    if (isError) { setErr(text); setMsg(''); } else { setMsg(text); setErr(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 5000);
  };

  const toggleDay = async (d) => {
    const date = key(d);
    const cur = days[date];
    // 미설정 → 영업, 영업 → 휴무, 휴무 → 영업
    const nextOff = cur ? !cur.day_off : false;
    const { error } = await upsertProviderScheduleDate(providerType, providerId, date, { dayOff: nextOff });
    if (error) { flash(error.message, true); return; }
    await loadMonth();
  };

  const saveDefaults = async () => {
    setBusy(true);
    const { error } = await upsertProviderDefaults(providerType, providerId, {
      defaultSlots: draftSlots,
      weeklyOff: draftOff,
    });
    setBusy(false);
    if (error) { flash(error.message, true); return; }
    setDefaults({ ...(defaults || {}), default_slots: draftSlots, weekly_off: draftOff });
    flash(t.saved);
  };

  const runBulk = async (open) => {
    if (!from || !to) { flash(`${t.from} · ${t.to}`, true); return; }
    if (open && !draftSlots.length) { flash(t.noDefaults, true); return; }
    setBusy(true);
    const { data, error } = await bulkSetSchedule(providerType, providerId, {
      from, to, open, slots: open ? draftSlots : null,
    });
    setBusy(false);
    if (error) { flash(error.message, true); return; }

    let text = t.bulkDone(data?.updated ?? 0);
    // 서버가 건너뛴 날짜를 알려준다. 조용히 넘어가면 공급자는
    // 닫혔다고 믿는데 실제로는 열려 있는 상태가 된다.
    if (data?.skipped?.length) text += ` · ${t.skipped}: ${data.skipped.join(', ')}`;
    if (data?.holiday?.length) text += ` · ${t.holiday} ${data.holiday.length}일`;
    flash(text);
    await loadMonth();
  };

  const move = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  };

  if (!providerId) {
    return <div style={{ padding: 32, color: 'var(--muted)' }}>{t.noDefaults}</div>;
  }
  if (loading) {
    return <div style={{ padding: 32, color: 'var(--muted)' }}>…</div>;
  }

  const firstDow = new Date(year, month - 1, 1).getDay();
  const total = new Date(year, month, 0).getDate();
  const box = {
    padding: 12, background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: 14,
  };

  return (
    <div style={{ display: 'grid', gap: 24, padding: '24px 0' }}>

      {/* 기본 운영시간 */}
      <section style={{ border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{t.defaults}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {ALL_SLOTS.map(s => {
            const on = draftSlots.includes(s);
            return (
              <button key={s} type="button"
                onClick={() => setDraftSlots(p => on ? p.filter(x => x !== s) : [...p, s].sort())}
                style={{
                  padding: '6px 12px', fontSize: 13, cursor: 'pointer',
                  background: on ? 'rgba(232,160,32,0.14)' : 'transparent',
                  border: `1px solid ${on ? 'rgba(232,160,32,0.8)' : 'var(--border)'}`,
                  color: on ? 'var(--gold)' : 'var(--muted)',
                }}>{s}</button>
            );
          })}
        </div>

        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{t.weeklyOff}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {DOW.map((d, i) => {
            const on = draftOff.includes(i);
            return (
              <button key={i} type="button"
                onClick={() => setDraftOff(p => on ? p.filter(x => x !== i) : [...p, i])}
                style={{
                  width: 38, height: 38, cursor: 'pointer', fontSize: 13,
                  background: on ? 'rgba(232,93,93,0.15)' : 'transparent',
                  border: `1px solid ${on ? 'rgba(232,93,93,0.7)' : 'var(--border)'}`,
                  color: on ? '#e85d5d' : 'var(--muted)',
                }}>{d}</button>
            );
          })}
        </div>

        <button className="btn-primary" onClick={saveDefaults} disabled={busy}>
          {busy ? t.saving : t.save}
        </button>
      </section>

      {/* 기간 일괄 설정 */}
      <section style={{ border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{t.bulk}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t.from}</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={box} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t.to}</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={box} />
          </label>
          <button className="btn-primary" onClick={() => runBulk(true)} disabled={busy}>
            {t.openAll}
          </button>
          <button className="btn-outline" onClick={() => runBulk(false)} disabled={busy}>
            {t.closeAll}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, lineHeight: 1.7 }}>
          {lang === 'ko'
            ? '오픈 시 위에서 지정한 기본 운영시간이 적용되고, 정기 휴무 요일은 건너뜁니다. 예약이 잡힌 날은 휴무로 바뀌지 않습니다.'
            : 'Opening applies your default hours and skips weekly days off. Dates with bookings are never closed.'}
        </div>
      </section>

      {(msg || err) && (
        <div style={{
          padding: 12, fontSize: 13, lineHeight: 1.7,
          border: `1px solid ${err ? 'rgba(232,93,93,0.5)' : 'rgba(232,160,32,0.5)'}`,
          color: err ? '#e85d5d' : 'var(--gold)',
        }}>{err || msg}</div>
      )}

      {/* 달력 */}
      <section style={{ border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button className="btn-outline" onClick={() => move(-1)}>{t.prev}</button>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{year}. {pad(month)}</div>
          <button className="btn-outline" onClick={() => move(1)}>{t.next}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {DOW.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', paddingBottom: 6 }}>{d}</div>
          ))}
          {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: total }).map((_, i) => {
            const d = i + 1;
            const row = days[key(d)];
            const isOff = row?.day_off;
            const isOpen = row && !row.day_off;
            const slotCount = row ? resolveProviderSlots(row, defaults).length : 0;
            return (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                style={{
                  aspectRatio: '1', cursor: 'pointer', padding: 4,
                  background: isOpen ? 'rgba(72,187,120,0.12)'
                            : isOff  ? 'rgba(232,93,93,0.10)' : 'transparent',
                  border: `1px solid ${isOpen ? 'rgba(72,187,120,0.5)'
                                     : isOff ? 'rgba(232,93,93,0.4)' : 'var(--border)'}`,
                  color: 'var(--text)', fontFamily: 'var(--font-body)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}>
                <span style={{ fontSize: 13 }}>{d}</span>
                {isOpen && <span style={{ fontSize: 9, color: '#48bb78' }}>{slotCount}</span>}
                {isOff && <span style={{ fontSize: 9, color: '#e85d5d' }}>·</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
          <span>🟢 {t.legendOpen}</span>
          <span>🔴 {t.legendClosed}</span>
          <span>⬜ {t.legendNone}</span>
          <span style={{ marginLeft: 'auto' }}>{t.hint}</span>
        </div>
      </section>
    </div>
  );
}
