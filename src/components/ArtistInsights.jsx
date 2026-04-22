import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Corners from './Corners';

// ─── Helper: Format number with commas ───────────────────────────────────
const fmt = (n) => {
  if (!n) return '0';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ─── Artist Insights Dashboard ───────────────────────────────────────────
export default function ArtistInsights({ artistData = {} }) {
  const { t, lang } = useLanguage();
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Mock data generation
  const mockMetrics = useMemo(() => ({
    profileViews: Math.floor(Math.random() * (800 - 200 + 1)) + 200,      // 200-800
    favorites: Math.floor(Math.random() * (120 - 30 + 1)) + 30,           // 30-120
    conversionRate: Math.floor(Math.random() * (25 - 8 + 1)) + 8,         // 8-25%
    avgResponseTime: ['1시간 30분', '2시간', '2시간 30분', '3시간', '1시간'][Math.floor(Math.random() * 5)],
    avgResponseTimeEn: ['1h 30m', '2h', '2h 30m', '3h', '1h'][Math.floor(Math.random() * 5)],
    avgResponseTimeJa: ['1時間30分', '2時間', '2時間30分', '3時間', '1時間'][Math.floor(Math.random() * 5)],
    avgResponseTimeZh: ['1小时30分', '2小时', '2小时30分', '3小时', '1小时'][Math.floor(Math.random() * 5)],
    reviewRating: (Math.random() * (4.9 - 4.2) + 4.2).toFixed(1),
  }), []);

  // Monthly booking and revenue data (last 6 months)
  const monthlyData = useMemo(() => {
    const months = ['10월', '11월', '12월', '1월', '2월', '3월'];
    const monthsEn = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const monthsJa = ['10月', '11月', '12月', '1月', '2月', '3月'];
    const monthsZh = ['10月', '11月', '12月', '1月', '2月', '3月'];

    return {
      ko: months,
      en: monthsEn,
      ja: monthsJa,
      zh: monthsZh,
      bookings: [12, 14, 8, 15, 18, 22],
      revenues: [3600000, 4200000, 2400000, 4500000, 5400000, 6600000],
    };
  }, []);

  const maxBookings = Math.max(...monthlyData.bookings);
  const maxRevenue = Math.max(...monthlyData.revenues);

  // Search keywords
  const searchKeywords = useMemo(() => [
    { ko: '서울 스냅', en: 'Seoul Snap', ja: 'ソウルスナップ', zh: '首尔拍照', pct: 28 },
    { ko: '웨딩 촬영', en: 'Wedding Photography', ja: 'ウェディング撮影', zh: '婚礼摄影', pct: 22 },
    { ko: '커플 사진', en: 'Couple Photo', ja: 'カップル写真', zh: '情侣照', pct: 18 },
    { ko: '졸업 사진', en: 'Graduation Photo', ja: '卒業写真', zh: '毕业照', pct: 15 },
    { ko: '프로필 촬영', en: 'Profile Photography', ja: 'プロフィール撮影', zh: '资料照', pct: 12 },
  ], []);

  const getResponseTime = () => {
    if (lang === 'en') return mockMetrics.avgResponseTimeEn;
    if (lang === 'ja') return mockMetrics.avgResponseTimeJa;
    if (lang === 'zh') return mockMetrics.avgResponseTimeZh;
    return mockMetrics.avgResponseTime;
  };

  const getMonthLabels = () => monthlyData[lang] || monthlyData.ko;

  // Competitive position
  const competitiveData = useMemo(() => ({
    totalPhotographersInArea: 47,
    currentRank: 12,
    categories: [
      { name: 'Overall', score: 78, rank: 12 },
      { name: 'Price', score: 65, rank: 18 },
      { name: 'Response', score: 82, rank: 8 },
      { name: 'Reviews', score: 88, rank: 5 },
    ],
  }), []);

  // AI Tips
  const tips = useMemo(() => [
    {
      ko: { title: '포트폴리오 확대', desc: '포트폴리오에 사진을 5장 더 추가하면 예약률이 약 15% 높아져요', impact: '15%' },
      en: { title: 'Expand Portfolio', desc: 'Adding 5 more photos to your portfolio can increase booking rate by 15%', impact: '15%' },
      ja: { title: 'ポートフォリオ拡張', desc: 'ポートフォリオに5枚の写真を追加すると、予約率が約15%向上します', impact: '15%' },
      zh: { title: '扩展作品集', desc: '在作品集中添加5张照片可将预订率提高约15%', impact: '15%' },
      icon: '🖼️',
    },
    {
      ko: { title: '응답 시간 개선', desc: '응답 시간을 1시간 이내로 줄이면 전환율이 20% 개선돼요', impact: '20%' },
      en: { title: 'Improve Response Time', desc: 'Reducing response time to under 1 hour can improve conversion rate by 20%', impact: '20%' },
      ja: { title: '応答時間の改善', desc: '応答時間を1時間以内に削減すると、転換率が20%向上します', impact: '20%' },
      zh: { title: '改善响应时间', desc: '将响应时间减少到1小时以内可将转化率提高20%', impact: '20%' },
      icon: '⚡',
    },
    {
      ko: { title: '계절 패키지 추가', desc: '계절별 패키지를 추가하면 검색 노출이 30% 증가해요', impact: '30%' },
      en: { title: 'Add Seasonal Packages', desc: 'Adding seasonal packages can increase search visibility by 30%', impact: '30%' },
      ja: { title: 'シーズナルパッケージ追加', desc: 'シーズナルパッケージを追加すると、検索の露出が30%増加します', impact: '30%' },
      zh: { title: '添加季节套餐', desc: '添加季节套餐可将搜索曝光率提高30%', impact: '30%' },
      icon: '📅',
    },
  ], []);

  const getTipContent = (tip) => tip[lang] || tip.ko;

  return (
    <div>
      {/* ════════════════════════ Metrics Cards ════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
        {[
          {
            label: lang === 'ko' ? '프로필 조회' : lang === 'en' ? 'Profile Views' : lang === 'ja' ? 'プロフィール表示' : '资料浏览',
            value: fmt(mockMetrics.profileViews),
            sub: lang === 'ko' ? '이번달' : lang === 'en' ? 'This month' : lang === 'ja' ? '今月' : '本月',
            color: '#60a5fa',
          },
          {
            label: lang === 'ko' ? '찜 수' : lang === 'en' ? 'Favorites' : lang === 'ja' ? 'お気に入り' : '收藏',
            value: fmt(mockMetrics.favorites),
            sub: lang === 'ko' ? '총' : lang === 'en' ? 'Total' : lang === 'ja' ? '合計' : '总计',
            color: 'var(--gold)',
          },
          {
            label: lang === 'ko' ? '예약 전환율' : lang === 'en' ? 'Booking Rate' : lang === 'ja' ? '予約転換率' : '预订转化率',
            value: `${mockMetrics.conversionRate}%`,
            sub: lang === 'ko' ? '조회 대비' : lang === 'en' ? 'vs Views' : lang === 'ja' ? 'ビュー対比' : '对比浏览',
            color: '#22c55e',
          },
          {
            label: lang === 'ko' ? '평균 응답시간' : lang === 'en' ? 'Avg Response' : lang === 'ja' ? '平均応答時間' : '平均响应',
            value: getResponseTime(),
            sub: lang === 'ko' ? '평균' : lang === 'en' ? 'Average' : lang === 'ja' ? '平均' : '平均',
            color: '#f97316',
          },
          {
            label: lang === 'ko' ? '리뷰 평점' : lang === 'en' ? 'Review Rating' : lang === 'ja' ? 'レビュー評価' : '评论评分',
            value: mockMetrics.reviewRating,
            sub: '/ 5.0',
            color: '#ec4899',
          },
        ].map((card, i) => (
          <div key={i} style={{
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            padding: '20px',
            position: 'relative',
            transition: 'all 0.3s',
          }}>
            <Corners />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>
              {card.label}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: card.color, letterSpacing: '0.03em', marginBottom: 6 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════ Monthly Chart ════════════════════════ */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '28px 24px',
        marginBottom: 40,
        position: 'relative',
      }}>
        <Corners />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
          {lang === 'ko' ? '월별 예약 & 매출' : lang === 'en' ? 'Monthly Bookings & Revenue' : lang === 'ja' ? '月別予約と売上' : '月度预订和收入'}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 280, gap: 12, marginBottom: 24, position: 'relative' }}>
          {monthlyData.bookings.map((bookings, idx) => {
            const revenue = monthlyData.revenues[idx];
            const bookingHeight = (bookings / maxBookings) * 240;
            const revenueHeight = (revenue / maxRevenue) * 240;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredMonth(idx)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Booking bars */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 240 }}>
                  <div
                    style={{
                      width: 16,
                      height: bookingHeight,
                      background: '#3b82f6',
                      opacity: hoveredMonth === idx ? 1 : 0.6,
                      transition: 'opacity 0.2s',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                  {/* Revenue bar */}
                  <div
                    style={{
                      width: 16,
                      height: revenueHeight,
                      background: 'var(--gold)',
                      opacity: hoveredMonth === idx ? 1 : 0.6,
                      transition: 'opacity 0.2s',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                </div>

                {/* Tooltip on hover */}
                {hoveredMonth === idx && (
                  <div style={{
                    position: 'absolute',
                    bottom: 260,
                    background: 'var(--bg)',
                    border: '1px solid var(--gold)',
                    padding: '8px 12px',
                    borderRadius: 2,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    color: 'var(--text)',
                  }}>
                    <div>{lang === 'ko' ? '예약' : lang === 'en' ? 'Bookings' : lang === 'ja' ? '予約' : '预订'}: {bookings}</div>
                    <div>{lang === 'ko' ? '매출' : lang === 'en' ? 'Revenue' : lang === 'ja' ? '売上' : '收入'}: ₩{fmt(revenue)}</div>
                  </div>
                )}

                {/* Month label */}
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                  {getMonthLabels()[idx]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, fontSize: 11, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 1 }} />
            <span style={{ color: 'var(--muted)' }}>
              {lang === 'ko' ? '예약 건수' : lang === 'en' ? 'Bookings' : lang === 'ja' ? '予約数' : '预订数'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: 'var(--gold)', borderRadius: 1 }} />
            <span style={{ color: 'var(--muted)' }}>
              {lang === 'ko' ? '매출액' : lang === 'en' ? 'Revenue' : lang === 'ja' ? '売上' : '收入'}
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════ Search Keywords ════════════════════════ */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '28px 24px',
        marginBottom: 40,
        position: 'relative',
      }}>
        <Corners />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
          {lang === 'ko' ? '어떤 필터로 발견됐나요?' : lang === 'en' ? 'Top Search Keywords' : lang === 'ja' ? 'トップ検索キーワード' : '热门搜索关键词'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {searchKeywords.map((kw, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 24,
                height: 24,
                background: 'var(--gold)',
                color: 'var(--bg)',
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                fontWeight: 'bold',
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                  {kw[lang] || kw.ko}
                </div>
                <div style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${kw.pct}%`,
                    background: `linear-gradient(90deg, var(--gold), rgba(232,160,32,0.5))`,
                    borderRadius: 2,
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>
                {kw.pct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════ Competitive Position ════════════════════════ */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '28px 24px',
        marginBottom: 40,
        position: 'relative',
      }}>
        <Corners />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
          {lang === 'ko' ? '같은 지역 작가 중 내 위치' : lang === 'en' ? 'Competitive Position' : lang === 'ja' ? ' 競争力分析' : '竞争地位'}
        </div>

        {/* Main ranking */}
        <div style={{
          background: 'rgba(232,160,32,0.08)',
          border: '1px solid rgba(232,160,32,0.2)',
          padding: '20px',
          marginBottom: 24,
          borderRadius: 2,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'ko' ? '서울 소재 작가' : lang === 'en' ? 'Seoul Photographers' : lang === 'ja' ? 'ソウルの作家' : '首尔摄影师'}
          </div>
          <div style={{ fontSize: 32, fontFamily: 'var(--font-serif)', color: 'var(--gold)', letterSpacing: '0.05em', marginBottom: 4 }}>
            {competitiveData.currentRank} / {competitiveData.totalPhotographersInArea}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {lang === 'ko' ? `상위 ${Math.round((competitiveData.currentRank / competitiveData.totalPhotographersInArea) * 100)}%` : `Top ${Math.round((competitiveData.currentRank / competitiveData.totalPhotographersInArea) * 100)}%`}
          </div>
        </div>

        {/* Category rankings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {competitiveData.categories.map((cat, idx) => (
            <div key={idx} style={{
              border: '1px solid var(--border)',
              padding: '16px',
              textAlign: 'center',
              borderRadius: 2,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                {cat.name}
              </div>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: 6 }}>
                {cat.rank}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                {lang === 'en' ? 'Rank' : lang === 'ja' ? 'ランク' : lang === 'zh' ? '排名' : '등위'}
              </div>
              <div style={{
                height: 3,
                background: 'var(--border)',
                borderRadius: 1,
                marginTop: 10,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${cat.score}%`,
                  background: 'var(--gold)',
                }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6 }}>
                {cat.score}/100
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════ AI Tips ════════════════════════ */}
      <div style={{
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '28px 24px',
        position: 'relative',
      }}>
        <Corners />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
          {lang === 'ko' ? 'AI 개선 추천' : lang === 'en' ? 'AI Recommendations' : lang === 'ja' ? 'AI推奨' : 'AI建议'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {tips.map((tip, idx) => {
            const content = getTipContent(tip);
            return (
              <div key={idx} style={{
                border: '1px solid rgba(232,160,32,0.3)',
                background: 'rgba(232,160,32,0.05)',
                padding: '20px',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>
                  {tip.icon}
                </div>
                <div style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--gold)',
                  marginBottom: 8,
                  letterSpacing: '0.05em',
                }}>
                  {content.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  marginBottom: 12,
                  flex: 1,
                }}>
                  {content.desc}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid rgba(232,160,32,0.2)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {lang === 'en' ? 'Expected Impact' : lang === 'ja' ? '期待される効果' : lang === 'zh' ? '预期影响' : '기대 효과'}
                  </span>
                  <span style={{
                    fontSize: 14,
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--gold)',
                    fontWeight: 'bold',
                  }}>
                    +{content.impact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
