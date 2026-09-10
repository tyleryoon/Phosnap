import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer  from '../components/Footer';
import Chat from '../components/Chat';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getArtistBookings,
  getPendingBookings,
  approveBooking,
  rejectBooking,
  getSupabase,
  cancelPaymentServer,
  expireStaleBookings,
  getPackageReviews,
  getPhotographerReviewsV2,
  getReviewRepliesByPhotographer,
  submitReviewReply,
} from '../lib/supabase';
import { uploadImage } from '../lib/storage';
import { getAvatarUrl } from '../lib/supabase';
import ProfileAvatar from '../components/ProfileAvatar';
import { PHOTOGRAPHERS, SNAP_FILTER_KEYS, SNAP_FILTER_LABELS } from '../data/photographers';
import { isTagAllowed, sanitizeTag } from '../utils/tagFilter';
import DemandForecast from '../components/DemandForecast';
import ImageVerification from '../components/ImageVerification';
import ReferralCard from '../components/ReferralCard';
import ArtistInsights from '../components/ArtistInsights';

// ─── Artist Dashboard ─────────────────────────────────────────────────
// 탭: 홈 | 예약 관리 | 실적 | 초대 현황

// ── 배지 정의 (ARTIST_TIERS 기준과 통일) ─────────────────────────────
const BADGES = [
  { id: 'rising',      label: 'Rising',      symbol: '✦',    minShoots: 0,   minRating: 0,   color: '#9ca3af',    desc: '기본 프로필 노출' },
  { id: 'established', label: 'Established', symbol: '✦✦',   minShoots: 30,  minRating: 4.0, color: '#60a5fa',    desc: '검색 상위 노출' },
  { id: 'premier',     label: 'Premier',     symbol: '✦✦✦',  minShoots: 100, minRating: 4.5, color: 'var(--gold)', desc: '추천 작가 배지 표시' },
  { id: 'elite',       label: 'Elite',       symbol: '✦✦✦✦', minShoots: 300, minRating: 4.7, color: '#f472b6',    desc: '홈 피처드 섹션 노출' },
];
const getBadge = (shoots, rating = 5.0) => {
  let result = BADGES[0];
  for (const b of BADGES) {
    if (shoots >= b.minShoots && rating >= b.minRating) result = b;
  }
  return result;
};

