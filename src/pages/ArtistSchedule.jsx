import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Corners from '../components/Corners';
import CollaboChat from '../components/CollaboChat';
import DatePicker from '../components/DatePicker';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { PHOTOGRAPHERS, SNAP_FILTER_KEYS, SNAP_FILTER_LABELS } from '../data/photographers';
import {
  DEFAULT_TIME_SLOTS,
  getSchedule,
  getDaySchedule,
  toggleSlotBlocked,
  toggleDayOff,
  updateDefaultSlots,
  openDateRange,
  closeDateRange,
  initSchedules,
} from '../data/schedules';
import {
  getProfile,
  saveProfile,
  initProfiles,
  checkInactiveAutoOff,
  recordLogin,
} from '../data/artistProfile';
import {
  getPendingBookings,
  getArtistBookings,
  approveBooking,
  rejectBooking,
  getSupabase,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getScheduleMonth,
  upsertScheduleDate,
  upsertScheduleBatch,
  getDefaultSlots,
  upsertDefaultSlots,
} from '../lib/supabase';
import {
  getInstancesByPhotographer,
  createInstance,
  deleteInstance,
  updateInstanceStatus,
  getActiveBookingCount,
  getStatusLabel,
  getStatusColor,
  getRemainingSlots,
  evaluateDeadlines,
} from '../data/tourBookingStore';
import {
  COLLABO_RULES,
  ARTIST_TYPES,
  ARTIST_TIERS,
  TIER_COLORS,
  COLLABO_MATRIX,
  COLLABO_ROLES,
  PROPOSAL_STATUS,
  isSameTypeCollabo,
  canCollabo,
  getArtistTier,
  getArtistFees,
  getNextTierProgress,
  getRemainingProposals,
  getDailyProposalCount,
  getMonthlySameTypeCount,
  checkCooldown,
  createProposal,
  respondToProposal,
  getSentProposals,
  getReceivedProposals,
  getPendingReceived,
  getNotifications,
  expireOldProposals,
} from '../data/collabo';
import { WORLD_COUNTRIES, WORLD_CITIES } from '../data/worldCities';
import {
  initSalesData,
  getTotalRevenue,
  getTotalNetRevenue,
  getTotalCount,
  getMonthlySales,
  getDateRangeSummary,
  getCurrentMonthSales,
  getLastMonthSales,
  formatMoney,
  formatMoneyFull,
} from '../data/salesData';

// ─── Artist Schedule & Profile Management Dashboard ───────────────────
// 탭: 스케줄 관리 | 활동 지역 | 작가 정보 | 결제 정보 | 예약 요청 | 실적
// MVP: localStorage 기반

// ─── 초기 기본 영업시간 (9~12, 13~18) ────────────────────────────────
const INITIAL_DEFAULT_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

// ─── 국내/해외 지역 데이터 ────────────────────────────────────────────
const DOMESTIC_REGIONS = [
  { id: 'seoul',    ko: '서울',   en: 'Seoul'    },
  { id: 'gyeonggi', ko: '경기',  en: 'Gyeonggi' },
  { id: 'incheon',  ko: '인천',  en: 'Incheon'  },
  { id: 'busan',    ko: '부산',  en: 'Busan'    },
  { id: 'daegu',    ko: '대구',  en: 'Daegu'    },
  { id: 'gwangju',  ko: '광주',  en: 'Gwangju'  },
  { id: 'daejeon',  ko: '대전',  en: 'Daejeon'  },
  { id: 'ulsan',    ko: '울산',  en: 'Ulsan'    },
  { id: 'sejong',   ko: '세종',  en: 'Sejong'   },
  { id: 'gangwon',  ko: '강원',  en: 'Gangwon'  },
  { id: 'chungbuk', ko: '충북',  en: 'Chungbuk' },
  { id: 'chungnam', ko: '충남',  en: 'Chungnam' },
  { id: 'jeonbuk',  ko: '전북',  en: 'Jeonbuk'  },
  { id: 'jeonnam',  ko: '전남',  en: 'Jeonnam'  },
  { id: 'gyeongbuk',ko: '경북',  en: 'Gyeongbuk'},
  { id: 'gyeongnam',ko: '경남',  en: 'Gyeongnam'},
  { id: 'jeju',     ko: '제주',  en: 'Jeju'     },
];

const OVERSEAS_REGIONS = [
  { id: 'tokyo',      ko: '도쿄',    en: 'Tokyo',       country: 'JP' },
  { id: 'kyoto',      ko: '교토',    en: 'Kyoto',       country: 'JP' },
  { id: 'osaka',      ko: '오사카',  en: 'Osaka',       country: 'JP' },
  { id: 'fukuoka',    ko: '후쿠오카',en: 'Fukuoka',     country: 'JP' },
  { id: 'sapporo',    ko: '삿포로',  en: 'Sapporo',     country: 'JP' },
  { id: 'okinawa',    ko: '오키나와',en: 'Okinawa',     country: 'JP' },
  { id: 'paris',      ko: '파리',    en: 'Paris',       country: 'FR' },
  { id: 'nice',       ko: '니스',    en: 'Nice',        country: 'FR' },
  { id: 'lyon',       ko: '리옹',    en: 'Lyon',        country: 'FR' },
  { id: 'barcelona',  ko: '바르셀로나',en: 'Barcelona',  country: 'ES' },
  { id: 'madrid',     ko: '마드리드',en: 'Madrid',      country: 'ES' },
  { id: 'rome',       ko: '로마',    en: 'Rome',        country: 'IT' },
  { id: 'florence',   ko: '피렌체',  en: 'Florence',    country: 'IT' },
  { id: 'venice',     ko: '베네치아',en: 'Venice',      country: 'IT' },
  { id: 'milan',      ko: '밀라노',  en: 'Milan',       country: 'IT' },
  { id: 'santorini',  ko: '산토리니',en: 'Santorini',   country: 'GR' },
  { id: 'athens',     ko: '아테네',  en: 'Athens',      country: 'GR' },
  { id: 'newyork',    ko: '뉴욕',    en: 'New York',    country: 'US' },
  { id: 'la',         ko: '로스앤젤레스',en: 'Los Angeles',country: 'US'},
  { id: 'hawaii',     ko: '하와이',  en: 'Hawaii',      country: 'US' },
  { id: 'sanfrancisco',ko:'샌프란시스코',en:'San Francisco',country:'US'},
  { id: 'london',     ko: '런던',    en: 'London',      country: 'GB' },
  { id: 'edinburgh',  ko: '에든버러',en: 'Edinburgh',   country: 'GB' },
  { id: 'bangkok',    ko: '방콕',    en: 'Bangkok',     country: 'TH' },
  { id: 'chiangmai',  ko: '치앙마이',en: 'Chiang Mai',  country: 'TH' },
  { id: 'phuket',     ko: '푸켓',    en: 'Phuket',      country: 'TH' },
  { id: 'taipei',     ko: '타이페이',en: 'Taipei',      country: 'TW' },
  { id: 'hongkong',   ko: '홍콩',    en: 'Hong Kong',   country: 'HK' },
  { id: 'singapore',  ko: '싱가포르',en: 'Singapore',   country: 'SG' },
  { id: 'sydney',     ko: '시드니',  en: 'Sydney',      country: 'AU' },
  { id: 'melbourne',  ko: '멜버른',  en: 'Melbourne',   country: 'AU' },
  { id: 'bali',       ko: '발리',    en: 'Bali',        country: 'ID' },
  { id: 'prague',     ko: '프라하',  en: 'Prague',      country: 'CZ' },
  { id: 'vienna',     ko: '비엔나',  en: 'Vienna',      country: 'AT' },
  { id: 'zurich',     ko: '취리히',  en: 'Zurich',      country: 'CH' },
  { id: 'interlaken', ko: '인터라켄',en: 'Interlaken',  country: 'CH' },
  { id: 'amsterdam',  ko: '암스테르담',en:'Amsterdam',   country: 'NL' },
  { id: 'lisbon',     ko: '리스본',  en: 'Lisbon',      country: 'PT' },
  { id: 'porto',      ko: '포르투',  en: 'Porto',       country: 'PT' },
  { id: 'berlin',     ko: '베를린',  en: 'Berlin',      country: 'DE' },
  { id: 'munich',     ko: '뮌헨',    en: 'Munich',      country: 'DE' },
  { id: 'dubai',      ko: '두바이',  en: 'Dubai',       country: 'AE' },
  { id: 'istanbul',   ko: '이스탄불',en: 'Istanbul',    country: 'TR' },
  { id: 'cappadocia', ko: '카파도키아',en:'Cappadocia',  country: 'TR' },
  { id: 'danang',     ko: '다낭',    en: 'Da Nang',     country: 'VN' },
  { id: 'hanoi',      ko: '하노이',  en: 'Hanoi',       country: 'VN' },
  { id: 'cebu',       ko: '세부',    en: 'Cebu',        country: 'PH' },
  { id: 'cancun',     ko: '칸쿤',    en: 'Cancun',      country: 'MX' },
  { id: 'budapest',   ko: '부다페스트',en:'Budapest',    country: 'HU' },
  { id: 'dubrovnik',  ko: '두브로브니크',en:'Dubrovnik', country: 'HR' },
  { id: 'maldives',   ko: '몰디브',  en: 'Maldives',    country: 'MV' },
  { id: 'cairo',      ko: '카이로',  en: 'Cairo',       country: 'EG' },
  { id: 'marrakech',  ko: '마라케시',en: 'Marrakech',   country: 'MA' },
  { id: 'beijing',    ko: '베이징',  en: 'Beijing',     country: 'CN' },
  { id: 'shanghai',   ko: '상하이',  en: 'Shanghai',    country: 'CN' },
];

// 국가 정보: WORLD_COUNTRIES (worldCities.js)에서 import — 전세계 ~195개국
const COUNTRIES = WORLD_COUNTRIES;
// 하위호환: COUNTRY_FLAG
const COUNTRY_FLAG = Object.fromEntries(Object.entries(COUNTRIES).map(([k, v]) => [k, v.flag]));

// 나라별 도시 그룹 — WORLD_CITIES 기반 + OVERSEAS_REGIONS 하위호환
const OVERSEAS_BY_COUNTRY = {};
// 먼저 WORLD_CITIES 데이터 로드
Object.entries(WORLD_CITIES).forEach(([code, cities]) => {
  OVERSEAS_BY_COUNTRY[code] = cities.map(c => ({ ...c, country: code }));
});
// 기존 OVERSEAS_REGIONS 중 WORLD_CITIES에 없는 도시 보충
OVERSEAS_REGIONS.forEach(r => {
  if (!OVERSEAS_BY_COUNTRY[r.country]) OVERSEAS_BY_COUNTRY[r.country] = [];
  const existing = OVERSEAS_BY_COUNTRY[r.country];
  if (!existing.find(c => c.id === r.id)) {
    existing.push(r);
  }
});

// ─── 지역 근접성 맵 (메인 국가 기준, 가까운 나라 순서) ──────────────
// 같은 나라 = 자동 최우선, 이 리스트는 "다른 나라" 순서
const PROXIMITY_ORDER = {
  KR: ['JP','TW','HK','CN','TH','SG','ID','AU','US','FR','ES','IT','GR','CZ'],
  JP: ['KR','TW','HK','CN','TH','SG','ID','AU','US','FR','ES','IT','GR','CZ'],
  TW: ['HK','JP','KR','CN','TH','SG','ID','AU','US','FR','ES','IT','GR','CZ'],
  HK: ['TW','CN','JP','KR','TH','SG','ID','AU','US','FR','ES','IT','GR','CZ'],
  TH: ['SG','ID','HK','TW','JP','KR','AU','CN','US','FR','ES','IT','GR','CZ'],
  SG: ['TH','ID','HK','TW','JP','KR','AU','CN','US','FR','ES','IT','GR','CZ'],
  ID: ['SG','TH','AU','HK','TW','JP','KR','CN','US','FR','ES','IT','GR','CZ'],
  AU: ['ID','SG','TH','JP','KR','HK','TW','CN','US','FR','ES','IT','GR','CZ'],
  US: ['FR','ES','IT','GR','CZ','JP','KR','TW','HK','TH','SG','AU','ID','CN'],
  FR: ['ES','IT','GR','CZ','US','JP','KR','TW','HK','TH','SG','AU','ID','CN'],
  ES: ['FR','IT','GR','CZ','US','JP','KR','TW','HK','TH','SG','AU','ID','CN'],
  IT: ['FR','ES','GR','CZ','US','JP','KR','TW','HK','TH','SG','AU','ID','CN'],
  GR: ['IT','FR','ES','CZ','US','JP','KR','TW','HK','TH','SG','AU','ID','CN'],
  CZ: ['FR','IT','ES','GR','US','JP','KR','TW','HK','TH','SG','AU','ID','CN'],
};

// 지역(loc) → 국가코드 반환
const getLocCountry = (loc) => {
  if (loc.locType === 'domestic') return 'KR';
  if (loc.country) return loc.country; // 직접 저장된 국가코드
  if (DOMESTIC_REGIONS.some(r => r.id === loc.regionId)) return 'KR';
  const ovr = OVERSEAS_REGIONS.find(r => r.id === loc.regionId)
    || OVERSEAS_REGIONS.find(r => r.ko === loc.name || r.en === loc.nameEn);
  return ovr?.country || 'ZZ';
};

// ─── Helper to build overseas notice based on language ────────────────
const buildOverseasNotice = (t) => ({
  photographer: {
    title: t('artistSchedule.overseasPhotographer.title'),
    body: [
      t('artistSchedule.overseasPhotographer.line1'),
      t('artistSchedule.overseasPhotographer.line2'),
      t('artistSchedule.overseasPhotographer.line3'),
      t('artistSchedule.overseasPhotographer.line4'),
    ],
    confirm: t('artistSchedule.overseasPhotographer.confirm'),
  },
  hmk: {
    title: t('artistSchedule.overseasHmk.title'),
    body: [
      t('artistSchedule.overseasHmk.line1'),
      t('artistSchedule.overseasHmk.line2'),
      t('artistSchedule.overseasHmk.line3'),
      t('artistSchedule.overseasHmk.line4'),
      t('artistSchedule.overseasHmk.line5'),
    ],
    confirm: t('artistSchedule.overseasHmk.confirm'),
  },
});

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay    = (y, m) => new Date(y, m, 1).getDay();
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
const genId = () => Math.random().toString(36).substring(2, 8);

const STATUS_COLORS = {
  open:    '#22c55e',
  partial: '#f0ac2a',
  full:    '#e85d5d',
  off:     'rgba(136,136,136,0.25)',
};

const calcStatus = (schedule, dateStr) => {
  const dateData = schedule?.dates?.[dateStr];
  if (dateData?.dayOff) return 'off';
  const defaultHours = schedule?.defaultSlots ?? DEFAULT_TIME_SLOTS;
  const rawSlots = (dateData?.slots?.length > 0) ? dateData.slots : defaultHours;
  // 기본 운영 시간에 포함된 슬롯만 유효
  const slots = rawSlots.filter(s => defaultHours.includes(s));
  if (!slots.length) return 'off';
  const blocked = dateData?.blocked ?? [];
  const avail = slots.filter(s => !blocked.includes(s));
  if (!avail.length) return 'full';
  if (blocked.length > 0) return 'partial';
  return 'open';
};

