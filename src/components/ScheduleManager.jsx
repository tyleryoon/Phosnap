import { useState, useEffect, useCallback } from 'react';
import {
  getProviderDefaults, upsertProviderDefaults,
  getProviderScheduleMonth, upsertProviderScheduleDate,
  bulkSetSchedule, resolveProviderSlots, resolveDayState,
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

/**
 * 슬롯 목록을 "09:00~18:00" 형태로 요약한다.
 *
 * 슬롯이 연속이 아닐 수 있다는 점이 중요하다.
 * 예: 10,11,13,14,15,16,17 은 12시가 빠져 있는데(점심)
 * 그냥 "10:00~17:00" 으로 쓰면 12시도 되는 것처럼 보인다.
 * 중간에 빈 시간이 있으면 * 를 붙인다.
 */
const summarizeSlots = (slots = []) => {
  if (!slots.length) return { text: '', gap: false };
  const sorted = [...slots].sort();
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  if (sorted.length === 1) return { text: first, gap: false };

  // 정시 슬롯만 있을 때는 개수로 연속 여부를 판정할 수 있다
  const allOnTheHour = sorted.every(x => /^\d{2}:00$/.test(x));
  let gap = false;
  if (allOnTheHour) {
    const h = (x) => parseInt(x.slice(0, 2), 10);
    gap = (h(last) - h(first) + 1) !== sorted.length;
  }
  return { text: `${first}~${last}`, gap };
};

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
    legendOpen: '영업', legendClosed: '휴무',
    legendWeekly: '정기 휴무', legendDefault: '기본 운영시간 적용',
    dayOffShort: '휴무', weeklyShort: '정기',
    gapNote: '* 표시는 중간에 쉬는 시간이 있다는 뜻입니다',
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
    legendOpen: 'Open', legendClosed: 'Closed',
    legendWeekly: 'Weekly day off', legendDefault: 'Default hours apply',
    dayOffShort: 'Closed', weeklyShort: 'Weekly',
    gapNote: '* means there is a break in the middle',
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

  /** 그 날의 실효 상태 — 정기 휴무까지 반영한다 */
  const stateOf = (d) => resolveDayState(days[key(d)], defaults, new Date(year, month - 1, d));

  const toggleDay = async (d) => {
    const date = key(d);
    // 지금 열려 있으면(명시 영업 또는 기본 운영) 닫고,
    // 닫혀 있으면(명시 휴무 또는 정기 휴무) 그날만 예외로 연다.
    const st = stateOf(d);
    const nextOff = (st === 'open' || st === 'default');
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

    // 달력을 방금 설정한 달로 옮긴다.
    // 다른 달을 보고 있으면 변화가 눈에 안 보여서
    // 눌렀는데 아무 일도 안 일어난 것처럼 느껴진다.
    const [fy, fm] = from.split('-').map(Number);
    if (fy && fm && (fy !== year || fm !== month)) {
      setYear(fy);
      setMonth(fm);
    } else {
      await loadMonth();
    }
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
        <div
          ref={el => { if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }}
          style={{
            padding: 14, fontSize: 13, lineHeight: 1.7,
            background: err ? 'rgba(232,93,93,0.08)' : 'rgba(232,160,32,0.08)',
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
            const dateStr = key(d);
            const row = days[dateStr];
            // 정기 휴무까지 반영한 실효 상태.
            // 예전에는 row 유무만 봐서, 정기 휴무로 지정한 요일이
            // 달력에 아무 표시 없이 '미설정'으로 보였다.
            const st = resolveDayState(row, defaults, new Date(year, month - 1, d));
            const slots = resolveProviderSlots(row, defaults, dateStr);

            const style = {
              open:      { bg: 'rgba(72,187,120,0.14)', bd: 'rgba(72,187,120,0.55)', fg: '#48bb78' },
              default:   { bg: 'rgba(72,187,120,0.05)', bd: 'var(--border)',         fg: 'var(--muted)' },
              closed:    { bg: 'rgba(232,93,93,0.12)',  bd: 'rgba(232,93,93,0.45)',  fg: '#e85d5d' },
              weeklyOff: { bg: 'rgba(232,93,93,0.06)',  bd: 'rgba(232,93,93,0.28)',  fg: 'rgba(232,93,93,0.75)' },
            }[st];

            const summary = summarizeSlots(slots);
            const caption =
              st === 'closed'    ? t.dayOffShort
            : st === 'weeklyOff' ? t.weeklyShort
            : summary.text + (summary.gap ? '*' : '');

            return (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                title={`${dateStr} · ${
                  st === 'closed' ? t.legendClosed
                  : st === 'weeklyOff' ? t.legendWeekly
                  : st === 'default' ? t.legendDefault
                  : t.legendOpen}${slots.length ? `\n${slots.join(', ')}` : ''}`}
                style={{
                  aspectRatio: '1', cursor: 'pointer', padding: 4,
                  background: style.bg,
                  border: `1px solid ${style.bd}`,
                  color: 'var(--text)', fontFamily: 'var(--font-body)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}>
                <span style={{ fontSize: 13 }}>{d}</span>
                <span style={{ fontSize: 8.5, color: style.fg, lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {caption}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 11,
                      color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#48bb78' }}>■ {t.legendOpen}</span>
          <span>■ {t.legendDefault}</span>
          <span style={{ color: '#e85d5d' }}>■ {t.legendClosed}</span>
          <span style={{ color: 'rgba(232,93,93,0.75)' }}>■ {t.legendWeekly}</span>
          <span style={{ marginLeft: 'auto' }}>{t.hint}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}>
          {lang === 'ko'
            ? `칸 아래는 그날 예약을 받는 시간대입니다. ${t.gapNote} 설정하지 않은 날은 기본 운영시간이 그대로 적용됩니다.`
            : `Each cell shows the bookable hours. ${t.gapNote}. Days you never touch fall back to your default hours.`}
        </div>
      </section>
    </div>
  );
}
