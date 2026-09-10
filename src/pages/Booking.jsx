import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import StylistCard from '../components/StylistCard';
import DressCard from '../components/DressCard';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { PHOTOGRAPHERS, fmt } from '../data/photographers';
import { LOCATIONS_DOMESTIC, LOCATIONS_OVERSEAS } from '../data/locations';

// 지역 id → 다국어 이름 (location_names 가 비어 있는 작가용 폴백)
const BOOKING_LOCATION_NAMES = [...LOCATIONS_DOMESTIC, ...LOCATIONS_OVERSEAS]
  .reduce((acc, l) => { acc[l.id] = l.nameI18n || { ko: l.name, en: l.nameEn }; return acc; }, {});

import { getMergedProfile } from '../data/artistProfile';
import { getStylistsByLocation, fmtStylist } from '../data/stylists';
import { getDressesByVendor, getDressesByCategory } from '../data/dresses';
import { getVendorsByLocation, getVendorById } from '../data/dressVendors';
import { getVenueVendorsByLocation, getVenueItemsByVendor, getVenueItemById } from '../data/venueVendors';
import { getTagLabel } from '../data/tagRegistry';
import { loadTossPayments, generateOrderId } from '../lib/payment';
import { getAvailableSlots, getAvailableSlotsForDuration, getDateStatus, initSchedules, buildSlotData } from '../data/schedules';
import WeatherGoldenHour from '../components/WeatherGoldenHour';
import PopularityIndicator from '../components/PopularityIndicator';

// ─── Booking Page ──────────────────────────────────────────────────────

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDay   = (year, month) => new Date(year, month, 1).getDay();

// ─── Location to Coordinates Mapping ───────────────────────────────────
const LOCATION_COORDS = {
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Osaka': { lat: 34.6937, lng: 135.5023 },
  'Jeju': { lat: 33.4996, lng: 126.5312 },
  'Busan': { lat: 35.1796, lng: 129.0756 },
};
// Default to Seoul if not found
const getLocationCoords = (location) => {
  return LOCATION_COORDS[location] || { lat: 37.5665, lng: 126.9780 };
};

// ─── 결제 직전 고객 안내 체크리스트 ────────────────────────────────────
const PRE_PAYMENT_NOTICE = {
  ko: {
    title:   '결제 전 꼭 확인해주세요',
    sub:     'Phosnap은 고객님과 작가님의 소중한 순간을 함께 만들어갑니다.\n결제 전 아래 사항을 확인하고 동의해주세요.',
    items: [
      '작가님과 촬영 장소, 컨셉, 복장 등에 대해 충분히 소통하였습니다.',
      '위험하거나 안전하지 못한 상황 발생 시 Phosnap에 즉시 연락하겠습니다.',
      '작가님도 사람이기에 작은 실수에 너그럽게 대해주시고, 끝까지 좋은 매너를 지켜주실 것을 부탁드립니다.',
      '환불 정책을 확인하였으며, 예약 취소 시 해당 정책이 적용됨에 동의합니다.',
    ],
    pending: '⚠ 결제 후 작가님의 확정이 필요합니다. 작가님이 48시간 이내 수락하면 예약이 최종 확정됩니다.',
    confirm: '모두 확인했습니다 — 결제하기',
    close:   '다시 확인하기',
  },
  en: {
    title:   'Please read before payment',
    sub:     'Phosnap is here to help create your most beautiful moments.\nPlease confirm the following before proceeding.',
    items: [
      'I have communicated with the artist about the location, concept, and styling.',
      'I will contact Phosnap immediately if an unsafe situation arises.',
      'I will treat the artist with respect and understanding, even if small mistakes happen.',
      'I have reviewed the cancellation policy and agree to its terms.',
    ],
    pending: '⚠ After payment, the artist needs to confirm. Your booking is fully confirmed once the artist accepts within 48 hours.',
    confirm: 'All confirmed — Proceed to Payment',
    close:   'Review again',
  },
  ja: {
    title:   'お支払い前にご確認ください',
    sub:     'Phosnapは大切な瞬間をともに作り上げます。\n以下の事項をご確認ください。',
    items: [
      '撮影場所・コンセプト・スタイリングについて作家と十分に話し合いました。',
      '危険または安全でない状況が発生した場合、すぐにPhosnapに連絡します。',
      '作家も人間ですので、小さなミスには寛大に、最後まで礼儀正しく接することを約束します。',
      'キャンセルポリシーを確認し、適用に同意します。',
    ],
    pending: '⚠ お支払い後、作家の確認が必要です。48時間以内に作家が承認すると予約が確定します。',
    confirm: 'すべて確認しました — お支払いへ',
    close:   '再確認する',
  },
  zh: {
    title:   '支付前请确认',
    sub:     'Phosnap将与您共同创造最美好的瞬间。\n请在支付前确认以下事项。',
    items: [
      '我已与摄影师充分沟通了拍摄地点、风格和着装。',
      '如发生危险或不安全情况，我将立即联系Phosnap。',
      '摄影师也是人，我将宽容对待小失误，并始终保持良好礼仪。',
      '我已阅读退款政策，并同意相关条款。',
    ],
    pending: '⚠ 支付后需要摄影师确认。摄影师在48小时内接受后，预约将最终确认。',
    confirm: '全部确认 — 前往支付',
    close:   '重新确认',
  },
};

// ─── H&M 추천 안내 카드 ─────────────────────────────────────────────────
const HMK_GUIDE = {
  ko: {
    badge:  'H&M 추천 안내',
    title:  '메이크업 아티스트와 함께하면\n더 특별한 순간이 됩니다',
    items: [
      { icon: '👘', label: '한복 · 기모노', desc: '전통 의상 메이크업은 전문 아티스트가 큰 차이를 만들어요.' },
      { icon: '💍', label: '웨딩 · 허니문', desc: '일생에 한 번, 최고의 컨디션으로 촬영하고 싶다면.' },
      { icon: '🌅', desc: '야외 로케이션은 햇빛·바람에 강한 전문 메이크업이 필요해요.', label: '야외 로케이션' },
    ],
    note: '* 헤어메이크업은 선택 사항입니다. 원하지 않으시면 다음 단계로 넘어가세요.',
  },
  en: {
    badge:  'H&M Recommendation',
    title:  'A makeup artist can make\nyour moment truly unforgettable',
    items: [
      { icon: '👘', label: 'Hanbok · Kimono', desc: 'Traditional attire calls for a specialist who knows the look.' },
      { icon: '💍', label: 'Wedding · Honeymoon', desc: 'For the most important shoot of your life, look your absolute best.' },
      { icon: '🌅', label: 'Outdoor Locations', desc: 'Sun and wind require professional-grade makeup that lasts.' },
    ],
    note: '* Hair & makeup is optional. Feel free to skip to the next step.',
  },
  ja: {
    badge:  'ヘアメイク おすすめ',
    title:  'メイクアップアーティストと一緒に\n忘れられない瞬間を',
    items: [
      { icon: '👘', label: '韓服 · 着物', desc: '伝統衣装には、専門のアーティストが大きな違いをもたらします。' },
      { icon: '💍', label: 'ウェディング · ハネムーン', desc: '一生に一度の撮影は、最高のコンディションで。' },
      { icon: '🌅', label: '屋外ロケーション', desc: '日差しや風に負けない、プロ仕様のメイクが必要です。' },
    ],
    note: '※ ヘアメイクはオプションです。不要な場合は次のステップへお進みください。',
  },
  zh: {
    badge:  '发型化妆推荐',
    title:  '与化妆师合作\n让您的瞬间更加特别',
    items: [
      { icon: '👘', label: '韩服 · 和服', desc: '传统服装造型需要专业化妆师来呈现最佳效果。' },
      { icon: '💍', label: '婚礼 · 蜜月', desc: '人生中最重要的拍摄，值得以最佳状态出现。' },
      { icon: '🌅', label: '户外拍摄', desc: '阳光和风需要专业持久的妆容。' },
    ],
    note: '* 发型化妆为可选项，如不需要可直接进入下一步。',
  },
};

