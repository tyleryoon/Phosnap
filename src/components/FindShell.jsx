import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Footer from './Footer';
import SEO from './SEO';
import ProviderDetailModal from './ProviderDetailModal';
import { findProviders, KIND_LABEL } from '../lib/findProviders';
import { getActiveLocations } from '../lib/supabase';

// ─── 찾기 페이지의 껍데기 ──────────────────────────────────────────────
//
// 작가·헤메·의상·장소 네 페이지가 **전부 이 컴포넌트**를 쓴다.
// 페이지는 kind 와 약간의 문구만 넘긴다.
//
// 왜 합쳤나
//   예전에 /photographers 와 /vendors 를 따로 만들었더니 /vendors 쪽이
//   DB 를 아예 안 읽는 가짜가 됐고 몇 달간 아무도 몰랐다.
//   주소는 네 개로 나누되(검색 노출·유형별 필터) 속은 하나로 둔다.
//
// 날짜·시각은 선택 입력이다
//   안 넣으면 전부 둘러본다. 넣으면 그때 가능한 것만 남는다.
//   넣은 채로 '예약하기' 를 누르면 그 조건이 /book 으로 그대로 넘어간다.

const fmt = (n) => (n === null || n === undefined ? null : `₩${Number(n).toLocaleString('ko-KR')}`);

const HOURS = [2, 3, 4, 8];

const inputStyle = {
  padding: '9px 11px', background: 'var(--bg)', color: 'var(--text)',
  border: '1px solid var(--border)', fontSize: 12.5, fontFamily: 'inherit',
};

// ── 카드 ──────────────────────────────────────────────────────────────

const Card = ({ item, onOpen }) => {
  const [err, setErr] = useState(false);
  const sub = subtitleOf(item);
  const price = fmt(item.price);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        border: '1px solid var(--border)', background: 'var(--bg2)',
        padding: 0, color: 'var(--text)', fontFamily: 'inherit',
      }}
    >
      <div style={{ aspectRatio: '4 / 3', background: 'var(--bg)', overflow: 'hidden' }}>
        {item.image && !err ? (
          <img
            src={item.image} alt={item.name || ''} loading="lazy"
            onError={() => setErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', fontSize: 11,
          }}>
            사진 없음
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>
          {/* 이름이 없으면 비워두지 않고 그렇다고 말한다. 빈칸은 버그를 숨긴다. */}
          {item.name || <span style={{ color: 'var(--muted)' }}>이름 없음</span>}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
            {sub}
          </div>
        )}
        {price && (
          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8 }}>
            {price}{item.byPerson ? ' 부터' : ''}
            {item.priceUnit ? ` / ${item.priceUnit}` : ''}
          </div>
        )}
      </div>
    </button>
  );
};

const subtitleOf = (it) => {
  const bits = [];
  if (it.kind === 'photographer') {
    const t = { photographer: '사진', videographer: '영상', both: '사진+영상' }[it.artistType];
    if (t) bits.push(t);
    if (it.hmkSelf) bits.push('자체 헤메');
    if (it.dressSelf) bits.push('자체 의상');
  }
  if (it.kind === 'stylist') {
    if (it.specialty) bits.push(it.specialty);
    if (it.serviceName) bits.push(it.serviceName);
    else if (it.serviceCount) bits.push(`시술 ${it.serviceCount}종`);
    if (it.dressSelf) bits.push('의상 보유');
  }
  if (it.kind === 'dress') {
    if (it.category) bits.push(it.category);
    if (it.sizes?.length) bits.push(it.sizes.join(', '));
    if (it.vendorName) bits.push(it.vendorName);
  }
  if (it.kind === 'venue') {
    if (it.capacity) bits.push(`${it.capacity}명`);
    if (it.vendorName) bits.push(it.vendorName);
  }
  return bits.join(' · ') || null;
};

// ── 본체 ──────────────────────────────────────────────────────────────

