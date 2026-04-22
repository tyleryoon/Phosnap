import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { PHOTOGRAPHERS } from '../data/photographers';
import Corners from './Corners';

// ─── 도시별 좌표 (위도/경도) ────────────────────────────────────────────
const CITY_COORDS = {
  seoul:     { lat: 37.5665, lng: 126.978, region: 'domestic' },
  jeju:      { lat: 33.4996, lng: 126.531, region: 'domestic' },
  busan:     { lat: 35.1796, lng: 129.075, region: 'domestic' },
  incheon:   { lat: 37.4563, lng: 126.705, region: 'domestic' },
  gyeongju:  { lat: 35.8562, lng: 129.225, region: 'domestic' },
  jeonju:    { lat: 35.8242, lng: 127.148, region: 'domestic' },
  gangneung: { lat: 37.7519, lng: 128.876, region: 'domestic' },
  sokcho:    { lat: 38.207,  lng: 128.591, region: 'domestic' },
  yeosu:     { lat: 34.7604, lng: 127.662, region: 'domestic' },
  kyoto:     { lat: 35.0116, lng: 135.768, region: 'japan' },
  tokyo:     { lat: 35.6762, lng: 139.650, region: 'japan' },
  osaka:     { lat: 34.6937, lng: 135.502, region: 'japan' },
  sapporo:   { lat: 43.0618, lng: 141.354, region: 'japan' },
  fukuoka:   { lat: 33.5904, lng: 130.402, region: 'japan' },
  danang:    { lat: 16.0544, lng: 108.202, region: 'asia' },
  bali:      { lat: -8.3405, lng: 115.092, region: 'asia' },
  guam:      { lat: 13.4443, lng: 144.794, region: 'asia' },
  hawaii:    { lat: 21.3069, lng: -157.858, region: 'pacific' },
  paris:     { lat: 48.8566, lng: 2.3522, region: 'europe' },
  prague:    { lat: 50.0755, lng: 14.4378, region: 'europe' },
  santorini: { lat: 36.3932, lng: 25.4615, region: 'europe' },
  rome:      { lat: 41.9028, lng: 12.4964, region: 'europe' },
  barcelona: { lat: 41.3851, lng: 2.1734, region: 'europe' },
  newyork:   { lat: 40.7128, lng: -74.006, region: 'americas' },
};

const CITY_NAMES = {
  seoul: { ko: '서울', en: 'Seoul', ja: 'ソウル', zh: '首尔' },
  jeju: { ko: '제주', en: 'Jeju', ja: '済州', zh: '济州' },
  busan: { ko: '부산', en: 'Busan', ja: '釜山', zh: '釜山' },
  incheon: { ko: '인천', en: 'Incheon', ja: '仁川', zh: '仁川' },
  gyeongju: { ko: '경주', en: 'Gyeongju', ja: '慶州', zh: '庆州' },
  jeonju: { ko: '전주', en: 'Jeonju', ja: '全州', zh: '全州' },
  gangneung: { ko: '강릉', en: 'Gangneung', ja: '江陵', zh: '江陵' },
  sokcho: { ko: '속초', en: 'Sokcho', ja: '束草', zh: '束草' },
  yeosu: { ko: '여수', en: 'Yeosu', ja: '麗水', zh: '丽水' },
  kyoto: { ko: '교토', en: 'Kyoto', ja: '京都', zh: '京都' },
  tokyo: { ko: '도쿄', en: 'Tokyo', ja: '東京', zh: '东京' },
  osaka: { ko: '오사카', en: 'Osaka', ja: '大阪', zh: '大阪' },
  sapporo: { ko: '삿포로', en: 'Sapporo', ja: '札幌', zh: '札幌' },
  fukuoka: { ko: '후쿠오카', en: 'Fukuoka', ja: '福岡', zh: '福冈' },
  danang: { ko: '다낭', en: 'Da Nang', ja: 'ダナン', zh: '岘港' },
  bali: { ko: '발리', en: 'Bali', ja: 'バリ', zh: '巴厘岛' },
  guam: { ko: '괌', en: 'Guam', ja: 'グアム', zh: '关岛' },
  hawaii: { ko: '하와이', en: 'Hawaii', ja: 'ハワイ', zh: '夏威夷' },
  paris: { ko: '파리', en: 'Paris', ja: 'パリ', zh: '巴黎' },
  prague: { ko: '프라하', en: 'Prague', ja: 'プラハ', zh: '布拉格' },
  santorini: { ko: '산토리니', en: 'Santorini', ja: 'サントリーニ', zh: '圣托里尼' },
  rome: { ko: '로마', en: 'Rome', ja: 'ローマ', zh: '罗马' },
  barcelona: { ko: '바르셀로나', en: 'Barcelona', ja: 'バルセロナ', zh: '巴塞罗那' },
  newyork: { ko: '뉴욕', en: 'New York', ja: 'ニューヨーク', zh: '纽约' },
};