// ── 투어 일정 오픈 관리 (크라우드펀딩/모집 시스템) ────────────────────
const TourInstanceManager = ({ photographerId, tours }) => {
  const { lang } = useLanguage();
  const [instances, setInstances] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ tourIndex: 0, scheduledDate: '', scheduledTime: '10:00', deadlineDays: 7 });
  const [dateError, setDateError] = useState('');

  const refresh = useCallback(() => {
    const pid = photographerId ? (Number(photographerId) || photographerId) : null;
    if (!pid) return;
    evaluateDeadlines(); // 마감 체크
    setInstances(getInstancesByPhotographer(pid));
  }, [photographerId]);

  useEffect(() => { refresh(); }, [refresh]);

  // 구독
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('tourInstancesChanged', handler);
    return () => window.removeEventListener('tourInstancesChanged', handler);
  }, [refresh]);

  const handleCreate = () => {
    const tour = tours[newForm.tourIndex];
    if (!tour || !newForm.scheduledDate) return;

    const today = new Date().toISOString().split('T')[0];
    if (newForm.scheduledDate < today) {
      setDateError('현재 날짜보다 이전은 선택할 수 없습니다');
      return;
    }

    const pid = photographerId ? (Number(photographerId) || photographerId) : photographerId;
    const deadlineDate = new Date(newForm.scheduledDate);
    deadlineDate.setDate(deadlineDate.getDate() - (newForm.deadlineDays || tour.deadlineDays || 7));

    createInstance({
      photographerId: pid,
      tourIndex: newForm.tourIndex,
      tourName: tour.name,
      scheduledDate: newForm.scheduledDate,
      scheduledTime: newForm.scheduledTime,
      deadline: deadlineDate.toISOString().slice(0, 10),
      maxGuests: tour.maxGuests || 6,
      minGuests: tour.minGuests ?? Math.ceil((tour.maxGuests || 6) / 2),
      pricingType: tour.pricingType || 'perPerson',
      basePrice: Number(tour.price) || 0,
    });
    setShowCreate(false);
    setNewForm({ tourIndex: 0, scheduledDate: '', scheduledTime: '10:00', deadlineDays: 7 });
    refresh();
  };

  const handleDelete = (id) => {
    if (!confirm('이 투어 일정을 삭제하시겠습니까?')) return;
    deleteInstance(id);
    refresh();
  };

  const handleCancel = (id) => {
    updateInstanceStatus(id, 'cancelled');
    refresh();
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth()+1}/${dt.getDate()}(${['일','월','화','수','목','금','토'][dt.getDay()]})`;
  };

  const inputStyle = {
    display: 'block', marginTop: 6, width: '100%',
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13,
    colorScheme: 'dark',
  };

  // photographerId를 Number로 정규화하여 타입 일관성 보장
  const normalizedPid = photographerId ? Number(photographerId) || photographerId : null;

  return (
    <div style={{ border: '1px solid rgba(76,175,80,0.2)', background: 'rgba(76,175,80,0.02)', padding: '24px 28px', position: 'relative' }}>
      <Corners />
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: '#4caf50', textTransform: 'uppercase', marginBottom: 6 }}>
        📅 투어 일정 오픈 <span style={{ color: 'rgba(76,175,80,0.5)' }}>— {instances.filter(i => i.status === 'recruiting').length}개 모집 중</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
        투어 날짜를 오픈하면 고객이 참가 신청할 수 있습니다. 마감일까지 인원이 모이면 자동 확정됩니다.
      </div>

      {/* 오픈된 일정 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {instances.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            아직 오픈된 투어 일정이 없습니다
          </div>
        )}
        {instances.map(inst => {
          const count = getActiveBookingCount(inst);
          const remaining = getRemainingSlots(inst);
          const statusLabel = getStatusLabel(inst.status, lang);
          const statusColor = getStatusColor(inst.status);
          const perPerson = inst.pricingType === 'total'
            ? `₩${Math.ceil(inst.basePrice / inst.maxGuests).toLocaleString('ko-KR')}/인`
            : `₩${inst.basePrice.toLocaleString('ko-KR')}/인`;

          // 원본 투어 데이터에서 세부 정보 가져오기
          const tourData = tours[inst.tourIndex] || {};

          return (
            <div key={inst.id} style={{ border: '1px solid var(--border)', padding: '14px 18px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
                    {inst.tourName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    📅 {fmtDate(inst.scheduledDate)} {inst.scheduledTime} &nbsp;|&nbsp; ⏰ 마감: {fmtDate(inst.deadline)}
                  </div>
                  {/* 투어 간략 정보 */}
                  {(tourData.durationMin || tourData.photos || tourData.desc) && (
                    <div style={{ fontSize: 10, color: 'rgba(136,136,136,0.7)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {tourData.durationMin && <span>⏱ {tourData.durationMin}분</span>}
                      {tourData.photos && <span>📷 {tourData.photos}컷</span>}
                      {tourData.route?.departure && <span>📍 {tourData.route.departure} → {tourData.route.destination || '...'}</span>}
                    </div>
                  )}
                  {tourData.desc && (
                    <div style={{ fontSize: 10, color: 'rgba(136,136,136,0.5)', marginTop: 2, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tourData.desc}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 10, padding: '3px 10px', fontFamily: 'var(--font-serif)',
                  background: `${statusColor}15`, color: statusColor,
                  border: `1px solid ${statusColor}30`, letterSpacing: '0.05em',
                }}>
                  {statusLabel}
                </div>
              </div>

              {/* 인원 현황 바 */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>👥 {count}/{inst.maxGuests}명 {perPerson}</span>
                  <span>{remaining > 0 ? `${remaining}자리 남음` : '마감'}</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, transition: 'width 0.3s',
                    width: `${Math.min(100, (count / inst.maxGuests) * 100)}%`,
                    background: count >= inst.maxGuests ? '#4caf50' : count >= inst.minGuests ? '#e8a020' : '#e85d5d',
                  }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                  최소 {inst.minGuests}명 이상 모여야 진행
                </div>
              </div>

              {/* 참여자 목록 */}
              {inst.bookings.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                  {inst.bookings.filter(b => b.status !== 'cancelled').map((b, i) => (
                    <span key={b.id} style={{
                      display: 'inline-block', padding: '2px 8px', margin: '2px 4px 2px 0',
                      background: b.status === 'pendingConfirm' ? 'rgba(255,152,0,0.1)' : 'rgba(76,175,80,0.06)',
                      border: `1px solid ${b.status === 'pendingConfirm' ? 'rgba(255,152,0,0.2)' : 'rgba(76,175,80,0.1)'}`,
                      fontSize: 10, fontFamily: 'var(--font-serif)',
                    }}>
                      {b.guestName} {b.headcount > 1 ? `(${b.headcount}명)` : ''}
                      {b.status === 'pendingConfirm' && ' ⏳'}
                    </span>
                  ))}
                </div>
              )}

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', gap: 8 }}>
                {inst.status === 'recruiting' && (
                  <button onClick={() => handleCancel(inst.id)}
                    style={{ fontSize: 10, color: '#e85d5d', background: 'transparent', border: '1px solid rgba(232,93,93,0.3)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                    모집 취소
                  </button>
                )}
                {(inst.status === 'cancelled' || inst.status === 'completed') && (
                  <button onClick={() => handleDelete(inst.id)}
                    style={{ fontSize: 10, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 현재 오픈 중인 날짜 요약 */}
      {instances.filter(i => i.status === 'recruiting').length > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.15)', marginBottom: 16, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
          <span style={{ color: '#4caf50', fontFamily: 'var(--font-serif)' }}>현재 오픈 날짜:</span>{' '}
          {instances.filter(i => i.status === 'recruiting')
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
            .map(i => {
              const dt = new Date(i.scheduledDate + 'T00:00:00');
              const count = getActiveBookingCount(i);
              return `${dt.getMonth()+1}/${dt.getDate()}(${['일','월','화','수','목','금','토'][dt.getDay()]}) ${i.scheduledTime} ${i.tourName} [${count}/${i.maxGuests}명]`;
            }).join(' · ')}
        </div>
      )}

      {/* 새 일정 오픈 폼 */}
      {showCreate ? (
        <div style={{ border: '1px solid rgba(76,175,80,0.3)', padding: '16px 20px', background: 'rgba(76,175,80,0.03)' }}>
          <div style={{ fontSize: 11, color: '#4caf50', fontFamily: 'var(--font-serif)', marginBottom: 12 }}>📅 새 투어 일정 오픈</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>
              투어 선택
              <select value={newForm.tourIndex} onChange={e => setNewForm({ ...newForm, tourIndex: Number(e.target.value) })} style={inputStyle}>
                {tours.map((t, i) => (
                  <option key={i} value={i}>{t.name} ({t.pricingType === 'total' ? '총액' : '1인당'} ₩{Number(t.price).toLocaleString('ko-KR')})</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>
              투어 날짜
              <input type="date" value={newForm.scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const val = e.target.value;
                  const today = new Date().toISOString().split('T')[0];
                  if (val && val < today) {
                    setDateError('현재 날짜보다 이전은 선택할 수 없습니다');
                    return;
                  }
                  setDateError('');
                  setNewForm({ ...newForm, scheduledDate: val });
                }}
                style={{ ...inputStyle, borderColor: dateError ? '#e85d5d' : undefined }} />
              {dateError && <div style={{ fontSize: 10, color: '#e85d5d', marginTop: 4 }}>{dateError}</div>}
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>
              시작 시간
              <input type="time" value={newForm.scheduledTime} onChange={e => setNewForm({ ...newForm, scheduledTime: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>
              모집 마감 (D-N일)
              <input type="number" value={newForm.deadlineDays} onChange={e => setNewForm({ ...newForm, deadlineDays: Number(e.target.value) || 7 })}
                placeholder="7" min={1} max={30} style={inputStyle} />
              <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                {newForm.scheduledDate && `→ 마감일: ${new Date(new Date(newForm.scheduledDate).getTime() - (newForm.deadlineDays || 7) * 86400000).toISOString().slice(5,10)}`}
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate}
              style={{ fontSize: 11, color: '#fff', background: '#4caf50', border: 'none', padding: '8px 20px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
              일정 오픈
            </button>
            <button onClick={() => setShowCreate(false)}
              style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '8px 20px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost" style={{ fontSize: 12, color: '#4caf50' }} onClick={() => setShowCreate(true)}>+ 일정 오픈</button>
      )}
    </div>
  );
};

// ── 탭 목록 ─────────────────────────────────────────────────────────
const TABS = ['schedule', 'locations', 'info', 'products', 'payment', 'collabo'];

// ────────────────────────────────────────────────────────────────────
const ArtistSchedule = () => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const routerLocation = useLocation();

  // Build overseas notice based on current language
  const OVERSEAS_NOTICE = useMemo(() => buildOverseasNotice(t), [t]);

  // 작가 ID — 로그인 유저의 legacy ID 기반, Supabase 조회로 업데이트
  const [artistId, setArtistId] = useState(() => {
    // user_metadata에서 legacy ID 확인
    const legacyId = user?.user_metadata?.artist_legacy_id || user?.user_metadata?.legacy_id;
    if (legacyId) return Number(legacyId) || legacyId;
    // sessionStorage fallback
    try {
      const stored = sessionStorage.getItem('phosnap_artist_id');
      if (stored) return Number(stored) || stored;
    } catch (_) {}
    return null; // null = 아직 미확인 (fallback 제거)
  });
  const artist = PHOTOGRAPHERS.find(p => p.id === artistId);

  // 탭 — 다른 페이지에서 state로 openTab 전달 시 해당 탭으로 자동 이동
  const [activeTab, setActiveTab] = useState(() => {
    return routerLocation.state?.openTab || 'schedule';
  });

  // 필수 항목 경고 배너 확장/축소 상태
  const [requiredItemsExpanded, setRequiredItemsExpanded] = useState(false);

  // 실적 탭 상태
  const [perfDateStart, setPerfDateStart] = useState('');
  const [perfDateEnd, setPerfDateEnd] = useState('');
  const [perfRangeResult, setPerfRangeResult] = useState(null);

  // ── 공통: 저장 피드백 ──
  const [saveMsg, setSaveMsg] = useState('');
  const showSaved = (msg = '저장되었습니다 ✓') => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // ── 스케줄 상태 ──
  const [schedule, setSchedule]   = useState(null);
  const [activeDate, setActiveDate] = useState(null);
  const [calYear,  setCalYear]    = useState(today.getFullYear());
  const [calMonth, setCalMonth]   = useState(today.getMonth());
  const [editingDefault, setEditingDefault] = useState(false);
  const [draftDefault, setDraftDefault]     = useState([]);

  // Quick Range 상태
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd,   setRangeEnd]   = useState('');
  const [rangeFrom,  setRangeFrom]  = useState('10:00');
  const [rangeTo,    setRangeTo]    = useState('17:00');
  // 요일 제외 선택: 0=일, 1=월, ..., 6=토
  const [excludeDays, setExcludeDays] = useState([]);
  const toggleExcludeDay = (day) => setExcludeDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  // ── 프로필 상태 ──
  const [profile, setProfileState] = useState(null);

  // ── 해외 팝업 ──
  const [overseasNotice, setOverseasNotice] = useState(null); // { type, pendingLoc }
  const [artistType, setArtistType]         = useState('photographer'); // 'photographer' | 'hmua' | 'videographer'

  // ── H&M 동행 여부 팝업 (자체 H&M 동행 작가 전용) ──
  const [hmkLocNotice, setHmkLocNotice]     = useState(null); // { step:'ask'|'warn', pendingLoc }
  // demoHmkPartner 제거 — 실제 profile.has_hmk_partner만 사용

  // ── 예약 요청 상태 ──
  const [pendingBookings, setPendingBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [rejectTarget,    setRejectTarget]    = useState(null); // booking.id
  const [rejectReason,    setRejectReason]    = useState('');

  // ── 상품 관리 상태 ──
  const [props, setProps] = useState([]);  // [{name, desc}]
  const [costumes, setCostumes] = useState([]);  // [{name, gender, category, price, desc, images:[]}]
  const [snapProducts, setSnapProducts] = useState([]);  // [{name, duration, editedCount, price, desc, images:[]}]
  const [propImages, setPropImages] = useState({});  // {propIdx: [urls]}
  const [costumeImages, setCostumeImages] = useState({});  // {costumeIdx: [urls]}
  const [snapImages, setSnapImages] = useState({});  // {snapIdx: [urls]}
  const [paymentDraft, setPaymentDraft] = useState(null);

  // ── 콜라보 상태 ──
  const [collaboReceived, setCollaboReceived] = useState([]);
  const [collaboSent, setCollaboSent] = useState([]);
  const [collaboProposalPopup, setCollaboProposalPopup] = useState(null); // { targetArtist }
  const [collaboRejectPopup, setCollaboRejectPopup] = useState(null); // { proposalId }
  const [collaboRejectReason, setCollaboRejectReason] = useState('');
  const [collaboTypeFilter, setCollaboTypeFilter] = useState('all'); // 'all' | 'photographer' | 'videographer' | 'hmua'
  const [collaboView, setCollaboView] = useState('browse'); // 'browse' | 'received' | 'sent'

  // 콜라보 데이터 로드
  const loadCollabo = useCallback(() => {
    expireOldProposals();
    setCollaboReceived(getPendingReceived(artistId));
    setCollaboSent(getSentProposals(artistId));
  }, [artistId]);

  // ── Supabase 연동 상태 ──
  const [dbConnected, setDbConnected] = useState(false);
  const [dbPhotographerId, setDbPhotographerId] = useState(null); // Supabase photographer UUID

  // ── 로드 (Supabase 우선, localStorage fallback) ──
  const load = useCallback(async () => {
    // 항상 localStorage fallback 초기화
    initSchedules();
    initProfiles();
    initSalesData();

    // Supabase 연동 시도
    try {
      const sb = await getSupabase();
      if (sb) {
        // 현재 유저의 photographer 레코드 조회
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          let { data: photog } = await sb.from('photographers')
            .select('id').eq('user_id', session.user.id).maybeSingle();

          // 공개 레코드가 아직 없는 계정(구버전 가입자 등)은 여기서 생성해준다.
          // 이게 없으면 임시 ID로 localStorage 에만 저장되어 고객에게 노출되지 않는다.
          if (!photog?.id) {
            const { data: prof } = await sb.from('profiles')
              .select('full_name, artist_type').eq('id', session.user.id).maybeSingle();
            const { ensureArtistRecord } = await import('../lib/supabase');
            const parsed = (prof?.full_name || '').match(/^(.*?)\s*\((.*)\)\s*$/);
            const { data: created, kind } = await ensureArtistRecord(session.user.id, {
              artistType:  prof?.artist_type || 'photographer',
              nativeName:  parsed ? parsed[1] : (prof?.full_name || ''),
              englishName: parsed ? parsed[2] : '',
            });
            // 헤메(hmk)는 stylists 레코드가 만들어지므로 여기서 쓰면 안 된다.
            if (kind === 'photographer' && created?.id) photog = created;
          }

          if (photog?.id) {
            setArtistId(photog.id);
            try { sessionStorage.setItem('phosnap_artist_id', String(photog.id)); } catch (_) {}
            setDbPhotographerId(photog.id);
            setDbConnected(true);
            // 패키지 로드
            const { data: pkgs } = await getPackages(photog.id);
            if (pkgs?.length) {
              // DB 컬럼명을 대시보드가 쓰는 필드명으로 되돌린다.
              const { fromPackageRow } = await import('../lib/supabase');
              const mapped = pkgs.map(fromPackageRow);
              setSnapProducts(mapped.filter(p => p.type === 'snap'));
              setCostumes(mapped.filter(p => p.type === 'costume'));
              setProps(mapped.filter(p => p.type === 'prop'));
              // tours 는 profile 상태로 관리되며 setTours 는 저장을 유발하므로
              // 로드 시점에 호출하지 않는다.
            }
            // 스케줄 로드
            const { data: schedData } = await getScheduleMonth(photog.id, calYear, calMonth + 1);
            if (schedData?.length) {
              // Supabase 스케줄 데이터를 로컬 형식으로 변환
              schedData.forEach(sd => {
                const dateStr = sd.date;
                if (!schedule?.dates) return;
                schedule.dates[dateStr] = {
                  open: !sd.day_off,
                  dayOff: sd.day_off,
                  slots: sd.slots?.length ? sd.slots : (schedule.defaultSlots || DEFAULT_TIME_SLOTS),
                  blocked: sd.blocked || [],
                };
              });
            }
            // 기본 시간 로드
            const { data: defaults } = await getDefaultSlots(photog.id);
            if (defaults?.default_slots) {
              setDraftDefault(defaults.default_slots);
            }
          }
        }
      }
    } catch (e) {
      // Silently fall back to localStorage
    }

    // localStorage fallback (항상 실행) — artistId가 없으면 임시 ID 할당 후 빈 프로필로 초기화
    if (!artistId) {
      // 임시 ID 생성하여 투어 인스턴스 등 localStorage 기반 기능이 동작하도록
      const tempId = sessionStorage.getItem('phosnap_temp_artist_id') || `temp_${Date.now()}`;
      sessionStorage.setItem('phosnap_temp_artist_id', tempId);
      setArtistId(tempId);
      setProfileState(prev => prev || { id: tempId, locations: [], portfolio: [], paymentInfo: {}, tours: [], hmk: { selfAvailable: false, note: '', menus: [] } });
      setSchedule(prev => prev || { defaultSlots: INITIAL_DEFAULT_HOURS, dates: {} });
      setDraftDefault(prev => prev.length > 0 ? prev : []);
      return;
    }
    const s = getSchedule('photographer', artistId);
    setSchedule(s);
    if (!dbConnected) {
      setDraftDefault(s.defaultSlots ?? INITIAL_DEFAULT_HOURS);
    }
    // 2주 이상 미로그인 체크 → 자동 노출 OFF
    const wasAutoOff = checkInactiveAutoOff('photographer', artistId);
    const loadedProfile = getProfile('photographer', artistId);
    setProfileState(loadedProfile || { locations: [], portfolio: [], paymentInfo: {}, tours: [], hmk: { selfAvailable: false, note: '', menus: [] } });
    if (wasAutoOff) {
      showSaved('⚠ 2주 이상 미로그인으로 전체 활동 지역이 노출 OFF 처리되었습니다. 활동 지역 탭에서 다시 ON 해주세요.');
    } else {
      recordLogin(artistId);
    }
    setActiveDate(null);
  }, [artistId, calYear, calMonth]);

  useEffect(() => { load(); }, [load]);

  // ── 필수 항목 충족 여부에 따라 고객 노출(is_active) 자동 동기화 ──
  // 이 로직이 없으면 작가가 모든 정보를 채워도 photographers.is_active 가
  // false 로 남아 고객 검색 결과에 영원히 나타나지 않는다.
  useEffect(() => {
    if (!dbPhotographerId) return;

    const locs           = profile?.locations ?? [];
    const hasMainLoc     = locs.some(l => l.isMain);
    const hasPortfolio   = (profile?.portfolio ?? []).some(pf => (pf.images?.length > 0 || pf.url) && pf.regionId);
    const hasSnapProduct = snapProducts.length > 0;
    const pi             = profile?.paymentInfo;
    const hasPayment     = !!(pi?.bankName && pi?.accountNumber && pi?.accountHolder);

    const shouldBeActive = hasMainLoc && hasPortfolio && hasSnapProduct && hasPayment;

    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabase();
        if (!sb || cancelled) return;
        const { data: cur } = await sb.from('photographers')
          .select('is_active').eq('id', dbPhotographerId).maybeSingle();
        if (cancelled || !cur || cur.is_active === shouldBeActive) return;
        await sb.from('photographers')
          .update({ is_active: shouldBeActive, updated_at: new Date().toISOString() })
          .eq('id', dbPhotographerId);
      } catch (_) {
        // 노출 동기화 실패는 사용자 작업을 막지 않는다.
      }
    })();
    return () => { cancelled = true; };
  }, [dbPhotographerId, profile, snapProducts]);

  // 콜라보 탭 열릴 때 로드
  useEffect(() => {
    if (activeTab === 'collabo') loadCollabo();
  }, [activeTab, loadCollabo]);

  // 예약 요청 탭 열릴 때 로드
  useEffect(() => {
    if (activeTab !== 'bookings') return;
    const loadBookings = async () => {
      setBookingsLoading(true);
      const { data } = await getPendingBookings(artistId);
      setPendingBookings(data || []);
      setBookingsLoading(false);
    };
    loadBookings();
  }, [activeTab, artistId]);

  /**
   * 이미지를 Supabase Storage 에 올리고 공개 URL 배열을 돌려준다.
   *
   * 예전에는 업로드가 실패하면 조용히 URL.createObjectURL() 로 폴백했는데,
   * blob: 주소는 새로고침하면 죽고 그대로 DB 에 저장되어 깨진 이미지가
   * 남았다. 실패는 폴백하지 않고 사용자에게 알린다.
   *
   * @param {FileList|File[]} files
   * @param {string} bucket
   * @param {number} maxNew 이번에 추가 가능한 최대 장수
   * @returns {Promise<string[]>} 업로드 성공한 공개 URL 목록
   */
  const uploadImagesToStorage = async (files, bucket, maxNew) => {
    if (maxNew <= 0) return [];
    const urls = [];
    const failures = [];
    try {
      const { uploadImage } = await import('../lib/storage');
      for (let i = 0; i < maxNew; i++) {
        const { url, error } = await uploadImage(files[i], bucket);
        if (url) urls.push(url);
        else failures.push(error || '알 수 없는 오류');
      }
    } catch (e) {
      failures.push(e?.message || '업로드 모듈 로드 실패');
    }
    if (failures.length) {
      console.error(`[ArtistSchedule] ${bucket} 업로드 실패:`, failures);
      showSaved(`⚠ 사진 ${failures.length}장 업로드 실패 — ${failures[0]}`);
    }
    return urls;
  };

  const saveProfileData = async (updated) => {
    saveProfile('photographer', artistId, updated);
    setProfileState(updated);
    // Supabase photographers 테이블 동기화 (프로필 데이터)
    if (dbConnected && dbPhotographerId) {
      try {
        const sb = await getSupabase();
        if (sb) {
          // 메인 활동지 우선, 없으면 첫 번째 지역
          const mainLocation = updated.locations?.find(l => l.isMain) || updated.locations?.[0];

          // 고객 목록 카드에 필요한 값들을 함께 계산한다.
          // (예전에는 저장하지 않아 작가가 노출돼도 가격·썸네일이 비어 있었다)
          const snaps = updated.snapProducts || snapProducts || [];
          const prices = snaps
            .map(p => parseInt(String(p.price).replace(/[^0-9]/g, ''), 10))
            .filter(n => Number.isFinite(n) && n > 0);
          const priceFrom = prices.length ? Math.min(...prices) : 0;

          // 게시글 단위로 저장한다. 예전에는 이미지를 낱장으로 펼쳐 저장해
          // 한 게시글의 여러 장이 서로 다른 게시글처럼 흩어졌다.
          const portfolioItems = (updated.portfolio || [])
            .map(pf => {
              const images = pf.images?.length ? pf.images : (pf.url ? [pf.url] : []);
              if (!images.length) return null;
              const coverIdx = Number.isInteger(pf.coverIdx) ? pf.coverIdx : 0;
              const cover = images[coverIdx] || images[0];
              return {
                cover,
                url: cover,                       // 구버전 호환
                images,
                caption:  pf.caption || pf.title || '',
                location: pf.regionId || null,
                regionId: pf.regionId || null,    // 구버전 호환
              };
            })
            .filter(Boolean);

          const coverImg = portfolioItems[0]?.cover
            || snaps.find(p => p.images?.length)?.images?.[0]
            || null;

          // jsonb 컬럼에는 객체를 그대로 넣는다. JSON.stringify 로 감싸면
          // 문자열이 통째로 저장되어 읽는 쪽에서 파싱이 깨진다.
          // 고객 카드는 location_names[언어] 로 지역을 표시한다.
          // 비어 있으면 'seoul' 같은 raw id 가 그대로 노출된다.
          const locationNames = mainLocation
            ? {
                ko: mainLocation.name   || mainLocation.regionId || '',
                en: mainLocation.nameEn || mainLocation.name || '',
                ja: mainLocation.nameJa || mainLocation.name || '',
                zh: mainLocation.nameZh || mainLocation.name || '',
              }
            : {};

          // 고객 상세 페이지(Profile)는 pkg.hours / pkg.photos 를 읽는데
          // 대시보드는 duration("2시간") / editedCount 로 관리한다.
          // 양쪽 필드를 모두 채워 어느 화면에서도 값이 비지 않게 한다.
          const toInt = (v) => {
            const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
            return Number.isFinite(n) ? n : 0;
          };
          const publicPackages = snaps.map(p => {
            const hours = parseFloat(String(p.duration ?? '').replace(/[^0-9.]/g, '')) || null;
            return {
              ...p,
              // 문자열로 저장하면 예약 화면에서 금액 덧셈이 문자열 연결이 되어
              // 결제 금액이 1000배가 된다. 반드시 숫자로 저장한다.
              price:  toInt(p.price),
              hours:  hours ?? p.hours ?? null,
              photos: toInt(p.editedCount ?? p.photos) || null,
            };
          });

          const payload = {
            location_id:    mainLocation?.regionId || null,
            location_names: locationNames,
            country_code:   mainLocation?.countryCode || 'KR',
            city:           mainLocation?.city || null,
            packages:     publicPackages,
            props:        updated.props || [],
            dresses:      updated.costumes || [],
            portfolio:    portfolioItems,
            tags:         updated.snapFilters || [],
            price_from:   priceFrom,
            hmk_available: updated.hmkSelf ?? false,
            updated_at:   new Date().toISOString(),
          };
          if (coverImg) payload.img = coverImg;

          const { error: syncErr } = await sb.from('photographers')
            .update(payload).eq('id', dbPhotographerId);
          if (syncErr) console.error('[ArtistSchedule] photographers sync failed:', syncErr);

          // packages 테이블에도 반영한다. load() 가 이 테이블에서 읽으므로
          // 여기에 쓰지 않으면 저장한 상품이 새로고침 후 사라진다.
          const { replacePackages } = await import('../lib/supabase');
          const groups = [
            ['snap',    snaps],
            ['tour',    updated.tours || []],
            ['costume', updated.costumes || []],
            ['prop',    updated.props || []],
          ];
          for (const [type, items] of groups) {
            const { error: pkgErr } = await replacePackages(dbPhotographerId, type, items);
            if (pkgErr) console.error(`[ArtistSchedule] packages(${type}) sync failed:`, pkgErr);
          }
        }
      } catch (e) {
        console.error('[ArtistSchedule] photographers sync threw:', e);
      }
    }
    showSaved();
  };

  // ── 달력 helpers ──
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);
  const isPast = (day) => {
    const d = new Date(calYear, calMonth, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };
  const activeDayData = activeDate && schedule ? getDaySchedule('photographer', artistId, activeDate) : null;

  // ── 슬롯 토글 (일괄 선택 → 저장 방식) ──
  const [pendingBlocked, setPendingBlocked] = useState(null); // 임시 차단 목록, null = 수정 안 함
  const [slotsDirty, setSlotsDirty] = useState(false);

  // 날짜 변경 시 pendingBlocked 초기화
  const selectDate = (dateStr) => {
    setActiveDate(dateStr);
    setPendingBlocked(null);
    setSlotsDirty(false);
  };

  const handleToggleSlot = (time) => {
    if (!activeDate || !activeDayData) return;
    const currentBlocked = pendingBlocked ?? [...(activeDayData.blocked || [])];
    const next = currentBlocked.includes(time)
      ? currentBlocked.filter(t => t !== time)
      : [...currentBlocked, time];
    setPendingBlocked(next);
    setSlotsDirty(true);
  };

  const handleSaveSlots = async () => {
    if (!activeDate || !pendingBlocked) return;
    // pendingBlocked 기준으로 차단 상태 일괄 저장
    const dayData = getDaySchedule('photographer', artistId, activeDate);
    const allSlots = dayData.slots || [];
    // 먼저 모든 슬롯 차단 해제 후, pendingBlocked만 차단
    allSlots.forEach(time => {
      const isCurrentlyBlocked = dayData.blocked?.includes(time);
      const shouldBeBlocked = pendingBlocked.includes(time);
      if (isCurrentlyBlocked !== shouldBeBlocked) {
        toggleSlotBlocked('photographer', artistId, activeDate, time);
      }
    });
    // Supabase 동기화
    if (dbConnected && dbPhotographerId) {
      await upsertScheduleDate(dbPhotographerId, activeDate, {
        blocked: pendingBlocked,
        slots: allSlots,
      });
    }
    load();
    setPendingBlocked(null);
    setSlotsDirty(false);
    showSaved();
  };

  const handleToggleDayOff = async () => {
    if (!activeDate) return;
    toggleDayOff('photographer', artistId, activeDate);
    // 즉시 캘린더 상태 반영 (load() async 대기 없이)
    const updated = getSchedule('photographer', artistId);
    setSchedule({ ...updated });
    // Supabase 동기화
    if (dbConnected && dbPhotographerId) {
      const dayData = getDaySchedule('photographer', artistId, activeDate);
      await upsertScheduleDate(dbPhotographerId, activeDate, {
        dayOff: dayData.dayOff,
      });
    }
    setPendingBlocked(null);
    setSlotsDirty(false);
    showSaved();
  };
  const handleSaveDefault = async () => {
    updateDefaultSlots('photographer', artistId, draftDefault);
    // 즉시 캘린더 상태 반영
    const updated = getSchedule('photographer', artistId);
    setSchedule({ ...updated });
    // draftDefault도 저장된 값으로 동기화
    setDraftDefault([...draftDefault]);
    // Supabase 동기화
    if (dbConnected && dbPhotographerId) {
      await upsertDefaultSlots(dbPhotographerId, draftDefault);
    }
    setEditingDefault(false);
    showSaved('기본 운영 시간이 저장되었습니다 ✓');
  };

  // ── Quick Range 적용 (전체 시간 슬롯으로 오픈, 이후 캘린더에서 개별 관리) ──
  const handleApplyRange = async () => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return;
    // excludeDays = 선택된 요일 (포함 대상). 선택 안 된 요일을 제외 처리.
    const allDays = [0,1,2,3,4,5,6];
    const selectedDays = excludeDays; // 이제 "선택된 요일"을 의미
    const exclude = allDays.filter(d => !selectedDays.includes(d)).map(String);
    const slots = [...(schedule?.defaultSlots ?? DEFAULT_TIME_SLOTS)];
    openDateRange('photographer', artistId, rangeStart, rangeEnd, slots, exclude);
    // 즉시 캘린더 상태 반영
    const updated = getSchedule('photographer', artistId);
    setSchedule({ ...updated });
    // Supabase 일괄 동기화
    if (dbConnected && dbPhotographerId) {
      const entries = [];
      let cur = new Date(rangeStart);
      const end = new Date(rangeEnd);
      while (cur <= end) {
        const dayOfWeek = String(cur.getDay());
        if (!exclude.includes(dayOfWeek)) {
          entries.push({
            date: cur.toISOString().split('T')[0],
            dayOff: false,
            slots: slots,
            blocked: [],
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (entries.length) await upsertScheduleBatch(dbPhotographerId, entries);
    }
    const d = new Date(rangeStart);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    const dayLabels = ['일','월','화','수','목','금','토'];
    const selectedStr = selectedDays.sort((a,b) => a-b).map(d => dayLabels[d]).join('·');
    showSaved(`${rangeStart} ~ ${rangeEnd} ${selectedStr} 오픈 완료 ✓`);
  };

  const handleCloseRange = () => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return;
    // 선택된 요일만 클로즈 대상
    const allDays = [0,1,2,3,4,5,6];
    const selectedDays = excludeDays;
    const exclude = allDays.filter(d => !selectedDays.includes(d)).map(String);
    closeDateRange('photographer', artistId, rangeStart, rangeEnd, exclude);
    // 즉시 캘린더 상태 반영
    const updated = getSchedule('photographer', artistId);
    setSchedule({ ...updated });
    const d = new Date(rangeStart);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    const dayLabels = ['일','월','화','수','목','금','토'];
    const selectedLabels = selectedDays.map(d => dayLabels[d]).join(', ');
    showSaved(`${rangeStart} ~ ${rangeEnd} [${selectedLabels}] 일괄 클로즈 완료 ✓`);
  };

  // ── 상시 오픈 (오늘 ~ 2100-12-31) ──
  const handleAlwaysOpen = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const endStr = '2100-12-31';
    const slots = [...DEFAULT_TIME_SLOTS];
    openDateRange('photographer', artistId, todayStr, endStr, slots, []);
    // 즉시 캘린더 상태 반영
    const updated = getSchedule('photographer', artistId);
    setSchedule({ ...updated });
    if (dbConnected && dbPhotographerId) {
      // Supabase에는 향후 1년만 동기화 (성능 고려)
      const entries = [];
      let cur = new Date(todayStr);
      const sbEnd = new Date(today);
      sbEnd.setFullYear(sbEnd.getFullYear() + 1);
      while (cur <= sbEnd) {
        entries.push({ date: cur.toISOString().split('T')[0], dayOff: false, slots: slots, blocked: [] });
        cur.setDate(cur.getDate() + 1);
      }
      if (entries.length) await upsertScheduleBatch(dbPhotographerId, entries);
    }
    showSaved('상시 오픈 완료 ✓');
  };

  // ── 모든 일정 클로즈 ──
  const handleCloseAll = () => {
    if (!confirm('모든 오픈 일정을 클로즈하시겠습니까?')) return;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const endStr = '2100-12-31';
    closeDateRange('photographer', artistId, todayStr, endStr, []);
    // 즉시 캘린더 상태 반영
    const updated = getSchedule('photographer', artistId);
    setSchedule({ ...updated });
    showSaved('모든 일정이 클로즈되었습니다 ✓');
  };

  // ─────────────────────────────────────────────────────────────────
  // 탭 컨텐츠 렌더
  // ─────────────────────────────────────────────────────────────────

  // ── 지역별 색상 매핑 ──
  const LOC_COLORS = ['#e8a020', '#60a5fa', '#22c55e', '#f472b6', '#a78bfa', '#fb923c'];
  const getLocColor = (idx) => LOC_COLORS[idx % LOC_COLORS.length];

  // 특정 날짜에 활동 중인 지역 목록 반환
  const getActiveLocsForDate = (dateStr) => {
    const locs = profile?.locations ?? [];
    return locs.filter(loc => {
      if (!loc.active) return false;
      // 메인 활동지: 항상 활성 (pauseMain 기간 제외)
      if (loc.isMain) {
        // 다른 출장 지역이 pauseMain이고 해당 기간이면 제외
        const pausingLocs = locs.filter(l => !l.isMain && l.pauseMain && l.period?.start);
        for (const pl of pausingLocs) {
          const s = pl.period.start;
          const e = pl.period.end || s;
          if (dateStr >= s && dateStr <= e) return false;
        }
        return true;
      }
      // 출장 지역: 기간 내에만 활성
      if (!loc.period?.start) return false;
      const s = loc.period.start;
      const e = loc.period.end || s;
      return dateStr >= s && dateStr <= e;
    });
  };

  // ── TAB 1: 스케줄 관리 ──────────────────────────────────────────
  const renderScheduleTab = () => {
    const allLocs = profile?.locations ?? [];
    const mainLoc = allLocs.find(l => l.isMain);

    return (
    <div>
      {/* Quick Range Setup */}
      <div style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', padding: '24px 28px', position: 'relative', marginBottom: 32 }}>
        <Corners />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
          ⚡ 날짜 범위 일괄 오픈
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>시작일</div>
            <DatePicker value={rangeStart} onChange={setRangeStart} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>종료일</div>
            <DatePicker value={rangeEnd} onChange={setRangeEnd} />
          </div>
        </div>
        {/* 요일 선택 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>요일 선택:</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['일','월','화','수','목','금','토'].map((label, idx) => {
              const active = excludeDays.includes(idx);
              return (
                <button key={idx} onClick={() => toggleExcludeDay(idx)} style={{
                  width: 36, height: 36, fontSize: 12, fontFamily: 'var(--font-serif)',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                  background: active ? 'rgba(232,160,32,0.15)' : 'transparent',
                  color: active ? 'var(--gold)' : (idx === 0 ? '#e85d5d' : idx === 6 ? '#60a5fa' : 'var(--muted)'),
                  cursor: 'pointer', borderRadius: 0,
                }}>{label}</button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ fontSize: 12, padding: '10px 20px' }}
            onClick={handleApplyRange}
            disabled={!rangeStart || !rangeEnd || rangeStart > rangeEnd}>
            설정 기간 내 전체 오픈 →
          </button>
          <button style={{ fontSize: 12, padding: '10px 20px', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', background: 'transparent', border: '1px solid #e85d5d', color: '#e85d5d', cursor: 'pointer' }}
            onClick={handleCloseRange}
            disabled={!rangeStart || !rangeEnd || rangeStart > rangeEnd}>
            설정 기간 내 전체 클로즈 ×
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(232,160,32,0.6)', marginTop: 12, lineHeight: 1.7 }}>
          날짜 범위를 선택하면 해당 기간 전체 시간(00:00~24:00)이 오픈됩니다. 이후 달력에서 날짜 클릭 → 개별 시간 차단/해제가 가능합니다.
          <br/>* 표시 시간은 활동 지역 현지 시간 기준입니다
        </p>
      </div>

      {/* 달력 + 슬롯 에디터 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }}>

        {/* ── 달력 ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase' }}>월간 캘린더</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setCalYear(y => y-1)}>«</button>
              <button className="btn-ghost" onClick={() => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); }}>←</button>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.08em', minWidth: 110, textAlign: 'center' }}>
                {calYear}년 {calMonth + 1}월
              </span>
              <button className="btn-ghost" onClick={() => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); }}>→</button>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setCalYear(y => y+1)}>»</button>
            </div>
          </div>

          {/* 메인 활동지 + 지역 범례 — 캘린더 바로 위 (해당 월에 활동하는 지역만 표시) */}
          <div style={{ marginBottom: 0, padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderBottom: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mainLoc ? (
              <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                ★ 메인 활동 지역: <span style={{ color: 'var(--gold)' }}>{mainLoc.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>(상시)</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#e85d5d' }}>⚠ 메인 활동지를 활동 지역 탭에서 지정해주세요</div>
            )}
            {allLocs.length > 0 && (() => {
              // ── 현재 보고 있는 월의 시작일/종료일 ──
              const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
              const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
              const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

              // ── 해당 월에 활동 기간이 겹치는 지역만 필터 ──
              const monthLocs = allLocs.filter(loc => {
                // 메인 활동지: 항상 표시 (상시 활동)
                if (loc.isMain) return true;
                // 출장 지역: 기간이 이번 달과 겹치는 경우만
                const s = loc.period?.start;
                const e = loc.period?.end || s;
                if (!s) return false; // 기간 미설정은 표시 안 함
                return s <= monthEnd && e >= monthStart;
              });

              // 정렬: 메인 → 같은 나라 → 가까운 나라 → 먼 나라
              const mainLocEntry = allLocs.find(l => l.isMain);
              const mainCountry = mainLocEntry ? getLocCountry(mainLocEntry) : 'KR';
              const proximityList = PROXIMITY_ORDER[mainCountry] || PROXIMITY_ORDER['KR'];

              const getLocSortKey = (loc) => {
                if (loc.isMain) return 0;
                const locCountry = getLocCountry(loc);
                if (locCountry === mainCountry) return 1;
                const idx = proximityList.indexOf(locCountry);
                return idx >= 0 ? 2 + idx : 100;
              };
              const sortedLocs = [...monthLocs].sort((a, b) => getLocSortKey(a) - getLocSortKey(b));
              return (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {sortedLocs.map((loc) => {
                    const origIdx = allLocs.findIndex(l => l.id === loc.id);
                    return (
                      <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: loc.active ? 'var(--muted)' : 'rgba(136,136,136,0.4)' }}>
                        <span style={{ width: 14, height: 3, background: loc.active ? getLocColor(origIdx) : 'rgba(136,136,136,0.3)', display: 'inline-block', borderRadius: 1 }} />
                        {loc.name}
                        {loc.isMain && ' (메인)'}
                        {!loc.isMain && loc.period?.start && ` ${loc.period.start}~${loc.period.end || '?'}`}
                        {!loc.active && ' (노출 OFF)'}
                      </div>
                    );
                  })}
                  {monthLocs.length === 0 && !mainLoc && (
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>이번 달 활동 지역 없음</div>
                  )}
                </div>
              );
            })()}
          </div>

          <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 16px', position: 'relative' }}>
            <Corners />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 10, color: i === 0 ? 'rgba(232,80,80,0.5)' : i === 6 ? 'rgba(100,150,255,0.5)' : 'var(--muted)', padding: '8px 0', fontFamily: 'var(--font-serif)' }}>
                  {d}
                </div>
              ))}
              {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const past = isPast(day);
                const isActive = activeDate === dateStr;
                const isToday  = dateStr === todayStr;
                const status   = schedule ? calcStatus(schedule, dateStr) : 'open';
                const dow      = new Date(calYear, calMonth, day).getDay();

                // 이 날짜에 활동 중인 지역들 (최대 3개 표시)
                const activeLocs = getActiveLocsForDate(dateStr);
                const locIndices = activeLocs.map(al => allLocs.findIndex(l => l.id === al.id)).filter(i => i >= 0).slice(0, 3);

                return (
                  <button
                    key={day}
                    onClick={() => !past && selectDate(dateStr)}
                    style={{
                      position: 'relative',
                      padding: '4px 4px 16px', textAlign: 'center',
                      fontSize: 13, fontFamily: 'var(--font-serif)',
                      background: isActive ? 'var(--gold)' : 'transparent',
                      color: past ? 'rgba(136,136,136,0.2)' : isActive ? '#0B0B0B' : isToday ? 'var(--gold)' : dow === 0 ? 'rgba(232,80,80,0.7)' : dow === 6 ? 'rgba(100,150,255,0.7)' : 'var(--text)',
                      border: `1px solid ${isActive ? 'var(--gold)' : isToday ? 'var(--gold-border)' : 'transparent'}`,
                      cursor: past ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {/* 지역별 색깔 선 (날짜 위) */}
                    {!past && locIndices.length > 0 && (
                      <div style={{ display: 'flex', gap: 1, justifyContent: 'center', marginBottom: 2, minHeight: 4 }}>
                        {locIndices.map(li => (
                          <span key={li} style={{ width: Math.max(6, Math.floor(28 / locIndices.length)), height: 3, background: isActive ? '#0B0B0B' : getLocColor(li), borderRadius: 1 }} />
                        ))}
                      </div>
                    )}
                    {!past && locIndices.length === 0 && <div style={{ minHeight: 6 }} />}
                    {past && <div style={{ minHeight: 6 }} />}
                    {day}
                    {!past && <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: isActive ? '#0B0B0B' : STATUS_COLORS[status] ?? 'transparent' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { color: STATUS_COLORS.open,    label: '예약 가능' },
              { color: STATUS_COLORS.partial,  label: '일부 가능' },
              { color: STATUS_COLORS.full,     label: '마감' },
              { color: STATUS_COLORS.off,      label: '휴무' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>

          {/* 기본 운영 시간 */}
          <div style={{ marginTop: 32, border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
            <Corners />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase' }}>기본 운영 시간</div>
              <button className={editingDefault ? 'btn-primary' : 'btn-ghost'}
                style={{ fontSize: 11, padding: '6px 14px' }}
                onClick={() => editingDefault ? handleSaveDefault() : setEditingDefault(true)}>
                {editingDefault ? '저장' : '✎ 편집'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DEFAULT_TIME_SLOTS.map(time => {
                const isOn = (editingDefault ? draftDefault : (schedule?.defaultSlots ?? INITIAL_DEFAULT_HOURS)).includes(time);
                return (
                  <button key={time}
                    disabled={!editingDefault}
                    onClick={() => setDraftDefault(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time].sort())}
                    style={{
                      padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-serif)',
                      background: isOn ? (editingDefault ? 'var(--gold)' : 'rgba(232,160,32,0.12)') : 'transparent',
                      color: isOn ? (editingDefault ? '#0B0B0B' : 'var(--gold)') : 'var(--muted)',
                      border: `1px solid ${isOn ? 'var(--gold-border)' : 'var(--border)'}`,
                      cursor: editingDefault ? 'pointer' : 'default', transition: 'all 0.15s',
                    }}>
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 날짜별 슬롯 에디터 ── */}
        <div style={{ position: 'sticky', top: 100 }}>
          {!activeDate ? (
            <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '48px 24px', textAlign: 'center', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--border)', marginBottom: 20 }}>◫</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.05em', marginBottom: 8 }}>날짜를 선택하세요</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>달력 날짜 클릭 →<br/>시간대를 개별 관리</div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
              <Corners />
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>시간대 관리</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.04em' }}>{activeDate}</div>
                {activeDayData && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {activeDayData.dayOff ? '휴무일' : (() => {
                      const dh = schedule?.defaultSlots ?? INITIAL_DEFAULT_HOURS;
                      const effectiveSlots = activeDayData.slots.filter(s => dh.includes(s));
                      const blockedInDefault = activeDayData.blocked.filter(s => dh.includes(s));
                      return `운영 ${effectiveSlots.filter(s => !blockedInDefault.includes(s)).length}개 · 차단 ${blockedInDefault.length}개`;
                    })()}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <button onClick={handleToggleDayOff} style={{
                  width: '100%', padding: '11px', fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.04em',
                  background: activeDayData?.dayOff ? 'rgba(232,80,80,0.08)' : 'transparent',
                  color: activeDayData?.dayOff ? '#e85d5d' : 'var(--muted)',
                  border: `1px solid ${activeDayData?.dayOff ? 'rgba(232,80,80,0.3)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {activeDayData?.dayOff ? '✓ 휴무일 — 운영일로 변경' : '☾ 하루 전체 휴무 설정'}
                </button>
              </div>

              {!activeDayData?.dayOff && (
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                    클릭하여 운영 / 차단 선택
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(232,160,32,0.6)', marginBottom: 10, lineHeight: 1.6 }}>
                    * 표시 시간은 활동 지역 현지 시간 기준입니다
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 420, overflowY: 'auto' }}>
                    {(() => {
                      const defaultHours = schedule?.defaultSlots ?? INITIAL_DEFAULT_HOURS;
                      const rawSlots = activeDayData?.slots ?? defaultHours;
                      // 기본 운영 시간 범위로 제한 (기본 시간에 포함된 슬롯만 표시)
                      return rawSlots.filter(t => defaultHours.includes(t));
                    })().map(time => {
                      const currentBlocked = pendingBlocked ?? (activeDayData?.blocked || []);
                      const blocked = currentBlocked.includes(time);
                      return (
                        <button key={time} onClick={() => handleToggleSlot(time)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 16px',
                          background: blocked ? 'rgba(232,80,80,0.05)' : 'rgba(232,160,32,0.04)',
                          border: `1px solid ${blocked ? 'rgba(232,80,80,0.18)' : 'rgba(232,160,32,0.18)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: blocked ? 'rgba(136,136,136,0.35)' : 'var(--text)' }}>{time}</span>
                          <span style={{ fontSize: 9, fontFamily: 'var(--font-serif)', letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: blocked ? '#e85d5d' : 'var(--gold)',
                            padding: '2px 8px', border: `1px solid ${blocked ? 'rgba(232,80,80,0.25)' : 'var(--gold-border)'}`,
                          }}>
                            {blocked ? '차단' : '운영'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* 저장 버튼 — 변경 사항 있을 때만 활성화 */}
                  <button onClick={handleSaveSlots}
                    disabled={!slotsDirty}
                    style={{
                      width: '100%', marginTop: 16, padding: '13px 0',
                      background: slotsDirty ? 'var(--gold)' : 'rgba(136,136,136,0.15)',
                      color: slotsDirty ? '#0B0B0B' : 'var(--muted)',
                      border: 'none', fontFamily: 'var(--font-serif)', fontSize: 13,
                      letterSpacing: '0.08em', cursor: slotsDirty ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                    }}>
                    {slotsDirty ? '저장하기' : '변경 사항 없음'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  // ── TAB 2: 활동 지역 (메인 활동지 + 출장 지역) ────────────────────
  // ── 메인 활동지 중단 확인 팝업 상태 ──
  const [mainPauseNotice, setMainPauseNotice] = useState(null); // { pendingLoc, mainLocName }
  // ── 해외↔국내 기간 겹침 → 타 지역 중단 확인 팝업 ──
  const [crossOverlapNotice, setCrossOverlapNotice] = useState(null); // { triggerLoc, overlappingLocs, selectedToPause }
  // ── 지역별 미저장 활동 기간 (저장 버튼 누를 때까지 보류) ──
  const [pendingPeriods, setPendingPeriods] = useState({}); // { [locId]: { start, end } }
  // ── 지역 선택 피커 상태 ──
  const [locPickerOpen, setLocPickerOpen] = useState(null); // locId of card with picker open
  const [locPickerCountry, setLocPickerCountry] = useState(null); // selected country code
  const [locPickerSearch, setLocPickerSearch] = useState('');
  const locSearchRef = useRef(null); // IME 한글 조합 이슈 해결용
  const composingRef = useRef(false); // IME 조합 중 여부

  const renderLocationsTab = () => {
    const locs     = profile?.locations ?? [];
    const mainLoc  = locs.find(l => l.isMain);
    const subLocs  = locs.filter(l => !l.isMain);
    // 정렬: 메인 활동지 최상단 → 활성(active) 지역 가나다순 → 비활성(OFF) 지역 가나다순
    const sortLocs = (arr) => [...arr].sort((a, b) => {
      // 메인 활동지 우선
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      const aOn = a.active !== false ? 0 : 1;
      const bOn = b.active !== false ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });
    const domestic = sortLocs(locs.filter(l => l.locType === 'domestic'));
    const overseas = sortLocs(locs.filter(l => l.locType === 'overseas'));
    const MAX = 3;

    const inputStyle = {
      display: 'block', marginTop: 6, width: '100%', boxSizing: 'border-box',
      background: 'var(--bg)', border: '1px solid var(--border)',
      color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13,
    };
    const selectStyle = { ...inputStyle, cursor: 'pointer' };

    const updateLoc = (id, field, val) => {
      const next = locs.map(l => l.id === id ? { ...l, [field]: val } : l);
      saveProfileData({ ...profile, locations: next });
    };

    // ── 메인 활동지 지정 ──
    const setAsMain = (id) => {
      const next = locs.map(l => ({
        ...l,
        isMain: l.id === id,
        // 메인 활동지는 날짜 범위 불필요 (항상 ON)
        period: l.id === id ? { start: '', end: '' } : l.period,
      }));
      saveProfileData({ ...profile, locations: next });
      showSaved('메인 활동지가 설정되었습니다 ✓');
    };

    // ── 특정 기간에 동시 활동하는 지역 수 (메인 포함) — 최대 3개 제한 ──
    const MAX_OVERLAP = 3;
    const countOverlappingLocs = (targetId, period, locsOverride) => {
      const checkLocs = locsOverride || locs;
      const tStart = period.start;
      const tEnd = period.end || tStart;
      if (!tStart) return 0;
      // 이 기간 내의 모든 날짜를 순회하며 동시 활동 지역 수의 최대값 구하기
      let maxCount = 0;
      const d = new Date(tStart);
      const endD = new Date(tEnd);
      while (d <= endD) {
        const ds = d.toISOString().slice(0, 10);
        let count = 0;
        for (const l of checkLocs) {
          if (l.id === targetId && !locsOverride) continue; // 자기 자신 제외 (신규 기간 적용 전)
          if (!l.active) continue;
          if (l.isMain) { count++; continue; }
          const s = l.period?.start;
          const e = l.period?.end || s;
          if (!s) continue;
          if (ds >= s && ds <= e) count++;
        }
        // targetId 본인도 포함 (신규 활성화 예정)
        if (!locsOverride) count++; // 저장하려는 지역 본인 +1
        if (count > maxCount) maxCount = count;
        d.setDate(d.getDate() + 1);
      }
      return maxCount;
    };

    // ── 활동 기간 전체를 한 번에 저장 (저장 버튼 클릭 시) ──
    const saveLocPeriodFull = (id, newPeriod) => {
      const targetLoc = locs.find(l => l.id === id);
      if (!targetLoc) return;

      // ── 최대 3개 겹침 제한 체크 ──
      if (newPeriod.start && targetLoc.active) {
        const overlapCount = countOverlappingLocs(id, newPeriod);
        if (overlapCount > MAX_OVERLAP) {
          alert(`같은 기간에 최대 ${MAX_OVERLAP}개 지역까지만 겹칠 수 있습니다.\n현재 이 기간에 ${overlapCount}개 지역이 겹칩니다. 다른 지역의 기간을 조정하거나 노출을 해제해주세요.`);
          return;
        }
      }

      // 저장 (타임스탬프 포함)
      const now = new Date();
      const savedAt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const next = locs.map(l => l.id === id ? { ...l, period: { ...newPeriod, savedAt } } : l);
      saveProfileData({ ...profile, locations: next });

      // ── 해외↔국내 cross-type 겹침 감지 ──
      const tStart = newPeriod.start;
      const tEnd = newPeriod.end || tStart;
      if (tStart && !targetLoc.isMain) {
        const oppositeType = targetLoc.locType === 'overseas' ? 'domestic' : 'overseas';
        const crossOverlaps = locs.filter(l => {
          if (l.id === targetLoc.id) return false;
          if (l.isMain) return false;
          if (l.locType !== oppositeType) return false;
          if (!l.active) return false;
          const s = l.period?.start;
          const e = l.period?.end || s;
          if (!s) return false;
          return tStart <= e && tEnd >= s;
        });
        if (crossOverlaps.length > 0) {
          setCrossOverlapNotice({
            triggerLoc: { ...targetLoc, period: newPeriod },
            triggerType: targetLoc.locType,
            oppositeType,
            overlappingLocs: crossOverlaps,
            selectedToPause: crossOverlaps.map(l => l.id),
          });
        }
      }
    };
    const removeLoc = (id) => {
      const loc = locs.find(l => l.id === id);
      if (loc?.isMain) {
        alert('메인 활동지는 삭제할 수 없습니다. 다른 지역을 메인으로 지정한 후 삭제해주세요.');
        return;
      }
      const remaining = locs.filter(l => l.id !== id);
      saveProfileData({ ...profile, locations: remaining });
      // pending 기간도 정리
      const nextPending = { ...pendingPeriods };
      delete nextPending[id];
      setPendingPeriods(nextPending);
    };
    const isHmkPartnerArtist = !!profile?.has_hmk_partner;

    // ── 타 지역 추가 시 메인 활동지 중단 확인 ──
    // cross-type: 국내 메인 → 해외 추가 / 해외 메인 → 국내 추가
    const addSubLocation = (newLoc) => {
      if (mainLoc) {
        const isCrossType = mainLoc.locType !== newLoc.locType;
        // 메인 활동지가 이미 노출 off 상태면 팝업 불필요 → 바로 추가
        const mainAlreadyOff = mainLoc.active === false;
        if (isCrossType && !mainAlreadyOff) {
          // 메인과 같은 유형인 다른 지역들 (노출 해제 후보 — 이미 off인 지역 제외)
          const otherSameType = locs.filter(l => !l.isMain && l.locType === mainLoc.locType && l.active !== false);
          setMainPauseNotice({
            step: 'pauseMain',
            pendingLoc: newLoc,
            mainLocName: mainLoc.name,
            mainLocType: mainLoc.locType,
            otherSameTypeLocs: otherSameType,
            selectedToPause: otherSameType.map(l => l.id), // 기본값: 전부 선택
          });
        } else {
          // 같은 유형 또는 메인이 이미 off → 바로 추가
          saveProfileData({ ...profile, locations: [...locs, newLoc] });
        }
      } else {
        saveProfileData({ ...profile, locations: [...locs, newLoc] });
      }
    };

    // 팝업 내 타 지역 체크박스 토글
    const togglePauseLoc = (locId) => {
      if (!mainPauseNotice) return;
      const selected = mainPauseNotice.selectedToPause || [];
      const next = selected.includes(locId)
        ? selected.filter(id => id !== locId)
        : [...selected, locId];
      setMainPauseNotice({ ...mainPauseNotice, selectedToPause: next });
    };

    const confirmMainPause = (pauseMain) => {
      if (!mainPauseNotice?.pendingLoc) return;

      if (mainPauseNotice.step === 'pauseMain') {
        if (pauseMain) {
          const otherSameType = mainPauseNotice.otherSameTypeLocs || [];
          if (otherSameType.length > 0) {
            // Step 2로 이동: 타 지역 중단 확인
            setMainPauseNotice({ ...mainPauseNotice, step: 'pauseOthers', pauseMainFlag: true });
            return;
          }
          // 타 지역 없음 → 바로 저장
          const newLoc = { ...mainPauseNotice.pendingLoc, pauseMain: true };
          saveProfileData({ ...profile, locations: [...locs, newLoc] });
          setMainPauseNotice(null);
          showSaved(`메인 활동지(${mainLoc?.name}) 활동이 해당 기간 중단됩니다`);
        } else {
          // 병행
          const newLoc = { ...mainPauseNotice.pendingLoc, pauseMain: false };
          saveProfileData({ ...profile, locations: [...locs, newLoc] });
          setMainPauseNotice(null);
        }
      } else if (mainPauseNotice.step === 'pauseOthers') {
        // 선택된 타 지역 고객 노출 해제
        const selectedIds = mainPauseNotice.selectedToPause || [];
        const newLoc = { ...mainPauseNotice.pendingLoc, pauseMain: true };
        const updatedLocs = locs.map(l => {
          if (selectedIds.includes(l.id)) {
            return { ...l, active: false };
          }
          return l;
        });
        saveProfileData({ ...profile, locations: [...updatedLocs, newLoc] });
        setMainPauseNotice(null);
        const pausedCount = selectedIds.length;
        if (pausedCount > 0) {
          showSaved(`메인 활동지 + ${pausedCount}개 지역 노출 해제 완료 ✓`);
        } else {
          showSaved(`메인 활동지(${mainLoc?.name}) 활동이 해당 기간 중단됩니다`);
        }
      }
    };

    const addDomestic = () => {
      if (domestic.length >= MAX) return;
      const usedDom = domestic.map(l => l.regionId);
      const r = DOMESTIC_REGIONS.find(r => !usedDom.includes(r.id)) || DOMESTIC_REGIONS[0];
      const newLoc = { id: genId(), locType: 'domestic', regionId: r.id, name: r.ko, nameEn: r.en, active: true, isMain: locs.length === 0, period: { start: '', end: '' } };
      if (locs.length === 0) {
        // 첫 지역은 자동으로 메인
        saveProfileData({ ...profile, locations: [...locs, newLoc] });
      } else if (isHmkPartnerArtist) {
        setHmkLocNotice({ step: 'ask', pendingLoc: newLoc });
      } else {
        addSubLocation(newLoc);
      }
    };
    const addOverseas = (type = artistType) => {
      const usedOvs = overseas.map(l => l.regionId);
      const r = OVERSEAS_REGIONS.find(r => !usedOvs.includes(r.id)) || OVERSEAS_REGIONS[0];
      const newLoc = { id: genId(), locType: 'overseas', regionId: r.id, name: r.ko, nameEn: r.en, active: true, isMain: false, period: { start: '', end: '' } };
      setOverseasNotice({ type, pendingLoc: newLoc });
    };
    const confirmOverseas = () => {
      if (!overseasNotice?.pendingLoc) return;
      if (isHmkPartnerArtist) {
        setHmkLocNotice({ step: 'ask', pendingLoc: overseasNotice.pendingLoc });
        setOverseasNotice(null);
      } else {
        addSubLocation(overseasNotice.pendingLoc);
        setOverseasNotice(null);
      }
    };


    const LocationCard = ({ loc }) => {
      const isDom = loc.locType === 'domestic';
      const regions = isDom ? DOMESTIC_REGIONS : OVERSEAS_REGIONS;
      const isMain = !!loc.isMain;
      const usedByOthers = locs.filter(l => l.id !== loc.id && l.locType === loc.locType).map(l => l.regionId);

      // ── 미저장 날짜 (pending) vs 저장된 날짜 ──
      const pending = pendingPeriods[loc.id];
      const displayStart = pending ? pending.start : (loc.period?.start ?? '');
      const displayEnd   = pending ? pending.end   : (loc.period?.end ?? '');
      const savedStart = loc.period?.start ?? '';
      const savedEnd   = loc.period?.end ?? '';
      const hasUnsaved = !isMain && pending && (pending.start !== savedStart || pending.end !== savedEnd);

      const setPendingField = (field, val) => {
        const cur = pendingPeriods[loc.id] || { start: savedStart, end: savedEnd };
        setPendingPeriods({ ...pendingPeriods, [loc.id]: { ...cur, [field]: val } });
      };

      const savePeriod = () => {
        if (!pending) return;
        saveLocPeriodFull(loc.id, { start: pending.start, end: pending.end });
        const next = { ...pendingPeriods };
        delete next[loc.id];
        setPendingPeriods(next);
        showSaved(`${loc.name} 활동 기간 저장 완료 ✓`);
      };

      const discardPending = () => {
        const next = { ...pendingPeriods };
        delete next[loc.id];
        setPendingPeriods(next);
      };

      const isActive = !!loc.active;

      return (
        <div style={{
          border: `1px solid ${hasUnsaved ? 'rgba(100,180,255,0.5)' : isMain ? 'var(--gold)' : isActive ? 'var(--gold-border)' : 'rgba(136,136,136,0.3)'}`,
          background: hasUnsaved ? 'rgba(100,180,255,0.03)' : isMain ? 'rgba(232,160,32,0.04)' : isActive ? 'var(--bg2)' : 'rgba(136,136,136,0.03)',
          padding: '20px 24px', position: 'relative',
          opacity: isActive || isMain ? 1 : 0.7,
          transition: 'all 0.2s',
        }}>
          <Corners />
          {/* 메인 활동지 뱃지 */}
          {isMain && (
            <div style={{ position: 'absolute', top: 10, right: 16, fontSize: 9, fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', color: 'var(--gold)', background: 'rgba(232,160,32,0.12)', padding: '3px 10px', border: '1px solid var(--gold-border)', textTransform: 'uppercase' }}>
              ★ 메인 활동지
            </div>
          )}
          {/* 미저장 뱃지 */}
          {hasUnsaved && !isMain && (
            <div style={{ position: 'absolute', top: 10, right: 16, fontSize: 9, fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', color: 'rgba(100,180,255,0.9)', background: 'rgba(100,180,255,0.08)', padding: '3px 10px', border: '1px solid rgba(100,180,255,0.3)', textTransform: 'uppercase' }}>
              미저장
            </div>
          )}
          {/* 지역 선택 — 클릭하면 피커 열림 */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{isDom ? '국내 지역' : '해외 도시'}</div>
            <button
              onClick={() => {
                if (locPickerOpen === loc.id) { setLocPickerOpen(null); setLocPickerCountry(null); setLocPickerSearch(''); }
                else { setLocPickerOpen(loc.id); setLocPickerCountry(isDom ? 'KR' : null); setLocPickerSearch(''); }
              }}
              style={{ ...selectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              <span>
                {isDom
                  ? `${loc.name} (${loc.nameEn || ''})`
                  : `${COUNTRY_FLAG[loc.country || OVERSEAS_REGIONS.find(r=>r.id===loc.regionId)?.country] ?? ''} ${loc.name} · ${loc.nameEn || ''}`
                }
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>{locPickerOpen === loc.id ? '▲' : '▼'}</span>
            </button>

            {/* ── 피커 드롭다운 패널 ── */}
            {locPickerOpen === loc.id && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg)', border: '1px solid var(--gold-border)', maxHeight: 340, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>

                {/* 국내: 바로 도시 목록 + 검색 */}
                {isDom && (() => {
                  const favCities = profile?.favCities || [];
                  const q = locPickerSearch.toLowerCase();
                  const filtered = DOMESTIC_REGIONS.filter(r =>
                    !q || r.ko.includes(q) || r.en.toLowerCase().includes(q)
                  );
                  // 즐겨찾기를 위로
                  const sorted = [...filtered].sort((a, b) => {
                    const aFav = favCities.includes(a.id) ? 0 : 1;
                    const bFav = favCities.includes(b.id) ? 0 : 1;
                    return aFav - bFav;
                  });
                  return (<>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                      <input
                        ref={locSearchRef}
                        defaultValue={locPickerSearch}
                        onCompositionStart={() => { composingRef.current = true; }}
                        onCompositionEnd={e => { composingRef.current = false; setLocPickerSearch(e.target.value); }}
                        onChange={e => { if (!composingRef.current) setLocPickerSearch(e.target.value); }}
                        placeholder="도시 검색... (예: 서울, Seoul)"
                        autoFocus
                        style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-serif)' }}
                      />
                    </div>
                    {sorted.map(r => {
                      const taken = usedByOthers.includes(r.id);
                      const selected = loc.regionId === r.id;
                      const isFav = favCities.includes(r.id);
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.4 : 1, background: selected ? 'rgba(232,160,32,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onClick={() => {
                            if (taken) return;
                            const next = locs.map(l => l.id === loc.id ? { ...l, regionId: r.id, name: r.ko, nameEn: r.en } : l);
                            saveProfileData({ ...profile, locations: next });
                            setLocPickerOpen(null); setLocPickerSearch('');
                          }}
                        >
                          <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-serif)', color: selected ? 'var(--gold)' : 'var(--text)' }}>
                            {r.ko} ({r.en}){taken ? ' — 사용 중' : ''}
                          </span>
                          <button onClick={e => {
                            e.stopPropagation();
                            const next = isFav ? favCities.filter(id => id !== r.id) : [...favCities, r.id];
                            saveProfileData({ ...profile, favCities: next });
                          }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: isFav ? 'var(--gold)' : 'rgba(136,136,136,0.3)', padding: '0 4px' }}>
                            {isFav ? '★' : '☆'}
                          </button>
                        </div>
                      );
                    })}
                  </>);
                })()}

                {/* 해외: Step1 나라 선택 → Step2 도시 선택 */}
                {!isDom && !locPickerCountry && (() => {
                  const favCountries = profile?.favCountries || [];
                  const q = locPickerSearch.toLowerCase();
                  // 전세계 모든 나라 (한국 제외) 표시
                  const countryList = Object.entries(COUNTRIES).filter(([code]) => code !== 'KR');
                  const filtered = countryList.filter(([code, c]) =>
                    !q || c.ko.includes(q) || c.en.toLowerCase().includes(q) || code.toLowerCase().includes(q)
                  );
                  const sorted = [...filtered].sort((a, b) => {
                    const aFav = favCountries.includes(a[0]) ? 0 : 1;
                    const bFav = favCountries.includes(b[0]) ? 0 : 1;
                    return aFav - bFav;
                  });
                  return (<>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                      <input
                        ref={locSearchRef}
                        defaultValue={locPickerSearch}
                        onCompositionStart={() => { composingRef.current = true; }}
                        onCompositionEnd={e => { composingRef.current = false; setLocPickerSearch(e.target.value); }}
                        onChange={e => { if (!composingRef.current) setLocPickerSearch(e.target.value); }}
                        placeholder="나라 검색... (예: 대한민국, Republic of Korea, KR)"
                        autoFocus
                        style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-serif)' }}
                      />
                    </div>
                    {sorted.map(([code, c]) => {
                      const isFav = favCountries.includes(code);
                      const cityCount = (OVERSEAS_BY_COUNTRY[code] || []).length;
                      return (
                        <div key={code} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onClick={() => { setLocPickerCountry(code); setLocPickerSearch(''); if (locSearchRef.current) locSearchRef.current.value = ''; }}
                        >
                          <span style={{ fontSize: 16, marginRight: 8 }}>{c.flag}</span>
                          <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                            {c.ko} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({c.en})</span>
                            {cityCount > 0 && <span style={{ color: 'rgba(232,160,32,0.5)', fontSize: 10, marginLeft: 6 }}>{cityCount}개 도시</span>}
                          </span>
                          <button onClick={e => {
                            e.stopPropagation();
                            const next = isFav ? favCountries.filter(id => id !== code) : [...favCountries, code];
                            saveProfileData({ ...profile, favCountries: next });
                          }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: isFav ? 'var(--gold)' : 'rgba(136,136,136,0.3)', padding: '0 4px' }}>
                            {isFav ? '★' : '☆'}
                          </button>
                          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>→</span>
                        </div>
                      );
                    })}
                  </>);
                })()}

                {/* 해외: Step2 도시 선택 (나라 선택 후) */}
                {!isDom && locPickerCountry && (() => {
                  const countryInfo = COUNTRIES[locPickerCountry] || {};
                  const cities = OVERSEAS_BY_COUNTRY[locPickerCountry] || [];
                  const favCities = profile?.favCities || [];
                  const q = locPickerSearch.toLowerCase();
                  const filtered = cities.filter(r =>
                    !q || r.ko.includes(q) || r.en.toLowerCase().includes(q)
                  );
                  const sorted = [...filtered].sort((a, b) => {
                    const aFav = favCities.includes(a.id) ? 0 : 1;
                    const bFav = favCities.includes(b.id) ? 0 : 1;
                    return aFav - bFav;
                  });
                  return (<>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <button onClick={() => { setLocPickerCountry(null); setLocPickerSearch(''); if (locSearchRef.current) locSearchRef.current.value = ''; }}
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
                          ← 나라 목록
                        </button>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
                          {countryInfo.flag} {countryInfo.ko}
                        </span>
                      </div>
                      <input
                        ref={locSearchRef}
                        defaultValue={locPickerSearch}
                        onCompositionStart={() => { composingRef.current = true; }}
                        onCompositionEnd={e => { composingRef.current = false; setLocPickerSearch(e.target.value); }}
                        onChange={e => { if (!composingRef.current) setLocPickerSearch(e.target.value); }}
                        placeholder="도시 검색... (예: Tokyo, 도쿄)"
                        autoFocus
                        style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-serif)' }}
                      />
                    </div>
                    {sorted.map(r => {
                      const taken = usedByOthers.includes(r.id);
                      const selected = loc.regionId === r.id;
                      const isFav = favCities.includes(r.id);
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.4 : 1, background: selected ? 'rgba(232,160,32,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onClick={() => {
                            if (taken) return;
                            const next = locs.map(l => l.id === loc.id ? { ...l, regionId: r.id, name: r.ko, nameEn: r.en, country: r.country } : l);
                            saveProfileData({ ...profile, locations: next });
                            setLocPickerOpen(null); setLocPickerCountry(null); setLocPickerSearch('');
                          }}
                        >
                          <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-serif)', color: selected ? 'var(--gold)' : 'var(--text)' }}>
                            {r.ko} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({r.en})</span>
                            {taken ? <span style={{ color: 'rgba(136,136,136,0.5)', marginLeft: 6 }}>— 사용 중</span> : ''}
                          </span>
                          <button onClick={e => {
                            e.stopPropagation();
                            const next = isFav ? favCities.filter(id => id !== r.id) : [...favCities, r.id];
                            saveProfileData({ ...profile, favCities: next });
                          }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: isFav ? 'var(--gold)' : 'rgba(136,136,136,0.3)', padding: '0 4px' }}>
                            {isFav ? '★' : '☆'}
                          </button>
                        </div>
                      );
                    })}
                    {sorted.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                        검색 결과 없음
                      </div>
                    )}
                  </>);
                })()}
              </div>
            )}
          </div>
          {/* 활동 기간 — 메인 활동지는 표시 안 함 (항상 상주) */}
          {!isMain && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: hasUnsaved ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>시작일</div>
                  <DatePicker value={displayStart} onChange={v => setPendingField('start', v)} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>종료일</div>
                  <DatePicker value={displayEnd} onChange={v => setPendingField('end', v)} />
                </div>
              </div>
              {/* 저장 / 취소 버튼 */}
              {hasUnsaved && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={savePeriod}
                    style={{ fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: '#fff', background: 'var(--gold)', border: 'none', padding: '7px 20px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.target.style.opacity = '0.85'}
                    onMouseLeave={e => e.target.style.opacity = '1'}>
                    저장
                  </button>
                  <button onClick={discardPending}
                    style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '6px 14px', cursor: 'pointer' }}>
                    취소
                  </button>
                  <span style={{ fontSize: 10, color: 'rgba(100,180,255,0.7)', marginLeft: 4 }}>
                    * 저장을 눌러야 활동 기간이 반영됩니다
                  </span>
                </div>
              )}
              {/* 저장된 기간 표시 */}
              {!hasUnsaved && savedStart && savedEnd && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'rgba(100,200,100,0.8)' }}>●</span> 일정 저장됨: {savedStart} ~ {savedEnd}{loc.period?.savedAt ? ` (저장한 날짜: ${loc.period.savedAt})` : ''}
                </div>
              )}
            </div>
          )}
          {isMain && (
            <div style={{ fontSize: 12, color: 'rgba(232,160,32,0.7)', marginBottom: 14, lineHeight: 1.6 }}>
              상시 활동 지역 — 날짜 제한 없음
            </div>
          )}
          {/* 고객 노출 토글 스위치 + 메인 지정 + 삭제 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* 토글 스위치 */}
              <div
                onClick={() => {
                  const turningOn = !isActive;
                  // OFF→ON 전환 시, 시작일/종료일 필수 (메인 제외)
                  if (turningOn && !isMain && (!loc.period?.start || !loc.period?.end)) {
                    alert('시작일과 종료일을 먼저 입력해주세요.');
                    return;
                  }
                  // OFF→ON 전환 시, 최대 3개 겹침 제한 체크
                  if (turningOn && !isMain && loc.period?.start) {
                    // 본인을 active로 전환한 상태로 시뮬레이션
                    const simLocs = locs.map(l => l.id === loc.id ? { ...l, active: true } : l);
                    const overlapCount = countOverlappingLocs(loc.id, loc.period, simLocs);
                    if (overlapCount > MAX_OVERLAP) {
                      alert(`같은 기간에 최대 ${MAX_OVERLAP}개 지역까지만 겹칠 수 있습니다.\n이 지역을 노출하면 최대 ${overlapCount}개가 겹칩니다. 다른 지역의 노출을 먼저 해제해주세요.`);
                      return;
                    }
                  }
                  updateLoc(loc.id, 'active', turningOn);
                  // OFF→ON 전환 시, 반대 타입(해외↔국내) 지역과 기간 겹침 체크
                  if (turningOn && !isMain && loc.period?.start) {
                    const tStart = loc.period.start;
                    const tEnd = loc.period.end || tStart;
                    const oppositeType = loc.locType === 'overseas' ? 'domestic' : 'overseas';
                    const crossOverlaps = locs.filter(l => {
                      if (l.id === loc.id) return false;
                      if (l.isMain) return false;
                      if (l.locType !== oppositeType) return false;
                      if (!l.active) return false;
                      const s = l.period?.start;
                      const e = l.period?.end || s;
                      if (!s) return false;
                      return tStart <= e && tEnd >= s;
                    });
                    if (crossOverlaps.length > 0) {
                      setCrossOverlapNotice({
                        triggerLoc: loc,
                        triggerType: loc.locType,
                        oppositeType,
                        overlappingLocs: crossOverlaps,
                        selectedToPause: crossOverlaps.map(l => l.id),
                      });
                    }
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{
                  width: 40, height: 22, borderRadius: 11, position: 'relative',
                  background: isActive ? 'rgba(80,200,80,0.25)' : 'rgba(232,80,80,0.15)',
                  border: `1px solid ${isActive ? 'rgba(80,200,80,0.4)' : 'rgba(232,80,80,0.3)'}`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 8, position: 'absolute', top: 2,
                    left: isActive ? 21 : 2,
                    background: isActive ? '#50c850' : '#e85d5d',
                    transition: 'all 0.2s',
                    boxShadow: `0 1px 3px ${isActive ? 'rgba(80,200,80,0.4)' : 'rgba(232,80,80,0.4)'}`,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', color: isActive ? 'rgba(80,200,80,0.9)' : 'rgba(232,80,80,0.8)' }}>
                  {isActive ? '고객 노출 중' : '노출 OFF'}
                </span>
              </div>
              {!isMain && (
                <button onClick={() => setAsMain(loc.id)} style={{ fontSize: 11, color: 'var(--gold)', background: 'transparent', border: '1px solid var(--gold-border)', padding: '3px 10px', cursor: 'pointer' }}>
                  메인으로 지정
                </button>
              )}
            </div>
            {!isMain && (
              <button onClick={() => removeLoc(loc.id)} style={{ fontSize: 11, color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer' }}>삭제</button>
            )}
          </div>
          {/* 시작일/종료일 미입력 시 안내 */}
          {!isMain && (!loc.period?.start || !loc.period?.end) && loc.active !== false && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(232,160,32,0.05)', border: '1px solid rgba(232,160,32,0.2)', fontSize: 11, color: 'var(--gold)' }}>
              ℹ 시작일과 종료일을 입력해야 고객에게 노출됩니다
            </div>
          )}
          {!isMain && loc.period?.start && loc.period?.end && !loc.pauseMain && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(232,160,32,0.05)', border: '1px solid var(--gold-border)', fontSize: 11, color: 'var(--gold)' }}>
              ◉ 출장 활동: {loc.period.start} ~ {loc.period.end} (메인 활동지 병행)
            </div>
          )}
        </div>
      );
    };

    return (
      <div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28, maxWidth: 620, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {!mainLoc && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e85d5d', display: 'inline-block', flexShrink: 0, marginTop: 6 }} />}
          <div>
            <strong style={{ color: 'var(--gold)' }}>메인 활동지</strong>를 반드시 1곳 지정해주세요 (항상 상주하며 촬영하는 곳).<br/>
            출장 지역은 날짜 범위를 설정하여 해당 기간에만 고객에게 노출됩니다.<br/>
            <strong style={{ color: 'var(--text)' }}>국내 최대 3곳, 해외 최대 3곳</strong>까지 추가 가능합니다.
          </div>
        </div>

        {/* 메인 활동지 미지정 경고 */}
        {locs.length > 0 && !mainLoc && (
          <div style={{ marginBottom: 20, padding: '14px 20px', background: 'rgba(232,80,80,0.06)', border: '1px solid rgba(232,80,80,0.25)', fontSize: 12, color: '#e85d5d', lineHeight: 1.7 }}>
            ⚠ 메인 활동지가 지정되지 않았습니다. 아래 지역 중 하나를 "메인으로 지정" 해주세요.
          </div>
        )}

        {/* 국내 */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.15em', color: 'var(--text)', textTransform: 'uppercase' }}>
              국내 활동 지역 <span style={{ color: 'var(--muted)', fontSize: 11 }}>({domestic.length}/{MAX})</span>
            </div>
            {domestic.length < MAX && (
              <button className="btn-outline" style={{ fontSize: 11, padding: '6px 14px' }} onClick={addDomestic}>
                + 국내 지역 추가
              </button>
            )}
          </div>
          {domestic.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13 }}>
              국내 활동 지역을 추가해주세요 (최소 1곳은 메인 활동지로 지정 필요)
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {domestic.map(loc => <LocationCard key={loc.id} loc={loc} />)}
          </div>
        </div>

        {/* 해외 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.15em', color: 'var(--text)', textTransform: 'uppercase' }}>
              해외 활동 지역 <span style={{ color: 'var(--muted)', fontSize: 11 }}>({overseas.length}/{MAX})</span>
            </div>
            {overseas.length < MAX && (
              <button className="btn-outline" style={{ fontSize: 11, padding: '6px 14px' }} onClick={() => addOverseas(artistType)}>
                + 해외 지역 추가
              </button>
            )}
          </div>
          {overseas.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13 }}>
              해외 활동 지역이 없습니다 (선택 사항)
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {overseas.map(loc => <LocationCard key={loc.id} loc={loc} />)}
          </div>
        </div>

        {/* 메인 활동지 중단 확인 팝업 — Step 1: 메인 중단? */}
        {mainPauseNotice?.step === 'pauseMain' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1002, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold-border)', maxWidth: 480, width: '100%', padding: '36px 32px', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                메인 활동지 확인
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.05em', marginBottom: 16, lineHeight: 1.7 }}>
                출장 기간 동안 메인 활동지({mainPauseNotice.mainLocName})에서의 활동을 중단하시겠습니까?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 24 }}>
                "중단"을 선택하면 해당 기간 메인 활동지에서 고객에게 노출되지 않습니다.<br/>
                "병행"을 선택하면 두 지역 모두 노출됩니다.
              </p>
              <p style={{ fontSize: 12, color: 'rgba(232,80,80,0.8)', lineHeight: 1.6, marginBottom: 24, padding: '10px 14px', background: 'rgba(232,80,80,0.05)', border: '1px solid rgba(232,80,80,0.15)' }}>
                ⚠ 하루에 두 지역 촬영은 노쇼·사고 위험이 있습니다. 같은 날 두 지역에 예약이 잡힐 경우, 두 번째 예약은 작가님의 수동 승인이 필요합니다.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => confirmMainPause(true)}>
                  중단 (안전)
                </button>
                <button className="btn-outline" style={{ flex: 1 }} onClick={() => confirmMainPause(false)}>
                  병행 (두 지역 노출)
                </button>
                <button className="btn-ghost" style={{ padding: '0 12px' }} onClick={() => setMainPauseNotice(null)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메인 활동지 중단 확인 팝업 — Step 2: 타 지역도 중단? */}
        {mainPauseNotice?.step === 'pauseOthers' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1002, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold-border)', maxWidth: 520, width: '100%', padding: '36px 32px', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                타 {mainPauseNotice.mainLocType === 'domestic' ? '국내' : '해외'} 지역 노출 확인
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.05em', marginBottom: 12, lineHeight: 1.7 }}>
                출장 기간 동안 {mainPauseNotice.mainLocType === 'domestic' ? '국내' : '해외'} 타 지역의 고객 노출도 해제하시겠습니까?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                메인 활동지 외에 {mainPauseNotice.mainLocType === 'domestic' ? '국내' : '해외'}에서 활동 중인 다른 지역도 고객 노출을 해제할 수 있습니다.<br/>
                체크된 지역은 <strong style={{ color: 'rgba(232,160,32,0.9)' }}>"고객에게 노출"이 자동 해제</strong>되어 검색에 표시되지 않습니다.
              </p>

              {/* 타 지역 체크박스 목록 */}
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(mainPauseNotice.otherSameTypeLocs || []).map(loc => {
                  const checked = (mainPauseNotice.selectedToPause || []).includes(loc.id);
                  return (
                    <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${checked ? 'rgba(232,160,32,0.3)' : 'var(--border)'}`, background: checked ? 'rgba(232,160,32,0.04)' : 'var(--bg)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={() => togglePauseLoc(loc.id)} style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: checked ? 'var(--gold)' : 'var(--text)' }}>
                          {loc.name} {loc.nameEn && `(${loc.nameEn})`}
                        </div>
                        {loc.period?.start && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            활동 기간: {loc.period.start} ~ {loc.period.end || '미정'}
                          </div>
                        )}
                      </div>
                      {checked && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>노출 해제</span>}
                    </label>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: 'rgba(232,160,32,0.7)', lineHeight: 1.6, marginBottom: 20 }}>
                * 노출이 해제된 지역은 고객 검색에 표시되지 않습니다.<br/>
                * 나중에 해당 지역의 "고객에게 노출"을 다시 체크하면 언제든 복원할 수 있습니다.
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => confirmMainPause(true)}>
                  확인 — 선택한 지역 노출 해제
                </button>
                <button className="btn-outline" style={{ flex: 1 }} onClick={() => {
                  // 타 지역 유지, 메인만 중단 → 바로 저장
                  const newLoc = { ...mainPauseNotice.pendingLoc, pauseMain: true };
                  saveProfileData({ ...profile, locations: [...locs, newLoc] });
                  setMainPauseNotice(null);
                  showSaved(`메인 활동지(${mainLoc?.name}) 활동이 해당 기간 중단됩니다`);
                }}>
                  타 지역 유지 (메인만 중단)
                </button>
                <button className="btn-ghost" style={{ padding: '0 12px' }} onClick={() => setMainPauseNotice(null)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 해외↔국내 기간 겹침 → 타 지역 중단 확인 팝업 */}
        {crossOverlapNotice && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1003, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold-border)', maxWidth: 520, width: '100%', padding: '36px 32px', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                기간 겹침 감지 — {crossOverlapNotice.oppositeType === 'domestic' ? '국내' : '해외'} 지역 노출 확인
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.05em', marginBottom: 12, lineHeight: 1.7 }}>
                {crossOverlapNotice.triggerType === 'overseas' ? '해외' : '국내'} 출장({crossOverlapNotice.triggerLoc.name}) 기간이<br/>
                {crossOverlapNotice.oppositeType === 'domestic' ? '국내' : '해외'} 타 지역 활동 기간과 겹칩니다.
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 8 }}>
                <span style={{ color: 'var(--gold)' }}>{crossOverlapNotice.triggerLoc.name}</span> 활동 기간: {crossOverlapNotice.triggerLoc.period.start} ~ {crossOverlapNotice.triggerLoc.period.end || crossOverlapNotice.triggerLoc.period.start}
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                겹치는 기간 동안 아래 {crossOverlapNotice.oppositeType === 'domestic' ? '국내' : '해외'} 지역의 고객 노출을 해제하시겠습니까?<br/>
                체크된 지역은 <strong style={{ color: 'rgba(232,160,32,0.9)' }}>"고객에게 노출"이 자동 해제</strong>되어 해당 기간 검색에 표시되지 않습니다.
              </p>

              {/* 겹치는 지역 체크박스 목록 */}
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(crossOverlapNotice.overlappingLocs || []).map(loc => {
                  const checked = (crossOverlapNotice.selectedToPause || []).includes(loc.id);
                  return (
                    <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${checked ? 'rgba(232,160,32,0.3)' : 'var(--border)'}`, background: checked ? 'rgba(232,160,32,0.04)' : 'var(--bg)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const sel = crossOverlapNotice.selectedToPause || [];
                        const next = sel.includes(loc.id) ? sel.filter(id => id !== loc.id) : [...sel, loc.id];
                        setCrossOverlapNotice({ ...crossOverlapNotice, selectedToPause: next });
                      }} style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: checked ? 'var(--gold)' : 'var(--text)' }}>
                          {loc.name} {loc.nameEn && `(${loc.nameEn})`}
                        </div>
                        {loc.period?.start && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            활동 기간: {loc.period.start} ~ {loc.period.end || '미정'}
                          </div>
                        )}
                      </div>
                      {checked && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>노출 해제</span>}
                    </label>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: 'rgba(232,160,32,0.7)', lineHeight: 1.6, marginBottom: 20 }}>
                * 노출이 해제된 지역은 고객 검색에 표시되지 않습니다.<br/>
                * 나중에 해당 지역의 "고객에게 노출"을 다시 체크하면 언제든 복원할 수 있습니다.
              </p>

              {/* 4개 이상 노출 시 경고 */}
              {(() => {
                const activeExposedCount = locs.filter(l => l.active !== false && l.period?.start && l.period?.end).length;
                const MAX_EXPOSED = 3;
                const overLimit = activeExposedCount > MAX_EXPOSED;
                const selectedIds = crossOverlapNotice.selectedToPause || [];
                const wouldRemain = activeExposedCount - selectedIds.length;
                return (
                  <>
                    {overLimit && selectedIds.length === 0 && (
                      <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(232,80,80,0.08)', border: '1px solid rgba(232,80,80,0.3)', fontSize: 12, color: '#e85d5d', lineHeight: 1.7 }}>
                        ⚠ 고객에게 노출되는 지역이 {activeExposedCount}개입니다. 최대 {MAX_EXPOSED}개까지 동시 노출이 가능합니다.<br/>
                        최소 {activeExposedCount - MAX_EXPOSED}개 지역의 노출을 해제해주세요.
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
                        if (selectedIds.length > 0) {
                          const updatedLocs = locs.map(l => selectedIds.includes(l.id) ? { ...l, active: false } : l);
                          saveProfileData({ ...profile, locations: updatedLocs });
                          showSaved(`${selectedIds.length}개 지역 고객 노출 해제 완료 ✓`);
                        }
                        setCrossOverlapNotice(null);
                      }}>
                        선택한 지역 노출 해제
                      </button>
                      <button
                        className="btn-outline"
                        style={{ flex: 1, opacity: overLimit && wouldRemain > MAX_EXPOSED ? 0.4 : 1 }}
                        disabled={overLimit && wouldRemain > MAX_EXPOSED}
                        onClick={() => {
                          if (overLimit && wouldRemain > MAX_EXPOSED) {
                            alert(`고객에게 노출되는 지역이 ${activeExposedCount}개입니다.\n최대 ${MAX_EXPOSED}개까지 동시 노출이 가능합니다.\n최소 ${activeExposedCount - MAX_EXPOSED}개 지역의 노출을 해제해주세요.`);
                            return;
                          }
                          setCrossOverlapNotice(null);
                        }}
                      >
                        유지 (변경 없음)
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* 해외 안내 팝업 */}
        {overseasNotice && (() => {
          const notice = OVERSEAS_NOTICE[overseasNotice.type] ?? OVERSEAS_NOTICE.photographer;
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold-border)', maxWidth: 520, width: '100%', padding: '40px 36px', position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}>
                <Corners />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                  해외 활동 안내
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 24 }}>
                  {notice.title}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
                  {notice.body.filter(Boolean).map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 13, flexShrink: 0, marginTop: 2 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, margin: 0 }}>{text}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={confirmOverseas}>
                    {notice.confirm}
                  </button>
                  <button className="btn-outline" onClick={() => setOverseasNotice(null)}>
                    취소
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* H&M 동행 여부 팝업 — 자체 H&M 동행 작가 전용 */}
        {hmkLocNotice?.step === 'ask' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold-border)', maxWidth: 480, width: '100%', padding: '40px 36px', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                H&M 동행 확인
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 16 }}>
                이 지역에서도 H&M 아티스트가 동행하시나요?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28 }}>
                작가님은 자체 H&M 동행 작가로 등록되어 있습니다.<br/>
                추가하려는 지역에서도 H&M 아티스트와 함께 활동하실 예정인지 확인해 주세요.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    saveProfileData({ ...profile, locations: [...locs, { ...hmkLocNotice.pendingLoc, hasHmkPartner: true }] });
                    setHmkLocNotice(null);
                  }}
                >
                  ✓ 네, 이 지역에서도 H&M 아티스트와 함께 활동합니다
                </button>
                <button
                  className="btn-outline"
                  style={{ borderColor: 'rgba(240,172,42,0.4)', color: 'var(--muted)' }}
                  onClick={() => setHmkLocNotice({ ...hmkLocNotice, step: 'warn' })}
                >
                  아니요, 이 지역에서는 H&M 동행 없이 활동합니다
                </button>
                <button
                  style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4 }}
                  onClick={() => setHmkLocNotice(null)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* H&M 미동행 안내 팝업 */}
        {hmkLocNotice?.step === 'warn' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid rgba(240,172,42,0.4)', maxWidth: 480, width: '100%', padding: '40px 36px', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                상품 등록 안내
              </div>
              <div style={{ fontSize: 28, marginBottom: 16 }}>💡</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, letterSpacing: '0.04em', marginBottom: 16 }}>
                헤어메이크업 비용이 제외된 상품으로 등록해 주세요
              </h2>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 24 }}>
                <p style={{ marginBottom: 12 }}>
                  이 지역에서 H&M 아티스트가 동행하지 않는 경우,<br/>
                  고객이 <strong style={{ color: 'var(--text)' }}>현지 H&M 아티스트를 직접 섭외</strong>할 수 있도록<br/>
                  <strong style={{ color: 'var(--gold)' }}>헤어메이크업 비용이 제외된 촬영 전용 상품</strong>으로 등록 바랍니다.
                </p>
                <p>
                  상품 등록 시 "H&M 미포함" 옵션을 선택하면 고객 화면에도 명확히 표시되어<br/>
                  혼선 없이 예약을 받으실 수 있습니다.
                </p>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  saveProfileData({ ...profile, locations: [...locs, { ...hmkLocNotice.pendingLoc, hasHmkPartner: false }] });
                  setHmkLocNotice(null);
                }}
              >
                확인했습니다. 지역을 추가합니다 →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── TAB: 예약 요청 (pending → 수락/거절) ──────────────────────────
  const renderBookingsTab = () => {
    const fmt = (n) => Number(n).toLocaleString();
    const handleApprove = async (id) => {
      const { error } = await approveBooking(id);
      if (!error) setPendingBookings(prev => prev.filter(b => b.id !== id));
    };
    const handleReject = async () => {
      if (!rejectTarget) return;
      const { error } = await rejectBooking(rejectTarget, rejectReason);
      if (!error) {
        setPendingBookings(prev => prev.filter(b => b.id !== rejectTarget));
        setRejectTarget(null);
        setRejectReason('');
      }
    };

    return (
      <div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28, maxWidth: 560 }}>
          고객이 결제 완료한 예약 요청 목록입니다.<br/>
          <strong style={{ color: 'var(--gold)' }}>48시간 이내에 수락 또는 거절해주세요.</strong> 미응답 시 예약은 <strong style={{ color: '#e85d5d' }}>자동 취소</strong>되고 고객에게 환불됩니다. (촬영일이 임박한 경우 더 일찍 마감될 수 있습니다)
        </div>

        {bookingsLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>불러오는 중...</div>
        )}

        {!bookingsLoading && pendingBookings.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
            <Corners />
            <div style={{ fontSize: 24, marginBottom: 12 }}>🎉</div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>대기 중인 예약 요청이 없습니다.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pendingBookings.map(b => (
            <div key={b.id} style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', padding: '24px 28px', position: 'relative' }}>
              <Corners />
              {/* 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ padding: '3px 10px', background: 'rgba(232,160,32,0.15)', border: '1px solid rgba(232,160,32,0.4)', color: 'var(--gold)', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.06em' }}>
                  확정 대기
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                  {b.date} · {b.time}
                </span>
              </div>
              {/* 정보 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: 4 }}>
                  {b.package_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  결제 금액: <span style={{ color: 'var(--gold)' }}>₩{fmt(b.total_price)}</span>
                </div>
                {b.toss_order_id && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-serif)' }}>
                    주문번호: {b.toss_order_id}
                  </div>
                )}
                {b.reschedule_request && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.25)', fontSize: 12, color: 'var(--muted)' }}>
                    📋 고객 메모: {b.reschedule_request}
                  </div>
                )}
              </div>
              {/* 버튼 */}
              {rejectTarget === b.id ? (
                <div>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="거절 사유를 입력해주세요 (고객에게 전달됩니다)"
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-body)', lineHeight: 1.6, marginBottom: 10 }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-primary" style={{ background: '#c53030', borderColor: '#c53030', fontSize: 12 }} onClick={handleReject}>
                      거절 확정
                    </button>
                    <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => handleApprove(b.id)}>
                    ✓ 수락 — 예약 확정
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 12, color: '#f56565', borderColor: 'rgba(245,101,101,0.4)' }} onClick={() => setRejectTarget(b.id)}>
                    거절
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── TAB 3: 작가 정보 (H&M, 포트폴리오) ────────────
  const [pfLocFilter, setPfLocFilter] = useState('all'); // 포트폴리오 지역 필터
  const [pfPickerOpen, setPfPickerOpen] = useState(null); // 포트폴리오 피커 열린 인덱스
  const [pfPickerCountry, setPfPickerCountry] = useState(null); // 포트폴리오 피커 선택된 나라
  const [pfPickerSearch, setPfPickerSearch] = useState('');
  const pfSearchRef = useRef(null);
  const pfComposingRef = useRef(false);
  const [expandedPfId, setExpandedPfId] = useState(null); // 확장된 포트폴리오 ID
  const [pfPreview, setPfPreview] = useState(false); // 포트폴리오 고객 미리보기
  const [expandedSnapId, setExpandedSnapId] = useState(null); // 확장된 스냅 상품 ID
  const [snapPreview, setSnapPreview] = useState(null); // 스냅 상품 미리보기 (idx or null)
  const renderInfoTab = () => {
    const portfolio = profile?.portfolio ?? [];

    // ── 새 포트폴리오 구조: { id, images: [url,...], coverIdx, caption, regionId } ──
    const addPortfolio = () => {
      const updated = {
        ...profile,
        portfolio: [...portfolio, { id: genId(), images: [], coverIdx: 0, caption: '', regionId: '' }],
      };
      saveProfile('photographer', artistId, updated);
      setProfileState(updated);
      // 토스트 없이 조용히 추가만 — 저장은 "포트폴리오 저장" 버튼으로
    };
    const updatePf = (idx, field, val) => {
      const next = portfolio.map((p, i) => i === idx ? { ...p, [field]: val } : p);
      const updated = { ...profile, portfolio: next };
      saveProfile('photographer', artistId, updated);
      setProfileState(updated);
      // 토스트 없이 — 저장은 "포트폴리오 저장" 버튼으로
    };
    const removePf = (idx) => {
      const updated = { ...profile, portfolio: portfolio.filter((_, i) => i !== idx) };
      saveProfile('photographer', artistId, updated);
      setProfileState(updated);
    };

    // 이미지 추가 (드래그앤드롭 / 클릭 업로드용) — 게시물당 최대 10장
    const addPfImages = async (idx, files) => {
      const pf = portfolio[idx];
      const currentImages = pf.images || (pf.url ? [pf.url] : []);
      const maxNew = Math.min(files.length, 10 - currentImages.length);
      if (maxNew <= 0) return;

      const newUrls = await uploadImagesToStorage(files, 'portfolios', maxNew);
      if (newUrls.length) updatePf(idx, 'images', [...currentImages, ...newUrls]);
    };
    const removePfImage = (pfIdx, imgIdx) => {
      const pf = portfolio[pfIdx];
      const images = [...(pf.images || [])];
      images.splice(imgIdx, 1);
      const newCover = pf.coverIdx >= images.length ? 0 : pf.coverIdx;
      const next = portfolio.map((p, i) => i === pfIdx ? { ...p, images, coverIdx: newCover } : p);
      const updated = { ...profile, portfolio: next };
      saveProfile('photographer', artistId, updated);
      setProfileState(updated);
    };
    const setCover = (pfIdx, imgIdx) => updatePf(pfIdx, 'coverIdx', imgIdx);

    // ── 대표 게시글 토글 (최대 5개) ──
    const featuredCount = portfolio.filter(pf => pf.featured).length;
    const toggleFeatured = (idx) => {
      const pf = portfolio[idx];
      if (pf.featured) {
        // 해제
        updatePf(idx, 'featured', false);
      } else if (featuredCount < 5) {
        // 설정
        updatePf(idx, 'featured', true);
      }
    };

    // 지역 목록 (포트폴리오에 사용되는 것들)
    const ALL_REGIONS = [...DOMESTIC_REGIONS.map(r => ({ ...r, locType: 'domestic' })), ...OVERSEAS_REGIONS.map(r => ({ ...r, locType: 'overseas' }))];
    const getRegionLabel = (id) => {
      const r = ALL_REGIONS.find(r => r.id === id);
      if (r) return `${r.ko} (${r.en})`;
      // WORLD_CITIES 검색
      for (const [, cities] of Object.entries(WORLD_CITIES)) {
        const c = cities.find(ct => ct.id === id);
        if (c) return `${c.ko} (${c.en})`;
      }
      return id;
    };

    // 포트폴리오 지역 필터링 — 활동 지역 + 포트폴리오에 쓰인 지역 합산
    const locationRegionIds = (profile?.locations ?? []).map(l => l.regionId).filter(Boolean);
    const portfolioRegionIds = portfolio.map(pf => pf.regionId).filter(Boolean);
    const usedRegionIds = [...new Set([...locationRegionIds, ...portfolioRegionIds])];
    const filteredPortfolio = pfLocFilter === 'all' ? portfolio : portfolio.filter(pf => pf.regionId === pfLocFilter);

    // 대표 포트폴리오: featured가 true인 게시글의 커버 이미지만
    const getFeaturedImages = () => {
      return portfolio
        .filter(pf => pf.featured && (pf.images?.length || (pf.url ? 1 : 0)) > 0)
        .map(pf => {
          const imgs = pf.images || (pf.url ? [pf.url] : []);
          return { url: imgs[pf.coverIdx || 0] || imgs[0], caption: pf.caption || '' };
        })
        .filter(item => item.url)
        .slice(0, 5);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* ── 대표 게시글 미리보기 (★ 대표설정된 게시글만) ── */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase' }}>대표 게시글 미리보기</div>
            <div style={{ fontSize: 10, color: featuredCount >= 5 ? '#e85d5d' : 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
              {featuredCount}/5개
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
            고객이 작가찾기 카드에서 보게 될 대표 이미지입니다. 아래 포트폴리오에서 ★ 대표설정을 클릭하여 최대 5개의 게시글을 지정하세요.
          </p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {getFeaturedImages().map((item, idx) => (
              <div key={idx} style={{ position: 'relative', minWidth: 140, width: 140, flexShrink: 0 }}>
                <div style={{ aspectRatio: '4/3', backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid var(--gold-border)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 4, left: 6, background: 'rgba(0,0,0,0.6)', color: 'var(--gold)', fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-serif)' }}>
                  {idx + 1}
                </div>
                {item.caption && (
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.caption}
                  </div>
                )}
              </div>
            ))}
            {getFeaturedImages().length === 0 && (
              <div style={{ width: '100%', textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
                아래 포트폴리오에서 ★ 대표설정을 클릭하여 대표 게시글을 지정하세요.
              </div>
            )}
          </div>
        </div>

        {/* ── 전체 포트폴리오 (새 구조: 멀티이미지 + 지역) ── */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              전체 포트폴리오 ({portfolio.length}개)
              {!portfolio.some(pf => (pf.images?.length > 0 || pf.url) && pf.regionId) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e85d5d', display: 'inline-block', flexShrink: 0 }} title="필수: 사진+지역 포함 1개 이상 등록" />}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}
                onClick={() => setPfPreview(!pfPreview)}>
                {pfPreview ? '편집 모드' : '👁 고객 미리보기'}
              </button>
              <button className="btn-primary" style={{ fontSize: 11, padding: '8px 16px' }} onClick={addPortfolio}>+ 새 포트폴리오</button>
            </div>
          </div>

          {/* 지역 필터 탭 */}
          {usedRegionIds.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              <button
                onClick={() => setPfLocFilter('all')}
                style={{
                  fontSize: 11, padding: '5px 12px', cursor: 'pointer',
                  background: pfLocFilter === 'all' ? 'var(--gold)' : 'transparent',
                  color: pfLocFilter === 'all' ? '#000' : 'var(--muted)',
                  border: `1px solid ${pfLocFilter === 'all' ? 'var(--gold)' : 'var(--border)'}`,
                  fontFamily: 'var(--font-serif)', transition: 'all 0.15s',
                }}
              >전체</button>
              {usedRegionIds.map(rId => (
                <button key={rId}
                  onClick={() => setPfLocFilter(rId)}
                  style={{
                    fontSize: 11, padding: '5px 12px', cursor: 'pointer',
                    background: pfLocFilter === rId ? 'var(--gold)' : 'transparent',
                    color: pfLocFilter === rId ? '#000' : 'var(--muted)',
                    border: `1px solid ${pfLocFilter === rId ? 'var(--gold)' : 'var(--border)'}`,
                    fontFamily: 'var(--font-serif)', transition: 'all 0.15s',
                  }}
                >{getRegionLabel(rId) || rId}</button>
              ))}
            </div>
          )}

          {/* 고객 미리보기 모드 (인스타그램 스타일) */}
          {pfPreview && filteredPortfolio.length > 0 && (
            <div style={{ border: '2px solid var(--gold-border)', background: '#0B0B0B', padding: '28px', marginBottom: 20, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', background: 'rgba(232,160,32,0.1)', padding: '2px 8px' }}>
                CUSTOMER VIEW
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {filteredPortfolio.map(pf => {
                  const imgs = pf.images?.length ? pf.images : (pf.url ? [pf.url] : []);
                  const cover = imgs[pf.coverIdx || 0] || imgs[0];
                  return (
                    <div key={pf.id} style={{ border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
                      {cover ? (
                        <div style={{ aspectRatio: '4/3', backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                          {/* 인스타 스타일 다중사진 배지 */}
                          {imgs.length > 1 && (
                            <div style={{
                              position: 'absolute', top: 8, right: 8,
                              display: 'flex', alignItems: 'center', gap: 3,
                              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                              padding: '3px 8px', borderRadius: 2,
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2">
                                <rect x="3" y="3" width="14" height="14" rx="1" />
                                <path d="M7 21h14a2 2 0 002-2V7" />
                              </svg>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-serif)' }}>{imgs.length}</span>
                            </div>
                          )}
                          {/* 대표 게시글 표시 */}
                          {pf.featured && (
                            <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--gold)', color: '#000', fontSize: 9, padding: '2px 8px', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>★ 대표</div>
                          )}
                        </div>
                      ) : (
                        <div style={{ aspectRatio: '4/3', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>사진 없음</div>
                      )}
                      <div style={{ padding: '10px 12px' }}>
                        {pf.caption && (
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-serif)', marginBottom: 6, lineHeight: 1.6, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {pf.caption}
                          </div>
                        )}
                        {pf.regionId && (
                          <span style={{ fontSize: 10, color: 'var(--gold)', background: 'rgba(232,160,32,0.1)', padding: '2px 6px', border: '1px solid rgba(232,160,32,0.2)' }}>
                            {getRegionLabel(pf.regionId)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 포트폴리오 카드 목록 (편집 모드) */}
          {!pfPreview && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredPortfolio.map((pf, _filteredIdx) => {
              const idx = portfolio.findIndex(p => p.id === pf.id);
              // 이전 데이터 호환: pf.url만 있는 경우 images 배열로 변환
              const images = pf.images?.length ? pf.images : (pf.url ? [pf.url] : []);
              const coverIdx = pf.coverIdx || 0;
              const isExpanded = expandedPfId === pf.id;

              return (
                <div key={pf.id} style={{
                  border: `1px solid ${pf.featured ? 'var(--gold-border)' : !pf.regionId ? 'rgba(232,80,80,0.3)' : 'var(--border)'}`,
                  background: pf.featured ? 'rgba(232,160,32,0.03)' : 'var(--bg)', position: 'relative', overflow: 'hidden',
                }}>
                  {/* 상단: 이미지 슬라이더 + 기본 정보 */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* 넷플릭스 스타일 이미지 슬라이더 */}
                    <PortfolioSlider
                      images={images}
                      coverIdx={coverIdx}
                      onSetCover={(imgIdx) => setCover(idx, imgIdx)}
                      onExpand={() => setExpandedPfId(isExpanded ? null : pf.id)}
                      isExpanded={isExpanded}
                      featured={pf.featured}
                      onToggleFeatured={() => toggleFeatured(idx)}
                      featuredFull={featuredCount >= 5}
                    />

                    {/* 우측 정보 패널 */}
                    <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                      {/* ★ 대표 게시글 토글 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => toggleFeatured(idx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-serif)',
                            background: pf.featured ? 'var(--gold)' : 'transparent',
                            color: pf.featured ? '#000' : 'var(--muted)',
                            border: `1px solid ${pf.featured ? 'var(--gold)' : 'var(--border)'}`,
                            cursor: (!pf.featured && featuredCount >= 5) ? 'not-allowed' : 'pointer',
                            opacity: (!pf.featured && featuredCount >= 5) ? 0.4 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          ★ {pf.featured ? '대표 게시글' : '대표설정'}
                        </button>
                        {!pf.featured && featuredCount >= 5 && (
                          <span style={{ fontSize: 10, color: '#e85d5d' }}>최대 5개</span>
                        )}
                      </div>
                      {/* 지역 선택 (필수) — 활동 지역 탭과 동일한 나라→도시 피커 */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ fontSize: 10, color: !pf.regionId ? '#e85d5d' : 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
                          {!pf.regionId ? '⚠ 지역을 선택해주세요' : '촬영 지역'}
                        </div>
                        <button
                          onClick={() => {
                            if (pfPickerOpen === idx) { setPfPickerOpen(null); setPfPickerCountry(null); setPfPickerSearch(''); }
                            else { setPfPickerOpen(idx); setPfPickerCountry(null); setPfPickerSearch(''); }
                          }}
                          style={{
                            width: '100%', background: 'var(--bg2)', border: `1px solid ${!pf.regionId ? 'rgba(232,80,80,0.4)' : 'var(--border)'}`,
                            color: 'var(--text)', padding: '7px 10px', fontFamily: 'var(--font-serif)', fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                          }}>
                          <span>
                            {pf.regionId
                              ? (() => {
                                  const domR = DOMESTIC_REGIONS.find(r => r.id === pf.regionId);
                                  if (domR) return `🇰🇷 ${domR.ko} (${domR.en})`;
                                  const ovR = OVERSEAS_REGIONS.find(r => r.id === pf.regionId);
                                  if (ovR) return `${COUNTRY_FLAG[ovR.country] ?? ''} ${ovR.ko} · ${ovR.en}`;
                                  // WORLD_CITIES에서 검색
                                  for (const [code, cities] of Object.entries(WORLD_CITIES)) {
                                    const c = cities.find(ct => ct.id === pf.regionId);
                                    if (c) return `${COUNTRIES[code]?.flag ?? ''} ${c.ko} · ${c.en}`;
                                  }
                                  return pf.regionId;
                                })()
                              : '— 지역 선택 —'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{pfPickerOpen === idx ? '▲' : '▼'}</span>
                        </button>

                        {/* 피커 드롭다운 */}
                        {pfPickerOpen === idx && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg)', border: '1px solid var(--gold-border)', maxHeight: 300, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>

                            {/* Step 1: 나라 선택 (한국 포함) */}
                            {!pfPickerCountry && (() => {
                              const q = pfPickerSearch.toLowerCase();
                              const allCountries = [['KR', COUNTRIES.KR], ...Object.entries(COUNTRIES).filter(([code]) => code !== 'KR')];
                              const filtered = allCountries.filter(([code, c]) =>
                                !q || c.ko.includes(q) || c.en.toLowerCase().includes(q) || code.toLowerCase().includes(q)
                              );
                              const favCountries = profile?.favCountries || [];
                              const sorted = [...filtered].sort((a, b) => {
                                const aFav = favCountries.includes(a[0]) ? 0 : 1;
                                const bFav = favCountries.includes(b[0]) ? 0 : 1;
                                if (a[0] === 'KR') return -1; if (b[0] === 'KR') return 1;
                                return aFav - bFav;
                              });
                              return (<>
                                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                                  <input
                                    ref={pfSearchRef}
                                    defaultValue=""
                                    onCompositionStart={() => { pfComposingRef.current = true; }}
                                    onCompositionEnd={e => { pfComposingRef.current = false; setPfPickerSearch(e.target.value); }}
                                    onChange={e => { if (!pfComposingRef.current) setPfPickerSearch(e.target.value); }}
                                    placeholder="나라 검색... (예: 대한민국, Japan, FR)"
                                    autoFocus
                                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-serif)' }}
                                  />
                                </div>
                                {sorted.map(([code, c]) => {
                                  const cityCount = (code === 'KR' ? DOMESTIC_REGIONS.length : (OVERSEAS_BY_COUNTRY[code] || []).length);
                                  return (
                                    <div key={code} style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                      onClick={() => { setPfPickerCountry(code); setPfPickerSearch(''); if (pfSearchRef.current) pfSearchRef.current.value = ''; }}
                                    >
                                      <span style={{ fontSize: 14, marginRight: 8 }}>{c.flag}</span>
                                      <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                                        {c.ko} <span style={{ color: 'var(--muted)', fontSize: 10 }}>({c.en})</span>
                                        {cityCount > 0 && <span style={{ color: 'rgba(232,160,32,0.5)', fontSize: 9, marginLeft: 4 }}>{cityCount}</span>}
                                      </span>
                                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>→</span>
                                    </div>
                                  );
                                })}
                              </>);
                            })()}

                            {/* Step 2: 도시 선택 */}
                            {pfPickerCountry && (() => {
                              const countryInfo = COUNTRIES[pfPickerCountry] || {};
                              const cities = pfPickerCountry === 'KR'
                                ? DOMESTIC_REGIONS.map(r => ({ ...r, country: 'KR' }))
                                : (OVERSEAS_BY_COUNTRY[pfPickerCountry] || []);
                              const q = pfPickerSearch.toLowerCase();
                              const filtered = cities.filter(r => !q || r.ko.includes(q) || r.en.toLowerCase().includes(q));
                              return (<>
                                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <button onClick={() => { setPfPickerCountry(null); setPfPickerSearch(''); if (pfSearchRef.current) pfSearchRef.current.value = ''; }}
                                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '2px 6px', cursor: 'pointer', fontSize: 10 }}>
                                      ← 나라
                                    </button>
                                    <span style={{ fontSize: 11, fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
                                      {countryInfo.flag} {countryInfo.ko}
                                    </span>
                                  </div>
                                  <input
                                    ref={pfSearchRef}
                                    defaultValue=""
                                    onCompositionStart={() => { pfComposingRef.current = true; }}
                                    onCompositionEnd={e => { pfComposingRef.current = false; setPfPickerSearch(e.target.value); }}
                                    onChange={e => { if (!pfComposingRef.current) setPfPickerSearch(e.target.value); }}
                                    placeholder="도시 검색..."
                                    autoFocus
                                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font-serif)' }}
                                  />
                                </div>
                                {filtered.map(r => {
                                  const selected = pf.regionId === r.id;
                                  return (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', cursor: 'pointer', background: selected ? 'rgba(232,160,32,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                      onClick={() => {
                                        updatePf(idx, 'regionId', r.id);
                                        setPfPickerOpen(null); setPfPickerCountry(null); setPfPickerSearch('');
                                      }}
                                    >
                                      <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-serif)', color: selected ? 'var(--gold)' : 'var(--text)' }}>
                                        {r.ko} <span style={{ color: 'var(--muted)', fontSize: 10 }}>({r.en})</span>
                                      </span>
                                      {selected && <span style={{ color: 'var(--gold)', fontSize: 10 }}>✓</span>}
                                    </div>
                                  );
                                })}
                                {filtered.length === 0 && (
                                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>검색 결과 없음</div>
                                )}
                              </>);
                            })()}
                          </div>
                        )}
                      </div>
                      {/* 게시글 설명 (인스타그램 캡션처럼) */}
                      <textarea value={pf.caption || ''} onChange={e => updatePf(idx, 'caption', e.target.value)}
                        placeholder="게시글 설명을 작성하세요 (예: 교토 기온 거리에서 벚꽃 아래 촬영한 커플 스냅입니다. 자연광 + 골든아워...)"
                        rows={3}
                        style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontFamily: 'var(--font-serif)', fontSize: 12, resize: 'vertical', lineHeight: 1.7 }} />
                      {/* 사진 수 + 삭제 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          📷 {images.length}/10장 {coverIdx < images.length ? `· ★ ${coverIdx + 1}번 대표사진` : ''}
                        </span>
                        <button onClick={() => removePf(idx)}
                          style={{ fontSize: 11, color: '#e85d5d', background: 'transparent', border: '1px solid rgba(232,80,80,0.25)', padding: '4px 10px', cursor: 'pointer' }}>
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 확장 영역: 드래그앤드롭 이미지 관리 */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg2)' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                        사진 관리 (최대 10장) — ★ 클릭으로 게시글 대표사진 지정
                      </div>
                      {/* 드래그앤드롭 업로드 영역 */}
                      <PortfolioDropZone
                        images={images}
                        coverIdx={coverIdx}
                        onUpload={(files) => addPfImages(idx, files)}
                        onRemove={(imgIdx) => removePfImage(idx, imgIdx)}
                        onSetCover={(imgIdx) => setCover(idx, imgIdx)}
                        maxCount={10}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>)}

          {portfolio.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>
              아직 포트폴리오가 없습니다.<br/>
              "새 포트폴리오" 버튼을 눌러 촬영 작업물을 추가하세요.
            </div>
          )}

          {/* 포트폴리오 저장 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn-primary" style={{ fontSize: 12, padding: '10px 28px', letterSpacing: '0.05em' }}
              onClick={() => {
                if (portfolio.length === 0) {
                  showSaved('⚠ 등록된 포트폴리오가 없습니다. 포트폴리오를 추가해 주세요.');
                  return;
                }
                const missing = [];
                portfolio.forEach((p, i) => {
                  const no = i + 1;
                  if (!p.regionId) missing.push(`포트폴리오 ${no}: 촬영 지역`);
                  if (!p.images || p.images.length === 0) missing.push(`포트폴리오 ${no}: 사진`);
                });
                if (missing.length > 0) {
                  showSaved(`⚠ 필수 정보 누락 — ${missing.join(', ')}`);
                  return;
                }
                // saveProfileData 를 거쳐야 photographers 테이블까지 동기화된다.
                // 예전에는 saveProfile(localStorage) 만 호출해 DB 의 portfolio
                // 컬럼이 계속 비어 있었고, 고객 화면에 사진이 나오지 않았다.
                saveProfileData({ ...profile, portfolio });
                showSaved('포트폴리오가 저장되었습니다 ✓');
              }}>
              포트폴리오 저장
            </button>
          </div>

          <p style={{ fontSize: 11, color: dbConnected ? '#48bb78' : 'var(--muted)', marginTop: 16, lineHeight: 1.7 }}>
            {dbConnected ? '✓ Supabase Storage 연동됨 — 이미지가 클라우드에 저장됩니다.' : '현재는 미리보기 전용입니다. Supabase 연결 후 클라우드 저장이 활성화됩니다.'}
          </p>
        </div>

        {/* ── 스냅 필터 태그 관리 ── */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            스냅 필터 태그
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
            고객이 작가를 검색할 때 필터에 사용되는 태그입니다. 해당하는 태그를 선택하거나, 직접 추가할 수 있습니다.
          </p>

          {/* 현재 선택된 태그 */}
          {(() => {
            const myFilters = profile?.snapFilters ?? artist?.snapFilters ?? [];
            const customFilters = profile?.customSnapFilters ?? [];
            const allActive = [...myFilters, ...customFilters.map(f => f.id)];

            return (
              <>
                {/* 선택된 태그 표시 */}
                {allActive.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {allActive.map(filterId => {
                      const label = SNAP_FILTER_LABELS[filterId]?.ko || customFilters.find(f => f.id === filterId)?.label || filterId;
                      const isCustom = customFilters.some(f => f.id === filterId);
                      return (
                        <span key={filterId} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 12px', fontSize: 11, fontFamily: 'var(--font-serif)',
                          background: 'var(--gold-dim)', color: 'var(--gold)',
                          border: '1px solid var(--gold-border)',
                        }}>
                          {label}
                          <button onClick={() => {
                            if (isCustom) {
                              saveProfileData({ ...profile, customSnapFilters: customFilters.filter(f => f.id !== filterId) });
                            } else {
                              saveProfileData({ ...profile, snapFilters: myFilters.filter(f => f !== filterId) });
                            }
                            showSaved(`"${label}" 태그 제거 ✓`);
                          }} style={{ background: 'transparent', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* 기본 태그 선택 그리드 */}
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>기본 태그 (클릭하여 추가/제거)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {SNAP_FILTER_KEYS.map(key => {
                    const isActive = myFilters.includes(key);
                    const label = SNAP_FILTER_LABELS[key]?.ko || key;
                    return (
                      <button key={key} onClick={() => {
                        const next = isActive ? myFilters.filter(f => f !== key) : [...myFilters, key];
                        saveProfileData({ ...profile, snapFilters: next });
                        showSaved(isActive ? `"${label}" 제거` : `"${label}" 추가 ✓`);
                      }} style={{
                        padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-serif)',
                        background: isActive ? 'var(--gold-dim)' : 'var(--bg)',
                        color: isActive ? 'var(--gold)' : 'var(--muted)',
                        border: `1px solid ${isActive ? 'var(--gold-border)' : 'var(--border)'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {isActive ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>

                {/* 커스텀 태그 추가 */}
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>직접 태그 추가</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="custom-snap-filter-input"
                    placeholder="예: 야경, 수중촬영, 드론..."
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', fontFamily: 'var(--font-serif)', fontSize: 12 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = e.target.value.trim();
                        if (!val) return;
                        const id = `custom_${val.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
                        const existing = profile?.customSnapFilters ?? [];
                        saveProfileData({ ...profile, customSnapFilters: [...existing, { id, label: val }] });
                        e.target.value = '';
                        showSaved(`"${val}" 커스텀 태그 추가 ✓`);
                      }
                    }}
                  />
                  <button className="btn-primary" style={{ fontSize: 11, padding: '7px 16px' }} onClick={() => {
                    const el = document.getElementById('custom-snap-filter-input');
                    const val = el?.value?.trim();
                    if (!val) return;
                    const id = `custom_${val.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
                    const existing = profile?.customSnapFilters ?? [];
                    saveProfileData({ ...profile, customSnapFilters: [...existing, { id, label: val }] });
                    el.value = '';
                    showSaved(`"${val}" 커스텀 태그 추가 ✓`);
                  }}>추가</button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  // ── 포트폴리오 넷플릭스 스타일 슬라이더 ──
  const PortfolioSlider = ({ images, coverIdx, onSetCover, onExpand, isExpanded, featured, onToggleFeatured, featuredFull }) => {
    // 대표사진(coverIdx)을 맨 앞에 배치한 정렬된 이미지 배열
    const sortedImages = useMemo(() => {
      if (!images.length || !coverIdx) return images;
      const arr = [...images];
      const [cover] = arr.splice(coverIdx, 1);
      return [cover, ...arr];
    }, [images, coverIdx]);

    const [slideIdx, setSlideIdx] = useState(0);
    const sliderW = 260;

    if (sortedImages.length === 0) return (
      <div onClick={onExpand} style={{
        width: sliderW, minHeight: 180, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg2)', border: '1px dashed var(--border)', cursor: 'pointer',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>📷</div>
          사진 추가하기
        </div>
      </div>
    );

    return (
      <div style={{ width: sliderW, flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={onExpand}>
        {/* 이미지 트랙 — 대표사진이 항상 첫 번째 */}
        <div style={{ display: 'flex', transition: 'transform 0.3s ease', transform: `translateX(-${slideIdx * 100}%)` }}>
          {sortedImages.map((url, i) => (
            <div key={i} style={{
              width: sliderW, minWidth: sliderW, aspectRatio: '4/3',
              backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
          ))}
        </div>
        {/* 좌우 화살표 */}
        {sortedImages.length > 1 && (
          <>
            {slideIdx > 0 && (
              <button onClick={e => { e.stopPropagation(); setSlideIdx(i => i - 1); }}
                style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                ‹
              </button>
            )}
            {slideIdx < sortedImages.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setSlideIdx(i => i + 1); }}
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                ›
              </button>
            )}
          </>
        )}
        {/* 인디케이터 */}
        {sortedImages.length > 1 && (
          <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
            {sortedImages.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === slideIdx ? 'var(--gold)' : 'rgba(255,255,255,0.4)', transition: 'background 0.2s' }} />
            ))}
          </div>
        )}
        {/* 대표사진 뱃지 — 항상 첫 번째 슬라이드(index 0)가 대표 */}
        {slideIdx === 0 && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--gold)', color: '#000', fontSize: 9, padding: '2px 8px', fontFamily: 'var(--font-serif)', fontWeight: 600, letterSpacing: '0.05em' }}>★ 대표</div>
        )}
        {/* 하단 버튼 영역: 대표 게시글 토글 + 편집 힌트 */}
        <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* ★ 대표 게시글 토글 버튼 (접힌 상태에서도 항상 표시) */}
          {onToggleFeatured && (
            <button
              onClick={e => { e.stopPropagation(); if (!featured && featuredFull) return; onToggleFeatured(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', fontSize: 10, fontFamily: 'var(--font-serif)', fontWeight: 600,
                background: featured ? 'var(--gold)' : 'rgba(0,0,0,0.6)',
                color: featured ? '#000' : '#fff',
                border: featured ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.2)',
                cursor: (!featured && featuredFull) ? 'not-allowed' : 'pointer',
                opacity: (!featured && featuredFull) ? 0.5 : 1,
                borderRadius: 10, backdropFilter: 'blur(4px)', transition: 'all 0.15s',
              }}
              title={featured ? '대표 게시글 해제' : featuredFull ? '최대 5개까지 가능' : '대표 게시글로 지정'}
            >
              ★ {featured ? '대표' : '대표설정'}
            </button>
          )}
          {!onToggleFeatured && <span />}
          {/* 편집 힌트 */}
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10, backdropFilter: 'blur(4px)' }}>
            {isExpanded ? '접기' : '편집'}
          </div>
        </div>
      </div>
    );
  };

  // ── 포트폴리오 드래그앤드롭 이미지 관리 영역 ──
  const PortfolioDropZone = ({ images, coverIdx, onUpload, onRemove, onSetCover, maxCount }) => {
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const canAdd = images.length < maxCount;

    const processFiles = (files) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      onUpload(Array.from(files));
      // uploading state는 부모의 addPfImages에서 관리됨
      setTimeout(() => setUploading(false), 500);
    };

    return (
      <div>
        {/* 현재 이미지 그리드 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {images.map((img, i) => (
            <div key={i} style={{
              position: 'relative', width: 90, height: 90,
              border: i === coverIdx ? '2px solid var(--gold)' : '1px solid var(--border)',
            }}>
              <img src={img} alt={`pf-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* 대표 지정 버튼 */}
              <button
                onClick={() => onSetCover(i)}
                title={i === coverIdx ? '현재 대표' : '대표로 지정'}
                style={{
                  position: 'absolute', bottom: 2, left: 2,
                  background: i === coverIdx ? 'var(--gold)' : 'rgba(0,0,0,0.6)',
                  color: i === coverIdx ? '#000' : '#fff',
                  border: 'none', width: 20, height: 20, borderRadius: '50%', fontSize: 11,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>★</button>
              {/* 삭제 */}
              <button
                onClick={() => onRemove(i)}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'rgba(232,80,80,0.8)', color: '#fff',
                  border: 'none', width: 18, height: 18, borderRadius: '50%', fontSize: 11,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              {i === coverIdx && (
                <div style={{ position: 'absolute', top: 2, left: 2, background: 'var(--gold)', color: '#000', fontSize: 8, padding: '1px 4px', fontWeight: 600 }}>대표</div>
              )}
            </div>
          ))}
        </div>
        {/* 드래그앤드롭 업로드 */}
        {canAdd && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--gold)' : 'var(--border)'}`,
              background: dragOver ? 'rgba(232,160,32,0.06)' : 'transparent',
              padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
              style={{ display: 'none' }}
              onChange={e => { processFiles(e.target.files); e.target.value = ''; }} />
            <div style={{ fontSize: 12, color: dragOver ? 'var(--gold)' : uploading ? 'var(--gold)' : 'var(--muted)' }}>
              {uploading ? '⟳ 업로드 중...' : dragOver ? '여기에 놓으세요' : `클릭 또는 드래그하여 사진 추가 (${images.length}/${maxCount})`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, opacity: 0.6 }}>JPG, PNG, WebP · 최대 5MB</div>
          </div>
        )}
      </div>
    );
  };

  // ── TAB 4: 상품 관리 (소품, 의상, 스냅촬영상품) ────────────────────────────────────────────

  // ── 공통: 드래그앤드롭 이미지 업로드 컴포넌트 ──
  const ImageDropZone = ({ images, onUpload, onRemove, maxCount = 5, label = '사진', bucket = 'portfolios' }) => {
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const processFiles = async (files) => {
      if (!files || files.length === 0) return;
      const maxNew = Math.min(files.length, maxCount - (images || []).length);

      setUploading(true);
      const uploadedUrls = await uploadImagesToStorage(files, bucket, maxNew);
      if (uploadedUrls.length) onUpload(uploadedUrls);
      setUploading(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    };

    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label} (최대 {maxCount}장)</div>
        {/* 드래그앤드롭 영역 */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--gold)' : 'var(--border)'}`,
            background: dragOver ? 'rgba(232,160,32,0.06)' : 'transparent',
            padding: '16px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.2s', marginBottom: 8,
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={e => processFiles(e.target.files)} />
          <div style={{ fontSize: 12, color: dragOver ? 'var(--gold)' : uploading ? 'var(--gold)' : 'var(--muted)' }}>
            {uploading ? '⟳ 업로드 중...' : dragOver ? '여기에 놓으세요' : '클릭 또는 드래그하여 이미지 업로드'}
          </div>
        </div>
        {/* 미리보기 */}
        {images && images.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {images.map((img, imgIdx) => (
              <div key={imgIdx} style={{ position: 'relative', width: 60, height: 60 }}>
                <img src={img} alt={`img-${imgIdx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid var(--border)' }} />
                <button onClick={(e) => { e.stopPropagation(); onRemove(imgIdx); }} style={{ position: 'absolute', top: -6, right: -6, background: '#e85d5d', color: '#fff', border: 'none', cursor: 'pointer', width: 18, height: 18, borderRadius: '50%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProductsTab = () => {
    if (!profile) return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>
        프로필 데이터를 불러오는 중...
      </div>
    );
    // H&M 연계 (포트폴리오 관리에서 이동)
    const hmk = profile?.hmk ?? { selfAvailable: false, note: '', menus: [] };
    const hmkMenus = hmk.menus ?? [];
    const updateHmk = (field, val) => saveProfileData({ ...profile, hmk: { ...hmk, [field]: val } });
    const addHmkMenu = () => updateHmk('menus', [...hmkMenus, { id: genId(), name: '', price: '', desc: '' }]);
    const updateHmkMenu = (idx, field, val) => {
      const next = hmkMenus.map((m, i) => i === idx ? { ...m, [field]: val } : m);
      updateHmk('menus', next);
    };
    const removeHmkMenu = (idx) => updateHmk('menus', hmkMenus.filter((_, i) => i !== idx));

    // 활동 지역 목록 (스냅 상품 지역 선택용)
    const allLocations = profile?.locations ?? [];

    // 소품 추가/수정/삭제
    const addProp = () => setProps([...props, { id: genId(), name: '', desc: '' }]);
    const updateProp = (idx, field, val) => {
      const next = props.map((p, i) => i === idx ? { ...p, [field]: val } : p);
      setProps(next);
    };
    const removeProp = (idx) => {
      setProps(props.filter((_, i) => i !== idx));
      const newPropImages = { ...propImages };
      delete newPropImages[idx];
      setPropImages(newPropImages);
    };
    const handlePropImageUpload = (idx, urls) => {
      setPropImages({ ...propImages, [idx]: [...(propImages[idx] || []), ...urls].slice(0, 5) });
    };
    const removePropImage = (idx, imgIdx) => {
      setPropImages({ ...propImages, [idx]: (propImages[idx] || []).filter((_, i) => i !== imgIdx) });
    };

    // 의상 추가/수정/삭제
    const addCostume = () => setCostumes([...costumes, { id: genId(), name: '', gender: '공용', category: '한복', price: '', desc: '' }]);
    const updateCostume = (idx, field, val) => {
      const next = costumes.map((c, i) => i === idx ? { ...c, [field]: val } : c);
      setCostumes(next);
    };
    const removeCostume = (idx) => {
      setCostumes(costumes.filter((_, i) => i !== idx));
      const newCostumeImages = { ...costumeImages };
      delete newCostumeImages[idx];
      setCostumeImages(newCostumeImages);
    };
    const handleCostumeImageUpload = (idx, urls) => {
      setCostumeImages({ ...costumeImages, [idx]: [...(costumeImages[idx] || []), ...urls].slice(0, 5) });
    };
    const removeCostumeImage = (idx, imgIdx) => {
      setCostumeImages({ ...costumeImages, [idx]: (costumeImages[idx] || []).filter((_, i) => i !== imgIdx) });
    };

    // 스냅상품 추가/수정/삭제 (한도 제거)
    const addSnapProduct = () => {
      setSnapProducts([...snapProducts, { id: genId(), name: '', duration: '1시간', editedCount: '', price: '', desc: '', regionIds: [], images: [], coverIdx: 0 }]);
    };
    const updateSnapProduct = (idx, field, val) => {
      const next = snapProducts.map((p, i) => i === idx ? { ...p, [field]: val } : p);
      setSnapProducts(next);
    };
    const removeSnapProduct = (idx) => {
      setSnapProducts(snapProducts.filter((_, i) => i !== idx));
      const newSnapImages = { ...snapImages };
      delete newSnapImages[idx];
      setSnapImages(newSnapImages);
    };
    const handleSnapImageUpload = (idx, urls) => {
      setSnapImages({ ...snapImages, [idx]: [...(snapImages[idx] || []), ...urls].slice(0, 10) });
    };
    const removeSnapImage = (idx, imgIdx) => {
      setSnapImages({ ...snapImages, [idx]: (snapImages[idx] || []).filter((_, i) => i !== imgIdx) });
    };
    const setSnapCover = (idx, imgIdx) => updateSnapProduct(idx, 'coverIdx', imgIdx);

    // 스냅 상품 지역 토글
    const toggleSnapRegion = (idx, locId) => {
      const product = snapProducts[idx];
      const regionIds = product.regionIds || [];
      const next = regionIds.includes(locId) ? regionIds.filter(id => id !== locId) : [...regionIds, locId];
      updateSnapProduct(idx, 'regionIds', next);
    };

    // ── 상품 저장 함수 (필수 필드 검증 포함) ──────────────────────
    const handleSaveSnapProducts = () => {
      if (snapProducts.length === 0) {
        showSaved('⚠ 등록된 스냅 촬영 상품이 없습니다. 상품을 추가해 주세요.');
        return;
      }
      const missing = [];
      snapProducts.forEach((p, i) => {
        const no = i + 1;
        if (!p.name?.trim()) missing.push(`상품 ${no}: 상품명`);
        if (!p.price) missing.push(`상품 ${no}: 가격`);
        if (!p.editedCount) missing.push(`상품 ${no}: 보정 컷수`);
        if (!p.desc?.trim()) missing.push(`상품 ${no}: 상품설명`);
        const imgs = snapImages[i] || p.images || [];
        if (!imgs.length) missing.push(`상품 ${no}: 사진`);
      });
      if (missing.length > 0) {
        showSaved(`⚠ 필수 정보 누락 — ${missing.join(', ')}`);
        return;
      }
      const mergedSnap = snapProducts.map((p, i) => ({ ...p, images: snapImages[i] || p.images || [] }));
      saveProfileData({ ...profile, snapProducts: mergedSnap, props: profile?.props || [], costumes: profile?.costumes || [], tours: profile?.tours || [] });
      showSaved('스냅 촬영 상품이 저장되었습니다 ✓');
    };

    const handleSaveProps = () => {
      if (props.length === 0) {
        showSaved('⚠ 등록된 소품이 없습니다. 소품을 추가해 주세요.');
        return;
      }
      const missing = [];
      props.forEach((p, i) => {
        if (!p.name?.trim()) missing.push(`소품 ${i + 1}: 이름`);
        const imgs = propImages[i] || p.images || [];
        if (!imgs.length) missing.push(`소품 ${i + 1}: 사진`);
      });
      if (missing.length > 0) {
        showSaved(`⚠ 필수 정보 누락 — ${missing.join(', ')}`);
        return;
      }
      const mergedProps = props.map((p, i) => ({ ...p, images: propImages[i] || p.images || [] }));
      saveProfileData({ ...profile, props: mergedProps });
      showSaved('소품이 저장되었습니다 ✓');
    };

    const handleSaveCostumes = () => {
      if (costumes.length === 0) {
        showSaved('⚠ 등록된 의상이 없습니다. 의상을 추가해 주세요.');
        return;
      }
      const missing = [];
      costumes.forEach((c, i) => {
        if (!c.name?.trim()) missing.push(`의상 ${i + 1}: 이름`);
        if (!c.price) missing.push(`의상 ${i + 1}: 가격`);
        const imgs = costumeImages[i] || c.images || [];
        if (!imgs.length) missing.push(`의상 ${i + 1}: 사진`);
      });
      if (missing.length > 0) {
        showSaved(`⚠ 필수 정보 누락 — ${missing.join(', ')}`);
        return;
      }
      const mergedCostumes = costumes.map((c, i) => ({ ...c, images: costumeImages[i] || c.images || [] }));
      saveProfileData({ ...profile, costumes: mergedCostumes });
      showSaved('의상이 저장되었습니다 ✓');
    };

    // ── 포토 투어 CRUD ─────────────────────────────────────────────
    const tours = profile?.tours || [];
    const setTours = (newTours) => saveProfileData({ ...profile, tours: newTours });
    const addTour = () => {
      setTours([...tours, { name: '', price: '', durationMin: 90, photos: '', desc: '', spots: [], route: { departure: '', waypoints: [''], destination: '' } }]);
    };
    const updateTour = (idx, field, val) => {
      setTours(tours.map((t, i) => i === idx ? { ...t, [field]: val } : t));
    };
    const removeTour = (idx) => {
      setTours(tours.filter((_, i) => i !== idx));
    };
    const addTourSpot = (idx) => {
      const tour = tours[idx];
      updateTour(idx, 'spots', [...(tour.spots || []), '']);
    };
    const updateTourSpot = (tourIdx, spotIdx, val) => {
      const tour = tours[tourIdx];
      const newSpots = (tour.spots || []).map((s, i) => i === spotIdx ? val : s);
      updateTour(tourIdx, 'spots', newSpots);
    };
    const removeTourSpot = (tourIdx, spotIdx) => {
      const tour = tours[tourIdx];
      updateTour(tourIdx, 'spots', (tour.spots || []).filter((_, i) => i !== spotIdx));
    };

    const inputStyle = {
      display: 'block', marginTop: 6, width: '100%',
      background: 'var(--bg)', border: '1px solid var(--border)',
      color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13,
      colorScheme: 'dark',
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* H&M 셀프 여부 + 메뉴 관리 (포트폴리오 관리에서 이동) */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>헤어·메이크업 연계</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={hmk.selfAvailable} onChange={e => updateHmk('selfAvailable', e.target.checked)} style={{ accentColor: 'var(--gold)', width: 16, height: 16 }} />
            <div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>자체 H&M 연계 가능</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>체크 시 고객 프로필에 "H&M 포함 가능" 배지가 표시됩니다</div>
            </div>
          </label>
          {hmk.selfAvailable && (
            <>
              <textarea value={hmk.note} onChange={e => updateHmk('note', e.target.value)}
                placeholder="추가 안내 (예: 동료 헤어메이크업 작가 동반 가능, 별도 문의 필요)"
                rows={2}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', fontSize: 13, resize: 'vertical', fontFamily: 'var(--font-serif)', marginBottom: 20 }} />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase' }}>
                    💄 H&M 메뉴 ({hmkMenus.length}개)
                  </div>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }} onClick={addHmkMenu}>+ 메뉴 추가</button>
                </div>
                {hmkMenus.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '12px 0', lineHeight: 1.8 }}>
                    아직 등록된 H&M 메뉴가 없습니다. 메뉴를 추가하면 고객이 예약 시 선택할 수 있습니다.<br/>
                    <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.8 }}>
                      💡 H&M 메뉴를 개별 상품으로 올리지 않아도 됩니다. 스냅 촬영 상품 안에 H&M을 포함하여 판매하셔도 괜찮습니다. (선택사항)
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {hmkMenus.map((menu, idx) => (
                    <div key={menu.id} style={{ border: '1px solid var(--border)', padding: '14px 18px', position: 'relative', background: 'var(--bg)' }}>
                      <button onClick={() => removeHmkMenu(idx)} style={{ position: 'absolute', top: 8, right: 10, color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 8 }}>
                        <input value={menu.name} onChange={e => updateHmkMenu(idx, 'name', e.target.value)}
                          placeholder="메뉴명 (예: Natural 메이크업)"
                          style={inputStyle} />
                        <input type="number" value={menu.price} onChange={e => updateHmkMenu(idx, 'price', e.target.value)}
                          placeholder="가격 (원)"
                          style={inputStyle} />
                      </div>
                      <input value={menu.desc} onChange={e => updateHmkMenu(idx, 'desc', e.target.value)}
                        placeholder="설명 (예: 자연스러운 톤, 헤어 세팅 포함)"
                        style={{ ...inputStyle, marginTop: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Section C: 스냅 촬영 상품 (포트폴리오와 동일 형태) */}
        <div style={{ border: '1px solid rgba(232,160,32,0.2)', background: 'rgba(232,160,32,0.02)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 스냅 촬영 상품 <span style={{ color: 'rgba(232,160,32,0.5)' }}>— {snapProducts.length}개</span>
              {snapProducts.length === 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e85d5d', display: 'inline-block', flexShrink: 0 }} title="필수: 1개 이상 등록" />}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}
                onClick={() => setSnapPreview(snapPreview !== null ? null : 0)}>
                {snapPreview !== null ? '편집 모드' : '👁 고객 미리보기'}
              </button>
              <button className="btn-primary" style={{ fontSize: 11, padding: '8px 16px' }} onClick={addSnapProduct}>+ 상품 추가</button>
            </div>
          </div>

          {/* 고객 미리보기 모드 */}
          {snapPreview !== null && snapProducts.length > 0 && (
            <div style={{ border: '2px solid var(--gold-border)', background: '#0B0B0B', padding: '28px', marginBottom: 20, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', background: 'rgba(232,160,32,0.1)', padding: '2px 8px' }}>
                CUSTOMER VIEW
              </div>
              {(() => {
                const sp = snapProducts[snapPreview] || snapProducts[0];
                const imgs = snapImages[snapPreview] || [];
                return (
                  <div>
                    {/* 이미지 슬라이더 */}
                    {imgs.length > 0 && (
                      <PortfolioSlider images={imgs} coverIdx={sp.coverIdx || 0} onSetCover={() => {}} onExpand={() => {}} isExpanded={false} />
                    )}
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 8 }}>{sp.name || '상품명 미입력'}</h3>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                        <span>⏱ {sp.duration}</span>
                        <span>📷 보정본 {sp.editedCount || 0}장</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--gold)', marginBottom: 12 }}>
                        ₩{Number(sp.price || 0).toLocaleString('ko-KR')}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{sp.desc || '상품 설명 미입력'}</p>
                    </div>
                    {/* 상품 선택 탭 */}
                    {snapProducts.length > 1 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
                        {snapProducts.map((p, i) => (
                          <button key={p.id} onClick={() => setSnapPreview(i)}
                            style={{
                              padding: '6px 14px', fontSize: 11, fontFamily: 'var(--font-serif)', whiteSpace: 'nowrap',
                              background: i === snapPreview ? 'var(--gold)' : 'transparent',
                              color: i === snapPreview ? '#000' : 'var(--muted)',
                              border: `1px solid ${i === snapPreview ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer',
                            }}>{p.name || `상품 ${i + 1}`}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 편집 모드: 상품 카드 목록 */}
          {snapPreview === null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {snapProducts.map((product, idx) => {
                const imgs = snapImages[idx] || [];
                const isExpanded = expandedSnapId === product.id;
                return (
                  <div key={product.id} style={{ border: '1px solid var(--border)', background: 'var(--bg)', overflow: 'hidden' }}>
                    {/* 상단: 슬라이더 + 정보 */}
                    <div style={{ display: 'flex', gap: 0 }}>
                      <PortfolioSlider
                        images={imgs}
                        coverIdx={product.coverIdx || 0}
                        onSetCover={(imgIdx) => setSnapCover(idx, imgIdx)}
                        onExpand={() => setExpandedSnapId(isExpanded ? null : product.id)}
                        isExpanded={isExpanded}
                      />
                      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                        <input value={product.name} onChange={e => updateSnapProduct(idx, 'name', e.target.value)}
                          placeholder="상품명 (예: 데이 스냅 패키지)"
                          style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 10px', fontFamily: 'var(--font-serif)', fontSize: 13 }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                          <select value={product.duration} onChange={e => updateSnapProduct(idx, 'duration', e.target.value)}
                            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-serif)' }}>
                            <option>30분</option><option>1시간</option><option>1.5시간</option><option>2시간</option><option>3시간</option>
                          </select>
                          <input type="number" value={product.editedCount} onChange={e => updateSnapProduct(idx, 'editedCount', e.target.value)}
                            placeholder="보정본 수" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-serif)' }} />
                          <input type="number" value={product.price} onChange={e => updateSnapProduct(idx, 'price', e.target.value)}
                            placeholder="가격 (원)" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-serif)' }} />
                        </div>
                        <textarea value={product.desc} onChange={e => updateSnapProduct(idx, 'desc', e.target.value)}
                          placeholder="상품 설명 (사진 셀렉 안내, 보정 작업 안내, 수정 요청 관련, 파일 전달 방법 관련, 파일 보관 기간 안내 등)" rows={4}
                          style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontSize: 11, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box', minHeight: 80 }} />
                        {/* 지역 태그 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allLocations.map(loc => {
                            const selected = (product.regionIds || []).includes(loc.id);
                            return (
                              <button key={loc.id} onClick={() => toggleSnapRegion(idx, loc.id)}
                                style={{
                                  padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-serif)',
                                  background: selected ? 'var(--gold)' : 'transparent',
                                  color: selected ? '#0B0B0B' : 'var(--muted)',
                                  border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer',
                                }}>{loc.isMain && '★ '}{loc.name}</button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>📷 {imgs.length}/10장</span>
                          <button onClick={() => removeSnapProduct(idx)}
                            style={{ fontSize: 10, color: '#e85d5d', background: 'transparent', border: '1px solid rgba(232,80,80,0.25)', padding: '3px 8px', cursor: 'pointer' }}>삭제</button>
                        </div>
                      </div>
                    </div>
                    {/* 확장: 드래그앤드롭 이미지 관리 */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg2)' }}>
                        <PortfolioDropZone
                          images={imgs}
                          coverIdx={product.coverIdx || 0}
                          onUpload={(files) => {
                            // 스냅 이미지용: addPfImages 같은 로직이지만 snapImages 사용
                            const process = async () => {
                              const maxNew = Math.min(files.length, 10 - imgs.length);
                              const newUrls = await uploadImagesToStorage(files, 'snap-products', maxNew);
                              if (newUrls.length) handleSnapImageUpload(idx, newUrls);
                            };
                            process();
                          }}
                          onRemove={(imgIdx) => removeSnapImage(idx, imgIdx)}
                          onSetCover={(imgIdx) => setSnapCover(idx, imgIdx)}
                          maxCount={10}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* 스냅 촬영 상품 저장 버튼 */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ fontSize: 13, padding: '12px 32px', letterSpacing: '0.05em' }}
              onClick={handleSaveSnapProducts}>
              스냅 촬영 상품 저장
            </button>
          </div>
        </div>

        {/* Section D: 포토 투어 상품 */}
        <div style={{ border: '1px solid rgba(232,160,32,0.2)', background: 'rgba(232,160,32,0.02)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>
            🗺️ 포토 투어 <span style={{ color: 'rgba(232,160,32,0.5)' }}>— {tours.length}개</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            촬영 + 투어를 결합한 특별 상품을 만들어보세요. 고객에게 장소 가이드와 함께 촬영을 제공합니다.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            {tours.map((tour, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border)', padding: '16px 20px', position: 'relative' }}>
                <button onClick={() => removeTour(idx)} style={{ position: 'absolute', top: 10, right: 12, color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>

                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                  투어명
                  <input value={tour.name} onChange={e => updateTour(idx, 'name', e.target.value)}
                    placeholder="예: 경복궁 한복 스냅 투어" style={inputStyle} />
                </label>

                {/* 가격 모드 선택 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[
                    { id: 'perPerson', label: '1인당 가격', desc: '인원 × 단가' },
                    { id: 'total', label: '토탈 가격 (더치페이)', desc: '총액 고정, 인원이 나눠 결제' },
                  ].map(mode => (
                    <button key={mode.id}
                      onClick={() => updateTour(idx, 'pricingType', mode.id)}
                      style={{
                        flex: 1, padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                        border: `1px solid ${(tour.pricingType || 'perPerson') === mode.id ? 'var(--gold)' : 'var(--border)'}`,
                        background: (tour.pricingType || 'perPerson') === mode.id ? 'rgba(232,160,32,0.06)' : 'transparent',
                        color: 'var(--text)', fontSize: 11, fontFamily: 'var(--font-serif)',
                      }}
                    >
                      <div style={{ color: (tour.pricingType || 'perPerson') === mode.id ? 'var(--gold)' : 'var(--muted)' }}>{mode.label}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{mode.desc}</div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    소요 시간 (분)
                    <input type="number" value={tour.durationMin} onChange={e => updateTour(idx, 'durationMin', Number(e.target.value))}
                      placeholder="90" style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    보정본 수
                    <input type="number" value={tour.photos} onChange={e => updateTour(idx, 'photos', e.target.value)}
                      placeholder="50" style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {(tour.pricingType || 'perPerson') === 'total' ? '총액 (원)' : '1인 가격 (원)'}
                    <input type="number" value={tour.price} onChange={e => updateTour(idx, 'price', e.target.value)}
                      placeholder="300000" style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    최대 인원
                    <input type="number" value={tour.maxGuests || ''} onChange={e => updateTour(idx, 'maxGuests', Number(e.target.value) || 6)}
                      placeholder="6" style={inputStyle} />
                  </label>
                </div>

                {/* 토탈 모드: 1인당 금액 미리보기 */}
                {(tour.pricingType || 'perPerson') === 'total' && tour.price && tour.maxGuests && (
                  <div style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 10, padding: '4px 10px', background: 'rgba(232,160,32,0.04)', border: '1px solid rgba(232,160,32,0.12)' }}>
                    💡 {tour.maxGuests}명 기준 1인당 ₩{Math.round(Number(tour.price) / tour.maxGuests).toLocaleString('ko-KR')}
                  </div>
                )}

                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                  투어 설명
                  <textarea value={tour.desc} onChange={e => updateTour(idx, 'desc', e.target.value)}
                    placeholder="예: 경복궁에서 시작해 북촌 한옥마을을 거쳐 삼청동 카페거리까지 걸으며 촬영합니다"
                    rows={2}
                    style={{ display: 'block', marginTop: 6, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </label>

                {/* 투어 루트: 출발지 → 경유지 → 도착지 */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 10, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
                    🗺️ 투어 루트
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>🟢 출발지</div>
                      <input value={tour.route?.departure || ''} onChange={e => updateTour(idx, 'route', { ...(tour.route || {}), departure: e.target.value })}
                        placeholder="예: 경복궁역 3번 출구" style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>🔴 도착지</div>
                      <input value={tour.route?.destination || ''} onChange={e => updateTour(idx, 'route', { ...(tour.route || {}), destination: e.target.value })}
                        placeholder="예: 삼청동 카페거리" style={inputStyle} />
                    </div>
                  </div>
                  {/* 경유지 */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🔵 경유지
                      <button onClick={() => {
                        const r = tour.route || { departure: '', waypoints: [], destination: '' };
                        updateTour(idx, 'route', { ...r, waypoints: [...(r.waypoints || []), ''] });
                      }} style={{ fontSize: 10, color: 'var(--gold)', background: 'transparent', border: '1px solid rgba(232,160,32,0.3)', padding: '2px 8px', cursor: 'pointer' }}>
                        + 추가
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(tour.route?.waypoints || []).map((wp, wi) => (
                        <div key={wi} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.15)', padding: '3px 8px' }}>
                          <input value={wp} onChange={e => {
                            const wps = [...(tour.route?.waypoints || [])];
                            wps[wi] = e.target.value;
                            updateTour(idx, 'route', { ...(tour.route || {}), waypoints: wps });
                          }} placeholder="장소명" style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 11, fontFamily: 'var(--font-serif)', width: 100, outline: 'none' }} />
                          <button onClick={() => {
                            const wps = (tour.route?.waypoints || []).filter((_, i) => i !== wi);
                            updateTour(idx, 'route', { ...(tour.route || {}), waypoints: wps });
                          }} style={{ color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 간이 루트 시각화 (SVG) */}
                  {(tour.route?.departure || tour.route?.destination || (tour.route?.waypoints || []).some(w => w)) && (() => {
                    const pts = [
                      tour.route?.departure,
                      ...(tour.route?.waypoints || []).filter(w => w),
                      tour.route?.destination,
                    ].filter(Boolean);
                    if (pts.length < 2) return null;
                    const w = 420, h = 80, pad = 30;
                    const step = (w - pad * 2) / (pts.length - 1);
                    return (
                      <div style={{ background: 'rgba(232,160,32,0.03)', border: '1px solid rgba(232,160,32,0.15)', padding: '12px 16px', marginTop: 4 }}>
                        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', margin: '0 auto' }}>
                          {/* 연결 선 */}
                          <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(232,160,32,0.4)" strokeWidth="2" strokeDasharray="6,4" />
                          {/* 포인트 + 레이블 */}
                          {pts.map((label, i) => {
                            const cx = pad + i * step;
                            const cy = h / 2;
                            const isFirst = i === 0;
                            const isLast = i === pts.length - 1;
                            const color = isFirst ? '#48bb78' : isLast ? '#e85d5d' : '#4a9eff';
                            return (
                              <g key={i}>
                                <circle cx={cx} cy={cy} r={isFirst || isLast ? 8 : 6} fill={color} />
                                <text x={cx} y={cy + (isFirst || isLast ? 24 : -14)} textAnchor="middle"
                                  style={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                                  {label.length > 8 ? label.slice(0, 7) + '..' : label}
                                </text>
                                {isFirst && <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 8, fill: '#fff', fontWeight: 600 }}>S</text>}
                                {isLast && <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 8, fill: '#fff', fontWeight: 600 }}>E</text>}
                                {!isFirst && !isLast && <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 7, fill: '#fff', fontWeight: 600 }}>{i}</text>}
                              </g>
                            );
                          })}
                          {/* 화살표 */}
                          {pts.length > 1 && pts.slice(0, -1).map((_, i) => {
                            const x1 = pad + i * step + (i === 0 ? 10 : 8);
                            const x2 = pad + (i + 1) * step - (i === pts.length - 2 ? 10 : 8);
                            const mx = (x1 + x2) / 2;
                            return (
                              <polygon key={`arr-${i}`} points={`${mx - 3},${h / 2 - 3} ${mx + 3},${h / 2} ${mx - 3},${h / 2 + 3}`}
                                fill="rgba(232,160,32,0.6)" />
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                {/* 기존 경유지 (spots) — 하위호환 */}
                {(tour.spots || []).length > 0 && !tour.route?.departure && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>📍 기존 경유지 (루트로 전환 가능)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(tour.spots || []).map((spot, si) => (
                        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.15)', padding: '3px 8px' }}>
                          <span style={{ color: 'var(--gold)', fontSize: 11, fontFamily: 'var(--font-serif)' }}>{spot}</span>
                          <button onClick={() => removeTourSpot(idx, si)}
                            style={{ color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--gold)' }} onClick={addTour}>+ 투어 추가</button>
          {/* 포토 투어 저장 버튼 */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ fontSize: 13, padding: '12px 32px', letterSpacing: '0.05em' }}
              onClick={() => {
                if (tours.length === 0) {
                  showSaved('⚠ 등록된 포토 투어가 없습니다. 투어를 추가해 주세요.');
                  return;
                }
                const missing = [];
                tours.forEach((t, i) => {
                  const no = i + 1;
                  if (!t.name?.trim()) missing.push(`투어 ${no}: 투어명`);
                  if (!t.price) missing.push(`투어 ${no}: 가격`);
                  if (!t.desc?.trim()) missing.push(`투어 ${no}: 투어 설명`);
                  if (!t.route?.departure?.trim()) missing.push(`투어 ${no}: 출발지`);
                  if (!t.route?.destination?.trim()) missing.push(`투어 ${no}: 도착지`);
                });
                if (missing.length > 0) {
                  showSaved(`⚠ 필수 정보 누락 — ${missing.join(', ')}`);
                  return;
                }
                saveProfileData({ ...profile, tours });
                showSaved('포토 투어가 저장되었습니다 ✓');
              }}>
              포토 투어 저장
            </button>
          </div>
        </div>

        {/* Section E: 투어 일정 오픈 (크라우드펀딩/모집 시스템) */}
        {tours.length > 0 && <TourInstanceManager photographerId={profile.id || artistId} tours={tours} />}

        {/* Section B-2: 시간 단위 가격 설정 */}
        <div style={{ border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.02)', padding: '24px 28px', position: 'relative', marginBottom: 20 }}>
          <Corners />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase' }}>
              ⏱ 시간 단위 가격
            </div>
            {/* 활성/비활성 토글 */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11 }}>
              <span style={{ color: profile.hourlyRateEnabled === false ? '#e85d5d' : 'var(--muted)' }}>
                {profile.hourlyRateEnabled === false ? '비활성' : '활성'}
              </span>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  const next = !(profile.hourlyRateEnabled !== false);
                  // 가격 미입력 시 활성화 차단
                  if (next && !profile.hourlyRate) {
                    alert('시간당 가격을 먼저 입력해주세요.');
                    return;
                  }
                  saveProfileData({ ...profile, hourlyRateEnabled: next });
                }}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: profile.hourlyRateEnabled === false ? 'rgba(136,136,136,0.3)' : 'var(--gold)',
                  position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', position: 'absolute', top: 2,
                  left: profile.hourlyRateEnabled === false ? 2 : 20,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
            </label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            패키지 외에 시간 단위로 예약받고 싶다면 시간당 가격을 설정하세요. 토글을 끄면 가격이 저장된 채로 고객에게 노출되지 않습니다.
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            transition: 'opacity 0.2s',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>시간당 가격 (원)</div>
              <input
                type="number"
                value={profile.hourlyRate || ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  const updated = { ...profile, hourlyRate: val };
                  saveProfileData(updated);
                }}
                placeholder="예: 150000"
                style={inputStyle}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              {profile.hourlyRate ? (
                <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 13 }}>
                  ₩{Number(profile.hourlyRate).toLocaleString('ko-KR')} / 시간
                </span>
              ) : (
                <span style={{ opacity: 0.5 }}>가격 미설정</span>
              )}
            </div>
          </div>
          {profile.hourlyRateEnabled === false && profile.hourlyRate && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(232,80,80,0.06)', border: '1px solid rgba(232,80,80,0.15)', fontSize: 10, color: 'rgba(232,80,80,0.8)', lineHeight: 1.6 }}>
              🔒 시간 단위 예약이 비활성화되었습니다. 가격(₩{Number(profile.hourlyRate).toLocaleString('ko-KR')})은 저장된 상태이며, 토글을 켜면 즉시 활성화됩니다.
            </div>
          )}
          {profile.hourlyRateEnabled !== false && profile.hourlyRate && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.15)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>
              💡 고객이 프로필에서 "시간 단위 예약" 옵션을 볼 수 있습니다. 최소 1시간부터 예약 가능합니다.
            </div>
          )}
        </div>

        {/* Section A: 소품 목록 */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>소품 목록</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            {props.map((prop, idx) => (
              <div key={prop.id} style={{ border: '1px solid var(--border)', padding: '14px 18px', position: 'relative' }}>
                <button onClick={() => removeProp(idx)} style={{ position: 'absolute', top: 8, right: 10, color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
                  <input value={prop.name} onChange={e => updateProp(idx, 'name', e.target.value)}
                    placeholder="소품명 (예: 베일)" style={inputStyle} />
                  <input value={prop.desc} onChange={e => updateProp(idx, 'desc', e.target.value)}
                    placeholder="설명 (예: 화이트 플로팅 베일)" style={inputStyle} />
                </div>
                <ImageDropZone
                  images={propImages[idx] || []}
                  onUpload={urls => handlePropImageUpload(idx, urls)}
                  onRemove={imgIdx => removePropImage(idx, imgIdx)}
                  label="소품 사진"
                />
              </div>
            ))}
          </div>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={addProp}>+ 소품 추가</button>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ fontSize: 13, padding: '12px 32px', letterSpacing: '0.05em' }}
              onClick={handleSaveProps}>
              소품 저장
            </button>
          </div>
        </div>

        {/* Section B: 의상 목록 */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>의상 목록</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            {costumes.map((costume, idx) => (
              <div key={costume.id} style={{ border: '1px solid var(--border)', padding: '16px 20px', position: 'relative' }}>
                <button onClick={() => removeCostume(idx)} style={{ position: 'absolute', top: 10, right: 12, color: '#e85d5d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                  의상명
                  <input value={costume.name} onChange={e => updateCostume(idx, 'name', e.target.value)}
                    placeholder="예: 아이보리 드레스 A" style={inputStyle} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    성별
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      {['남성', '여성', '공용'].map(g => (
                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                          <input type="radio" name={`gender-${idx}`} checked={costume.gender === g} onChange={() => updateCostume(idx, 'gender', g)} style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
                          {g}
                        </label>
                      ))}
                    </div>
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    카테고리
                    <select value={costume.category} onChange={e => updateCostume(idx, 'category', e.target.value)}
                      style={{ display: 'block', marginTop: 6, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13 }}>
                      <option>한복</option><option>드레스</option><option>정장</option><option>캐주얼</option><option>기타</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    금액 (원)
                    <input type="number" value={costume.price} onChange={e => updateCostume(idx, 'price', e.target.value)} placeholder="0" style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    설명
                    <input value={costume.desc} onChange={e => updateCostume(idx, 'desc', e.target.value)} placeholder="예: 플로우 라인, 끈 조절 가능" style={inputStyle} />
                  </label>
                </div>
                <ImageDropZone
                  images={costumeImages[idx] || []}
                  onUpload={urls => handleCostumeImageUpload(idx, urls)}
                  onRemove={imgIdx => removeCostumeImage(idx, imgIdx)}
                  label="의상 사진"
                />
              </div>
            ))}
          </div>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={addCostume}>+ 의상 추가</button>
          {/* 의상 저장 버튼 */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ fontSize: 13, padding: '12px 32px', letterSpacing: '0.05em' }}
              onClick={handleSaveCostumes}>
              의상 저장
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── TAB 5: 결제 정보 ────────────────────────────────────────────
  const renderPaymentTab = () => {
    const pi = paymentDraft ?? profile?.paymentInfo ?? { bankName: '', accountNumber: '', accountHolder: '', note: '' };
    const update = (field, val) => setPaymentDraft({ ...pi, [field]: val });
    const handleSavePayment = () => {
      saveProfileData({ ...profile, paymentInfo: pi });
      setPaymentDraft(null);
      showSaved('정산 계좌가 저장되었습니다 ✓');
    };
    const paymentDirty = paymentDraft !== null;

    return (
      <div style={{ maxWidth: 600 }}>

        {/* 구조 설명 */}
        <div style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', padding: '24px 28px', position: 'relative', marginBottom: 32 }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>💡 Phosnap 정산 구조</div>
          {[
            { step: '01', title: '고객 결제', desc: '카드 · 카카오페이 · 네이버페이 · 토스페이 → TossPayments로 수령' },
            { step: '02', title: 'Phosnap 수수료 차감', desc: '등급별 플랫폼 수수료 차감 (Rising 20% ~ Elite 12%, 얼리억세스 작가 10% 고정 · 6개월)' },
            { step: '03', title: '작가 정산', desc: '촬영 완료 확인 후 D+3 영업일 이내 작가 계좌로 자동 입금' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 11, color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>{item.step}</span>
              <div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(232,80,80,0.06)', border: '1px solid rgba(232,80,80,0.2)', fontSize: 12, color: 'rgba(232,80,80,0.8)', lineHeight: 1.7 }}>
            ⚠ 고객에게 개인 계좌번호를 직접 노출하거나 플랫폼 외 결제를 유도하는 행위는 서비스 이용약관 위반입니다.<br/>
            계좌이체는 TossPayments 가상계좌를 통해서만 제공되어 수수료 구조가 유지됩니다.
          </div>
        </div>

        {/* 정산 계좌 (내부용) */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            정산 계좌 등록 <span style={{ color: 'rgba(136,136,136,0.4)' }}>— 고객에게 노출되지 않습니다</span>
            {!(pi.bankName && pi.accountNumber && pi.accountHolder) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e85d5d', display: 'inline-block', flexShrink: 0 }} title="필수: 정산 계좌 등록" />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>
              은행명
              <input value={pi.bankName} onChange={e => update('bankName', e.target.value)}
                placeholder="예: 카카오뱅크"
                style={{ display: 'block', marginTop: 6, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', fontFamily: 'var(--font-serif)', fontSize: 14 }} />
            </label>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>
              예금주
              <input value={pi.accountHolder} onChange={e => update('accountHolder', e.target.value)}
                placeholder="예: 홍길동"
                style={{ display: 'block', marginTop: 6, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', fontFamily: 'var(--font-serif)', fontSize: 14 }} />
            </label>
          </div>
          <label style={{ fontSize: 11, color: 'var(--muted)' }}>
            계좌번호
            <input value={pi.accountNumber} onChange={e => update('accountNumber', e.target.value)}
              placeholder="예: 3333-01-0000000"
              style={{ display: 'block', marginTop: 6, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', fontFamily: 'var(--font-serif)', fontSize: 14 }} />
          </label>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 16, lineHeight: 1.7 }}>
            정산 계좌는 Phosnap 운영팀 검토 후 확인됩니다. 라이브 모드 전환 시 사업자등록증 또는 신분증 사본이 필요합니다.
          </p>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-primary" style={{ fontSize: 12, padding: '10px 24px' }}
              onClick={handleSavePayment}
              disabled={!paymentDirty}>
              {paymentDirty ? '정산 계좌 저장' : '변경 사항 없음'}
            </button>
            {paymentDirty && (
              <button style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}
                onClick={() => setPaymentDraft(null)}>
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── TAB: 콜라보 ───────────────────────────────────────────────────
  // ── TAB: 실적 ──────────────────────────────────────────────────────
  const renderPerformanceTab = () => {
    const monthly = getMonthlySales(artistId);
    const thisMonth = getCurrentMonthSales(artistId);
    const lastMonth = getLastMonthSales(artistId);
    const totalRev = getTotalRevenue(artistId);
    const totalCnt = getTotalCount(artistId);
    const avgPrice = totalCnt > 0 ? Math.round(totalRev / totalCnt) : 0;

    // 전월 대비 매출 변동
    const revChange = lastMonth.revenue > 0
      ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
      : null;
    const cntChange = lastMonth.count > 0
      ? Math.round(((thisMonth.count - lastMonth.count) / lastMonth.count) * 100)
      : null;

    const handleRangeSearch = () => {
      if (!perfDateStart || !perfDateEnd) return;
      const result = getDateRangeSummary(artistId, perfDateStart, perfDateEnd);
      setPerfRangeResult(result);
    };

    const cellStyle = { padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border)' };
    const headerStyle = { ...cellStyle, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--bg)' };

    return (
      <div>
        {/* 이번 달 요약 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>이번 달 실적 요약</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: '매출', value: formatMoneyFull(thisMonth.revenue), change: revChange, color: 'var(--gold)' },
              { label: '건수', value: `${thisMonth.count}건`, change: cntChange, color: '#60a5fa' },
              { label: '평균 단가', value: formatMoneyFull(thisMonth.count > 0 ? Math.round(thisMonth.revenue / thisMonth.count) : 0), color: 'var(--text)' },
              { label: '정산 대기', value: `${thisMonth.pendingCount}건`, sub: formatMoneyFull(thisMonth.pendingAmount), color: thisMonth.pendingCount > 0 ? '#facc15' : 'var(--muted)' },
            ].map((c, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px 14px', position: 'relative' }}>
                <Corners />
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', color: c.color, marginBottom: 4 }}>{c.value}</div>
                {c.change !== undefined && c.change !== null && (
                  <div style={{ fontSize: 10, color: c.change >= 0 ? '#22c55e' : '#e85d5d' }}>
                    전월 대비 {c.change > 0 ? '+' : ''}{c.change}%
                  </div>
                )}
                {c.sub && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{c.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* 날짜 범위 검색 */}
        <div style={{ marginBottom: 28, padding: '20px 24px', background: 'var(--bg2)', border: '1px solid var(--border)', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>기간별 실적 조회</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: perfRangeResult ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>시작일</div>
              <input type="date" value={perfDateStart} onChange={e => setPerfDateStart(e.target.value)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, colorScheme: 'dark' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>종료일</div>
              <input type="date" value={perfDateEnd} onChange={e => setPerfDateEnd(e.target.value)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, colorScheme: 'dark' }} />
            </div>
            <button className="btn-primary" style={{ padding: '8px 20px', fontSize: 12 }} onClick={handleRangeSearch}
              disabled={!perfDateStart || !perfDateEnd}>
              조회
            </button>
            {perfRangeResult && (
              <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: 11 }} onClick={() => setPerfRangeResult(null)}>
                초기화
              </button>
            )}
          </div>

          {/* 기간 조회 결과 */}
          {perfRangeResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: '총 매출', value: formatMoneyFull(perfRangeResult.revenue), color: 'var(--gold)' },
                { label: '정산액', value: formatMoneyFull(perfRangeResult.netRevenue), color: '#22c55e' },
                { label: '총 건수', value: `${perfRangeResult.count}건`, color: '#60a5fa' },
                { label: '평균 단가', value: formatMoneyFull(perfRangeResult.avgAmount), color: 'var(--text)' },
                { label: '콜라보', value: `${perfRangeResult.collaboCount}건`, color: '#c084fc' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '14px 12px', border: '1px solid var(--border)', background: 'var(--bg)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 16, fontFamily: 'var(--font-serif)', color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 월별 실적 테이블 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>월별 실적</div>
          <div style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...headerStyle, textAlign: 'left' }}>월</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>건수</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>매출</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>정산액</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>평균 단가</th>
                  <th style={{ ...headerStyle, textAlign: 'right' }}>콜라보</th>
                  <th style={{ ...headerStyle, textAlign: 'center' }}>정산 상태</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, idx) => {
                  const avg = m.count > 0 ? Math.round(m.revenue / m.count) : 0;
                  const prevMonth = monthly[idx + 1]; // 이전 월 (역순 정렬이므로)
                  const revDelta = prevMonth && prevMonth.revenue > 0
                    ? Math.round(((m.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
                    : null;
                  return (
                    <tr key={m.yearMonth} style={{ background: idx === 0 ? 'rgba(232,160,32,0.03)' : 'transparent' }}>
                      <td style={{ ...cellStyle, textAlign: 'left', fontFamily: 'var(--font-serif)', color: idx === 0 ? 'var(--gold)' : 'var(--text)' }}>
                        {m.yearMonth}
                        {idx === 0 && <span style={{ fontSize: 9, color: 'var(--gold)', marginLeft: 6 }}>이번 달</span>}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)' }}>{m.count}건</td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>
                        {formatMoneyFull(m.revenue)}
                        {revDelta !== null && (
                          <span style={{ fontSize: 9, color: revDelta >= 0 ? '#22c55e' : '#e85d5d', marginLeft: 6 }}>
                            {revDelta > 0 ? '↑' : revDelta < 0 ? '↓' : '→'}{Math.abs(revDelta)}%
                          </span>
                        )}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: '#22c55e' }}>{formatMoneyFull(m.netRevenue)}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: 'var(--muted)' }}>{formatMoneyFull(avg)}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: m.collaboCount > 0 ? '#c084fc' : 'var(--muted)' }}>
                        {m.collaboCount > 0 ? `${m.collaboCount}건` : '-'}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        {m.pending > 0 ? (
                          <span style={{ fontSize: 10, padding: '2px 8px', border: '1px solid rgba(250,204,21,0.3)', color: '#facc15', fontFamily: 'var(--font-serif)' }}>
                            대기 {m.pending}건
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, padding: '2px 8px', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontFamily: 'var(--font-serif)' }}>
                            완료
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* 합계 행 */}
                <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--gold-border)' }}>
                  <td style={{ ...cellStyle, textAlign: 'left', fontFamily: 'var(--font-serif)', color: 'var(--gold)', fontWeight: 600 }}>합계</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>{totalCnt}건</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>{formatMoneyFull(totalRev)}</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: '#22c55e' }}>{formatMoneyFull(getTotalNetRevenue(artistId))}</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: 'var(--muted)' }}>{formatMoneyFull(avgPrice)}</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', color: '#c084fc' }}>
                    {monthly.reduce((s, m) => s + m.collaboCount, 0)}건
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 이번 달 예약 예측 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>이번 달 예약 예측</div>
          {thisMonth.count === 0 ? (
            <div style={{ padding: '32px 24px', background: 'var(--bg2)', border: '1px solid var(--border)', position: 'relative', textAlign: 'center' }}>
              <Corners />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                첫 예약을 받으면 AI 예측이 시작됩니다
              </div>
              <div style={{ fontSize: 11, color: 'var(--gold)', cursor: 'pointer' }}>
                프로필을 완성하고 첫 고객을 만나보세요 →
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 24px', background: 'var(--bg2)', border: '1px solid var(--border)', position: 'relative' }}>
              <Corners />
              <div style={{ fontSize: 12, color: 'var(--text)' }}>
                예측 데이터 분석 중...
              </div>
            </div>
          )}
        </div>

        {/* 인사이트 */}
        <div style={{ padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>인사이트</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2.0 }}>
            {monthly.length > 0 && (() => {
              const best = [...monthly].sort((a, b) => b.revenue - a.revenue)[0];
              const collaboTotal = monthly.reduce((s, m) => s + m.collaboCount, 0);
              const collaboRatio = totalCnt > 0 ? Math.round((collaboTotal / totalCnt) * 100) : 0;
              return (
                <>
                  <div>
                    <span style={{ color: 'var(--gold)' }}>최고 매출 월:</span>{' '}
                    {best.yearMonth} ({formatMoneyFull(best.revenue)}, {best.count}건)
                  </div>
                  <div>
                    <span style={{ color: '#c084fc' }}>콜라보 비율:</span>{' '}
                    전체 {totalCnt}건 중 {collaboTotal}건 ({collaboRatio}%)
                  </div>
                  <div>
                    <span style={{ color: '#60a5fa' }}>누적 평균 단가:</span>{' '}
                    {formatMoneyFull(avgPrice)} / 건
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  const renderCollaboTab = () => {
    const myType = artistType; // 'photographer' | 'hmua' | 'videographer'
    const myLocs = profile?.locations ?? [];
    const remaining = getRemainingProposals(artistId);
    const received = getReceivedProposals(artistId);
    const sent = getSentProposals(artistId);
    const pendingIn = received.filter(p => p.status === 'pending');

    // 내 작가 데이터 + 등급/수수료 계산
    const myArtistData = PHOTOGRAPHERS.find(p => p.id === artistId);
    const myShoots = myArtistData?.reviews || 0;
    const myRating = myArtistData?.rating || 0;
    const myFees = getArtistFees(myShoots, myRating);
    const myTierInfo = ARTIST_TIERS[myFees.tier];
    const myTierColor = TIER_COLORS[myFees.tier];
    const nextProgress = getNextTierProgress(myShoots, myRating);

    // 콜라보 가능한 작가 찾기 (노출 ON인 활동 지역 기준)
    const compatibleTypes = COLLABO_MATRIX[myType] || [];
    // 내 활동 지역 중 노출 ON인 지역만 사용
    const myActiveLocs = myLocs.filter(l => l.active !== false);
    const myActiveRegionIds = myActiveLocs.map(l => l.regionId).filter(Boolean);
    const myMainLoc = myLocs.find(l => l.isMain);
    const hasRegions = myActiveRegionIds.length > 0;

    // 내 포트폴리오에 태그된 도시들 (고객에게 노출되는 도시)
    const myPortfolioCities = [...new Set(myArtistData?.portfolioLocations || [])];
    // 노출 ON 활동 지역 + 포트폴리오 도시 합집합
    const myAllCities = [...new Set([...myActiveRegionIds, ...myPortfolioCities])];

    // 상대방의 노출 ON 활동 도시 가져오기 (프로필 기반)
    const getTheirActiveCities = (ph) => {
      const theirProfile = getProfile('photographer', ph.id);
      const theirLocs = theirProfile?.locations || [];
      const activeLocs = theirLocs.filter(l => l.active !== false);
      if (activeLocs.length > 0) {
        return activeLocs.map(l => l.regionId).filter(Boolean);
      }
      // 프로필 미등록 작가 → PHOTOGRAPHERS 데이터의 locationId를 활성으로 간주
      return [ph.locationId, ...(ph.portfolioLocations || [])].filter(Boolean);
    };

    // 활동 지역 미등록 시 콜라보 불가 / 상대방도 노출 ON인 지역만 매칭
    const matchableArtists = !hasRegions ? [] : PHOTOGRAPHERS.filter(ph => {
      if (ph.id === artistId) return false;
      const theirType = ph.artistType || 'photographer';
      if (!compatibleTypes.includes(theirType)) return false;
      // 상대방의 노출 ON 활동 도시만 체크
      const theirActiveCities = getTheirActiveCities(ph);
      // 내 노출 ON 도시와 겹치는 게 있으면 매칭
      return theirActiveCities.some(city => myAllCities.includes(city));
    });

    // 타입 필터 적용
    const filteredArtists = collaboTypeFilter === 'all'
      ? matchableArtists
      : matchableArtists.filter(ph => {
          const t = ph.artistType || 'photographer';
          if (collaboTypeFilter === 'photographer') return t === 'photographer' || t === 'both';
          if (collaboTypeFilter === 'videographer') return t === 'videographer' || t === 'both';
          return t === collaboTypeFilter;
        });

    // 메인 활동지 작가 / 출장지 작가 분리 (상대방 노출 ON 도시 기준)
    const myMainLocActive = myMainLoc && myMainLoc.active !== false;
    const mainLocArtists = (myMainLoc && myMainLocActive) ? filteredArtists.filter(ph => {
      const theirActiveCities = getTheirActiveCities(ph);
      return theirActiveCities.includes(myMainLoc.regionId);
    }) : [];
    const tripLocArtists = filteredArtists.filter(ph => !mainLocArtists.includes(ph));

    // 출장지 겹치는 날짜 계산 헬퍼
    // - 내 출장 지역(기간 있음)과 상대방 위치 비교
    // - 상대방 메인 활동지(기간 없음) = 항상 활동 → 내 출장 기간 전체가 겹침
    // - 상대방 출장 지역(기간 있음) = 기간 교집합 계산
    // - 프로필 미등록 작가 → locationId를 메인 활동지로 간주
    const getOverlappingDates = (theirId) => {
      const myTripLocs = myLocs.filter(l => !l.isMain && l.period?.start && l.period?.end && l.active !== false);
      if (myTripLocs.length === 0) return [];

      // 상대방 프로필 위치 가져오기
      const theirProfile = getProfile('photographer', theirId);
      let theirAllLocs = (theirProfile?.locations || []).filter(l => l.active !== false);

      // 프로필 미등록 작가 → photographers 데이터의 locationId를 메인으로 간주
      const theirArtistData = PHOTOGRAPHERS.find(p => p.id === theirId);
      if (theirAllLocs.length === 0 && theirArtistData?.locationId) {
        theirAllLocs = [{
          regionId: theirArtistData.locationId,
          name: theirArtistData.location || theirArtistData.locationId,
          isMain: true,
          period: null,
        }];
      }

      const overlaps = [];
      for (const my of myTripLocs) {
        const myRegion = my.regionId;
        const myStart = new Date(my.period.start);
        const myEnd = new Date(my.period.end);

        for (const their of theirAllLocs) {
          const theirRegion = their.regionId || their.id;
          if (myRegion !== theirRegion) continue;

          if (their.period?.start && their.period?.end) {
            // 상대도 기간이 있는 경우 → 교집합 계산
            const theirStart = new Date(their.period.start);
            const theirEnd = new Date(their.period.end);
            const overlapStart = new Date(Math.max(myStart, theirStart));
            const overlapEnd = new Date(Math.min(myEnd, theirEnd));
            if (overlapStart <= overlapEnd) {
              overlaps.push({
                city: my.name || myRegion,
                start: overlapStart.toISOString().slice(0, 10),
                end: overlapEnd.toISOString().slice(0, 10),
                days: Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1,
                type: 'trip', // 둘 다 출장
              });
            }
          } else {
            // 상대 메인 활동지(기간 없음 = 상시) → 내 출장 기간 전체가 겹침
            overlaps.push({
              city: my.name || myRegion,
              start: my.period.start,
              end: my.period.end,
              days: Math.round((myEnd - myStart) / (1000 * 60 * 60 * 24)) + 1,
              type: 'main', // 상대가 해당 도시 상주
            });
          }
        }
      }
      return overlaps;
    };

    // 제의 보내기
    const handleSendProposal = (targetArtist, dates, message, collaboRole, timeInfo) => {
      const theirType = targetArtist.artistType || 'photographer';
      const sameType = isSameTypeCollabo(myType, theirType);
      const result = createProposal(artistId, targetArtist.id, {
        dates,
        locationId: myMainLoc?.regionId || '',
        message,
        role: myType,
        collaboRole: sameType ? collaboRole : '',
        isSameType: sameType,
        timeStart: timeInfo?.timeStart || '',
        timeEnd: timeInfo?.timeEnd || '',
        dailyHours: timeInfo?.dailyHours || 0,
        totalHours: timeInfo?.totalHours || 0,
      });
      if (result.ok) {
        showSaved('콜라보 제의를 보냈습니다 ✓');
        loadCollabo();
        setCollaboProposalPopup(null);
      } else {
        alert(result.message || '제의 실패');
      }
    };

    // 수락 / 거절
    const handleAccept = (proposalId) => {
      respondToProposal(proposalId, 'accepted');
      loadCollabo();
      showSaved('콜라보 수락 완료 ✓');
    };
    const handleReject = (proposalId) => {
      respondToProposal(proposalId, 'rejected', collaboRejectReason);
      setCollaboRejectPopup(null);
      setCollaboRejectReason('');
      loadCollabo();
      showSaved('콜라보 거절 완료');
    };

    // 내 활동 지역 중 이 작가와 겹치는 지역이 노출 ON인지 확인
    const isMyMatchingLocActive = (ph) => {
      const theirActiveCities = getTheirActiveCities(ph);
      // 내 노출 ON 지역 중 상대방과 겹치는 게 있는지
      return myActiveLocs.some(l => theirActiveCities.includes(l.regionId));
    };

    // 작가 카드 컴포넌트
    const ArtistCard = ({ ph, showPropose = true }) => {
      const type = ARTIST_TYPES[ph.artistType || 'photographer'];
      const theirType = ph.artistType || 'photographer';
      const sameType = isSameTypeCollabo(myType, theirType);
      const alreadySent = sent.some(p => p.toId === ph.id && p.status === 'pending');
      const myLocActive = isMyMatchingLocActive(ph);
      return (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '16px 20px', position: 'relative', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Corners />
          {/* 프로필 이미지 */}
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `url(${ph.img}) center/cover`, flexShrink: 0, border: '2px solid var(--border)' }} />
          {/* 정보 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>{ph.nameKo || ph.name}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                {type?.icon} {type?.ko}
              </span>
              {sameType && (
                <span style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--gold-border)', color: 'var(--gold)', fontFamily: 'var(--font-serif)', background: 'var(--gold-dim)' }}>
                  동종
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
              {ph.location} · ★ {ph.rating} ({ph.reviews}건)
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {ph.languages?.join(' · ')}
            </div>
          </div>
          {/* 제의 버튼 */}
          {showPropose && (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              {alreadySent ? (
                <span style={{ fontSize: 11, color: 'var(--gold)', padding: '6px 14px', border: '1px solid var(--gold-border)', fontFamily: 'var(--font-serif)' }}>
                  제의 대기 중
                </span>
              ) : !myLocActive ? (
                <div>
                  <button
                    className="btn-outline"
                    style={{ fontSize: 11, padding: '6px 14px', opacity: 0.4, cursor: 'not-allowed' }}
                    disabled
                  >
                    콜라보 제의
                  </button>
                  <div style={{ fontSize: 9, color: '#e85d5d', marginTop: 4 }}>
                    해당 지역 노출 ON 필요
                  </div>
                </div>
              ) : (
                <button
                  className="btn-outline"
                  style={{ fontSize: 11, padding: '6px 14px' }}
                  disabled={remaining <= 0}
                  onClick={() => setCollaboProposalPopup({ targetArtist: ph })}
                >
                  콜라보 제의
                </button>
              )}
            </div>
          )}
        </div>
      );
    };

    // 받은 제의 카드
    const ProposalCard = ({ proposal, direction }) => {
      const other = PHOTOGRAPHERS.find(ph => ph.id === (direction === 'received' ? proposal.fromId : proposal.toId));
      const status = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.pending;
      const type = ARTIST_TYPES[other?.artistType || 'photographer'];
      return (
        <div style={{ border: `1px solid ${status.color}33`, background: 'var(--bg2)', padding: '16px 20px', position: 'relative' }}>
          <Corners />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: other?.img ? `url(${other.img}) center/cover` : 'var(--border)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                  {other?.nameKo || other?.name || '알 수 없음'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{type?.icon} {type?.ko} · {other?.location}</div>
              </div>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', padding: '3px 10px', border: `1px solid ${status.color}44`, color: status.color }}>
              {status.ko}
            </span>
          </div>
          {/* 동종 콜라보 역할 표시 */}
          {proposal.isSameType && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, padding: '3px 10px', background: 'rgba(232,160,32,0.08)', border: '1px solid var(--gold-border)', color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                동종 콜라보
              </span>
              {proposal.collaboRole && (
                <span style={{ fontSize: 10, padding: '3px 10px', background: proposal.collaboRole === 'main' ? 'rgba(34,197,94,0.08)' : 'rgba(200,200,200,0.08)', border: `1px solid ${proposal.collaboRole === 'main' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, color: proposal.collaboRole === 'main' ? '#22c55e' : 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                  {COLLABO_ROLES[proposal.collaboRole]?.ko || proposal.collaboRole} ({proposal.revenueShare?.[proposal.collaboRole]}%)
                </span>
              )}
            </div>
          )}
          {/* 날짜 + 메시지 */}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            일정: <span style={{ color: 'var(--text)' }}>{proposal.dates?.join(', ')}</span>
          </div>
          {proposal.message && (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 12, lineHeight: 1.7 }}>
              {proposal.message}
            </div>
          )}
          {/* 수락/거절 버튼 (받은 제의 + 대기중일 때만) */}
          {direction === 'received' && proposal.status === 'pending' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => handleAccept(proposal.id)}>
                ✓ 수락
              </button>
              <button className="btn-ghost" style={{ fontSize: 12, color: '#e85d5d', borderColor: 'rgba(232,80,80,0.3)' }}
                onClick={() => setCollaboRejectPopup({ proposalId: proposal.id })}>
                거절
              </button>
            </div>
          )}
          {/* 거절 사유 표시 */}
          {proposal.status === 'rejected' && proposal.rejectReason && (
            <div style={{ fontSize: 11, color: 'rgba(232,80,80,0.7)', marginTop: 4 }}>
              사유: {proposal.rejectReason}
            </div>
          )}
        </div>
      );
    };

    return (
      <div>
        {/* 상단: 제의 현황 요약 */}
        {(() => {
          const dailyUsed = getDailyProposalCount(artistId);
          const dailyRemaining = COLLABO_RULES.maxDailyProposals - dailyUsed;
          const sameTypeUsed = getMonthlySameTypeCount(artistId, myType);
          const sameTypeRemaining = COLLABO_RULES.maxSameTypePerMonth - sameTypeUsed;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
              <div style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', padding: '18px 16px', position: 'relative', textAlign: 'center' }}>
                <Corners />
                <div style={{ fontSize: 26, fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: 4 }}>{remaining}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>이번 달 남은 수락</div>
                <div style={{ fontSize: 9, color: 'rgba(232,160,32,0.5)', marginTop: 3 }}>콜라보 수락 월 {COLLABO_RULES.maxProposalsPerMonth}회 제한</div>
              </div>
              <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '18px 16px', position: 'relative', textAlign: 'center' }}>
                <Corners />
                <div style={{ fontSize: 26, fontFamily: 'var(--font-serif)', color: dailyRemaining <= 0 ? '#e85d5d' : 'var(--text)', marginBottom: 4 }}>{dailyRemaining}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>오늘 남은 제안</div>
                <div style={{ fontSize: 9, color: 'rgba(232,160,32,0.5)', marginTop: 3 }}>확장형 콜라보 제안 1일 {COLLABO_RULES.maxDailyProposals}회 제한</div>
              </div>
              <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '18px 16px', position: 'relative', textAlign: 'center' }}>
                <Corners />
                <div style={{ fontSize: 26, fontFamily: 'var(--font-serif)', color: pendingIn.length > 0 ? '#22c55e' : 'var(--text)', marginBottom: 4 }}>{pendingIn.length}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>받은 제의 (대기)</div>
              </div>
              <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '18px 16px', position: 'relative', textAlign: 'center' }}>
                <Corners />
                <div style={{ fontSize: 26, fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: 4 }}>{sent.filter(p => p.status === 'accepted').length}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>성사된 콜라보</div>
                <div style={{ fontSize: 9, color: 'rgba(232,160,32,0.5)', marginTop: 3 }}>동종 {sameTypeRemaining}/{COLLABO_RULES.maxSameTypePerMonth}회 남음</div>
              </div>
            </div>
          );
        })()}

        {/* 콜라보 규칙 안내 */}
        <div style={{ marginBottom: 28, padding: '14px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--gold)' }}>콜라보 규칙</strong><br/>
          · <strong>보완형</strong>: 사진작가 ↔ 영상작가, 사진작가 ↔ H&M 작가, 영상작가 ↔ H&M 작가 등 이종 콜라보<br/>
          · <strong>확장형 (동종)</strong>: 사진+사진, 영상+영상 등 — 월 {COLLABO_RULES.maxSameTypePerMonth}회 제한, 메인/서브 역할 지정 필수<br/>
          · 제안 발송: 하루 {COLLABO_RULES.maxDailyProposals}회 / 제안 수락: 월 {COLLABO_RULES.maxProposalsPerMonth}회 (연속일 = 1회)<br/>
          · 동일 작가 재요청: {COLLABO_RULES.cooldownSamePerson}일 쿨타임 · 거절·미응답 시 차감 없음 · {COLLABO_RULES.autoExpireDays}일 미응답 자동 만료<br/>
          · 수수료: 등급별 차등 (Rising 20% → Elite 12%) · 콜라보 촬영 시 할인 적용 (18% → 10%)
        </div>

        {/* 서브 탭 */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {[
            { key: 'browse', label: `콜라보 작가 찾기 (${filteredArtists.length})` },
            { key: 'received', label: `받은 제의 (${pendingIn.length})` },
            { key: 'sent', label: `보낸 제의 (${sent.length})` },
            { key: 'chat', label: '💬 채팅' },
          ].map(sub => (
            <button key={sub.key} onClick={() => setCollaboView(sub.key)} style={{
              padding: '10px 18px', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
              background: 'transparent',
              color: collaboView === sub.key ? 'var(--gold)' : 'var(--muted)',
              border: 'none',
              borderBottom: `2px solid ${collaboView === sub.key ? 'var(--gold)' : 'transparent'}`,
              cursor: 'pointer', marginBottom: -1,
            }}>
              {sub.label}
            </button>
          ))}
        </div>

        {/* 콜라보 작가 찾기 */}
        {collaboView === 'browse' && (
          <div>
            {/* 타입 필터 버튼 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'all',          label: '전체', icon: '' },
                { key: 'photographer', label: '사진', icon: '📸' },
                { key: 'videographer', label: '영상', icon: '🎬' },
                { key: 'hmua',         label: 'H&M', icon: '💄' },
              ].map(f => (
                <button key={f.key} onClick={() => setCollaboTypeFilter(f.key)} style={{
                  padding: '7px 16px', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
                  background: collaboTypeFilter === f.key ? 'var(--gold-dim)' : 'var(--bg2)',
                  color: collaboTypeFilter === f.key ? 'var(--gold)' : 'var(--muted)',
                  border: `1px solid ${collaboTypeFilter === f.key ? 'var(--gold)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {f.icon}{f.icon ? ' ' : ''}{f.label}
                  {f.key === 'all' ? ` (${matchableArtists.length})` : ` (${matchableArtists.filter(ph => {
                    const t = ph.artistType || 'photographer';
                    if (f.key === 'photographer') return t === 'photographer' || t === 'both';
                    if (f.key === 'videographer') return t === 'videographer' || t === 'both';
                    return t === f.key;
                  }).length})`}
                </button>
              ))}
            </div>
            {/* 메인 활동지 매칭 작가 */}
            {myMainLoc && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                  ★ 메인 활동지 ({myMainLoc.name}) 콜라보 가능 작가
                </div>
                {mainLocArtists.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mainLocArtists.map(ph => <ArtistCard key={ph.id} ph={ph} />)}
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 12 }}>
                    현재 이 지역에 콜라보 가능한 작가가 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 출장지 매칭 작가 */}
            {tripLocArtists.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                  출장 지역 콜라보 가능 작가
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tripLocArtists.map(ph => {
                    const overlaps = getOverlappingDates(ph.id);
                    return (
                      <div key={ph.id}>
                        <ArtistCard ph={ph} />
                        {overlaps.length > 0 && (
                          <div style={{ marginTop: -1, padding: '8px 20px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)', borderTop: 'none', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'var(--font-serif)', letterSpacing: '0.06em' }}>📅 겹치는 일정:</span>
                            {overlaps.map((o, i) => (
                              <span key={i} style={{ fontSize: 10, color: 'var(--text)', padding: '3px 10px', background: o.type === 'main' ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', border: `1px solid ${o.type === 'main' ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.15)'}` }}>
                                {o.city} {o.start} ~ {o.end} ({o.days}일){o.type === 'main' ? ' · 상주' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!hasRegions && (
              <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
                <Corners />
                <div style={{ fontSize: 24, marginBottom: 12 }}>📍</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
                  콜라보 작가 찾기를 이용하려면<br/>
                  먼저 <strong style={{ color: 'var(--gold)' }}>활동 지역</strong> 탭에서 활동 지역을 등록해주세요.
                </p>
                <button
                  onClick={() => setActiveTab('locations')}
                  style={{ padding: '10px 24px', fontSize: 12, fontFamily: 'var(--font-serif)', background: 'var(--gold)', color: '#0B0B0B', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}
                >
                  활동 지역 등록하기 →
                </button>
              </div>
            )}
            {hasRegions && matchableArtists.length === 0 && (
              <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
                <Corners />
                <div style={{ fontSize: 24, marginBottom: 12 }}>🤝</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>
                  현재 활동 지역에 콜라보 가능한 작가가 없습니다.<br/>
                  활동 지역을 추가하면 더 많은 매칭이 가능합니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 받은 제의 */}
        {collaboView === 'received' && (
          <div>
            {received.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
                <Corners />
                <div style={{ fontSize: 24, marginBottom: 12 }}>📬</div>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>받은 콜라보 제의가 없습니다.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {received.map(p => <ProposalCard key={p.id} proposal={p} direction="received" />)}
              </div>
            )}
          </div>
        )}

        {/* 보낸 제의 */}
        {collaboView === 'sent' && (
          <div>
            {sent.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
                <Corners />
                <div style={{ fontSize: 24, marginBottom: 12 }}>📤</div>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>보낸 콜라보 제의가 없습니다.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sent.map(p => <ProposalCard key={p.id} proposal={p} direction="sent" />)}
              </div>
            )}
          </div>
        )}

        {/* 채팅 */}
        {collaboView === 'chat' && (
          <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative', minHeight: 500 }}>
            <Corners />
            <CollaboChat myId={artistId} onClose={() => setCollaboView('browse')} />
          </div>
        )}

        {/* 제의 팝업 */}
        {collaboProposalPopup && (() => {
          const target = collaboProposalPopup.targetArtist;
          const targetType = ARTIST_TYPES[target.artistType || 'photographer'];
          const theirType = target.artistType || 'photographer';
          const sameType = isSameTypeCollabo(myType, theirType);
          const roleLabel = sameType ? '동종 콜라보 제의' : '콜라보 제의';
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1003, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold-border)', maxWidth: 500, width: '100%', padding: '36px 32px', position: 'relative' }}>
                <Corners />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                  {roleLabel}
                </div>

                {/* 대상 정보 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: `url(${target.img}) center/cover`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)' }}>{target.nameKo || target.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{targetType?.icon} {targetType?.ko} · {target.location}</div>
                  </div>
                </div>

                {/* 동종 콜라보 안내 + 역할 선택 */}
                {sameType && (
                  <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(232,160,32,0.06)', border: '1px solid var(--gold-border)' }}>
                    <div id="collabo-role-desc" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
                      동종 콜라보 — 역할을 선택해주세요
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
                      메인 작가: 리뷰·평점 기준, 수익 60% / 서브 작가: 수익 40%
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {Object.entries(COLLABO_ROLES).map(([key, role]) => (
                        <button
                          key={key}
                          id={`collabo-role-${key}`}
                          className="collabo-role-btn"
                          data-selected="false"
                          onClick={(e) => {
                            document.querySelectorAll('.collabo-role-btn').forEach(b => {
                              b.style.background = 'var(--bg)';
                              b.style.color = 'var(--muted)';
                              b.style.borderColor = 'var(--border)';
                              b.dataset.selected = 'false';
                            });
                            e.currentTarget.style.background = 'var(--gold-dim)';
                            e.currentTarget.style.color = 'var(--gold)';
                            e.currentTarget.style.borderColor = 'var(--gold)';
                            e.currentTarget.dataset.selected = 'true';
                            // 역할 설명 문구 업데이트
                            const desc = document.getElementById('collabo-role-desc');
                            if (desc) desc.textContent = key === 'main' ? '내가 메인 작가로 참여합니다' : '내가 서브 작가로 참여합니다';
                          }}
                          style={{
                            flex: 1, padding: '8px 12px', fontSize: 12, fontFamily: 'var(--font-serif)', cursor: 'pointer', textAlign: 'center',
                            background: 'var(--bg)',
                            color: 'var(--muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {role.ko} ({key === 'main' ? '60%' : '40%'})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 날짜 + 시간 입력 */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    콜라보 희망 날짜 (연속일은 시작~종료일)
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                      <input type="date" id="collabo-start" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, colorScheme: 'dark' }} onChange={() => {
                        const ts = document.getElementById('collabo-time-start')?.value;
                        const te = document.getElementById('collabo-time-end')?.value;
                        const sumEl = document.getElementById('collabo-time-summary');
                        if (ts && te && sumEl) {
                          const [sh, sm] = ts.split(':').map(Number);
                          const [eh, em] = te.split(':').map(Number);
                          const startD = document.getElementById('collabo-start')?.value;
                          const endD = document.getElementById('collabo-end')?.value || startD;
                          const days = startD && endD ? Math.max(1, Math.round((new Date(endD) - new Date(startD)) / 86400000) + 1) : 1;
                          const dailyH = (eh * 60 + em - sh * 60 - sm) / 60;
                          if (dailyH > 0) sumEl.textContent = `일 ${dailyH.toFixed(1)}시간 × ${days}일 = 총 ${(dailyH * days).toFixed(1)}시간`;
                        }
                      }} />
                      <input type="date" id="collabo-end" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, colorScheme: 'dark' }} onChange={() => {
                        const ts = document.getElementById('collabo-time-start')?.value;
                        const te = document.getElementById('collabo-time-end')?.value;
                        const sumEl = document.getElementById('collabo-time-summary');
                        if (ts && te && sumEl) {
                          const [sh, sm] = ts.split(':').map(Number);
                          const [eh, em] = te.split(':').map(Number);
                          const startD = document.getElementById('collabo-start')?.value;
                          const endD = document.getElementById('collabo-end')?.value || startD;
                          const days = startD && endD ? Math.max(1, Math.round((new Date(endD) - new Date(startD)) / 86400000) + 1) : 1;
                          const dailyH = (eh * 60 + em - sh * 60 - sm) / 60;
                          if (dailyH > 0) sumEl.textContent = `일 ${dailyH.toFixed(1)}시간 × ${days}일 = 총 ${(dailyH * days).toFixed(1)}시간`;
                        }
                      }} />
                    </div>
                  </label>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    희망 시간대
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginTop: 6, alignItems: 'center' }}>
                      <input type="time" id="collabo-time-start" defaultValue="10:00" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, colorScheme: 'dark' }} onChange={() => {
                        const ts = document.getElementById('collabo-time-start')?.value;
                        const te = document.getElementById('collabo-time-end')?.value;
                        const sumEl = document.getElementById('collabo-time-summary');
                        if (ts && te && sumEl) {
                          const [sh, sm] = ts.split(':').map(Number);
                          const [eh, em] = te.split(':').map(Number);
                          const startD = document.getElementById('collabo-start')?.value;
                          const endD = document.getElementById('collabo-end')?.value || startD;
                          const days = startD && endD ? Math.max(1, Math.round((new Date(endD) - new Date(startD)) / 86400000) + 1) : 1;
                          const dailyH = (eh * 60 + em - sh * 60 - sm) / 60;
                          if (dailyH > 0) {
                            const totalH = dailyH * days;
                            sumEl.textContent = `일 ${dailyH.toFixed(1)}시간 × ${days}일 = 총 ${totalH.toFixed(1)}시간`;
                          } else {
                            sumEl.textContent = '';
                          }
                        }
                      }} />
                      <input type="time" id="collabo-time-end" defaultValue="14:00" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-serif)', fontSize: 13, colorScheme: 'dark' }} onChange={() => {
                        // 동일 로직 (시작 시간 onChange와 같음)
                        const ts = document.getElementById('collabo-time-start')?.value;
                        const te = document.getElementById('collabo-time-end')?.value;
                        const sumEl = document.getElementById('collabo-time-summary');
                        if (ts && te && sumEl) {
                          const [sh, sm] = ts.split(':').map(Number);
                          const [eh, em] = te.split(':').map(Number);
                          const startD = document.getElementById('collabo-start')?.value;
                          const endD = document.getElementById('collabo-end')?.value || startD;
                          const days = startD && endD ? Math.max(1, Math.round((new Date(endD) - new Date(startD)) / 86400000) + 1) : 1;
                          const dailyH = (eh * 60 + em - sh * 60 - sm) / 60;
                          if (dailyH > 0) {
                            const totalH = dailyH * days;
                            sumEl.textContent = `일 ${dailyH.toFixed(1)}시간 × ${days}일 = 총 ${totalH.toFixed(1)}시간`;
                          } else {
                            sumEl.textContent = '';
                          }
                        }
                      }} />
                    </div>
                    <div id="collabo-time-summary" style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-serif)', marginTop: 8 }}>
                      일 4.0시간 × 1일 = 총 4.0시간
                    </div>
                  </label>
                </div>

                {/* 메시지 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>
                    메시지 (선택)
                    <textarea id="collabo-message" rows={3} placeholder="예: 교토 웨딩 촬영건으로 H&M 작가 아티스트를 찾고 있습니다. 함께 작업해보고 싶습니다!"
                      style={{ display: 'block', marginTop: 6, width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'var(--font-serif)', fontSize: 12, resize: 'vertical', lineHeight: 1.7 }} />
                  </label>
                </div>

                <div style={{ fontSize: 11, color: 'rgba(232,160,32,0.6)', marginBottom: 20 }}>
                  남은 제의 횟수: <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>{remaining}회</span> / 월 {COLLABO_RULES.maxProposalsPerMonth}회
                  {sameType && <span> · 동종 남은 횟수: {COLLABO_RULES.maxSameTypePerMonth - getMonthlySameTypeCount(artistId, myType)}회</span>}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
                    const startEl = document.getElementById('collabo-start');
                    const endEl = document.getElementById('collabo-end');
                    const msgEl = document.getElementById('collabo-message');
                    const start = startEl?.value;
                    const end = endEl?.value || start;
                    if (!start) { alert('날짜를 선택해주세요'); return; }
                    // 시간 체크
                    const timeStart = document.getElementById('collabo-time-start')?.value || '10:00';
                    const timeEnd = document.getElementById('collabo-time-end')?.value || '14:00';
                    const [tsh, tsm] = timeStart.split(':').map(Number);
                    const [teh, tem] = timeEnd.split(':').map(Number);
                    const dailyMinutes = (teh * 60 + tem) - (tsh * 60 + tsm);
                    if (dailyMinutes <= 0) { alert('종료 시간이 시작 시간보다 이후여야 합니다.'); return; }
                    // 동종 콜라보 역할 체크
                    let selectedRole = '';
                    if (sameType) {
                      const mainBtn = document.getElementById('collabo-role-main');
                      const subBtn = document.getElementById('collabo-role-sub');
                      if (mainBtn?.dataset.selected === 'true') selectedRole = 'main';
                      else if (subBtn?.dataset.selected === 'true') selectedRole = 'sub';
                      if (!selectedRole) { alert('동종 콜라보 시 메인/서브 역할을 선택해주세요.'); return; }
                    }
                    // 날짜 배열 생성
                    const dates = [];
                    let cur = new Date(start);
                    const endDate = new Date(end);
                    while (cur <= endDate) {
                      dates.push(cur.toISOString().slice(0, 10));
                      cur.setDate(cur.getDate() + 1);
                    }
                    const dailyHours = dailyMinutes / 60;
                    const totalHours = dailyHours * dates.length;
                    const timeInfo = { timeStart, timeEnd, dailyHours: +dailyHours.toFixed(1), totalHours: +totalHours.toFixed(1) };
                    handleSendProposal(target, dates, msgEl?.value || '', selectedRole, timeInfo);
                  }}>
                    제의 보내기 →
                  </button>
                  <button className="btn-ghost" style={{ padding: '0 16px' }} onClick={() => setCollaboProposalPopup(null)}>
                    취소
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 거절 사유 팝업 */}
        {collaboRejectPopup && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1003, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid rgba(232,80,80,0.3)', maxWidth: 440, width: '100%', padding: '36px 32px', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: '#e85d5d', textTransform: 'uppercase', marginBottom: 16 }}>
                콜라보 거절
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 16 }}>
                거절 사유를 입력해주세요 (선택). 상대방에게 전달됩니다.
              </p>
              <textarea value={collaboRejectReason} onChange={e => setCollaboRejectReason(e.target.value)}
                placeholder="예: 해당 기간에 이미 예약이 있습니다."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-serif)', lineHeight: 1.6, marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-primary" style={{ flex: 1, background: '#c53030', borderColor: '#c53030' }} onClick={() => handleReject(collaboRejectPopup.proposalId)}>
                  거절 확정
                </button>
                <button className="btn-ghost" onClick={() => { setCollaboRejectPopup(null); setCollaboRejectReason(''); }}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      {/* ── 글로벌 저장 토스트 (fixed overlay) ── */}
      {saveMsg && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '12px 32px', background: 'rgba(11,11,11,0.95)',
          border: '1px solid var(--gold-border)', fontSize: 13,
          color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
          textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          animation: 'fadeInDown 0.3s ease-out',
        }}>
          {saveMsg}
        </div>
      )}
      <div className="section">

        {/* ── 헤더 ── */}
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">작가 전용</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 40px)', letterSpacing: '0.05em', marginBottom: 16 }}>
            작가 대시보드
          </h1>
          {artist && (
            <div style={{ display: 'inline-flex', gap: 8, padding: '7px 14px', border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.04em' }}>
              {artist.nameKo || artist.name}
            </div>
          )}
        </div>

        {/* ── 대시보드 홈 요약 카드 ── */}
        {(() => {
          const totalRev = getTotalRevenue(artistId);
          const totalNet = getTotalNetRevenue(artistId);
          const totalCnt = getTotalCount(artistId);
          const thisMonth = getCurrentMonthSales(artistId);
          const lastMonth = getLastMonthSales(artistId);
          const revDiff = lastMonth.revenue > 0
            ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
            : 0;
          const cntDiff = lastMonth.count > 0
            ? Math.round(((thisMonth.count - lastMonth.count) / lastMonth.count) * 100)
            : 0;

          const cards = [
            { label: '총 누적 매출', value: formatMoney(totalRev), sub: `정산 완료: ${formatMoney(totalNet)}`, color: 'var(--gold)' },
            { label: '총 누적 건수', value: `${totalCnt}건`, sub: `평균 단가: ${formatMoney(totalCnt > 0 ? Math.round(totalRev / totalCnt) : 0)}원`, color: '#60a5fa' },
            { label: '이번 달 매출', value: formatMoney(thisMonth.revenue), sub: revDiff !== 0 ? `전월 대비 ${revDiff > 0 ? '+' : ''}${revDiff}%` : '전월 데이터 없음', color: revDiff >= 0 ? '#22c55e' : '#e85d5d' },
            { label: '이번 달 건수', value: `${thisMonth.count}건`, sub: `정산 대기: ${thisMonth.pendingCount}건 (${formatMoney(thisMonth.pendingAmount)})`, color: thisMonth.pendingCount > 0 ? '#facc15' : 'var(--muted)' },
          ];

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
              {cards.map((c, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 18px', position: 'relative' }}>
                  <Corners />
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 10 }}>{c.label}</div>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-serif)', color: c.color, letterSpacing: '0.02em', marginBottom: 6 }}>{c.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{c.sub}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── 탭 빨간점 알림 (필수 정보 미입력) ── */}
        {(() => {
          const locs = profile?.locations ?? [];
          const hasMainLoc = locs.some(l => l.isMain);
          const hasPortfolio = (profile?.portfolio ?? []).some(pf => (pf.images?.length > 0 || pf.url) && pf.regionId);
          const hasSnapProduct = snapProducts.length > 0;
          const pi = profile?.paymentInfo;
          const hasPayment = !!(pi?.bankName && pi?.accountNumber && pi?.accountHolder);
          const hasPendingBookings = pendingBookings.length > 0;
          const hasCollaboReq = collaboReceived.length > 0;

          // 각 탭별 빨간점 여부
          const tabAlerts = {
            locations: !hasMainLoc,
            info: !hasPortfolio,
            products: !hasSnapProduct,
            payment: !hasPayment,
            bookings: hasPendingBookings,
            collabo: hasCollaboReq,
          };

          // 전체 미완료 수 (상단에 안내 배너)
          const setupMissing = [!hasMainLoc, !hasPortfolio, !hasSnapProduct, !hasPayment].filter(Boolean).length;

          // 필수 항목 체크리스트
          const requiredItems = [
            { name: '활동 지역', completed: hasMainLoc },
            { name: '포트폴리오', completed: hasPortfolio },
            { name: '상품 관리', completed: hasSnapProduct },
            { name: '결제·정산', completed: hasPayment },
          ];

          return (
            <>
              {setupMissing > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={() => setRequiredItemsExpanded(!requiredItemsExpanded)}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      background: 'rgba(232,80,80,0.06)',
                      border: '1px solid rgba(232,80,80,0.15)',
                      fontSize: 12,
                      color: 'rgba(232,80,80,0.85)',
                      lineHeight: 1.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(232,80,80,0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(232,80,80,0.06)'}
                  >
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>고객에게 노출되려면 <strong>{setupMissing}개</strong> 필수 항목을 입력해주세요. 빨간 점이 표시된 탭을 확인하세요.</span>
                    <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: requiredItemsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>

                  {requiredItemsExpanded && (
                    <div style={{
                      marginTop: 8,
                      padding: '12px 18px',
                      background: 'rgba(232,80,80,0.03)',
                      border: '1px solid rgba(232,80,80,0.1)',
                      borderTop: 'none',
                      borderBottomLeftRadius: '4px',
                      borderBottomRightRadius: '4px',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'var(--font-serif)' }}>필수 항목 체크리스트</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {requiredItems.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: item.completed ? 'rgba(76,181,100,0.2)' : 'rgba(232,80,80,0.2)',
                              color: item.completed ? '#4cb564' : '#e85d5d',
                              fontWeight: 'bold',
                              fontSize: 11,
                            }}>
                              {item.completed ? '✓' : '✗'}
                            </span>
                            <span style={{ color: item.completed ? 'var(--muted)' : 'rgba(232,80,80,0.85)' }}>
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 36, gap: 0, flexWrap: 'wrap' }}>
                {[
                  { key: 'schedule',     label: '스케줄 관리' },
                  { key: 'locations',    label: '활동 지역' },
                  { key: 'info',         label: '포트폴리오 관리' },
                  { key: 'products',     label: '상품 관리' },
                  { key: 'payment',      label: '결제·정산' },
                  { key: 'performance',  label: '상세 실적' },
                  { key: 'collabo',      label: `콜라보${collaboReceived.length > 0 ? ` (${collaboReceived.length})` : ''}` },
                  { key: 'bookings',     label: `예약 요청${pendingBookings.length > 0 ? ` (${pendingBookings.length})` : ''}` },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                    padding: '12px 20px', fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
                    background: 'transparent',
                    color: activeTab === tab.key ? 'var(--gold)' : tab.key === 'bookings' && pendingBookings.length > 0 ? '#f0ac2a' : 'var(--muted)',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab.key ? 'var(--gold)' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                    marginBottom: -1,
                    position: 'relative',
                  }}>
                    {tab.label}
                    {tabAlerts[tab.key] && (
                      <span style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 8, height: 8, borderRadius: '50%',
                        background: tab.key === 'bookings' || tab.key === 'collabo' ? '#f0ac2a' : '#e85d5d',
                        display: 'inline-block',
                      }} />
                    )}
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        {/* ── 탭 컨텐츠 ── */}
        {activeTab === 'schedule'    && renderScheduleTab()}
        {activeTab === 'locations'   && renderLocationsTab()}
        {activeTab === 'info'        && renderInfoTab()}
        {activeTab === 'products'    && renderProductsTab()}
        {activeTab === 'payment'     && renderPaymentTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'collabo'     && renderCollaboTab()}
        {activeTab === 'bookings'    && renderBookingsTab()}

      </div>
      <Footer />
    </div>
  );
};

export default ArtistSchedule;
