import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LocationPicker from '../components/LocationPicker';
import { getVendorReviews, getAverageRating, formatReview } from '../utils/vendorReviews';
import { getAvatarUrl } from '../lib/supabase';
import ProfileAvatar from '../components/ProfileAvatar';

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
    description: '설명',
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
    description: 'Description',
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
    description: '説明',
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
    description: '描述',
    save: '保存',
    cancel: '取消',
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

const BookingsTab = ({ t, stylistId, stylistName }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { getStylistBookings } = await import('../lib/supabase');
        const data = await getStylistBookings(stylistId);
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
        return '#48bb78';
      case 'pending':
        return 'var(--gold)';
      case 'completed':
        return 'var(--muted)';
      case 'cancelled':
        return '#f56565';
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
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.date}</div>
              <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                {new Date(booking.booking_date).toLocaleDateString()}
              </div>
            </div>
          </div>
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

const ServiceMenuTab = ({ t, stylistId }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    serviceName: '',
    price: '',
    duration: '',
    description: '',
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { getStylistServices } = await import('../lib/supabase');
        const data = await getStylistServices(stylistId);
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
        serviceName: service.name,
        price: service.price.toString(),
        duration: service.duration.toString(),
        description: service.description,
      });
    } else {
      setEditingService(null);
      setFormData({
        serviceName: '',
        price: '',
        duration: '',
        description: '',
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingService(null);
    setFormData({
      serviceName: '',
      price: '',
      duration: '',
      description: '',
    });
  };

  const handleSave = async () => {
    try {
      const { createStylistService, updateStylistService } = await import('../lib/supabase');

      const data = {
        name: formData.serviceName,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        description: formData.description,
        stylist_id: stylistId,
      };

      if (editingService) {
        await updateStylistService(editingService.id, data);
        setServices(services.map(s => (s.id === editingService.id ? { ...s, ...data } : s)));
      } else {
        const newService = await createStylistService(data);
        setServices([...services, newService]);
      }

      localStorage.setItem(`services_${stylistId}`, JSON.stringify(services));
      closeModal();
    } catch (error) {
      alert(t.error);
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
      alert(t.error);
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
                  {service.name}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                  {service.description}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.price}</div>
                  <div style={{ color: 'var(--gold)', fontWeight: 600 }}>${service.price}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.duration}</div>
                  <div style={{ color: 'var(--text)' }}>{service.duration} {t.duration}</div>
                </div>
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
                    color: '#f56565',
                    border: '1px solid #f56565',
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
        const data = await getStylistProfile(stylistId);
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
      } catch {
        const cached = localStorage.getItem(`profile_${stylistId}`);
        if (cached) {
          setProfile(JSON.parse(cached));
        }
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
      await updateStylistProfile(stylistId, {
        display_name: profile.displayName,
        specialty: profile.specialty,
        phone: profile.phone,
        instagram: profile.instagram,
        location_id: profile.location?.locationId || null,
        country_code: profile.location?.countryCode || 'KR',
        city: profile.location?.city || null,
        portfolio_images: profile.portfolioImages,
      });

      localStorage.setItem(`profile_${stylistId}`, JSON.stringify(profile));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
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
          <div style={{ color: '#48bb78', fontSize: 14, fontWeight: 500 }}>{t.saved}</div>
        )}
        {saveStatus === 'error' && (
          <div style={{ color: '#f56565', fontSize: 14, fontWeight: 500 }}>{t.error}</div>
        )}
      </div>
    </div>
  );
};

export default function StylistDashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0, count: 0 });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const t = i18n[language] || i18n.en;

  const stylistId = user?.id;
  const stylistName = user?.name || user?.email;

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

  if (!stylistId) {
    return (
      <div style={{ paddingTop: 100, color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
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

        {activeTab === 'bookings' && <BookingsTab t={t} stylistId={stylistId} stylistName={stylistName} />}
        {activeTab === 'serviceMenu' && <ServiceMenuTab t={t} stylistId={stylistId} />}
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