// ─── 투영 함수 ──────────────────────────────────────────────────────────
const W = 480, H = 280;

const mercator = (lat, lng) => {
  const x = ((lng + 180) / 360) * W;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (H / 2) - (W * mercN) / (2 * Math.PI);
  return { x, y };
};

// 인셋 맵 범위 및 위치
const INSET = { latMin: 31, latMax: 46, lngMin: 125, lngMax: 146 };
const IB = { x: 325, y: 152, w: 140, h: 118 };

const insetProject = (lat, lng) => ({
  x: IB.x + ((lng - INSET.lngMin) / (INSET.lngMax - INSET.lngMin)) * IB.w,
  y: IB.y + ((INSET.latMax - lat) / (INSET.latMax - INSET.latMin)) * IB.h,
});

const KR_JP_IDS = new Set([
  'seoul','jeju','busan','incheon','gyeongju','jeonju','gangneung','sokcho','yeosu',
  'kyoto','tokyo','osaka','sapporo','fukuoka',
]);

// ─── 실제 좌표 기반 대륙 경로 (Mercator 투영 적용) ──────────────────
const CONTINENT_PATHS = [
  // NorthAmerica
  'M13.3,24.9 L16.0,-0.8 L46.7,-0.8 L60.0,7.4 L66.7,51.8 L73.3,62.8 L76.0,72.7 L80.0,90.1 L86.7,94.9 L93.3,98.0 L100.0,105.6 L106.7,105.6 L113.3,112.8 L120.0,119.8 L126.7,123.9 L130.7,129.3 L133.3,129.3 L137.3,115.6 L140.0,105.6 L146.7,72.7 L153.3,68.8 L166.7,62.8 L153.3,39.4 L140.0,33.9 L113.3,7.4 L73.3,-0.8 L33.3,-0.8 L13.3,24.9 Z',
  // SouthAmerica
  'M130.7,129.3 L133.3,133.3 L140.0,146.7 L146.7,160.2 L153.3,174.4 L160.0,189.9 L153.3,207.3 L146.7,223.6 L140.0,217.2 L146.7,198.3 L166.7,189.9 L180.0,174.4 L186.7,160.2 L193.3,146.7 L173.3,140.0 L166.7,133.3 L160.0,126.6 L150.7,123.9 L144.0,123.9 L136.0,129.3 L130.7,129.3 Z',
  // Europe
  'M226.7,88.5 L240.0,85.1 L246.7,74.5 L240.0,68.8 L233.3,66.9 L242.7,60.7 L246.7,54.1 L253.3,51.8 L256.0,44.6 L264.0,39.4 L273.3,39.4 L280.0,33.9 L277.3,7.4 L266.7,7.4 L260.0,14.9 L246.7,33.9 L240.0,51.8 L233.3,62.8 L226.7,74.5 L226.7,88.5 Z',
  // Africa
  'M220.0,98.0 L233.3,90.1 L253.3,86.8 L266.7,93.3 L280.0,94.9 L286.7,98.0 L293.3,119.8 L306.7,123.9 L306.7,133.3 L296.0,140.0 L293.3,146.7 L286.7,160.2 L282.7,174.4 L277.3,188.3 L266.7,189.9 L260.0,182.0 L256.0,167.2 L253.3,146.7 L246.7,133.3 L240.0,133.3 L233.3,133.3 L226.7,126.6 L216.0,119.8 L216.0,109.9 L220.0,98.0 Z',
  // Asia
  'M277.3,7.4 L286.7,7.4 L293.3,14.9 L306.7,14.9 L320.0,-0.8 L333.3,-5.2 L346.7,-0.8 L366.7,-14.9 L380.0,-5.2 L393.3,-0.8 L413.3,24.9 L420.0,51.8 L426.7,72.7 L429.3,90.1 L413.3,98.0 L400.0,105.6 L393.3,112.8 L380.0,119.8 L373.3,119.8 L366.7,126.6 L373.3,133.3 L380.0,140.0 L366.7,146.7 L346.7,133.3 L340.0,123.9 L333.3,112.8 L320.0,105.6 L313.3,105.6 L304.0,98.0 L293.3,90.1 L286.7,90.1 L280.0,88.5 L273.3,81.7 L273.3,39.4 L277.3,7.4 Z',
  // Australia
  'M393.3,160.2 L400.0,164.4 L413.3,156.1 L420.0,156.1 L433.3,160.2 L440.0,170.1 L446.7,177.4 L440.0,189.9 L433.3,194.9 L424.0,189.9 L413.3,185.1 L400.0,189.9 L393.3,186.7 L392.0,174.4 L393.3,160.2 Z',
];

