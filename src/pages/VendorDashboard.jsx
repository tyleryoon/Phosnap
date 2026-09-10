import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import DressCard from '../components/DressCard';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import LocationPicker from '../components/LocationPicker';
import { useAuth } from '../contexts/AuthContext';
import { fmt } from '../data/photographers';
import {
  getMyVendorProfile, getVendorDresses, addVendorDress,
  updateVendorDress, getVendorBookings, updateVendorProfile,
  submitVendorReviewReply, getVendorReviewReplies,
} from '../lib/supabase';
import { isTagAllowed, sanitizeTag } from '../utils/tagFilter';
import { COSTUME_TAG_REGISTRY, VENUE_TAG_REGISTRY, getTagLabel, getAllTagIds } from '../data/tagRegistry';
import { getVendorReviews, getAverageRating, formatReview } from '../utils/vendorReviews';
import { getAvatarUrl } from '../lib/supabase';
import ProfileAvatar from '../components/ProfileAvatar';
import DragDropImageUpload from '../components/DragDropImageUpload';
import ReferralCard from '../components/ReferralCard';

const MOCK_BOOKINGS = [
  { id: 'b1', date: '2026-04-15', hours: '09:00-13:00', rentalType: 'half_am', customer: 'K**', itemName: '클래식 여성 한복', size: 'M', status: 'confirmed', confirmType: 'instant', vendorType: 'costume' },
  { id: 'b2', date: '2026-04-18', hours: '14:00-18:00', rentalType: 'half_pm', customer: 'T**', itemName: 'A라인 웨딩드레스', size: 'S', status: 'pending', vendorType: 'costume' },
  { id: 'b3', date: '2026-04-12', hours: '10:00-18:00', rentalType: 'full', customer: 'P**', itemName: '남성 턱시도', size: 'L', status: 'completed', confirmType: 'manual', vendorType: 'costume' },
  { id: 'b4', date: '2026-04-20', hours: '전일', rentalType: 'full', customer: 'L**', itemName: '여성 기모노', size: 'Free', status: 'confirmed', confirmType: 'manual', vendorType: 'costume' },
  { id: 'b5', date: '2026-04-22', hours: '09:00-12:00', rentalType: 'half_am', customer: 'M**', itemName: '모던 치파오', size: 'S', status: 'pending', vendorType: 'costume' },
  { id: 'b6', date: '2026-04-16', hours: '10:00-16:00', rentalType: 'full', customer: 'J**', itemName: '경복궁 한옥 스튜디오 A', size: '-', status: 'confirmed', confirmType: 'instant', vendorType: 'venue' },
  { id: 'b7', date: '2026-04-19', hours: '13:00-17:00', rentalType: 'half_pm', customer: 'H**', itemName: '루프탑 야외촬영장', size: '-', status: 'pending', vendorType: 'venue' },
];

// 의상 대여 일정 mock (사이즈 포함, itemId는 dresses.js의 id와 일치)
const MOCK_COSTUME_TIMELINE = [
  { itemId: 'di-1', itemName: '여성 경주 한복', size: 'S', start: '2026-04-13', end: '2026-04-13', hours: '09:00-13:00', type: 'half_am', customer: 'K**', status: 'confirmed', dashboardType: 'costume' },
  { itemId: 'di-1', itemName: '여성 경주 한복', size: 'M', start: '2026-04-13', end: '2026-04-13', hours: '14:00-18:00', type: 'half_pm', customer: 'L**', status: 'pending', dashboardType: 'costume' },
  { itemId: 'di-2', itemName: '남성 경주 한복', size: 'L', start: '2026-04-14', end: '2026-04-15', hours: '10:00-18:00', type: 'full', customer: 'T**', status: 'confirmed', dashboardType: 'costume' },
  { itemId: 'di-3', itemName: '여성 기모노 후리소데', size: 'Free', start: '2026-04-15', end: '2026-04-17', hours: '전일', type: 'multi', customer: 'P**', status: 'completed', dashboardType: 'costume' },
  { itemId: 'di-4', itemName: '남성 기모노 착용', size: 'M', start: '2026-04-16', end: '2026-04-16', hours: '09:00-18:00', type: 'full', customer: 'M**', status: 'pending', dashboardType: 'costume' },
  { itemId: 'di-1', itemName: '여성 경주 한복', size: 'L', start: '2026-04-18', end: '2026-04-19', hours: '전일', type: 'multi', customer: 'S**', status: 'confirmed', dashboardType: 'costume' },
];
// 장소 대여 일정 mock
const MOCK_VENUE_TIMELINE = [
  { itemId: 'v1', itemName: '한옥 스튜디오 A', start: '2026-04-13', end: '2026-04-13', hours: '09:00-12:00', type: 'half_am', customer: 'A**', status: 'confirmed', dashboardType: 'venue' },
  { itemId: 'v1', itemName: '한옥 스튜디오 A', start: '2026-04-14', end: '2026-04-14', hours: '13:00-17:00', type: 'half_pm', customer: 'B**', status: 'pending', dashboardType: 'venue' },
  { itemId: 'v2', itemName: '루프탑 가든', start: '2026-04-15', end: '2026-04-15', hours: '10:00-18:00', type: 'full', customer: 'C**', status: 'confirmed', dashboardType: 'venue' },
  { itemId: 'v3', itemName: '카페 포토존', start: '2026-04-16', end: '2026-04-17', hours: '전일', type: 'multi', customer: 'D**', status: 'completed', dashboardType: 'venue' },
];
const MOCK_RENTAL_TIMELINE = [...MOCK_COSTUME_TIMELINE, ...MOCK_VENUE_TIMELINE];

// ── 의상 대분류 카테고리 (벤더가 아이템 등록 시 선택) ──
const COSTUME_CATEGORIES = {
  traditional: { label: '전통 의상', desc: '한복, 기모노, 치파오, 아오자이 등' },
  western_formal: { label: '서양 정장/드레스', desc: '웨딩드레스, 턱시도, 이브닝가운 등' },
  special: { label: '특수 의상', desc: '코스튬, 무대의상, 시대극의상 등' },
  casual: { label: '캐주얼/스타일링', desc: '커플룩, 가족촬영복, 일상복 코디 등' },
  accessory: { label: '소품/액세서리', desc: '화관, 부채, 우산, 모자, 쥬얼리 등' },
};

// ── 장소 대분류 카테고리 ──
const VENUE_CATEGORIES = {
  studio: { label: '스튜디오', desc: '실내 촬영 스튜디오' },
  traditional_space: { label: '전통 공간', desc: '한옥, 고택, 정원 등' },
  outdoor: { label: '야외/자연', desc: '공원, 해변, 꽃밭, 숲 등' },
  urban: { label: '도심/건축', desc: '카페, 루프탑, 갤러리 등' },
  event_hall: { label: '이벤트 홀', desc: '파티룸, 웨딩홀, 연회장 등' },
};

// 통합 라벨 (기존 호환 + 신규)
const CATEGORY_LABELS = {
  traditional: '전통 의상',
  western_formal: '서양 정장/드레스',
  special: '특수 의상',
  casual: '캐주얼/스타일링',
  accessory: '소품/액세서리',
  // legacy keys for backward compat
  hanbok: '한복',
  traditional_jp: '일본 전통 의상',
  dress: '드레스',
  western_dress: '서양 정장/드레스',
  tuxedo: '턱시도',
  kimono: '기모노',
  cheongsam: '치파오',
  qipao: '치파오',
  // venue categories
  studio: '스튜디오',
  traditional_space: '전통 공간',
  outdoor: '야외/자연',
  urban: '도심/건축',
  event_hall: '이벤트 홀',
};

// 의상 전문 태그 (대분류 아래의 세부 태그 — 벤더가 자유 추가 가능)
const COSTUME_TAGS = ['한복', '기모노', '유카타', '치파오', '아오자이', '사리', '드레스', '턱시도', '수트', '코스프레', '커플룩', '화관', '부채'];
const VENUE_TAGS = ['스튜디오', '한옥', '카페', '루프탑', '야외', '실내', '정원', '해변', '숲', '갤러리', '파티룸'];

