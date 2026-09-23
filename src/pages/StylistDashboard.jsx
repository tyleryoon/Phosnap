import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Corners from '../components/Corners';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LocationPicker from '../components/LocationPicker';
import ProviderLocations from '../components/ProviderLocations';
import DressFulfillment from '../components/DressFulfillment';
import ListingStatus from '../components/ListingStatus';
import PendingItems from '../components/PendingItems';
import { getVendorReviews, getAverageRating, formatReview } from '../utils/vendorReviews';
import { getAvatarUrl } from '../lib/supabase';
import ProfileAvatar from '../components/ProfileAvatar';
import { computeSlot } from '../lib/scheduling';
import ScheduleManager from '../components/ScheduleManager';

const i18n = {
  ko: {
    title: '스타일리스트 대시보드',
    back: '뒤로',
    bookings: '예약 현황',
    serviceMenu: '서비스 메뉴 관리',
    profileEdit: '프로필 편집',
    noBookings: '예약이 없습니다',
    customer: '고객',
    date: '날짜',
    status: '상태',
    photographer: '포토그래퍼',
    addService: '서비스 추가',
    serviceName: '서비스 이름',
    price: '가격',
    duration: '소요 시간 (분)',
    myWork: '내 작업',
    schedule: '운영 일정',
    dressRentalDay: '의상 대여 · 당일',
    payout: '실수령',
    collab: '콜라보',
    people: '인',
    description: '설명',
    timing: '시술 시점',
    timingBefore: '촬영 전 완료',
    timingDuring: '촬영 중 합류',
    timingFull: '종일 동행',
    timingBeforeDesc: '샵이나 현장에서 시술을 마치고 촬영에 넘깁니다',
    timingDuringDesc: '촬영 중간에 현장으로 가서 헤어변형·터치업을 합니다',
    timingFullDesc: '촬영 전 시술 후 촬영이 끝날 때까지 현장에 함께 있습니다',
    travelBuffer: '촬영지 이동 시간 (분)',
    travelBufferHint: '촬영 장소에서 바로 시술하면 0을 입력하세요',
    joinAfter: '촬영 시작 후 합류 시점 (분)',
    joinAfterHint: '촬영이 시작되고 몇 분 뒤에 도착하면 되는지',
    maxHours: '감당 가능한 최대 촬영 시간',
    maxHoursHint: '이보다 긴 촬영에는 이 메뉴가 노출되지 않습니다',
    travelFee: '출장비 (선택)',
    slotPreview: '촬영이 16:00~19:00 이라면',
    save: '저장',
    cancel: '취소',
    edit: '편집',
    delete: '삭제',
    noServices: '등록된 서비스가 없습니다',
    displayName: '이름',
    specialty: '전문 분야',
    phone: '전화번호',
    instagram: '인스타그램 핸들',
    location: '활동 지역',
    portfolioImages: '포트폴리오 이미지',
    addImage: '이미지 추가',
    saveProfile: '프로필 저장',
    saving: '저장 중...',
    saved: '저장되었습니다',
    error: '오류가 발생했습니다',
    confirmDelete: '삭제하시겠습니까?',
    deleteService: '서비스 삭제',
    confirmed: '확정',
    pending: '대기',
    completed: '완료',
    cancelled: '취소됨',
    noPhotographer: '미정',
    reviews: '리뷰 관리',
    reviewSummary: '📊 리뷰 요약',
    noReviews: '아직 리뷰가 없습니다',
    noReviewsReceived: '아직 받은 리뷰가 없습니다',
    reviewsAppear: '예약 완료 후 고객의 리뷰가 표시됩니다',
  },
  en: {
    title: 'Stylist Dashboard',
    back: 'Back',
    bookings: 'Bookings',
    serviceMenu: 'Service Menu',
    profileEdit: 'Profile Edit',
    noBookings: 'No bookings yet',
    customer: 'Customer',
    date: 'Date',
    status: 'Status',
    photographer: 'Photographer',
    addService: 'Add Service',
    serviceName: 'Service Name',
    price: 'Price',
    duration: 'Duration (minutes)',
    myWork: 'My part',
    schedule: 'Availability',
    dressRentalDay: 'Dress rental · same day',
    payout: 'Payout',
    collab: 'Collab',
    people: ' people',
    description: 'Description',
    timing: 'When the service happens',
    timingBefore: 'Before the shoot',
    timingDuring: 'Joins during the shoot',
    timingFull: 'Stays all day',
    timingBeforeDesc: 'Finish at the salon or on location, then hand off to the shoot',
    timingDuringDesc: 'Arrive mid-shoot for restyling and touch-ups',
    timingFullDesc: 'Prep before the shoot, then stay on location until it wraps',
    travelBuffer: 'Travel time to location (min)',
    travelBufferHint: 'Enter 0 if you work on location',
    joinAfter: 'Joins after shoot starts (min)',
    joinAfterHint: 'How long after the shoot begins you arrive',
    maxHours: 'Longest shoot you can cover',
    maxHoursHint: 'This menu is hidden for shoots longer than this',
    travelFee: 'Travel fee (optional)',
    slotPreview: 'If the shoot runs 16:00–19:00',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    noServices: 'No services registered',
    displayName: 'Display Name',
    specialty: 'Specialty',
    phone: 'Phone',
    instagram: 'Instagram Handle',
    location: 'Location',
    portfolioImages: 'Portfolio Images',
    addImage: 'Add Image',
    saveProfile: 'Save Profile',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'An error occurred',
    confirmDelete: 'Delete this item?',
    deleteService: 'Delete Service',
    confirmed: 'Confirmed',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noPhotographer: 'TBD',
    reviews: 'Reviews',
    reviewSummary: '📊 Review Summary',
    noReviews: 'No reviews yet',
    noReviewsReceived: 'No reviews received yet',
    reviewsAppear: 'Reviews from customers will appear here after completion',
  },
  ja: {
    title: 'スタイリストダッシュボード',
    back: '戻る',
    bookings: '予約状況',
    serviceMenu: 'サービスメニュー管理',
    profileEdit: 'プロフィール編集',
    noBookings: '予約がありません',
    customer: '顧客',
    date: '日付',
    status: 'ステータス',
    photographer: 'フォトグラファー',
    addService: 'サービス追加',
    serviceName: 'サービス名',
    price: '価格',
    duration: '所要時間（分）',
    myWork: '担当作業',
    schedule: '営業日程',
    dressRentalDay: '衣装レンタル · 当日',
    payout: '受取額',
    collab: 'コラボ',
    people: '名',
    description: '説明',
    timing: '施術タイミング',
    timingBefore: '撮影前に完了',
    timingDuring: '撮影中に合流',
    timingFull: '終日同行',
    timingBeforeDesc: 'サロンまたは現場で施術を終えてから撮影に引き継ぎます',
    timingDuringDesc: '撮影の途中で現場に向かい、ヘアチェンジや直しを行います',
    timingFullDesc: '撮影前の施術後、撮影終了まで現場に同行します',
    travelBuffer: '撮影地への移動時間（分）',
    travelBufferHint: '現場で施術する場合は0を入力してください',
    joinAfter: '撮影開始後の合流時間（分）',
    joinAfterHint: '撮影開始から何分後に到着するか',
    maxHours: '対応可能な最長撮影時間',
    maxHoursHint: 'これより長い撮影ではこのメニューは表示されません',
    travelFee: '出張費（任意）',
    slotPreview: '撮影が16:00〜19:00の場合',
    save: '保存',
    cancel: 'キャンセル',
    edit: '編集',
    delete: '削除',
    noServices: '登録済みサービスなし',
    displayName: '名前',
    specialty: '専門分野',
    phone: '電話番号',
    instagram: 'Instagramハンドル',
    location: '活動地域',
    portfolioImages: 'ポートフォリオ画像',
    addImage: '画像追加',
    saveProfile: 'プロフィール保存',
    saving: '保存中...',
    saved: '保存されました',
    error: 'エラーが発生しました',
    confirmDelete: 'これを削除しますか？',
    deleteService: 'サービス削除',
    confirmed: '確認済み',
    pending: '保留中',
    completed: '完了',
    cancelled: 'キャンセル',
    noPhotographer: '未定',
    reviews: 'レビュー管理',
    reviewSummary: '📊 レビューサマリー',
    noReviews: 'まだレビューがありません',
    noReviewsReceived: 'まだレビューを受け取っていません',
    reviewsAppear: '予約完了後、顧客のレビューがここに表示されます',
  },
  zh: {
    title: '造型师仪表板',
    back: '返回',
    bookings: '预订状态',
    serviceMenu: '服务菜单管理',
    profileEdit: '编辑资料',
    noBookings: '暂无预订',
    customer: '客户',
    date: '日期',
    status: '状态',
    photographer: '摄影师',
    addService: '添加服务',
    serviceName: '服务名称',
    price: '价格',
    duration: '持续时间（分钟）',
    myWork: '我的工作',
    schedule: '营业日程',
    dressRentalDay: '服装租赁 · 当天',
    payout: '实收',
    collab: '合作',
    people: '人',
    description: '描述',
    save: '保存',
    cancel: '取消',
    timing: '服务时间点',
    timingBefore: '拍摄前完成',
    timingDuring: '拍摄中加入',
    timingFull: '全天陪同',
    timingBeforeDesc: '在店内或现场完成造型后交给拍摄',
    timingDuringDesc: '拍摄途中前往现场进行改造型和补妆',
    timingFullDesc: '拍摄前造型后一直陪同到拍摄结束',
    travelBuffer: '前往拍摄地的时间（分钟）',
    travelBufferHint: '如在现场进行造型请填 0',
    joinAfter: '拍摄开始后加入时间（分钟）',
    joinAfterHint: '拍摄开始后多久到达',
    maxHours: '可承接的最长拍摄时间',
    maxHoursHint: '超过此时长的拍摄不会显示此项目',
    travelFee: '出差费（可选）',
    slotPreview: '若拍摄为 16:00–19:00',
    edit: '编辑',
    delete: '删除',
    noServices: '未注册服务',
    displayName: '显示名称',
    specialty: '专业领域',
    phone: '电话',
    instagram: 'Instagram句柄',
    location: '活动地点',
    portfolioImages: '作品集图像',
    addImage: '添加图像',
    saveProfile: '保存资料',
    saving: '保存中...',
    saved: '已保存',
    error: '发生错误',
    confirmDelete: '确定删除吗？',
    deleteService: '删除服务',
    confirmed: '已确认',
    pending: '待定',
    completed: '已完成',
    cancelled: '已取消',
    noPhotographer: '待定',
    reviews: '评价管理',
    reviewSummary: '📊 评价总结',
    noReviews: '还没有评价',
    noReviewsReceived: '还没有收到评价',
    reviewsAppear: '完成预订后，客户评价将显示在这里',
  },
};