// ─── 한국·일본 인셋 윤곽 (실제 좌표 기반) ──────────────────────────────
const INSET_PATHS = [
  // Korea
  'M331.7,210.2 L338.3,212.6 L347.0,211.0 L351.7,218.9 L354.3,230.7 L355.0,237.7 L348.3,240.9 L341.7,242.5 L335.0,246.4 L331.7,242.5 L334.3,234.6 L337.0,226.7 L331.7,222.8 L331.7,210.2 Z',
  // Jeju
  'M332.3,249.9 L333.7,250.7 L336.3,251.5 L337.7,250.7 L337.0,249.9 L334.3,249.5 L332.3,249.9 Z',
  // Honshu
  'M361.7,247.2 L368.3,243.3 L378.3,244.0 L388.3,240.9 L395.0,234.6 L405.0,226.7 L418.3,230.7 L425.0,224.4 L428.3,214.9 L425.0,203.1 L421.7,195.3 L425.0,187.4 L421.7,183.5 L415.0,195.3 L405.0,214.9 L391.7,238.5 L381.7,246.4 L368.3,250.3 L361.7,247.2 Z',
  // Hokkaido
  'M425.0,183.5 L431.7,187.4 L441.7,183.5 L461.7,171.7 L458.3,163.8 L448.3,159.9 L435.0,155.9 L428.3,171.7 L425.0,183.5 Z',
  // Kyushu
  'M355.0,250.3 L361.7,252.7 L368.3,258.2 L368.3,266.1 L361.7,270.0 L355.0,262.1 L355.0,250.3 Z',
  // Shikoku
  'M375.0,244.0 L381.7,242.5 L388.3,244.8 L385.0,250.3 L378.3,254.3 L375.0,250.3 L375.0,244.0 Z',
];

