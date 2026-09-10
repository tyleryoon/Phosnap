import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Get popularity indicator level (1-5) based on bookings
 * Mock implementation - in production, would use actual demand forecasting
 */
export function getPopularityIndicator(bookings, targetDate) {
  if (!bookings || !Array.isArray(bookings)) {
    return { level: 1, bookingRate: 0, season: null };
  }

  // Count bookings for the target date
  const dateBookings = bookings.filter((booking) => {
    if (!booking.date) return false;
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    return bookingDate === targetDate;
  }).length;

  // Simple heuristic: 0-1 = level 1, 2-3 = level 2, 4-5 = level 3, 6-7 = level 4, 8+ = level 5
  const level = Math.min(5, Math.max(1, Math.ceil((dateBookings + 1) / 2)));
  const bookingRate = Math.min(100, Math.round((dateBookings / 10) * 100));

  // Detect season based on month
  let season = null;
  if (targetDate) {
    const month = parseInt(targetDate.split('-')[1], 10);
    if (month >= 3 && month <= 5) season = 'cherry_blossom';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'autumn';
    else season = 'winter';
  }

  return { level, bookingRate, season };
}

/**
 * PopularityIndicator Component
 * Shows demand/popularity with visual indicators
 */
const PopularityIndicator = ({ bookings, targetDate, compact = false }) => {
  const { lang, t } = useLanguage();

  const { level, bookingRate, season } = useMemo(
    () => getPopularityIndicator(bookings, targetDate),
    [bookings, targetDate]
  );

  const seasonLabels = {
    cherry_blossom: { ko: '🌸 벚꽃 시즌', en: '🌸 Cherry Blossom Season', ja: '🌸 桜シーズン', zh: '🌸 樱花季' },
    summer: { ko: '☀️ 여름', en: '☀️ Summer', ja: '☀️ 夏', zh: '☀️ 夏天' },
    autumn: { ko: '🍂 가을', en: '🍂 Autumn', ja: '🍂 秋', zh: '🍂 秋天' },
    winter: { ko: '❄️ 겨울', en: '❄️ Winter', ja: '❄️ 冬', zh: '❄️ 冬天' },
  };

  // Don't show indicator if popularity is low
  if (level < 3) {
    return null;
  }

  if (compact) {
    // Compact mode for Photographers cards
    const compactLabels = {
      ko: '인기',
      en: 'Popular',
      ja: '人気',
      zh: '热门',
    };

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: 'rgba(255, 140, 100, 0.15)',
          border: '1px solid rgba(255, 140, 100, 0.3)',
          borderRadius: '12px',
          fontSize: '12px',
          fontFamily: 'var(--font-sans)',
          color: '#FF8C64',
          fontWeight: '500',
        }}
      >
        <span>🔥</span>
        <span>{compactLabels[lang]}</span>
      </div>
    );
  }

  // Full mode for Booking page
  const fullLabels = {
    banner: {
      ko: '이 기간은 인기가 많아요 — 빠른 예약을 추천드려요!',
      en: 'This period is very popular — we recommend booking soon!',
      ja: 'この期間は人気があります — 早期予約をお勧めします!',
      zh: '这个时期很受欢迎 — 我们建议尽快预约!',
    },
    bookingRate: {
      ko: '예약률',
      en: 'Booking Rate',
      ja: '予約率',
      zh: '预订率',
    },
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        backgroundColor: 'rgba(212, 167, 106, 0.08)',
        border: '1px solid var(--gold-border)',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      {/* Banner message */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '14px',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text)',
        }}
      >
        <span style={{ fontSize: '20px', marginTop: '2px' }}>🔥</span>
        <span style={{ lineHeight: '1.4' }}>{fullLabels.banner[lang]}</span>
      </div>

      {/* Popularity bars (1-5 level indicator) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: '6px',
              backgroundColor: index < level ? 'var(--gold)' : 'var(--border)',
              borderRadius: '3px',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Season label and booking rate */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          fontFamily: 'var(--font-sans)',
          color: 'var(--muted)',
        }}
      >
        <div>
          {season && seasonLabels[season] && (
            <span>{seasonLabels[season][lang]}</span>
          )}
        </div>
        <div>
          {fullLabels.bookingRate[lang]} {bookingRate}%
        </div>
      </div>
    </div>
  );
};

export default PopularityIndicator;
