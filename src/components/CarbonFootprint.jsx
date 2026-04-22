import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const translations = {
  ko: {
    // Booking mode
    saved: 'CO₂ 절약',
    savingText: '의상 대여로',
    treeLabel: '나무 1그루가 1년간 흡수하는 양',
    drivingLabel: '자동차 주행과 같은 양',
    km: 'km',

    // Dashboard mode
    myEcoScore: '나의 친환경 스냅 지수',
    level: '레벨',
    contribution: '지구를 위한 당신의 기여',
    seed: '새싹',
    sprout: '새순',
    tree: '나무',
    forest: '숲',
    totalSaved: '총 절약',
    totalBookings: '총 예약',
    withRental: '대여 포함',
    ecoGuidance: '디지털 사진만 수령하고 인쇄물을 줄이면 지수가 올라갑니다. 친환경 옵션을 선택할수록 포인트가 적립됩니다.',

    // Platform mode
    platformTitle: 'Phosnap과 함께한 환경 기여',
    totalContribution: '총 절약',
    trees: '나무',
    cars: '자동차',
    km: 'km',
    noData: '아직 데이터가 없습니다',
  },
  en: {
    saved: 'CO₂ Saved',
    savingText: 'by renting clothes',
    treeLabel: 'equivalent to 1 tree absorbs in 1 year',
    drivingLabel: 'equivalent to driving',
    km: 'km',

    myEcoScore: 'My Eco Snap Score',
    level: 'Level',
    contribution: 'Your contribution to the planet',
    seed: 'Seed',
    sprout: 'Sprout',
    tree: 'Tree',
    forest: 'Forest',
    totalSaved: 'Total Saved',
    totalBookings: 'Total Bookings',
    withRental: 'with rental',
    ecoGuidance: 'Your score grows when you choose digital photos instead of prints, and by selecting eco-friendly options. Each sustainable choice earns you points.',

    platformTitle: 'Environmental Impact with Phosnap',
    totalContribution: 'Total Saved',
    trees: 'trees',
    cars: 'cars',
    km: 'km',
    noData: 'No data yet',
  },
  ja: {
    saved: 'CO₂削減',
    savingText: '洋服レンタルで',
    treeLabel: '木1本が1年間に吸収する量',
    drivingLabel: '自動車の走行に相当',
    km: 'km',

    myEcoScore: '私のエコスナップスコア',
    level: 'レベル',
    contribution: '地球への貢献',
    seed: '芽',
    sprout: '若葉',
    tree: '木',
    forest: '森',
    totalSaved: '合計節約',
    totalBookings: '合計予約',
    withRental: 'レンタル含む',

    platformTitle: 'Phosnapとの環境への貢献',
    totalContribution: '合計節約',
    trees: '本',
    cars: '台',
    km: 'km',
    noData: 'データがまだありません',
  },
  zh: {
    saved: '节省CO₂',
    savingText: '通过服装租赁',
    treeLabel: '相当于1棵树1年吸收的量',
    drivingLabel: '相当于驾驶',
    km: 'km',

    myEcoScore: '我的生态快照评分',
    level: '等级',
    contribution: '对地球的贡献',
    seed: '种子',
    sprout: '嫩芽',
    tree: '树',
    forest: '森林',
    totalSaved: '总计节省',
    totalBookings: '总预约',
    withRental: '含租赁',

    platformTitle: 'Phosnap的环保贡献',
    totalContribution: '总计节省',
    trees: '棵',
    cars: '辆',
    km: 'km',
    noData: '还没有数据',
  },
};

// Carbon calculation helpers
const calculateCarbonForBooking = (booking) => {
  // Estimate: renting vs buying
  // Average outfit production: 20-30 kg CO2
  // Rental reduces by ~50% (shared use)
  const baseCO2 = 25;
  return booking?.usedRental ? baseCO2 * 0.5 : 0;
};

const carbonToTrees = (co2) => (co2 / 21).toFixed(1); // 1 tree absorbs ~21kg CO2/year
const carbonToDriving = (co2) => (co2 / 0.12).toFixed(0); // avg car emits ~0.12kg CO2/km

