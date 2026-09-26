import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { fmt } from '../data/photographers';
import { getMergedProfile } from '../data/artistProfile';
import { getTagLabel } from '../data/tagRegistry';
import UnifiedReviewModal from '../components/UnifiedReviewModal';
import CarbonFootprint from '../components/CarbonFootprint';
import ReferralCard from '../components/ReferralCard';
import PointsCard from '../components/PointsCard';
import { getSupabase, fetchPhotographers } from '../lib/supabase';

// ─── Customer Dashboard (/my) ─────────────────────────────────────────
// 고객 전용 대시보드: 즐겨찾기, 예약, 리뷰, 쿠폰, 프로필, 설정

// ─── i18n ──────────────────────────────────────────────────────────────
const L = {
  ko: {
    title: '마이 페이지',
    tabs: {
      overview: '홈',
      monitor: '예약 모니터링',
      bookings: '예약 내역',
      favorites: '즐겨찾기',
      reviews: '내 리뷰',
      coupons: '쿠폰',
      profile: '내 정보',
      settings: '설정',
    },
    // overview
    greeting: '님, 안녕하세요!',
    upcomingTitle: '다가오는 촬영',
    noUpcoming: '예정된 촬영이 없습니다.',
    browseArtists: '작가 찾아보기 →',
    quickLinks: '빠른 메뉴',
    recentReviews: '최근 리뷰',
    // bookings
    bookingsTitle: '예약 및 결제 내역',
    bookingsSub: '모든 예약과 결제 기록을 확인하세요.',
    noBookings: '아직 예약 내역이 없습니다.',
    statuses: {
      confirmed: '확정',
      pending: '대기',
      completed: '완료',
      cancelled: '취소',
      refunded: '환불',
      delivered: '전달 완료',
    },
    artist: '작가',
    date: '촬영일',
    pkg: '패키지',
    amount: '결제 금액',
    status: '상태',
    viewDetail: '상세 보기',
    // monitoring
    monitorTitle: '예약 모니터링',
    monitorSub: '예약 구성 요소(작가·스타일리스트·의상·장소)의 현황을 한눈에 확인하세요.',
    pipelineArtist: '📸 촬영 작가',
    pipelineStylist: '💇 헤어메이크업',
    pipelineCostume: '👗 의상',
    pipelineVenue: '📍 촬영 장소',
    pipelineNotBooked: '미선택',
    pipelineStatus: {
      confirmed: '확정',
      reserved: '예약됨',
      pending: '대기중',
      completed: '완료',
      returned: '반납완료',
      cancelled: '취소',
    },
    pickupDate: '수령일',
    returnDate: '반납일',
    contactInfo: '연락처',
    // favorites
    favTitle: '즐겨찾기한 작가',
    favSub: '관심있는 작가를 한눈에 모아보세요.',
    noFav: '아직 즐겨찾기한 작가가 없습니다.',
    removeFav: '삭제',
    // reviews
    reviewTitle: '내가 작성한 리뷰',
    reviewSub: '작성한 리뷰를 관리하세요.',
    noReviews: '작성한 리뷰가 없습니다.',
    deleteReview: '삭제',
    deleteReviewConfirm: '이 리뷰를 삭제할까요? 되돌릴 수 없습니다.',
    deleteReviewDone: '리뷰를 삭제했습니다.',
    deleteReviewFail: '리뷰 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.',
    // coupons
    couponTitle: '쿠폰함',
    couponSub: '사용 가능한 쿠폰을 확인하세요.',
    noCoupons: '보유한 쿠폰이 없습니다.',
    couponExpiry: '유효기간',
    couponUsed: '사용 완료',
    couponAvailable: '사용 가능',
    couponExpired: '만료',
    // profile
    profileTitle: '내 정보',
    profileSub: '개인정보를 확인하고 수정하세요.',
    nameLabel: '이름',
    emailLabel: '이메일',
    phoneLabel: '휴대폰',
    birthdateLabel: '생년월일',
    saveProfile: '저장',
    profileSaved: '저장되었습니다.',
    // settings
    settingsTitle: '설정',
    paymentMethods: '결제 수단 관리',
    noPaymentMethods: '등록된 결제 수단이 없습니다.',
    addPayment: '+ 결제 수단 추가',
    notifications: '알림 설정',
    notiBooking: '예약 관련 알림',
    notiMarketing: '마케팅 알림',
    notiChat: '채팅 알림',
    deleteAccount: '회원 탈퇴',
    // '모든 데이터가 삭제된다' 고 적혀 있었다. 사실이 아니다 — 거래 기록은
    // 법령상 보관 의무가 있어 지울 수 없고, 그전에 탈퇴 자체가 구현돼
    // 있지 않았다. 실제로 하는 일만 적는다.
    deleteAccountDesc: '계정과 개인정보를 삭제합니다. 거래 기록은 법령에 따라 일정 기간 보관됩니다.',
    deleteAccountBtn: '회원 탈퇴 문의하기',
    deleteConfirm: '정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  },
  en: {
    title: 'My Page',
    tabs: {
      overview: 'Home',
      monitor: 'Booking Monitor',
      bookings: 'Bookings',
      favorites: 'Favorites',
      reviews: 'My Reviews',
      coupons: 'Coupons',
      profile: 'Profile',
      settings: 'Settings',
    },
    greeting: ', welcome back!',
    upcomingTitle: 'Upcoming Sessions',
    noUpcoming: 'No upcoming sessions.',
    browseArtists: 'Browse Artists →',
    quickLinks: 'Quick Menu',
    recentReviews: 'Recent Reviews',
    bookingsTitle: 'Bookings & Payments',
    bookingsSub: 'View all your bookings and payment history.',
    noBookings: 'No bookings yet.',
    statuses: {
      confirmed: 'Confirmed',
      pending: 'Pending',
      completed: 'Completed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      delivered: 'Delivered',
    },
    artist: 'Artist',
    date: 'Date',
    pkg: 'Package',
    amount: 'Amount',
    status: 'Status',
    viewDetail: 'Details',
    monitorTitle: 'Booking Monitor',
    monitorSub:
      'Track the status of all components — artist, stylist, costume, and venue — at a glance.',
    pipelineArtist: '📸 Photographer',
    pipelineStylist: '💇 Hair & Makeup',
    pipelineCostume: '👗 Costume',
    pipelineVenue: '📍 Venue',
    pipelineNotBooked: 'Not Selected',
    pipelineStatus: {
      confirmed: 'Confirmed',
      reserved: 'Reserved',
      pending: 'Pending',
      completed: 'Completed',
      returned: 'Returned',
      cancelled: 'Cancelled',
    },
    pickupDate: 'Pickup',
    returnDate: 'Return',
    contactInfo: 'Contact',
    favTitle: 'Favorite Artists',
    favSub: 'View your saved artists.',
    noFav: 'No favorite artists yet.',
    removeFav: 'Remove',
    reviewTitle: 'My Reviews',
    reviewSub: 'Manage your reviews.',
    noReviews: 'No reviews written yet.',
    deleteReview: 'Delete',
    deleteReviewConfirm: 'Delete this review? This cannot be undone.',
    deleteReviewDone: 'Review deleted.',
    deleteReviewFail: 'Could not delete the review. Please try again.',
    couponTitle: 'Coupons',
    couponSub: 'Check your available coupons.',
    noCoupons: 'No coupons available.',
    couponExpiry: 'Expires',
    couponUsed: 'Used',
    couponAvailable: 'Available',
    couponExpired: 'Expired',
    profileTitle: 'My Profile',
    profileSub: 'View and edit your personal information.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    birthdateLabel: 'Date of Birth',
    saveProfile: 'Save',
    profileSaved: 'Saved successfully.',
    settingsTitle: 'Settings',
    paymentMethods: 'Payment Methods',
    noPaymentMethods: 'No payment methods registered.',
    addPayment: '+ Add Payment Method',
    notifications: 'Notifications',
    notiBooking: 'Booking notifications',
    notiMarketing: 'Marketing emails',
    notiChat: 'Chat notifications',
    deleteAccount: 'Delete Account',
    deleteAccountDesc:
      'Your account and personal details are removed. Transaction records are retained as required by law.',
    deleteAccountBtn: 'Request Account Deletion',
    deleteConfirm: 'Are you sure? This action cannot be undone.',
  },
};

// ─── Style Constants ──────────────────────────────────────────────────
const sectionStyle = {
  background: 'var(--ink-a03)',
  border: '1px solid var(--border)',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};
const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1px solid var(--border)',
  background: 'var(--ink-a03)',
  color: 'var(--text)',
  fontFamily: 'var(--font-serif)',
  fontSize: '0.9rem',
};
const goldBtn = {
  padding: '0.6rem 1.5rem',
  background: 'var(--gold)',
  color: 'var(--on-accent)',
  border: 'none',
  fontFamily: 'var(--font-serif)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  letterSpacing: '0.06em',
  transition: 'opacity 0.3s',
};
const ghostBtn = {
  padding: '0.5rem 1rem',
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  fontFamily: 'var(--font-serif)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
// 상태 색. 예전 값은 Tailwind 400 계열(어두운 화면용)이라 종이 바탕에서
// '확정' 이 1.7:1 이었다 — 글자가 거의 안 보였다.
const statusColors = {
  confirmed: 'var(--success)',
  pending: 'var(--gold)',
  completed: 'var(--info)',
  cancelled: 'var(--danger)',
  refunded: 'var(--warning)',
  delivered: 'var(--grade-4)',
};

// ─── 예약 구성 요소 ───────────────────────────────────────────────────
// '예약 모니터링' 탭은 작가·헤메·의상·장소가 각각 어디까지 왔는지 보여준다.
// 예전에는 pipeline 을 null 로 두었기 때문에, 확정 예약이 세 건 있어도
// '현재 모니터링할 예약이 없습니다' 가 뜨고 '작가 찾아보기' 버튼이 나왔다.
// 이미 예약한 사람에게 예약하라고 하는 화면이었다.
//
// 구성 요소는 booking_items 에 있다. 아직 안 고른 항목은 null 로 두면
// 화면이 '미선택' 으로 그린다 — 그게 사실이다.
const hhmm = (ts) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const buildPipeline = (b) => {
  const items = Array.isArray(b.booking_items) ? b.booking_items : [];
  const pick = (type) => items.find((it) => it.provider_type === type) || null;

  const photographer = pick('photographer');
  const stylist = pick('stylist');
  const dress = pick('dress');
  const venue = pick('venue');

  return {
    // 작가는 예약의 뼈대라 항목이 없어도 예약 자체에서 채운다.
    artist: {
      name: photographer?.provider_name || b.photographer_name || '작가',
      status: photographer?.status || b.status,
    },
    stylist: stylist && {
      name: stylist.provider_name,
      specialty: stylist.item_name,
      status: stylist.status,
    },
    costume: dress && {
      vendor: dress.provider_name,
      item: [dress.item_name, dress.item_option].filter(Boolean).join(' · '),
      status: dress.status,
      pickupDate: dress.start_at ? String(dress.start_at).slice(0, 10) : null,
      returnDate: dress.end_at ? String(dress.end_at).slice(0, 10) : null,
    },
    venue: venue && {
      name: venue.provider_name,
      status: venue.status,
      time: venue.start_at && venue.end_at ? `${hhmm(venue.start_at)}-${hhmm(venue.end_at)}` : '',
    },
  };
};

// ─── Component ────────────────────────────────────────────────────────
const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  // logout 은 탈퇴 버튼이 쓰던 것이다. 그 버튼이 실제로는 로그아웃만 하고
  // 계정을 안 지웠던 게 문제라 문의 안내로 바꿨고, 여기서도 뺐다.
  const { user, userName } = useAuth();
  const m = L[lang] || L.ko;

  const [activeTab, setActiveTab] = useState('overview');
  const [bookingFilter, setBookingFilter] = useState('all');

  // Favorite artists (localStorage for now)
  const [favArtistIds, setFavArtistIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('phosnap_fav_artists') || '[]');
    } catch {
      return [];
    }
  });
  // 찜한 작가는 DB 에서 가져온다.
  //
  // 예전에는 mock PHOTOGRAPHERS 에서 찾았다. 실제로 등록된 작가를
  // 찜하면 id 가 목록에 없으니 **찜 목록에 영영 안 나타났다.**
  // 화면은 "찜한 작가가 없습니다" 라고 멀쩡히 말했다. (규칙 5-18)
  const [allArtists, setAllArtists] = useState([]);
  useEffect(() => {
    if (!favArtistIds.length) {
      setAllArtists([]);
      return undefined;
    }
    let dead = false;
    fetchPhotographers({ limit: 500 }).then(({ data }) => {
      if (!dead) setAllArtists(data || []);
    });
    return () => {
      dead = true;
    };
  }, [favArtistIds.length]);

  const favArtists = useMemo(
    () =>
      allArtists
        .filter((p) => favArtistIds.includes(p.id))
        .map((p) => getMergedProfile(p, 'photographer', p.id)),
    [allArtists, favArtistIds]
  );
  const removeFav = (id) => {
    const next = favArtistIds.filter((fid) => fid !== id);
    setFavArtistIds(next);
    localStorage.setItem('phosnap_fav_artists', JSON.stringify(next));
  };

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: userName || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    birthdate: user?.user_metadata?.birthdate || '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const handleSaveProfile = async () => {
    // TODO: Supabase upsertProfile
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  // Notifications
  const [notiSettings, setNotiSettings] = useState({ booking: true, marketing: false, chat: true });

  // 비밀번호 변경
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 통합 리뷰 모달
  const [reviewBooking, setReviewBooking] = useState(null);
  // 예약 상세 모달
  const [detailBooking, setDetailBooking] = useState(null);
  // 완료 예약 접기/펴기
  const [expandedBookings, setExpandedBookings] = useState({});
  // 토스트 메시지
  const [toastMsg, setToastMsg] = useState('');

  // ── 예약 내역: Supabase 에서 로드 ──
  // 예전에는 MOCK_BOOKINGS(김서윤·Sakura Tanaka·이준호)를 그대로 썼기 때문에
  // 고객이 실제로 한 예약을 마이페이지에서 확인할 수 없었다.
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getMyBookings } = await import('../lib/supabase');
        const { data } = await getMyBookings();
        if (cancelled) return;
        setBookings(
          (data || []).map((b) => ({
            id: b.id,
            artistId: b.photographer_id,
            artistName: b.photographer_name || '작가',
            date: b.date,
            time: b.time,
            pkg: b.package_name,
            amount: b.total_price ?? b.package_price ?? 0,
            status: b.status,
            paidAt: b.paid_at ? String(b.paid_at).slice(0, 10) : null,
            pipeline: buildPipeline(b),
            raw: b,
          }))
        );
      } catch (e) {
        console.error('[CustomerDashboard] 예약 조회 실패:', e);
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 내가 쓴 리뷰 ──
  // 예전에는 MOCK_REVIEWS(Sakura Tanaka 교토 후기) 한 건이 모든 고객에게
  // 똑같이 보였다. 쓴 적 없는 리뷰가 '내가 작성한 리뷰' 에 있었다는 뜻이다.
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getMyReviews } = await import('../lib/supabase');
        const { data } = await getMyReviews();
        if (cancelled) return;
        setReviews(
          (data || []).map((r) => ({
            id: r.id,
            bookingId: r.booking_id,
            rating: r.rating,
            text: r.body || r.title || '',
            createdAt: r.created_at ? String(r.created_at).slice(0, 10) : '',
          }))
        );
      } catch (e) {
        console.error('[CustomerDashboard] 리뷰 조회 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 작가 이름은 예약 목록에서 붙인다. 리뷰는 예약당 하나라 booking_id 로 맞는다.
  const reviewsWithArtist = useMemo(
    () =>
      reviews.map((r) => ({
        ...r,
        artistName: bookings.find((b) => b.id === r.bookingId)?.artistName || '작가',
      })),
    [reviews, bookings]
  );

  const handleDeleteReview = async (reviewId) => {
    // 되돌릴 수 없으니 한 번 묻는다.
    if (!window.confirm(m.deleteReviewConfirm)) return;
    const { deleteMyReview } = await import('../lib/supabase');
    const { error } = await deleteMyReview(reviewId);
    if (error) {
      setToastMsg(m.deleteReviewFail);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setToastMsg(m.deleteReviewDone);
  };

  // 쿠폰 기능은 아직 DB 에 없다. 테이블도 발급 경로도 없는 상태에서
  // '첫 예약 10% 할인' 을 보여주면 고객은 쓸 수 있는 줄 안다.
  // 빈 쿠폰함이 없는 쿠폰보다 낫다.
  const coupons = [];

  // 승인 대기(pending) 예약도 '다가오는 촬영'에 포함한다.
  // 확정 전이라고 숨기면 고객이 자기 예약 요청을 어디서도 볼 수 없다.
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const upcomingBookings = bookings.filter(
    (b) => ['confirmed', 'pending'].includes(b.status) && new Date(b.date) >= today0
  );

  // ─── Tab config ────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', icon: '🏠', label: m.tabs.overview },
    { id: 'monitor', icon: '📊', label: m.tabs.monitor },
    { id: 'bookings', icon: '📋', label: m.tabs.bookings },
    { id: 'favorites', icon: '❤️', label: m.tabs.favorites },
    { id: 'reviews', icon: '✍️', label: m.tabs.reviews },
    { id: 'coupons', icon: '🎟️', label: m.tabs.coupons },
    { id: 'profile', icon: '👤', label: m.tabs.profile },
    { id: 'settings', icon: '⚙️', label: m.tabs.settings },
  ];

  return (
    <div className="page-enter" style={{ paddingTop: 100, minHeight: '100dvh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: 10,
              color: 'var(--gold)',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            MY PAGE
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.6rem',
              color: 'var(--text)',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {m.title}
          </h1>
        </div>

        {/* ── Layout: Sidebar + Content ── */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          {/* Sidebar tabs */}
          <div
            style={{
              width: 200,
              flexShrink: 0,
              border: '1px solid var(--border)',
              background: 'var(--ink-a03)',
              position: 'sticky',
              top: 80,
            }}
          >
            {tabs.map((tab) => {
              const pendingCount = bookings.filter((b) => b.status === 'pending').length;
              const hasBadge =
                tab.id === 'bookings' && pendingCount > 0 && activeTab !== 'bookings';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.85rem 1.1rem',
                    border: 'none',
                    borderLeft: `3px solid ${activeTab === tab.id ? 'var(--gold)' : 'transparent'}`,
                    background: activeTab === tab.id ? 'rgba(212,175,55,0.08)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--gold)' : 'var(--muted)',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    letterSpacing: '0.03em',
                    position: 'relative',
                  }}
                >
                  {/* 이모지를 뺐다. 여덟 개가 세로로 늘어서면 라벨보다
                      그림이 먼저 읽혀 오히려 훑기 어렵다. 글자만으로
                      충분히 구분된다 — 홈·예약 내역·즐겨찾기처럼. */}
                  {tab.label}
                  {hasBadge && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--danger)',
                        marginLeft: 'auto',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* ════════════════ Overview ════════════════ */}
            {activeTab === 'overview' && (
              <>
                {/* Greeting */}
                <div
                  style={{
                    ...sectionStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.2rem',
                        color: 'var(--gold)',
                        margin: '0 0 0.3rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {userName?.split(' ')[0] || 'Guest'}
                      {m.greeting}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
                      {user?.email}
                    </p>
                  </div>
                  <button style={goldBtn} onClick={() => navigate('/photographers')}>
                    {m.browseArtists}
                  </button>
                </div>

                {/* Points & Membership Card */}
                <PointsCard userId={user?.id} />

                {/* Upcoming */}
                <div style={sectionStyle}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1rem',
                      color: 'var(--text)',
                      margin: '0 0 1rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    📸 {m.upcomingTitle}
                  </h3>
                  {upcomingBookings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {upcomingBookings.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            background: 'rgba(212,175,55,0.05)',
                            borderLeft: '3px solid var(--gold)',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: 'var(--text)',
                                fontFamily: 'var(--font-serif)',
                              }}
                            >
                              {b.artistName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                              {b.date} · {b.time} · {b.pkg}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: statusColors[b.status],
                              fontFamily: 'var(--font-serif)',
                            }}
                          >
                            {m.statuses[b.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                      {m.noUpcoming}
                    </p>
                  )}
                </div>

                {/* Stats summary */}
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}
                >
                  {[
                    {
                      label: lang === 'ko' ? '총 예약' : 'Bookings',
                      value: bookings.length,
                      icon: '📋',
                    },
                    {
                      label: lang === 'ko' ? '즐겨찾기' : 'Favorites',
                      value: favArtistIds.length,
                      icon: '❤️',
                    },
                    {
                      label: lang === 'ko' ? '작성 리뷰' : 'Reviews',
                      value: reviews.length,
                      icon: '✍️',
                    },
                    {
                      label: lang === 'ko' ? '보유 쿠폰' : 'Coupons',
                      value: coupons.filter((c) => c.status === 'available').length,
                      icon: '🎟️',
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{ ...sectionStyle, textAlign: 'center', padding: '1.2rem 0.5rem' }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
                      <div
                        style={{
                          fontSize: '1.3rem',
                          color: 'var(--gold)',
                          fontFamily: 'var(--font-serif)',
                          fontWeight: 600,
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 나의 친환경 스냅 지수 */}
                <CarbonFootprint mode="dashboard" bookings={bookings || []} />

                {/* 추천 코드 및 혜택 */}
                <ReferralCard userId={user?.id} role="customer" />
              </>
            )}

            {/* ════════════════ Booking Monitor ════════════════ */}
            {activeTab === 'monitor' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.monitorTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.5rem' }}>
                  {m.monitorSub}
                </p>

                {bookings.filter(
                  (b) => b.pipeline && (b.status === 'confirmed' || b.status === 'pending')
                ).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {bookings
                      .filter(
                        (b) => b.pipeline && (b.status === 'confirmed' || b.status === 'pending')
                      )
                      .map((b) => {
                        const pl = b.pipeline;
                        const pipelineStatusColor = (s) =>
                          ({
                            confirmed: 'var(--success)',
                            reserved: 'var(--gold)',
                            pending: 'var(--warning)',
                            completed: '#60a5fa',
                            returned: '#a78bfa',
                            cancelled: 'var(--danger)',
                          })[s] || 'var(--muted)';

                        const PipelineCard = ({ icon, title, data, type }) => {
                          if (!data)
                            return (
                              <div
                                style={{
                                  padding: '1rem',
                                  background: 'var(--ink-a03)',
                                  border: '1px dashed var(--border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: 80,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--muted)',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  {title} — {m.pipelineNotBooked}
                                </span>
                              </div>
                            );
                          return (
                            <div
                              style={{
                                padding: '1rem',
                                background: 'var(--ink-a03)',
                                border: '1px solid var(--border)',
                                borderLeft: `3px solid ${pipelineStatusColor(data.status)}`,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.85rem',
                                  alignItems: 'flex-start',
                                }}
                              >
                                {data.img && (
                                  <div
                                    style={{
                                      width: 56,
                                      height: 56,
                                      borderRadius: type === 'costume' ? 4 : '50%',
                                      backgroundImage: `url(${data.img})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      flexShrink: 0,
                                      border: '1px solid var(--border)',
                                    }}
                                  />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      marginBottom: '0.3rem',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '0.9rem',
                                        color: 'var(--text)',
                                      }}
                                    >
                                      {type === 'costume'
                                        ? data.vendor || data.item
                                        : data.name || data.vendor}
                                    </span>
                                    <span
                                      style={{
                                        padding: '1px 7px',
                                        fontSize: '0.65rem',
                                        background: `${pipelineStatusColor(data.status)}18`,
                                        color: pipelineStatusColor(data.status),
                                        border: `1px solid ${pipelineStatusColor(data.status)}40`,
                                        fontFamily: 'var(--font-serif)',
                                      }}
                                    >
                                      {m.pipelineStatus[data.status] || data.status}
                                    </span>
                                  </div>
                                  {/* Type-specific details */}
                                  <div
                                    style={{
                                      fontSize: '0.78rem',
                                      color: 'var(--muted)',
                                      lineHeight: 1.8,
                                    }}
                                  >
                                    {type === 'artist' && (
                                      <>
                                        {data.location && <span>📍 {data.location}</span>}
                                        {data.contact && (
                                          <span style={{ marginLeft: 12 }}>✉️ {data.contact}</span>
                                        )}
                                      </>
                                    )}
                                    {type === 'stylist' && (
                                      <>
                                        {data.specialty && <span>✨ {data.specialty}</span>}
                                        {data.contact && (
                                          <span style={{ marginLeft: 12 }}>✉️ {data.contact}</span>
                                        )}
                                      </>
                                    )}
                                    {type === 'costume' && (
                                      <>
                                        {data.item && <div>🏷️ {data.item}</div>}
                                        {data.pickupDate && (
                                          <span>
                                            {m.pickupDate}: {data.pickupDate}
                                          </span>
                                        )}
                                        {data.returnDate && (
                                          <span style={{ marginLeft: 12 }}>
                                            {m.returnDate}: {data.returnDate}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {type === 'venue' && (
                                      <>
                                        {data.address && <div>🗺️ {data.address}</div>}
                                        {data.time && <span>🕐 {data.time}</span>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        };

                        // Overall progress: count confirmed items
                        const items = [pl.artist, pl.stylist, pl.costume, pl.venue];
                        const total = items.filter(Boolean).length;
                        const confirmed = items.filter(
                          (i) => i && (i.status === 'confirmed' || i.status === 'reserved')
                        ).length;

                        return (
                          <div key={b.id} style={sectionStyle}>
                            {/* Booking header */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '1rem',
                                    color: 'var(--gold)',
                                    letterSpacing: '0.03em',
                                  }}
                                >
                                  {b.date} · {b.time}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--muted)',
                                    marginTop: 2,
                                  }}
                                >
                                  {b.pkg} · ₩{fmt(b.amount)}
                                </div>
                              </div>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                              >
                                {/* Mini progress bar */}
                                <div style={{ display: 'flex', gap: 3 }}>
                                  {items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        width: 20,
                                        height: 4,
                                        borderRadius: 2,
                                        background: !item
                                          ? 'var(--border)'
                                          : item.status === 'confirmed' ||
                                              item.status === 'reserved'
                                            ? 'var(--success)'
                                            : item.status === 'pending'
                                              ? 'var(--gold)'
                                              : 'var(--border)',
                                      }}
                                    />
                                  ))}
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--muted)',
                                    fontFamily: 'var(--font-serif)',
                                  }}
                                >
                                  {confirmed}/{total}
                                </span>
                              </div>
                            </div>

                            {/* Pipeline cards */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '0.75rem',
                              }}
                            >
                              <PipelineCard
                                icon="📸"
                                title={m.pipelineArtist}
                                data={pl.artist}
                                type="artist"
                              />
                              <PipelineCard
                                icon="💇"
                                title={m.pipelineStylist}
                                data={pl.stylist}
                                type="stylist"
                              />
                              <PipelineCard
                                icon="👗"
                                title={m.pipelineCostume}
                                data={pl.costume}
                                type="costume"
                              />
                              <PipelineCard
                                icon="📍"
                                title={m.pipelineVenue}
                                data={pl.venue}
                                type="venue"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ ...sectionStyle, textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                      {lang === 'ko'
                        ? '현재 모니터링할 예약이 없습니다.'
                        : 'No active bookings to monitor.'}
                    </p>
                    <button
                      style={{ ...goldBtn, marginTop: '1rem' }}
                      onClick={() => navigate('/photographers')}
                    >
                      {m.browseArtists}
                    </button>
                  </div>
                )}

                {/* Completed bookings summary */}
                {bookings.filter((b) => b.pipeline && b.status === 'completed').length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.9rem',
                        color: 'var(--muted)',
                        margin: '0 0 1rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {lang === 'ko' ? '완료된 예약' : 'Completed Bookings'}
                    </h3>
                    {bookings
                      .filter((b) => b.pipeline && b.status === 'completed')
                      .map((b) => (
                        <div key={b.id} style={{ ...sectionStyle, opacity: 0.6, padding: '1rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '0.9rem',
                                  color: 'var(--text)',
                                }}
                              >
                                {b.artistName}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--muted)',
                                  marginLeft: '0.75rem',
                                }}
                              >
                                {b.date}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--info)',
                                fontFamily: 'var(--font-serif)',
                              }}
                            >
                              {m.statuses.completed} ✓
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════ Bookings ════════════════ */}
            {activeTab === 'bookings' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.bookingsTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.5rem' }}>
                  {m.bookingsSub}
                </p>

                {bookings.length > 0 ? (
                  <>
                    {/* Filter tabs */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((f) => {
                        const isActive = bookingFilter === f;
                        return (
                          <button
                            key={f}
                            onClick={() => setBookingFilter(f)}
                            style={{
                              ...ghostBtn,
                              fontSize: '0.78rem',
                              padding: '0.4rem 0.8rem',
                              borderColor: isActive ? 'var(--gold)' : 'var(--border)',
                              color: isActive ? 'var(--gold)' : 'var(--muted)',
                              background: isActive ? 'var(--accent-a08)' : 'transparent',
                            }}
                          >
                            {f === 'all' ? (lang === 'ko' ? '전체' : 'All') : m.statuses[f]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Booking cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {bookings
                        .filter((b) => bookingFilter === 'all' || b.status === bookingFilter)
                        .map((b) => {
                          const isExpanded = !!expandedBookings[b.id];
                          const isCompleted = b.status === 'completed';
                          return (
                            <div key={b.id} style={{ ...sectionStyle }}>
                              {/* 상단: 기본 정보 + 버튼 */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '1rem',
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem',
                                      marginBottom: '0.4rem',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '0.95rem',
                                        color: 'var(--text)',
                                      }}
                                    >
                                      {b.artistName}
                                    </span>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        fontSize: '0.7rem',
                                        background: `${statusColors[b.status]}18`,
                                        color: statusColors[b.status],
                                        border: `1px solid ${statusColors[b.status]}40`,
                                        fontFamily: 'var(--font-serif)',
                                      }}
                                    >
                                      {m.statuses[b.status]}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.8rem',
                                      color: 'var(--muted)',
                                      lineHeight: 1.8,
                                    }}
                                  >
                                    {m.date}: {b.date} · {b.time}
                                    <br />
                                    {m.pkg}: {b.pkg}
                                    <br />
                                    {m.amount}: ₩{fmt(b.amount)}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    alignItems: 'stretch',
                                    minWidth: 140,
                                  }}
                                >
                                  <button
                                    onClick={() => setDetailBooking(b)}
                                    style={{ ...goldBtn, width: '100%', textAlign: 'center' }}
                                  >
                                    {m.viewDetail}
                                  </button>
                                  {isCompleted && (
                                    <button
                                      onClick={() => setReviewBooking(b)}
                                      style={{
                                        ...goldBtn,
                                        width: '100%',
                                        textAlign: 'center',
                                        background: 'transparent',
                                        color: 'var(--gold)',
                                        border: '1px solid var(--gold-border)',
                                      }}
                                    >
                                      ✏️{' '}
                                      {lang === 'ko'
                                        ? '리뷰 쓰기'
                                        : lang === 'ja'
                                          ? 'レビューを書く'
                                          : 'Write Review'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 접기/펴기 토글 (pipeline이 있는 경우) */}
                              {b.pipeline && (
                                <>
                                  <button
                                    onClick={() =>
                                      setExpandedBookings((prev) => ({
                                        ...prev,
                                        [b.id]: !prev[b.id],
                                      }))
                                    }
                                    style={{
                                      width: '100%',
                                      marginTop: '0.8rem',
                                      padding: '6px 0',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--muted)',
                                      fontSize: '0.75rem',
                                      fontFamily: 'var(--font-serif)',
                                      letterSpacing: '0.06em',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      borderTop: '1px solid var(--border)',
                                    }}
                                  >
                                    <span
                                      style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        display: 'inline-block',
                                      }}
                                    >
                                      ▼
                                    </span>
                                    {isExpanded
                                      ? lang === 'ko'
                                        ? '접기'
                                        : 'Collapse'
                                      : lang === 'ko'
                                        ? '예약 상세 보기'
                                        : 'View details'}
                                  </button>

                                  {/* Pipeline 카드 (2x2 그리드) */}
                                  {isExpanded && (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                          'repeat(auto-fill, minmax(240px, 1fr))',
                                        gap: '0.75rem',
                                        marginTop: '0.75rem',
                                      }}
                                    >
                                      {[
                                        {
                                          key: 'artist',
                                          icon: '📸',
                                          label: lang === 'ko' ? '작가' : 'Artist',
                                          data: b.pipeline.artist,
                                        },
                                        {
                                          key: 'stylist',
                                          icon: '💇',
                                          label: lang === 'ko' ? '헤어메이크업' : 'H&M',
                                          data: b.pipeline.stylist,
                                        },
                                        {
                                          key: 'costume',
                                          icon: '👗',
                                          label: lang === 'ko' ? '의상 대여' : 'Costume',
                                          data: b.pipeline.costume,
                                        },
                                        {
                                          key: 'venue',
                                          icon: '📍',
                                          label: lang === 'ko' ? '촬영 장소' : 'Venue',
                                          data: b.pipeline.venue,
                                        },
                                      ]
                                        .filter((item) => item.data)
                                        .map((item) => {
                                          const plStatus = item.data.status;
                                          const plColor = statusColors[plStatus] || 'var(--muted)';
                                          return (
                                            <div
                                              key={item.key}
                                              style={{
                                                padding: '0.85rem',
                                                border: '1px solid var(--border)',
                                                background: 'var(--ink-a03)',
                                                display: 'flex',
                                                gap: '0.7rem',
                                                alignItems: 'center',
                                              }}
                                            >
                                              {item.data.img ? (
                                                <img
                                                  src={item.data.img}
                                                  alt=""
                                                  style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    border: '1px solid var(--border)',
                                                  }}
                                                />
                                              ) : (
                                                <div
                                                  style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    background: 'var(--bg2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 18,
                                                  }}
                                                >
                                                  {item.icon}
                                                </div>
                                              )}
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                  style={{
                                                    fontSize: '0.82rem',
                                                    fontFamily: 'var(--font-serif)',
                                                    color: 'var(--text)',
                                                    marginBottom: 2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                  }}
                                                >
                                                  {item.data.name ||
                                                    item.data.vendor ||
                                                    item.data.item}
                                                </div>
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      padding: '1px 6px',
                                                      fontSize: '0.65rem',
                                                      background: `${plColor}18`,
                                                      color: plColor,
                                                      border: `1px solid ${plColor}40`,
                                                      fontFamily: 'var(--font-serif)',
                                                    }}
                                                  >
                                                    {m.statuses[plStatus] || plStatus}
                                                  </span>
                                                </div>
                                                {item.data.contact && (
                                                  <div
                                                    style={{
                                                      fontSize: '0.7rem',
                                                      color: 'var(--muted)',
                                                      marginTop: 2,
                                                    }}
                                                  >
                                                    📧 {item.data.contact}
                                                  </div>
                                                )}
                                                {item.data.specialty && (
                                                  <div
                                                    style={{
                                                      fontSize: '0.7rem',
                                                      color: 'var(--muted)',
                                                      marginTop: 2,
                                                    }}
                                                  >
                                                    ✨ {item.data.specialty}
                                                  </div>
                                                )}
                                                {item.data.address && (
                                                  <div
                                                    style={{
                                                      fontSize: '0.7rem',
                                                      color: 'var(--muted)',
                                                      marginTop: 2,
                                                    }}
                                                  >
                                                    🗺️ {item.data.address}
                                                  </div>
                                                )}
                                                {item.data.pickupDate && (
                                                  <div
                                                    style={{
                                                      fontSize: '0.7rem',
                                                      color: 'var(--muted)',
                                                      marginTop: 2,
                                                    }}
                                                  >
                                                    {lang === 'ko' ? '수령일' : 'Pickup'}:{' '}
                                                    {item.data.pickupDate} ·{' '}
                                                    {lang === 'ko' ? '반납일' : 'Return'}:{' '}
                                                    {item.data.returnDate}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Link to full MyBookings page for detailed actions */}
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                      <Link
                        to="/my-bookings"
                        style={{
                          color: 'var(--gold)',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-serif)',
                          textDecoration: 'none',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {lang === 'ko'
                          ? '예약 상세 관리 (취소·변경·리뷰) →'
                          : 'Manage bookings (cancel, reschedule, review) →'}
                      </Link>
                    </div>
                  </>
                ) : (
                  <div style={{ ...sectionStyle, textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                      {m.noBookings}
                    </p>
                    <button
                      style={{ ...goldBtn, marginTop: '1rem' }}
                      onClick={() => navigate('/photographers')}
                    >
                      {m.browseArtists}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════ Favorites ════════════════ */}
            {activeTab === 'favorites' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.favTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.5rem' }}>
                  {m.favSub}
                </p>

                {favArtists.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    {favArtists.map((p) => {
                      const displayName = lang === 'ko' && p.nameKo ? p.nameKo : p.name;
                      const locationLabel = p.locationNames?.[lang] ?? p.location;
                      return (
                        <div key={p.id} style={{ ...sectionStyle, padding: 0, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: 140,
                              backgroundImage: `url(${p.featuredPortfolio?.[0] || p.img})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <div style={{ padding: '1rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '0.95rem',
                                    color: 'var(--gold)',
                                    letterSpacing: '0.03em',
                                  }}
                                >
                                  {displayName}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--muted)',
                                    marginTop: 2,
                                  }}
                                >
                                  📍 {locationLabel} · ★ {p.rating}
                                </div>
                              </div>
                              <button
                                onClick={() => removeFav(p.id)}
                                style={{
                                  ...ghostBtn,
                                  fontSize: '0.72rem',
                                  padding: '0.3rem 0.6rem',
                                  color: 'var(--danger)',
                                  borderColor: 'var(--danger)40',
                                }}
                              >
                                {m.removeFav}
                              </button>
                            </div>
                            <button
                              onClick={() => navigate(`/photographer/${p.id}`)}
                              style={{
                                ...goldBtn,
                                width: '100%',
                                marginTop: '0.75rem',
                                textAlign: 'center',
                                fontSize: '0.8rem',
                              }}
                            >
                              {lang === 'ko' ? '프로필 보기' : 'View Profile'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ ...sectionStyle, textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❤️</div>
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                      {m.noFav}
                    </p>
                    <button
                      style={{ ...goldBtn, marginTop: '1rem' }}
                      onClick={() => navigate('/photographers')}
                    >
                      {m.browseArtists}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════ Reviews ════════════════ */}
            {activeTab === 'reviews' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.reviewTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.5rem' }}>
                  {m.reviewSub}
                </p>

                {reviewsWithArtist.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviewsWithArtist.map((r) => (
                      <div key={r.id} style={sectionStyle}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontFamily: 'var(--font-serif)',
                                color: 'var(--text)',
                                fontSize: '0.95rem',
                              }}
                            >
                              {r.artistName}
                            </span>
                            <span
                              style={{
                                color: 'var(--gold)',
                                marginLeft: '0.5rem',
                                fontSize: '0.85rem',
                              }}
                            >
                              {'★'.repeat(r.rating)}
                              {'☆'.repeat(5 - r.rating)}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {r.createdAt}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text)',
                            lineHeight: 1.6,
                            margin: '0 0 0.75rem',
                            opacity: 0.85,
                          }}
                        >
                          {r.text}
                        </p>
                        {/* 수정 버튼은 뺐다. 리뷰는 예약당 하나(booking_id UNIQUE)라
                            고쳐 쓰는 건 지우고 다시 쓰는 것과 같고, 수정 화면은
                            따로 없었다. 눌러도 아무 일도 없는 버튼이 더 나쁘다. */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(r.id)}
                            style={{
                              ...ghostBtn,
                              fontSize: '0.72rem',
                              padding: '0.3rem 0.6rem',
                              color: 'var(--danger)',
                              borderColor: 'var(--danger)40',
                            }}
                          >
                            {m.deleteReview}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...sectionStyle, textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✍️</div>
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                      {m.noReviews}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════ Coupons ════════════════ */}
            {activeTab === 'coupons' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.couponTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.5rem' }}>
                  {m.couponSub}
                </p>

                {coupons.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {coupons.map((c) => {
                      const isAvailable = c.status === 'available';
                      const isExpired = c.status === 'expired';
                      return (
                        <div
                          key={c.id}
                          style={{
                            ...sectionStyle,
                            opacity: isAvailable ? 1 : 0.5,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderLeft: `3px solid ${isAvailable ? 'var(--gold)' : 'var(--border)'}`,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '0.95rem',
                                color: isAvailable ? 'var(--gold)' : 'var(--muted)',
                              }}
                            >
                              {c.name}
                            </div>
                            <div
                              style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}
                            >
                              {m.couponExpiry}: {c.expiresAt}
                              {c.minAmount > 0 &&
                                ` · ${lang === 'ko' ? '최소' : 'Min'} ₩${fmt(c.minAmount)}`}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '1.1rem',
                                color: isAvailable ? 'var(--gold)' : 'var(--muted)',
                                fontWeight: 600,
                              }}
                            >
                              {c.discount}
                            </div>
                            <div
                              style={{
                                fontSize: '0.7rem',
                                marginTop: 4,
                                color: isAvailable
                                  ? 'var(--success)'
                                  : isExpired
                                    ? 'var(--danger)'
                                    : 'var(--muted)',
                              }}
                            >
                              {isAvailable
                                ? m.couponAvailable
                                : isExpired
                                  ? m.couponExpired
                                  : m.couponUsed}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ ...sectionStyle, textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎟️</div>
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                      {m.noCoupons}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════ Profile ════════════════ */}
            {activeTab === 'profile' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 0.3rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.profileTitle}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.5rem' }}>
                  {m.profileSub}
                </p>

                <div style={sectionStyle}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          color: 'var(--muted)',
                          marginBottom: '0.4rem',
                        }}
                      >
                        {m.nameLabel}
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          color: 'var(--muted)',
                          marginBottom: '0.4rem',
                        }}
                      >
                        {m.emailLabel}
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          color: 'var(--muted)',
                          marginBottom: '0.4rem',
                        }}
                      >
                        {m.phoneLabel}
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        style={inputStyle}
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          color: 'var(--muted)',
                          marginBottom: '0.4rem',
                        }}
                      >
                        {m.birthdateLabel}
                      </label>
                      <input
                        type="date"
                        value={profileForm.birthdate}
                        onChange={(e) =>
                          setProfileForm((p) => ({ ...p, birthdate: e.target.value }))
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <button onClick={handleSaveProfile} style={goldBtn}>
                      {m.saveProfile}
                    </button>
                    {profileSaved && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--success)' }}>
                        ✓ {m.profileSaved}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ Settings ════════════════ */}
            {activeTab === 'settings' && (
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    margin: '0 0 1.5rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.settingsTitle}
                </h2>

                {/* 비밀번호 변경 */}
                <div style={{ ...sectionStyle, marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.95rem',
                      color: 'var(--text)',
                      margin: '0 0 1rem',
                    }}
                  >
                    🔒{' '}
                    {lang === 'ko'
                      ? '비밀번호 변경'
                      : lang === 'ja'
                        ? 'パスワード変更'
                        : 'Change Password'}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      maxWidth: 400,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--muted)',
                          display: 'block',
                          marginBottom: 4,
                        }}
                      >
                        {lang === 'ko'
                          ? '새 비밀번호'
                          : lang === 'ja'
                            ? '新しいパスワード'
                            : 'New Password'}
                      </label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder={
                          lang === 'ko'
                            ? '8~16자, 대소문자+숫자+특수문자 포함'
                            : 'Min 8 chars, upper/lower + number + special'
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--muted)',
                          display: 'block',
                          marginBottom: 4,
                        }}
                      >
                        {lang === 'ko'
                          ? '새 비밀번호 확인'
                          : lang === 'ja'
                            ? '新しいパスワード確認'
                            : 'Confirm New Password'}
                      </label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder={
                          lang === 'ko' ? '비밀번호를 다시 입력해 주세요' : 'Re-enter your password'
                        }
                        style={inputStyle}
                      />
                    </div>
                    {/* 비밀번호 강도 표시 */}
                    {newPw &&
                      (() => {
                        let strength = 0;
                        if (newPw.length >= 8) strength++;
                        if (/[A-Z]/.test(newPw)) strength++;
                        if (/[a-z]/.test(newPw)) strength++;
                        if (/[0-9]/.test(newPw)) strength++;
                        if (/[^A-Za-z0-9]/.test(newPw)) strength++;
                        const labels =
                          lang === 'ko'
                            ? ['매우 약함', '약함', '보통', '강함', '매우 강함']
                            : ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
                        const colors = [
                          'var(--danger)',
                          '#f97316',
                          'var(--warning)',
                          'var(--success)',
                          '#10b981',
                        ];
                        const idx = Math.max(0, strength - 1);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                background: 'var(--border)',
                                borderRadius: 2,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${strength * 20}%`,
                                  height: '100%',
                                  background: colors[idx],
                                  transition: 'width 0.3s',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: colors[idx],
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {labels[idx]}
                            </span>
                          </div>
                        );
                      })()}
                    {pwMsg && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: pwMsg.includes('✓') ? 'var(--success)' : 'var(--danger)',
                          lineHeight: 1.5,
                        }}
                      >
                        {pwMsg}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (!newPw || !confirmPw) {
                          setPwMsg(
                            lang === 'ko' ? '비밀번호를 입력해 주세요.' : 'Please enter a password.'
                          );
                          return;
                        }
                        if (newPw.length < 8 || newPw.length > 16) {
                          setPwMsg(
                            lang === 'ko'
                              ? '비밀번호는 8~16자여야 합니다.'
                              : 'Password must be 8-16 characters.'
                          );
                          return;
                        }
                        if (newPw !== confirmPw) {
                          setPwMsg(
                            lang === 'ko'
                              ? '새 비밀번호가 일치하지 않습니다.'
                              : 'Passwords do not match.'
                          );
                          return;
                        }
                        setPwLoading(true);
                        setPwMsg('');
                        try {
                          const sb = getSupabase();
                          const { error } = await sb.auth.updateUser({ password: newPw });
                          if (error) throw error;
                          setPwMsg(
                            lang === 'ko'
                              ? '비밀번호가 변경되었습니다 ✓'
                              : 'Password changed successfully ✓'
                          );
                          setNewPw('');
                          setConfirmPw('');
                        } catch (err) {
                          setPwMsg(
                            lang === 'ko'
                              ? `비밀번호 변경 실패: ${err.message}`
                              : `Failed: ${err.message}`
                          );
                        } finally {
                          setPwLoading(false);
                        }
                      }}
                      disabled={pwLoading}
                      style={{ ...goldBtn, opacity: pwLoading ? 0.5 : 1, alignSelf: 'flex-start' }}
                    >
                      {pwLoading
                        ? lang === 'ko'
                          ? '변경 중...'
                          : 'Changing...'
                        : lang === 'ko'
                          ? '비밀번호 변경'
                          : lang === 'ja'
                            ? 'パスワード変更'
                            : 'Change Password'}
                    </button>
                  </div>
                </div>

                {/* Payment methods */}
                <div style={{ ...sectionStyle, marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.95rem',
                      color: 'var(--text)',
                      margin: '0 0 1rem',
                    }}
                  >
                    💳 {m.paymentMethods}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--muted)',
                      fontStyle: 'italic',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {m.noPaymentMethods}
                  </p>
                  <button
                    onClick={() => {
                      setToastMsg(
                        lang === 'ko'
                          ? '결제수단 관리는 추후 지원 예정입니다.'
                          : 'Payment method management coming soon.'
                      );
                      setTimeout(() => setToastMsg(''), 2500);
                    }}
                    style={{ ...ghostBtn, opacity: 0.6 }}
                  >
                    {m.addPayment}
                  </button>
                </div>

                {/* Notifications */}
                <div style={{ ...sectionStyle, marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.95rem',
                      color: 'var(--text)',
                      margin: '0 0 1rem',
                    }}
                  >
                    🔔 {m.notifications}
                  </h3>
                  {[
                    { key: 'booking', label: m.notiBooking },
                    { key: 'marketing', label: m.notiMarketing },
                    { key: 'chat', label: m.notiChat },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.7rem 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{label}</span>
                      <button
                        onClick={() => setNotiSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                        style={{
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          border: 'none',
                          cursor: 'pointer',
                          background: notiSettings[key] ? 'var(--gold)' : 'var(--border)',
                          position: 'relative',
                          transition: 'background 0.3s',
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: 3,
                            left: notiSettings[key] ? 23 : 3,
                            transition: 'left 0.3s',
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Delete account */}
                <div
                  style={{
                    ...sectionStyle,
                    borderColor: 'var(--danger)30',
                    background: 'rgba(239,68,68,0.03)',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.95rem',
                      color: 'var(--danger)',
                      margin: '0 0 0.5rem',
                    }}
                  >
                    ⚠️ {m.deleteAccount}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--muted)',
                      margin: '0 0 1rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {m.deleteAccountDesc}
                  </p>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        ...ghostBtn,
                        color: 'var(--danger)',
                        borderColor: 'var(--danger)40',
                      }}
                    >
                      {m.deleteAccountBtn}
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: '1.2rem',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid var(--danger)40',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.95rem',
                          color: 'var(--danger)',
                          fontFamily: 'var(--font-serif)',
                          fontWeight: 600,
                          marginBottom: '0.6rem',
                        }}
                      >
                        {/* 예전에는 여기 '탈퇴 확정' 버튼이 바로 탈퇴를 했다.
                            했다고 보이기만 했다. 실제 코드는
                              // TODO: Supabase deleteAccount
                              await logout();
                            로그아웃만 하고 계정은 그대로 남았다. 그런데 화면은
                            '영구 삭제되며 복구할 수 없습니다' 라고 약속했다.
                            사용자는 지워진 줄 알고 떠나는데 데이터는 남아 있었다.

                            제대로 하려면 auth.users 삭제(service_role 필요)와
                            '무엇을 지우고 무엇을 남길지' 정책이 있어야 한다.
                            전자상거래법상 거래 기록은 보관 의무가 있어 '전부
                            삭제' 는 애초에 불가능하다. 약관(legal.js 제3조)도
                            '최대 5년 보관' 이라 화면 문구와 모순이었다.

                            구현 전까지는 문의로 받는다. 작동하지 않는 버튼이
                            '삭제됐다' 고 믿게 만드는 것보다 낫다. */}
                        {lang === 'ko'
                          ? '탈퇴 요청은 문의로 접수합니다'
                          : lang === 'ja'
                            ? '退会のご依頼はお問い合わせで承ります'
                            : 'Account deletion is handled through support'}
                      </div>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--muted)',
                          margin: '0 0 0.5rem',
                          lineHeight: 1.7,
                        }}
                      >
                        {lang === 'ko'
                          ? '탈퇴를 원하시면 1:1 문의에서 "계정 · 개인정보" 분류로 남겨주세요. 확인 후 처리해 드립니다.'
                          : 'Please submit a request under "Account & Privacy" in 1:1 Support. We will process it after verification.'}
                      </p>
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--muted)',
                          margin: '0 0 1rem',
                          lineHeight: 1.8,
                        }}
                      >
                        {lang === 'ko'
                          ? '계정과 개인정보(이름 · 연락처 · 주소)는 삭제됩니다. 다만 완료된 예약과 결제 기록은 관련 법령에 따라 일정 기간 보관되며, 이때 개인을 식별할 수 있는 정보는 지워집니다.'
                          : 'Your account and personal details (name, contact, address) are removed. Completed bookings and payment records are retained for a period required by law, with identifying information stripped.'}
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={() => navigate('/support')}
                          style={{ ...goldBtn, background: 'var(--danger)', color: '#fff' }}
                        >
                          {lang === 'ko' ? '문의로 이동' : 'Go to Support'}
                        </button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={ghostBtn}>
                          {lang === 'ko' ? '취소' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 통합 리뷰 모달 */}
      {reviewBooking && (
        <UnifiedReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSaved={() => setReviewBooking(null)}
        />
      )}

      {/* 예약 상세 모달 */}
      {detailBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailBooking(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '36px 32px',
              position: 'relative',
            }}
          >
            <Corners />
            <button
              onClick={() => setDetailBooking(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 20,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              ✕
            </button>

            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 10,
                letterSpacing: '0.3em',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {lang === 'ko' ? '예약 상세' : 'Booking Detail'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                letterSpacing: '0.04em',
                marginBottom: 24,
              }}
            >
              {detailBooking.artistName}
            </div>

            {/* 기본 정보 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px 20px',
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: lang === 'ko' ? '촬영 일시' : 'Date & Time',
                  value: `${detailBooking.date} · ${detailBooking.time}`,
                },
                {
                  label: lang === 'ko' ? '상태' : 'Status',
                  value: m.statuses[detailBooking.status],
                  color: statusColors[detailBooking.status],
                },
                { label: lang === 'ko' ? '상품' : 'Package', value: detailBooking.pkg },
                {
                  label: lang === 'ko' ? '결제 금액' : 'Amount',
                  value: `₩${fmt(detailBooking.amount)}`,
                },
                // 결제 전이면 '결제일' 칸 자체를 안 보여준다. '—' 는
                // 고객에게 "빈칸인데 왜 있지" 로만 읽힌다.
                ...(detailBooking.paidAt
                  ? [{ label: lang === 'ko' ? '결제일' : 'Paid At', value: detailBooking.paidAt }]
                  : []),
                // 예약번호는 앞 8자리만.
                //
                // 예전에는 uuid 36자리를 통째로 보여줬다
                // (dd9db33d-7688-4866-9ca6-27152f8c40db). 고객에게 아무
                // 의미가 없고, 문의할 때 옮겨 적다 틀리기 딱 좋다.
                // 앞자리만으로도 상담원이 찾기에 충분하다.
                {
                  label: lang === 'ko' ? '예약번호' : 'Booking No.',
                  value: String(detailBooking.id || '')
                    .slice(0, 8)
                    .toUpperCase(),
                },
              ].map((item, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-serif)',
                      letterSpacing: '0.08em',
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: item.color || 'var(--text)',
                      fontFamily: 'var(--font-serif)',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline 카드 */}
            {detailBooking.pipeline && (
              <>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 10,
                    letterSpacing: '0.3em',
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                  }}
                >
                  {lang === 'ko' ? '예약 구성' : 'Booking Components'}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 10,
                  }}
                >
                  {[
                    {
                      key: 'artist',
                      icon: '📸',
                      label: lang === 'ko' ? '작가' : 'Artist',
                      data: detailBooking.pipeline.artist,
                    },
                    {
                      key: 'stylist',
                      icon: '💇',
                      label: lang === 'ko' ? '헤어메이크업' : 'H&M',
                      data: detailBooking.pipeline.stylist,
                    },
                    {
                      key: 'costume',
                      icon: '👗',
                      label: lang === 'ko' ? '의상' : 'Costume',
                      data: detailBooking.pipeline.costume,
                    },
                    {
                      key: 'venue',
                      icon: '📍',
                      label: lang === 'ko' ? '장소' : 'Venue',
                      data: detailBooking.pipeline.venue,
                    },
                  ]
                    .filter((x) => x.data)
                    .map((item) => {
                      const plColor = statusColors[item.data.status] || 'var(--muted)';
                      return (
                        <div
                          key={item.key}
                          style={{
                            padding: '14px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg2)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            {item.data.img ? (
                              <img
                                src={item.data.img}
                                alt=""
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid var(--border)',
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: 18 }}>{item.icon}</span>
                            )}
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontFamily: 'var(--font-serif)',
                                  color: 'var(--text)',
                                }}
                              >
                                {item.data.name || item.data.vendor || item.data.item}
                              </div>
                              <span
                                style={{
                                  padding: '1px 5px',
                                  fontSize: '0.6rem',
                                  background: `${plColor}18`,
                                  color: plColor,
                                  border: `1px solid ${plColor}40`,
                                  fontFamily: 'var(--font-serif)',
                                }}
                              >
                                {m.statuses[item.data.status] || item.data.status}
                              </span>
                            </div>
                          </div>
                          {item.data.contact && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              📧 {item.data.contact}
                            </div>
                          )}
                          {item.data.specialty && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              ✨ {item.data.specialty}
                            </div>
                          )}
                          {item.data.address && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              🗺️ {item.data.address}
                            </div>
                          )}
                          {item.data.time && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              🕐 {item.data.time}
                            </div>
                          )}
                          {item.data.pickupDate && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {lang === 'ko' ? '수령' : 'Pickup'}: {item.data.pickupDate} ·{' '}
                              {lang === 'ko' ? '반납' : 'Return'}: {item.data.returnDate}
                            </div>
                          )}
                          {item.data.item && item.key === 'costume' && (
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              👗 {item.data.item}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={() => setDetailBooking(null)}
              className="btn-outline"
              style={{ width: '100%', justifyContent: 'center', marginTop: 24, fontSize: 13 }}
            >
              {lang === 'ko' ? '닫기' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '12px 24px',
            fontSize: 12,
            zIndex: 10001,
            whiteSpace: 'pre-line',
            textAlign: 'center',
            maxWidth: '90vw',
          }}
        >
          {toastMsg}
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CustomerDashboard;