function VendorDashboard() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();

  const [vendorProfile, setVendorProfile] = useState(null);
  const [dbDresses, setDbDresses] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bookingActionConfirm, setBookingActionConfirm] = useState(null); // { bookingId, action }

  // mock 업체 폴백 제거.
  // 예전에는 DRESS_VENDORS[0] 로 폴백해, 레코드가 없는 벤더 계정이
  // 아무 관계 없는 mock 업체의 의상 4벌을 자기 것처럼 보게 됐다.
  const emptyVendor = {
    id: null,
    name: '',
    nameEn: '',
    location: '',
    specialties: [],
    contact: { email: user?.email || '', phone: '' },
  };
  const vendor = vendorProfile || emptyVendor;

  // 의상 목록은 DB 에서만 온다 (아래 setDresses 로 채워진다).
  const vendorDresses = useMemo(() => [], []);

  const [dresses, setDresses] = useState([]);
  const [activeTab, setActiveTab] = useState('manage');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availability, setAvailability] = useState(
    vendorDresses.reduce((acc, d) => ({ ...acc, [d.id]: true }), {})
  );

  // Per-size inventory: { [dressId]: { S: { total: 2, rented: 1 }, M: { total: 3, rented: 0 }, ... } }
  const [sizeInventory, setSizeInventory] = useState({});

  // Profile Edit state — per dashboard type (profileForm derived below after activeDashboard)
  const emptyProfile = { nameKo: '', nameEn: '', location: '', phone: '', email: '', website: '', intro: '', directions: '' };
  const [profileForms, setProfileForms] = useState({
    costume: { ...emptyProfile },
    venue: { ...emptyProfile },
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState(null);
  const [showSavePopup, setShowSavePopup] = useState(false);

  // Dress preview modal
  const [previewDress, setPreviewDress] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);

  // Per-dashboard selected tags state (derived vars below after activeDashboard)
  const [selectedTagsMap, setSelectedTagsMap] = useState({ costume: [], venue: [] });
  // Per-dashboard custom tags
  const [customTagsMap, setCustomTagsMap] = useState({ costume: [], venue: [] });
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagError, setCustomTagError] = useState('');

  // Timeline view
  const [timelineView, setTimelineView] = useState('calendar');
  const [expandedTimelineItems, setExpandedTimelineItems] = useState({});
  // Calendar month state (year, month index 0-based)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Reviews
  const [reviews, setReviews] = useState({ costume: [], venue: [] });
  const [reviewStats, setReviewStats] = useState({ costume: { avg: 0, count: 0 }, venue: { avg: 0, count: 0 } });
  const [reviewReplies, setReviewReplies] = useState({});  // { [reviewId]: replyObj }
  const [replyTarget, setReplyTarget] = useState(null); // { reviewId, existing? }
  const [replyBody, setReplyBody] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyMsg, setReplyMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Vendor type switcher (for vendors with both costume + venue)
  const [selectedVendorTypes, setSelectedVendorTypes] = useState([]);
  const vendorTypeList = selectedVendorTypes;
  const [activeDashboard, setActiveDashboard] = useState('costume'); // Default, will be overridden by vendor data

  // ── 벤더 운영 시간 & 휴무 관리 ──
  const VENDOR_TIME_SLOTS = [
    '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00',
  ];
  const vendorScheduleKey = `phosnap_vendor_schedule_${activeDashboard}`;
  const [vendorSchedule, setVendorSchedule] = useState(() => {
    try {
      const raw = localStorage.getItem(`phosnap_vendor_schedule_costume`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { defaultSlots: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'], holidays: {}, weeklyOff: [] };
  });
  const [vendorActiveDate, setVendorActiveDate] = useState(null);
  const [editingVendorDefault, setEditingVendorDefault] = useState(false);
  const [draftVendorDefault, setDraftVendorDefault] = useState(vendorSchedule.defaultSlots || []);
  const [editingWeeklyOff, setEditingWeeklyOff] = useState(false);
  const [vendorSaveMsg, setVendorSaveMsg] = useState('');

  // 벤더 스케줄 로드/저장
  useEffect(() => {
    try {
      const raw = localStorage.getItem(vendorScheduleKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setVendorSchedule(parsed);
        setDraftVendorDefault(parsed.defaultSlots || VENDOR_TIME_SLOTS.slice(0, 10));
      } else {
        const defaults = { defaultSlots: VENDOR_TIME_SLOTS.slice(0, 10), holidays: {}, weeklyOff: [] };
        setVendorSchedule(defaults);
        setDraftVendorDefault(defaults.defaultSlots);
      }
    } catch {}
  }, [activeDashboard]);

  const saveVendorSchedule = (updated) => {
    setVendorSchedule(updated);
    localStorage.setItem(vendorScheduleKey, JSON.stringify(updated));
  };

  const handleSaveVendorDefault = () => {
    const updated = { ...vendorSchedule, defaultSlots: draftVendorDefault };
    saveVendorSchedule(updated);
    setEditingVendorDefault(false);
    setVendorSaveMsg('기본 운영 시간이 저장되었습니다 ✓');
    setTimeout(() => setVendorSaveMsg(''), 2000);
  };

  const toggleVendorHoliday = (dateStr) => {
    const updated = { ...vendorSchedule, holidays: { ...vendorSchedule.holidays } };
    if (updated.holidays[dateStr]) {
      delete updated.holidays[dateStr];
    } else {
      updated.holidays[dateStr] = true;
    }
    saveVendorSchedule(updated);
  };

  const toggleVendorWeeklyOff = (dayIdx) => {
    const updated = { ...vendorSchedule, weeklyOff: [...(vendorSchedule.weeklyOff || [])] };
    if (updated.weeklyOff.includes(dayIdx)) {
      updated.weeklyOff = updated.weeklyOff.filter(d => d !== dayIdx);
    } else {
      updated.weeklyOff.push(dayIdx);
    }
    saveVendorSchedule(updated);
  };

  // 날짜별 운영 상태 계산
  const getVendorDateStatus = (dateStr) => {
    if (vendorSchedule.holidays?.[dateStr]) return 'off';
    const d = new Date(dateStr);
    if ((vendorSchedule.weeklyOff || []).includes(d.getDay())) return 'off';
    return 'open';
  };

  // Derived profile form based on activeDashboard
  const profileForm = profileForms[activeDashboard] || emptyProfile;
  const setProfileForm = (valOrFn) => {
    setProfileForms(prev => ({
      ...prev,
      [activeDashboard]: typeof valOrFn === 'function' ? valOrFn(prev[activeDashboard]) : valOrFn,
    }));
  };

  // Derived tag selection based on activeDashboard
  const selectedTags = selectedTagsMap[activeDashboard] || [];
  const toggleTag = (tagId) => {
    setSelectedTagsMap(prev => {
      const current = prev[activeDashboard] || [];
      const next = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
      return { ...prev, [activeDashboard]: next };
    });
  };

  // Derived custom tags based on activeDashboard
  const customTags = customTagsMap[activeDashboard] || [];
  const addCustomTag = () => {
    const sanitized = sanitizeTag(customTagInput);
    if (!sanitized) {
      setCustomTagError('사용할 수 없는 태그입니다 (특수문자, 비속어 등)');
      return;
    }
    // Check duplicate against registry + existing custom
    const allCurrent = [...selectedTags, ...customTags];
    if (allCurrent.includes(sanitized)) {
      setCustomTagError('이미 추가된 태그입니다');
      return;
    }
    setCustomTagsMap(prev => ({
      ...prev,
      [activeDashboard]: [...(prev[activeDashboard] || []), sanitized],
    }));
    setCustomTagInput('');
    setCustomTagError('');
  };
  const removeCustomTag = (tag) => {
    setCustomTagsMap(prev => ({
      ...prev,
      [activeDashboard]: (prev[activeDashboard] || []).filter(t => t !== tag),
    }));
  };

  // Set initial activeDashboard based on vendorTypeList (after vendor data loads)
  useEffect(() => {
    if (vendorTypeList.length > 0 && !vendorTypeList.includes(activeDashboard)) {
      // If current activeDashboard is not in vendor's types, switch to first available type
      setActiveDashboard(vendorTypeList[0]);
    }
  }, [vendorTypeList]);

  // 자동 재고 계산: dresses의 sizeStock(총 재고)에서 confirmed/pending 예약을 차감
  useEffect(() => {
    const inv = {};
    dresses.forEach(d => {
      const stock = d.sizeStock || {};
      const sizes = d.sizes || [];
      if (sizes.length === 0 && Object.keys(stock).length === 0) return;
      inv[d.id] = {};
      const allSizes = [...new Set([...sizes, ...Object.keys(stock)])];
      allSizes.forEach(s => {
        inv[d.id][s] = { total: stock[s] || 0, rented: 0 };
      });
    });
    // 예약에서 rented 카운트 (confirmed + pending만)
    bookings.forEach(bk => {
      if (bk.status === 'cancelled' || bk.status === 'completed') return;
      // itemName으로 dress 매칭
      const matchedDress = dresses.find(d => d.name === bk.itemName || d.nameEn === bk.itemName);
      if (!matchedDress || !inv[matchedDress.id]) return;
      const size = bk.size || 'Free';
      if (inv[matchedDress.id][size]) {
        inv[matchedDress.id][size].rented += 1;
      }
    });
    // 타임라인 데이터에서도 rented 카운트 (사이즈별)
    MOCK_RENTAL_TIMELINE.forEach(tl => {
      if (tl.status === 'cancelled' || tl.status === 'completed') return;
      const matchedDress = dresses.find(d => d.name === tl.itemName || d.id === tl.itemId);
      if (!matchedDress || !inv[matchedDress.id]) return;
      const size = tl.size || Object.keys(inv[matchedDress.id])[0];
      if (size && inv[matchedDress.id][size]) {
        inv[matchedDress.id][size].rented += 1;
      }
    });
    setSizeInventory(inv);
  }, [dresses, bookings]);

  // Per-item booking mode: 'instant' or 'manual'
  const [bookingModes, setBookingModes] = useState({});
  // Image index per card (fix shared index bug)
  const [cardImageIndices, setCardImageIndices] = useState({});

  // Initialize dresses from vendorDresses when component mounts or data changes
  useEffect(() => {
    if (vendorDresses && vendorDresses.length > 0) {
      setDresses(vendorDresses);
    }
  }, [vendorDresses]);

  useEffect(() => {
    const loadVendorData = async () => {
      setDataLoading(true);
      try {
        let { data: profile } = await getMyVendorProfile();

        // 레코드가 없으면 여기서 만들어준다. 가입 시 createDressVendor 가
        // 스키마 불일치로 실패한 계정은 레코드 없이 남아 있고, 그러면
        // 대시보드가 계속 mock 업체를 보여주게 된다.
        if (!profile && user?.id) {
          const { ensureVendorRecord } = await import('../lib/supabase');
          const parsed = (user?.name || '').match(/^(.*?)\s*\((.*)\)\s*$/);
          const { data: created } = await ensureVendorRecord(user.id, {
            nameKo:     parsed ? parsed[1] : (user?.name || ''),
            nameEn:     parsed ? parsed[2] : '',
            vendorType: 'costume',
          });
          profile = created;
        }

        if (profile) {
          setVendorProfile({
            id: profile.id,
            // mock 업체명으로 폴백하지 않는다 — 등록 안내가 뜨도록 빈 값 유지
            name: profile.name_ko || profile.name_en || '',
            nameEn: profile.name_en || '',
            location: profile.location_id
              ? { locationId: profile.location_id, countryCode: profile.country_code || 'KR', city: profile.city || '' }
              : null,
            specialties: profile.categories || [],
            contact: {
              email: profile.contact_email || '',
              phone: profile.contact_phone || '',
            },
            vendor_type: profile.vendor_type || '',
            website: profile.website || '',
            intro: profile.intro || '',
            directions: profile.directions || '',
            custom_tags: profile.custom_tags || [],
          });

          // Sync vendor types
          const vtList = (profile.vendor_type || 'costume').split(',').map(s => s.trim()).filter(Boolean);
          setSelectedVendorTypes(vtList);

          // Load per-type profiles (costume profile from DB; venue profile from DB fields if available)
          const costumeProfile = {
            nameKo: profile.name_ko || '',
            nameEn: profile.name_en || '',
            location: profile.location_id
              ? { locationId: profile.location_id, countryCode: profile.country_code || 'KR', city: profile.city || '' }
              : null,
            phone: profile.contact_phone || '',
            email: profile.contact_email || '',
            website: profile.website || '',
            intro: profile.intro || '',
            directions: profile.directions || '',
          };
          const venueProfile = {
            nameKo: profile.venue_name_ko || '',
            nameEn: profile.venue_name_en || '',
            location: profile.venue_location || profile.location_id || '',
            phone: profile.venue_phone || profile.contact_phone || '',
            email: profile.venue_email || profile.contact_email || '',
            website: profile.venue_website || '',
            intro: profile.venue_intro || '',
            directions: profile.venue_directions || '',
          };
          setProfileForms({ costume: costumeProfile, venue: venueProfile });

          const { data: dressData } = await getVendorDresses(profile.id);
          if (dressData && dressData.length > 0) {
            setDbDresses(dressData);
            const mapped = dressData.map(d => ({
              id: d.id,
              vendorId: profile.id,
              name: d.name_ko,
              nameEn: d.name_en,
              category: d.category,
              price: d.price,
              image: d.image_url || '/default-dress.jpg',
              images: d.images || [d.image_url || '/default-dress.jpg'],
              color: d.color,
              sizes: d.sizes || [],
              description: d.description,
            }));
            setDresses(mapped);
            setAvailability(
              dressData.reduce((acc, d) => ({ ...acc, [d.id]: d.is_available }), {})
            );
            // Initialize mock inventory for demo
            const mockInv = {};
            mapped.forEach(d => {
              if (d.sizes && d.sizes.length > 0) {
                mockInv[d.id] = {};
                d.sizes.forEach(s => {
                  mockInv[d.id][s] = { total: Math.floor(Math.random() * 4) + 1, rented: Math.floor(Math.random() * 2) };
                });
              }
            });
            setSizeInventory(mockInv);
          }

          const { data: bk } = await getVendorBookings(profile.id);
          if (bk && bk.length > 0) setBookings(bk);
        } else if (user) {
          setVendorProfile(null);
        }
      } catch (err) {
        setDataError(lang === 'ko' ? 'DB 연결에 실패했습니다. Mock 데이터로 표시합니다.' : 'DB connection failed. Showing mock data.');
      } finally {
        setDataLoading(false);
      }

      // Load reviews + stats from Supabase (fallback: localStorage)
      const [costumeReviews, venueReviews, costumeStats, venueStats] = await Promise.all([
        getVendorReviews('costume'),
        getVendorReviews('venue'),
        getAverageRating('costume'),
        getAverageRating('venue'),
      ]);
      setReviews({ costume: costumeReviews, venue: venueReviews });
      setReviewStats({ costume: costumeStats, venue: venueStats });

      // Load review replies
      const allReviewIds = [...costumeReviews, ...venueReviews].map(r => r.id);
      if (allReviewIds.length > 0) {
        const { data: repliesData } = await getVendorReviewReplies(allReviewIds);
        const repliesMap = {};
        if (repliesData) {
          repliesData.forEach(reply => {
            repliesMap[reply.review_id] = reply;
          });
        }
        setReviewReplies(repliesMap);
      }

      // 아바타 로드
      const avatar = await getAvatarUrl();
      if (avatar) setAvatarUrl(avatar);
    };
    loadVendorData();
  }, []);

  // Booking confirm/reject — 확인 다이얼로그 표시
  const handleBookingAction = (bookingId, action) => {
    const booking = bookings.find(b => b.id === bookingId);
    setBookingActionConfirm({ bookingId, action, booking });
  };

  // 실제 확정/거절 실행
  const executeBookingAction = () => {
    if (!bookingActionConfirm) return;
    const { bookingId, action } = bookingActionConfirm;
    setBookings(prev => prev.map(b => {
      if (b.id !== bookingId) return b;
      if (action === 'confirm') return { ...b, status: 'confirmed' };
      if (action === 'reject') return { ...b, status: 'rejected' };
      return b;
    }));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
    setBookingActionConfirm(null);
  };

  // Toggle booking mode for a dress
  const toggleBookingMode = (dressId) => {
    setBookingModes(prev => ({
      ...prev,
      [dressId]: prev[dressId] === 'manual' ? 'instant' : 'manual',
    }));
  };

  // Per-card image navigation
  const getCardImageIndex = (dressId) => cardImageIndices[dressId] || 0;
  const setCardImageIndex = (dressId, idx) => {
    setCardImageIndices(prev => ({ ...prev, [dressId]: idx }));
  };

  // Filter bookings by activeDashboard type
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => !b.vendorType || b.vendorType === activeDashboard);
  }, [bookings, activeDashboard]);

  const handleUpdateProfile = async () => {
    setProfileSaveStatus('saving');
    const pf = profileForms[activeDashboard];
    const prefix = activeDashboard === 'venue' ? 'venue_' : '';

    // Combine registry tags + custom tags
    const allTags = [...(selectedTagsMap[activeDashboard] || []), ...(customTagsMap[activeDashboard] || [])];

    // Build update payload based on dashboard type
    const payload = activeDashboard === 'costume' ? {
      name_ko: pf.nameKo,
      name_en: pf.nameEn,
      // LocationPicker 는 { locationId, countryCode, city } 객체를 준다.
      location_id:  pf.location?.locationId || pf.location || null,
      country_code: pf.location?.countryCode || 'KR',
      city:         pf.location?.city || null,
      contact_phone: pf.phone,
      contact_email: pf.email,
      website: pf.website,
      intro: pf.intro,
      directions: pf.directions,
      tags: allTags,
      vendor_type: selectedVendorTypes.join(','),
    } : {
      venue_name_ko: pf.nameKo,
      venue_name_en: pf.nameEn,
      venue_location: pf.location,
      venue_phone: pf.phone,
      venue_email: pf.email,
      venue_website: pf.website,
      venue_intro: pf.intro,
      venue_directions: pf.directions,
      venue_tags: allTags,
      vendor_type: selectedVendorTypes.join(','),
    };

    if (vendorProfile) {
      try {
        const { error } = await updateVendorProfile(vendorProfile.id, payload);
        if (!error) {
          setVendorProfile(prev => ({
            ...prev,
            ...(activeDashboard === 'costume' ? {
              name: pf.nameKo,
              nameEn: pf.nameEn,
              location: pf.location,
              contact: { email: pf.email, phone: pf.phone },
              website: pf.website,
              intro: pf.intro,
              directions: pf.directions,
            } : {
              venue_name_ko: pf.nameKo,
              venue_name_en: pf.nameEn,
              venue_location: pf.location,
              venue_phone: pf.phone,
              venue_email: pf.email,
              venue_website: pf.website,
              venue_intro: pf.intro,
              venue_directions: pf.directions,
            }),
            vendor_type: selectedVendorTypes.join(','),
          }));
          setProfileSaveStatus('saved');
          setShowSavePopup(true);
          setTimeout(() => setShowSavePopup(false), 2500);
        } else {
          // 실패 원인을 남긴다. 예전에는 조용히 'error' 만 세팅해
          // 스키마 불일치(42703)로 저장이 안 되는데도 원인을 알 수 없었다.
          console.error('[VendorDashboard] 업체 프로필 저장 실패:', error);
          setProfileSaveStatus('error');
        }
      } catch (err) {
        console.error('[VendorDashboard] 업체 프로필 저장 예외:', err);
        setProfileSaveStatus('error');
      }
    } else {
      // 벤더 레코드가 없으면 저장할 대상이 없다.
      // 성공 팝업을 띄우면 저장된 것으로 오해하게 되므로 에러로 처리한다.
      console.error('[VendorDashboard] 벤더 레코드가 없어 저장할 수 없습니다.');
      setProfileSaveStatus('error');
    }
    setTimeout(() => setProfileSaveStatus(null), 2000);
  };

  const handleDeleteDress = async (dressId) => {
    setSaveStatus('saving');
    if (vendorProfile) {
      try {
        const { deleteVendorDress } = await import('../lib/supabase');
        const { error } = await deleteVendorDress(dressId);
        if (error) throw error;
      } catch (err) {
        // 삭제 실패를 조용히 넘기면 목록에서만 사라진 것처럼 보인다.
        console.error('[VendorDashboard] 의상 삭제 실패:', err);
        alert('의상 삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
    setDresses(prev => prev.filter(d => d.id !== dressId));
    setAvailability(prev => { const n = { ...prev }; delete n[dressId]; return n; });
    setDeleteConfirm(null);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const refreshData = async () => {
    if (!vendorProfile) return;
    setSaveStatus('saving');
    try {
      const { data: dressData } = await getVendorDresses(vendorProfile.id);
      if (dressData) {
        const mapped = dressData.map(d => ({
          id: d.id, vendorId: vendorProfile.id, name: d.name_ko, nameEn: d.name_en,
          category: d.category, price: d.price, image: d.image_url || '/default-dress.jpg',
          images: d.images || [d.image_url || '/default-dress.jpg'],
          color: d.color, sizes: d.sizes || [], description: d.description,
        }));
        setDresses(mapped);
        setAvailability(dressData.reduce((acc, d) => ({ ...acc, [d.id]: d.is_available }), {}));
      }
      const { data: bk } = await getVendorBookings(vendorProfile.id);
      if (bk && bk.length > 0) setBookings(bk);

      // Refresh reviews
      const [costumeReviews, venueReviews] = await Promise.all([
        getVendorReviews('costume'),
        getVendorReviews('venue'),
      ]);
      setReviews({ costume: costumeReviews, venue: venueReviews });

      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const [formData, setFormData] = useState({
    nameKo: '',
    nameEn: '',
    category: 'hanbok',
    sizes: '',
    sizeStock: {},
    price: '',
    imageUrl: '',
    color: '',
    description: '',
  });

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [addFormErrors, setAddFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});

  // Category keys per dashboard type
  const costumeCategoryKeys = Object.keys(COSTUME_CATEGORIES);
  const venueCategoryKeys = Object.keys(VENUE_CATEGORIES);
  // Legacy category mapping to dashboard type
  const legacyCostumeCats = ['hanbok', 'traditional_jp', 'dress', 'tuxedo', 'kimono', 'cheongsam', 'western_dress', 'qipao', 'traditional', 'western_formal', 'special', 'casual', 'accessory'];

  const filteredDresses = useMemo(() => {
    return dresses.filter(d => {
      // Filter by active dashboard type
      const cat = d.category || '';
      const isCostume = costumeCategoryKeys.includes(cat) || legacyCostumeCats.includes(cat);
      const isVenue = venueCategoryKeys.includes(cat);
      // If category doesn't match any known type, show in costume dashboard by default
      const matchDashboard = activeDashboard === 'venue' ? isVenue : (isCostume || !isVenue);

      const matchCategory = !filterCategory || d.category === filterCategory;
      const matchSearch = !searchText ||
        d.name.toLowerCase().includes(searchText.toLowerCase()) ||
        d.nameEn?.toLowerCase().includes(searchText.toLowerCase());
      return matchDashboard && matchCategory && matchSearch;
    });
  }, [dresses, filterCategory, searchText, activeDashboard]);

  // Dashboard-filtered dresses for stats (no search/category filter)
  const dashboardDresses = useMemo(() => {
    return dresses.filter(d => {
      const cat = d.category || '';
      const isCostume = costumeCategoryKeys.includes(cat) || legacyCostumeCats.includes(cat);
      const isVenue = venueCategoryKeys.includes(cat);
      return activeDashboard === 'venue' ? isVenue : (isCostume || !isVenue);
    });
  }, [dresses, activeDashboard]);

  const validateAddForm = () => {
    const errors = {};
    if (!formData.nameKo || !formData.nameKo.trim()) {
      errors.nameKo = '의상명(한글)은 필수 입력입니다';
    }
    const sizes = (formData.sizes || '').split(',').map(s => s.trim()).filter(Boolean);
    if (sizes.length === 0) {
      errors.sizes = '최소 하나의 사이즈를 입력해야 합니다';
    }
    if (!imageFile && !imagePreview) {
      errors.image = '최소 하나의 이미지를 업로드해야 합니다';
    }
    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDress = async () => {
    if (!validateAddForm()) return;
    setSaveStatus('saving');
    setUploading(true);

    let imageUrl = formData.imageUrl || null;

    if (imageFile && vendorProfile) {
      try {
        const { uploadDressImage } = await import('../lib/storage');
        const { url } = await uploadDressImage(imageFile, vendorProfile.id);
        if (url) imageUrl = url;
      } catch (err) {
        // 업로드 실패 시 이미지 없이 저장되지 않도록 알린다.
        console.error('[VendorDashboard] 이미지 업로드 실패:', err);
        alert('이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } else if (imageFile) {
      imageUrl = URL.createObjectURL(imageFile);
    }

    setUploading(false);

    if (vendorProfile) {
      const { data: savedDress, error } = await addVendorDress({
        vendor_id: vendorProfile.id,
        name_ko: formData.nameKo,
        name_en: formData.nameEn,
        category: formData.category,
        price: parseInt(formData.price),
        image_url: imageUrl || null,
        color: formData.color || null,
        sizes: formData.sizes.split(',').map(s => s.trim()).filter(Boolean),
        size_stock: formData.sizeStock || {},
        description: formData.description || null,
      });

      if (!error && savedDress) {
        const mapped = {
          id: savedDress.id,
          vendorId: vendorProfile.id,
          name: savedDress.name_ko,
          nameEn: savedDress.name_en,
          category: savedDress.category,
          price: savedDress.price,
          image: savedDress.image_url || '/default-dress.jpg',
          images: [savedDress.image_url || '/default-dress.jpg'],
          color: savedDress.color,
          sizes: savedDress.sizes || [],
          sizeStock: savedDress.size_stock || {},
          description: savedDress.description,
        };
        setDresses(prev => [...prev, mapped]);
        setAvailability(prev => ({ ...prev, [savedDress.id]: true }));
      } else if (error) {
        // 실패를 조용히 넘기면 저장 버튼이 아무 반응 없는 것처럼 보인다.
        console.error('[VendorDashboard] 의상 등록 실패:', error);
        setSaveStatus('error');
        alert(`의상 등록에 실패했습니다.\n${error.message || '알 수 없는 오류'}`);
        return;
      }
    } else {
      const newDress = {
        id: `dress-${Date.now()}`,
        vendorId: vendor.id,
        name: formData.nameKo,
        nameEn: formData.nameEn,
        category: formData.category,
        price: parseInt(formData.price),
        image: imageUrl || '/default-dress.jpg',
        images: [imageUrl || '/default-dress.jpg'],
        color: formData.color,
        sizes: formData.sizes.split(',').map(s => s.trim()).filter(Boolean),
        sizeStock: formData.sizeStock || {},
        description: formData.description,
      };
      setDresses(prev => [...prev, newDress]);
      setAvailability(prev => ({ ...prev, [newDress.id]: true }));
    }

    setFormData({
      nameKo: '',
      nameEn: '',
      category: 'hanbok',
      sizes: '',
      price: '',
      imageUrl: '',
      color: '',
      description: '',
    });
    setImageFile(null);
    setImagePreview('');
    setShowAddModal(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.nameKo || !editForm.nameKo.trim()) {
      errors.nameKo = '의상명(한글)은 필수 입력입니다';
    }
    const sizes = (editForm.sizes || '').split(',').map(s => s.trim()).filter(Boolean);
    if (sizes.length === 0) {
      errors.sizes = '최소 하나의 사이즈를 입력해야 합니다';
    }
    if (!imageFile && !imagePreview && !editTarget?.image) {
      errors.image = '최소 하나의 이미지를 업로드해야 합니다';
    }
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditDress = async () => {
    if (!editTarget || !validateEditForm()) return;
    setSaveStatus('saving');
    setUploading(true);

    let imageUrl = editForm.imageUrl || editTarget.image;

    if (imageFile && vendorProfile) {
      try {
        const { uploadDressImage } = await import('../lib/storage');
        const { url } = await uploadDressImage(imageFile, vendorProfile.id);
        if (url) imageUrl = url;
      } catch (err) {
        // 업로드 실패 시 이미지 없이 저장되지 않도록 알린다.
        console.error('[VendorDashboard] 이미지 업로드 실패:', err);
        alert('이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } else if (imageFile) {
      imageUrl = URL.createObjectURL(imageFile);
    }

    setUploading(false);

    if (vendorProfile) {
      const { error } = await updateVendorDress(editTarget.id, {
        name_ko: editForm.nameKo,
        name_en: editForm.nameEn,
        category: editForm.category,
        price: parseInt(editForm.price),
        image_url: imageUrl || null,
        color: editForm.color || null,
        sizes: editForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
        size_stock: editForm.sizeStock || {},
        description: editForm.description || null,
      });

      if (error) {
        setSaveStatus('error');
      } else {
        const updated = {
          ...editTarget,
          name: editForm.nameKo,
          nameEn: editForm.nameEn,
          category: editForm.category,
          price: parseInt(editForm.price),
          image: imageUrl || '/default-dress.jpg',
          images: [imageUrl || '/default-dress.jpg'],
          color: editForm.color,
          sizes: editForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
          sizeStock: editForm.sizeStock || {},
          description: editForm.description,
        };
        setDresses(prev => prev.map(d => d.id === editTarget.id ? updated : d));
        setSaveStatus('saved');
      }
    } else {
      const updated = {
        ...editTarget,
        name: editForm.nameKo,
        nameEn: editForm.nameEn,
        category: editForm.category,
        price: parseInt(editForm.price),
        image: imageUrl || '/default-dress.jpg',
        images: [imageUrl || '/default-dress.jpg'],
        color: editForm.color,
        sizes: editForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
        sizeStock: editForm.sizeStock || {},
        description: editForm.description,
      };
      setDresses(prev => prev.map(d => d.id === editTarget.id ? updated : d));
      setSaveStatus('saved');
    }

    setEditTarget(null);
    setEditForm({});
    setImageFile(null);
    setImagePreview('');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const toggleAvailability = async (dressId) => {
    const newVal = !availability[dressId];
    setAvailability(prev => ({ ...prev, [dressId]: newVal }));

    if (vendorProfile) {
      const { error } = await updateVendorDress(dressId, { is_available: newVal });
      if (error) {
        setAvailability(prev => ({ ...prev, [dressId]: !newVal }));
      }
    }
  };

  const handleReplySubmit = async () => {
    if (!replyTarget || !replyBody.trim()) return;
    setReplySaving(true);
    setReplyMsg('');
    try {
      const { data, error } = await submitVendorReviewReply({
        reviewId: replyTarget.reviewId,
        body: replyBody.trim(),
      });
      if (error) throw error;
      // 로컬 상태 업데이트
      setReviewReplies(prev => ({ ...prev, [replyTarget.reviewId]: data }));
      setReplyMsg('답글이 저장되었습니다 ✓');
      setTimeout(() => { setReplyTarget(null); setReplyBody(''); setReplyMsg(''); }, 1200);
    } catch (err) {
      setReplyMsg('답글 저장에 실패했습니다.');
    }
    setReplySaving(false);
  };

  const confirmedCount = dresses.length;
  const monthlyRentals = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return bookings.filter(b => {
      const d = new Date(b.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
  }, [bookings]);

  // tagRegistry 기반 태그 목록 (태그 ID 배열)
  const getVendorTypeTagIds = () => {
    return getAllTagIds(activeDashboard === 'venue' ? 'venue' : 'costume');
  };

  const getTimelineBarColor = (status) => {
    if (status === 'confirmed') return 'var(--gold)';
    if (status === 'pending') return '#4A9EFF';
    if (status === 'completed') return '#4AFF6A';
    return 'var(--muted)';
  };

  const getDaysDiff = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        padding: '2rem 1rem',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Corners />

      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          animation: 'pageEnter 0.6s ease-out',
        }}
        className="page-enter"
      >
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2rem',
              fontSize: '1rem',
              transition: 'opacity 0.3s',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            <ArrowLeftIcon size={20} />
            <span>돌아가기</span>
          </button>

          {/* Title — compact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.25rem' }}>
            <ProfileAvatar
              avatarUrl={avatarUrl}
              onAvatarChange={(url) => setAvatarUrl(url)}
              size={52}
              editable={true}
            />
            <h1
              style={{
                fontSize: '1.8rem',
                fontFamily: 'var(--font-serif)',
                fontWeight: 'normal',
                margin: 0,
              }}
            >
              벤더 대시보드
            </h1>
          </div>

          {/* Vendor Type Dashboard Switcher */}
          <div style={{
            display: 'flex', gap: 0, marginBottom: '1.5rem',
            border: '1px solid var(--gold-dim)', overflow: 'hidden',
          }}>
            {['costume', 'venue'].map(vt => {
              const isActive = activeDashboard === vt;
              const isEnabled = vendorTypeList.includes(vt);
              return (
                <button
                  key={vt}
                  onClick={() => {
                    if (isEnabled) setActiveDashboard(vt);
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: isActive ? 'var(--gold)' : 'transparent',
                    color: isActive ? 'var(--bg)' : isEnabled ? 'var(--gold)' : 'var(--muted)',
                    border: 'none',
                    borderRight: '1px solid var(--gold-dim)',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '0.95rem',
                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s',
                    letterSpacing: '0.05em',
                    opacity: isEnabled ? 1 : 0.35,
                  }}
                >
                  {vt === 'costume' ? '👗 의상 대여 대시보드' : '🏛️ 장소 대여 대시보드'}
                </button>
              );
            })}
          </div>

          {/* Status Banners */}
          {dataLoading && (
            <div style={{ padding: '12px 20px', background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.15)', marginBottom: 16, fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
              {lang === 'ko' ? 'DB에서 데이터를 불러오는 중...' : 'Loading data from DB...'}
            </div>
          )}
          {dataError && (
            <div style={{ padding: '12px 20px', background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)', marginBottom: 16, fontSize: 12, color: '#ff9800', fontFamily: 'var(--font-serif)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ {dataError}</span>
              <button onClick={() => setDataError(null)} style={{ background: 'transparent', border: 'none', color: '#ff9800', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          )}
          {saveStatus && (
            <div style={{
              position: 'fixed', top: 80, right: 24, zIndex: 100,
              padding: '10px 20px', fontSize: 12, fontFamily: 'var(--font-serif)',
              background: saveStatus === 'saving' ? 'rgba(232,160,32,0.15)' : saveStatus === 'saved' ? 'rgba(76,175,80,0.15)' : 'rgba(232,93,93,0.15)',
              color: saveStatus === 'saving' ? 'var(--gold)' : saveStatus === 'saved' ? '#4caf50' : '#e85d5d',
              border: `1px solid ${saveStatus === 'saving' ? 'rgba(232,160,32,0.3)' : saveStatus === 'saved' ? 'rgba(76,175,80,0.3)' : 'rgba(232,93,93,0.3)'}`,
              transition: 'all 0.3s', animation: 'pageEnter 0.3s ease-out',
            }}>
              {saveStatus === 'saving' ? (lang === 'ko' ? '저장 중...' : 'Saving...') :
               saveStatus === 'saved' ? (lang === 'ko' ? '✓ 저장 완료' : '✓ Saved') :
               (lang === 'ko' ? '✗ 저장 실패' : '✗ Save failed')}
            </div>
          )}
          {profileSaveStatus && (
            <div style={{
              position: 'fixed', top: 80, right: 24, zIndex: 100,
              padding: '10px 20px', fontSize: 12, fontFamily: 'var(--font-serif)',
              background: profileSaveStatus === 'saving' ? 'rgba(232,160,32,0.15)' : profileSaveStatus === 'saved' ? 'rgba(76,175,80,0.15)' : 'rgba(232,93,93,0.15)',
              color: profileSaveStatus === 'saving' ? 'var(--gold)' : profileSaveStatus === 'saved' ? '#4caf50' : '#e85d5d',
              border: `1px solid ${profileSaveStatus === 'saving' ? 'rgba(232,160,32,0.3)' : profileSaveStatus === 'saved' ? 'rgba(76,175,80,0.3)' : 'rgba(232,93,93,0.3)'}`,
              transition: 'all 0.3s', animation: 'pageEnter 0.3s ease-out',
            }}>
              {profileSaveStatus === 'saving' ? (lang === 'ko' ? '저장 중...' : 'Saving...') :
               profileSaveStatus === 'saved' ? (lang === 'ko' ? '✓ 프로필 저장 완료' : '✓ Profile Saved') :
               (lang === 'ko' ? '✗ 저장 실패' : '✗ Save failed')}
            </div>
          )}

          {/* Vendor Info Card */}
          <div
            style={{
              backgroundColor: 'var(--bg2)',
              border: '1px solid var(--gold-dim)',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* 업체명: 한글 + 영문 나란히 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', margin: '0 0 0.4rem 0' }}>
              <h3 style={{
                fontSize: '1.3rem', fontFamily: 'var(--font-serif)',
                color: profileForm.nameKo ? 'var(--gold)' : 'var(--muted)', margin: 0,
                fontStyle: profileForm.nameKo ? 'normal' : 'italic',
              }}>
                {profileForm.nameKo || (activeDashboard === 'venue' ? '📍 장소 대여 업체명을 등록해주세요' : '👗 의상 대여 업체명을 등록해주세요')}
              </h3>
              {profileForm.nameEn && (
                <span style={{
                  fontSize: '0.85rem', fontFamily: 'var(--font-serif)',
                  color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {profileForm.nameEn}
                </span>
              )}
            </div>
            {/* 업체명 미입력 경고 + CTA */}
            {!profileForm.nameKo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0.2rem 0 0.4rem' }}>
                <p style={{ fontSize: '0.72rem', color: '#e85d5d', margin: 0, fontStyle: 'italic' }}>
                  ⚠ 업체명을 입력하고 저장해야 고객에게 노출됩니다 (담당자 실명은 노출되지 않습니다)
                </p>
                <button
                  onClick={() => setActiveTab('profile')}
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(232,93,93,0.15)',
                    border: '1px solid rgba(232,93,93,0.4)',
                    color: '#e85d5d',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-serif)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.target.style.background = '#e85d5d'; e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(232,93,93,0.15)'; e.target.style.color = '#e85d5d'; }}
                >
                  업체 프로필 등록하기 →
                </button>
              </div>
            )}
            {/* 한줄 소개 + 📍 위치 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--muted)',
            }}>
              {profileForm.intro ? (
                <span>{profileForm.intro}</span>
              ) : (
                <span style={{ fontStyle: 'italic', fontSize: '0.85rem', opacity: 0.6 }}>
                  업체 프로필 탭에서 한줄 소개를 입력해주세요
                </span>
              )}
              {profileForm.intro && (profileForm.location) && (
                <span style={{ color: 'var(--gold-dim)' }}>|</span>
              )}
              {(profileForm.location) && (
                <span>📍 {profileForm.location}</span>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--gold-dim)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  margin: 0,
                  marginBottom: '0.5rem',
                }}
              >
                {activeDashboard === 'venue' ? '대여 가능 장소' : '총 아이템 수'}
              </p>
              <p
                style={{
                  fontSize: '2rem',
                  fontFamily: 'var(--font-serif)',
                  color: dashboardDresses.length === 0 ? 'var(--muted)' : 'var(--gold)',
                  margin: 0,
                }}
              >
                {dashboardDresses.length}
              </p>
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--gold-dim)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  margin: 0,
                  marginBottom: '0.5rem',
                }}
              >
                {activeDashboard === 'venue' ? '이용 가능' : '예약 가능'}
              </p>
              <p
                style={{
                  fontSize: '2rem',
                  fontFamily: 'var(--font-serif)',
                  color: dashboardDresses.filter(d => {
                    const inv = sizeInventory[d.id];
                    if (!inv) return availability[d.id];
                    return Object.values(inv).some(s => (s.total || 0) - (s.rented || 0) > 0);
                  }).length === 0 ? 'var(--muted)' : 'var(--gold)',
                  margin: 0,
                }}
              >
                {dashboardDresses.filter(d => {
                  const inv = sizeInventory[d.id];
                  if (!inv) return availability[d.id];
                  return Object.values(inv).some(s => (s.total || 0) - (s.rented || 0) > 0);
                }).length}
              </p>
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--gold-dim)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  margin: 0,
                  marginBottom: '0.5rem',
                }}
              >
                이번 달 대여 건수
              </p>
              <p
                style={{
                  fontSize: '2rem',
                  fontFamily: 'var(--font-serif)',
                  color: monthlyRentals === 0 ? 'var(--muted)' : 'var(--gold)',
                  margin: 0,
                }}
              >
                {monthlyRentals}건
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '2rem',
            alignItems: 'center',
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'manage', label: '아이템 관리' },
            { key: 'profile', label: '업체 프로필' },
            { key: 'bookings', label: '예약 현황' },
            { key: 'timeline', label: '대여 일정' },
            { key: 'reviews', label: '리뷰 관리' },
          ].map((tab) => {
            const pendingBookings = bookings.filter(b => b.status === 'pending' && (b.vendorType === activeDashboard || !b.vendorType));
            const hasBadge = tab.key === 'bookings' && pendingBookings.length > 0 && activeTab !== 'bookings';
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeTab === tab.key ? 'var(--gold)' : 'rgba(212,175,55,0.5)',
                  fontSize: '1rem',
                  fontFamily: 'var(--font-serif)',
                  padding: '1rem 0',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                {tab.label}
                {hasBadge && (
                  <span style={{
                    position: 'absolute', top: 8, right: -4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#e85d5d',
                  }} />
                )}
              </button>
            );
          })}
          {vendorProfile && (
            <button onClick={refreshData}
              style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
              🔄 {lang === 'ko' ? '새로고침' : 'Refresh'}
            </button>
          )}
          {/* DB 연결 상태 — 개발자 전용, 프로덕션에서는 숨김 */}
        </div>

        {/* Tab Content */}
        {activeTab === 'manage' && (
          <div>
            {/* Filter Bar */}
            <div
              style={{
                backgroundColor: 'var(--bg2)',
                padding: '1.5rem',
                marginBottom: '2rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--gold-dim)',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  flex: '0 0 150px',
                }}
              >
                <option value="">전체 카테고리</option>
                {Object.entries(activeDashboard === 'venue' ? VENUE_CATEGORIES : COSTUME_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="아이템 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--gold-dim)',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-sans)',
                  flex: '1 1 200px',
                  minWidth: '200px',
                }}
              />

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--gold)',
                  color: 'var(--gold)',
                  padding: '0.75rem 1.5rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--gold)';
                  e.target.style.color = 'var(--bg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--gold)';
                }}
              >
                {activeDashboard === 'venue' ? '새 장소 등록' : '새 아이템 등록'}
              </button>
            </div>

            {/* Dress Grid with Larger Cards */}
            {filteredDresses.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2rem',
                }}
              >
                {filteredDresses.map((dress) => {
                  const imgIdx = getCardImageIndex(dress.id);
                  const imgs = dress.images && dress.images.length > 0 ? dress.images : [dress.image];
                  const currentImg = imgs[imgIdx] || imgs[0] || '/default-dress.jpg';
                  const mode = bookingModes[dress.id] || 'instant';

                  return (
                  <div key={dress.id} style={{ position: 'relative' }}>
                    {/* Large Image Card with Swipe */}
                    <div
                      style={{
                        position: 'relative',
                        backgroundColor: 'var(--bg2)',
                        border: '1px solid var(--gold-dim)',
                        paddingTop: '75%',
                        overflow: 'hidden',
                      }}
                    >
                      {currentImg && currentImg !== '/default-dress.jpg' ? (
                        <img
                          src={currentImg}
                          alt={dress.name}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, width: '100%', height: '100%',
                          display: currentImg && currentImg !== '/default-dress.jpg' ? 'none' : 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--bg2)',
                          color: 'var(--muted)',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '2rem', opacity: 0.4 }}>{activeDashboard === 'venue' ? '🏛️' : '👗'}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5, fontFamily: 'var(--font-serif)' }}>이미지 없음</span>
                      </div>

                      {/* Image Navigation Arrows */}
                      {imgs.length > 1 && (
                        <>
                          <button
                            onClick={() => setCardImageIndex(dress.id, imgIdx === 0 ? imgs.length - 1 : imgIdx - 1)}
                            style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.5)',
                              border: 'none',
                              color: 'var(--gold)',
                              cursor: 'pointer',
                              padding: '0.5rem',
                              zIndex: 10,
                              fontSize: '1.2rem',
                              transition: 'background 0.3s',
                            }}
                            onMouseEnter={(e) => (e.target.style.background = 'rgba(0,0,0,0.8)')}
                            onMouseLeave={(e) => (e.target.style.background = 'rgba(0,0,0,0.5)')}
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => setCardImageIndex(dress.id, imgIdx === imgs.length - 1 ? 0 : imgIdx + 1)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.5)',
                              border: 'none',
                              color: 'var(--gold)',
                              cursor: 'pointer',
                              padding: '0.5rem',
                              zIndex: 10,
                              fontSize: '1.2rem',
                              transition: 'background 0.3s',
                            }}
                            onMouseEnter={(e) => (e.target.style.background = 'rgba(0,0,0,0.8)')}
                            onMouseLeave={(e) => (e.target.style.background = 'rgba(0,0,0,0.5)')}
                          >
                            ▶
                          </button>

                          {/* Image Dots */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              display: 'flex',
                              gap: '6px',
                              zIndex: 10,
                            }}
                          >
                            {imgs.map((_, idx) => (
                              <div
                                key={idx}
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: idx === imgIdx ? 'var(--gold)' : 'rgba(212,175,55,0.5)',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s',
                                }}
                                onClick={() => setCardImageIndex(dress.id, idx)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Card Info */}
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg2)',
                        borderLeft: '1px solid var(--gold-dim)',
                        borderRight: '1px solid var(--gold-dim)',
                        borderBottom: '1px solid var(--gold-dim)',
                      }}
                    >
                      <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--gold)',
                            border: '1px solid var(--gold-dim)',
                            padding: '0.2rem 0.5rem',
                          }}
                        >
                          {CATEGORY_LABELS[dress.category] || dress.category}
                        </span>
                        {/* Booking Mode Badge */}
                        <button
                          onClick={() => toggleBookingMode(dress.id)}
                          title={mode === 'instant' ? '즉시 확정: 고객 요청 시 자동 확정됩니다' : '수동 확인: 요청 후 벤더가 직접 확정/거절합니다'}
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.15rem 0.5rem',
                            border: `1px solid ${mode === 'instant' ? '#4caf50' : '#ff9800'}`,
                            background: `${mode === 'instant' ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)'}`,
                            color: mode === 'instant' ? '#4caf50' : '#ff9800',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-serif)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {mode === 'instant' ? '⚡ 즉시확정' : '✋ 수동확인'}
                        </button>
                      </div>
                      <p
                        style={{
                          fontSize: '0.95rem',
                          fontFamily: 'var(--font-serif)',
                          margin: '0 0 0.25rem 0',
                          color: 'var(--text)',
                        }}
                      >
                        {dress.name}
                      </p>
                      <p
                        style={{
                          fontSize: '1.1rem',
                          fontFamily: 'var(--font-serif)',
                          margin: '0 0 0.25rem 0',
                          color: 'var(--gold)',
                        }}
                      >
                        ₩{dress.price?.toLocaleString() || '0'}
                      </p>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--muted)',
                          margin: 0,
                        }}
                      >
                        {dress.sizes && dress.sizes.length > 0 ? dress.sizes.join(', ') : '사이즈 정보 없음'}
                      </p>
                      {/* Stock per size */}
                      {sizeInventory[dress.id] && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {Object.entries(sizeInventory[dress.id]).map(([size, inv]) => {
                            const available = Math.max(0, (inv.total || 0) - (inv.rented || 0));
                            const soldOut = available === 0;
                            return (
                              <span key={size} style={{
                                fontSize: '0.65rem',
                                padding: '0.15rem 0.4rem',
                                border: `1px solid ${soldOut ? '#e85d5d' : 'rgba(212,175,55,0.3)'}`,
                                color: soldOut ? '#e85d5d' : 'var(--muted)',
                                background: soldOut ? 'rgba(232,93,93,0.08)' : 'transparent',
                              }}>
                                {size}: {available}/{inv.total || 0}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg2)',
                        borderLeft: '1px solid var(--gold-dim)',
                        borderRight: '1px solid var(--gold-dim)',
                        borderBottom: '1px solid var(--gold-dim)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <button
                        onClick={() => { setPreviewImageIdx(0); setPreviewDress(dress); }}
                        style={{
                          width: '100%',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--gold)',
                          color: 'var(--gold)',
                          padding: '0.5rem',
                          fontFamily: 'var(--font-serif)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'var(--gold)';
                          e.target.style.color = 'var(--bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = 'var(--gold)';
                        }}
                      >
                        👁 미리보기
                      </button>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* iOS-style toggle switch */}
                        <div
                          onClick={() => toggleAvailability(dress.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            cursor: 'pointer', flex: 1,
                          }}
                        >
                          <div style={{
                            width: '44px', height: '24px',
                            borderRadius: '12px',
                            background: availability[dress.id] ? '#22c55e' : '#e85d5d',
                            position: 'relative',
                            transition: 'background 0.3s',
                            flexShrink: 0,
                          }}>
                            <div style={{
                              width: '20px', height: '20px',
                              borderRadius: '50%',
                              background: 'white',
                              position: 'absolute',
                              top: '2px',
                              left: availability[dress.id] ? '22px' : '2px',
                              transition: 'left 0.3s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.7rem',
                            color: availability[dress.id] ? '#22c55e' : '#e85d5d',
                            fontFamily: 'var(--font-serif)',
                            whiteSpace: 'nowrap',
                          }}>
                            {availability[dress.id] ? '고객 노출' : '노출 OFF'}
                          </span>
                        </div>
                        <button onClick={() => {
                          setEditTarget(dress);
                          setCardImageIndex(dress.id, 0);
                          setEditForm({
                            nameKo: dress.name,
                            nameEn: dress.nameEn || '',
                            category: dress.category,
                            sizes: (dress.sizes || []).join(', '),
                            sizeStock: dress.sizeStock || (dress.sizes || []).reduce((acc, s) => ({ ...acc, [s]: 1 }), {}),
                            price: dress.price || '',
                            imageUrl: dress.image || '',
                            color: dress.color || '',
                            description: dress.description || '',
                          });
                          setImageFile(null);
                          setImagePreview('');
                        }}
                          style={{ flex: 1, fontSize: '0.75rem', color: 'var(--gold)', background: 'transparent', border: '1px solid rgba(212,175,55,0.3)', padding: '0.4rem', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                          수정
                        </button>
                      </div>

                      {deleteConfirm === dress.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleDeleteDress(dress.id)}
                            style={{ flex: 1, fontSize: '0.75rem', color: '#fff', background: '#e85d5d', border: 'none', padding: '0.4rem', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                            확인 삭제
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            style={{ flex: 1, fontSize: '0.75rem', color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '0.4rem', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                            취소
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(dress.id)}
                          style={{ width: '100%', fontSize: '0.7rem', color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', padding: '0.3rem', cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.target.style.color = '#e85d5d'; e.target.style.borderColor = '#e85d5d'; }}
                          onMouseLeave={(e) => { e.target.style.color = 'var(--muted)'; e.target.style.borderColor = 'var(--border)'; }}>
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--muted)',
                }}
              >
                <p style={{ fontSize: '1rem' }}>{activeDashboard === 'venue' ? '등록된 장소가 없습니다.' : '등록된 의상이 없습니다.'}</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    marginTop: '1rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--gold)',
                    color: 'var(--gold)',
                    padding: '0.75rem 1.5rem',
                    fontFamily: 'var(--font-serif)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--gold)';
                    e.target.style.color = 'var(--bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--gold)';
                  }}
                >
                  {activeDashboard === 'venue' ? '첫 장소 등록하기' : '첫 의상 등록하기'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <div
              style={{
                backgroundColor: 'var(--bg2)',
                border: '1px solid var(--gold-dim)',
                padding: '2rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--gold)',
                  margin: '0 0 1.5rem 0',
                }}
              >
                업체 프로필 수정
              </h2>

              {/* ── 업체 유형 선택 (회원가입 시와 동일한 박스) ── */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--muted)' }}>
                  업체 유형
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { id: 'costume', icon: '👗', label: '의상 대여', desc: '한복, 드레스, 기모노, 턱시도 등 촬영용 의상 대여' },
                    { id: 'venue',   icon: '🏛️', label: '장소 대여', desc: '스튜디오, 한옥, 카페, 루프탑 등 촬영 장소 제공' },
                  ].map(vt => {
                    const isSelected = vendorTypeList.includes(vt.id);
                    return (
                      <button
                        key={vt.id}
                        type="button"
                        onClick={() => {
                          setSelectedVendorTypes(prev => {
                            const current = [...prev];
                            if (isSelected) {
                              // Uncheck — but keep at least 1
                              if (current.length <= 1) return current;
                              const updated = current.filter(t => t !== vt.id);
                              if (activeDashboard === vt.id) setActiveDashboard(updated[0]);
                              // Also sync vendorProfile if exists
                              setVendorProfile(p => p ? { ...p, vendor_type: updated.join(',') } : p);
                              return updated;
                            } else {
                              // Check — add
                              const updated = [...current, vt.id];
                              setVendorProfile(p => p ? { ...p, vendor_type: updated.join(',') } : p);
                              return updated;
                            }
                          });
                        }}
                        style={{
                          padding: '1.2rem',
                          background: isSelected ? 'rgba(232,160,32,0.08)' : 'var(--bg)',
                          border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          textAlign: 'left',
                          position: 'relative',
                        }}
                      >
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 8, right: 8,
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--gold)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ color: 'var(--bg)', fontSize: 12, fontWeight: 700 }}>✓</span>
                          </div>
                        )}
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{vt.icon}</div>
                        <div style={{
                          fontSize: '1rem', fontFamily: 'var(--font-serif)',
                          color: isSelected ? 'var(--gold)' : 'var(--text)',
                          marginBottom: '0.3rem',
                        }}>
                          {vt.label}
                        </div>
                        <div style={{
                          fontSize: '0.75rem', color: 'var(--muted)',
                          lineHeight: 1.5,
                        }}>
                          {vt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                  선택하지 않은 유형의 대시보드는 비활성화됩니다. 최소 1개는 선택해야 합니다.<br />
                  체크 해제해도 기존 데이터는 삭제되지 않으니 안심하세요.
                </p>
              </div>

              {/* 업체명 — 고객에게 노출되는 대표 이름 */}
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '0 0 0.8rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                🔒 업체명은 고객이 업체를 검색·예약할 때 표시되는 이름입니다. 담당자 실명은 고객에게 노출되지 않습니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: !profileForm.nameKo ? '#e85d5d' : 'var(--muted)' }}>
                    업체명 (한글) <span style={{ color: '#e85d5d', fontSize: '0.75rem' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.nameKo}
                    onChange={(e) => setProfileForm({ ...profileForm, nameKo: e.target.value })}
                    placeholder="업체명을 입력하세요"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      border: `1px solid ${!profileForm.nameKo ? 'rgba(232,93,93,0.5)' : 'var(--gold-dim)'}`,
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  {!profileForm.nameKo && (
                    <p style={{ fontSize: '0.7rem', color: '#e85d5d', margin: '0.3rem 0 0' }}>필수 입력 항목입니다</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: !profileForm.nameEn ? '#e85d5d' : 'var(--muted)' }}>
                    업체명 (영문) <span style={{ color: '#e85d5d', fontSize: '0.75rem' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.nameEn}
                    onChange={(e) => setProfileForm({ ...profileForm, nameEn: e.target.value })}
                    placeholder="Enter business name"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      border: `1px solid ${!profileForm.nameEn ? 'rgba(232,93,93,0.5)' : 'var(--gold-dim)'}`,
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  {!profileForm.nameEn && (
                    <p style={{ fontSize: '0.7rem', color: '#e85d5d', margin: '0.3rem 0 0' }}>필수 입력 항목입니다</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                    주소/지역
                  </label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--gold-dim)',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                    연락처 (전화)
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--gold-dim)',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                    이메일
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--gold-dim)',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                    웹사이트
                  </label>
                  <input
                    type="url"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                    placeholder="https://"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--gold-dim)',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                </div>
              </div>

              {/* 활동 지역 — 고객 예약의 의상/장소 조회가 이 값으로 필터링된다.
                  입력 UI 가 없어 location_id 가 항상 비어 있었고, 그 결과
                  등록한 의상이 고객에게 한 번도 노출되지 않았다. */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  활동 지역 <span style={{ color: '#e85d5d', fontSize: '0.75rem' }}>*</span>
                </label>
                <LocationPicker
                  value={profileForm.location}
                  onChange={(location) => setProfileForm({ ...profileForm, location })}
                  lang={lang}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                  이 지역에서 촬영하는 고객에게 아이템이 노출됩니다.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  업체 한줄 소개
                </label>
                <input
                  type="text"
                  value={profileForm.intro}
                  onChange={(e) => setProfileForm({ ...profileForm, intro: e.target.value })}
                  placeholder="예: 교토 전통 한복 & 기모노 전문 대여점, 15년 경력"
                  maxLength={80}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.95rem',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.3rem 0 0' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: 0 }}>
                    고객에게 보이는 한줄 소개입니다.
                  </p>
                  <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-sans)',
                    color: profileForm.intro.length >= 70 ? '#e85d5d' : profileForm.intro.length >= 50 ? 'var(--gold)' : 'var(--muted)',
                    fontWeight: profileForm.intro.length >= 70 ? 600 : 400,
                    transition: 'color 0.2s',
                  }}>
                    {profileForm.intro.length}/80
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  오시는 길 설명
                </label>
                <textarea
                  value={profileForm.directions}
                  onChange={(e) => setProfileForm({ ...profileForm, directions: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-sans)',
                    minHeight: '100px',
                  }}
                  placeholder="방문 위치, 주차 정보, 버스 노선 등..."
                />
              </div>

              {/* Specialty Tags */}
              {getVendorTypeTagIds().length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                    {activeDashboard === 'venue' ? '장소 유형 태그' : '의상 전문 태그'}
                  </label>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 0.75rem', fontStyle: 'italic' }}>
                    해당하는 태그를 클릭하세요. 선택한 태그는 고객에게 노출됩니다.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {getVendorTypeTagIds().map((tagId) => {
                      const isSelected = selectedTags.includes(tagId);
                      const label = getTagLabel(tagId, lang, activeDashboard === 'venue' ? 'venue' : 'costume');
                      return (
                        <button
                          key={tagId}
                          type="button"
                          onClick={() => toggleTag(tagId)}
                          style={{
                            display: 'inline-block',
                            padding: '0.45rem 0.9rem',
                            border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                            background: isSelected ? 'rgba(212,175,55,0.15)' : 'transparent',
                            color: isSelected ? 'var(--gold)' : 'var(--muted)',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-serif)',
                            transition: 'all 0.2s',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {isSelected && '✓ '}{label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTags.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--gold)', margin: '0.5rem 0 0' }}>
                      {selectedTags.length}개 선택됨
                    </p>
                  )}
                </div>
              )}

              {/* Custom Tag Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  커스텀 태그 추가
                </label>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 0.75rem', fontStyle: 'italic' }}>
                  위 목록에 원하는 태그가 없다면 직접 입력하세요 (최대 20자)
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => { setCustomTagInput(e.target.value); setCustomTagError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                    maxLength={20}
                    placeholder={activeDashboard === 'venue' ? '예: 야외정원, 프라이빗룸 ...' : '예: 빈티지한복, 럭셔리웨딩 ...'}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.85rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    disabled={!customTagInput.trim()}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--gold)',
                      background: customTagInput.trim() ? 'rgba(212,175,55,0.15)' : 'transparent',
                      color: customTagInput.trim() ? 'var(--gold)' : 'var(--muted)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.82rem',
                      cursor: customTagInput.trim() ? 'pointer' : 'not-allowed',
                      opacity: customTagInput.trim() ? 1 : 0.5,
                      transition: 'all 0.2s',
                    }}
                  >
                    + 추가
                  </button>
                </div>
                {customTagError && (
                  <p style={{ fontSize: '0.75rem', color: '#e85d5d', margin: '0 0 0.5rem' }}>
                    {customTagError}
                  </p>
                )}
                {/* Display custom tags */}
                {customTags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {customTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.35rem 0.75rem',
                          border: '1px solid var(--gold)',
                          background: 'rgba(212,175,55,0.12)',
                          color: 'var(--gold)',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-serif)',
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeCustomTag(tag)}
                          style={{
                            background: 'none', border: 'none', color: '#e85d5d',
                            cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleUpdateProfile}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--gold)',
                    color: 'var(--bg)',
                    border: 'none',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-serif)',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s',
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                  onMouseLeave={(e) => (e.target.style.opacity = '1')}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            {/* 추천 코드 및 혜택 */}
            <ReferralCard userId={user?.id} role="vendor" />

            {/* Bookings Table */}
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '2rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gold-dim)' }}>
                    {['대여 예정일', '대여 시간', '고객', activeDashboard === 'venue' ? '장소명' : '의상명', activeDashboard === 'venue' ? '인원' : '사이즈', '상태', '관리'].map(th => (
                      <th key={th}
                        style={{
                          textAlign: 'left',
                          padding: '1rem',
                          color: 'var(--gold)',
                          fontFamily: 'var(--font-serif)',
                          fontWeight: 'normal',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem', fontFamily: 'var(--font-serif)' }}>
                        <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>📋</div>
                        현재 예약이 없습니다
                        <div style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--border)', lineHeight: 1.6 }}>
                          고객이 예약하면 이곳에 표시됩니다
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredBookings.map((booking) => {
                    const statusColors = {
                      confirmed: 'var(--gold)',
                      pending: '#4A9EFF',
                      completed: '#4AFF6A',
                      rejected: '#e85d5d',
                    };

                    const statusLabels = {
                      confirmed: '확정',
                      pending: '대기',
                      completed: '완료',
                      rejected: '거절',
                    };

                    return (
                      <tr
                        key={booking.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td style={{ padding: '1rem', color: 'var(--text)' }}>
                          {booking.date}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {booking.hours || '-'}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text)' }}>
                          {booking.customer}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text)' }}>
                          {booking.itemName}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text)' }}>
                          {booking.size || '-'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                color: statusColors[booking.status] || 'var(--muted)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                              }}
                            >
                              {statusLabels[booking.status] || booking.status}
                            </span>
                            {booking.status === 'confirmed' && booking.confirmType === 'instant' && (
                              <span style={{
                                fontSize: '0.6rem', padding: '0.15rem 0.4rem',
                                background: 'rgba(76,175,80,0.15)', color: '#4caf50',
                                border: '1px solid rgba(76,175,80,0.3)',
                                fontFamily: 'var(--font-serif)',
                              }}>
                                ⚡ 즉시
                              </span>
                            )}
                            {booking.status === 'confirmed' && booking.confirmType === 'manual' && (
                              <span style={{
                                fontSize: '0.6rem', padding: '0.15rem 0.4rem',
                                background: 'rgba(232,160,32,0.1)', color: 'var(--gold)',
                                border: '1px solid rgba(232,160,32,0.3)',
                                fontFamily: 'var(--font-serif)',
                              }}>
                                ✋ 수동
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {booking.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleBookingAction(booking.id, 'confirm')}
                                style={{
                                  fontSize: '0.7rem', padding: '0.3rem 0.6rem',
                                  background: 'var(--gold)', color: 'var(--bg)',
                                  border: 'none', cursor: 'pointer',
                                  fontFamily: 'var(--font-serif)',
                                }}
                              >
                                확정
                              </button>
                              <button
                                onClick={() => handleBookingAction(booking.id, 'reject')}
                                style={{
                                  fontSize: '0.7rem', padding: '0.3rem 0.6rem',
                                  background: 'transparent', color: '#e85d5d',
                                  border: '1px solid #e85d5d', cursor: 'pointer',
                                  fontFamily: 'var(--font-serif)',
                                }}
                              >
                                거절
                              </button>
                            </div>
                          )}
                          {booking.status === 'confirmed' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>확정됨</span>
                          )}
                          {booking.status === 'completed' && (
                            <span style={{ fontSize: '0.75rem', color: '#4AFF6A' }}>완료</span>
                          )}
                          {booking.status === 'rejected' && (
                            <span style={{ fontSize: '0.75rem', color: '#e85d5d' }}>거절됨</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setTimelineView('calendar')}
                style={{
                  backgroundColor: timelineView === 'calendar' ? 'var(--gold)' : 'transparent',
                  color: timelineView === 'calendar' ? 'var(--bg)' : 'var(--gold)',
                  border: '1px solid var(--gold)',
                  padding: '0.5rem 1rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                날짜별 보기
              </button>
              <button
                onClick={() => setTimelineView('gantt')}
                style={{
                  backgroundColor: timelineView === 'gantt' ? 'var(--gold)' : 'transparent',
                  color: timelineView === 'gantt' ? 'var(--bg)' : 'var(--gold)',
                  border: '1px solid var(--gold)',
                  padding: '0.5rem 1rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                일정표 보기
              </button>
            </div>

            {timelineView === 'gantt' && (() => {
              try {
              // 오늘 기준 14일 날짜 배열
              const today = new Date();
              const ganttDays = Array.from({ length: 14 }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1 + i);
                return d;
              });
              const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const todayStr = fmtDate(today);

              // 현재 대시보드 타입의 타임라인만 필터
              const filteredTimeline = MOCK_RENTAL_TIMELINE.filter(r => r.dashboardType === activeDashboard);

              // 아이템별 그룹화: dashboardDresses 기준 (실제 등록된 아이템)
              const items = dashboardDresses || [];
              const itemGroups = items.map(dress => {
                const rentals = filteredTimeline.filter(r => r.itemName === dress.name || r.itemId === dress.id);
                const sizeStr = typeof dress.sizes === 'string' ? dress.sizes : '';
                const sizes = sizeStr
                  ? sizeStr.split(',').map(s => s.trim()).filter(Boolean)
                  : (dress.sizeStock && typeof dress.sizeStock === 'object' ? Object.keys(dress.sizeStock) : ['Free']);
                return { dress, rentals, sizes };
              });

              const toggleExpand = (itemId) => {
                setExpandedTimelineItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
              };

              // 날짜 셀 렌더 헬퍼
              const renderDateCells = (rentalsForRow, rowHeight = '28px') => (
                <div style={{ display: 'flex', gap: '0px', flex: 1 }}>
                  {ganttDays.map((gd, i) => {
                    const dateStr = fmtDate(gd);
                    const hits = rentalsForRow.filter(r => dateStr >= r.start && dateStr <= r.end);
                    return (
                      <div key={i} style={{
                        width: '60px', borderRight: '1px solid rgba(212,175,55,0.08)',
                        position: 'relative', minHeight: rowHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px',
                      }}>
                        {hits.map((h, hi) => (
                          <div key={hi} style={{
                            backgroundColor: getTimelineBarColor(h.status),
                            height: hits.length > 1 ? '10px' : '20px', flex: 'none',
                            margin: '0 2px', borderRadius: '2px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.55rem', color: 'var(--bg)', fontFamily: 'var(--font-serif)',
                            cursor: 'pointer',
                          }} title={`${h.customer} · ${h.size || '-'} · ${h.hours}`}>
                            {hits.length === 1 && getDaysDiff(h.start, h.end) === 0 ? h.hours : ''}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );

              return (
              <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg2)', border: '1px solid var(--gold-dim)', padding: '1rem' }}>
                <div style={{ minWidth: '1000px' }}>
                  {/* Header with Dates */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '0.5rem', borderBottom: '1px solid var(--gold-dim)', paddingBottom: '0.5rem' }}>
                    <div style={{ width: '200px', fontFamily: 'var(--font-serif)', fontWeight: 'bold', color: 'var(--gold)', fontSize: '0.9rem' }}>
                      {activeDashboard === 'venue' ? '장소명' : '의상명'}
                    </div>
                    <div style={{ display: 'flex', gap: '0px' }}>
                      {ganttDays.map((gd, i) => {
                        const isToday = fmtDate(gd) === todayStr;
                        return (
                          <div key={i} style={{
                            width: '60px', textAlign: 'center', fontSize: '0.7rem',
                            fontFamily: 'var(--font-serif)',
                            color: isToday ? 'var(--gold)' : 'var(--muted)',
                            fontWeight: isToday ? '700' : 'normal',
                            borderRight: '1px solid rgba(212,175,55,0.1)',
                            paddingBottom: '0.3rem',
                          }}>
                            <div>{gd.getMonth() + 1}/{gd.getDate()}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{['일','월','화','수','목','금','토'][gd.getDay()]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 아이템별 그룹 행 */}
                  {itemGroups.map(({ dress, rentals, sizes }) => {
                    const isExpanded = expandedTimelineItems[dress.id];
                    const totalRentals = rentals.length;
                    const inv = sizeInventory[dress.id];

                    return (
                      <div key={dress.id} style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                        {/* 아이템 메인 행 */}
                        <div
                          onClick={() => sizes.length > 0 && toggleExpand(dress.id)}
                          style={{
                            display: 'flex', gap: '20px', alignItems: 'center', minHeight: '44px',
                            cursor: sizes.length > 0 ? 'pointer' : 'default',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (sizes.length > 0) e.currentTarget.style.background = 'rgba(232,160,32,0.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {sizes.length > 0 && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--gold)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                            )}
                            <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'var(--font-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dress.name}
                            </span>
                            {totalRentals > 0 && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--gold)', background: 'rgba(232,160,32,0.12)', padding: '1px 5px', borderRadius: '8px', fontFamily: 'var(--font-serif)' }}>
                                {totalRentals}건
                              </span>
                            )}
                          </div>
                          {/* 전체 예약 바 */}
                          {renderDateCells(rentals, '36px')}
                        </div>

                        {/* 사이즈별 서브행 (아코디언) */}
                        {isExpanded && sizes.map(size => {
                          const sizeRentals = rentals.filter(r => (r.size || 'Free') === size);
                          const sizeInv = inv?.[size];
                          const total = sizeInv?.total ?? (dress.sizeStock?.[size] || 0);
                          const rented = sizeInv?.rented ?? 0;
                          const avail = Math.max(0, total - rented);

                          return (
                            <div key={size} style={{ display: 'flex', gap: '20px', alignItems: 'center', minHeight: '32px', background: 'rgba(232,160,32,0.02)' }}>
                              <div style={{ width: '200px', paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                                  {size}
                                </span>
                                <span style={{
                                  fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', fontFamily: 'var(--font-serif)',
                                  color: avail > 0 ? '#4AFF6A' : '#e85d5d',
                                  background: avail > 0 ? 'rgba(74,255,106,0.08)' : 'rgba(232,93,93,0.08)',
                                  border: `1px solid ${avail > 0 ? 'rgba(74,255,106,0.2)' : 'rgba(232,93,93,0.2)'}`,
                                }}>
                                  {avail}/{total}
                                </span>
                              </div>
                              {renderDateCells(sizeRentals, '28px')}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* 범례 */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gold-dim)' }}>
                    {[
                      { label: '확정', color: 'var(--gold)' },
                      { label: '대기', color: '#4A9EFF' },
                      { label: '완료', color: '#4AFF6A' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              );
              } catch (err) {
                return (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#e85d5d', background: 'var(--bg2)', border: '1px solid var(--gold-dim)' }}>
                    <p style={{ marginBottom: '0.5rem' }}>일정표를 불러오는 중 오류가 발생했습니다.</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{String(err?.message || err)}</p>
                  </div>
                );
              }
            })()}

            {timelineView === 'calendar' && (() => {
              const { year, month } = calendarMonth;
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const daysInMonth = lastDay.getDate();
              // 월요일 기준 시작 (0=월 ~ 6=일)
              let startDow = firstDay.getDay() - 1;
              if (startDow < 0) startDow = 6;
              const totalCells = startDow + daysInMonth;
              const rows = Math.ceil(totalCells / 7);
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

              const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

              const prevMonth = () => {
                setCalendarMonth(prev => {
                  if (prev.month === 0) return { year: prev.year - 1, month: 11 };
                  return { ...prev, month: prev.month - 1 };
                });
              };
              const nextMonth = () => {
                setCalendarMonth(prev => {
                  if (prev.month === 11) return { year: prev.year + 1, month: 0 };
                  return { ...prev, month: prev.month + 1 };
                });
              };
              const goToday = () => {
                const now = new Date();
                setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
              };

              return (
              <>
              <div style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--gold-dim)', padding: '1.5rem' }}>
                {/* Month Navigation */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '1.5rem',
                }}>
                  <button onClick={prevMonth} style={{
                    background: 'transparent', border: '1px solid var(--gold-dim)',
                    color: 'var(--gold)', padding: '0.5rem 1rem', cursor: 'pointer',
                    fontFamily: 'var(--font-serif)', fontSize: '1.1rem', transition: 'all 0.2s',
                  }}>
                    ◀
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-serif)', color: 'var(--gold)',
                      fontSize: '1.3rem', margin: 0, letterSpacing: '0.05em',
                    }}>
                      {year}년 {monthNames[month]}
                    </h3>
                    <button onClick={goToday} style={{
                      background: 'transparent', border: '1px solid var(--gold-dim)',
                      color: 'var(--muted)', padding: '0.3rem 0.8rem', cursor: 'pointer',
                      fontFamily: 'var(--font-serif)', fontSize: '0.75rem',
                    }}>
                      오늘
                    </button>
                  </div>
                  <button onClick={nextMonth} style={{
                    background: 'transparent', border: '1px solid var(--gold-dim)',
                    color: 'var(--gold)', padding: '0.5rem 1rem', cursor: 'pointer',
                    fontFamily: 'var(--font-serif)', fontSize: '1.1rem', transition: 'all 0.2s',
                  }}>
                    ▶
                  </button>
                </div>

                {/* Day Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0' }}>
                  {['월', '화', '수', '목', '금', '토', '일'].map((day, di) => (
                    <div
                      key={day}
                      style={{
                        textAlign: 'center',
                        fontFamily: 'var(--font-serif)',
                        color: di === 5 ? '#4A9EFF' : di === 6 ? '#e85d5d' : 'var(--gold)',
                        fontSize: '0.85rem',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--gold-dim)',
                      }}
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar Cells */}
                  {Array.from({ length: rows * 7 }).map((_, cellIdx) => {
                    const dayNum = cellIdx - startDow + 1;
                    const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;
                    const dateStr = isValidDay
                      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                      : null;
                    const isToday = dateStr === todayStr;
                    const dow = cellIdx % 7; // 0=월 ~ 6=일
                    const isSat = dow === 5;
                    const isSun = dow === 6;
                    const vendorDateStatus = dateStr ? getVendorDateStatus(dateStr) : 'open';
                    const isHoliday = vendorDateStatus === 'off';
                    const isVendorSelected = vendorActiveDate === dateStr;

                    // Find rentals that include this date — 아이템별 그룹화
                    const dayRentalsRaw = dateStr ? MOCK_RENTAL_TIMELINE.filter(r => {
                      return r.dashboardType === activeDashboard && dateStr >= r.start && dateStr <= r.end;
                    }) : [];
                    // 아이템별로 그룹화: { itemName, count, statuses[], sizes[] }
                    const dayItemMap = {};
                    dayRentalsRaw.forEach(r => {
                      if (!dayItemMap[r.itemName]) dayItemMap[r.itemName] = { itemName: r.itemName, count: 0, statuses: [], sizes: [] };
                      dayItemMap[r.itemName].count++;
                      dayItemMap[r.itemName].statuses.push(r.status);
                      if (r.size) dayItemMap[r.itemName].sizes.push(r.size);
                    });
                    const dayItems = Object.values(dayItemMap);

                    const statusColor = (status) => {
                      if (status === 'confirmed') return 'var(--gold)';
                      if (status === 'pending') return '#4A9EFF';
                      if (status === 'completed') return '#4caf50';
                      return 'var(--muted)';
                    };
                    // 그룹의 우선 상태: pending > confirmed > completed
                    const groupStatusColor = (statuses) => {
                      if (statuses.includes('pending')) return '#4A9EFF';
                      if (statuses.includes('confirmed')) return 'var(--gold)';
                      if (statuses.includes('completed')) return '#4caf50';
                      return 'var(--muted)';
                    };

                    return (
                      <div
                        key={cellIdx}
                        onClick={() => isValidDay && dateStr && setVendorActiveDate(isVendorSelected ? null : dateStr)}
                        style={{
                          minHeight: '90px',
                          backgroundColor: isHoliday ? 'rgba(232,80,80,0.04)' : isVendorSelected ? 'rgba(232,160,32,0.1)' : isToday ? 'rgba(232,160,32,0.06)' : isValidDay ? 'var(--bg)' : 'rgba(0,0,0,0.2)',
                          border: isVendorSelected ? '2px solid var(--gold)' : isToday ? '2px solid var(--gold)' : '1px solid var(--gold-dim)',
                          padding: '0.4rem',
                          position: 'relative',
                          transition: 'background 0.2s',
                          cursor: isValidDay ? 'pointer' : 'default',
                        }}
                      >
                        {isValidDay && (
                          <>
                            <div style={{
                              fontSize: '0.85rem', fontFamily: 'var(--font-serif)',
                              color: isHoliday ? 'rgba(232,80,80,0.5)' : isToday ? 'var(--gold)' : isSun ? '#e85d5d' : isSat ? '#4A9EFF' : 'var(--text)',
                              fontWeight: isToday ? '700' : 'normal',
                              marginBottom: '0.3rem',
                              textDecoration: isHoliday ? 'line-through' : 'none',
                            }}>
                              {dayNum}
                              {isToday && <span style={{ fontSize: '0.55rem', color: 'var(--gold)', marginLeft: 4 }}>오늘</span>}
                              {isHoliday && <span style={{ fontSize: '0.5rem', color: '#e85d5d', marginLeft: 4 }}>휴무</span>}
                            </div>
                            {/* 아이템별 그룹화된 대여 현황 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {dayItems.slice(0, 3).map((item, ri) => {
                                const color = groupStatusColor(item.statuses);
                                return (
                                  <div
                                    key={ri}
                                    title={`${item.itemName} — ${item.count}건 (${[...new Set(item.sizes)].join(', ') || '-'})`}
                                    style={{
                                      fontSize: '0.55rem',
                                      padding: '2px 4px',
                                      backgroundColor: `${color}22`,
                                      borderLeft: `3px solid ${color}`,
                                      color: color,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      cursor: 'pointer',
                                      fontFamily: 'var(--font-serif)',
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}
                                  >
                                    <span>{item.itemName.length > 6 ? item.itemName.slice(0, 6) + '…' : item.itemName}</span>
                                    {item.count > 1 && <span style={{ opacity: 0.7 }}>×{item.count}</span>}
                                  </div>
                                );
                              })}
                              {dayItems.length > 3 && (
                                <div style={{
                                  fontSize: '0.5rem', color: 'var(--muted)',
                                  textAlign: 'center', padding: '1px 0',
                                }}>
                                  +{dayItems.length - 3}건 더
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{
                  display: 'flex', gap: '1.5rem', marginTop: '1rem',
                  justifyContent: 'center', flexWrap: 'wrap',
                }}>
                  {[
                    { label: '확정', color: 'var(--gold)' },
                    { label: '대기', color: '#4A9EFF' },
                    { label: '완료', color: '#4caf50' },
                    { label: '휴무', color: '#e85d5d' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        width: '12px', height: '12px',
                        backgroundColor: `${item.color}22`,
                        borderLeft: `3px solid ${item.color}`,
                      }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 날짜별 휴무 설정 (날짜 클릭 시) ── */}
              {vendorActiveDate && (
                <div style={{ marginTop: '1.5rem', border: '1px solid var(--gold-dim)', background: 'var(--bg2)', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>날짜별 관리</div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.04em' }}>{vendorActiveDate}</div>
                    </div>
                    <button onClick={() => setVendorActiveDate(null)} style={{
                      background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
                      padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-serif)',
                    }}>닫기</button>
                  </div>
                  <button onClick={() => toggleVendorHoliday(vendorActiveDate)} style={{
                    width: '100%', padding: '12px', fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.04em',
                    background: vendorSchedule.holidays?.[vendorActiveDate] ? 'rgba(232,80,80,0.08)' : 'transparent',
                    color: vendorSchedule.holidays?.[vendorActiveDate] ? '#e85d5d' : 'var(--muted)',
                    border: `1px solid ${vendorSchedule.holidays?.[vendorActiveDate] ? 'rgba(232,80,80,0.3)' : 'var(--border)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    {vendorSchedule.holidays?.[vendorActiveDate] ? '✓ 휴무일 — 운영일로 변경' : '☾ 이 날 휴무로 설정'}
                  </button>
                  {!vendorSchedule.holidays?.[vendorActiveDate] && (
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                      이 날은 정상 운영일입니다. 대여 현황은 달력에서 확인하세요.
                    </div>
                  )}
                </div>
              )}

              {/* ── 정기 휴무 요일 설정 ── */}
              <div style={{ marginTop: '1.5rem', border: '1px solid var(--gold-dim)', background: 'var(--bg2)', padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>정기 휴무 요일</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  매주 반복되는 정기 휴무일을 설정하세요. 해당 요일은 달력에 휴무로 표시됩니다.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['일','월','화','수','목','금','토'].map((label, idx) => {
                    const active = (vendorSchedule.weeklyOff || []).includes(idx);
                    return (
                      <button key={idx} onClick={() => toggleVendorWeeklyOff(idx)} style={{
                        width: 40, height: 40, fontSize: 12, fontFamily: 'var(--font-serif)',
                        border: `1px solid ${active ? '#e85d5d' : 'var(--border)'}`,
                        background: active ? 'rgba(232,80,80,0.12)' : 'transparent',
                        color: active ? '#e85d5d' : (idx === 0 ? 'rgba(232,80,80,0.7)' : idx === 6 ? 'rgba(100,150,255,0.7)' : 'var(--muted)'),
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>{label}</button>
                    );
                  })}
                </div>
              </div>

              {/* ── 기본 운영 시간 ── */}
              <div style={{ marginTop: '1.5rem', border: '1px solid var(--gold-dim)', background: 'var(--bg2)', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase' }}>기본 운영 시간</div>
                  <button
                    onClick={() => editingVendorDefault ? handleSaveVendorDefault() : setEditingVendorDefault(true)}
                    style={{
                      fontSize: 11, padding: '6px 14px', fontFamily: 'var(--font-serif)',
                      background: editingVendorDefault ? 'var(--gold)' : 'transparent',
                      color: editingVendorDefault ? '#0B0B0B' : 'var(--gold)',
                      border: `1px solid ${editingVendorDefault ? 'var(--gold)' : 'var(--gold-dim)'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {editingVendorDefault ? '저장' : '✎ 편집'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  대여 운영 시간대를 설정하세요. 고객 예약 시 이 시간대가 기본으로 적용됩니다.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {VENDOR_TIME_SLOTS.map(time => {
                    const isOn = (editingVendorDefault ? draftVendorDefault : (vendorSchedule.defaultSlots || [])).includes(time);
                    return (
                      <button key={time}
                        disabled={!editingVendorDefault}
                        onClick={() => setDraftVendorDefault(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time].sort())}
                        style={{
                          padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-serif)',
                          background: isOn ? (editingVendorDefault ? 'var(--gold)' : 'rgba(232,160,32,0.12)') : 'transparent',
                          color: isOn ? (editingVendorDefault ? '#0B0B0B' : 'var(--gold)') : 'var(--muted)',
                          border: `1px solid ${isOn ? 'var(--gold-border)' : 'var(--border)'}`,
                          cursor: editingVendorDefault ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                        }}>
                        {time}
                      </button>
                    );
                  })}
                </div>
                {vendorSaveMsg && (
                  <div style={{ marginTop: 10, padding: '9px 16px', background: 'rgba(232,160,32,0.1)', border: '1px solid var(--gold-border)', fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-serif)', textAlign: 'center' }}>
                    {vendorSaveMsg}
                  </div>
                )}
              </div>
              </>
              );
            })()}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <div style={{
              marginBottom: '2rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 8 }}>
                {lang === 'ko' ? '📊 리뷰 요약' : 'Review Summary'}
              </div>
            </div>

            {/* Reviews Cards for each vendor type */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
            }}>
              {['costume', 'venue'].includes(activeDashboard) && (
                <div style={{
                  border: '1px solid var(--gold-dim)',
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg2)',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: 16,
                    background: 'var(--bg)',
                    padding: '4px 12px',
                    fontSize: 12,
                    color: 'var(--gold)',
                    fontFamily: 'var(--font-serif)',
                    letterSpacing: '0.06em',
                  }}>
                    {activeDashboard === 'costume' ? '👗 의상 대여' : '📍 촬영 장소'}
                  </div>

                  {(() => {
                    const vendorReviews = reviews[activeDashboard] || [];
                    const { avg, count } = reviewStats[activeDashboard] || { avg: 0, count: 0 };

                    return (
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.5rem',
                          marginBottom: '1.5rem',
                          marginTop: '0.5rem',
                        }}>
                          <div style={{
                            fontSize: 28,
                            color: 'var(--gold)',
                            fontWeight: 'bold',
                          }}>
                            {'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}
                          </div>
                          <div style={{
                            fontSize: 14,
                            color: 'var(--text)',
                          }}>
                            {avg.toFixed(1)} ({count}건)
                          </div>
                        </div>

                        {vendorReviews.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '2rem 1rem',
                            color: 'var(--muted)',
                            fontSize: 13,
                          }}>
                            {lang === 'ko' ? '아직 리뷰가 없습니다' : 'No reviews yet'}
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            maxHeight: '600px',
                            overflowY: 'auto',
                            paddingRight: '0.5rem',
                          }}>
                            {vendorReviews.map((review) => {
                              const formattedReview = formatReview(review, lang);
                              const reply = reviewReplies[review.id];
                              const isEditing = replyTarget?.reviewId === review.id;
                              return (
                                <div
                                  key={review.id}
                                  style={{
                                    border: '1px solid var(--border)', background: 'var(--bg2)',
                                    padding: '16px 16px 12px', position: 'relative',
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '0.5rem',
                                    gap: '0.5rem',
                                  }}>
                                    <div style={{
                                      fontSize: 13,
                                      color: 'var(--gold)',
                                      fontWeight: 'bold',
                                      letterSpacing: '0.02em',
                                    }}>
                                      {formattedReview.formattedStars}
                                    </div>
                                    <div style={{
                                      fontSize: 11,
                                      color: 'var(--muted)',
                                    }}>
                                      {formattedReview.dateStr}
                                    </div>
                                  </div>

                                  {review.tags && review.tags.length > 0 && (
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '0.4rem',
                                      marginBottom: '0.5rem',
                                    }}>
                                      {review.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          style={{
                                            fontSize: 10,
                                            backgroundColor: 'rgba(232,160,32,0.1)',
                                            color: 'var(--gold)',
                                            padding: '2px 8px',
                                            borderRadius: '2px',
                                            fontFamily: 'var(--font-serif)',
                                            letterSpacing: '0.02em',
                                          }}
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {review.text && (
                                    <div style={{
                                      fontSize: 12,
                                      color: 'var(--text)',
                                      lineHeight: 1.5,
                                      fontStyle: 'italic',
                                      marginBottom: '0.5rem',
                                    }}>
                                      "{review.text}"
                                    </div>
                                  )}

                                  {/* 기존 답글 표시 */}
                                  {reply && !isEditing && (
                                    <div style={{
                                      marginTop: 10, padding: '12px 14px',
                                      background: 'rgba(232,160,32,0.04)', borderLeft: '3px solid var(--gold)',
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>
                                          ✦ 벤더 답글
                                        </span>
                                        <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                                          {reply.updated_at?.slice(0, 10).replace(/-/g, '.') || reply.created_at?.slice(0, 10).replace(/-/g, '.')}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                                        {reply.body}
                                      </div>
                                      <button
                                        onClick={() => {
                                          setReplyTarget({ reviewId: review.id, existing: true });
                                          setReplyBody(reply.body);
                                        }}
                                        style={{
                                          marginTop: 8, padding: '5px 12px', background: 'transparent',
                                          border: '1px solid var(--border)', color: 'var(--muted)',
                                          fontSize: 10, fontFamily: 'var(--font-serif)', cursor: 'pointer',
                                        }}
                                      >
                                        수정
                                      </button>
                                    </div>
                                  )}

                                  {/* 답글 작성/수정 영역 */}
                                  {isEditing && (
                                    <div style={{
                                      marginTop: 10, padding: '12px 14px',
                                      border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.04)',
                                    }}>
                                      <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 8 }}>
                                        {replyTarget.existing ? '답글 수정' : '답글 작성'}
                                      </div>
                                      <textarea
                                        value={replyBody}
                                        onChange={e => setReplyBody(e.target.value)}
                                        placeholder="고객의 리뷰에 감사하거나 답변을 남겨주세요..."
                                        style={{
                                          width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                                          color: 'var(--text)', fontSize: 12, padding: '10px 12px',
                                          resize: 'vertical', minHeight: 70, lineHeight: 1.6, boxSizing: 'border-box',
                                        }}
                                      />
                                      {replyMsg && (
                                        <div style={{
                                          fontSize: 11, marginTop: 6,
                                          color: replyMsg.includes('✓') ? '#4ade80' : '#e85d5d',
                                        }}>
                                          {replyMsg}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                        <button
                                          onClick={handleReplySubmit}
                                          disabled={replySaving || !replyBody.trim()}
                                          style={{
                                            padding: '7px 18px', background: 'var(--gold)', border: 'none',
                                            color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 11,
                                            letterSpacing: '0.08em', cursor: 'pointer',
                                            opacity: (replySaving || !replyBody.trim()) ? 0.5 : 1,
                                          }}
                                        >
                                          {replySaving ? '저장 중…' : replyTarget.existing ? '수정 완료' : '답글 등록'}
                                        </button>
                                        <button
                                          onClick={() => { setReplyTarget(null); setReplyBody(''); setReplyMsg(''); }}
                                          style={{
                                            padding: '7px 18px', background: 'transparent',
                                            border: '1px solid var(--border)', color: 'var(--muted)',
                                            fontFamily: 'var(--font-serif)', fontSize: 11, cursor: 'pointer',
                                          }}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* 답글 달기 버튼 (아직 답글 없을 때) */}
                                  {!reply && !isEditing && (
                                    <button
                                      onClick={() => {
                                        setReplyTarget({ reviewId: review.id, existing: false });
                                        setReplyBody('');
                                      }}
                                      style={{
                                        marginTop: 10, padding: '6px 14px',
                                        background: 'rgba(232,160,32,0.08)', border: '1px solid var(--gold-border)',
                                        color: 'var(--gold)', fontSize: 10, fontFamily: 'var(--font-serif)',
                                        letterSpacing: '0.06em', cursor: 'pointer',
                                      }}
                                    >
                                      💬 답글 달기
                                    </button>
                                  )}

                                  {/* 원본 리뷰 바로가기 */}
                                  {review.photographerId && (
                                    <button
                                      onClick={() => navigate(`/photographer/${review.photographerId}?tab=reviews`)}
                                      style={{
                                        marginTop: 10, padding: '5px 12px',
                                        background: 'transparent', border: '1px solid var(--border)',
                                        color: 'var(--gold)', fontSize: 10,
                                        fontFamily: 'var(--font-serif)', letterSpacing: '0.04em',
                                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                                      }}
                                    >
                                      {lang === 'ko' ? '📄 원본 리뷰 보기' : '📄 View Original Review'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 저장 완료 팝업 */}
      {showSavePopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'pageEnter 0.2s ease-out',
        }}
          onClick={() => setShowSavePopup(false)}
        >
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--gold)',
            padding: '2.5rem 3rem', textAlign: 'center',
            maxWidth: 360, width: '85%',
            animation: 'pageEnter 0.3s ease-out',
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✓</div>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: '1.2rem',
              color: 'var(--gold)', margin: '0 0 0.5rem 0',
            }}>
              저장이 완료되었습니다
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 1.2rem 0' }}>
              {activeDashboard === 'venue' ? '장소 대여' : '의상 대여'} 프로필이 성공적으로 저장되었습니다.
            </p>
            <button
              onClick={() => setShowSavePopup(false)}
              style={{
                background: 'var(--gold)', color: 'var(--bg)', border: 'none',
                padding: '0.6rem 2rem', fontFamily: 'var(--font-serif)',
                fontSize: '0.9rem', cursor: 'pointer', letterSpacing: '0.05em',
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal — 고객 미리보기 (이미지 갤러리 + 상품 정보) */}
      {previewDress && (() => {
        const pImages = previewDress.images || [];
        const pImg = pImages[previewImageIdx]?.url || pImages[previewImageIdx] || '';
        const pCaption = pImages[previewImageIdx]?.caption || '';
        const pName = previewDress.nameI18n?.[lang] || previewDress.name;
        const pDesc = previewDress.descI18n?.[lang] || previewDress.desc || '';
        return (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setPreviewDress(null)}
          >
            <div
              style={{
                position: 'relative', width: '92%', maxWidth: '520px', maxHeight: '92vh',
                backgroundColor: 'var(--bg)', border: '1px solid var(--gold-dim)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 닫기 버튼 */}
              <button
                onClick={() => setPreviewDress(null)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  border: 'none', color: '#fff', fontSize: '1.3rem',
                  cursor: 'pointer', zIndex: 20, padding: '6px 10px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>

              {/* 이미지 영역 */}
              <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
                {pImg ? (
                  <div style={{
                    width: '100%', paddingTop: '125%',
                    backgroundImage: `url(${pImg})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    transition: 'background-image 0.3s ease',
                  }} />
                ) : (
                  <div style={{
                    width: '100%', paddingTop: '125%',
                    background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'var(--muted)', fontSize: '3rem' }}>📷</span>
                  </div>
                )}

                {/* ◀ ▶ 화살표 네비게이션 */}
                {pImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewImageIdx(i => (i - 1 + pImages.length) % pImages.length); }}
                      style={{
                        position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                        border: 'none', color: '#fff', fontSize: '1.4rem',
                        cursor: 'pointer', padding: '12px 14px', lineHeight: 1,
                        borderRadius: 0,
                      }}
                    >
                      ◀
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewImageIdx(i => (i + 1) % pImages.length); }}
                      style={{
                        position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                        border: 'none', color: '#fff', fontSize: '1.4rem',
                        cursor: 'pointer', padding: '12px 14px', lineHeight: 1,
                        borderRadius: 0,
                      }}
                    >
                      ▶
                    </button>
                  </>
                )}

                {/* 이미지 카운터 + dots */}
                {pImages.length > 1 && (
                  <div style={{
                    position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    padding: '6px 14px', borderRadius: 0,
                  }}>
                    {pImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPreviewImageIdx(i); }}
                        style={{
                          width: 8, height: 8, borderRadius: '50%', border: 'none', padding: 0,
                          background: i === previewImageIdx ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                          cursor: 'pointer', transition: 'background 0.2s',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>
                      {previewImageIdx + 1}/{pImages.length}
                    </span>
                  </div>
                )}

                {/* 캡션 */}
                {pCaption && (
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    padding: '4px 10px', fontSize: 11, color: 'rgba(255,255,255,0.8)',
                    letterSpacing: '0.05em',
                  }}>
                    {pCaption}
                  </div>
                )}
              </div>

              {/* 상품 정보 */}
              <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
                <div style={{
                  fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
                }}>
                  {previewDress.category}
                </div>
                <div style={{
                  fontFamily: 'var(--font-serif)', fontSize: 18,
                  letterSpacing: '0.04em', marginBottom: 6,
                }}>
                  {pName}
                </div>
                {pDesc && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
                    {pDesc}
                  </div>
                )}
                {previewDress.price > 0 && (
                  <div style={{
                    fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                    letterSpacing: '0.05em', marginBottom: 10,
                  }}>
                    ₩{fmt(previewDress.price)}
                  </div>
                )}
                {previewDress.sizes?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {previewDress.sizes.map(s => (
                      <span key={s} style={{
                        padding: '4px 12px', border: '1px solid var(--gold-dim)',
                        fontSize: 12, color: 'var(--muted)', letterSpacing: '0.05em',
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {previewDress.color && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Color: {previewDress.color}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Dress Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg2)',
              border: '1px solid var(--gold-dim)',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1.5rem 0' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--gold)',
                  margin: 0,
                }}
              >
                새 아이템 등록
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--muted)',
                  fontSize: '1.5rem', cursor: 'pointer', padding: '4px 8px',
                  lineHeight: 1, transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  의상명 (한글) <span style={{ color: '#e85d5d' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameKo}
                  onChange={(e) => {
                    setFormData({ ...formData, nameKo: e.target.value });
                    if (addFormErrors.nameKo) {
                      setAddFormErrors(prev => {
                        const updated = { ...prev };
                        delete updated.nameKo;
                        return updated;
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: addFormErrors.nameKo ? '1px solid #e85d5d' : '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
                {addFormErrors.nameKo && (
                  <span style={{ fontSize: '0.75rem', color: '#e85d5d', marginTop: '0.25rem', display: 'block' }}>
                    {addFormErrors.nameKo}
                  </span>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  의상명 (영문)
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  카테고리
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                >
                  {Object.entries(activeDashboard === 'venue' ? VENUE_CATEGORIES : COSTUME_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  사이즈별 재고 수량 <span style={{ color: '#e85d5d' }}>*</span>
                </label>
                {/* 2-column table: Size | Quantity */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.5rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '0.8rem', color: 'var(--gold)', borderBottom: '1px solid var(--gold-dim)', width: '50%' }}>사이즈</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '0.8rem', color: 'var(--gold)', borderBottom: '1px solid var(--gold-dim)', width: '40%' }}>수량 (벌)</th>
                      <th style={{ width: '10%', borderBottom: '1px solid var(--gold-dim)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.sizes || '').split(',').map((size, idx, arr) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            type="text"
                            value={size.trim()}
                            onChange={(e) => {
                              const parts = (formData.sizes || '').split(',').map(s => s.trim());
                              const oldSize = parts[idx];
                              parts[idx] = e.target.value;
                              const newStock = { ...(formData.sizeStock || {}) };
                              if (oldSize && oldSize !== e.target.value) {
                                newStock[e.target.value] = newStock[oldSize] || 0;
                                delete newStock[oldSize];
                              }
                              setFormData(prev => ({ ...prev, sizes: parts.join(', '), sizeStock: newStock }));
                            }}
                            placeholder="예: M"
                            style={{
                              width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg)',
                              color: 'var(--text)', border: '1px solid var(--gold-dim)',
                              boxSizing: 'border-box', fontSize: '0.85rem',
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.sizeStock?.[size.trim()] || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              sizeStock: { ...(prev.sizeStock || {}), [size.trim()]: parseInt(e.target.value) || 0 },
                            }))}
                            style={{
                              width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg)',
                              color: 'var(--text)', border: '1px solid var(--gold-dim)',
                              boxSizing: 'border-box', textAlign: 'center', fontSize: '0.85rem',
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              const parts = (formData.sizes || '').split(',');
                              const removed = parts[idx]?.trim();
                              parts.splice(idx, 1);
                              const newStock = { ...(formData.sizeStock || {}) };
                              if (removed) delete newStock[removed];
                              setFormData(prev => ({ ...prev, sizes: parts.join(','), sizeStock: newStock }));
                            }}
                            style={{
                              background: 'transparent', border: 'none', color: '#e85d5d',
                              cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', lineHeight: 1,
                            }}
                            title="삭제"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(formData.sizes || '').split(',').length < 6 && (
                  <button
                    onClick={() => {
                      const current = formData.sizes || '';
                      const newSizes = current ? current + ',' : ',';
                      setFormData(prev => ({ ...prev, sizes: newSizes }));
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'transparent', border: '1px dashed var(--gold-dim)',
                      color: 'var(--gold)', padding: '6px 14px', cursor: 'pointer',
                      fontSize: '0.8rem', fontFamily: 'var(--font-serif)', width: '100%',
                      justifyContent: 'center', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                  >
                    + 사이즈 추가 ({(formData.sizes || '').split(',').length}/6)
                  </button>
                )}
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0.3rem 0 0' }}>
                  각 행에 사이즈와 보유 수량을 입력하세요. Free 사이즈의 경우 "Free"를 입력합니다. (최대 6개)
                </p>
                {addFormErrors.sizes && (
                  <span style={{ fontSize: '0.75rem', color: '#e85d5d', marginTop: '0.25rem', display: 'block' }}>
                    {addFormErrors.sizes}
                  </span>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  색상
                </label>
                <input
                  type="text"
                  placeholder="검정, 흰색, 금색 등"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  대여 가격 (원)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  이미지 파일 <span style={{ color: '#e85d5d' }}>*</span>
                </label>
                <DragDropImageUpload
                  label=""
                  previewUrl={imagePreview}
                  onFileSelect={(file) => {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    if (addFormErrors.image) {
                      setAddFormErrors(prev => {
                        const updated = { ...prev };
                        delete updated.image;
                        return updated;
                      });
                    }
                  }}
                />
                {addFormErrors.image && (
                  <span style={{ fontSize: '0.75rem', color: '#e85d5d', marginTop: '0.25rem', display: 'block' }}>
                    {addFormErrors.image}
                  </span>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
              }}
            >
              <button
                onClick={handleAddDress}
                disabled={Object.keys(addFormErrors).length > 0 || uploading}
                style={{
                  flex: 1,
                  backgroundColor: Object.keys(addFormErrors).length > 0 || uploading ? 'rgba(212,175,55,0.5)' : 'var(--gold)',
                  color: 'var(--bg)',
                  border: 'none',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: Object.keys(addFormErrors).length > 0 || uploading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.3s',
                }}
                onMouseEnter={(e) => Object.keys(addFormErrors).length === 0 && !uploading && (e.target.style.opacity = '0.8')}
                onMouseLeave={(e) => Object.keys(addFormErrors).length === 0 && !uploading && (e.target.style.opacity = '1')}
              >
                저장
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  color: 'var(--gold)',
                  border: '1px solid var(--gold)',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--gold)';
                  e.target.style.color = 'var(--bg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--gold)';
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setEditTarget(null);
            setEditForm({});
            setImageFile(null);
            setImagePreview('');
            setCurrentImageIndex(0);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg)',
              borderRadius: '4px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1.5rem 0' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--gold)',
                  margin: 0,
                }}
              >
                아이템 수정
              </h2>
              <button
                onClick={() => { setEditTarget(null); setEditForm({}); setImageFile(null); setImagePreview(''); setCurrentImageIndex(0); }}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--muted)',
                  fontSize: '1.5rem', cursor: 'pointer', padding: '4px 8px',
                  lineHeight: 1, transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  의상명 (한글) <span style={{ color: '#e85d5d' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editForm.nameKo || ''}
                  onChange={(e) => {
                    setEditForm({ ...editForm, nameKo: e.target.value });
                    if (editFormErrors.nameKo) {
                      setEditFormErrors(prev => {
                        const updated = { ...prev };
                        delete updated.nameKo;
                        return updated;
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: editFormErrors.nameKo ? '1px solid #e85d5d' : '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
                {editFormErrors.nameKo && (
                  <span style={{ fontSize: '0.75rem', color: '#e85d5d', marginTop: '0.25rem', display: 'block' }}>
                    {editFormErrors.nameKo}
                  </span>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  의상명 (영문)
                </label>
                <input
                  type="text"
                  value={editForm.nameEn || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nameEn: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  카테고리
                </label>
                <select
                  value={editForm.category || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                >
                  {Object.entries(activeDashboard === 'venue' ? VENUE_CATEGORIES : COSTUME_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  사이즈별 재고 수량 <span style={{ color: '#e85d5d' }}>*</span>
                </label>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.5rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '0.8rem', color: 'var(--gold)', borderBottom: '1px solid var(--gold-dim)', width: '50%' }}>사이즈</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '0.8rem', color: 'var(--gold)', borderBottom: '1px solid var(--gold-dim)', width: '40%' }}>수량 (벌)</th>
                      <th style={{ width: '10%', borderBottom: '1px solid var(--gold-dim)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editForm.sizes || '').split(',').map((size, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            type="text"
                            value={size.trim()}
                            onChange={(e) => {
                              const parts = (editForm.sizes || '').split(',').map(s => s.trim());
                              const oldSize = parts[idx];
                              parts[idx] = e.target.value;
                              const newStock = { ...(editForm.sizeStock || {}) };
                              if (oldSize && oldSize !== e.target.value) {
                                newStock[e.target.value] = newStock[oldSize] || 0;
                                delete newStock[oldSize];
                              }
                              setEditForm(prev => ({ ...prev, sizes: parts.join(', '), sizeStock: newStock }));
                            }}
                            placeholder="예: M"
                            style={{
                              width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg)',
                              color: 'var(--text)', border: '1px solid var(--gold-dim)',
                              boxSizing: 'border-box', fontSize: '0.85rem',
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editForm.sizeStock?.[size.trim()] || ''}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              sizeStock: { ...(prev.sizeStock || {}), [size.trim()]: parseInt(e.target.value) || 0 },
                            }))}
                            style={{
                              width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg)',
                              color: 'var(--text)', border: '1px solid var(--gold-dim)',
                              boxSizing: 'border-box', textAlign: 'center', fontSize: '0.85rem',
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              const parts = (editForm.sizes || '').split(',');
                              const removed = parts[idx]?.trim();
                              parts.splice(idx, 1);
                              const newStock = { ...(editForm.sizeStock || {}) };
                              if (removed) delete newStock[removed];
                              setEditForm(prev => ({ ...prev, sizes: parts.join(','), sizeStock: newStock }));
                            }}
                            style={{
                              background: 'transparent', border: 'none', color: '#e85d5d',
                              cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', lineHeight: 1,
                            }}
                            title="삭제"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(editForm.sizes || '').split(',').length < 6 && (
                  <button
                    onClick={() => {
                      const current = editForm.sizes || '';
                      const newSizes = current ? current + ',' : ',';
                      setEditForm(prev => ({ ...prev, sizes: newSizes }));
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'transparent', border: '1px dashed var(--gold-dim)',
                      color: 'var(--gold)', padding: '6px 14px', cursor: 'pointer',
                      fontSize: '0.8rem', fontFamily: 'var(--font-serif)', width: '100%',
                      justifyContent: 'center', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                  >
                    + 사이즈 추가 ({(editForm.sizes || '').split(',').length}/6)
                  </button>
                )}
                {editFormErrors.sizes && (
                  <span style={{ fontSize: '0.75rem', color: '#e85d5d', marginTop: '0.25rem', display: 'block' }}>
                    {editFormErrors.sizes}
                  </span>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  색상
                </label>
                <input
                  type="text"
                  placeholder="검정, 흰색, 금색 등"
                  value={editForm.color || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, color: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  대여 가격 (원)
                </label>
                <input
                  type="number"
                  value={editForm.price || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                  이미지 파일 <span style={{ color: '#e85d5d' }}>*</span>
                </label>
                <DragDropImageUpload
                  label=""
                  previewUrl={imagePreview || (editTarget && editTarget.image)}
                  onFileSelect={(file) => {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    if (editFormErrors.image) {
                      setEditFormErrors(prev => {
                        const updated = { ...prev };
                        delete updated.image;
                        return updated;
                      });
                    }
                  }}
                />
                {editFormErrors.image && (
                  <span style={{ fontSize: '0.75rem', color: '#e85d5d', marginTop: '0.25rem', display: 'block' }}>
                    {editFormErrors.image}
                  </span>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted)',
                  }}
                >
                  설명
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--gold-dim)',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
              }}
            >
              <button
                onClick={handleEditDress}
                disabled={Object.keys(editFormErrors).length > 0 || uploading}
                style={{
                  flex: 1,
                  backgroundColor: Object.keys(editFormErrors).length > 0 || uploading ? 'rgba(212,175,55,0.5)' : 'var(--gold)',
                  color: 'var(--bg)',
                  border: 'none',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: Object.keys(editFormErrors).length > 0 || uploading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.3s',
                }}
                onMouseEnter={(e) => Object.keys(editFormErrors).length === 0 && !uploading && (e.target.style.opacity = '0.8')}
                onMouseLeave={(e) => Object.keys(editFormErrors).length === 0 && !uploading && (e.target.style.opacity = '1')}
              >
                {uploading ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setEditTarget(null);
                  setEditForm({});
                  setImageFile(null);
                  setImagePreview('');
                  setCurrentImageIndex(0);
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  color: 'var(--gold)',
                  border: '1px solid var(--gold)',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--gold)';
                  e.target.style.color = 'var(--bg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--gold)';
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 예약 확정/거절 확인 모달 ── */}
      {bookingActionConfirm && (() => {
        const booking = bookingActionConfirm.booking;
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }} onClick={() => setBookingActionConfirm(null)}>
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              maxWidth: 400, width: '100%', padding: '32px 28px',
            }} onClick={(e) => e.stopPropagation()}>
              <Corners />
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 16,
                marginBottom: 20, color: 'var(--text)', textAlign: 'center',
              }}>
                {bookingActionConfirm.action === 'confirm'
                  ? (lang === 'ko' ? '이 예약을 확정하시겠습니까?' : 'Confirm this booking?')
                  : (lang === 'ko' ? '이 예약을 거절하시겠습니까?' : 'Reject this booking?')
                }
              </div>

              {/* 예약 상세 정보 */}
              {booking && (
                <div style={{
                  backgroundColor: 'rgba(232,160,32,0.08)',
                  border: '1px solid var(--gold-dim)',
                  padding: '14px 12px',
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: 1.8,
                }}>
                  <div style={{ color: 'var(--text)', marginBottom: 6 }}>
                    <strong>{lang === 'ko' ? '고객' : 'Customer'}:</strong> {booking.customer}
                  </div>
                  {booking.itemName && (
                    <div style={{ color: 'var(--text)', marginBottom: 6 }}>
                      <strong>{lang === 'ko' ? '상품명' : 'Item'}:</strong> {booking.itemName}
                    </div>
                  )}
                  {booking.date && (
                    <div style={{ color: 'var(--text)' }}>
                      <strong>{lang === 'ko' ? '예약일시' : 'Date'}:</strong> {booking.date} {booking.hours ? `(${booking.hours})` : ''}
                    </div>
                  )}
                </div>
              )}

              <div style={{
                fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 24,
              }}>
                {bookingActionConfirm.action === 'confirm'
                  ? (lang === 'ko' ? '확정 후 고객에게 알림이 전송됩니다.' : 'The customer will be notified.')
                  : (lang === 'ko' ? '거절 후에는 되돌릴 수 없습니다.' : 'This action cannot be undone.')
                }
              </div>

              {/* 예약 거절 시 환불 경고 */}
              {bookingActionConfirm.action === 'reject' && (
                <div style={{
                  backgroundColor: 'rgba(232,85,85,0.15)',
                  border: '1px solid rgba(232,85,85,0.3)',
                  padding: '12px 12px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: '#e85d5d',
                  borderRadius: '2px',
                  lineHeight: 1.6,
                }}>
                  ⚠ {lang === 'ko' ? '예약 거절 시 고객에게 자동으로 전액 환불됩니다' : 'The customer will receive a full refund if this booking is rejected'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setBookingActionConfirm(null)}
                  style={{
                    flex: 1, padding: '12px 0', background: 'transparent',
                    border: '1px solid var(--border)', color: 'var(--muted)',
                    fontFamily: 'var(--font-serif)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {lang === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={executeBookingAction}
                  style={{
                    flex: 1, padding: '12px 0', border: 'none',
                    fontFamily: 'var(--font-serif)', fontSize: 13, cursor: 'pointer',
                    background: bookingActionConfirm.action === 'confirm' ? 'var(--gold)' : '#e85d5d',
                    color: bookingActionConfirm.action === 'confirm' ? '#0B0B0B' : '#fff',
                  }}
                >
                  {bookingActionConfirm.action === 'confirm'
                    ? (lang === 'ko' ? '확정' : 'Confirm')
                    : (lang === 'ko' ? '거절' : 'Reject')
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default VendorDashboard;
