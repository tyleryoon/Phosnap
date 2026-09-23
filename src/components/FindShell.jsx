import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Footer from './Footer';
import SEO from './SEO';
import ProviderDetailModal from './ProviderDetailModal';
import { findProviders } from '../lib/findProviders';
import { getActiveLocations } from '../lib/supabase';
import { locationLabel } from '../data/locationUtils';
import { useLanguage } from '../contexts/LanguageContext';

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

const Card = ({ item, onOpen, t }) => {
  const [err, setErr] = useState(false);
  const sub = subtitleOf(item, t);
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
            {t('find.noPhoto')}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>
          {/* 이름이 없으면 비워두지 않고 그렇다고 말한다. 빈칸은 버그를 숨긴다. */}
          {item.name || <span style={{ color: 'var(--muted)' }}>{t('find.noName')}</span>}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
            {sub}
          </div>
        )}
        {price && (
          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8 }}>
            {price}{item.byPerson ? ` ${t('find.from')}` : ''}
            {/* per_session 같은 DB 값을 그대로 내보내고 있었다. 사람 말로 바꾼다. */}
            {item.priceUnit ? ` / ${enumLabel(t, 'priceUnit', item.priceUnit)}` : ''}
          </div>
        )}
      </div>
    </button>
  );
};

/**
 * enum 값을 사람 말로.
 *
 * t() 는 키를 못 찾으면 키 문자열을 그대로 돌려준다. 그대로 쓰면
 * 화면에 'dressCat.suit' 가 찍힌다 — 실제로 그랬다. DB 에 새 카테고리가
 * 하나 생길 때마다 고객 화면이 깨지는 구조는 쓸 수 없다.
 * 번역이 없으면 최소한 원래 값을 보여준다. 키는 절대 내보내지 않는다.
 */
const enumLabel = (t, ns, v) => {
  if (!v) return null;
  const out = t(`${ns}.${v}`);
  return out === `${ns}.${v}` ? v : out;
};

// 카드 아래 한 줄 설명.
// 예전에는 DB 의 원시 enum 을 그대로 흘려보냈다 — 고객 화면에
// 'hanbok', 'suit', 'per_session' 이 그대로 찍혔다. 전부 번역을 거친다.
const subtitleOf = (it, t) => {
  const bits = [];
  if (it.kind === 'photographer') {
    if (it.artistType) bits.push(enumLabel(t, 'artistType', it.artistType));
    if (it.hmkSelf) bits.push(t('findSub.hmkSelf'));
    if (it.dressSelf) bits.push(t('findSub.dressSelf'));
  }
  if (it.kind === 'stylist') {
    if (it.specialty) bits.push(it.specialty);
    if (it.serviceName) bits.push(it.serviceName);
    else if (it.serviceCount) bits.push(t('findSub.serviceCount').replace('{n}', it.serviceCount));
    if (it.dressSelf) bits.push(t('findSub.dressOwned'));
  }
  if (it.kind === 'dress') {
    if (it.category) bits.push(enumLabel(t, 'dressCat', it.category));
    if (it.sizes?.length) bits.push(it.sizes.join(', '));
    if (it.vendorName) bits.push(it.vendorName);
  }
  if (it.kind === 'venue') {
    if (it.category) bits.push(enumLabel(t, 'venueCat', it.category));
    if (it.capacity) bits.push(t('findSub.capacity').replace('{n}', it.capacity));
    if (it.vendorName) bits.push(it.vendorName);
  }
  return bits.join(' · ') || null;
};

// ── 본체 ──────────────────────────────────────────────────────────────

const FindShell = ({ kind, title, description, emptyHint }) => {
  const { lang, t } = useLanguage();
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
      {/* SEO 가 ' | Phosnap' 을 알아서 붙인다. 여기서 또 붙이면
          탭 제목이 '촬영 장소 찾기 | Phosnap | Phosnap' 이 된다. */}
      <SEO title={title} description={description} />

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
            <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>{t('find.region')}</span>
            <select value={locationId} onChange={e => setLocationId(e.target.value)} style={inputStyle}>
              <option value="">{t('find.allRegions')}</option>
              {/* getActiveLocations 는 id 문자열 배열을 준다.
                  예전엔 여기서 l.id / l.name_ko 를 읽어 전부 undefined 가 됐고,
                  지역 선택이 통째로 죽어 있었다. (React key 경고의 정체) */}
              {locations.map(id => (
                <option key={id} value={id}>{locationLabel(id, lang)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>{t('find.dateOpt')}</span>
            <input type="date" value={date} min={todayStr}
              onChange={e => setDate(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>{t('find.timeOpt')}</span>
            <input type="time" value={time} step={1800}
              onChange={e => setTime(e.target.value)} style={inputStyle} />
          </label>

          {date && time && (
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.1em' }}>{t('find.duration')}</span>
              <select value={hours} onChange={e => setHours(Number(e.target.value))} style={inputStyle}>
                {HOURS.map(h => <option key={h} value={h}>{h}{t('find.hourSuffix')}</option>)}
              </select>
            </label>
          )}

          {(date || time) && (
            <button type="button" onClick={() => { setDate(''); setTime(''); }}
              style={{
                ...inputStyle, cursor: 'pointer', color: 'var(--muted)',
                background: 'transparent',
              }}>
              {t('find.clearDate')}
            </button>
          )}
        </div>

        {/* 날짜만 넣고 시각을 안 넣으면 앵커가 안 켜진다.
            말 안 하면 "걸러졌겠거니" 하고 믿어버린다. */}
        {dateBroken && (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gold)' }}>
            {t('find.dateOnlyWarn')}
          </div>
        )}

        {/* ── 상태 줄 ── */}
        <div style={{
          marginTop: 20, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {loading ? t('find.loading')
              : error ? ''
              : anchored
                ? `${date} ${time} ${t('find.anchorFrom')} ${hours}${t('find.hourSuffix')} · ${items.length}`
                : `${t('find.total')} ${items.length}`}
          </div>
          {!loading && !error && items.length > 0 && (
            <button type="button" onClick={goBook} style={{
              padding: '10px 18px', border: 'none', background: 'var(--gold)',
              color: 'var(--on-accent)', fontSize: 12, letterSpacing: '0.1em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t('find.goBook')}
            </button>
          )}
        </div>

        {/* ── 목록 ── */}
        {error ? (
          <div style={{
            marginTop: 28, padding: '22px 24px', border: '1px solid var(--gold-border)',
            background: 'var(--bg2)',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}>{t('find.loadFail')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}>
              {error}
            </div>
            <button type="button" onClick={load} style={{
              marginTop: 14, padding: '8px 16px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--gold)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t('find.retry')}
            </button>
          </div>
        ) : loading ? null : items.length === 0 ? (
          <div style={{
            marginTop: 40, textAlign: 'center', color: 'var(--muted)',
            fontSize: 13, lineHeight: 1.8,
          }}>
            {anchored ? t('find.emptyAnchored') : (emptyHint || t('find.empty'))}
          </div>
        ) : (
          <div style={{
            marginTop: 28, display: 'grid', gap: 18,
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}>
            {items.map(it => (
              <Card key={`${it.kind}-${it.id}`} item={it} onOpen={() => setDetail(it)} t={t} />
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
            color: 'var(--on-accent)', fontSize: 12, letterSpacing: '0.1em',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t('find.bookThis')}
          </button>
        </ProviderDetailModal>
      )}

      <Footer />
    </div>
  );
};

export default FindShell;