// ── 상태 색상 ──────────────────────────────────────────────────────────
const STATUS = {
  pending:   { label: '확정 대기', color: '#f0ac2a', bg: 'rgba(240,172,42,0.1)'  },
  confirmed: { label: '예약 확정', color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  completed: { label: '촬영 완료', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  cancelled: { label: '취소됨',   color: '#e85d5d', bg: 'rgba(232,93,93,0.1)'   },
  delivered: { label: '전달 완료', color: '#4299e1', bg: 'rgba(66,153,225,0.12)', border: 'rgba(66,153,225,0.35)' },
};

const fmt = (n) => n?.toLocaleString('ko-KR') || '0';
const fmtDate = (s) => s ? s.replace('T', ' ').slice(0, 16) : '—';

// ── 작가 유형 한글 ─────────────────────────────────────────────────────
const ARTIST_TYPE_LABEL = {
  photographer: '사진 작가',
  videographer: '영상 작가',
  both:         '사진+영상',
  hmk:          '헤어메이크업',
};

// ── 다국어 라벨 ───────────────────────────────────────────────────────
const CONTENT = {
  ko: {
    bookingsTab: '예약 관리',
    profileTab: '프로필 편집',
    displayName: '활동명',
    nameKo: '한글 활동명',
    nameEn: '영문 활동명',
    bio: '소개글',
    location: '활동 지역',
    languages: '언어',
    snapTags: '스냅 필터 태그',
    instantBooking: '즉시예약 여부',
    profileImages: '대표 이미지',
    save: '저장',
    loading: '로드 중…',
    saved: '저장되었습니다 ✓',
    error: '저장에 실패했습니다.',
  },
  en: {
    bookingsTab: 'Bookings',
    profileTab: 'Edit Profile',
    displayName: 'Display Name',
    nameKo: 'Name (Korean)',
    nameEn: 'Name (English)',
    bio: 'Bio',
    location: 'Location',
    languages: 'Languages',
    snapTags: 'Snap Filter Tags',
    instantBooking: 'Instant Booking',
    profileImages: 'Profile Images',
    save: 'Save',
    loading: 'Loading…',
    saved: 'Saved ✓',
    error: 'Save failed.',
  },
  ja: {
    bookingsTab: '予約管理',
    profileTab: 'プロフィール編集',
    displayName: '活動名',
    nameKo: '韓国語活動名',
    nameEn: '英語活動名',
    bio: '自己紹介',
    location: '活動地域',
    languages: '言語',
    snapTags: 'スナップフィルタータグ',
    instantBooking: 'インスタントブッキング',
    profileImages: 'プロフィール画像',
    save: '保存',
    loading: '読み込み中…',
    saved: '保存されました ✓',
    error: '保存に失敗しました。',
  },
  zh: {
    bookingsTab: '预订管理',
    profileTab: '编辑资料',
    displayName: '艺名',
    nameKo: '韩文艺名',
    nameEn: '英文艺名',
    bio: '个人简介',
    location: '活动地区',
    languages: '语言',
    snapTags: '快照过滤标签',
    instantBooking: '即时预订',
    profileImages: '资料图片',
    save: '保存',
    loading: '加载中…',
    saved: '已保存 ✓',
    error: '保存失败。',
  },
};

// ─────────────────────────────────────────────────────────────────────
const ArtistDashboard = () => {
  const { user, userName, isArtist, isLoggedIn } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const c = CONTENT[lang] || CONTENT.ko;

  const [activeTab, setActiveTab]     = useState('home');
  const [bookings,  setBookings]      = useState([]);
  const [profile,   setProfile]       = useState(null);
  const [loading,   setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Profile edit tab states
  const [profileNameKo, setProfileNameKo]         = useState('');
  const [profileNameEn, setProfileNameEn]         = useState('');
  const [profileBio, setProfileBio]               = useState('');
  const [profileLocation, setProfileLocation]     = useState('');
  const [profileLanguages, setProfileLanguages]   = useState([]);
  const [profileTags, setProfileTags]             = useState([]);
  const [profileInstantBooking, setProfileInstantBooking] = useState(false);
  const [profileHmkSelf, setProfileHmkSelf]       = useState(false);   // 헤메 직접 진행
  const [profileHmkExternal, setProfileHmkExternal] = useState(false); // Phosnap 헤메 작가 매칭
  const [profileDressSelf, setProfileDressSelf]   = useState(false);   // 자체 의상 보유
  const [profileImages, setProfileImages]         = useState([]);
  const [profileSaving, setProfileSaving]         = useState(false);
  const [profileMsg, setProfileMsg]               = useState('');
  const [avatarUrl, setAvatarUrl]                 = useState(null);

  // 예약 승인/거절
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]         = useState('');

  // 사진 전달
  const [deliverTarget, setDeliverTarget] = useState(null);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverMsg, setDeliverMsg] = useState('');

  // 채팅
  const [chatBookingId, setChatBookingId] = useState(null);

  // 리뷰 관리
  const [pkgReviews, setPkgReviews]       = useState([]);
  const [artReviews, setArtReviews]       = useState([]);
  const [reviewReplies, setReviewReplies] = useState({});  // { [reviewId]: replyObj }
  const [replyTarget, setReplyTarget]     = useState(null); // { reviewId, reviewType, existing? }
  const [replyBody, setReplyBody]         = useState('');
  const [replySaving, setReplySaving]     = useState(false);
  const [replyMsg, setReplyMsg]           = useState('');
  const [reviewTab, setReviewTab]         = useState('photographer'); // 'photographer' | 'package'

  // 작가 Legacy ID — user_metadata에서 우선, fallback으로 profile에서 조회
  const [artistLegacyId, setArtistLegacyId] = useState(
    user?.user_metadata?.artist_legacy_id || user?.user_metadata?.legacy_id || null
  );

  // ── 데이터 로드 ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 작가 ID 동적 조회
      let legacyId = artistLegacyId;
      if (!legacyId && user?.id) {
        const sb = await getSupabase();
        if (sb) {
          // photographers 테이블에서 user_id로 조회
          const { data: photog } = await sb.from('photographers')
            .select('id').eq('user_id', user.id).maybeSingle();
          if (photog?.id) {
            legacyId = photog.id;
            setArtistLegacyId(photog.id);
          } else {
            // profiles에서 legacy ID fallback
            const { data: prof } = await sb.from('profiles')
              .select('artist_legacy_id').eq('id', user.id).maybeSingle();
            legacyId = prof?.artist_legacy_id || user.id;
            setArtistLegacyId(legacyId);
          }
        }
      }
      if (!legacyId) legacyId = 1; // 최후 fallback (dev mode)

      // 예약 목록
      const { data: bData } = await getArtistBookings(legacyId);
      setBookings(bData || []);

      // profiles (배지, referral_code 등)
      if (user?.id) {
        const sb = await getSupabase();
        if (sb) {
          const { data: pData } = await sb.from('profiles').select('*').eq('id', user.id).single();
          setProfile(pData || null);
        }
      }

      // 리뷰 + 답글 로드
      const [pkgRes, artRes, repliesRes] = await Promise.all([
        getPackageReviews(legacyId, 100),
        getPhotographerReviewsV2(legacyId, 100),
        getReviewRepliesByPhotographer(user?.id || legacyId),
      ]);
      setPkgReviews(pkgRes.data || []);
      setArtReviews(artRes.data || []);
      // 답글을 reviewId 기준 맵으로 변환
      const repliesMap = {};
      (repliesRes.data || []).forEach(r => { repliesMap[r.review_id] = r; });
      setReviewReplies(repliesMap);
    } catch (_) { /* silent */ }
    setLoading(false);
  }, [user?.id]);

  // ── 프로필 로드 (photographers 테이블) ──────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const sb = await getSupabase();
      if (!sb) return;
      const { data } = await sb.from('photographers')
        .select('name_ko, name_en, bio, location, languages, snap_tags, instant_booking, profile_images')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setProfileNameKo(data.name_ko || '');
        setProfileNameEn(data.name_en || '');
        setProfileBio(data.bio || '');
        setProfileLocation(data.location || '');
        setProfileLanguages(data.languages || []);
        setProfileTags(data.snap_tags || []);
        setProfileInstantBooking(data.instant_booking || false);
        setProfileHmkSelf(data.hmk_self || false);
        setProfileHmkExternal(data.hmk_external_connect || false);
        setProfileDressSelf(data.dress_self || false);
        setProfileImages(data.profile_images || []);
      }
      // 아바타 로드
      const avatar = await getAvatarUrl();
      if (avatar) setAvatarUrl(avatar);
    } catch (_) { /* silent */ }
  }, [user?.id]);

  // ── 프로필 저장 ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const sb = await getSupabase();
      if (!sb) throw new Error('Supabase not connected');
      const { error } = await sb.from('photographers')
        .update({
          name_ko: profileNameKo,
          name_en: profileNameEn,
          bio: profileBio,
          location: profileLocation,
          languages: profileLanguages,
          snap_tags: profileTags,
          instant_booking: profileInstantBooking,
          hmk_self: profileHmkSelf,
          hmk_external_connect: profileHmkExternal,
          dress_self: profileDressSelf,
          profile_images: profileImages,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      setProfileMsg(c.saved);
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileMsg(c.error);
    }
    setProfileSaving(false);
  };

  // ── 프로필 이미지 업로드 ──────────────────────────────────────────────
  const handleUploadProfileImage = async (e) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    const file = files[0];
    try {
      // uploadImage 는 { url, path, error } 를 반환한다.
      const { url, error } = await uploadImage(file, 'photographers');
      if (url) {
        setProfileImages(prev => [...prev, url]);
      } else {
        setProfileMsg(`이미지 업로드 실패 — ${error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      setProfileMsg('이미지 업로드 실패');
    }
  };

  const removeProfileImage = (index) => {
    setProfileImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    // 48시간 만료 체크 (대시보드 진입 시마다)
    expireStaleBookings().catch(() => {});
    loadData();
  }, [loadData]);

  // 프로필 탭 활성화 시 프로필 데이터 로드
  useEffect(() => {
    if (activeTab === 'profile') {
      loadProfile();
    }
  }, [activeTab, loadProfile]);

  // 로그인/작가 체크
  useEffect(() => {
    if (!isLoggedIn) { navigate('/'); return; }
    // isArtist가 false여도 MVP에선 허용 (role 세팅 이슈 대응)
  }, [isLoggedIn, navigate]);

  // ── 예약 액션 ────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setActionLoading(true);
    const { error } = await approveBooking(id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
      setActionMsg('예약을 확정했습니다 ✓');
      setTimeout(() => setActionMsg(''), 2500);
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    const { error } = await rejectBooking(rejectTarget, rejectReason);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === rejectTarget ? { ...b, status: 'cancelled' } : b));
      // ── 환불 처리: cancel-payment Edge Function 호출 ──
      // 취소 정책에 따라 자동으로 전액/50%/0% 환불 계산
      try {
        const refundResult = await cancelPaymentServer(rejectTarget, `작가 거절: ${rejectReason}`);
        if (refundResult.success) {
          const rate = refundResult.refundRate ?? '?';
          setActionMsg(`예약을 거절했습니다. 고객에게 ${rate}% 환불 처리됨.`);
        } else {
          setActionMsg('예약을 거절했습니다. (환불 처리 실패 — 고객센터 확인 필요)');
        }
      } catch (_) {
        setActionMsg('예약을 거절했습니다. (환불 처리 연결 실패)');
      }
      setTimeout(() => setActionMsg(''), 4000);
    }
    setRejectTarget(null);
    setRejectReason('');
    setActionLoading(false);
  };

  const handleDeliver = async (deliveryUrl, deliveryMemo) => {
    if (!deliverTarget || !deliveryUrl.trim()) return;
    setDeliverLoading(true);
    setDeliverMsg('');
    try {
      const { deliverPhotos } = await import('../lib/supabase');
      const { error } = await deliverPhotos(deliverTarget.id, { deliveryUrl, deliveryMemo });
      if (error) throw error;
      setBookings(prev => prev.map(b =>
        b.id === deliverTarget.id
          ? { ...b, status: 'delivered', delivery_url: deliveryUrl, delivered_at: new Date().toISOString() }
          : b
      ));
      setDeliverTarget(null);
      setDeliverMsg('사진이 전달되었습니다!');
    } catch (err) {
      setDeliverMsg('전달에 실패했습니다.');
    }
    setDeliverLoading(false);
  };

  // ── 통계 계산 ────────────────────────────────────────────────────────
  const stats = (() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const completed  = bookings.filter(b => b.status === 'completed');
    const confirmed  = bookings.filter(b => b.status === 'confirmed');
    const pending    = bookings.filter(b => b.status === 'pending');
    const monthDone  = completed.filter(b => b.date?.startsWith(thisMonth));
    const revenue    = completed.reduce((s, b) => s + (b.package_price || 0), 0);
    const monthRev   = monthDone.reduce((s, b) => s + (b.package_price || 0), 0);
    return { completed: completed.length, confirmed: confirmed.length, pending: pending.length, monthDone: monthDone.length, revenue, monthRev };
  })();

  const completedCount = profile?.completed_bookings ?? stats.completed;
  const artistData = PHOTOGRAPHERS.find(p => p.id === artistLegacyId);
  const artistRating = profile?.avg_rating ?? artistData?.rating ?? 5.0;
  const badge = getBadge(completedCount, artistRating);
  const nextBadge = BADGES[BADGES.indexOf(badge) + 1];

  // ── 필터된 예약 ──────────────────────────────────────────────────────
  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  // ── 답글 제출 핸들러 ──────────────────────────────────────────────────
  const handleReplySubmit = async () => {
    if (!replyTarget || !replyBody.trim()) return;
    setReplySaving(true);
    setReplyMsg('');
    try {
      const { data, error } = await submitReviewReply({
        reviewId: replyTarget.reviewId,
        reviewType: replyTarget.reviewType,
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

  // ── 탭 목록 ─────────────────────────────────────────────────────────
  const totalReviews = pkgReviews.length + artReviews.length;
  const TABS = [
    { id: 'home',     label: '홈' },
    { id: 'reviews',  label: `리뷰 관리${totalReviews > 0 ? ` (${totalReviews})` : ''}` },
    { id: 'profile',  label: c.profileTab },
    { id: 'insights', label: '인사이트', icon: '📊' },
    { id: 'stats',    label: '실적' },
    { id: 'referral', label: '초대 현황' },
  ];

  // ── 공통 섹션 레이블 ─────────────────────────────────────────────────
  const SectionLabel = ({ children }) => (
    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 20 }}>
      {children}
    </div>
  );

  // ── 사진 전달 모달 ──────────────────────────────────────────────────────
  const DeliverModal = ({ booking, onConfirm, onClose, loading, deliverMsg }) => {
    const [deliveryUrl, setDeliveryUrl] = useState('');
    const [deliveryMemo, setDeliveryMemo] = useState('');

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', maxWidth: 480, width: '100%', padding: '36px 32px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8 }}>
            사진 전달하기
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.05em', marginBottom: 16, color: 'var(--text)' }}>
            {booking.date} 촬영
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.7 }}>
            촬영 완료 사진의 공유 링크를 입력해주세요.
          </div>

          {/* 예약 요약 */}
          <div style={{ padding: '12px 16px', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', marginBottom: 20, fontSize: 12, color: 'var(--muted)' }}>
            {booking.date} · {booking.package_name}
          </div>

          {/* 링크 입력 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>
              공유 링크
            </label>
            <input
              type="text"
              value={deliveryUrl}
              onChange={e => setDeliveryUrl(e.target.value)}
              placeholder="Google Drive / Dropbox 링크"
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* 메모 입력 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 6, display: 'block' }}>
              메모 (선택)
            </label>
            <textarea
              value={deliveryMemo}
              onChange={e => setDeliveryMemo(e.target.value)}
              placeholder="고객에게 전달할 메모"
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                resize: 'vertical', minHeight: 80, lineHeight: 1.6, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* 메시지 표시 */}
          {deliverMsg && (
            <div style={{
              padding: '10px 14px', marginBottom: 20, fontSize: 13,
              background: deliverMsg.includes('실패') ? 'rgba(232,93,93,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${deliverMsg.includes('실패') ? 'rgba(232,93,93,0.3)' : 'rgba(34,197,94,0.3)'}`,
              color: deliverMsg.includes('실패') ? '#e85d5d' : '#22c55e',
            }}>
              {deliverMsg}
            </div>
          )}

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onConfirm(deliveryUrl, deliveryMemo)}
              disabled={loading || !deliveryUrl.trim()}
              style={{
                flex: 1, padding: '11px 0', background: '#4299e1', border: 'none',
                color: '#fff', fontFamily: 'var(--font-serif)', fontSize: 13,
                letterSpacing: '0.08em', cursor: 'pointer', opacity: loading || !deliveryUrl.trim() ? 0.6 : 1,
              }}
            >
              {loading ? '처리 중…' : '전달 완료'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1, padding: '11px 0', background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--muted)',
                fontFamily: 'var(--font-serif)', fontSize: 13, cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── 예약 카드 ────────────────────────────────────────────────────────
  const BookingCard = ({ b, showActions }) => {
    const st = STATUS[b.status] || STATUS.pending;
    return (
      <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 24px', position: 'relative', marginBottom: 12 }}>
        <Corners />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.04em' }}>
                {b.date} {b.time && `· ${b.time}`}
              </span>
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
                padding: '3px 10px', border: `1px solid ${st.color}`,
                color: st.color, background: st.bg,
              }}>
                {st.label}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '4px 24px' }}>
              {[
                { k: '패키지',  v: b.package_name },
                { k: '금액',    v: b.package_price ? `₩${fmt(b.package_price)}` : '—' },
                { k: '주문번호', v: b.toss_order_id ? b.toss_order_id.slice(-12) : '—' },
                { k: '요청일',  v: b.created_at ? b.created_at.slice(0, 10) : '—' },
              ].map(item => (
                <div key={item.k} style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', marginRight: 6 }}>{item.k}</span>
                  <span style={{ color: 'var(--text)' }}>{item.v}</span>
                </div>
              ))}
            </div>
            {b.note && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(232,160,32,0.05)', border: '1px solid var(--gold-border)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                📝 {b.note}
              </div>
            )}
            {b.reschedule_request && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.3)', fontSize: 12, color: '#93c5fd', lineHeight: 1.6 }}>
                📅 일정변경 요청: {b.reschedule_request}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          {showActions && b.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => handleApprove(b.id)}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px', background: 'var(--gold)', border: 'none',
                  color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 12,
                  letterSpacing: '0.08em', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1,
                }}
              >
                확정
              </button>
              <button
                onClick={() => { setRejectTarget(b.id); setRejectReason(''); }}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px', background: 'transparent',
                  border: '1px solid #e85d5d', color: '#e85d5d',
                  fontFamily: 'var(--font-serif)', fontSize: 12,
                  letterSpacing: '0.08em', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1,
                }}
              >
                거절
              </button>
            </div>
          )}

          {/* 채팅 및 사진 전달 버튼 */}
          {showActions && (b.status === 'confirmed' || b.status === 'completed' || b.status === 'delivered') && (
            <div style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setChatBookingId(b.id)}
                style={{
                  padding: '8px 14px', background: 'transparent',
                  border: '1px solid var(--gold)', color: 'var(--gold)',
                  fontFamily: 'var(--font-serif)', fontSize: 12,
                  letterSpacing: '0.08em', cursor: 'pointer',
                }}
              >
                💬 채팅
              </button>
              {b.delivery_url ? (
                <div style={{
                  padding: '8px 14px', background: 'rgba(66,153,225,0.1)', border: '1px solid rgba(66,153,225,0.3)',
                  color: '#4299e1', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.08em',
                }}>
                  ✓ 전달 완료
                </div>
              ) : (
                <button
                  onClick={() => setDeliverTarget(b)}
                  style={{
                    padding: '8px 18px', background: 'transparent',
                    border: '1px solid #4299e1', color: '#4299e1',
                    fontFamily: 'var(--font-serif)', fontSize: 12,
                    letterSpacing: '0.08em', cursor: 'pointer',
                  }}
                >
                  사진 전달
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="page-enter" style={{ paddingTop: 100, paddingBottom: 80 }}>
      <div className="section">

        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ProfileAvatar
              avatarUrl={avatarUrl}
              onAvatarChange={(url) => setAvatarUrl(url)}
              size={68}
              editable={true}
            />
            <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
              Artist Dashboard
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, letterSpacing: '0.05em', marginBottom: 6 }}>
              {userName || '작가님'} 님
            </h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {profile?.artist_type && (
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                  {ARTIST_TYPE_LABEL[profile.artist_type] || profile.artist_type}
                </span>
              )}
              {/* 배지 */}
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em',
                padding: '3px 12px', border: `1px solid ${badge.color}`,
                color: badge.color, background: `${badge.color}18`,
              }}>
                {badge.symbol} {badge.label}
              </span>
            </div>
          </div>
          </div>

          {/* 스케줄/지역 관리 링크 */}
          {(() => {
            // 빨간점: 필수 설정 미완료 또는 대기 예약 존재
            const hasPendingBookings = (bookings || []).some(b => b.status === 'pending' || b.status === 'requested');
            const hasNoLocations = !(artistData?.locations?.length > 0);
            const hasNoPortfolio = !(artistData?.portfolio ?? []).some(pf => (pf.images?.length > 0 || pf.url) && pf.regionId);
            const needsAttention = hasPendingBookings || hasNoLocations || hasNoPortfolio;

            return (
              <Link to="/artist/schedule" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                border: '1px solid var(--border)', color: 'var(--muted)',
                fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.08em',
                textDecoration: 'none', transition: 'border-color 0.2s',
                position: 'relative',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                📅 스케줄 · 지역 · 상품 · 결제 · 예약 관리 →
                {needsAttention && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#e85d5d', border: '2px solid var(--bg)',
                  }} />
                )}
              </Link>
            );
          })()}
        </div>

        {/* ── 탭 ── */}
        <div className="tab-nav" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
          {TABS.map(tab => {
            const hasBadge = stats.pending > 0 && tab.id === 'bookings' && activeTab !== 'bookings';
            return (
              <button key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ position: 'relative' }}
              >
                {tab.label}
                {hasBadge && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#e85d5d',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* 저장 메시지 */}
        {actionMsg && (
          <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 13, marginBottom: 20 }}>
            {actionMsg}
          </div>
        )}

        {/* ── 로딩 ── */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
            Loading…
          </div>
        )}

        {!loading && (
          <>

            {/* ════════════════════════ 탭: 홈 ════════════════════════ */}
            {activeTab === 'home' && (
              <div>
                {/* 요약 스탯 카드 4개 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
                  {[
                    { label: '대기 중 예약', value: stats.pending,   color: '#f0ac2a', sub: '확정 필요' },
                    { label: '확정된 예약',  value: stats.confirmed, color: '#22c55e', sub: '진행 예정' },
                    { label: '이번달 완료',  value: stats.monthDone, color: '#60a5fa', sub: '건' },
                    { label: '누적 매출',    value: `₩${fmt(stats.revenue)}`, color: 'var(--gold)', sub: '패키지 기준', big: true },
                  ].map(card => (
                    <div key={card.label} style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 20px', position: 'relative' }}>
                      <Corners />
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 12 }}>
                        {card.label}
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: card.big ? 18 : 32, color: card.color, letterSpacing: '0.03em', marginBottom: 6 }}>
                        {card.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* 대기 중 예약 빠른 확인 */}
                {stats.pending > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <SectionLabel>대기 중 예약 요청</SectionLabel>
                      <button
                        onClick={() => { setActiveTab('bookings'); setStatusFilter('pending'); }}
                        style={{ fontSize: 11, color: 'var(--gold)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}
                      >
                        전체 보기 →
                      </button>
                    </div>
                    {bookings.filter(b => b.status === 'pending').slice(0, 3).map(b => (
                      <BookingCard key={b.id} b={b} showActions />
                    ))}
                  </div>
                )}

                {stats.pending === 0 && (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.08em', marginBottom: 40 }}>
                    새로운 예약 요청이 없습니다
                  </div>
                )}

                {/* 배지 진행도 */}
                <div style={{ border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.03)', padding: '28px 28px', marginBottom: 40, position: 'relative' }}>
                  <Corners />
                  <SectionLabel>Badge Progress</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: badge.color, letterSpacing: '0.05em', marginBottom: 4 }}>
                        {badge.symbol} {badge.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>누적 완료 {completedCount}건</div>
                    </div>
                    {nextBadge && (
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                          <span>다음 등급: {nextBadge.symbol} {nextBadge.label}</span>
                          <span>{completedCount} / {nextBadge.minShoots}건</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${Math.min(100, (completedCount / nextBadge.minShoots) * 100)}%`,
                            background: `linear-gradient(90deg, ${badge.color}, ${nextBadge.color})`,
                            transition: 'width 0.5s',
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                          {nextBadge.minShoots - completedCount}건 더 완료하면 등급 상승
                        </div>
                      </div>
                    )}
                    {!nextBadge && (
                      <div style={{ fontSize: 13, color: badge.color, fontFamily: 'var(--font-serif)' }}>
                        최고 등급 달성 🎉
                      </div>
                    )}
                  </div>

                  {/* ── 등급 소개 ── */}
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 12 }}>
                      등급별 혜택 안내
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      {[
                        { symbol: '✦', label: 'Rising', range: '0~29건', color: '#9ca3af', perks: '기본 프로필 노출, 예약 수신, 수수료 20%' },
                        { symbol: '✦✦', label: 'Established', range: '30~99건', color: '#60a5fa', perks: '검색 우선 노출, 배지 표시, 수수료 15%' },
                        { symbol: '✦✦✦', label: 'Premier', range: '100~299건', color: 'var(--gold)', perks: '홈 추천 등록, 수수료 12%, 즉시예약 활성화' },
                        { symbol: '✦✦✦✦', label: 'Elite', range: '300건+', color: '#f472b6', perks: '최우선 노출, 수수료 12%, 전용 매니저 배정' },
                      ].map(tier => (
                        <div key={tier.label} style={{
                          padding: '12px 14px', border: `1px solid ${badge.label === tier.label ? tier.color + '55' : 'var(--border)'}`,
                          background: badge.label === tier.label ? tier.color + '08' : 'transparent',
                        }}>
                          <div style={{ fontSize: 13, color: tier.color, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                            {tier.symbol} {tier.label}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>누적 완료 {tier.range}</div>
                          <div style={{ fontSize: 11, color: 'rgba(242,242,242,0.65)', lineHeight: 1.6 }}>{tier.perks}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── 수수료 정책 안내 ── */}
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 10 }}>
                      수수료 정책
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(242,242,242,0.6)', lineHeight: 1.8, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>기본 수수료: 20%</span> — 고객 결제 금액에서 플랫폼 수수료가 차감됩니다.
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: '#60a5fa' }}>30건 이상:</span> 수수료 15% |{' '}
                        <span style={{ color: 'var(--gold)' }}>100건 이상:</span> 수수료 12%
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: 'rgba(232,160,32,0.8)' }}>얼리억세스 작가:</span> 론칭 초기 가입 시 수수료 10% 고정 (6개월)
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        정산 주기: 촬영 완료 + 고객 확인 후 영업일 기준 5~7일 내 등록 계좌로 자동 입금
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════ 탭: 예약 관리 ════════════════════ */}
            {activeTab === 'bookings' && (
              <div>
                {/* 상태 필터 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                  {[
                    { id: 'all',       label: `전체 (${bookings.length})` },
                    { id: 'pending',   label: `대기 (${bookings.filter(b => b.status==='pending').length})` },
                    { id: 'confirmed', label: `확정 (${bookings.filter(b => b.status==='confirmed').length})` },
                    { id: 'completed', label: `완료 (${bookings.filter(b => b.status==='completed').length})` },
                    { id: 'cancelled', label: `취소 (${bookings.filter(b => b.status==='cancelled').length})` },
                  ].map(f => (
                    <button key={f.id}
                      className={`filter-btn ${statusFilter === f.id ? 'active' : ''}`}
                      onClick={() => setStatusFilter(f.id)}
                      style={{
                        fontSize: 11,
                        color: f.id === 'pending' && statusFilter !== f.id && bookings.filter(b=>b.status==='pending').length > 0
                          ? '#f0ac2a' : undefined,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filteredBookings.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.08em' }}>
                    해당 상태의 예약이 없습니다
                  </div>
                ) : (
                  filteredBookings.map(b => (
                    <BookingCard key={b.id} b={b} showActions />
                  ))
                )}
              </div>
            )}

            {/* ════════════════════════ 탭: 프로필 편집 ════════════════════ */}
            {activeTab === 'profile' && (
              <div>
                {/* 활동명 — 고객에게 노출되는 대표 이름 */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {c.displayName}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5, fontStyle: 'italic' }}>
                    🔒 활동명은 고객이 작가를 검색·예약할 때 표시되는 이름입니다. 실명은 고객에게 노출되지 않습니다.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 8, display: 'block' }}>
                        {c.nameKo}
                      </label>
                      <input
                        type="text"
                        value={profileNameKo}
                        onChange={e => setProfileNameKo(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                          color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                          boxSizing: 'border-box', outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 8, display: 'block' }}>
                        {c.nameEn}
                      </label>
                      <input
                        type="text"
                        value={profileNameEn}
                        onChange={e => setProfileNameEn(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                          color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                          boxSizing: 'border-box', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 소개글 */}
                <div style={{ marginBottom: 32 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 8, display: 'block', textTransform: 'uppercase' }}>
                    {c.bio}
                  </label>
                  <textarea
                    value={profileBio}
                    onChange={e => setProfileBio(e.target.value)}
                    placeholder="자신의 작가로서의 철학과 스타일을 소개해주세요"
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                      boxSizing: 'border-box', outline: 'none', resize: 'vertical', minHeight: 100,
                    }}
                  />
                </div>

                {/* 언어 */}
                <div style={{ marginBottom: 32 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 12, display: 'block', textTransform: 'uppercase' }}>
                    {c.languages}
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['한국어', 'English', '日本語', '中文'].map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setProfileLanguages(prev =>
                          prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
                        )}
                        style={{
                          padding: '8px 14px', border: `1px solid ${profileLanguages.includes(lang) ? 'var(--gold)' : 'var(--border)'}`,
                          background: profileLanguages.includes(lang) ? 'rgba(232,160,32,0.1)' : 'var(--bg)',
                          color: profileLanguages.includes(lang) ? 'var(--gold)' : 'var(--text)',
                          fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 스냅 필터 태그 */}
                <div style={{ marginBottom: 32 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 12, display: 'block', textTransform: 'uppercase' }}>
                    {c.snapTags}
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* 기본 제공 태그 (한글 라벨) */}
                    {SNAP_FILTER_KEYS.map(tag => {
                      const label = SNAP_FILTER_LABELS[tag]?.ko || tag;
                      const active = profileTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setProfileTags(prev =>
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          )}
                          style={{
                            padding: '8px 14px', border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                            background: active ? 'rgba(232,160,32,0.1)' : 'var(--bg)',
                            color: active ? 'var(--gold)' : 'var(--text)',
                            fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                    {/* 작가가 직접 추가한 커스텀 태그 */}
                    {profileTags.filter(t => !SNAP_FILTER_KEYS.includes(t)).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setProfileTags(prev => prev.filter(t => t !== tag))}
                        style={{
                          padding: '8px 14px', border: '1px solid var(--gold)',
                          background: 'rgba(232,160,32,0.1)', color: 'var(--gold)',
                          fontSize: 12, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
                          cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {tag} <span style={{ fontSize: 10, opacity: 0.7 }}>✕</span>
                      </button>
                    ))}
                  </div>
                  {/* 커스텀 태그 추가 입력 */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      placeholder="커스텀 태그 입력"
                      id="dashboardCustomTagInput"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = sanitizeTag(e.target.value);
                          if (val && !profileTags.includes(val)) {
                            setProfileTags(prev => [...prev, val]);
                            e.target.value = '';
                          } else if (e.target.value.trim() && !val) {
                            alert('사용할 수 없는 태그입니다.');
                            e.target.value = '';
                          }
                        }
                      }}
                      style={{
                        flex: 1, padding: '7px 12px', background: 'var(--bg)',
                        border: '1px solid var(--border)', color: 'var(--text)',
                        fontSize: 12, fontFamily: 'var(--font-serif)', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const inp = document.getElementById('dashboardCustomTagInput');
                        const val = sanitizeTag(inp?.value || '');
                        if (val && !profileTags.includes(val)) {
                          setProfileTags(prev => [...prev, val]);
                          inp.value = '';
                        } else if (inp?.value?.trim() && !val) {
                          alert('사용할 수 없는 태그입니다.');
                          inp.value = '';
                        }
                      }}
                      style={{
                        padding: '7px 14px', background: 'var(--gold)', color: 'var(--bg)',
                        border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
                      }}
                    >
                      추가
                    </button>
                  </div>

                  {/* 선택된 태그 요약 + 개별 삭제 */}
                  {profileTags.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                        선택된 태그 ({profileTags.length})
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {profileTags.map(tag => {
                          const label = SNAP_FILTER_LABELS[tag]?.ko || tag;
                          return (
                            <span
                              key={tag}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '5px 10px', background: 'rgba(232,160,32,0.08)',
                                border: '1px solid rgba(232,160,32,0.3)', fontSize: 11,
                                color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                              }}
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() => setProfileTags(prev => prev.filter(t => t !== tag))}
                                style={{
                                  background: 'none', border: 'none', color: 'var(--gold)',
                                  cursor: 'pointer', padding: 0, fontSize: 12, opacity: 0.6,
                                  lineHeight: 1, display: 'flex', alignItems: 'center',
                                }}
                                title="삭제"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 즉시예약 여부 */}
                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={profileInstantBooking}
                      onChange={e => setProfileInstantBooking(e.target.checked)}
                      style={{ width: 20, height: 20, cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
                        {c.instantBooking}
                      </span>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginBottom: 0, lineHeight: 1.6 }}>
                        ON 시 고객이 작가 승인 없이 바로 예약·결제할 수 있습니다.<br />
                        OFF 시 고객의 예약 요청을 직접 확인 후 승인/거절할 수 있습니다.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 서비스 옵션 */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                    서비스 옵션
                  </div>

                  {/* 헤메 직접 진행 */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
                    <input type="checkbox" checked={profileHmkSelf} onChange={e => setProfileHmkSelf(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>촬영 시 헤어·메이크업을 직접 진행</span>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 0 }}>
                        직접 H&M 서비스를 제공할 수 있는 경우 활성화해주세요.
                      </p>
                    </div>
                  </label>

                  {/* Phosnap 헤메 매칭 — hmkSelf가 꺼진 경우에만 표시 */}
                  {!profileHmkSelf && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
                      <input type="checkbox" checked={profileHmkExternal} onChange={e => setProfileHmkExternal(e.target.checked)}
                        style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>Phosnap H&M 전문가 매칭 희망</span>
                        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 0 }}>
                          Phosnap에 등록된 헤어·메이크업 전문가와 매칭해드립니다.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* 자체 의상 보유 */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={profileDressSelf} onChange={e => setProfileDressSelf(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>자체 촬영용 의상 보유</span>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 0 }}>
                        고객에게 의상 대여 서비스를 제공할 수 있는 경우 활성화해주세요.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 포트폴리오 진위 검증 */}
                <div style={{ marginBottom: 32 }}>
                  <ImageVerification
                    images={(artistData?.portfolio || []).map((url, i) => ({ url, id: `portfolio-${i}` }))}
                    onVerified={(results) => {}}
                  />
                </div>

                {/* 메시지 */}
                {profileMsg && (
                  <div style={{
                    padding: '12px 16px', marginBottom: 20, fontSize: 13,
                    background: profileMsg.includes('실패') ? 'rgba(232,93,93,0.1)' : 'rgba(34,197,94,0.1)',
                    border: `1px solid ${profileMsg.includes('실패') ? 'rgba(232,93,93,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    color: profileMsg.includes('실패') ? '#e85d5d' : '#22c55e',
                  }}>
                    {profileMsg}
                  </div>
                )}

                {/* 저장 버튼 */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    style={{
                      flex: 1, padding: '12px 0', background: 'var(--gold)', border: 'none',
                      color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 13,
                      letterSpacing: '0.08em', cursor: 'pointer', opacity: profileSaving ? 0.6 : 1,
                    }}
                  >
                    {profileSaving ? c.loading : c.save}
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════ 탭: 인사이트 ════════════════════════ */}
            {activeTab === 'insights' && (
              <ArtistInsights artistData={artistData} />
            )}

            {/* ════════════════════════ 탭: 실적 ════════════════════════ */}
            {activeTab === 'stats' && (
              <div>
                {/* 수요 예측 */}
                <DemandForecast bookings={bookings || []} currentPrice={artistData?.price || 300000} />

                {/* 상세 실적 이동 버튼 */}
                <div
                  onClick={() => navigate('/artist/schedule', { state: { openTab: 'performance' } })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', marginBottom: 20,
                    border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.04)',
                    cursor: 'pointer', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,160,32,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,160,32,0.04)'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 4 }}>
                      상세 실적 보기
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      월별 실적, 기간별 조회, 매출 분석 등 더 자세한 데이터를 확인할 수 있습니다
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: 'var(--gold)', marginLeft: 12 }}>→</span>
                </div>

                {/* 등급 시스템 안내 링크 */}
                <div
                  onClick={() => navigate('/artist/grade-system')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', marginBottom: 28,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    cursor: 'pointer', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,160,32,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 4 }}>
                      🏅 작가 등급 시스템
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      등급별 혜택, 승급 조건, 현재 나의 등급 정보를 확인하세요
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: 'var(--gold)', marginLeft: 12 }}>→</span>
                </div>

                {/* 추천 코드 및 혜택 */}
                <ReferralCard userId={user?.id} role="artist" />

                {/* 주요 지표 */}
                <SectionLabel>이번달 실적</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
                  {[
                    { label: '완료 건수',    value: stats.monthDone, suffix: '건',   color: '#22c55e' },
                    { label: '예상 수입',    value: `₩${fmt(stats.monthRev)}`, suffix: '', color: 'var(--gold)' },
                    { label: '대기 중',      value: stats.pending,   suffix: '건',   color: '#f0ac2a' },
                    { label: '누적 완료',    value: completedCount,  suffix: '건',   color: '#60a5fa' },
                  ].map(card => (
                    <div key={card.label} style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 20px', position: 'relative' }}>
                      <Corners />
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 10 }}>{card.label}</div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: card.color }}>
                        {card.value}<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>{card.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 배지 상세 */}
                <SectionLabel>배지 등급 시스템</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 40 }}>
                  {BADGES.map(b => {
                    const isActive = badge.id === b.id;
                    return (
                      <div key={b.id} style={{
                        border: `1px solid ${isActive ? b.color : 'var(--border)'}`,
                        background: isActive ? `${b.color}10` : 'var(--bg2)',
                        padding: '20px 20px', position: 'relative',
                      }}>
                        {isActive && (
                          <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, color: b.color, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
                            현재 등급
                          </div>
                        )}
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: b.color, marginBottom: 8 }}>{b.symbol}</div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.05em', marginBottom: 4 }}>{b.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {b.minShoots}건 이상{b.minRating > 0 ? `, ★${b.minRating}+` : ''}
                        </div>
                        {b.desc && <div style={{ fontSize: 11, color: b.color, marginTop: 6 }}>{b.desc}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* 완료된 예약 목록 */}
                <SectionLabel>완료된 촬영 내역</SectionLabel>
                {bookings.filter(b => b.status === 'completed').length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: 13 }}>
                    완료된 촬영이 없습니다
                  </div>
                ) : (
                  bookings.filter(b => b.status === 'completed').map(b => (
                    <BookingCard key={b.id} b={b} showActions={false} />
                  ))
                )}
              </div>
            )}

            {/* ════════════════════════ 탭: 리뷰 관리 ══════════════════ */}
            {activeTab === 'reviews' && (
              <div>
                <SectionLabel>리뷰 관리</SectionLabel>

                {/* 서브 탭: 작가 리뷰 / 패키지 리뷰 */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
                  {[
                    { id: 'photographer', label: '작가 리뷰', count: artReviews.length },
                    { id: 'package', label: '패키지 리뷰', count: pkgReviews.length },
                  ].map(sub => (
                    <button key={sub.id}
                      onClick={() => setReviewTab(sub.id)}
                      style={{
                        padding: '10px 20px', background: 'transparent', border: 'none',
                        borderBottom: reviewTab === sub.id ? '2px solid var(--gold)' : '2px solid transparent',
                        color: reviewTab === sub.id ? 'var(--gold)' : 'var(--muted)',
                        fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.08em',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {sub.label} ({sub.count})
                    </button>
                  ))}
                </div>

                {/* 리뷰 목록 */}
                {(() => {
                  const reviews = reviewTab === 'photographer' ? artReviews : pkgReviews;
                  const type = reviewTab === 'photographer' ? 'photographer' : 'package';
                  if (reviews.length === 0) {
                    return (
                      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        {/* Icon */}
                        <div style={{ marginBottom: 16 }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" style={{ margin: '0 auto', opacity: 0.6 }}>
                            <path d="M12 2L15.09 8.26H22L17.82 12.88L19.91 19.12L12 15.77L4.09 19.12L6.18 12.88L2 8.26H8.91L12 2Z" />
                          </svg>
                        </div>
                        {/* Main text */}
                        <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-serif)' }}>
                          아직 등록된 리뷰가 없습니다
                        </div>
                        {/* Sub text */}
                        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                          첫 촬영을 완료하면 고객이 리뷰를 남길 수 있습니다
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {reviews.map(rev => {
                        const reply = reviewReplies[rev.id];
                        const isEditing = replyTarget?.reviewId === rev.id;
                        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
                        const dateStr = rev.created_at ? rev.created_at.slice(0, 10).replace(/-/g, '.') : '';
                        // 익명 이름 처리
                        const authorName = rev.author_name
                          || (rev.customer_id ? rev.customer_id.slice(0, 4) + '****' : '고객');
                        return (
                          <div key={rev.id} style={{
                            border: '1px solid var(--border)', background: 'var(--bg2)',
                            padding: '24px 24px 20px', position: 'relative',
                          }}>
                            <Corners />
                            {/* 리뷰 헤더 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <div>
                                <span style={{ color: 'var(--gold)', fontSize: 14, letterSpacing: 2 }}>{stars}</span>
                                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 10 }}>{dateStr}</span>
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
                                {authorName}
                              </span>
                            </div>
                            {/* 리뷰 제목 */}
                            {rev.title && (
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.04em', marginBottom: 8 }}>
                                {rev.title}
                              </div>
                            )}
                            {/* 리뷰 본문 */}
                            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 8 }}>
                              {rev.body || rev.text || ''}
                            </div>
                            {/* 태그 */}
                            {rev.tags?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                {rev.tags.map(tag => (
                                  <span key={tag} style={{
                                    padding: '3px 10px', fontSize: 11,
                                    background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.3)',
                                    color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                                  }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* ── 기존 답글 표시 ── */}
                            {reply && !isEditing && (
                              <div style={{
                                marginTop: 12, padding: '16px 20px',
                                background: 'rgba(232,160,32,0.04)', borderLeft: '3px solid var(--gold)',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>
                                    ✦ 작가 답글
                                  </span>
                                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    {reply.updated_at?.slice(0, 10).replace(/-/g, '.') || reply.created_at?.slice(0, 10).replace(/-/g, '.')}
                                  </span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.8 }}>
                                  {reply.body}
                                </div>
                                <button
                                  onClick={() => {
                                    setReplyTarget({ reviewId: rev.id, reviewType: type, existing: true });
                                    setReplyBody(reply.body);
                                  }}
                                  style={{
                                    marginTop: 10, padding: '6px 14px', background: 'transparent',
                                    border: '1px solid var(--border)', color: 'var(--muted)',
                                    fontSize: 11, fontFamily: 'var(--font-serif)', cursor: 'pointer',
                                  }}
                                >
                                  수정
                                </button>
                              </div>
                            )}

                            {/* ── 답글 작성/수정 영역 ── */}
                            {isEditing && (
                              <div style={{
                                marginTop: 12, padding: '16px 20px',
                                border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.04)',
                              }}>
                                <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', marginBottom: 10 }}>
                                  {replyTarget.existing ? '답글 수정' : '답글 작성'}
                                </div>
                                <textarea
                                  value={replyBody}
                                  onChange={e => setReplyBody(e.target.value)}
                                  placeholder="고객 리뷰에 대한 감사 인사나 답변을 남겨주세요..."
                                  style={{
                                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                                    color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                                    resize: 'vertical', minHeight: 80, lineHeight: 1.7, boxSizing: 'border-box',
                                  }}
                                />
                                {replyMsg && (
                                  <div style={{
                                    fontSize: 12, marginTop: 8,
                                    color: replyMsg.includes('✓') ? '#4ade80' : '#e85d5d',
                                  }}>
                                    {replyMsg}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                  <button
                                    onClick={handleReplySubmit}
                                    disabled={replySaving || !replyBody.trim()}
                                    style={{
                                      padding: '9px 24px', background: 'var(--gold)', border: 'none',
                                      color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 12,
                                      letterSpacing: '0.08em', cursor: 'pointer',
                                      opacity: (replySaving || !replyBody.trim()) ? 0.5 : 1,
                                    }}
                                  >
                                    {replySaving ? '저장 중…' : replyTarget.existing ? '수정 완료' : '답글 등록'}
                                  </button>
                                  <button
                                    onClick={() => { setReplyTarget(null); setReplyBody(''); setReplyMsg(''); }}
                                    style={{
                                      padding: '9px 24px', background: 'transparent',
                                      border: '1px solid var(--border)', color: 'var(--muted)',
                                      fontFamily: 'var(--font-serif)', fontSize: 12, cursor: 'pointer',
                                    }}
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── 답글 달기 버튼 (아직 답글 없을 때) ── */}
                            {!reply && !isEditing && (
                              <button
                                onClick={() => {
                                  setReplyTarget({ reviewId: rev.id, reviewType: type, existing: false });
                                  setReplyBody('');
                                }}
                                style={{
                                  marginTop: 12, padding: '8px 18px',
                                  background: 'rgba(232,160,32,0.08)', border: '1px solid var(--gold-border)',
                                  color: 'var(--gold)', fontSize: 11, fontFamily: 'var(--font-serif)',
                                  letterSpacing: '0.06em', cursor: 'pointer',
                                }}
                              >
                                💬 답글 달기
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ════════════════════════ 탭: 초대 현황 ══════════════════ */}
            {activeTab === 'referral' && (
              <div>
                {/* 내 초대코드 */}
                <div style={{ border: '1px solid var(--gold-border)', background: 'rgba(232,160,32,0.04)', padding: '32px 28px', marginBottom: 32, position: 'relative' }}>
                  <Corners />
                  <SectionLabel>내 초대코드</SectionLabel>
                  {profile?.referral_code ? (
                    <>
                      <div style={{
                        fontFamily: 'var(--font-serif)', fontSize: 32, letterSpacing: '0.2em',
                        color: 'var(--gold)', marginBottom: 12,
                      }}>
                        {profile.referral_code}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                        이 코드를 다른 작가님에게 공유하세요. 초대된 작가가 예약을 완료하면 수수료 할인 혜택을 받으실 수 있습니다.
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(profile.referral_code); }}
                        style={{
                          padding: '10px 24px', background: 'var(--gold)', border: 'none',
                          color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 12,
                          letterSpacing: '0.1em', cursor: 'pointer',
                        }}
                      >
                        코드 복사
                      </button>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                      초대코드는 가입 완료 후 이메일 인증 시 자동 생성됩니다.
                    </div>
                  )}
                </div>

                {/* 초대 현황 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
                  {[
                    { label: '초대한 작가 수',   value: profile?.referral_count     || 0, suffix: '명', color: '#60a5fa'       },
                    { label: '초대 완료 건수',   value: profile?.referral_completed || 0, suffix: '건', color: '#22c55e'       },
                    { label: '현재 수수료 할인', value: profile?.referral_completed >= 20 ? '3%p' : profile?.referral_completed >= 10 ? '2%p' : profile?.referral_completed >= 5 ? '1%p' : '0%', suffix: '', color: 'var(--gold)' },
                  ].map(card => (
                    <div key={card.label} style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 20px', position: 'relative' }}>
                      <Corners />
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 10 }}>{card.label}</div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: card.color }}>
                        {card.value}<span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>{card.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 초대 혜택 구조 — 상승 / 유지 / 실패 / 재상승 */}
                <div style={{ border: '1px solid var(--border)', padding: '24px 28px', background: 'var(--bg2)', position: 'relative' }}>
                  <Corners />
                  <SectionLabel>초대 혜택 구조</SectionLabel>

                  {/* ── 상승 (누적) ── */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.15em', marginBottom: 10, textTransform: 'uppercase' }}>
                      ✔ 상승 (누적)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {[
                        { cond: '초대한 작가 완료 5건', reward: '수수료 -1%p', active: (profile?.referral_completed || 0) >= 5 && (profile?.referral_completed || 0) < 10 },
                        { cond: '초대한 작가 완료 10건', reward: '수수료 -2%p', active: (profile?.referral_completed || 0) >= 10 && (profile?.referral_completed || 0) < 20 },
                        { cond: '초대한 작가 완료 20건', reward: '수수료 -3%p', active: (profile?.referral_completed || 0) >= 20 },
                      ].map((row, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                          opacity: row.active ? 1 : 0.4,
                        }}>
                          <span style={{ fontSize: 13, color: row.active ? 'var(--text)' : 'var(--muted)' }}>{row.cond}</span>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: row.active ? 'var(--gold)' : 'var(--muted)', letterSpacing: '0.04em' }}>
                            {row.active && '▶ '}{row.reward}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── 유지 / 실패 / 재상승 ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {[
                      { title: '✔ 유지', items: ['등급 유효기간: 3개월', '조건: 월 3건 이상'] },
                      { title: '✔ 실패', items: ['미달 시 1단계 하락', '1회 실패 → 유지', '2회 연속 실패 → 하락'] },
                      { title: '✔ 재상승', items: ['최근 30일 5건 달성', '→ 1단계 상승'] },
                    ].map((block, i) => (
                      <div key={i} style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'rgba(232,160,32,0.03)' }}>
                        <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.12em', marginBottom: 8 }}>
                          {block.title}
                        </div>
                        {block.items.map((item, j) => (
                          <div key={j} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>{item}</div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(232,160,32,0.06)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
                    * 초대 인원 제한 없음 · 초대 건수는 초대된 작가의 예약 완료 시 집계됩니다
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* ── 사진 전달 모달 ── */}
      {deliverTarget && (
        <DeliverModal
          booking={deliverTarget}
          onConfirm={handleDeliver}
          onClose={() => setDeliverTarget(null)}
          loading={deliverLoading}
          deliverMsg={deliverMsg}
        />
      )}

      {/* ── 거절 사유 모달 ── */}
      {rejectTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', maxWidth: 440, width: '100%', padding: '36px 32px', position: 'relative' }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.05em', marginBottom: 8 }}>예약 거절</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.7 }}>
              거절 사유를 입력해주세요. 고객에게 전달됩니다.
            </div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="예) 해당 날짜 일정이 불가합니다. 다른 날짜를 선택해주세요."
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, padding: '12px 14px',
                resize: 'vertical', minHeight: 100, lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  flex: 1, padding: '11px 0', background: '#e85d5d', border: 'none',
                  color: '#fff', fontFamily: 'var(--font-serif)', fontSize: 13,
                  letterSpacing: '0.08em', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? '처리 중…' : '거절 확정'}
              </button>
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                style={{
                  flex: 1, padding: '11px 0', background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--muted)',
                  fontFamily: 'var(--font-serif)', fontSize: 13, cursor: 'pointer',
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 채팅 컴포넌트 ── */}
      <Chat bookingId={chatBookingId} isOpen={!!chatBookingId} onClose={() => setChatBookingId(null)} />

      <Footer />
    </div>
  );
};

export default ArtistDashboard;