const Modal = ({ onClose, children }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--gold-border)',
        maxWidth: 480,
        width: '100%',
        padding: '40px 36px',
        position: 'relative',
      }}
      onClick={e => e.stopPropagation()}
    >
      <Corners />
      {children}
    </div>
  </div>
);

/** 아이템의 실제 작업 시각을 사람이 읽는 형태로 */
const fmtSlot = (item) => {
  if (!item?.start_at) return '';
  const hm = (v) => new Date(v).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  // 의상은 하루 단위 점유라 시각을 보여줄 이유가 없다
  if (item.timing === 'day') return '';
  const base = `${hm(item.start_at)} ~ ${hm(item.end_at)}`;
  const tag = item.timing === 'during' ? ' · 촬영 중 합류'
            : item.timing === 'full'   ? ' · 촬영 종료까지 동행'
            : '';
  return base + tag;
};

const BookingsTab = ({ t, stylistId, stylistName }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // 헤메가 의상 대여도 하면 같은 예약에서 시술과 의상 두 아이템을
        // 맡는다. 역할별로 따로 조회하면 카드가 두 장으로 쪼개지고,
        // 의상 예약은 볼 화면 자체가 없었다.
        const { getMyProviderBookings } = await import('../lib/supabase');
        // 이 함수들은 { data, error } 를 반환한다. 배열로 취급하면
        // 목록이 비거나 객체가 렌더링되어 화면이 멈춘다.
        const { data } = await getMyProviderBookings();
        setBookings(data || []);
      } catch {
        const cached = localStorage.getItem(`bookings_${stylistId}`);
        if (cached) {
          setBookings(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    };

    if (stylistId) {
      fetchBookings();
    }
  }, [stylistId]);

  const getStatusColor = status => {
    switch (status) {
      case 'confirmed':
        return 'var(--success)';
      case 'pending':
        return 'var(--gold)';
      case 'completed':
        return 'var(--muted)';
      case 'cancelled':
        return 'var(--danger)';
      default:
        return 'var(--muted)';
    }
  };

  const getStatusLabel = status => {
    const statusMap = {
      confirmed: t.confirmed,
      pending: t.pending,
      completed: t.completed,
      cancelled: t.cancelled,
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)', padding: 32 }}>{t.noBookings}</div>;
  }

  if (!bookings.length) {
    return <div style={{ color: 'var(--muted)', padding: 32 }}>{t.noBookings}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 24, padding: '24px 0' }}>
      {bookings.map(booking => (
        <div
          key={booking.id}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            padding: 24,
            position: 'relative',
          }}
        >
          <Corners />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.customer}</div>
              <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                {booking.customer_name || 'N/A'}
              </div>
            </div>
            <div>
              {/* booking_date 라는 컬럼은 없다. 예전에는 Invalid Date 가 떴다. */}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.date}</div>
              <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                {booking.date || '-'}{booking.time ? ` · ${booking.time}` : ''}
              </div>
            </div>
          </div>

          {/* 내가 맡은 시술 — 헤메가 실제로 알아야 하는 정보.
              예전에는 카드에 시술명도 시각도 금액도 없었다. */}
          {(booking.myItems || []).length > 0 && (
            <div style={{ marginBottom: 16, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{t.myWork}</div>
              {booking.myItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  gap: 12, marginBottom: 8, flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                      {item.item_name}
                      {item.item_option ? ` · ${item.item_option}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--accent-a50)', marginTop: 2 }}>
                      {/* 의상은 하루 단위 점유라 시각 대신 대여 표시 */}
                      {item.timing === 'day' ? t.dressRentalDay : fmtSlot(item)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      ₩{Number(item.price ?? 0).toLocaleString('ko-KR')}
                    </div>
                    {item.payout_amount != null && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {t.payout} ₩{Number(item.payout_amount).toLocaleString('ko-KR')}
                        {item.commission_rate != null
                          ? ` (${Math.round(item.commission_rate * 1000) / 10}%)`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {booking.collab_count > 1 && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                  {t.collab} {booking.collab_count}{t.people}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.photographer}</div>
              <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                {booking.photographer_name || t.noPhotographer}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.status}</div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: getStatusColor(booking.status),
                  color: booking.status === 'pending' ? 'var(--bg)' : '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 4,
                }}
              >
                {getStatusLabel(booking.status)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── 의상 대여 탭 (헤메가 의상도 함께 대여하는 경우) ──────────────────
// 별도 테이블을 만들지 않고 벤더와 동일한 dress_vendors / dress_items 를
// 사용한다. 고객 예약의 의상 조회 로직을 그대로 재사용할 수 있다.
// 헤메 자체 의상 관리.
//
// 예전에는 여기서 dress_vendors 레코드를 만들어 벤더로 둔갑시켰다.
// 그런데 역할 가드(FIX_23) 때문에 vendor 역할이 없는 헤메는 그 insert 가
// RLS 에 막힌다. 버튼은 있는데 눌러도 안 되는 상태였다.
//
// 이제 dress_items 에 stylist_id 로 바로 붙인다 (FIX_33).
// 역할도 하나(stylist)로 유지되고, 승인·전환 UI 도 그대로다.
const DressRentalTab = ({ t, lang, stylistProfile }) => {
  const stylistId = stylistProfile?.id || null;
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nameKo: '', nameEn: '', price: '', size: 'M', stock: '1', color: '', description: '', fulfillment: ['byOwner'], deposit: 0, deliveryFee: 0 });

  // 자체 의상 보유 여부와 등록된 의상을 읽어온다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stylistId) { setLoading(false); return; }
      try {
        const { getStylistDresses } = await import('../lib/supabase');
        const { data, error } = await getStylistDresses(stylistId);
        if (cancelled) return;
        if (error) {
          // 조용히 "의상 없음" 으로 보이면 안 된다. 등록해둔 게 사라진 줄 안다.
          setErrorMsg(`의상 목록을 불러오지 못했습니다 — ${error.message}`);
        } else {
          setItems(data || []);
        }
        // 가입 때 "보유" 로 답했거나, 이미 의상을 올렸으면 켜진 상태다.
        setEnabled(stylistProfile?.dress_self === true || (data || []).length > 0);
      } catch (e) {
        console.error('[StylistDashboard] 의상 정보 로드 실패:', e);
        if (!cancelled) setErrorMsg(e?.message || t.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [stylistId, stylistProfile?.dress_self]);

  // 의상 대여 활성화 — stylists.dress_self 를 켠다.
  // 벤더 레코드를 만들지 않으므로 역할은 stylist 하나 그대로다.
  const handleEnable = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const { setStylistDressSelf } = await import('../lib/supabase');
      const { error } = await setStylistDressSelf(stylistId, true);
      if (error) throw error;
      setEnabled(true);
    } catch (e) {
      console.error('[StylistDashboard] 의상 대여 활성화 실패:', e);
      setErrorMsg(e?.message || t.error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!form.nameKo.trim() || !form.price) {
      setErrorMsg('의상명과 가격을 입력해주세요.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const { addStylistDress } = await import('../lib/supabase');
      const sizes = form.size.split(',').map(s => s.trim()).filter(Boolean);
      const { data, error } = await addStylistDress(stylistId, {
        name_ko:    form.nameKo.trim(),
        name_en:    form.nameEn.trim() || null,
        category:   'traditional',
        price:      parseInt(String(form.price).replace(/[^0-9]/g, ''), 10) || 0,
        sizes,
        size_stock: sizes.reduce((acc, sz) => ({ ...acc, [sz]: parseInt(form.stock, 10) || 0 }), {}),
        color:      form.color.trim() || null,
        description: form.description.trim() || null,
        // 주인이 들고 가는 옷에는 보증금이 없다. 픽업·배송을 켜야 받는다.
        fulfillment:  form.fulfillment?.length ? form.fulfillment : ['byOwner'],
        deposit:      form.fulfillment?.some(m => m !== 'byOwner') ? (form.deposit ?? 0) : 0,
        delivery_fee: form.fulfillment?.includes('delivery') ? (form.deliveryFee ?? 0) : 0,
      });
      if (error) throw error;
      setItems(prev => [...prev, data]);
      setModalOpen(false);
      setForm({ nameKo: '', nameEn: '', price: '', size: 'M', stock: '1', color: '', description: '', fulfillment: ['byOwner'], deposit: 0, deliveryFee: 0 });
    } catch (e) {
      console.error('[StylistDashboard] 의상 등록 실패:', e);
      setErrorMsg(e?.message || t.error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { deleteVendorDress } = await import('../lib/supabase');
      const { error } = await deleteVendorDress(id);
      if (error) throw error;
      setItems(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      console.error('[StylistDashboard] 의상 삭제 실패:', e);
      setErrorMsg(e?.message || t.error);
    }
  };

  const label = { display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6 };
  const input = {
    width: '100%', padding: '10px 12px', background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--gold-dim)', boxSizing: 'border-box', fontSize: 14,
  };

  if (loading) return <div style={{ color: 'var(--muted)', padding: 32 }}>…</div>;

  if (!enabled) {
    return (
      <div style={{ padding: '32px 0', maxWidth: 560 }}>
        <div style={{ border: '1px solid var(--gold-border)', padding: '28px 24px', position: 'relative' }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 10 }}>
            의상 대여도 함께 하시나요?
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
            헤어메이크업과 함께 한복·드레스를 대여하신다면 활성화해주세요.
            고객이 촬영을 예약할 때 의상 단계에서 회원님의 의상을 선택할 수 있습니다.
            활동 지역과 연락처는 프로필 정보를 그대로 사용합니다.
          </p>
          {errorMsg && (
            <div style={{ padding: '10px 14px', marginBottom: 14, border: '1px solid rgba(232,80,80,0.3)', background: 'rgba(232,80,80,0.06)', color: 'var(--danger)', fontSize: 13 }}>
              {errorMsg}
            </div>
          )}
          <button
            onClick={handleEnable}
            disabled={saving}
            style={{
              padding: '12px 28px', background: 'var(--gold)', color: 'var(--bg)',
              border: 'none', cursor: saving ? 'default' : 'pointer', fontWeight: 600,
              fontSize: 14, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? t.saving : '의상 대여 활성화'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          marginBottom: 24, padding: '12px 24px', background: 'var(--gold)',
          color: 'var(--bg)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
        }}
      >
        의상 추가
      </button>

      {errorMsg && (
        <div style={{ padding: '12px 16px', marginBottom: 16, border: '1px solid rgba(232,80,80,0.3)', background: 'rgba(232,80,80,0.06)', color: 'var(--danger)', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {!items.length ? (
        <div style={{ color: 'var(--muted)', padding: 32 }}>등록된 의상이 없습니다</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {items.map(it => (
            <div key={it.id} style={{ border: '1px solid var(--border)', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, marginBottom: 6 }}>{it.name_ko}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {(it.sizes || []).join(', ')}{it.color ? ` · ${it.color}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 8 }}>
                  ₩{Number(it.price ?? 0).toLocaleString('ko-KR')}
                </div>
                <button
                  onClick={() => handleDelete(it.id)}
                  style={{ fontSize: 12, color: 'var(--danger)', background: 'transparent', border: '1px solid rgba(232,80,80,0.25)', padding: '4px 10px', cursor: 'pointer' }}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, marginBottom: 22 }}>의상 추가</div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={label}>의상명 (한글) *</label>
              <input style={input} value={form.nameKo} onChange={e => setForm({ ...form, nameKo: e.target.value })} />
            </div>
            <div>
              <label style={label}>의상명 (영문)</label>
              <input style={input} value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>가격 (원) *</label>
                <input style={input} type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label style={label}>색상</label>
                <input style={input} value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>사이즈 (쉼표로 구분)</label>
                <input style={input} value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} />
              </div>
              <div>
                <label style={label}>사이즈별 수량</label>
                <input style={input} type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={label}>{t.description}</label>
              <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* 수령 방식 · 보증금. 현장에 들고 가면 옷이 손을 떠나지
                않으므로 보증금이 없다 (FIX_43). */}
            <div style={{ marginTop: 20 }}>
              <DressFulfillment
                value={{ fulfillment: form.fulfillment, deposit: form.deposit, deliveryFee: form.deliveryFee }}
                onChange={next => setForm({ ...form, ...next })}
                allowByOwner
                lang={lang}
              />
            </div>
          </div>
          {errorMsg && (
            <div style={{ marginTop: 14, color: 'var(--danger)', fontSize: 13 }}>{errorMsg}</div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button
              onClick={handleAddItem}
              disabled={saving}
              style={{ flex: 1, padding: '12px', background: 'var(--gold)', color: 'var(--bg)', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? t.saving : t.save}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              {t.cancel}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const ServiceMenuTab = ({ t, lang, stylistId }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const EMPTY_FORM = {
    serviceName: '',
    price: '',
    duration: '',
    description: '',
    // 시술 시점에 따라 점유 구간이 완전히 달라진다.
    // 촬영 16:00 기준 — before 는 그 전에 끝나야 하고,
    // during 은 아직 시작도 하지 않았다.
    timing: 'before',
    offsetMinutes: '30',
    maxHours: '',
    travelFee: '',
  };
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { getStylistServices } = await import('../lib/supabase');
        const { data } = await getStylistServices(stylistId);
        setServices(data || []);
      } catch {
        const cached = localStorage.getItem(`services_${stylistId}`);
        if (cached) {
          setServices(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    };

    if (stylistId) {
      fetchServices();
    }
  }, [stylistId]);

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        serviceName: service.name_ko ?? service.name ?? '',
        price: String(service.price ?? ''),
        duration: String(service.duration_minutes ?? service.duration ?? 60),
        description: service.description ?? '',
        timing: service.timing ?? 'before',
        offsetMinutes: String(service.offset_minutes ?? 30),
        maxHours: service.max_hours != null ? String(service.max_hours) : '',
        travelFee: service.travel_fee ? String(service.travel_fee) : '',
      });
    } else {
      setEditingService(null);
      setFormData(EMPTY_FORM);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingService(null);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    try {
      const { createStylistService, updateStylistService } = await import('../lib/supabase');

      // 컬럼명은 name_ko / duration_minutes 다.
      // name / duration 으로 보내면 42703 으로 저장이 실패한다.
      const payload = {
        name_ko:          formData.serviceName,
        price:            parseInt(String(formData.price).replace(/[^0-9]/g, ''), 10) || 0,
        duration_minutes: parseInt(formData.duration, 10) || 60,
        description:      formData.description || '',
        stylist_id:       stylistId,
        // 예약 시 점유 구간을 계산하는 값들.
        // 이게 없으면 모든 시술이 "촬영 전 완료"로 취급돼
        // 헤어변형과 종일 동행을 등록할 수 없다.
        timing:           formData.timing || 'before',
        offset_minutes:   Math.max(0, parseInt(formData.offsetMinutes, 10) || 0),
        max_hours:        formData.timing === 'full' && formData.maxHours
                            ? Number(formData.maxHours)
                            : null,
        travel_fee:       parseInt(String(formData.travelFee).replace(/[^0-9]/g, ''), 10) || 0,
      };

      let nextServices;
      if (editingService) {
        const { error } = await updateStylistService(editingService.id, payload);
        if (error) throw error;
        nextServices = services.map(s =>
          s.id === editingService.id ? { ...s, ...payload } : s
        );
      } else {
        // 반환값은 { data, error } 객체다. 예전에는 이걸 그대로 목록에 넣어
        // 렌더링 시 화면이 멈췄다.
        const { data: created, error } = await createStylistService(payload);
        if (error) throw error;
        nextServices = [...services, created];
      }

      setServices(nextServices);
      // 갱신 전 services 를 저장하던 버그 수정 (한 박자 늦게 기록됨)
      localStorage.setItem(`services_${stylistId}`, JSON.stringify(nextServices));
      closeModal();
    } catch (error) {
      // alert 는 브라우저를 블로킹해 화면이 멈춘 것처럼 보인다.
      console.error('[StylistDashboard] 서비스 저장 실패:', error);
      setErrorMsg(`${t.error} — ${error?.message || ''}`);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const { deleteStylistService } = await import('../lib/supabase');
      await deleteStylistService(serviceId);
      setServices(services.filter(s => s.id !== serviceId));
      localStorage.setItem(`services_${stylistId}`, JSON.stringify(services));
    } catch (error) {
      console.error('[StylistDashboard] 서비스 삭제 실패:', error);
      setErrorMsg(t.error);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)', padding: 32 }}>{t.noServices}</div>;
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <button
        onClick={() => openModal()}
        style={{
          marginBottom: 32,
          padding: '12px 24px',
          background: 'var(--gold)',
          color: 'var(--bg)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: 0.5,
        }}
      >
        {t.addService}
      </button>

      {errorMsg && (
        <div style={{ padding: '12px 16px', marginBottom: 16, border: '1px solid rgba(232,80,80,0.3)', background: 'rgba(232,80,80,0.06)', color: 'var(--danger)', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {!services.length ? (
        <div style={{ color: 'var(--muted)', padding: 32 }}>{t.noServices}</div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {services.map(service => (
            <div
              key={service.id}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                padding: 24,
                position: 'relative',
              }}
            >
              <Corners />
              <div style={{ marginBottom: 16 }}>
                <h3
                  style={{
                    color: 'var(--text)',
                    fontSize: 18,
                    fontFamily: 'var(--font-serif)',
                    marginBottom: 8,
                  }}
                >
                  {service.name_ko ?? service.name}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                  {service.description}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.price}</div>
                  <div style={{ color: 'var(--gold)', fontWeight: 600 }}>₩{Number(service.price ?? 0).toLocaleString('ko-KR')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.duration}</div>
                  <div style={{ color: 'var(--text)' }}>{service.duration_minutes ?? service.duration}분</div>
                </div>
              </div>
              {/* 시술 시점 — 고객에게 안내되는 내용이라 목록에서도 확인할 수 있어야 한다 */}
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  fontSize: 12,
                  color: 'var(--accent-a50)',
                  border: '1px solid var(--accent-a30)',
                }}>
                  {service.timing === 'during' ? t.timingDuring
                    : service.timing === 'full' ? t.timingFull
                    : t.timingBefore}
                  {service.timing === 'full' && service.max_hours
                    ? ` · ~${service.max_hours}h`
                    : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => openModal(service)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--gold)',
                    color: 'var(--bg)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {t.edit}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <h2
            style={{
              color: 'var(--text)',
              fontSize: 20,
              fontFamily: 'var(--font-serif)',
              marginBottom: 24,
            }}
          >
            {editingService ? t.edit : t.addService}
          </h2>
          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            <input
              type="text"
              placeholder={t.serviceName}
              value={formData.serviceName}
              onChange={e => setFormData({ ...formData, serviceName: e.target.value })}
              style={{
                padding: 12,
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
              }}
            />
            <input
              type="number"
              placeholder={t.price}
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              style={{
                padding: 12,
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
              }}
            />
            <input
              type="number"
              placeholder={t.duration}
              value={formData.duration}
              onChange={e => setFormData({ ...formData, duration: e.target.value })}
              style={{
                padding: 12,
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
              }}
            />

            {/* ── 시술 시점 ──────────────────────────────────────────
                촬영 16:00 기준으로 세 유형의 시각이 전혀 다르다.
                이 값이 없으면 모든 시술이 "촬영 전 완료"가 되어
                헤어변형과 종일 동행을 등록할 수 없다. */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{t.timing}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { key: 'before', label: t.timingBefore, desc: t.timingBeforeDesc },
                  { key: 'during', label: t.timingDuring, desc: t.timingDuringDesc },
                  { key: 'full',   label: t.timingFull,   desc: t.timingFullDesc },
                ].map(opt => {
                  const on = formData.timing === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFormData(f => ({
                        ...f,
                        timing: opt.key,
                        // 동행은 이미 현장이라 이동 버퍼가 없다.
                        // 기본값을 옮겨주지 않으면 "이동 30분"이 그대로 남는다.
                        offsetMinutes: opt.key === 'during' ? '30'
                                     : opt.key === 'full'   ? '0'
                                     : f.offsetMinutes,
                      }))}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        cursor: 'pointer',
                        background: on ? 'var(--accent-a10)' : 'var(--bg)',
                        border: `1px solid ${on ? 'var(--accent-a50)' : 'var(--border)'}`,
                        color: 'var(--text)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      <div style={{ fontSize: 14, marginBottom: 4 }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 이동 버퍼 / 합류 시점 */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                {formData.timing === 'during' ? t.joinAfter : t.travelBuffer}
              </div>
              <input
                type="number"
                min="0"
                value={formData.offsetMinutes}
                onChange={e => setFormData({ ...formData, offsetMinutes: e.target.value })}
                style={{
                  padding: 12,
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {formData.timing === 'during' ? t.joinAfterHint : t.travelBufferHint}
              </div>
            </div>

            {/* 종일 동행 전용 — 감당 가능한 최대 촬영 길이 */}
            {formData.timing === 'full' && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.maxHours}</div>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.maxHours}
                  onChange={e => setFormData({ ...formData, maxHours: e.target.value })}
                  style={{
                    padding: 12,
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t.maxHoursHint}</div>
              </div>
            )}

            {/* 출장비 (선택) */}
            {formData.timing !== 'before' && (
              <input
                type="number"
                placeholder={t.travelFee}
                value={formData.travelFee}
                onChange={e => setFormData({ ...formData, travelFee: e.target.value })}
                style={{
                  padding: 12,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                }}
              />
            )}

            {/* 실제로 몇 시에 묶이는지 바로 보여준다 */}
            <div style={{ padding: 12, background: 'var(--bg)', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{t.slotPreview}</div>
              {(() => {
                const slot = computeSlot({
                  timing: formData.timing,
                  shootStart: new Date('2026-01-01T16:00:00'),
                  shootEnd:   new Date('2026-01-01T19:00:00'),
                  durationMinutes: parseInt(formData.duration, 10) || 60,
                  offsetMinutes:   parseInt(formData.offsetMinutes, 10) || 0,
                });
                if (!slot) return null;
                const hm = d => d.toTimeString().slice(0, 5);
                const same = hm(slot.busyStart) === hm(slot.start)
                          && hm(slot.busyEnd)   === hm(slot.end);
                return (
                  <>
                    <div style={{ fontSize: 14, color: 'var(--text)' }}>
                      {lang === 'ko' ? '시술' : 'Service'} {hm(slot.start)} ~ {hm(slot.end)}
                    </div>
                    {!same && (
                      <div style={{ fontSize: 12, color: 'var(--accent-a50)', marginTop: 4 }}>
                        {lang === 'ko' ? '일정 점유' : 'Blocked'} {hm(slot.busyStart)} ~ {hm(slot.busyEnd)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <textarea
              placeholder={t.description}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              style={{
                padding: 12,
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                minHeight: 100,
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={closeModal}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                background: 'var(--gold)',
                color: 'var(--bg)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const ProfileEditTab = ({ t, stylistId }) => {
  const { lang } = useLanguage();
  const [profile, setProfile] = useState({
    displayName: '',
    specialty: '',
    phone: '',
    instagram: '',
    location: null,
    portfolioImages: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getStylistProfile } = await import('../lib/supabase');
        const { data, error } = await getStylistProfile(stylistId);
        if (error) throw new Error(error.message);
        if (data) {
          setProfile({
            displayName: data.display_name || '',
            specialty: data.specialty || '',
            phone: data.phone || '',
            instagram: data.instagram || '',
            location: data.location_id ? {
              countryCode: data.country_code || 'KR',
              city: data.city || '',
              locationId: data.location_id,
            } : null,
            portfolioImages: data.portfolio_images || [],
          });
        }
      } catch (err) {
        // 예전에는 localStorage 캐시로 폴백했다. 그러면 DB 에 저장되지
        // 않은 값을 화면에 띄우고, 헤메는 저장된 줄 안다.
        // 못 읽었으면 못 읽었다고 해야 한다.
        console.error('[StylistDashboard] 프로필 조회 실패:', err);
        setSaveStatus('error');
      }
    };

    if (stylistId) {
      fetchProfile();
    }
  }, [stylistId]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      const { updateStylistProfile } = await import('../lib/supabase');
      // error 를 안 받으면 저장이 실패해도 '저장되었습니다' 가 뜬다.
      // 헤메는 저장된 줄 알고 화면을 닫는다.
      const { error } = await updateStylistProfile(stylistId, {
        display_name: profile.displayName,
        specialty: profile.specialty,
        phone: profile.phone,
        instagram: profile.instagram,
        location_id: profile.location?.locationId || null,
        country_code: profile.location?.countryCode || 'KR',
        city: profile.location?.city || null,
        portfolio_images: profile.portfolioImages,
      });
      if (error) throw new Error(error.message);

      // 대표 지역은 활동 지역 목록에도 들어가야 한다. 이게 없으면
      // 대표 지역을 바꿔도 provider_locations 에는 옛 지역만 남아
      // 옮겨간 도시의 촬영 검색에 안 나온다.
      if (profile.location?.locationId) {
        const { addProviderLocation } = await import('../lib/supabase');
        await addProviderLocation('stylist', stylistId, profile.location.locationId);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('[StylistDashboard] 프로필 저장 실패:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px 0', maxWidth: 600 }}>
      <div style={{ display: 'grid', gap: 24, marginBottom: 32 }}>
        <div>
          <label
            style={{
              display: 'block',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {t.displayName}
          </label>
          <input
            type="text"
            value={profile.displayName}
            onChange={e => setProfile({ ...profile, displayName: e.target.value })}
            style={{
              width: '100%',
              padding: 12,
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {t.specialty}
          </label>
          <textarea
            value={profile.specialty}
            onChange={e => setProfile({ ...profile, specialty: e.target.value })}
            style={{
              width: '100%',
              padding: 12,
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              minHeight: 100,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {t.phone}
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={e => setProfile({ ...profile, phone: e.target.value })}
            style={{
              width: '100%',
              padding: 12,
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {t.instagram}
          </label>
          <input
            type="text"
            placeholder="@username"
            value={profile.instagram}
            onChange={e => setProfile({ ...profile, instagram: e.target.value })}
            style={{
              width: '100%',
              padding: 12,
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {t.location}
          </label>
          <LocationPicker
            value={profile.location}
            onChange={location => setProfile({ ...profile, location })}
            lang={lang}
          />
        </div>

        {/* 활동 지역 — 대표 지역 외에 더 뛰는 도시를 여기서 더한다.
            여기 없는 지역의 촬영에는 검색 결과에 나오지 않는다. */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          <ProviderLocations
            providerType="stylist"
            providerId={stylistId}
            baseLocationId={profile.location?.locationId || null}
            lang={lang}
          />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            color: 'var(--text)',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {t.portfolioImages}
        </div>
        {profile.portfolioImages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {profile.portfolioImages.map((img, idx) => (
              <div
                key={idx}
                style={{
                  aspectRatio: '1',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                <button
                  onClick={() =>
                    setProfile({
                      ...profile,
                      portfolioImages: profile.portfolioImages.filter((_, i) => i !== idx),
                    })
                  }
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 28,
                    height: 28,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            const url = prompt('Image URL:');
            if (url) {
              setProfile({
                ...profile,
                portfolioImages: [...profile.portfolioImages, url],
              });
            }
          }}
          style={{
            padding: '10px 16px',
            background: 'var(--gold-dim)',
            color: 'var(--gold)',
            border: '1px solid var(--gold)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {t.addImage}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          style={{
            padding: '12px 28px',
            background: 'var(--gold)',
            color: 'var(--bg)',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 14,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? t.saving : t.saveProfile}
        </button>
        {saveStatus === 'saved' && (
          <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 500 }}>{t.saved}</div>
        )}
        {saveStatus === 'error' && (
          <div style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 500 }}>{t.error}</div>
        )}
      </div>
    </div>
  );
};

export default function StylistDashboard() {
  const navigate = useNavigate();
  // LanguageContext 가 노출하는 키는 lang 이다. language 로 받으면 항상
  // undefined 가 되어 i18n.en 으로 폴백, 한국어 사용자에게도 영어가 나온다.
  const { lang: language } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0, count: 0 });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const t = i18n[language] || i18n.en;

  // stylists.id 는 auth 유저 id 와 다른 값이다.
  // stylist_services / stylist_schedules / 예약 조회가 모두 stylists.id 를
  // 기준으로 하므로 여기서 공개 레코드를 찾아(없으면 만들어) 그 id 를 쓴다.
  const [stylistId, setStylistId] = useState(null);
  // 의상 대여 탭에서 지역·연락처를 승계하기 위해 레코드 전체를 보관한다.
  const [stylistProfile, setStylistProfile] = useState(null);
  const [stylistLoading, setStylistLoading] = useState(true);
  const stylistName = user?.name || user?.email;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setStylistLoading(false); return; }
      try {
        const { ensureArtistRecord } = await import('../lib/supabase');
        const { data } = await ensureArtistRecord(user.id, {
          artistType: 'hmk',
          nativeName: user?.name || '',
        });
        if (!cancelled && data?.id) {
          setStylistId(data.id);
          setStylistProfile(data);
        }
      } catch (e) {
        console.error('[StylistDashboard] stylist 레코드 확보 실패:', e);
      } finally {
        if (!cancelled) setStylistLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load stylist reviews + avatar on mount
  useEffect(() => {
    const loadData = async () => {
      const [stylistReviews, stats, avatar] = await Promise.all([
        getVendorReviews('stylist'),
        getAverageRating('stylist'),
        getAvatarUrl(),
      ]);
      setReviews(stylistReviews);
      setReviewStats(stats);
      if (avatar) setAvatarUrl(avatar);
    };
    loadData();
  }, []);

  if (stylistLoading) {
    return (
      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '100px 40px 40px' }}>
        …
      </div>
    );
  }

  if (!stylistId) {
    return (
      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '100px 40px 40px' }}>
        {t.error}
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 100, paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 32,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeftIcon size={20} />
          </button>
          <ProfileAvatar
            avatarUrl={avatarUrl}
            onAvatarChange={(url) => setAvatarUrl(url)}
            size={60}
            editable={true}
          />
          <h1
            style={{
              color: 'var(--text)',
              fontSize: 32,
              fontFamily: 'var(--font-serif)',
              margin: 0,
            }}
          >
            {t.title}
          </h1>
          {/* 고객에게 어떻게 보이는지 확인. 공급자가 자기 노출 상태를
              알 방법이 없었다. */}
          {stylistId && (
            <Link to={`/stylist/${stylistId}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14,
              padding: '9px 18px', border: '1px solid var(--border)',
              color: 'var(--muted)', fontFamily: 'var(--font-serif)',
              fontSize: 12, letterSpacing: '0.08em', textDecoration: 'none',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-border)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              👁 고객에게 보이는 내 페이지 →
            </Link>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 24,
            borderBottom: '1px solid var(--border)',
            marginBottom: 32,
          }}
        >
          {[
            { id: 'bookings', label: t.bookings },
            { id: 'serviceMenu', label: t.serviceMenu },
            { id: 'schedule', label: t.schedule },
            { id: 'dressRental', label: '의상 대여' },
            { id: 'profileEdit', label: t.profileEdit },
            { id: 'reviews', label: t.reviews },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '16px 0',
                color: activeTab === tab.id ? 'var(--gold)' : 'var(--muted)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : 'transparent',
                letterSpacing: 0.5,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 고객에게 보이고 있는지. 승인만으로는 노출되지 않는다 —
            지역과 시술 메뉴도 있어야 한다 (FIX_35). */}
        <ListingStatus kind="stylist" id={stylistId} />

        {/* 헤메는 예전에 수락·거절 기능이 아예 없었다.
            작가가 수락하면 자기 항목까지 확정돼 있었다 (FIX_40). */}
        <PendingItems onChanged={() => window.location.reload()} />

        {activeTab === 'bookings' && <BookingsTab t={t} stylistId={stylistId} stylistName={stylistName} />}
        {/* 이 컴포넌트는 useLanguage() 를 `language` 로 받는다.
            lang={lang} 로 넘기면 ReferenceError 로 탭 전체가 크래시한다. */}
        {activeTab === 'serviceMenu' && <ServiceMenuTab t={t} lang={language} stylistId={stylistId} />}
        {activeTab === 'schedule' && (
          <ScheduleManager providerType="stylist" providerId={stylistId} lang={language} />
        )}
        {activeTab === 'dressRental' && <DressRentalTab t={t} lang={language} stylistProfile={stylistProfile} />}
        {activeTab === 'profileEdit' && <ProfileEditTab t={t} stylistId={stylistId} />}

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
                {t.reviewSummary}
              </div>
            </div>

            {/* Reviews Card */}
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
                💇 {language === 'ko' ? '헤어메이크업' : language === 'ja' ? 'ヘアメイク' : language === 'zh' ? '造型师' : 'Hair & Makeup'}
              </div>

              {(() => {
                const { avg, count } = reviewStats;

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
                        {avg.toFixed(1)} ({count}{language === 'ko' ? '건' : language === 'ja' ? '件' : ''})
                      </div>
                    </div>

                    {reviews.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        color: 'var(--muted)',
                        fontSize: 13,
                      }}>
                        {t.noReviews}
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
                        {reviews.map((review) => {
                          const formattedReview = formatReview(review, language);
                          return (
                            <div
                              key={review.id}
                              style={{
                                borderLeft: '2px solid var(--gold)',
                                paddingLeft: '1rem',
                                paddingTop: '0.5rem',
                                paddingBottom: '0.5rem',
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
                                        backgroundColor: 'var(--accent-a10)',
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
                                }}>
                                  "{review.text}"
                                </div>
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
                                  {language === 'ko' ? '📄 원본 리뷰 보기' : language === 'ja' ? '📄 元レビューを見る' : '📄 View Original Review'}
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

            {reviews.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                backgroundColor: 'var(--bg2)',
                border: '1px dashed var(--border)',
                marginTop: '2rem',
              }}>
                <div style={{
                  fontSize: 14,
                  color: 'var(--muted)',
                  marginBottom: '0.5rem',
                }}>
                  {t.noReviewsReceived}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                }}>
                  {t.reviewsAppear}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