const WorldMap = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  // 도시별 작가 수 집계
  const cityCounts = useMemo(() => {
    const counts = {};
    PHOTOGRAPHERS.forEach(p => {
      const lid = p.locationId;
      if (lid) {
        const ids = lid.includes('_') ? lid.split('_') : [lid];
        ids.forEach(id => { if (CITY_COORDS[id]) counts[id] = (counts[id] || 0) + 1; });
      }
    });
    return counts;
  }, []);

  // 세계지도 도시 (한국·일본 제외)
  const worldCities = useMemo(() =>
    Object.entries(CITY_COORDS)
      .filter(([id]) => !KR_JP_IDS.has(id))
      .map(([id, { lat, lng, region }]) => ({ id, ...mercator(lat, lng), count: cityCounts[id] || 0, region, name: CITY_NAMES[id] }))
      .filter(c => c.count > 0),
  [cityCounts]);

  // 인셋 도시 (한국·일본)
  const insetCities = useMemo(() =>
    Object.entries(CITY_COORDS)
      .filter(([id]) => KR_JP_IDS.has(id))
      .map(([id, { lat, lng, region }]) => ({ id, ...insetProject(lat, lng), count: cityCounts[id] || 0, region, name: CITY_NAMES[id] }))
      .filter(c => c.count > 0),
  [cityCounts]);

  const allCities = [...worldCities, ...insetCities];

  const handleCityClick = useCallback((cityId) => {
    navigate('/photographers', { state: { searchQuery: CITY_NAMES[cityId]?.[lang] || cityId } });
  }, [navigate, lang]);

  // 작은 원 (1~1.5mm 크기) — 작가가 있는 지역만 표시, 숫자 없음
  const renderDot = (city, isInset = false) => {
    const isHov = hovered === city.id;
    // SVG viewBox 480×280 기준으로 약 1~1.5mm = r 1.2~1.8 정도
    const r = isInset ? 1.8 : 1.4;

    return (
      <g key={city.id} style={{ cursor: 'pointer' }}
        onClick={() => handleCityClick(city.id)}
        onMouseEnter={(e) => {
          setHovered(city.id);
          const rect = e.currentTarget.closest('svg').getBoundingClientRect();
          setTooltip({ x: city.x * (rect.width / W) + rect.left, y: city.y * (rect.height / H) + rect.top });
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {isHov && (
          <circle cx={city.x} cy={city.y} r={r + 4} fill="none" stroke="var(--gold)" strokeWidth={0.4} opacity={0.4}>
            <animate attributeName="r" from={r + 2} to={r + 8} dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from={0.4} to={0} dur="1.2s" repeatCount="indefinite" />
          </circle>
        )}
        {/* 은은한 글로우 배경 */}
        <circle cx={city.x} cy={city.y} r={r * 2.5}
          fill="rgba(232,160,32,0.08)"
          filter={isHov ? 'url(#gH)' : 'url(#gN)'}
        />
        {/* 메인 도트 — 작고 균일한 크기 */}
        <circle cx={city.x} cy={city.y} r={isHov ? r + 0.8 : r}
          fill={isHov ? 'rgba(232,160,32,1)' : 'rgba(232,160,32,0.75)'}
          stroke={isHov ? 'rgba(232,160,32,1)' : 'rgba(232,160,32,0.5)'}
          strokeWidth={isHov ? 0.6 : 0.3}
          style={{ transition: 'all 0.2s ease' }}
        />
        {/* 인셋에서 도시명 (호버 아닐 때만) */}
        {isInset && !isHov && (
          <text x={city.x + r + 2.5} y={city.y + 1.5}
            fill="rgba(242,242,242,0.45)" fontSize={4.8}
            fontFamily="var(--font-serif)" letterSpacing="0.02em"
            style={{ pointerEvents: 'none' }}
          >
            {city.name?.[lang] || city.id}
          </text>
        )}
        {/* 호버 시 도시명 표시 */}
        {isHov && (
          <text x={city.x} y={city.y - r - 3}
            textAnchor="middle" fill="var(--gold)" fontSize={isInset ? 6 : 5.5} fontWeight="600"
            fontFamily="var(--font-serif)" style={{ pointerEvents: 'none' }}
          >
            {city.name?.[lang] || city.id}
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <radialGradient id="mG" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(232,160,32,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="gN"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="gH"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <rect width={W} height={H} fill="var(--bg)" />
        <rect width={W} height={H} fill="url(#mG)" />

        {/* 그리드 */}
        {[25,50,75].map(p => <line key={p} x1={0} y1={H*p/100} x2={W} y2={H*p/100} stroke="var(--border)" strokeWidth={0.2} strokeDasharray="2,6" opacity={0.15} />)}
        {[25,50,75].map(p => <line key={`v${p}`} x1={W*p/100} y1={0} x2={W*p/100} y2={H} stroke="var(--border)" strokeWidth={0.2} strokeDasharray="2,6" opacity={0.15} />)}

        {/* 대륙 윤곽 */}
        {CONTINENT_PATHS.map((d, i) => (
          <path key={i} d={d} fill="rgba(242,242,242,0.03)" stroke="rgba(242,242,242,0.08)" strokeWidth={0.4} strokeLinejoin="round" />
        ))}

        {/* 세계 도시 도트 */}
        {worldCities.map(c => renderDot(c, false))}

        {/* ═══ 한국·일본 인셋 ═══ */}
        <rect x={IB.x - 4} y={IB.y - 14} width={IB.w + 8} height={IB.h + 18}
          fill="rgba(11,11,11,0.88)" stroke="var(--gold-border)" strokeWidth={0.5} rx={1} />
        <text x={IB.x + IB.w / 2} y={IB.y - 5} textAnchor="middle"
          fill="var(--gold)" fontSize={5} fontFamily="var(--font-serif)" letterSpacing="0.15em" opacity={0.8}
        >
          {lang === 'ko' ? '한국 · 일본' : lang === 'ja' ? '韓国・日本' : 'KOREA · JAPAN'}
        </text>

        {/* 연결선 */}
        <line x1={396} y1={52} x2={IB.x} y2={IB.y + 20} stroke="rgba(232,160,32,0.12)" strokeWidth={0.4} strokeDasharray="2,3" />

        {/* 인셋 윤곽 */}
        {INSET_PATHS.map((d, i) => (
          <path key={`ip${i}`} d={d} fill="rgba(242,242,242,0.05)" stroke="rgba(242,242,242,0.12)" strokeWidth={0.4} strokeLinejoin="round" />
        ))}

        {/* 인셋 도시 도트 */}
        {insetCities.map(c => renderDot(c, true))}

        {/* 범례 — 간소화: 작가 활동 지역 표시 */}
        <g transform={`translate(8, ${H - 16})`}>
          <circle cx={4} cy={4} r={1.4} fill="rgba(232,160,32,0.75)" stroke="rgba(232,160,32,0.5)" strokeWidth={0.3} />
          <text x={10} y={5.5} fill="var(--muted)" fontSize={4} fontFamily="var(--font-serif)" letterSpacing="0.08em" opacity={0.6}>
            {lang === 'ko' ? '작가 활동 지역' : lang === 'ja' ? 'フォトグラファー活動地域' : 'photographer locations'}
          </text>
        </g>
      </svg>

      {/* 툴팁 */}
      {hovered && (() => {
        const city = allCities.find(c => c.id === hovered);
        if (!city) return null;
        return (
          <div style={{
            position: 'fixed', left: tooltip.x, top: tooltip.y - 12,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(20,20,18,0.95)', border: '1px solid var(--gold-border)',
            padding: '7px 12px', pointerEvents: 'none', zIndex: 100,
            minWidth: 80, textAlign: 'center', backdropFilter: 'blur(8px)',
          }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: 'var(--gold)', letterSpacing: '0.06em' }}>
              {city.name?.[lang] || city.id}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default WorldMap;
