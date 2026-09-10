import { useState, useEffect, useMemo } from 'react';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    monthlyRevenue: 0,
    newSignups: 0,
    activePhotographers: 0,
  });
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Translations
  const i18n = {
    ko: {
      admin: '관리',
      dashboard: '관리자 대시보드',
      overview: '개요',
      bookings: '예약 관리',
      approvals: '작가/벤더 승인',
      members: '회원 관리',
      totalBookings: '총 예약 건수',
      monthlyRevenue: '이번 달 매출',
      newSignups: '신규 가입',
      activePhotographers: '활성 작가 수',
      latestBookings: '최근 예약 5건',
      latestSignups: '최근 가입 5명',
      date: '날짜',
      customer: '고객',
      photographer: '작가',
      package: '패키지',
      amount: '금액',
      status: '상태',
      all: '전체',
      pending: '대기 중',
      confirmed: '확정',
      completed: '완료',
      cancelled: '취소',
      delivered: '전달',
      search: '검색',
      expand: '상세보기',
      collapse: '접기',
      filter: '필터',
      name: '이름',
      email: '이메일',
      role: '역할',
      joined: '가입일',
      action: '작업',
      approve: '승인',
      reject: '거절',
      active: '활성',
      inactive: '비활성',
      toggle: '전환',
      registrationDate: '등록일',
      artist: '작가',
      vendor: '벤더',
      customer: '고객',
      admin: '관리자',
      approved: '승인됨',
      pending: '대기 중',
      rejected: '거절됨',
      changeStatus: '상태 변경',
      noData: '데이터가 없습니다.',
      month: '월',
      bookingCount: '예약 건수',
      monthlyChart: '최근 6개월 예약 현황',
    },
    en: {
      admin: 'Admin',
      dashboard: 'Admin Dashboard',
      overview: 'Overview',
      bookings: 'Bookings',
      approvals: 'Approvals',
      members: 'Members',
      totalBookings: 'Total Bookings',
      monthlyRevenue: 'Monthly Revenue',
      newSignups: 'New Signups',
      activePhotographers: 'Active Photographers',
      latestBookings: 'Latest 5 Bookings',
      latestSignups: 'Latest 5 Signups',
      date: 'Date',
      customer: 'Customer',
      photographer: 'Photographer',
      package: 'Package',
      amount: 'Amount',
      status: 'Status',
      all: 'All',
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      delivered: 'Delivered',
      search: 'Search',
      expand: 'Details',
      collapse: 'Collapse',
      filter: 'Filter',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      joined: 'Joined',
      action: 'Action',
      approve: 'Approve',
      reject: 'Reject',
      active: 'Active',
      inactive: 'Inactive',
      toggle: 'Toggle',
      registrationDate: 'Registration Date',
      artist: 'Artist',
      vendor: 'Vendor',
      customer: 'Customer',
      admin: 'Admin',
      approved: 'Approved',
      pending: 'Pending',
      rejected: 'Rejected',
      changeStatus: 'Change Status',
      noData: 'No data available.',
      month: 'Month',
      bookingCount: 'Bookings',
      monthlyChart: 'Last 6 Months Bookings',
    },
    ja: {
      admin: '管理',
      dashboard: '管理者ダッシュボード',
      overview: '概要',
      bookings: '予約管理',
      approvals: '承認',
      members: 'メンバー',
      totalBookings: '合計予約数',
      monthlyRevenue: '月間売上',
      newSignups: '新規登録',
      activePhotographers: 'アクティブ写真家',
      latestBookings: '最新5件の予約',
      latestSignups: '最新5件の登録',
      date: '日付',
      customer: '顧客',
      photographer: '写真家',
      package: 'パッケージ',
      amount: '金額',
      status: 'ステータス',
      all: 'すべて',
      pending: '保留中',
      confirmed: '確認済み',
      completed: '完了',
      cancelled: 'キャンセル',
      delivered: '配信',
      search: '検索',
      expand: '詳細',
      collapse: '折りたたむ',
      filter: 'フィルター',
      name: '名前',
      email: 'メール',
      role: 'ロール',
      joined: '参加日',
      action: 'アクション',
      approve: '承認',
      reject: '拒否',
      active: 'アクティブ',
      inactive: '非アクティブ',
      toggle: 'トグル',
      registrationDate: '登録日',
      artist: 'アーティスト',
      vendor: 'ベンダー',
      customer: 'カスタマー',
      admin: '管理者',
      approved: '承認済み',
      pending: '保留中',
      rejected: '却下',
      changeStatus: 'ステータス変更',
      noData: 'データはありません。',
      month: '月',
      bookingCount: '予約',
      monthlyChart: '過去6ヶ月の予約',
    },
    zh: {
      admin: '管理',
      dashboard: '管理员仪表板',
      overview: '概览',
      bookings: '预订管理',
      approvals: '批准',
      members: '成员',
      totalBookings: '总预订数',
      monthlyRevenue: '月收入',
      newSignups: '新注册',
      activePhotographers: '活跃摄影师',
      latestBookings: '最新5个预订',
      latestSignups: '最新5个注册',
      date: '日期',
      customer: '客户',
      photographer: '摄影师',
      package: '套餐',
      amount: '金额',
      status: '状态',
      all: '全部',
      pending: '待处理',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消',
      delivered: '已交付',
      search: '搜索',
      expand: '详情',
      collapse: '折叠',
      filter: '筛选',
      name: '名称',
      email: '电子邮件',
      role: '角色',
      joined: '加入',
      action: '操作',
      approve: '批准',
      reject: '拒绝',
      active: '活跃',
      inactive: '非活跃',
      toggle: '切换',
      registrationDate: '注册日期',
      artist: '艺术家',
      vendor: '供应商',
      customer: '客户',
      admin: '管理员',
      approved: '已批准',
      pending: '待处理',
      rejected: '已拒绝',
      changeStatus: '更改状态',
      noData: '没有可用数据。',
      month: '月份',
      bookingCount: '预订',
      monthlyChart: '过去6个月的预订',
    },
  };

  // Get language code (fallback to 'ko')
  const langCode = 'ko'; // Would be replaced with actual language context in real app
  const translate = (key) => i18n[langCode]?.[key] || i18n['ko'][key] || key;

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { getSupabase } = await import('../lib/supabase');
        const sb = await getSupabase();

        if (!sb) {
          // Mock data for demo
          setBookings(getMockBookings());
          setProfiles(getMockProfiles());
          setStats(getMockStats());
          setLoading(false);
          return;
        }

        // Fetch bookings
        const { data: bookingsData } = await sb.from('bookings').select('*').order('created_at', { ascending: false });
        setBookings(bookingsData || []);

        // Fetch profiles
        const { data: profilesData } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
        setProfiles(profilesData || []);

        // Calculate stats
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyBookings = (bookingsData || []).filter(b => {
          const bDate = new Date(b.created_at);
          return bDate >= monthStart;
        });

        const monthlyRev = monthlyBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        const newSignups = (profilesData || []).filter(p => {
          const pDate = new Date(p.created_at);
          return pDate >= monthStart;
        }).length;

        const activePhots = (profilesData || []).filter(p => p.role === 'artist' && p.approved === true).length;

        setStats({
          totalBookings: bookingsData?.length || 0,
          monthlyRevenue: monthlyRev,
          newSignups,
          activePhotographers: activePhots,
        });
      } catch (err) {
        // Use mock data on error
        setBookings(getMockBookings());
        setProfiles(getMockProfiles());
        setStats(getMockStats());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Mock data
  const getMockBookings = () => [
    { id: 1, date: '2026-04-12', customer_name: 'Kim Sarah', photographer_name: 'Minah Jung', package_name: 'Premium 4h', total_price: 450000, status: 'confirmed' },
    { id: 2, date: '2026-04-11', customer_name: 'Park Ji-hun', photographer_name: 'Lee Soo-yeon', package_name: 'Standard 2h', total_price: 250000, status: 'completed' },
    { id: 3, date: '2026-04-10', customer_name: 'Smith James', photographer_name: 'Fujiwara Kana', package_name: 'Deluxe 6h', total_price: 650000, status: 'pending' },
    { id: 4, date: '2026-04-09', customer_name: 'Choi Min-ji', photographer_name: 'Tanaka Yuki', package_name: 'Standard 2h', total_price: 280000, status: 'cancelled' },
    { id: 5, date: '2026-04-08', customer_name: 'Zhang Wei', photographer_name: 'Han Se-ri', package_name: 'Premium 4h', total_price: 520000, status: 'delivered' },
  ];

  const getMockProfiles = () => [
    { id: 1, full_name: 'Minah Jung', email: 'minah@phosnap.com', role: 'artist', created_at: '2026-03-15', approved: true, is_active: true },
    { id: 2, full_name: 'Lee Soo-yeon', email: 'soo@phosnap.com', role: 'artist', created_at: '2026-03-20', approved: null, is_active: true },
    { id: 3, full_name: 'Park Vendor', email: 'vendor@phosnap.com', role: 'vendor', created_at: '2026-04-01', approved: null, is_active: true },
    { id: 4, full_name: 'Kim Customer', email: 'customer@phosnap.com', role: 'customer', created_at: '2026-04-05', approved: null, is_active: true },
    { id: 5, full_name: 'Fujiwara Kana', email: 'fujiwara@phosnap.com', role: 'artist', created_at: '2026-02-28', approved: true, is_active: true },
  ];

  const getMockStats = () => ({
    totalBookings: 847,
    monthlyRevenue: 12450000,
    newSignups: 23,
    activePhotographers: 45,
  });

  // Filtered data
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (bookingStatusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === bookingStatusFilter);
    }

    if (bookingSearch) {
      const q = bookingSearch.toLowerCase();
      filtered = filtered.filter(b =>
        (b.customer_name || '').toLowerCase().includes(q) ||
        (b.photographer_name || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [bookings, bookingStatusFilter, bookingSearch]);

  const filteredProfiles = useMemo(() => {
    let filtered = profiles;

    if (memberRoleFilter !== 'all') {
      filtered = filtered.filter(p => p.role === memberRoleFilter);
    }

    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      filtered = filtered.filter(p =>
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [profiles, memberRoleFilter, memberSearch]);

  const pendingApprovals = useMemo(() => {
    return profiles.filter(p => (p.role === 'artist' || p.role === 'vendor') && (!p.approved || p.approved === null));
  }, [profiles]);

  const fmt = (n) => Number(n || 0).toLocaleString();

  // ─── Tab: Overview ───
  const renderOverviewTab = () => (
    <div>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        {[
          { label: translate('totalBookings'), value: stats.totalBookings, color: 'var(--gold)' },
          { label: translate('monthlyRevenue'), value: `₩${fmt(stats.monthlyRevenue)}`, color: '#22c55e' },
          { label: translate('newSignups'), value: stats.newSignups, color: '#60a5fa' },
          { label: translate('activePhotographers'), value: stats.activePhotographers, color: '#f472b6' },
        ].map((card, i) => (
          <div key={i} style={{
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            padding: '24px 20px',
            position: 'relative',
          }}>
            <Corners />
            <div style={{
              fontSize: 10,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.15em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              {card.label}
            </div>
            <div style={{
              fontSize: 32,
              fontFamily: 'var(--font-serif)',
              color: card.color,
              marginBottom: 4,
            }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '24px 28px',
        position: 'relative',
        marginBottom: 32,
      }}>
        <Corners />
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 10,
          letterSpacing: '0.2em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          {translate('monthlyChart')}
        </div>

        {/* Simple bar chart */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          height: 200,
          marginBottom: 16,
        }}>
          {[120, 145, 132, 178, 156, 142].map((val, i) => (
            <div key={i} style={{
              flex: 1,
              height: `${(val / 180) * 100}%`,
              background: 'var(--gold)',
              borderRadius: '2px 2px 0 0',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                bottom: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 9,
                color: 'var(--muted)',
                fontFamily: 'var(--font-serif)',
                whiteSpace: 'nowrap',
              }}>
                {['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][i]}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 20 }} />
      </div>

      {/* Latest Bookings & Signups */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: 24,
      }}>
        {/* Latest Bookings */}
        <div style={{
          border: '1px solid var(--border)',
          background: 'var(--bg2)',
          padding: '24px 28px',
          position: 'relative',
        }}>
          <Corners />
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            {translate('latestBookings')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.slice(0, 5).map(b => (
              <div key={b.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                fontSize: 11,
              }}>
                <span style={{ flex: 1, color: 'var(--text)' }}>{b.customer_name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 10 }}>₩{fmt(b.total_price)}</span>
                <span style={{
                  fontSize: 9,
                  padding: '2px 8px',
                  background: b.status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                  color: b.status === 'confirmed' ? '#22c55e' : '#60a5fa',
                  borderRadius: 2,
                }}>
                  {translate(b.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Signups */}
        <div style={{
          border: '1px solid var(--border)',
          background: 'var(--bg2)',
          padding: '24px 28px',
          position: 'relative',
        }}>
          <Corners />
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            {translate('latestSignups')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profiles.slice(0, 5).map(p => (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                fontSize: 11,
              }}>
                <span style={{ flex: 1, color: 'var(--text)' }}>{p.full_name}</span>
                <span style={{
                  fontSize: 9,
                  padding: '2px 8px',
                  background: 'rgba(96, 165, 250, 0.1)',
                  color: '#60a5fa',
                  borderRadius: 2,
                }}>
                  {translate(p.role)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Tab: Bookings ───
  const renderBookingsTab = () => (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={bookingSearch}
          onChange={e => setBookingSearch(e.target.value)}
          placeholder={`${translate('search')}...`}
          style={{
            flex: 1,
            minWidth: 200,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <select
          value={bookingStatusFilter}
          onChange={e => setBookingStatusFilter(e.target.value)}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="all">{translate('all')}</option>
          <option value="pending">{translate('pending')}</option>
          <option value="confirmed">{translate('confirmed')}</option>
          <option value="completed">{translate('completed')}</option>
          <option value="cancelled">{translate('cancelled')}</option>
          <option value="delivered">{translate('delivered')}</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('date')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('customer')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('photographer')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('package')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('amount')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('status')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                  {translate('noData')}
                </td>
              </tr>
            ) : (
              filteredBookings.map((b, idx) => (
                <tr key={b.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: idx % 2 === 0 ? 'var(--bg2)' : 'var(--bg)',
                }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{b.date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{b.customer_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{b.photographer_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{b.package_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>₩{fmt(b.total_price)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      fontSize: 10,
                      borderRadius: 2,
                      background: b.status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' :
                                  b.status === 'completed' ? 'rgba(99, 102, 241, 0.1)' :
                                  b.status === 'pending' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                      color: b.status === 'confirmed' ? '#22c55e' :
                             b.status === 'completed' ? '#6366f1' :
                             b.status === 'pending' ? '#f97316' : '#6b7280',
                    }}>
                      {translate(b.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <select
                      value={b.status}
                      onChange={e => {
                        // Update booking status
                        setBookings(bookings.map(booking => booking.id === b.id ? { ...booking, status: e.target.value } : booking));
                      }}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="pending">{translate('pending')}</option>
                      <option value="confirmed">{translate('confirmed')}</option>
                      <option value="completed">{translate('completed')}</option>
                      <option value="cancelled">{translate('cancelled')}</option>
                      <option value="delivered">{translate('delivered')}</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Tab: Approvals ───
  const renderApprovalsTab = () => (
    <div>
      {pendingApprovals.length === 0 ? (
        <div style={{
          padding: '48px 32px',
          textAlign: 'center',
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          background: 'var(--bg2)',
        }}>
          {translate('noData')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pendingApprovals.map(profile => (
            <div key={profile.id} style={{
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              padding: '20px 24px',
              position: 'relative',
            }}>
              <Corners />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: 4 }}>
                      {profile.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {profile.email}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                        {translate('role')}
                      </div>
                      <div style={{ color: 'var(--text)' }}>
                        {translate(profile.role)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                        {translate('registrationDate')}
                      </div>
                      <div style={{ color: 'var(--text)' }}>
                        {profile.created_at}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                        {translate('status')}
                      </div>
                      <div style={{ color: 'var(--gold)' }}>
                        {translate('pending')}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexDirection: 'column', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setProfiles(profiles.map(p => p.id === profile.id ? { ...p, approved: true } : p));
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      fontSize: 12,
                      fontFamily: 'var(--font-serif)',
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {translate('approve')}
                  </button>
                  <button
                    onClick={() => {
                      setProfiles(profiles.map(p => p.id === profile.id ? { ...p, approved: false } : p));
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      fontSize: 12,
                      fontFamily: 'var(--font-serif)',
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {translate('reject')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Tab: Members ───
  const renderMembersTab = () => (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={memberSearch}
          onChange={e => setMemberSearch(e.target.value)}
          placeholder={`${translate('search')}...`}
          style={{
            flex: 1,
            minWidth: 200,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <select
          value={memberRoleFilter}
          onChange={e => setMemberRoleFilter(e.target.value)}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 16px',
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="all">{translate('all')}</option>
          <option value="customer">{translate('customer')}</option>
          <option value="artist">{translate('artist')}</option>
          <option value="vendor">{translate('vendor')}</option>
          <option value="admin">{translate('admin')}</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('name')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('email')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('role')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('joined')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                  {translate('noData')}
                </td>
              </tr>
            ) : (
              filteredProfiles.map((p, idx) => (
                <tr key={p.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: idx % 2 === 0 ? 'var(--bg2)' : 'var(--bg)',
                }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{p.full_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{p.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      fontSize: 10,
                      borderRadius: 2,
                      background: 'rgba(96, 165, 250, 0.1)',
                      color: '#60a5fa',
                    }}>
                      {translate(p.role)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{p.created_at}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <button
                      onClick={() => {
                        setProfiles(profiles.map(profile => profile.id === p.id ? { ...profile, is_active: !profile.is_active } : profile));
                      }}
                      style={{
                        padding: '4px 12px',
                        background: p.is_active ? '#22c55e' : '#6b7280',
                        color: '#fff',
                        border: 'none',
                        fontSize: 11,
                        fontFamily: 'var(--font-serif)',
                        cursor: 'pointer',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {p.is_active ? translate('active') : translate('inactive')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render
  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section">
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">{translate('admin')}</div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(24px, 4vw, 40px)',
            letterSpacing: '0.05em',
            marginBottom: 16,
          }}>
            {translate('dashboard')}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: 36,
          gap: 0,
          flexWrap: 'wrap',
        }}>
          {[
            { key: 'overview', label: translate('overview') },
            { key: 'bookings', label: translate('bookings') },
            { key: 'approvals', label: translate('approvals') },
            { key: 'members', label: translate('members') },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                fontSize: 12,
                fontFamily: 'var(--font-serif)',
                letterSpacing: '0.08em',
                background: 'transparent',
                color: activeTab === tab.key ? 'var(--gold)' : 'var(--muted)',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--gold)' : 'transparent'}`,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'bookings' && renderBookingsTab()}
        {activeTab === 'approvals' && renderApprovalsTab()}
        {activeTab === 'members' && renderMembersTab()}
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