export default function CarbonFootprint({ mode = 'dashboard', booking = null, bookings = [], allBookings = [] }) {
  const { lang } = useLanguage();
  const [animatedValue, setAnimatedValue] = useState(0);
  const containerRef = useRef(null);
  const t = translations[lang] || translations.en;

  useEffect(() => {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: '0px',
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animateCounter();
        observer.unobserve(entry.target);
      }
    }, observerOptions);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [mode, booking, bookings, allBookings]);

  const animateCounter = () => {
    let current = 0;
    const target = getMainValue();
    const duration = 1500;
    const start = Date.now();

    const update = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      current = target * progress;
      setAnimatedValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    update();
  };

  const getMainValue = () => {
    if (mode === 'booking' && booking) {
      return calculateCarbonForBooking(booking);
    } else if (mode === 'dashboard' && bookings.length > 0) {
      return bookings.reduce((sum, b) => sum + calculateCarbonForBooking(b), 0);
    } else if (mode === 'platform' && allBookings.length > 0) {
      return allBookings.reduce((sum, b) => sum + calculateCarbonForBooking(b), 0);
    }
    return 0;
  };

  const styles = {
    container: {
      background: 'var(--bg2)',
      border: '1px solid var(--gold-border)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
    },
    title: {
      fontSize: '18px',
      fontFamily: 'var(--font-serif)',
      color: 'var(--gold)',
      marginBottom: '20px',
      textAlign: 'center',
    },
    badge: {
      display: 'inline-block',
      background: '#22c55e',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      marginTop: '4px',
    },
  };

  if (mode === 'booking') {
    const carbonSaved = calculateCarbonForBooking(booking);
    const trees = carbonToTrees(carbonSaved);
    const km = carbonToDriving(carbonSaved);

    if (carbonSaved === 0) return null;

    return (
      <div ref={containerRef} style={styles.container}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
            {t.savingText}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e', marginBottom: '12px' }}>
            {animatedValue.toFixed(1)} kg {t.saved}
          </div>
          <div style={styles.badge}>🌍 친환경 선택</div>

          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>🌳</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                {trees} {t.trees}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                {t.treeLabel}
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>🚗</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                {km} {t.km}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                {t.drivingLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'dashboard') {
    const totalCO2 = bookings.reduce((sum, b) => sum + calculateCarbonForBooking(b), 0);
    const rentalCount = bookings.filter((b) => b.usedRental).length;
    const ecoScore = Math.min(100, rentalCount * 15 + totalCO2 * 2);

    const getLevelBadge = () => {
      if (ecoScore < 25) return { icon: '🌱', label: t.seed, color: '#84cc16' };
      if (ecoScore < 50) return { icon: '🌿', label: t.sprout, color: '#22c55e' };
      if (ecoScore < 75) return { icon: '🌳', label: t.tree, color: '#16a34a' };
      return { icon: '🌲', label: t.forest, color: '#15803d' };
    };

    const level = getLevelBadge();

    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.title}>🌍 {t.myEcoScore}</div>

        {/* Circular Progress */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <svg width="160" height="160" style={{ marginBottom: '12px' }}>
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={level.color}
              strokeWidth="8"
              strokeDasharray={`${(ecoScore / 100) * 440} 440`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
              transform="rotate(-90 80 80)"
            />
            <text
              x="80"
              y="80"
              textAnchor="middle"
              dy="0.3em"
              style={{
                fontSize: '32px',
                fontWeight: '700',
                fill: 'var(--text)',
              }}
            >
              {Math.round(ecoScore)}
            </text>
            <text
              x="80"
              y="105"
              textAnchor="middle"
              style={{
                fontSize: '11px',
                fill: 'var(--muted)',
              }}
            >
              /100
            </text>
          </svg>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{level.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: level.color }}>
              {level.label}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
              {t.totalSaved}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
              {animatedValue.toFixed(1)} kg
            </div>
          </div>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
              {t.totalBookings}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
              {rentalCount}/{bookings.length}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
              {t.withRental}
            </div>
          </div>
        </div>

        {/* Guidance text when score is 0 */}
        {ecoScore === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '14px 12px',
              background: 'rgba(212, 175, 55, 0.06)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text)',
              lineHeight: '1.6',
              marginBottom: '12px',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {t.ecoGuidance}
          </div>
        )}

        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.05)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--text)',
          }}
        >
          {t.contribution}
        </div>
      </div>
    );
  }

  if (mode === 'platform') {
    const totalCO2 = allBookings.reduce((sum, b) => sum + calculateCarbonForBooking(b), 0);
    const totalTrees = carbonToTrees(totalCO2);
    const totalKm = carbonToDriving(totalCO2);
    const carsOff = (totalCO2 / (0.12 * 10000)).toFixed(1); // estimated km per car per year

    if (totalCO2 === 0) {
      return (
        <div ref={containerRef} style={styles.container}>
          <div style={styles.title}>🌍 {t.platformTitle}</div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
            {t.noData}
          </div>
        </div>
      );
    }

    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.title}>🌍 {t.platformTitle}</div>

        {/* Big Number */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '32px 20px',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
            {t.totalContribution}
          </div>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#22c55e', marginBottom: '8px' }}>
            {(totalCO2 / 1000).toFixed(2)}
            <span style={{ fontSize: '24px', marginLeft: '8px' }}>톤</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            CO₂ {t.saved}
          </div>
        </div>

        {/* Equivalents Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌳</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>
              {totalTrees}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              {t.trees}
            </div>
          </div>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🚗</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>
              {carsOff}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              {t.cars}
            </div>
          </div>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🛣️</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e' }}>
              {totalKm}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              {t.km}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