const HmkGuideCard = ({ lang }) => {
  const g = HMK_GUIDE[lang] ?? HMK_GUIDE['ko'];
  return (
    <div style={{
      border: '1px solid var(--gold-border)',
      background: 'linear-gradient(160deg, var(--gold-dim) 0%, var(--bg2) 100%)',
      padding: '28px 24px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 모서리 장식 */}
      {[['top:8px;left:8px', 'borderTop:1px solid var(--gold-border);borderLeft:1px solid var(--gold-border)'],
        ['top:8px;right:8px', 'borderTop:1px solid var(--gold-border);borderRight:1px solid var(--gold-border)'],
        ['bottom:8px;left:8px', 'borderBottom:1px solid var(--gold-border);borderLeft:1px solid var(--gold-border)'],
        ['bottom:8px;right:8px', 'borderBottom:1px solid var(--gold-border);borderRight:1px solid var(--gold-border)'],
      ].map(([pos, border], i) => {
        const style = { position: 'absolute', width: 10, height: 10 };
        pos.split(';').forEach(p => { const [k,v] = p.split(':'); style[k] = v; });
        border.split(';').forEach(b => { const [k,v] = b.split(':'); style[k] = v; });
        return <div key={i} style={style} />;
      })}

      {/* 배지 */}
      <div style={{
        display: 'inline-block', alignSelf: 'flex-start',
        padding: '3px 10px', marginBottom: 16,
        background: 'rgba(232,160,32,0.15)', border: '1px solid rgba(232,160,32,0.4)',
        fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        {g.badge}
      </div>

      {/* 제목 */}
      <h3 style={{
        fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.04em',
        color: 'var(--text)', lineHeight: 1.7, marginBottom: 24,
        whiteSpace: 'pre-line',
      }}>
        {g.title}
      </h3>

      {/* 추천 시나리오 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, marginBottom: 20 }}>
        {g.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.06em', marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 구분선 + 노트 */}
      <div style={{ paddingTop: 14, borderTop: '1px solid rgba(232,160,32,0.2)' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic', fontFamily: 'var(--font-elegant)' }}>
          {g.note}
        </p>
      </div>
    </div>
  );
};

// 체크리스트 모달 컴포넌트
const PrePaymentModal = ({ lang, onConfirm, onClose }) => {
  const n = PRE_PAYMENT_NOTICE[lang] ?? PRE_PAYMENT_NOTICE['ko'];
  const [checked, setChecked] = useState(Array(n.items.length).fill(false));
  const allChecked = checked.every(Boolean);

  const toggle = (i) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--gold-border)',
        maxWidth: 520, width: '100%', padding: '40px 36px',
        position: 'relative', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* 모서리 장식 */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderTop: '1px solid var(--gold-border)', borderLeft: '1px solid var(--gold-border)' }} />
        <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: '1px solid var(--gold-border)', borderRight: '1px solid var(--gold-border)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, borderBottom: '1px solid var(--gold-border)', borderLeft: '1px solid var(--gold-border)' }} />
        <div style={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, borderBottom: '1px solid var(--gold-border)', borderRight: '1px solid var(--gold-border)' }} />

        {/* 헤더 */}
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
          Phosnap
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.05em', marginBottom: 12, color: 'var(--text)' }}>
          {n.title}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 28, fontFamily: 'var(--font-elegant)', fontStyle: 'italic' }}>
          {n.sub}
        </p>

        {/* 체크리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {n.items.map((item, i) => (
            <label key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
              <div
                onClick={() => toggle(i)}
                style={{
                  width: 20, height: 20, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${checked[i] ? 'var(--gold)' : 'var(--border)'}`,
                  background: checked[i] ? 'var(--gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
              >
                {checked[i] && <span style={{ color: '#0B0B0B', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span
                onClick={() => toggle(i)}
                style={{ fontSize: 13, color: checked[i] ? 'var(--text)' : 'var(--muted)', lineHeight: 1.7, transition: 'color 0.2s' }}
              >
                {item}
              </span>
            </label>
          ))}
        </div>

        {/* 작가 확정 안내 */}
        <div style={{
          padding: '14px 16px', marginBottom: 24,
          background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.25)',
          fontSize: 12, color: 'var(--gold)', lineHeight: 1.7,
          fontFamily: 'var(--font-serif)',
        }}>
          {n.pending}
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn-primary"
            style={{ flex: 1, opacity: allChecked ? 1 : 0.4, cursor: allChecked ? 'pointer' : 'not-allowed' }}
            onClick={allChecked ? onConfirm : undefined}
            disabled={!allChecked}
          >
            {n.confirm}
          </button>
          <button className="btn-outline" onClick={onClose}>
            {n.close}
          </button>
        </div>
      </div>
    </div>
  );
};

