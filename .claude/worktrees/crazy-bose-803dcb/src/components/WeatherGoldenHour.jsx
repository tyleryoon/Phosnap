import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const WEATHER_CODES = {
  0: { icon: '☀️', ko: '맑음', en: 'Clear', ja: '晴れ', zh: '晴' },
  1: { icon: '🌤️', ko: '대체로 맑음', en: 'Mainly Clear', ja: 'おおむね晴れ', zh: '大部分晴' },
  2: { icon: '⛅', ko: '부분 흐림', en: 'Partly Cloudy', ja: '一部曇り', zh: '局部多云' },
  3: { icon: '☁️', ko: '흐림', en: 'Overcast', ja: '曇り', zh: '阴' },
  45: { icon: '🌫️', ko: '안개', en: 'Fog', ja: '霧', zh: '雾' },
  48: { icon: '🌫️', ko: '안개', en: 'Fog', ja: '霧', zh: '雾' },
  51: { icon: '🌦️', ko: '가벼운 이슬비', en: 'Light Drizzle', ja: '弱い霧雨', zh: '毛毛雨' },
  53: { icon: '🌦️', ko: '이슬비', en: 'Drizzle', ja: '霧雨', zh: '细雨' },
  55: { icon: '🌧️', ko: '강한 이슬비', en: 'Heavy Drizzle', ja: '強い霧雨', zh: '大毛毛雨' },
  61: { icon: '🌧️', ko: '약한 비', en: 'Light Rain', ja: '弱い雨', zh: '小雨' },
  63: { icon: '🌧️', ko: '비', en: 'Rain', ja: '雨', zh: '雨' },
  65: { icon: '🌧️', ko: '강한 비', en: 'Heavy Rain', ja: '強い雨', zh: '大雨' },
  71: { icon: '❄️', ko: '약한 눈', en: 'Light Snow', ja: '弱い雪', zh: '小雪' },
  73: { icon: '❄️', ko: '눈', en: 'Snow', ja: '雪', zh: '雪' },
  75: { icon: '❄️', ko: '강한 눈', en: 'Heavy Snow', ja: '強い雪', zh: '大雪' },
  95: { icon: '⛈️', ko: '뇌우', en: 'Thunderstorm', ja: '雷雨', zh: '雷暴' },
};

const translations = {
  ko: {
    weather: '날씨',
    temp: '기온',
    high: '최고',
    low: '최저',
    precip: '강수확률',
    sunrise: '일출',
    sunset: '일몰',
    goldenHour: '골든아워',
    excellent: '촬영하기 좋은 날씨예요!',
    good: '구름이 있지만 촬영 가능해요',
    warning: '우천 가능성 — 실내 촬영도 고려해보세요',
    loading: '날씨를 불러오는 중...',
    error: '날씨 정보를 불러올 수 없습니다',
    retry: '다시 시도',
  },
  en: {
    weather: 'Weather',
    temp: 'Temperature',
    high: 'High',
    low: 'Low',
    precip: 'Precipitation',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    goldenHour: 'Golden Hour',
    excellent: 'Perfect shooting weather!',
    good: 'Cloudy but still shootable',
    warning: 'Rain likely — consider indoor shooting',
    loading: 'Loading weather...',
    error: 'Unable to load weather information',
    retry: 'Retry',
  },
  ja: {
    weather: '天気',
    temp: '気温',
    high: '最高',
    low: '最低',
    precip: '降水確率',
    sunrise: '日出',
    sunset: '日没',
    goldenHour: 'ゴールデンアワー',
    excellent: '撮影に最適な天気です',
    good: '曇りですが撮影可能です',
    warning: '雨の可能性 — 屋内撮影もお勧めします',
    loading: '天気を読み込み中...',
    error: '天気情報を読み込めません',
    retry: 'もう一度試す',
  },
  zh: {
    weather: '天气',
    temp: '温度',
    high: '最高',
    low: '最低',
    precip: '降水概率',
    sunrise: '日出',
    sunset: '日落',
    goldenHour: '黄金时刻',
    excellent: '非常适合拍摄的天气！',
    good: '多云但仍可拍摄',
    warning: '可能降雨 — 请考虑室内拍摄',
    loading: '加载天气中...',
    error: '无法加载天气信息',
    retry: '重试',
  },
};