const FindShell = ({ kind, title, description, emptyHint }) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(params.get('loc') || '');
  const [date, setDate] = useState(params.get('date') || '');
  const [time, setTime] = useState(params.get('time') || '');
  const [hours, setHours] = useState(Number(params.get('hours')) || 2);

  const [items, setItems] = useState([]);
  const [anchored, setAnchored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let dead = false;
    getActiveLocations().then(({ data }) => { if (!dead) setLocations(data || []); });
    return () => { dead = true; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, anchored: a, error: e } = await findProviders({
      kind, locationId: locationId || null,
      date: date || null, time: time || null, hours,
    });
    setLoading(false);
    if (e) {
      // 조용히 빈 목록을 보여주지 않는다. 없는 것과 못 불러온 것은 다르다.
      setError(e.message || '목록을 불러오지 못했습니다.');
      setItems([]);
      setAnchored(false);
      return;
    }
    setItems(data);
    setAnchored(a);
  }, [kind, locationId, date, time, hours]);

  useEffect(() => { load(); }, [load]);

  // 조건을 주소에 남긴다 — 새로고침·공유해도 같은 화면이 나오게
  useEffect(() => {
    const next = {};
    if (locationId) next.loc = locationId;
    if (date) next.date = date;
    if (time) next.time = time;
    if (date && time && hours !== 2) next.hours = String(hours);
    setParams(next, { replace: true });
  }, [locationId, date, time, hours, setParams]);

  const goBook = () => {
    const q = new URLSearchParams();
    if (locationId) q.set('loc', locationId);
    if (date) q.set('date', date);
    if (time) q.set('time', time);
    q.set('hours', String(hours));
    q.set('tab', kind);
    navigate(`/book?${q}`);
  };

  const dateBroken = !!date && !time;
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <SEO title={`${title} | Phosnap`} description={description} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '130px 24px 60px' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, margin: 0,
        }}>
          {title}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10, lineHeight: 1.7 }}>
          {description}
        </p>

        {/* ── 조건 ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
          marginTop: 26, paddingBottom: 22, borderBottom: '1px solid var(--border)',
        }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>지역</span>
            <select value={locationId} onChange={e => setLocationId(e.target.value)} style={inputStyle}>
              <option value="">전 지역</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name_ko || l.name || l.id}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>날짜 (선택)</span>
            <input type="date" value={date} min={todayStr}
              onChange={e => setDate(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>시작 시각 (선택)</span>
            <input type="time" value={time} step={1800}
              onChange={e => setTime(e.target.value)} style={inputStyle} />
          </label>

          {date && time && (
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>촬영 길이</span>
              <select value={hours} onChange={e => setHours(Number(e.target.value))} style={inputStyle}>
                {HOURS.map(h => <option key={h} value={h}>{h}시간</option>)}
              </select>
            </label>
          )}

          {(date || time) && (
            <button type="button" onClick={() => { setDate(''); setTime(''); }}
              style={{
                ...inputStyle, cursor: 'pointer', color: 'var(--muted)',
                background: 'transparent',
              }}>
              날짜 지우기
            </button>
          )}
        </div>

        {/* 날짜만 넣고 시각을 안 넣으면 앵커가 안 켜진다.
            말 안 하면 "걸러졌겠거니" 하고 믿어버린다. */}
        {dateBroken && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gold)' }}>
            시작 시각까지 넣어야 그 시간에 가능한 곳만 걸러집니다. 지금은 전체를 보고 있습니다.
          </div>
        )}

        {/* ── 상태 줄 ── */}
        <div style={{
          marginTop: 20, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {loading ? '불러오는 중…'
              : error ? ''
              : anchored
                ? `${date} ${time} 부터 ${hours}시간 · 가능한 ${KIND_LABEL[kind]} ${items.length}`
                : `전체 ${items.length}`}
          </div>
          {!loading && !error && items.length > 0 && (
            <button type="button" onClick={goBook} style={{
              padding: '10px 18px', border: 'none', background: 'var(--gold)',
              color: '#0B0B0B', fontSize: 12, letterSpacing: '0.1em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              예약 구성하기
            </button>
          )}
        </div>

        {/* ── 목록 ── */}
        {error ? (
          <div style={{
            marginTop: 28, padding: '22px 24px', border: '1px solid var(--gold-border)',
            background: 'var(--bg2)',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>목록을 불러오지 못했습니다</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}>
              {error}
            </div>
            <button type="button" onClick={load} style={{
              marginTop: 14, padding: '8px 16px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--gold)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              다시 시도
            </button>
          </div>
        ) : loading ? null : items.length === 0 ? (
          <div style={{
            marginTop: 40, textAlign: 'center', color: 'var(--muted)',
            fontSize: 13, lineHeight: 1.8,
          }}>
            {anchored
              ? `그 시간에 가능한 ${KIND_LABEL[kind]}가 없습니다. 날짜나 시각을 바꿔보세요.`
              : (emptyHint || `등록된 ${KIND_LABEL[kind]}가 없습니다.`)}
          </div>
        ) : (
          <div style={{
            marginTop: 28, display: 'grid', gap: 18,
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}>
            {items.map(it => (
              <Card key={`${it.kind}-${it.id}`} item={it} onOpen={() => setDetail(it)} />
            ))}
          </div>
        )}
      </div>

      {detail && (
        <ProviderDetailModal
          kind={detail.kind}
          data={detail.raw}
          onClose={() => setDetail(null)}
        >
          <button type="button" onClick={goBook} style={{
            padding: '11px 20px', border: 'none', background: 'var(--gold)',
            color: '#0B0B0B', fontSize: 12, letterSpacing: '0.1em',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            이 조건으로 예약 구성하기
          </button>
        </ProviderDetailModal>
      )}

      <Footer />
    </div>
  );
};

export default FindShell;