const ARTIST_BLOCK_MSG = {
  ko: { title: '작가 계정은 예약할 수 없습니다', desc: '고객 계정으로 로그인하시거나, 다른 브라우저에서 고객 계정을 이용해주세요.', btn: '작가 대시보드로 이동' },
  en: { title: 'Artist accounts cannot make bookings', desc: 'Please log in with a customer account or use a different browser.', btn: 'Go to Artist Dashboard' },
  ja: { title: '作家アカウントでは予約できません', desc: 'お客様アカウントでログインするか、別のブラウザをご利用ください。', btn: '作家ダッシュボードへ' },
  zh: { title: '摄影师账号无法预约', desc: '请使用客户账号登录，或在其他浏览器中使用客户账号。', btn: '前往摄影师控制台' },
};

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { userName, userRole } = useAuth();

  // 실제 가입 작가는 UUID 를 쓰므로 Number(id) 로는 mock 배열에서 절대
  // 찾을 수 없다(NaN). Supabase 에서 먼저 조회하고, 없을 때만 mock 을 쓴다.
  const [dbPhotographer, setDbPhotographer] = useState(null);
  const [artistLoading, setArtistLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setArtistLoading(true);
      try {
        const { fetchPhotographer } = await import('../lib/supabase');
        const { data } = await fetchPhotographer(id);
        if (!cancelled && data) setDbPhotographer(data);
      } catch (_) { /* mock 폴백 */ }
      if (!cancelled) setArtistLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const pMock = PHOTOGRAPHERS.find(ph => ph.id === Number(id));
  const p = dbPhotographer || getMergedProfile(pMock, 'photographer', Number(id));

  // ── 작가/사진작가 role은 예약 불가 ──
  // (아래 early return 들은 모든 훅 선언 이후로 옮겨져 있어야 한다)
  const isArtistRole = userRole === 'artist' || userRole === 'photographer';


  const [step, setStep]                 = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);  // ← 추가
  const [selectedPkg,  setSelectedPkg]  = useState(null);
  const [selectedStylist, setSelectedStylist] = useState(null);
  const [selectedStylistSvc, setSelectedStylistSvc] = useState(null);
  const [selectedDress, setSelectedDress] = useState(null);     // dress item ID
  const [selectedDressSize, setSelectedDressSize] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);  // venue item ID
  const [selectedVenueVendor, setSelectedVenueVendor] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]); // DB에서 이미 예약된 슬롯
  const [bookedDressInfo, setBookedDressInfo] = useState([]); // 선택된 날짜에 이미 예약된 의상
  const [dbStylists, setDbStylists] = useState(null);
  // 작가 스케줄(Supabase). data/schedules 는 localStorage 전용이라
  // 고객 브라우저에서는 작가의 운영 시간을 알 수 없다.
  const [dbDaySchedule, setDbDaySchedule] = useState(null);   // { slots, blocked, dayOff }
  const [dbDefaultSlots, setDbDefaultSlots] = useState(null); // string[]
  const [dbMonthSchedule, setDbMonthSchedule] = useState(null); // { 'YYYY-MM-DD': row }
  const [dbDresses, setDbDresses] = useState(null);
  const [dbVenues, setDbVenues] = useState(null);

  // 스케줄 초기화 (localStorage mock 데이터 시딩)
  useEffect(() => { initSchedules(); }, []);

  // 작가의 기본 운영 시간(artist_defaults)을 Supabase 에서 가져온다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!p?.id) return;
      try {
        const { getDefaultSlots } = await import('../lib/supabase');
        const { data } = await getDefaultSlots(p.id);
        if (!cancelled) setDbDefaultSlots(data?.default_slots || null);
      } catch (_) { /* 연결 실패 시 localStorage 폴백 */ }
    })();
    return () => { cancelled = true; };
  }, [p?.id]);


  // Supabase에서 stylists과 dresses 로드
  useEffect(() => {
    const loadDbData = async () => {
      try {
        const { getStylists, getDressItems, getVenueVendors, getVenueItems } = await import('../lib/supabase');

        // Load stylists from DB
        const { data: stylistsData } = await getStylists(p?.locationId);
        if (stylistsData && stylistsData.length > 0) {
          const mapped = stylistsData.map(s => ({
            id: s.id,
            name: s.name_en || s.name_ko,
            nameKo: s.name_ko,
            img: s.portfolio_images?.[0] || '/default-stylist.jpg',
            specialty: s.specialty || 'both',
            location: s.location_id || '',
            price: 0,
            services: (s.stylist_services || []).map(svc => ({
              name: svc.name_ko,
              nameEn: svc.name_en,
              price: svc.price,
              duration: svc.duration_minutes,
              description: svc.description,
            })),
            rating: s.rating || 0,
            reviews: s.review_count || 0,
            // StylistCard 가 기대하는 필드. 없으면 slice/map 에서 크래시한다.
            tags:      s.specialty ? [s.specialty] : [],
            languages: s.languages || ['KO'],
            portfolio: s.portfolio_images || [],
          }));
          setDbStylists(mapped);
        }

        // Load dresses from DB
        const { data: dressData } = await getDressItems({ locationId: p?.locationId });
        if (dressData && dressData.length > 0) {
          const mapped = dressData.map(d => ({
            id: d.id,
            vendorId: d.vendor_id,
            name: d.name_ko,
            nameEn: d.name_en,
            nameI18n: { ko: d.name_ko, en: d.name_en, ja: d.name_ja, zh: d.name_zh },
            category: d.category,
            price: d.price,
            image: d.image_url || '/default-dress.jpg',
            color: d.color,
            sizes: d.sizes || [],
            description: d.description,
          }));
          setDbDresses(mapped);
        }

        // Load venues from DB (mock venueVendors 폴백을 대체)
        const { data: vendors } = await getVenueVendors();
        if (vendors && vendors.length > 0) {
          const lists = await Promise.all(
            vendors.map(async v => {
              const { data: items } = await getVenueItems(v.id);
              return (items || []).map(item => ({ ...item, vendor: v }));
            })
          );
          setDbVenues(lists.flat());
        } else {
          setDbVenues([]);
        }
      } catch (err) {
        // silently handled
      }
    };
    if (p) loadDbData();
  }, [p?.id]);

  // 날짜 변경 시 시간 선택 초기화 + 예약 충돌 체크
  const handleDateSelect = async (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setBookedSlots([]);
    setBookedDressInfo([]);
    setDbDaySchedule(null);

    // 해당 날짜의 작가 운영/차단 시간 조회 (artist_schedules)
    try {
      const { getScheduleMonth } = await import('../lib/supabase');
      const [y, m] = dateStr.split('-').map(Number);
      const { data } = await getScheduleMonth(p.id, y, m);
      const row = (data || []).find(d => d.date === dateStr);
      if (row) {
        setDbDaySchedule({
          slots:   row.slots?.length ? row.slots : null,
          blocked: row.blocked || [],
          dayOff:  !!row.day_off,
        });
      } else {
        // 날짜별 레코드가 없으면 기본 운영 시간으로 열려 있는 것으로 본다
        // (작가 대시보드도 같은 규칙으로 표시한다)
        setDbDaySchedule({ slots: null, blocked: [], dayOff: false });
      }
    } catch (_) { /* localStorage 폴백 */ }
    // Supabase에서 해당 날짜의 예약된 시간 조회
    try {
      const { getBookedSlots } = await import('../lib/supabase');
      const { data } = await getBookedSlots(p.id, dateStr);
      if (data?.length) {
        setBookedSlots(data.map(d => d.time));
      }
    } catch (_) { /* localStorage 전용 모드 */ }

    // 해당 날짜에 예약된 의상 조회
    try {
      const { getBookedDresses } = await import('../lib/supabase');
      const { data: bookedDresses } = await getBookedDresses(dateStr);
      if (bookedDresses) {
        setBookedDressInfo(bookedDresses);
      }
    } catch (_) { /* DB 오류 무시 */ }
  };

  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // 훅은 early return 보다 앞에 있어야 한다. 아래 세 개는 원래
  // `if (!p) return null;` 뒤에 있어, 작가를 찾지 못한 경우 훅 개수가
  // 달라져 React 가 깨지는 상태였다.
  const [payLoading, setPayLoading]           = useState(false);
  const [payError, setPayError]               = useState('');
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // 달력에 표시할 월 단위 스케줄을 Supabase 에서 가져온다.
  // getDateStatus 는 localStorage 를 읽어 고객 화면에서는 모든 날짜가
  // '휴무'로 보이던 문제를 막는다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!p?.id) return;
      try {
        const { getScheduleMonth } = await import('../lib/supabase');
        const { data } = await getScheduleMonth(p.id, calYear, calMonth + 1);
        if (cancelled) return;
        const map = {};
        (data || []).forEach(row => { map[row.date] = row; });
        setDbMonthSchedule(map);
      } catch (_) { /* localStorage 폴백 */ }
    })();
    return () => { cancelled = true; };
  }, [p?.id, calYear, calMonth]);

  /**
   * 달력 셀의 예약 상태를 판정한다.
   * 날짜별 레코드가 없으면 기본 운영 시간으로 열려 있는 것으로 본다
   * (작가 대시보드와 동일한 규칙).
   */
  const resolveDateStatus = (dateStr) => {
    if (!dbMonthSchedule || !dbDefaultSlots) {
      return getDateStatus('photographer', p.id, dateStr);
    }
    const row = dbMonthSchedule[dateStr];
    if (!row) return dbDefaultSlots.length ? 'open' : 'off';
    if (row.day_off) return 'off';
    const slots = row.slots?.length ? row.slots : dbDefaultSlots;
    if (!slots.length) return 'off';
    const blocked = row.blocked || [];
    const avail = slots.filter(sl => !blocked.includes(sl));
    if (avail.length === 0) return 'full';
    return blocked.length > 0 ? 'partial' : 'open';
  };

  if (isArtistRole) {
    const msg = ARTIST_BLOCK_MSG[lang] || ARTIST_BLOCK_MSG['ko'];
    return (
      <div className="page-enter" style={{ paddingTop: 120, textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '0.05em', marginBottom: 12 }}>{msg.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 32 }}>{msg.desc}</p>
          <button className="btn-primary" onClick={() => navigate('/artist/dashboard')}>
            {msg.btn}
          </button>
        </div>
      </div>
    );
  }

  // DB 조회 중에는 빈 화면 대신 로딩을 보여준다.
  // (예전에는 mock 에서 못 찾으면 곧장 null 을 반환해 흰 화면이 됐다)
  if (artistLoading) {
    return (
      <div style={{ paddingTop: 140, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }

  if (!p) {
    return (
      <div className="page-enter" style={{ paddingTop: 140, textAlign: 'center', minHeight: '50vh' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 10 }}>
          작가를 찾을 수 없습니다
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          삭제되었거나 주소가 잘못되었을 수 있습니다.
        </p>
        <button className="btn-outline" onClick={() => navigate('/photographers')}>작가 목록으로</button>
      </div>
    );
  }

  // DB 가 유일한 출처다. 예전에는 dbStylists 가 비면 mock 스타일리스트
  // 5명(교토·도쿄·부산 등 지역 무관)이 노출되어, 존재하지 않는 사람을
  // 예약에 포함시킬 수 있었다.
  const availableStylists = dbStylists || [];

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);


  const isPast = (day) => {
    const d = new Date(calYear, calMonth, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const pkgData        = p.packages.find(pk => pk.name === selectedPkg);
  const stylistData    = availableStylists.find(s => s.id === selectedStylist);
  const stylistSvcData = stylistData?.services?.find(sv => sv.name === selectedStylistSvc);

  // 의상 관련 데이터
  const dressVendor = p.dressVendorId ? getVendorById(p.dressVendorId) : null;
  // 작가 본인 보유 의상(photographers.dresses)은 실제 데이터이므로 유지하고,
  // 벤더 의상은 DB 조회 결과만 사용한다 (mock 벤더 폴백 제거).
  const availableDresses = p.dressSelf
    ? (p.dresses || [])
    : (dbDresses || []);
  const selectedDressData = availableDresses.find(d => d.id === selectedDress);
  const dressPrice = selectedDressData?.price || 0;

  // Helper to check if a dress size is booked for the selected date
  const isDressSizeBooked = (dressName, size) => {
    return bookedDressInfo.some(b =>
      b.dress_name === dressName && b.dress_size === size
    );
  };

  // Venue data
  // 장소도 DB 에서 조회한다 (mock venueVendors 폴백 제거).
  const allVenueItems = dbVenues || [];
  const selectedVenueData = allVenueItems.find(v => v.id === selectedVenue);
  const venuePrice = selectedVenueData?.price || 0;

  // 가격이 문자열("250000")로 들어오는 경로가 있어 그대로 더하면 문자열
  // 연결이 일어나 금액이 1000배가 된다. 반드시 숫자로 정규화한 뒤 더한다.
  const toAmount = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };
  const totalPrice     = toAmount(pkgData?.price) + toAmount(stylistSvcData?.price)
                       + toAmount(dressPrice) + toAmount(venuePrice);

  const STEPS = [
    t('booking.selectDate'),
    t('booking.selectPackage'),
    t('booking.hmkStep'),
    t('booking.dressStep') || '의상 선택',
    t('booking.venueStep') || '장소 선택',
    t('booking.confirm'),
  ];

  const DAYS   = t('booking.days');
  const MONTHS = t('booking.months');

  // 이름: 언어별
  const artistName = lang === 'ko' && p.nameKo ? p.nameKo : p.name;
  const locationLabel =
    p.locationNames?.[lang]
    ?? BOOKING_LOCATION_NAMES[p.location]?.[lang]
    ?? BOOKING_LOCATION_NAMES[p.location]?.ko
    ?? p.location;

  const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

  const handleConfirm = async () => {
    setPayLoading(true);
    setPayError('');
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const orderId   = generateOrderId();
      const orderName = `[Phosnap] ${artistName} · ${selectedPkg}`;

      await tossPayments.requestPayment('카드', {
        amount:       totalPrice,
        orderId,
        orderName,
        customerName: userName || '',
        successUrl:   `${window.location.origin}/booking/success?orderId=${orderId}&amount=${totalPrice}&artist=${encodeURIComponent(artistName)}&artistId=${p.id}&date=${selectedDate}&time=${encodeURIComponent(selectedTime || '')}&pkg=${encodeURIComponent(selectedPkg)}&pkgPrice=${pkgData?.price || 0}&stylistPrice=${stylistSvcData?.price || 0}&stylistName=${encodeURIComponent(stylistData?.name || '')}&stylistSvc=${encodeURIComponent(selectedStylistSvc || '')}&dressName=${encodeURIComponent(selectedDressData?.nameI18n?.[lang] || selectedDressData?.name || '')}&dressSize=${encodeURIComponent(selectedDressSize || '')}&dressPrice=${dressPrice}&venueName=${encodeURIComponent(selectedVenueData?.nameI18n?.[lang] || selectedVenueData?.name || '')}&venuePrice=${venuePrice}`,
        failUrl:      `${window.location.origin}/booking/fail`,
      });
      // requestPayment 는 리다이렉트이므로 아래 코드 실행 안 됨
    } catch (err) {
      // 사용자가 취소하면 err.code === 'USER_CANCEL'
      if (err?.code !== 'USER_CANCEL') {
        setPayError(err?.message || t('booking.payError'));
      }
      setPayLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftIcon /> {t('booking.backBtn')}
        </button>

        {/* ── Progress bar ── */}
        <div className="booking-progress">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="booking-progress-step"
              style={{
                color: step === i + 1 ? 'var(--gold)' : step > i + 1 ? 'rgba(232,160,32,0.5)' : 'var(--muted)',
                borderBottom: step === i + 1 ? '2px solid var(--gold)' : '2px solid transparent',
                cursor: step > i + 1 ? 'pointer' : 'default',
              }}
              onClick={() => step > i + 1 && setStep(i + 1)}
            >
              {String(i + 1).padStart(2, '0')}
              <span className="booking-progress-step-label"> · {s}</span>
            </div>
          ))}
        </div>

        <div className="booking-layout">

          {/* ── Left: step content ── */}
          <div>

            {/* ─ Step 1: Calendar ─ */}
            {step === 1 && (
              <div>
                <div className="section-label">Step 01</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 32 }}>
                  {t('booking.step1Title')}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <button className="btn-ghost" onClick={() => {
                    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                    else setCalMonth(m => m - 1);
                  }}>{t('booking.calPrev')}</button>
                  <span style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
                    {calYear} {Array.isArray(MONTHS) ? MONTHS[calMonth] : `${calMonth + 1}월`}
                  </span>
                  <button className="btn-ghost" onClick={() => {
                    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                    else setCalMonth(m => m + 1);
                  }}>{t('booking.calNext')}</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 32 }}>
                  {(Array.isArray(DAYS) ? DAYS : ['일','월','화','수','목','금','토']).map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: '8px 0', fontFamily: 'var(--font-serif)' }}>
                      {d}
                    </div>
                  ))}
                  {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                  {Array(daysInMonth).fill(null).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const past     = isPast(day);
                    const selected = selectedDate === dateStr;
                    const status   = past ? 'past' : resolveDateStatus(dateStr);
                    // status: 'open' | 'partial' | 'full' | 'off' | 'past'
                    const isOff    = status === 'off';
                    const isFull   = status === 'full';

                    return (
                      <button
                        key={day}
                        disabled={past || isOff || isFull}
                        onClick={() => !past && !isOff && !isFull && handleDateSelect(dateStr)}
                        style={{
                          position: 'relative',
                          padding: '10px 0 14px', textAlign: 'center', fontSize: 13,
                          background: selected ? 'var(--gold)' : 'transparent',
                          color: (past || isOff || isFull) ? 'rgba(136,136,136,0.3)' : selected ? '#0B0B0B' : 'var(--text)',
                          border: '1px solid', borderColor: selected ? 'var(--gold)' : 'transparent',
                          cursor: (past || isOff || isFull) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s', fontFamily: 'var(--font-serif)',
                          textDecoration: isOff ? 'line-through' : 'none',
                        }}
                      >
                        {day}
                        {/* 날짜 상태 도트 */}
                        {!past && (
                          <span style={{
                            position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                            width: 4, height: 4, borderRadius: '50%',
                            background: selected
                              ? '#0B0B0B'
                              : status === 'open'    ? '#22c55e'
                              : status === 'partial' ? '#f0ac2a'
                              : status === 'full'    ? '#e85d5d'
                              : 'transparent',
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ─ 달력 범례 ─ */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                  {[
                    { color: '#22c55e',  label: t('booking.slotOpen')    },
                    { color: '#f0ac2a',  label: t('booking.slotPartial') },
                    { color: '#e85d5d',  label: t('booking.slotFull')   },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* ─ Weather & Golden Hour Info ─ */}
                {selectedDate && p?.location && (() => {
                  const coords = getLocationCoords(p.location);
                  return (
                    <WeatherGoldenHour
                      date={selectedDate}
                      latitude={coords.lat}
                      longitude={coords.lng}
                      locationName={p.location || ''}
                    />
                  );
                })()}

                {/* ─ Popularity Indicator ─ */}
                {selectedDate && (
                  <PopularityIndicator bookings={[]} targetDate={selectedDate} compact={false} />
                )}

                <button
                  className="btn-primary"
                  disabled={!selectedDate}
                  style={{ opacity: selectedDate ? 1 : 0.4 }}
                  onClick={() => selectedDate && setStep(2)}
                >
                  {t('booking.nextStep')}
                </button>
              </div>
            )}

            {/* ─ Step 2: Package ─ */}
            {step === 2 && (
              <div>
                <div className="section-label">Step 02</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 32 }}>
                  {t('booking.step2Title')}
                </h2>
                <div className="packages">
                  {p.packages.map(pkg => (
                    <div
                      key={pkg.name}
                      className={`package ${pkg.popular ? 'recommended' : ''} ${selectedPkg === pkg.name ? 'selected' : ''}`}
                      onClick={() => { setSelectedPkg(pkg.name); setSelectedTime(null); }}
                    >
                      <Corners />
                      <div className="package-name">{pkg.name}</div>
                      <div className="package-price">₩{fmt(pkg.price)}<span>/ session</span></div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {pkg.hours}{t('profile.hours')} · {pkg.photos}{t('profile.photos')}
                      </div>
                      <div className="package-desc">{pkg.descI18n?.[lang] ?? pkg.desc}</div>
                    </div>
                  ))}
                </div>

                {/* ─ 시간 슬롯 선택 (패키지 선택 후) ─ */}
                {selectedPkg && selectedDate && (() => {
                  const pkgHours = p.packages.find(pk => pk.name === selectedPkg)?.hours || 1;
                  // DB 스케줄이 있으면 그것을 우선 사용한다.
                  // (data/schedules 는 localStorage 전용이라 고객 화면에서는
                  //  작가의 운영 시간을 전혀 알 수 없다)
                  const dbSlots = dbDaySchedule
                    ? (dbDaySchedule.dayOff
                        ? []
                        : (dbDaySchedule.slots || dbDefaultSlots || []))
                    : null;
                  const rawSlotData = dbSlots
                    ? buildSlotData(dbSlots, dbDaySchedule.blocked || [], pkgHours)
                    : getAvailableSlotsForDuration('photographer', p.id, selectedDate, pkgHours);
                  // 예약 충돌 체크: DB에서 이미 예약된 슬롯 비활성화
                  const slotData = rawSlotData.map(s => {
                    if (s.available && bookedSlots.includes(s.time)) {
                      return { ...s, available: false, reason: 'already_booked' };
                    }
                    return s;
                  });
                  const availSlots = slotData.filter(s => s.available);
                  const unavailSlots = slotData.filter(s => !s.available);

                  return (
                    <div style={{ marginTop: 32, border: '1px solid var(--gold-border)', padding: 24, background: 'rgba(232,160,32,0.03)', position: 'relative' }}>
                      <Corners />
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8 }}>
                        {selectedDate} — {t('booking.selectTime') || '시간 선택'}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
                        {pkgHours > 1
                          ? `${selectedPkg} (${pkgHours}시간) 기준으로 예약 가능한 시간대입니다. 선택한 시간부터 ${pkgHours}시간 연속으로 사용됩니다.`
                          : `${selectedPkg} (${pkgHours}시간) 기준 예약 가능 시간대입니다.`
                        }
                      </p>

                      {slotData.length === 0 ? (
                        <div style={{ padding: '20px 24px', border: '1px solid var(--border)', background: 'var(--bg2)', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                          {t('booking.noSlots') || '예약 가능한 시간이 없습니다'}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                          {slotData.map(({ time, available, reason }) => {
                            const isSelected = selectedTime === time;
                            const endHour = parseInt(time.split(':')[0]) + pkgHours;
                            const endTime = `${String(endHour).padStart(2, '0')}:00`;
                            return (
                              <button
                                key={time}
                                disabled={!available}
                                onClick={() => available && setSelectedTime(isSelected ? null : time)}
                                style={{
                                  padding: '10px 6px', textAlign: 'center',
                                  fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.03em',
                                  background: isSelected ? 'var(--gold)' : !available ? 'rgba(136,136,136,0.08)' : 'var(--bg2)',
                                  color: isSelected ? '#0B0B0B' : !available ? 'rgba(136,136,136,0.35)' : 'var(--text)',
                                  border: `1px solid ${isSelected ? 'var(--gold)' : !available ? 'rgba(136,136,136,0.15)' : 'var(--border)'}`,
                                  cursor: !available ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  textDecoration: !available ? 'line-through' : 'none',
                                  position: 'relative',
                                }}
                              >
                                <div>{time}</div>
                                {pkgHours > 1 && (
                                  <div style={{ fontSize: 9, color: isSelected ? 'rgba(11,11,11,0.6)' : 'var(--muted)', marginTop: 2 }}>
                                    ~{endTime}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 범례 */}
                      {unavailSlots.length > 0 && (
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
                          <span style={{ textDecoration: 'line-through', marginRight: 4 }}>취소선</span> = 다른 예약과 겹치거나 운영 시간 밖
                        </div>
                      )}

                      {selectedTime && pkgHours > 1 && (
                        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 12, color: '#4ade80', lineHeight: 1.6 }}>
                          ✓ {selectedTime} ~ {String(parseInt(selectedTime.split(':')[0]) + pkgHours).padStart(2, '0')}:00 ({pkgHours}시간) 예약됩니다
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                  <button className="btn-outline" onClick={() => setStep(1)}>{t('booking.prev')}</button>
                  <button
                    className="btn-primary"
                    disabled={!selectedPkg || !selectedTime}
                    style={{ opacity: (selectedPkg && selectedTime) ? 1 : 0.4 }}
                    onClick={() => selectedPkg && selectedTime && setStep(3)}
                  >
                    {t('booking.nextStep')}
                  </button>
                </div>
              </div>
            )}

            {/* ─ Step 3: H&M Stylist ─ */}
            {step === 3 && (
              <div>
                <div className="section-label">Step 03 · {t('booking.step3Optional')}</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('booking.step3Title')}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.8 }}>
                  {t('booking.step3Sub')}
                </p>

                {/* 2-column: 스타일리스트 그리드 + sticky H&M 안내 사이드바 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>

                  {/* ── 메인: 스타일리스트 목록 + 서비스 선택 + 버튼 ── */}
                  <div>
                    {availableStylists.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                        {availableStylists.map(s => (
                          <StylistCard
                            key={s.id}
                            s={s}
                            selected={selectedStylist === s.id}
                            onClick={() => {
                              const nextId = selectedStylist === s.id ? null : s.id;
                              setSelectedStylist(nextId);
                              if (nextId) {
                                const svcList = s.services || [];
                                const popular = svcList.find(sv => sv.popular) || svcList[0];
                                setSelectedStylistSvc(popular?.name || null);
                              } else {
                                setSelectedStylistSvc(null);
                              }
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', marginBottom: 32 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>
                          {t('booking.noStylist')}
                        </div>
                        <div style={{ fontSize: 12 }}>{t('booking.stylistSoon')}</div>
                      </div>
                    )}

                    {selectedStylist && (
                      <div style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', padding: 24, marginBottom: 32, position: 'relative' }}>
                        <Corners />
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>
                          {t('booking.selectService')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                          {availableStylists.find(s => s.id === selectedStylist)?.services.map(svc => {
                            const isSvcSelected = selectedStylistSvc === svc.name;
                            return (
                              <div
                                key={svc.name}
                                onClick={() => setSelectedStylistSvc(svc.name)}
                                style={{
                                  border: `2px solid ${isSvcSelected ? 'var(--gold)' : 'var(--border)'}`,
                                  padding: '16px 20px',
                                  background: isSvcSelected ? 'rgba(232,160,32,0.08)' : 'var(--bg2)',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {svc.popular && (
                                  <div style={{ position: 'absolute', top: -1, right: 12, background: 'var(--gold)', color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 8, fontWeight: 600, letterSpacing: '0.1em', padding: '2px 8px' }}>
                                    POPULAR
                                  </div>
                                )}
                                {isSvcSelected && (
                                  <div style={{ position: 'absolute', top: 10, left: 10, width: 16, height: 16, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#0B0B0B', fontSize: 9, fontWeight: 700 }}>✓</span>
                                  </div>
                                )}
                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.08em', marginBottom: 6, paddingLeft: isSvcSelected ? 20 : 0, transition: 'padding 0.2s' }}>{svc.name}</div>
                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--gold)', marginBottom: 4 }}>₩{fmtStylist(svc.price)}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{svc.descI18n?.[lang] ?? svc.desc}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="btn-outline" onClick={() => setStep(2)}>{t('booking.prev')}</button>
                      <button className="btn-primary" onClick={() => setStep(4)}>
                        {selectedStylist ? t('booking.withStylist') : t('booking.skipStylist')}
                      </button>
                    </div>
                  </div>

                  {/* ── 우측 sticky H&M 추천 안내 사이드바 ── */}
                  <div style={{ position: 'sticky', top: 100 }}>
                    <HmkGuideCard lang={lang} />
                  </div>

                </div>
              </div>
            )}

            {/* ─ Step 4: Dress Selection ─ */}
            {step === 4 && (
              <div>
                <div className="section-label">Step 04 · {t('booking.step4DressOptional') || '선택 사항'}</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('booking.step4DressTitle') || '의상을 선택하세요'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.8 }}>
                  {t('booking.step4DressSub') || '촬영에 어울리는 의상을 선택하거나, 건너뛰어 자체 준비할 수 있습니다.'}
                </p>

                {availableDresses.length > 0 ? (
                  <>
                    {/* 업체 정보 배너 */}
                    {dressVendor && (
                      <div style={{
                        border: '1px solid var(--gold-border)', padding: '16px 20px',
                        background: 'rgba(232,160,32,0.03)', marginBottom: 24,
                        display: 'flex', gap: 16, alignItems: 'center',
                      }}>
                        {dressVendor.img && (
                          <div style={{
                            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                            backgroundImage: `url(${dressVendor.img})`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                          }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', letterSpacing: '0.04em' }}>
                            {dressVendor.nameI18n?.[lang] || dressVendor.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: dressVendor.tags?.length ? 6 : 0 }}>
                            {t('booking.dressPartnerVendor') || '파트너 의상 업체'}
                          </div>
                          {dressVendor.tags?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {dressVendor.tags.slice(0, 5).map(tagId => (
                                <span key={tagId} style={{
                                  padding: '1px 6px', fontSize: '0.65rem',
                                  border: '1px solid rgba(212,175,55,0.3)',
                                  color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                                  letterSpacing: '0.02em',
                                }}>
                                  {getTagLabel(tagId, lang, 'costume')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {p.dressSelf && (
                      <div style={{
                        padding: '12px 16px', marginBottom: 24,
                        background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--gold)',
                        fontSize: 12, color: 'var(--muted)', lineHeight: 1.7,
                      }}>
                        <span style={{ color: 'var(--gold)' }}>✦</span> {t('booking.dressArtistOwned') || '이 작가님은 자체 의상을 보유하고 있습니다.'}
                      </div>
                    )}

                    {/* 의상 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
                      {availableDresses.map(dress => (
                        <DressCard
                          key={dress.id}
                          dress={dress}
                          selected={selectedDress === dress.id}
                          onSelect={(dressId, size) => {
                            if (selectedDress === dressId) {
                              setSelectedDress(null);
                              setSelectedDressSize('');
                            } else {
                              setSelectedDress(dressId);
                              setSelectedDressSize(size || dress.sizes?.[0] || '');
                            }
                          }}
                          bookedSizes={dress.sizes?.filter(size => isDressSizeBooked(dress.name, size)) || []}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', marginBottom: 32 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>
                      {t('booking.noDress') || '이 작가님은 의상 대여를 제공하지 않습니다'}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {t('booking.dressOwn') || '직접 의상을 준비해주세요. 다음 단계로 넘어가세요.'}
                    </div>
                  </div>
                )}

                {/* 선택된 의상 요약 */}
                {selectedDressData && (
                  <div style={{
                    border: '1px solid var(--gold-border)', padding: 20,
                    background: 'var(--gold-dim)', marginBottom: 24,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 4 }}>
                        {t('booking.selectedDress') || '선택된 의상'}
                      </div>
                      <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)' }}>
                        {selectedDressData.nameI18n?.[lang] || selectedDressData.name}
                        {selectedDressSize && <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>({selectedDressSize})</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                      ₩{fmt(dressPrice)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-outline" onClick={() => setStep(3)}>{t('booking.prev')}</button>
                  <button className="btn-primary" onClick={() => setStep(5)}>
                    {selectedDress ? (t('booking.withDress') || '의상 포함하여 다음') : (t('booking.skipDress') || '의상 없이 다음 →')}
                  </button>
                </div>
              </div>
            )}

            {/* ─ Step 5: Venue Selection ─ */}
            {step === 5 && (
              <div>
                <div className="section-label">Step 05 · {t('booking.venueOptional') || '선택 사항'}</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('booking.venueTitle') || '촬영 장소를 선택하세요'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.8 }}>
                  {t('booking.venueSub') || '전문 촬영 장소를 예약하거나, 원하는 야외 장소에서 자유롭게 촬영할 수 있습니다.'}
                </p>

                {allVenueItems.length > 0 ? (
                  <>
                    {/* Group by vendor */}
                    {venueVendors.map(vendor => {
                      const vendorItems = allVenueItems.filter(item => item.vendorId === vendor.id);
                      if (vendorItems.length === 0) return null;
                      return (
                        <div key={vendor.id} style={{ marginBottom: 32 }}>

                          {/* Vendor banner */}
                          <div style={{
                            border: '1px solid var(--gold-border)', padding: '16px 20px',
                            background: 'rgba(232,160,32,0.03)', marginBottom: 16,
                            display: 'flex', gap: 16, alignItems: 'center',
                          }}>
                            {vendor.img && (
                              <div style={{
                                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                backgroundImage: `url(${vendor.img})`,
                                backgroundSize: 'cover', backgroundPosition: 'center',
                              }} />
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', letterSpacing: '0.04em' }}>
                                {vendor.nameI18n?.[lang] || vendor.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                {vendor.locationNames?.[lang] || ''} · {vendor.categories?.map(c => {
                                  const labels = { studio: '스튜디오', traditional_space: '전통 공간', outdoor: '야외', urban: '도심', event_hall: '이벤트홀' };
                                  return labels[c] || c;
                                }).join(', ')}
                              </div>
                            </div>
                          </div>

                          {/* Venue items grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                            {vendorItems.map(venue => (
                              <div
                                key={venue.id}
                                onClick={() => {
                                  if (selectedVenue === venue.id) {
                                    setSelectedVenue(null);
                                    setSelectedVenueVendor(null);
                                  } else {
                                    setSelectedVenue(venue.id);
                                    setSelectedVenueVendor(vendor.id);
                                  }
                                }}
                                style={{
                                  border: selectedVenue === venue.id ? '2px solid var(--gold)' : '1px solid var(--border)',
                                  background: selectedVenue === venue.id ? 'var(--gold-dim)' : 'var(--bg2)',
                                  cursor: 'pointer', padding: 0, overflow: 'hidden',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {/* Venue image */}
                                {venue.images?.[0]?.url && (
                                  <div style={{
                                    width: '100%', height: 160,
                                    backgroundImage: `url(${venue.images[0].url})`,
                                    backgroundSize: 'cover', backgroundPosition: 'center',
                                  }} />
                                )}
                                <div style={{ padding: '16px 20px' }}>
                                  <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)', marginBottom: 4, letterSpacing: '0.03em' }}>
                                    {venue.nameI18n?.[lang] || venue.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
                                    {venue.descI18n?.[lang] || venue.desc || ''}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                      {venue.capacity && `👥 ${venue.capacity}명`}
                                      {venue.amenities?.length > 0 && ` · ${venue.amenities.slice(0, 3).join(', ')}`}
                                    </div>
                                    <div style={{ fontSize: 15, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                                      ₩{fmt(venue.price)}
                                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                        /{venue.priceUnit === 'per_hour' ? 'h' : venue.priceUnit === 'per_day' ? 'day' : 'session'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', marginBottom: 32 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>
                      {t('booking.noVenue') || '이 지역에서 이용 가능한 촬영장소가 없습니다'}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {t('booking.venueOwn') || '원하시는 야외 장소에서 자유롭게 촬영할 수 있습니다.'}
                    </div>
                  </div>
                )}

                {/* Selected venue summary */}
                {selectedVenueData && (
                  <div style={{
                    border: '1px solid var(--gold-border)', padding: 20,
                    background: 'var(--gold-dim)', marginBottom: 24,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 4 }}>
                        {t('booking.selectedVenue') || '선택된 장소'}
                      </div>
                      <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)' }}>
                        {selectedVenueData.nameI18n?.[lang] || selectedVenueData.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                      ₩{fmt(venuePrice)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-outline" onClick={() => setStep(4)}>{t('booking.prev')}</button>
                  <button className="btn-primary" onClick={() => setStep(6)}>
                    {selectedVenue ? (t('booking.withVenue') || '장소 포함하여 다음') : (t('booking.skipVenue') || '장소 없이 다음 →')}
                  </button>
                </div>
              </div>
            )}

            {/* ─ Step 6: Confirm ─ */}
            {step === 6 && (
              <div>
                <div className="section-label">Step 06</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 32 }}>
                  {t('booking.step4Title')}
                </h2>

                <div style={{ border: '1px solid var(--border)', padding: 32, background: 'var(--bg2)', position: 'relative', marginBottom: 24 }}>
                  <Corners />
                  <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
                    {t('booking.sessionInfo')}
                  </div>
                  {[
                    { label: t('booking.labelArtist'),   value: artistName },
                    { label: t('booking.labelLocation'), value: locationLabel },
                    { label: t('booking.labelDate'),     value: selectedDate },
                    { label: t('booking.labelTime'),     value: selectedTime },
                    { label: t('booking.labelPackage'),  value: selectedPkg },
                    { label: t('booking.labelFee'),      value: `₩${fmt(pkgData?.price || 0)}` },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {stylistData ? (
                  <div style={{ border: '1px solid var(--gold-border)', padding: 32, background: 'var(--gold-dim)', position: 'relative', marginBottom: 24 }}>
                    <Corners />
                    <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
                      {t('booking.hmkLabel')}
                    </div>
                    {[
                      { label: t('booking.hmkLabel'),      value: lang === 'ko' && stylistData.nameKo ? stylistData.nameKo : stylistData.name },
                      { label: t('booking.labelLocation'), value: stylistData.location },
                      { label: t('booking.hmkService') || 'Service', value: stylistSvcData ? `${stylistSvcData.name}` : '—' },
                      { label: t('booking.labelFee'),      value: stylistSvcData ? `₩${fmtStylist(stylistSvcData.price)}` : `₩${fmtStylist(stylistData.price)}~` },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(232,160,32,0.2)' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                      </div>
                    ))}
                    <button
                      style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setSelectedStylist(null); setStep(3); }}
                    >
                      {t('booking.hmkChange')}
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', padding: '16px 24px', marginBottom: 24, fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('booking.hmkNone')}</span>
                    <button style={{ fontSize: 11, color: 'var(--gold)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setStep(3)}>
                      {t('booking.hmkAdd')}
                    </button>
                  </div>
                )}

                {selectedDressData ? (
                  <div style={{ border: '1px solid var(--gold-border)', padding: 32, background: 'rgba(232,160,32,0.03)', position: 'relative', marginBottom: 24 }}>
                    <Corners />
                    <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
                      {t('booking.dressLabel') || 'Dress Rental'}
                    </div>
                    {[
                      { label: t('booking.dressLabel') || '의상', value: selectedDressData.nameI18n?.[lang] || selectedDressData.name },
                      { label: 'Size', value: selectedDressSize || '—' },
                      { label: t('booking.labelFee'), value: `₩${fmt(dressPrice)}` },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(232,160,32,0.2)' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                      </div>
                    ))}
                    <button
                      style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setSelectedDress(null); setStep(4); }}
                    >
                      {t('booking.dressChange') || '의상 변경'}
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', padding: '16px 24px', marginBottom: 24, fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('booking.dressNone') || '의상 미선택'}</span>
                    <button style={{ fontSize: 11, color: 'var(--gold)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setStep(4)}>
                      {t('booking.dressAdd') || '의상 추가'}
                    </button>
                  </div>
                )}

                {selectedVenueData ? (
                  <div style={{ border: '1px solid var(--gold-border)', padding: 32, background: 'rgba(232,160,32,0.03)', position: 'relative', marginBottom: 24 }}>
                    <Corners />
                    <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
                      {t('booking.venueLabel') || 'Venue'}
                    </div>
                    {[
                      { label: t('booking.venueLabel') || '장소', value: selectedVenueData.nameI18n?.[lang] || selectedVenueData.name },
                      { label: t('booking.venueCapacity') || '수용인원', value: `${selectedVenueData.capacity || '—'}명` },
                      { label: t('booking.labelFee'), value: `₩${fmt(venuePrice)}` },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(232,160,32,0.2)' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                      </div>
                    ))}
                    <button
                      style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setSelectedVenue(null); setStep(5); }}
                    >
                      {t('booking.venueChange') || '장소 변경'}
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', padding: '16px 24px', marginBottom: 24, fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('booking.venueNone') || '장소 미선택'}</span>
                    <button style={{ fontSize: 11, color: 'var(--gold)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setStep(5)}>
                      {t('booking.venueAdd') || '장소 추가'}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderTop: '1px solid var(--border)', marginBottom: 24 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>{t('booking.totalEst')}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--gold)' }}>₩{fmt(totalPrice)}</span>
                </div>

                {/* 취소 정책 타임라인 (GYG 벤치마킹) */}
                <div style={{ border: '1px solid rgba(232,93,93,0.2)', background: 'rgba(232,93,93,0.02)', padding: '20px 24px', position: 'relative', marginBottom: 24 }}>
                  <Corners />
                  <div style={{ fontSize: 10, color: '#e85d5d', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>🛡️</span>
                    {lang === 'ko' ? '취소 정책' : lang === 'ja' ? 'キャンセルポリシー' : lang === 'zh' ? '取消政策' : 'Cancellation Policy'}
                  </div>

                  {/* 비주얼 타임라인 */}
                  <div style={{ position: 'relative', paddingLeft: 24 }}>
                    {/* 세로 라인 */}
                    <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'linear-gradient(to bottom, #4caf50, #e8a020, #e85d5d)' }} />

                    {[
                      {
                        color: '#4caf50',
                        label: { ko: '7일 전까지', en: '7+ days before', ja: '7日前まで', zh: '7天前' },
                        value: { ko: '100% 환불', en: '100% Refund', ja: '100%返金', zh: '100%退款' },
                        desc: { ko: '전액 환불됩니다', en: 'Full refund', ja: '全額返金されます', zh: '全额退款' },
                      },
                      {
                        color: '#e8a020',
                        label: { ko: '3~6일 전', en: '3-6 days before', ja: '3〜6日前', zh: '3-6天前' },
                        value: { ko: '50% 환불', en: '50% Refund', ja: '50%返金', zh: '50%退款' },
                        desc: { ko: '촬영 비용의 50%가 환불됩니다', en: '50% of the session fee is refunded', ja: '撮影料金の50%が返金されます', zh: '退还50%的拍摄费用' },
                      },
                      {
                        color: '#e85d5d',
                        label: { ko: '2일 이내', en: 'Within 2 days', ja: '2日以内', zh: '2天内' },
                        value: { ko: '환불 불가', en: 'No Refund', ja: '返金不可', zh: '不可退款' },
                        desc: { ko: '촬영일 기준 2일 이내 취소 시 환불이 불가합니다', en: 'No refund for cancellations within 2 days of the session', ja: '撮影日の2日以内のキャンセルは返金不可です', zh: '拍摄日2天内取消不予退款' },
                      },
                    ].map((tier, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: i < 2 ? 16 : 0, position: 'relative' }}>
                        {/* 도트 */}
                        <div style={{
                          position: 'absolute', left: -20, top: 3,
                          width: 12, height: 12, borderRadius: '50%',
                          background: tier.color, border: '2px solid var(--bg)',
                          boxShadow: `0 0 0 2px ${tier.color}40`,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
                              {tier.label[lang] || tier.label.en}
                            </span>
                            <span style={{ fontSize: 12, color: tier.color, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                              {tier.value[lang] || tier.value.en}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
                            {tier.desc[lang] || tier.desc.en}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(232,93,93,0.1)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
                    {lang === 'ko' ? '※ 결제 진행 시 위 취소 정책에 동의하는 것으로 간주됩니다.' :
                     lang === 'ja' ? '※ お支払いを進めると、上記のキャンセルポリシーに同意したものとみなされます。' :
                     lang === 'zh' ? '※ 继续付款即视为同意上述取消政策。' :
                     '※ By proceeding with payment, you agree to the above cancellation policy.'}
                  </div>
                </div>

                {payError && (
                  <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 12, letterSpacing: '0.02em' }}>
                    {payError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-outline" onClick={() => setStep(5)} disabled={payLoading}>{t('booking.prev')}</button>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', opacity: payLoading ? 0.7 : 1 }}
                    onClick={() => setShowNoticeModal(true)}
                    disabled={payLoading}
                  >
                    {payLoading ? t('booking.payLoading') : t('booking.pay')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: summary sidebar ── */}
          <div className="booking-sidebar">
            <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 100 }}>
              <div style={{ aspectRatio: '4/3', backgroundImage: `url(${p.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 10 }}>{t('booking.sidebarArtist')}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.08em', marginBottom: 4 }}>{artistName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{locationLabel}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {p.languages.map(l => <span key={l} className="lang-chip">{l}</span>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>★ {p.rating} · {t('booking.sidebarReviews')} {p.reviews}</div>
              </div>

              {stylistData && (
                <div style={{ padding: 24, borderBottom: '1px solid var(--border)', background: 'var(--gold-dim)' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 10 }}>H&M Stylist</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundImage: `url(${stylistData.img})`, backgroundSize: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 2 }}>{lang === 'ko' && stylistData.nameKo ? stylistData.nameKo : stylistData.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{stylistData.location}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--muted)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 14 }}>{t('booking.sidebarSummary')}</div>
                {selectedDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                    <span style={{ color: 'var(--muted)' }}>{t('booking.sidebarDate')}</span>
                    <span>{selectedDate}</span>
                  </div>
                )}
                {selectedPkg && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                    <span style={{ color: 'var(--muted)' }}>{t('booking.sidebarPackage')}</span>
                    <span>{selectedPkg}</span>
                  </div>
                )}
                {totalPrice > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('booking.sidebarTotal')}</span>
                    <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>₩{fmt(totalPrice)}~</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── Mobile: 하단 고정 예약 요약 바 (900px 이하에서만 표시) ── */}
        <div className="booking-mobile-bar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 2 }}>
                {artistName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedDate && <span>{selectedDate}</span>}
                {selectedPkg && <span> · {selectedPkg}</span>}
                {selectedTime && <span> · {selectedTime}</span>}
              </div>
            </div>
            {totalPrice > 0 && (
              <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)', fontSize: 15, flexShrink: 0, letterSpacing: '0.05em' }}>
                ₩{fmt(totalPrice)}~
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 결제 전 안내 체크리스트 모달 ── */}
      {showNoticeModal && (
        <PrePaymentModal
          lang={lang}
          onConfirm={() => { setShowNoticeModal(false); handleConfirm(); }}
          onClose={() => setShowNoticeModal(false)}
        />
      )}
    </div>
  );
};

export default Booking;