export default function WeatherGoldenHour({ date, latitude, longitude, locationName }) {
  const { lang } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [goldenHour, setGoldenHour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = translations[lang] || translations.en;

  useEffect(() => {
    if (!date || latitude === undefined || longitude === undefined) {
      setLoading(false);
      return;
    }

    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch weather from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${date}&end_date=${date}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        // Fetch sunrise/sunset
        const sunUrl = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${date}&formatted=0`;
        const sunResponse = await fetch(sunUrl);
        const sunData = await sunResponse.json();

        if (sunData.status === 'OK') {
          const sunrise = new Date(sunData.results.sunrise);
          const sunset = new Date(sunData.results.sunset);

          // Calculate golden hour: 1 hour before sunset
          const goldenHourStart = new Date(sunset.getTime() - 60 * 60 * 1000);
          const goldenHourEnd = sunset;

          setGoldenHour({
            sunrise: formatTime(sunrise),
            sunset: formatTime(sunset),
            goldenHourStart: formatTime(goldenHourStart),
            goldenHourEnd: formatTime(goldenHourEnd),
          });
        }

        if (weatherData.daily) {
          const daily = weatherData.daily;
          setWeather({
            code: daily.weathercode[0],
            tempMax: Math.round(daily.temperature_2m_max[0]),
            tempMin: Math.round(daily.temperature_2m_min[0]),
            precipProb: daily.precipitation_probability_max[0] || 0,
          });
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [date, latitude, longitude]);

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getRecommendation = () => {
    if (!weather) return null;
    const { code, precipProb } = weather;

    if (code < 3 && precipProb < 30) {
      return {
        icon: '☀️',
        text: t.excellent,
        color: '#4ade80', // green
      };
    } else if (code < 61 && precipProb < 60) {
      return {
        icon: '⛅',
        text: t.good,
        color: '#facc15', // amber
      };
    } else {
      return {
        icon: '🌧️',
        text: t.warning,
        color: '#f97316', // orange
      };
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  const styles = {
    card: {
      background: 'var(--bg2)',
      border: '1px solid var(--gold-border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
    },
    header: {
      fontSize: '18px',
      fontFamily: 'var(--font-serif)',
      color: 'var(--gold)',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    skeleton: {
      height: '20px',
      background: 'linear-gradient(90deg, var(--bg) 25%, var(--border) 50%, var(--bg) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite',
      borderRadius: '4px',
      marginBottom: '12px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '16px',
    },
    stat: {
      background: 'var(--bg)',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid var(--border)',
    },
    statLabel: {
      fontSize: '12px',
      color: 'var(--muted)',
      marginBottom: '4px',
    },
    statValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'var(--text)',
    },
    goldenHourBox: {
      background: 'linear-gradient(135deg, rgba(218, 180, 105, 0.1), rgba(218, 180, 105, 0.05))',
      border: '1px solid var(--gold-border)',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
    },
    goldenHourText: {
      fontSize: '14px',
      color: 'var(--gold)',
      fontWeight: '600',
      marginBottom: '4px',
    },
    goldenHourTime: {
      fontSize: '16px',
      color: 'var(--text)',
    },
    badge: {
      display: 'inline-block',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '16px',
    },
    errorBox: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      padding: '12px',
      color: '#ef4444',
      fontSize: '14px',
      marginBottom: '12px',
    },
    retryBtn: {
      background: 'var(--gold)',
      color: 'var(--bg)',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      marginTop: '8px',
      transition: 'all 0.3s ease',
    },
    weatherIcon: {
      fontSize: '28px',
      marginBottom: '8px',
    },
    recommendation: {
      display: 'inline-block',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      marginTop: '12px',
    },
  };

  const recommendation = getRecommendation();

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>📍 {locationName || t.weather}</div>
        <div style={styles.skeleton} />
        <div style={styles.skeleton} style={{ marginBottom: '8px' }} />
        <div style={styles.skeleton} style={{ marginBottom: '0px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>📍 {locationName || t.weather}</div>
        <div style={styles.errorBox}>{t.error}</div>
        <button style={styles.retryBtn} onClick={handleRetry}>{t.retry}</button>
      </div>
    );
  }

  if (!weather || !goldenHour) {
    return null;
  }

  const weatherInfo = WEATHER_CODES[weather.code] || WEATHER_CODES[0];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        📍 {locationName || t.weather}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={styles.weatherIcon}>{weatherInfo.icon}</div>
        <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>
          {weatherInfo[lang] || weatherInfo.en}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>{t.high}/{t.low}</div>
          <div style={styles.statValue}>{weather.tempMax}°C / {weather.tempMin}°C</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>{t.precip}</div>
          <div style={styles.statValue}>{weather.precipProb}%</div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>{t.sunrise}</div>
          <div style={styles.statValue}>{goldenHour.sunrise}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>{t.sunset}</div>
          <div style={styles.statValue}>{goldenHour.sunset}</div>
        </div>
      </div>

      <div style={styles.goldenHourBox}>
        <div style={styles.goldenHourText}>🌅 {t.goldenHour}</div>
        <div style={styles.goldenHourTime}>
          {goldenHour.goldenHourStart} ~ {goldenHour.goldenHourEnd}
        </div>
      </div>

      {recommendation && (
        <div
          style={{
            ...styles.badge,
            background: `${recommendation.color}20`,
            color: recommendation.color,
            border: `1px solid ${recommendation.color}40`,
          }}
        >
          {recommendation.icon} {recommendation.text}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
