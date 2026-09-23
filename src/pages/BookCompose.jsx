import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import ProviderDetailModal from '../components/ProviderDetailModal';
import {
  getAvailableProviders,
  getActiveLocations,
  getPackages,
  getStylistDresses,
} from '../lib/supabase';
import { locationLabel } from '../data/locationUtils';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';

// ─── 예약 구성 (새 흐름) ────────────────────────────────────────────────
//
// 왜 새로 만드나
//   예전 흐름은 작가 → 헤메 → 의상 → 장소 순서를 강제했다.
//   장소 사진도 못 보고 넘어가야 했고, 뒤로 가면 앞 선택이 풀렸다.
//
//   그런데 순서가 강제된 이유는 UI 취향이 아니라 **데이터 의존**이었다.
//   헤메 시술이 가능한지 판정하려면 촬영이 언제 시작해서 언제 끝나는지
//   알아야 하고, 그건 작가·패키지에서 나왔다.
//
//   그래서 뿌리를 앞으로 뺐다.
//     지역 · 날짜 · 시각 · 길이  ← 이게 정해지면 나머지는 서로 독립이다
//
//   조건이 정해진 뒤에는 작가·헤메·의상·장소를 아무 순서로나 고른다.
//   목록에는 **그 조건에 실제로 가능한 것만** 뜬다 (available_providers).
//   그래서 담아둔 게 나중에 무효가 될 일이 거의 없다.
//
// 아직 안 된 것
//   확인·결제 화면은 다음 단계다. 지금은 구성까지만 한다.

const HOUR_OPTIONS = [
  { hours: 2, label: '2시간' },
  { hours: 3, label: '3시간' },
  { hours: 4, label: '4시간' },
  { hours: 8, label: '종일 (8시간)' },
];

const TIME_OPTIONS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

// 무엇도 필수가 아니다. 헤메만·의상만·장소만 예약할 수 있다 (FIX_40).
//
// 예전에는 작가가 뿌리였다 — bookings.photographer_id 가 NOT NULL 이라
// 작가 없는 예약을 만들 수가 없었다. 그래서 "헤메만 부르고 싶다" 는
// 고객은 아예 쓸 수가 없었다.
//
// 다만 작가를 고르면 선택지가 **늘어난다**. 그 작가의 자체 헤메·의상이
// 목록에 붙기 때문이다. 그래서 작가 탭이 먼저 온다.
const TABS = [
  { key: 'photographer', label: '작가' },
  { key: 'stylist', label: '헤어메이크업' },
  { key: 'dress', label: '의상' },
  { key: 'venue', label: '장소' },
];
// 담은 구성 규칙은 lib/cart.js 로 옮겼다 — 전역 장바구니도 같은 규칙을 쓴다.
import { normalizeCart, locationConflict } from '../lib/cart';

const fmt = (n) => `₩${Number(n || 0).toLocaleString('ko-KR')}`;

const hhmm = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── 작은 조각들 ────────────────────────────────────────────────────────

