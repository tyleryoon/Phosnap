import { useState, useEffect, useMemo } from 'react';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import RoleApprovals from '../components/RoleApprovals';
import AlertDot from '../components/AlertDot';
import InquiryAdmin from '../components/InquiryAdmin';
import useAdminAttention from '../hooks/useAdminAttention';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// 가입일 등 타임스탬프 표시용.
// DB 값을 그대로 쓰면 2026-09-11T08:29:00.110455+00:00 이 화면에 나온다.
const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  // user_id → { kind, hmkSelf, hmkCount, dressSelf, dressCount, ... }
  // 플래그만 보면 "한다고 해놓고 아무것도 안 올린" 상태를 놓친다.
  const [capabilities, setCapabilities] = useState({});
  // 의상 벤더의 의상 개수 — user_id 가 아니라 vendor_id 기준이다.
  const [vendorDress, setVendorDress] = useState({});
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
      stylist: '헤메',
      dress_vendor: '벤더',
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
      stylist: 'Hair & Makeup',
      dress_vendor: 'Vendor',
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
      stylist: 'ヘアメイク',
      dress_vendor: 'ベンダー',
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
      stylist: '化妆造型',
      dress_vendor: '供应商',
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

  // ─── 데이터 로드 ────────────────────────────────────────────────────
  //
  // ⚠ 실패하면 실패라고 말한다. mock 으로 대체하지 않는다.
  //
  //   예전에는 catch 에서 getMockBookings() / getMockStats() 를 넣었다.
  //   조회가 막히면 화면에 847건 · ₩12,450,000 이 떴다. 전부 가짜다.
  //   관리자가 그 숫자를 보고 판단하면 안 된다.
  //
  //   RLS 가 막는 경우는 에러조차 안 난다는 점도 중요하다.
  //   PostgREST 는 정책에 걸린 행을 조용히 빼고 200 을 돌려준다.
  //   그래서 "0건" 과 "권한이 없어 안 보임" 이 화면상 구분되지 않는다.
  //   아래에서 error 를 반드시 받아 표시하고, 0건일 때는 그 가능성을 안내한다.
  const [loadError, setLoadError] = useState(null);
  // 어느 탭을 봐야 하는지 배지로 알려준다.
  const { counts: attention, refresh: refreshAttention } = useAdminAttention();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { getSupabase } = await import('../lib/supabase');
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase 연결에 실패했습니다.');

        const [bookingsRes, profilesRes, photogRes, stylistRes, pkgRes, dressRes, dvRes] = await Promise.all([
          sb.from('bookings').select('*').order('created_at', { ascending: false }),
          sb.from('profiles').select('*').order('created_at', { ascending: false }),
          sb.from('photographers').select('id, user_id, artist_type, hmk_self, dress_self, is_active'),
          sb.from('stylists').select('id, user_id, dress_self, is_active'),
          sb.from('packages').select('photographer_id, type'),
          sb.from('dress_items').select('vendor_id, stylist_id'),
          sb.from('dress_vendors').select('id, user_id, is_active'),
        ]);

        const firstErr = bookingsRes.error || profilesRes.error || photogRes.error;
        if (firstErr) throw new Error(firstErr.message);

        const bookingsData = bookingsRes.data || [];
        const profilesData = profilesRes.data || [];

        setBookings(bookingsData);
        setProfiles(profilesData);

        // ── 공급 역량 표 ──
        //
        // "자체 헤메 한다" 고 체크만 하고 메뉴를 하나도 안 올린 작가가 있다.
        // 고객 화면에서는 선택지가 비어 보인다. 관리자가 그걸 알아야
        // 연락해서 채우게 할 수 있다. 그래서 플래그와 실제 개수를 같이 센다.
        //
        // 헤메·의상 테이블 조회가 실패해도 회원 목록 자체는 보여야 한다.
        // 실패했으면 "모름" 으로 두고, 있는 척하지 않는다.
        if (stylistRes.error) console.error('[AdminDashboard] 헤메 조회 실패:', stylistRes.error);
        if (pkgRes.error)     console.error('[AdminDashboard] 상품 조회 실패:', pkgRes.error);
        if (dressRes.error)   console.error('[AdminDashboard] 의상 조회 실패:', dressRes.error);
        if (dvRes.error)      console.error('[AdminDashboard] 의상벤더 조회 실패:', dvRes.error);

        const countBy = (rows, key) => (rows || []).reduce((m, r) => {
          if (r[key]) m[r[key]] = (m[r[key]] || 0) + 1;
          return m;
        }, {});

        const hmkPkgCount     = countBy((pkgRes.data || []).filter(x => x.type === 'hmk'), 'photographer_id');
        const costumePkgCount = countBy((pkgRes.data || []).filter(x => x.type === 'costume'), 'photographer_id');
        const stylistDress    = countBy(dressRes.data, 'stylist_id');
        const vendorDress     = countBy(dressRes.data, 'vendor_id');

        const caps = {};
        for (const ph of photogRes.data || []) {
          if (!ph.user_id) continue;
          caps[ph.user_id] = {
            kind:      'photographer',
            type:      ph.artist_type,
            active:    ph.is_active,
            hmkSelf:   ph.hmk_self === true,
            hmkCount:  pkgRes.error ? null : (hmkPkgCount[ph.id] || 0),
            dressSelf: ph.dress_self === true,
            dressCount: pkgRes.error ? null : (costumePkgCount[ph.id] || 0),
          };
        }
        for (const dv of dvRes.data || []) {
          if (!dv.user_id) continue;
          caps[dv.user_id] = {
            kind:       'dress_vendor',
            active:     dv.is_active,
            hmkSelf:    false,
            dressSelf:  true,          // 의상 벤더는 정의상 의상을 판다
            dressCount: dressRes.error ? null : (vendorDress[dv.id] || 0),
          };
        }
        for (const st of stylistRes.data || []) {
          if (!st.user_id) continue;
          caps[st.user_id] = {
            kind:       'stylist',
            active:     st.is_active,
            hmkSelf:    true,           // 헤메 작가는 정의상 헤메를 한다
            hmkCount:   null,           // 시술 메뉴는 stylist_services 라 여기선 안 센다
            dressSelf:  st.dress_self === true,
            dressCount: dressRes.error ? null : (stylistDress[st.id] || 0),
          };
        }
        setCapabilities(caps);
        setVendorDress(dressRes.error ? null : vendorDress);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const inThisMonth = (v) => {
          const d = new Date(v);
          return !Number.isNaN(d.getTime()) && d >= monthStart;
        };

        setStats({
          totalBookings: bookingsData.length,
          monthlyRevenue: bookingsData
            .filter(b => inThisMonth(b.created_at))
            .reduce((sum, b) => sum + (b.total_price || 0), 0),
          newSignups: profilesData.filter(p => inThisMonth(p.created_at)).length,
          // 예전에는 profiles.approved 를 셌다. 승인 상태는 user_roles.status 에
          // 있고 노출 여부는 photographers.is_active 다. 후자가 "고객에게
          // 실제로 보이는 작가 수" 이므로 그걸 센다.
          activePhotographers: (photogRes.data || []).filter(p => p.is_active).length,
        });
      } catch (err) {
        setLoadError(err.message || '데이터를 불러오지 못했습니다.');
        setBookings([]);
        setProfiles([]);
        setStats({ totalBookings: 0, monthlyRevenue: 0, newSignups: 0, activePhotographers: 0 });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
  // 승인 탭은 RoleApprovals 로 분리했다.
  //
  // 이전 구현은 화면만 있었다. 버튼이 setProfiles() 로 React 상태만 바꿔서
  // 새로고침하면 되돌아갔고, 실제 승인은 SQL 로만 가능했다. 게다가
  // profiles.approved 를 읽었는데 진짜 승인 상태는 user_roles.status 에 있다.
  const renderApprovalsTab = () => <RoleApprovals onChanged={refreshAttention} />;

  // 공급 역량 배지.
  //
  // 색으로 세 가지를 구분한다.
  //   금색  — 하겠다고 했고 실제로 등록도 했다
  //   붉은색 — 하겠다고 했는데 등록한 게 0개다 (고객 화면에서 빈칸으로 보인다)
  //   회색  — 개수를 못 세어서 모른다. 0개인 척하지 않는다.
  const CapBadge = ({ label, on, count }) => {
    if (!on) return null;
    const unknown = count === null || count === undefined;
    const empty   = !unknown && count === 0;
    const color  = empty ? '#f56565' : unknown ? 'var(--muted)' : 'var(--gold)';
    return (
      <span
        title={empty ? '보유로 표시했지만 등록된 항목이 0개입니다 — 고객 화면에서 빈칸으로 보입니다'
                     : unknown ? '개수를 확인하지 못했습니다' : undefined}
        style={{
          display: 'inline-block', padding: '2px 8px', marginRight: 6, marginBottom: 4,
          fontSize: 10, borderRadius: 2, whiteSpace: 'nowrap',
          border: `1px solid ${color}`, color,
          background: empty ? 'rgba(245,101,101,0.08)' : 'transparent',
        }}
      >
        {label}{unknown ? '' : ` ${count}`}{empty ? ' ⚠' : ''}
      </span>
    );
  };

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
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>제공</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>{translate('joined')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 'normal' }}>노출</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
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
                  <td style={{ padding: '12px 16px', fontSize: 12, minWidth: 170 }}>
                    {(() => {
                      const cap = capabilities[p.id];
                      if (!cap) {
                        // 공급자 레코드가 없는 회원(고객·관리자)이거나 조회 실패다.
                        return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>;
                      }
                      return (
                        <>
                          {cap.kind === 'photographer' && cap.type && (
                            <span style={{ display: 'inline-block', padding: '2px 8px', marginRight: 6, marginBottom: 4, fontSize: 10, borderRadius: 2, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                              {cap.type === 'both' ? '사진+영상' : cap.type === 'videographer' ? '영상' : '사진'}
                            </span>
                          )}
                          {cap.kind === 'dress_vendor' && (
                            <span style={{ display: 'inline-block', padding: '2px 8px', marginRight: 6, marginBottom: 4, fontSize: 10, borderRadius: 2, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                              의상 벤더
                            </span>
                          )}
                          {cap.kind === 'stylist' && (
                            <span style={{ display: 'inline-block', padding: '2px 8px', marginRight: 6, marginBottom: 4, fontSize: 10, borderRadius: 2, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                              헤메
                            </span>
                          )}
                          <CapBadge label="자체 헤메" on={cap.hmkSelf && cap.kind === 'photographer'} count={cap.hmkCount} />
                          <CapBadge label="자체 의상" on={cap.dressSelf} count={cap.dressCount} />
                          {!cap.active && (
                            <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: 10, borderRadius: 2, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                              비노출
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)' }}>{fmtDate(p.created_at)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    {/* 예전에는 여기 버튼이 있었는데 setProfiles() 로 React 상태만
                        바꿨다. 새로고침하면 되돌아간다 — 누른 사람은 바꾼 줄 안다.
                        노출 여부는 photographers/stylists 의 is_active 이고,
                        승인은 '작가/벤더 승인' 탭에서 한다. 여기서는 보여주기만 한다. */}
                    {(() => {
                      const cap = capabilities[p.id];
                      if (!cap) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>;
                      return (
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', fontSize: 10, borderRadius: 2,
                          border: `1px solid ${cap.active ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                          color: cap.active ? '#4ade80' : 'var(--muted)',
                        }}>
                          {cap.active ? '고객에게 노출' : '비노출'}
                        </span>
                      );
                    })()}
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
            { key: 'approvals', label: translate('approvals'), badge: attention.pending_roles },
            { key: 'inquiries', label: '문의', badge: attention.open_inquiries },
            { key: 'members', label: translate('members') },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                display: 'inline-flex',
                alignItems: 'center',
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
              <AlertDot count={tab.badge ?? 0} title={`처리 대기 ${tab.badge ?? 0}건`} />
            </button>
          ))}
        </div>

        {/* 조회 실패 — 숨기지 않는다. 예전에는 여기서 mock 으로 대체됐다. */}
        {loadError && !['approvals','inquiries'].includes(activeTab) && (
          <div style={{
            border: '1px solid #e85d5d', background: 'var(--bg2)',
            padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#e85d5d',
          }}>
            데이터를 불러오지 못했습니다 — {loadError}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              아래 숫자는 모두 0으로 표시됩니다. 실제 값이 아닙니다.
            </div>
          </div>
        )}

        {/* 조회는 됐는데 0건 — RLS 가 조용히 걸러낸 경우와 구분되지 않는다.
            PostgREST 는 정책에 막힌 행을 에러 없이 빼고 돌려주기 때문이다. */}
        {!loadError && !loading && bookings.length === 0 && profiles.length === 0
          && !['approvals','inquiries'].includes(activeTab) && (
          <div style={{
            border: '1px solid var(--border)', background: 'var(--bg2)',
            padding: '14px 18px', marginBottom: 24, fontSize: 13, color: 'var(--muted)',
          }}>
            조회 결과가 비어 있습니다. 실제로 데이터가 없거나,
            관리자 읽기 정책(RLS)이 없어 걸러졌을 수 있습니다.
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'bookings' && renderBookingsTab()}
        {activeTab === 'approvals' && renderApprovalsTab()}
        {activeTab === 'inquiries' && <InquiryAdmin onChanged={refreshAttention} />}
        {activeTab === 'members' && renderMembersTab()}
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
