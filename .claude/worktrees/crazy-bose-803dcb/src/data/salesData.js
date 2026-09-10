// ─── Sales / Revenue Data Layer ────────────────────────────────────
// 작가별 매출 · 실적 데이터 (MVP: 시드 데이터 + localStorage)
// 추후 Supabase 정산 테이블과 연동

const SALES_KEY = (id) => `phosnap_sales_${id}`;

// ── 시드 데이터 생성 ──
// 현실적인 매출 패턴: 성수기(3~5월, 9~11월) 건수 ↑, 비수기 ↓
const generateSeedSales = (artistId, basePrice, reviewCount) => {
  const now = new Date();
  const sales = [];
  // 최근 12개월간 데이터 생성
  for (let m = 11; m >= 0; m--) {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    const d = new Date(year, month, 1);
    const y = d.getFullYear();
    const mo = d.getMonth(); // 0-indexed

    // 월별 건수 패턴 (성수기/비수기)
    const peakMonths = [2, 3, 4, 8, 9, 10]; // 3~5월, 9~11월
    const isPeak = peakMonths.includes(mo);
    const baseCnt = Math.max(1, Math.round(reviewCount / 24)); // 월 평균
    const monthCount = isPeak
      ? baseCnt + Math.floor(Math.random() * (baseCnt * 0.6))
      : Math.max(1, baseCnt - Math.floor(Math.random() * (baseCnt * 0.4)));

    // 해당 월의 개별 건 생성
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    for (let i = 0; i < monthCount; i++) {
      const day = Math.min(daysInMonth, Math.floor(Math.random() * daysInMonth) + 1);
      const dateStr = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // 가격 변동 (±20%)
      const variation = 0.8 + Math.random() * 0.4;
      const amount = Math.round(basePrice * variation / 10000) * 10000; // 만원 단위
      const type = Math.random() > 0.15 ? 'snap' : 'tour'; // 85% 스냅, 15% 투어
      const collaboDiscount = Math.random() > 0.8; // 20% 확률 콜라보
      sales.push({
        id: `sale-${artistId}-${dateStr}-${i}`,
        date: dateStr,
        amount,
        netAmount: collaboDiscount ? Math.round(amount * 0.82) : Math.round(amount * 0.80), // 수수료 차감 후 (콜라보 18%, 일반 20%)
        type,
        status: m >= 1 ? 'settled' : (day <= now.getDate() - 5 ? 'settled' : 'pending'), // 최근 5일은 정산 대기
        isCollabo: collaboDiscount,
        location: '', // 추후 확장
      });
    }
  }
  return sales.sort((a, b) => a.date.localeCompare(b.date));
};

// ── 작가별 시드 매핑 ──
const ARTIST_SEED_CONFIG = {
  1:  { basePrice: 280000, reviews: 142 },
  2:  { basePrice: 220000, reviews: 98 },
  3:  { basePrice: 350000, reviews: 67 },
  4:  { basePrice: 190000, reviews: 54 },
  5:  { basePrice: 260000, reviews: 88 },
  6:  { basePrice: 200000, reviews: 75 },
  7:  { basePrice: 240000, reviews: 112 },
  8:  { basePrice: 180000, reviews: 45 },
  9:  { basePrice: 300000, reviews: 63 },
  10: { basePrice: 160000, reviews: 35 },
};

// ── 초기화 ──
export const initSalesData = () => {
  Object.entries(ARTIST_SEED_CONFIG).forEach(([id, cfg]) => {
    const key = SALES_KEY(id);
    if (!localStorage.getItem(key)) {
      const data = generateSeedSales(Number(id), cfg.basePrice, cfg.reviews);
      localStorage.setItem(key, JSON.stringify(data));
    }
  });
};

// ── 매출 데이터 조회 ──
export const getSalesData = (artistId) => {
  try {
    const raw = localStorage.getItem(SALES_KEY(artistId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

// ── 총 누적 매출 ──
export const getTotalRevenue = (artistId) => {
  const sales = getSalesData(artistId);
  return sales.reduce((sum, s) => sum + s.amount, 0);
};

// ── 총 누적 정산액 (수수료 차감 후) ──
export const getTotalNetRevenue = (artistId) => {
  const sales = getSalesData(artistId);
  return sales.filter(s => s.status === 'settled').reduce((sum, s) => sum + s.netAmount, 0);
};

// ── 총 누적 건수 ──
export const getTotalCount = (artistId) => {
  return getSalesData(artistId).length;
};

// ── 월별 실적 집계 ──
export const getMonthlySales = (artistId) => {
  const sales = getSalesData(artistId);
  const monthly = {};
  sales.forEach(s => {
    const ym = s.date.slice(0, 7); // 'YYYY-MM'
    if (!monthly[ym]) monthly[ym] = { yearMonth: ym, count: 0, revenue: 0, netRevenue: 0, collaboCount: 0, settled: 0, pending: 0 };
    monthly[ym].count++;
    monthly[ym].revenue += s.amount;
    monthly[ym].netRevenue += s.netAmount;
    if (s.isCollabo) monthly[ym].collaboCount++;
    if (s.status === 'settled') monthly[ym].settled++;
    else monthly[ym].pending++;
  });
  return Object.values(monthly).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
};

// ── 기간별 실적 조회 ──
export const getSalesByDateRange = (artistId, startDate, endDate) => {
  const sales = getSalesData(artistId);
  return sales.filter(s => s.date >= startDate && s.date <= endDate);
};

// ── 기간별 집계 ──
export const getDateRangeSummary = (artistId, startDate, endDate) => {
  const filtered = getSalesByDateRange(artistId, startDate, endDate);
  return {
    count: filtered.length,
    revenue: filtered.reduce((sum, s) => sum + s.amount, 0),
    netRevenue: filtered.reduce((sum, s) => sum + s.netAmount, 0),
    avgAmount: filtered.length > 0 ? Math.round(filtered.reduce((sum, s) => sum + s.amount, 0) / filtered.length) : 0,
    collaboCount: filtered.filter(s => s.isCollabo).length,
    settledCount: filtered.filter(s => s.status === 'settled').length,
    pendingCount: filtered.filter(s => s.status === 'pending').length,
    pendingAmount: filtered.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netAmount, 0),
  };
};

// ── 이번 달 실적 ──
export const getCurrentMonthSales = (artistId) => {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  return getDateRangeSummary(artistId, start, end);
};

// ── 전월 실적 ──
export const getLastMonthSales = (artistId) => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const end = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  return getDateRangeSummary(artistId, start, end);
};

// ── 금액 포맷 ──
export const formatMoney = (n) => {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`;
  return n.toLocaleString();
};

export const formatMoneyFull = (n) => {
  return `₩${n.toLocaleString()}`;
};