const Pill = ({ active, onClick, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '9px 16px',
      fontSize: 12.5,
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'var(--font-serif)',
      letterSpacing: '0.04em',
      border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      background: active ? 'var(--accent-a10)' : 'transparent',
      color: active ? 'var(--gold)' : disabled ? 'var(--muted)' : 'var(--text)',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const Card = ({ title, subtitle, price, note, image, picked, onDetail, onToggle }) => (
  <div
    style={{
      border: `1px solid ${picked ? 'var(--gold)' : 'var(--border)'}`,
      background: picked ? 'var(--accent-a06)' : 'var(--bg2)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}
  >
    {image ? (
      <img src={image} alt={title} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
    ) : (
      <div
        style={{
          height: 60,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: 11,
        }}
      >
        사진 없음
      </div>
    )}

    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, marginBottom: 4 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>
          {subtitle}
        </div>
      )}
      {note && <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 8 }}>{note}</div>}

      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
        {price !== null && price !== undefined && (
          <div
            style={{
              color: 'var(--gold)',
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              marginBottom: 10,
            }}
          >
            {fmt(price)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onToggle}
            style={{
              flex: 1,
              padding: '9px 0',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.06em',
              border: picked ? 'none' : '1px solid var(--gold)',
              background: picked ? 'var(--gold)' : 'transparent',
              color: picked ? 'var(--on-accent)' : 'var(--gold)',
            }}
          >
            {picked ? '✓ 담음' : '담기'}
          </button>
          {onDetail && (
            <button
              type="button"
              onClick={onDetail}
              style={{
                padding: '9px 14px',
                cursor: 'pointer',
                fontSize: 11,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--muted)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              상세
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ─── 본체 ───────────────────────────────────────────────────────────────

const BookCompose = () => {
  const { lang } = useLanguage();

  // 찾기 페이지에서 조건을 들고 넘어올 수 있다.
  //   /book?loc=seoul&date=2026-09-25&time=14:00&hours=3&tab=stylist
  //
  // 안 읽으면 '예약 구성하기' 버튼이 조건을 넘기는 시늉만 하고
  // 고객은 방금 고른 걸 처음부터 다시 입력하게 된다.
  const [urlParams] = useSearchParams();

  // ── 앵커 ──
  const [locationId, setLocationId] = useState(() => urlParams.get('loc') || '');
  const [date, setDate] = useState(() => urlParams.get('date') || '');
  const [time, setTime] = useState(() => urlParams.get('time') || '');
  const [hours, setHours] = useState(() => {
    const h = Number(urlParams.get('hours'));
    return [2, 3, 4, 8].includes(h) ? h : 2;
  });

  const [locations, setLocations] = useState([]);
  const [result, setResult] = useState(null); // available_providers 응답
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const [tab, setTab] = useState(() => {
    const t = urlParams.get('tab');
    return TABS.some((x) => x.key === t) ? t : 'photographer';
  });
  const [detail, setDetail] = useState(null);
  // 주소로 받은 탭은 첫 조회까지만 유효하다 (아래 search 참고)
  const urlTabUsed = useRef(!urlParams.get('tab'));

  // 담은 것. 각 칸은 하나씩만 담는다.
  // 이제 이 화면의 state 가 아니라 전역 장바구니다. 찾기 탭에서 담고
  // 여기로 넘어와도 그대로 남아 있어야 하기 때문이다.
  const {
    items: cart,
    setItems: setCartRaw,
    anchor: cartAnchor,
    setAnchor: setCartAnchor,
    count: cartCount,
  } = useCart();

  // 담은 게 있으면 목록을 접고 구성부터 보여준다.
  //
  // 찾기 탭에서 고르고 온 고객에게 목록을 다시 펼쳐 보이면, 방금 담은 게
  // 화면 구석의 사이드바로 밀린다. 지금 확인해야 할 건 '무엇을 담았나'
  // 이지 '또 뭐가 있나' 가 아니다. 더 담고 싶으면 그때 펼친다.
  const [showList, setShowList] = useState(false);
  const listOpen = cartCount === 0 || showList;
  // 조건 입력칸도 같은 이유로 접는다
  const [showAnchor, setShowAnchor] = useState(false);

  // 자체 의상이 주인과 함께 빠졌을 때 그 사실을 알린다.
  // 말없이 사라지면 고객은 자기가 뭘 잘못 눌렀는지 모른다.
  const [dropNotice, setDropNotice] = useState(null);

  const setCart = useCallback(
    (next) =>
      setCartRaw((c) => {
        const wanted = typeof next === 'function' ? next(c) : next;
        const fixed = normalizeCart(wanted);
        if (wanted.dress && !fixed.dress) {
          const owner = wanted.dress.__ownerName;
          setDropNotice(
            `${owner ? `${owner} 님이 ` : ''}가져오기로 한 의상이라 함께 빠졌습니다 — ${wanted.dress.name}`
          );
        }
        return fixed;
      }),
    [setCartRaw]
  );

  // 작가를 담을 때 고를 패키지 후보
  const [pkgChoice, setPkgChoice] = useState(null); // { artist, packages[] }
  // 확인·결제 화면은 아직 없다. 없는 곳으로 보내면 404 가 뜨고
  // 고객은 자기가 뭘 잘못했는지 모른다. 상태를 말해준다.
  const [notReady, setNotReady] = useState(false);
  // 담은 헤메의 자체 의상 (그 사람을 골라야 받을 수 있다)
  const [stylistDresses, setStylistDresses] = useState([]);
  // 담은 작가의 자체 헤메·의상.
  // available_providers 는 앵커만 보므로 여기에 없다 —
  // 작가를 골라야 비로소 선택지가 된다.
  const [artistHmk, setArtistHmk] = useState([]);
  const [artistDresses, setArtistDresses] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getActiveLocations();
      if (!cancelled) setLocations(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 담은 헤메가 바뀌면 그 사람의 의상을 가져온다 (FIX_33)
  useEffect(() => {
    let cancelled = false;
    const sid = cart.stylist?.stylistId;
    if (!sid || !cart.stylist?.dressSelf) {
      setStylistDresses([]);
      return undefined;
    }
    (async () => {
      const { data, error: e } = await getStylistDresses(sid);
      if (cancelled) return;
      if (e) {
        setStylistDresses([]);
        return;
      }
      setStylistDresses(
        (data || []).map((d) => ({
          ...d,
          __fromStylist: cart.stylist.name,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [cart.stylist?.stylistId, cart.stylist?.dressSelf, cart.stylist?.name]);

  // 담은 작가가 바뀌면 그 사람의 자체 헤메·의상을 가져온다.
  //
  // 예전에는 이게 없어서 반쪽이었다 — 헤메의 자체 의상은 붙는데
  // 작가의 자체 헤메·의상은 아무 데도 안 나왔다.
  useEffect(() => {
    let cancelled = false;
    const a = cart.photographer;
    if (!a?.id) {
      setArtistHmk([]);
      setArtistDresses([]);
      return undefined;
    }

    (async () => {
      const jobs = [];
      jobs.push(a.hmkSelf ? getPackages(a.id, 'hmk') : Promise.resolve({ data: [] }));
      jobs.push(a.dressSelf ? getPackages(a.id, 'costume') : Promise.resolve({ data: [] }));
      const [hmkRes, dressRes] = await Promise.all(jobs);
      if (cancelled) return;

      // 자체 헤메는 시술 시점 정보가 없다(packages 에는 그 칸이 없다).
      // 예약 화면과 같은 기본값을 쓴다 — 촬영 전 완료, 60분, 이동 30분.
      setArtistHmk(
        (hmkRes.data || []).map((h) => ({
          service_id: `self-hmk:${h.id}`,
          stylist_id: a.id,
          name_ko: a.name,
          service_name: h.name,
          price: h.price,
          timing: 'before',
          duration_minutes: 60,
          offset_minutes: 30,
          max_hours: null,
          specialty: '작가 자체 헤어메이크업',
          portfolio_images: [],
          __fromArtist: a.name,
        }))
      );

      setArtistDresses(
        (dressRes.data || []).map((d) => ({
          id: d.id,
          name_ko: d.name,
          price: d.price,
          sizes: d.sizes || [],
          size_stock: null,
          images: d.images || [],
          description: d.description,
          category: d.category,
          __fromArtist: a.name,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [
    cart.photographer?.id,
    cart.photographer?.hmkSelf,
    cart.photographer?.dressSelf,
    cart.photographer?.name,
  ]);

  const canSearch = date && time && !loading;

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    // 조건이 바뀌면 담아둔 건 무효다. 남겨두면 "가능하지 않은 조합" 이 된다.
    // 판단은 장바구니가 한다 — 같은 조건으로 다시 조회하면 담은 건 그대로 두고,
    // 조건이 달라졌을 때만 비운다. (찾기 탭에서 담고 여기로 넘어온 경우가 전자다)
    setCartAnchor({ locationId: locationId || null, date, time, hours });
    setDropNotice(null);
    const { data, error: e } = await getAvailableProviders({
      locationId: locationId || null,
      date,
      time,
      hours,
    });
    setLoading(false);
    setSearched(true);
    if (e) {
      setError(e.message || '조회에 실패했습니다.');
      setResult(null);
      return;
    }
    setResult(data);
    // 조회하면 작가 탭으로 돌아간다 — 작가를 고르면 선택지가 늘어나니까.
    // 다만 찾기 페이지에서 '의상' 을 보다 넘어온 첫 조회는 예외다.
    // 그때까지 보던 걸 빼앗으면 왜 화면이 바뀌었는지 알 수 없다.
    if (urlTabUsed.current) setTab('photographer');
    urlTabUsed.current = true;
  }, [locationId, date, time, hours, setCartAnchor]);

  // 찾기 페이지에서 조건을 들고 넘어왔으면 바로 조회한다.
  //
  // 예전에는 주소의 date·time 을 입력칸에만 채워 넣고 조회는 하지 않았다.
  // 고객 입장에서는 '이 조건으로 예약 구성하기' 를 눌렀는데 똑같은 조건
  // 입력 화면이 다시 뜨는 셈이라, 버튼이 아무 일도 안 한 것처럼 보였다.
  // 한 번만 자동으로 돌린다 — 그 뒤 조건 변경은 고객 몫이다.
  //
  // 주소에 조건이 없으면 담아둔 장바구니의 조건을 되살린다.
  // 찾기 탭에서 담고 나중에 '예약하기' 로 들어온 고객에게, 방금 담은 걸
  // 두고 조건부터 다시 입력하라고 하면 장바구니를 둔 의미가 없다.
  const autoSearched = useRef(false);
  const restored = useRef(false);

  useEffect(() => {
    if (autoSearched.current || restored.current) return;
    if (urlParams.get('date') && urlParams.get('time')) return; // 주소가 우선
    if (!cartAnchor?.date || !cartAnchor?.time) return;
    restored.current = true;
    setLocationId(cartAnchor.locationId || '');
    setDate(cartAnchor.date);
    setTime(cartAnchor.time);
    setHours([2, 3, 4, 8].includes(Number(cartAnchor.hours)) ? Number(cartAnchor.hours) : 2);
  }, [cartAnchor, urlParams]);

  useEffect(() => {
    if (autoSearched.current) return;
    const fromUrl = !!(urlParams.get('date') && urlParams.get('time'));
    const fromCart = restored.current && !!date && !!time;
    if (!fromUrl && !fromCart) return;
    autoSearched.current = true;
    search();
  }, [search, urlParams, date, time]);

  // ── 담기 ──
  const pick = (key, value) => setCart((c) => ({ ...c, [key]: value }));
  const drop = (key) => setCart((c) => ({ ...c, [key]: null }));

  const pickPhotographer = async (a) => {
    if (cart.photographer?.id === a.id) {
      drop('photographer');
      return;
    }
    // 그 길이의 패키지를 골라야 한다. 여러 개일 수 있다.
    const { data } = await getPackages(a.id, 'snap');
    const fits = (data || []).filter((k) => Number(k.duration_hours ?? 2) === Number(hours));
    if (fits.length === 1) {
      pick('photographer', {
        id: a.id,
        name: a.name_ko || a.name,
        locationIds: a.location_ids || [],
        pkg: fits[0],
        hmkSelf: a.hmk_self === true,
        dressSelf: a.dress_self === true,
      });
    } else {
      setPkgChoice({ artist: a, packages: fits });
    }
  };

  // 무엇이든 하나는 담아야 진행할 수 있다.
  const hasAny = !!(cart.photographer || cart.stylist || cart.dress || cart.venue);

  const total = useMemo(
    () =>
      (cart.photographer?.pkg?.price || 0) +
      (cart.stylist?.price || 0) +
      (cart.dress?.price || 0) +
      (cart.venue?.price || 0),
    [cart]
  );

  // 보증금.
  //
  // 주인이 현장에 들고 오는 의상(byOwner)은 받지 않는다 — 옷이 주인
  // 손을 떠나지 않기 때문이다. 헤메가 자기 옷을 입혀주는 경우가 그렇다.
  // 같은 옷이라도 고객이 픽업하거나 배송받으면 받는다.
  const deposit = useMemo(() => {
    const d = cart.dress;
    if (!d) return 0;
    const byOwner = !!(d.ownerStylistId || d.artistId);
    return byOwner ? 0 : d.deposit || 0;
  }, [cart.dress]);

  // 담은 것들의 활동 지역이 서로 맞는가 (전 지역으로 볼 때 실제로 일한다)
  const locMismatch = useMemo(() => locationConflict(cart), [cart]);

  // 의상은 세 곳에서 온다 — 벤더 · 담은 헤메 · 담은 작가.
  // 고객 입장에서는 그날 현장에 오는 사람이 가진 옷이 전부 선택지다.
  const allDresses = useMemo(
    () =>
      [...(result?.dresses || []), ...stylistDresses, ...artistDresses].filter(
        (d, i, arr) => arr.findIndex((x) => x.id === d.id) === i
      ),
    [result, stylistDresses, artistDresses]
  );

  // 헤메도 두 곳 — 독립 헤메 · 담은 작가의 자체 헤메
  const allStylists = useMemo(
    () => [...(result?.stylists || []), ...artistHmk],
    [result, artistHmk]
  );

  // ── 목록 ──
  const list =
    {
      photographer: result?.photographers || [],
      stylist: allStylists,
      dress: allDresses,
      venue: result?.venues || [],
    }[tab] || [];

  // ── 찾기 탭에서 '담기' 로 넘어온 항목을 담는다 ──
  //
  // 찾기는 항목을 베껴 보내지 않고 id 만 넘긴다(?pick=). 두 목록이 같은
  // 것을 다른 모양으로 주기 때문이다. 여기서 **방금 조회한 가용 목록**
  // 에서 그 id 를 찾아 담으면 모양도 맞고, 그 시간에 안 되는 것은 애초에
  // 목록에 없으니 가용성도 저절로 검증된다.
  //
  // 못 찾으면 조용히 넘어가지 않는다. 고객은 담기를 눌렀으므로,
  // 안 담겼으면 왜 안 담겼는지 알아야 한다.
  const picked = useRef(false);
  const [pickMiss, setPickMiss] = useState(null);
  useEffect(() => {
    if (picked.current || !result) return;
    const id = urlParams.get('pick');
    if (!id) return;
    picked.current = true;

    const k = urlParams.get('tab');
    if (k === 'stylist') {
      const s = allStylists.find((x) => String(x.service_id) === id);
      if (!s) return setPickMiss('그 시술은 이 시간에 가능하지 않습니다.');
      return pick('stylist', {
        locationIds: s.location_ids || [],
        stylistId: s.stylist_id,
        serviceId: s.service_id,
        name: s.name_ko,
        service: s.service_name,
        price: s.price,
        timing: s.timing,
        durationMinutes: s.duration_minutes,
        offsetMinutes: s.offset_minutes,
        dressSelf: s.dress_self,
      });
    }
    if (k === 'dress') {
      const d = allDresses.find((x) => String(x.id) === id);
      if (!d) return setPickMiss('그 의상은 이 시간에 대여할 수 없습니다.');
      return pick('dress', {
        locationIds: d.location_ids || [],
        deposit: d.deposit || 0,
        fulfillment: d.fulfillment || [],
        deliveryFee: d.delivery_fee || 0,
        id: d.id,
        name: d.name_ko,
        price: d.price,
        size: (d.sizes || [])[0] || null,
        stylistId: d.stylist_id || null,
        vendorId: d.vendor_id || null,
        artistId: null,
        ownerStylistId: null,
      });
    }
    if (k === 'venue') {
      const v = (result.venues || []).find((x) => String(x.id) === id);
      if (!v) return setPickMiss('그 장소는 이 시간에 예약할 수 없습니다.');
      return pick('venue', { id: v.id, name: v.name, price: v.price, vendorId: v.vendor_id, locationIds: v.location_ids || [] });
    }
    if (k === 'photographer') {
      const a = (result.photographers || []).find((x) => String(x.id) === id);
      if (!a) return setPickMiss('그 작가는 이 시간에 예약할 수 없습니다.');
      return pickPhotographer(a);
    }
    return undefined;
  }, [result, urlParams, allStylists, allDresses]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-enter" style={{ paddingTop: 92 }}>
      <div className="section" style={{ maxWidth: 1200 }}>
        {/* ══════════ 앵커 ══════════
            담은 게 있으면 접는다. 조건은 이미 정해졌고, 지금 확인할 건
            무엇을 담았는지다. 조건 줄(아래 '2026-10-15 · 14:00 ~ …')에
            요약이 있으니 바꾸고 싶으면 '조건 바꾸기' 로 다시 편다. */}
        {cartCount > 0 && !showAnchor && (
          <button
            type="button"
            onClick={() => setShowAnchor(true)}
            style={{
              marginBottom: 20,
              padding: '9px 16px',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 12.5,
              fontFamily: 'inherit',
            }}
          >
            조건 바꾸기
          </button>
        )}
        <div
          style={{
            display: cartCount > 0 && !showAnchor ? 'none' : 'block',
            border: '1px solid var(--gold-border)',
            background: 'var(--gold-dim)',
            padding: '24px 26px',
            marginBottom: 28,
            position: 'relative',
          }}
        >
          <Corners />
          <div className="section-label" style={{ marginBottom: 6 }}>
            STEP 01
          </div>
          <h1
            className="section-title"
            style={{ fontSize: 'clamp(19px, 3vw, 26px)', marginBottom: 6 }}
          >
            언제, 어디서 촬영하시나요?
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
            시간이 정해져야 그 시간에 가능한 작가·헤메·의상·장소를 보여드릴 수 있습니다. 정한 뒤에는
            순서 없이 자유롭게 고르시면 됩니다.
          </p>

          <div style={{ display: 'grid', gap: 16 }}>
            {/* 지역 */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                지역
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill active={locationId === ''} onClick={() => setLocationId('')}>
                  전체
                </Pill>
                {locations.map((id) => (
                  <Pill key={id} active={locationId === id} onClick={() => setLocationId(id)}>
                    {locationLabel(id, lang)}
                  </Pill>
                ))}
                {locations.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    등록된 작가가 있는 지역이 아직 없습니다.
                  </span>
                )}
              </div>
            </div>

            {/* 날짜 */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                날짜
              </div>
              <input
                type="date"
                value={date}
                min={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '10px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-serif)',
                  colorScheme: 'light',
                }}
              />
            </div>

            {/* 시각 */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                시작 시각
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TIME_OPTIONS.map((t) => (
                  <Pill key={t} active={time === t} onClick={() => setTime(t)}>
                    {t}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 길이 */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                촬영 길이
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {HOUR_OPTIONS.map((o) => (
                  <Pill key={o.hours} active={hours === o.hours} onClick={() => setHours(o.hours)}>
                    {o.label}
                  </Pill>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={search}
            disabled={!canSearch}
            style={{
              marginTop: 22,
              padding: '13px 34px',
              border: 'none',
              background: canSearch ? 'var(--gold)' : 'var(--border)',
              color: canSearch ? 'var(--on-accent)' : 'var(--muted)',
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              letterSpacing: '0.1em',
              cursor: canSearch ? 'pointer' : 'default',
            }}
          >
            {loading ? '찾는 중…' : '이 조건으로 찾기'}
          </button>
        </div>

        {/* ══════════ 결과 ══════════ */}
        {error && (
          <div
            style={{
              border: '1px solid #e85d5d',
              background: 'var(--bg2)',
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: 13,
              color: 'var(--danger)',
            }}
          >
            {error}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              목록이 비어 보이는 것과 다릅니다. 못 불러온 것이니 다시 시도해주세요.
            </div>
          </div>
        )}

        {result && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                {date} · {hhmm(result.shootStart)} ~ {hhmm(result.shootEnd)}
                {/* 지역을 원시 id 로 내보내고 있었다 — 'seoul' 이 그대로 찍혔다 */}
                {locationId ? ` · ${locationLabel(locationId, lang)}` : ' · 전 지역'}
              </div>

              {/* 담은 게 있는데 목록이 접혀 있으면, 더 고를 수 있다는 걸 알려준다 */}
              {cartCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowList((v) => !v)}
                  style={{
                    padding: '9px 16px',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                  }}
                >
                  {listOpen ? '목록 접기' : '+ 더 담기'}
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: listOpen ? 'minmax(0,1fr) 300px' : 'minmax(0,1fr)',
                gap: 24,
                alignItems: 'start',
              }}
              className="compose-layout"
            >
              <div style={{ display: listOpen ? 'block' : 'none' }}>
                {/* 탭 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                  {TABS.map((t) => {
                    const n = {
                      photographer: result.photographers?.length || 0,
                      stylist: allStylists.length,
                      dress: allDresses.length,
                      venue: result.venues?.length || 0,
                    }[t.key];
                    return (
                      <Pill key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                        {t.label} {n}
                        {cart[t.key] ? ' ✓' : ''}
                      </Pill>
                    );
                  })}
                </div>

                {/* 목록 */}
                {list.length === 0 ? (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 13,
                      lineHeight: 1.9,
                    }}
                  >
                    이 조건에 가능한 {TABS.find((t) => t.key === tab)?.label}가 없습니다.
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                      {tab === 'photographer'
                        ? '촬영 길이나 시각을 바꿔보세요. 그 길이의 상품을 파는 작가만 표시됩니다.'
                        : '없어도 예약할 수 있습니다. 다른 항목으로 넘어가세요.'}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {tab === 'photographer' &&
                      list.map((a) => (
                        <Card
                          key={a.id}
                          title={a.name_ko || a.name}
                          subtitle={`${a.artist_type === 'both' ? '사진 · 영상' : a.artist_type === 'videographer' ? '영상' : '사진'}${a.location_id ? ` · ${a.location_id}` : ''}`}
                          note={
                            [a.hmk_self && '자체 헤메', a.dress_self && '자체 의상']
                              .filter(Boolean)
                              .join(' · ') || null
                          }
                          price={a.price_from}
                          image={a.portfolio?.[0]?.url || a.img || null}
                          picked={cart.photographer?.id === a.id}
                          onDetail={() => setDetail({ kind: 'photographer', data: a })}
                          onToggle={() => pickPhotographer(a)}
                        />
                      ))}

                    {tab === 'stylist' &&
                      list.map((s) => (
                        <Card
                          key={s.service_id}
                          title={s.service_name}
                          subtitle={`${s.name_ko} · ${s.specialty || ''}`}
                          note={
                            s.__fromArtist
                              ? `${s.__fromArtist} 작가님이 직접 진행`
                              : `${hhmm(s.busy_from)} ~ ${hhmm(s.busy_to)} 묶임`
                          }
                          price={s.price}
                          image={s.portfolio_images?.[0] || null}
                          picked={cart.stylist?.serviceId === s.service_id}
                          onDetail={() => setDetail({ kind: 'service', data: s })}
                          onToggle={() =>
                            cart.stylist?.serviceId === s.service_id
                              ? drop('stylist')
                              : pick('stylist', {
                                  locationIds: s.location_ids || [],
                stylistId: s.stylist_id,
                                  serviceId: s.service_id,
                                  name: s.name_ko,
                                  service: s.service_name,
                                  price: s.price,
                                  timing: s.timing,
                                  durationMinutes: s.duration_minutes,
                                  offsetMinutes: s.offset_minutes,
                                  dressSelf: s.dress_self,
                                })
                          }
                        />
                      ))}

                    {tab === 'dress' &&
                      list.map((d) => (
                        <Card
                          key={d.id}
                          title={d.name_ko}
                          subtitle={`${(d.sizes || []).join(', ')}${d.color ? ` · ${d.color}` : ''}`}
                          note={
                            d.__fromStylist
                              ? `${d.__fromStylist} 님이 가져오심`
                              : d.__fromArtist
                                ? `${d.__fromArtist} 작가님 보유`
                                : d.vendor_name || null
                          }
                          price={d.price}
                          image={d.image_url || d.images?.[0]?.url || d.images?.[0] || null}
                          picked={cart.dress?.id === d.id}
                          onDetail={() =>
                            setDetail({
                              kind: 'dress',
                              data: d,
                              ownerNote: d.__fromStylist
                                ? `${d.__fromStylist} 님이 직접 가져오십니다`
                                : d.__fromArtist
                                  ? `${d.__fromArtist} 작가님이 보유한 의상입니다`
                                  : null,
                            })
                          }
                          onToggle={() =>
                            cart.dress?.id === d.id
                              ? drop('dress')
                              : pick('dress', {
                                  locationIds: d.location_ids || [],
                                  deposit: d.deposit || 0,
                                  fulfillment: d.fulfillment || [],
                                  deliveryFee: d.delivery_fee || 0,
                                  id: d.id,
                                  name: d.name_ko,
                                  price: d.price,
                                  size: (d.sizes || [])[0] || null,
                                  stylistId: d.stylist_id || null,
                                  vendorId: d.vendor_id || null,
                                  // 작가 자체 의상이면 정산 대상이 작가 본인이다
                                  artistId: d.__fromArtist ? cart.photographer?.id : null,
                                  // 주인이 장바구니에서 빠지면 이 옷도 같이 빠져야 한다.
                                  // normalize() 가 이 두 칸을 본다.
                                  ownerStylistId: d.__fromStylist
                                    ? d.stylist_id || cart.stylist?.stylistId
                                    : null,
                                  __ownerName: d.__fromStylist || d.__fromArtist || null,
                                })
                          }
                        />
                      ))}

                    {tab === 'venue' &&
                      list.map((v) => (
                        <Card
                          key={v.id}
                          title={v.name}
                          subtitle={`${v.capacity ? `${v.capacity}명` : ''}${v.vendor_name ? ` · ${v.vendor_name}` : ''}`}
                          price={v.price}
                          image={v.images?.[0]?.url || v.images?.[0] || null}
                          picked={cart.venue?.id === v.id}
                          onDetail={() => setDetail({ kind: 'venue', data: v })}
                          onToggle={() =>
                            cart.venue?.id === v.id
                              ? drop('venue')
                              : pick('venue', {
                                  locationIds: v.location_ids || [],
                                  id: v.id,
                                  name: v.name,
                                  price: v.price,
                                  vendorId: v.vendor_id,
                                })
                          }
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* ══════════ 담은 목록 ══════════ */}
              <div
                style={{
                  border: '1px solid var(--gold-border)',
                  background: 'var(--bg2)',
                  padding: '20px 22px',
                  position: 'sticky',
                  top: 100,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    letterSpacing: '0.2em',
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    marginBottom: 16,
                  }}
                >
                  담은 구성
                </div>

                {/* 찾기에서 담기를 눌렀는데 그 시간에 안 되는 경우.
                    아무 말 없이 빈 장바구니를 보여주면 고객은 버튼이
                    고장난 줄 안다. */}
                {pickMiss && (
                  <div
                    style={{
                      border: '1px solid var(--danger)',
                      background: 'var(--bg)',
                      padding: '10px 12px',
                      marginBottom: 14,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: 'var(--text)',
                    }}
                  >
                    {pickMiss}
                    <button
                      type="button"
                      onClick={() => setPickMiss(null)}
                      style={{
                        display: 'block',
                        marginTop: 6,
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        fontSize: 11,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      닫기
                    </button>
                  </div>
                )}

                {dropNotice && (
                  <div
                    style={{
                      border: '1px solid var(--gold-border)',
                      background: 'var(--bg)',
                      padding: '10px 12px',
                      marginBottom: 14,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: 'var(--muted)',
                    }}
                  >
                    {dropNotice}
                    <button
                      type="button"
                      onClick={() => setDropNotice(null)}
                      style={{
                        display: 'block',
                        marginTop: 6,
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        color: 'var(--gold)',
                        fontSize: 11,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      확인
                    </button>
                  </div>
                )}

                {TABS.map((t) => {
                  const v = cart[t.key];
                  return (
                    <div
                      key={t.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ color: 'var(--muted)', flexShrink: 0 }}>{t.label}</div>
                      <div style={{ textAlign: 'right', flex: 1 }}>
                        {v ? (
                          <>
                            <div>{v.name || v.service || '—'}</div>
                            {t.key === 'photographer' && v.pkg && (
                              <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                                {v.pkg.name}
                              </div>
                            )}
                            {t.key === 'stylist' && (
                              <div style={{ color: 'var(--muted)', fontSize: 11 }}>{v.service}</div>
                            )}
                            <div style={{ color: 'var(--gold)', fontSize: 12 }}>
                              {fmt(t.key === 'photographer' ? v.pkg?.price : v.price)}
                            </div>
                            <button
                              type="button"
                              onClick={() => drop(t.key)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--muted)',
                                fontSize: 11,
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              빼기
                            </button>
                          </>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>없이 진행</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '16px 0 18px',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>합계</span>
                  <span style={{ fontSize: 19, color: 'var(--gold)' }}>{fmt(total)}</span>
                </div>

                {/* 보증금은 합계와 따로 적는다. 돌려받는 돈이라 촬영값과
                    성격이 다르다 — 섞어 적으면 더 비싸 보인다. */}
                {deposit > 0 && (
                  <div
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '0 0 14px', fontSize: 12, color: 'var(--muted)',
                    }}
                  >
                    <span>보증금 (반환)</span>
                    <span>{fmt(deposit)}</span>
                  </div>
                )}

                {/* 지역이 서로 안 맞으면 결제로 보내지 않는다.
                    서울 헤메와 부산 장소를 한 촬영에 부를 수는 없다. */}
                {locMismatch && (
                  <div
                    style={{
                      border: '1px solid var(--danger)', background: 'var(--bg)',
                      padding: '10px 12px', marginBottom: 12,
                      fontSize: 11.5, lineHeight: 1.7, color: 'var(--text)',
                    }}
                  >
                    담은 것들의 활동 지역이 서로 맞지 않습니다. 한 촬영에
                    서로 다른 지역의 사람과 장소를 부를 수는 없습니다.
                    하나를 빼거나 지역을 정해 다시 찾아보세요.
                  </div>
                )}

                <button
                  type="button"
                  disabled={!hasAny || locMismatch}
                  onClick={() => setNotReady(true)}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    border: 'none',
                    background: hasAny ? 'var(--gold)' : 'var(--border)',
                    color: hasAny ? 'var(--on-accent)' : 'var(--muted)',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    cursor: hasAny ? 'pointer' : 'default',
                  }}
                >
                  예약 확인으로
                </button>
                {!hasAny && (
                  <div
                    style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}
                  >
                    하나 이상 담아주세요. 작가 없이 헤어메이크업·의상·장소만 예약하셔도 됩니다.
                  </div>
                )}
                {hasAny && !cart.photographer && (
                  <div
                    style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}
                  >
                    작가 없이 진행합니다. 작가를 담으면 그 작가의 자체 헤어메이크업·의상도 선택지에
                    추가됩니다.
                  </div>
                )}
                {notReady && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      fontSize: 11.5,
                      lineHeight: 1.7,
                      border: '1px solid var(--accent-a30)',
                      background: 'var(--accent-a06)',
                      color: 'var(--text)',
                    }}
                  >
                    확인·결제 화면은 아직 준비 중입니다. 지금은 구성까지만 확인해주세요.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!result && searched && !error && (
          <div
            style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}
          >
            조건에 맞는 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 패키지 선택 — 같은 길이 상품이 여럿일 때 */}
      {pkgChoice && (
        <div
          onClick={() => setPkgChoice(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--gold-border)',
              padding: '28px 30px',
              maxWidth: 520,
              width: '100%',
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 6 }}>
              {pkgChoice.artist.name_ko || pkgChoice.artist.name} · 패키지 선택
            </div>
            {pkgChoice.packages.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginTop: 12 }}>
                {hours}시간짜리 상품을 찾지 못했습니다. 목록에는 떴는데 상품이 없다면 데이터가
                어긋난 것이니 알려주세요.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {pkgChoice.packages.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      pick('photographer', {
                        id: pkgChoice.artist.id,
                        name: pkgChoice.artist.name_ko || pkgChoice.artist.name,
                        pkg: k,
                        hmkSelf: pkgChoice.artist.hmk_self === true,
                        dressSelf: pkgChoice.artist.dress_self === true,
                      });
                      setPkgChoice(null);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: 'var(--bg2)',
                      color: 'var(--text)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5 }}>{k.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                      {fmt(k.price)}
                    </div>
                    {k.description && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--muted)',
                          marginTop: 6,
                          lineHeight: 1.6,
                        }}
                      >
                        {k.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {detail && (
        <ProviderDetailModal
          kind={detail.kind}
          data={detail.data}
          ownerNote={detail.ownerNote}
          onClose={() => setDetail(null)}
        />
      )}

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          .compose-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default BookCompose;
