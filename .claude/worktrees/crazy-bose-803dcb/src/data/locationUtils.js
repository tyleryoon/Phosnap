// ─── Dynamic Location Registry ──────────────────────────────────────────
// 작가(PHOTOGRAPHERS) 데이터를 기반으로 지역 목록을 동적 생성
// 새 작가가 새 locationId로 등록되면 자동으로 탐색·필터에 반영
//
// 방안 B: DB 테이블 없이 작가 데이터에서 파생
// ────────────────────────────────────────────────────────────────────────

import { PHOTOGRAPHERS } from './photographers';

// ── 국가 정보 (다국어 이름 + 국기) ─────────────────────────────────────
export const COUNTRIES = {
  KR: { ko: '한국', en: 'South Korea', ja: '韓国', zh: '韩国', flag: '🇰🇷' },
  JP: { ko: '일본', en: 'Japan', ja: '日本', zh: '日本', flag: '🇯🇵' },
  CN: { ko: '중국', en: 'China', ja: '中国', zh: '中国', flag: '🇨🇳' },
  TW: { ko: '대만', en: 'Taiwan', ja: '台湾', zh: '台湾', flag: '🇹🇼' },
  TH: { ko: '태국', en: 'Thailand', ja: 'タイ', zh: '泰国', flag: '🇹🇭' },
  VN: { ko: '베트남', en: 'Vietnam', ja: 'ベトナム', zh: '越南', flag: '🇻🇳' },
  ID: { ko: '인도네시아', en: 'Indonesia', ja: 'インドネシア', zh: '印度尼西亚', flag: '🇮🇩' },
  US: { ko: '미국', en: 'United States', ja: 'アメリカ', zh: '美国', flag: '🇺🇸' },
  FR: { ko: '프랑스', en: 'France', ja: 'フランス', zh: '法国', flag: '🇫🇷' },
  IT: { ko: '이탈리아', en: 'Italy', ja: 'イタリア', zh: '意大利', flag: '🇮🇹' },
  ES: { ko: '스페인', en: 'Spain', ja: 'スペイン', zh: '西班牙', flag: '🇪🇸' },
  GB: { ko: '영국', en: 'United Kingdom', ja: 'イギリス', zh: '英国', flag: '🇬🇧' },
  DE: { ko: '독일', en: 'Germany', ja: 'ドイツ', zh: '德国', flag: '🇩🇪' },
  AU: { ko: '호주', en: 'Australia', ja: 'オーストラリア', zh: '澳大利亚', flag: '🇦🇺' },
  SG: { ko: '싱가포르', en: 'Singapore', ja: 'シンガポール', zh: '新加坡', flag: '🇸🇬' },
  MY: { ko: '말레이시아', en: 'Malaysia', ja: 'マレーシア', zh: '马来西亚', flag: '🇲🇾' },
  PH: { ko: '필리핀', en: 'Philippines', ja: 'フィリピン', zh: '菲律宾', flag: '🇵🇭' },
  IN: { ko: '인도', en: 'India', ja: 'インド', zh: '印度', flag: '🇮🇳' },
  GR: { ko: '그리스', en: 'Greece', ja: 'ギリシャ', zh: '希腊', flag: '🇬🇷' },
  CZ: { ko: '체코', en: 'Czech Republic', ja: 'チェコ', zh: '捷克', flag: '🇨🇿' },
  GU: { ko: '괌', en: 'Guam', ja: 'グアム', zh: '关岛', flag: '🇬🇺' },
};

// ── 국가별 주요 도시 프리셋 ─────────────────────────────────────────────
export const CITY_PRESETS = {
  KR: ['seoul', 'busan', 'jeju', 'gyeongju', 'incheon', 'daegu', 'jeonju', 'gangneung', 'sokcho'],
  JP: ['tokyo', 'kyoto', 'osaka', 'okinawa', 'hokkaido', 'nara', 'yokohama', 'fukuoka', 'kobe'],
  CN: ['shanghai', 'beijing', 'chengdu', 'hangzhou', 'guangzhou', 'shenzhen', 'xian'],
  US: ['newyork', 'losangeles', 'sanfrancisco', 'hawaii', 'chicago', 'miami', 'seattle'],
  FR: ['paris', 'nice', 'lyon', 'marseille'],
  TH: ['bangkok', 'chiangmai', 'phuket'],
  VN: ['hanoi', 'hochiminh', 'danang'],
  ID: ['bali', 'jakarta', 'yogyakarta'],
};

// ── 메타데이터 (nameI18n 4개국어 + 대표 이미지 + countryCode) ─────────────
// locations.js에서 옮겨온 정적 메타 — 알려진 도시의 표시명·이미지 제공
// 새 도시는 여기에 없어도 작가 데이터의 locationNames로 자동 fallback
const LOCATION_META = {
  // ── 국내 ──────────────────────────────────────────────────────────────
  seoul:     { countryCode: 'KR', nameI18n: { ko: '서울',   en: 'Seoul',     ja: 'ソウル',     zh: '首尔' },   img: 'https://images.unsplash.com/photo-1538485399081-7c8272e0490d?w=600&q=80' },
  jeju:      { countryCode: 'KR', nameI18n: { ko: '제주',   en: 'Jeju',      ja: '済州',       zh: '济州' },   img: 'https://images.unsplash.com/photo-1570108975728-4e03fd1e9c4c?w=600&q=80' },
  incheon:   { countryCode: 'KR', nameI18n: { ko: '인천',   en: 'Incheon',   ja: '仁川',       zh: '仁川' },   img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80' },
  sokcho:    { countryCode: 'KR', nameI18n: { ko: '속초',   en: 'Sokcho',    ja: '束草',       zh: '束草' },   img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80' },
  gangneung: { countryCode: 'KR', nameI18n: { ko: '강릉',   en: 'Gangneung', ja: '江陵',       zh: '江陵' },   img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80' },
  jeonju:    { countryCode: 'KR', nameI18n: { ko: '전주',   en: 'Jeonju',    ja: '全州',       zh: '全州' },   img: 'https://images.unsplash.com/photo-1578913071922-9b1bb28b1240?w=600&q=80' },
  gyeongju:  { countryCode: 'KR', nameI18n: { ko: '경주',   en: 'Gyeongju',  ja: '慶州',       zh: '庆州' },   img: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=600&q=80' },
  busan:     { countryCode: 'KR', nameI18n: { ko: '부산',   en: 'Busan',     ja: '釜山',       zh: '釜山' },   img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80' },
  yeosu:     { countryCode: 'KR', nameI18n: { ko: '여수',   en: 'Yeosu',     ja: '麗水',       zh: '丽水' },   img: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=600&q=80' },
  // ── 해외 · 일본 ──────────────────────────────────────────────────────
  kyoto:     { countryCode: 'JP', nameI18n: { ko: '교토',     en: 'Kyoto',     ja: '京都',         zh: '京都' },     img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80' },
  tokyo:     { countryCode: 'JP', nameI18n: { ko: '도쿄',     en: 'Tokyo',     ja: '東京',         zh: '东京' },     img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80' },
  sapporo:   { countryCode: 'JP', nameI18n: { ko: '삿포로',   en: 'Sapporo',   ja: '札幌',         zh: '札幌' },     img: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&q=80' },
  osaka:     { countryCode: 'JP', nameI18n: { ko: '오사카',   en: 'Osaka',     ja: '大阪',         zh: '大阪' },     img: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=600&q=80' },
  fukuoka:   { countryCode: 'JP', nameI18n: { ko: '후쿠오카', en: 'Fukuoka',   ja: '福岡',         zh: '福冈' },     img: 'https://images.unsplash.com/photo-1610547189313-1fbea2dcd059?w=600&q=80' },
  // ── 해외 · 아시아·태평양 ──────────────────────────────────────────────
  guam:      { countryCode: 'GU', nameI18n: { ko: '괌',       en: 'Guam',      ja: 'グアム',       zh: '关岛' },     img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80' },
  danang:    { countryCode: 'VN', nameI18n: { ko: '다낭',     en: 'Da Nang',   ja: 'ダナン',       zh: '岘港' },     img: 'https://images.unsplash.com/photo-1555217851-6141535bd771?w=600&q=80' },
  bali:      { countryCode: 'ID', nameI18n: { ko: '발리',     en: 'Bali',      ja: 'バリ',         zh: '巴厘岛' },   img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80' },
  // ── 해외 · 태평양·유럽 ───────────────────────────────────────────────
  hawaii:    { countryCode: 'US', nameI18n: { ko: '하와이',   en: 'Hawaii',    ja: 'ハワイ',       zh: '夏威夷' },   img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80' },
  prague:    { countryCode: 'CZ', nameI18n: { ko: '프라하',   en: 'Prague',    ja: 'プラハ',       zh: '布拉格' },   img: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=600&q=80' },
  paris:     { countryCode: 'FR', nameI18n: { ko: '파리',     en: 'Paris',     ja: 'パリ',         zh: '巴黎' },     img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80' },
  santorini: { countryCode: 'GR', nameI18n: { ko: '산토리니', en: 'Santorini', ja: 'サントリーニ', zh: '圣托里尼' }, img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80' },
  rome:      { countryCode: 'IT', nameI18n: { ko: '로마',     en: 'Rome',      ja: 'ローマ',       zh: '罗马' },     img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80' },
  barcelona: { countryCode: 'ES', nameI18n: { ko: '바르셀로나', en: 'Barcelona', ja: 'バルセロナ', zh: '巴塞罗那' }, img: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80' },
  newyork:   { countryCode: 'US', nameI18n: { ko: '뉴욕',     en: 'New York',  ja: 'ニューヨーク', zh: '纽约' },     img: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=600&q=80' },
  venice:    { countryCode: 'IT', nameI18n: { ko: '베네치아', en: 'Venice',    ja: 'ヴェネツィア', zh: '威尼斯' },   img: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&q=80' },
};

// ── 국내 도시 ID 집합 ────────────────────────────────────────────────────
const DOMESTIC_IDS = new Set([
  'seoul', 'jeju', 'incheon', 'sokcho', 'gangneung',
  'jeonju', 'gyeongju', 'busan', 'yeosu',
  // 추가 국내 도시 — 작가가 등록하면 자동 인식
  'daejeon', 'daegu', 'gwangju', 'ulsan', 'suwon',
  'chuncheon', 'andong', 'tongyeung', 'geoje', 'pohang',
  'mokpo', 'gunsan', 'chungju', 'wonju', 'sejong',
]);

// ── 서울 기준 거리 (km) — 정렬용 ─────────────────────────────────────
export const SEOUL_DIST = {
  // 국내
  seoul: 0, incheon: 30, suwon: 35, chuncheon: 80, wonju: 130,
  chungju: 140, sejong: 160, daejeon: 160, andong: 190,
  gangneung: 210, sokcho: 215, jeonju: 230, gunsan: 240,
  gwangju: 270, daegu: 240, gyeongju: 280, pohang: 310,
  busan: 330, ulsan: 310, tongyeung: 370, geoje: 380,
  mokpo: 330, yeosu: 340, jeju: 460,
  // 일본 (고정 5 + 추가)
  fukuoka: 541, kumamoto: 650, nagasaki: 600, kitakyushu: 570,
  kobe: 730, hiroshima: 760, beppu: 740, nara: 770, osaka: 780,
  kyoto: 790, miyazaki: 800, okayama: 820, kurashiki: 830,
  kagoshima: 830, matsuyama: 890, kanazawa: 1000, toyama: 1010,
  takayama: 1020, nagoya: 1040, matsumoto: 1120, yokohama: 1190,
  kamakura: 1210, tokyo: 1210, nikko: 1250, sendai: 1340,
  fukushima: 1340, sapporo: 1420, aomori: 1480,
  naha: 1600, okinawa: 1580,
  // 중국·홍콩·대만
  beijing: 950, shanghai: 880, hongkong: 2100, macau: 2200, taipei: 1600,
  // 동남아
  manila: 2600, guam: 3000, danang: 3200, hanoi: 3200, hochiminh: 3700,
  bangkok: 3700, phuket: 4300, singapore: 4700, kualalumpur: 4700,
  // 남아시아·오세아니아
  bali: 5500, colombo: 6200, sydney: 8300, melbourne: 8600, auckland: 9300,
  // 중앙아시아·중동
  almaty: 4200, dubai: 6500, abudhabi: 6600, istanbul: 8100,
  // 유럽
  moscow: 6400, vienna: 8500, budapest: 8500, prague: 8800,
  amsterdam: 8900, paris: 9000, london: 9000, berlin: 8800,
  santorini: 9200, rome: 9300, athens: 9300, madrid: 10000,
  barcelona: 10000, lisbon: 10700, venice: 9200,
  // 북미
  losangeles: 9600, sanfrancisco: 9300, vancouver: 8200,
  toronto: 10400, chicago: 10500, newyork: 11000, miami: 13000,
  // 카리브·중남미
  cancun: 13000, mexico: 12800,
  // 태평양
  hawaii: 7700,
};

// ── 일본 도시 정렬 ──────────────────────────────────────────────────────
// 고정 5도시: 교토(0)→도쿄(1)→삿포로(2)→오사카(3)→후쿠오카(4)
const JAPAN_FIXED = { kyoto: 0, tokyo: 1, sapporo: 2, osaka: 3, fukuoka: 4 };

const JAPAN_EXTRA_CITIES = new Set([
  'hiroshima', 'nagoya', 'nara', 'kobe', 'yokohama', 'kawasaki',
  'kamakura', 'nikko', 'hakone', 'okinawa', 'naha', 'sendai',
  'kanazawa', 'takayama', 'matsuyama', 'beppu', 'kagoshima',
  'nagasaki', 'kumamoto', 'kitakyushu', 'miyazaki', 'okayama',
  'kurashiki', 'matsumoto', 'toyama', 'fukushima', 'aomori',
]);

// ── 정렬 함수 ────────────────────────────────────────────────────────────
// 우선순위: ① 고정 일본 5도시 → ② 기타 일본 도시(서울 거리순) → ③ 그 외(서울 거리순)
export const sortBySeoulDist = (a, b) => {
  const aFixed = a.id in JAPAN_FIXED;
  const bFixed = b.id in JAPAN_FIXED;
  const aJpExtra = !aFixed && JAPAN_EXTRA_CITIES.has(a.id);
  const bJpExtra = !bFixed && JAPAN_EXTRA_CITIES.has(b.id);

  if (aFixed && bFixed) return JAPAN_FIXED[a.id] - JAPAN_FIXED[b.id];
  if (aFixed) return -1;
  if (bFixed) return 1;
  if (aJpExtra && !bJpExtra) return -1;
  if (!aJpExtra && bJpExtra) return 1;
  const aDist = SEOUL_DIST[a.id] ?? Infinity;
  const bDist = SEOUL_DIST[b.id] ?? Infinity;
  if (aDist !== bDist) return aDist - bDist;
  return (a.nameI18n?.ko ?? a.id).localeCompare(b.nameI18n?.ko ?? b.id, 'ko');
};

// 국내 정렬: 서울 → 제주 고정 → 나머지 가나다순
const DOMESTIC_FIXED = { seoul: 0, jeju: 1 };
const sortDomestic = (a, b) => {
  const aFixed = a.id in DOMESTIC_FIXED;
  const bFixed = b.id in DOMESTIC_FIXED;
  if (aFixed && bFixed) return DOMESTIC_FIXED[a.id] - DOMESTIC_FIXED[b.id];
  if (aFixed) return -1;
  if (bFixed) return 1;
  return (a.nameI18n?.ko ?? a.id).localeCompare(b.nameI18n?.ko ?? b.id, 'ko');
};

// ── 핵심: 작가 배열에서 지역 레지스트리 빌드 ─────────────────────────────
// 반환: { id, nameI18n, img, count, isDomestic }[]
export const buildLocationRegistry = (photographers = PHOTOGRAPHERS) => {
  // 1. locationId 별 집계
  const countMap = {};   // id → count
  const nameMap = {};    // id → locationNames (첫 번째 작가에서 추출)

  photographers.forEach(p => {
    if (!p.locationId) return;
    const lid = p.locationId;
    countMap[lid] = (countMap[lid] || 0) + 1;
    if (!nameMap[lid] && p.locationNames) {
      nameMap[lid] = p.locationNames;
    }
  });

  // 2. 각 locationId → 완성된 지역 객체 생성
  const locations = Object.keys(countMap).map(id => {
    const meta = LOCATION_META[id];
    const isDomestic = DOMESTIC_IDS.has(id);

    // nameI18n 우선순위: LOCATION_META > 작가의 locationNames > fallback
    let nameI18n;
    if (meta?.nameI18n) {
      nameI18n = meta.nameI18n;
    } else if (nameMap[id]) {
      // 작가의 locationNames는 "교토 · 오사카" 같은 복합 표현일 수 있음
      // 첫 번째 도시명만 추출 (· 이전)
      const raw = nameMap[id];
      nameI18n = {
        ko: (raw.ko || id).split('·')[0].split('・')[0].trim(),
        en: (raw.en || id).split('·')[0].split('・')[0].trim(),
        ja: (raw.ja || id).split('·')[0].split('・')[0].trim(),
        zh: (raw.zh || id).split('·')[0].split('・')[0].trim(),
      };
    } else {
      // 최종 fallback: id 자체를 표시명으로
      nameI18n = { ko: id, en: id, ja: id, zh: id };
    }

    return {
      id,
      nameI18n,
      // Explore 페이지용 ko/en shortcut
      ko: nameI18n.ko,
      en: nameI18n.en,
      img: meta?.img || `https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80`,
      count: countMap[id],
      isDomestic,
    };
  });

  return locations;
};

// ── 캐시된 레지스트리 (한 번만 빌드) ─────────────────────────────────────
let _registry = null;
const getRegistry = () => {
  if (!_registry) _registry = buildLocationRegistry();
  return _registry;
};

// ── 공개 API ──────────────────────────────────────────────────────────────

/** 전체 지역 목록 (국내 + 해외) */
export const getLocationRegistry = () => getRegistry();

/** 국내 지역 (가나다순) */
export const getDomesticLocations = () =>
  getRegistry().filter(l => l.isDomestic).sort(sortDomestic);

/** 해외 지역 (서울 거리순, 일본 고정 순서 우선) */
export const getOverseasLocations = () =>
  getRegistry().filter(l => !l.isDomestic).sort(sortBySeoulDist);

/** ID로 단일 지역 조회 */
export const getLocationById = (id) =>
  getRegistry().find(l => l.id === id) || null;

/** 전체 지역 (국내 가나다 → 해외 거리순) */
export const getAllLocationsSorted = () =>
  [...getDomesticLocations(), ...getOverseasLocations()];

/** Photographers.jsx 필터용: { id, ko, en } 형태 */
export const getFilterLocations = (type = 'all') => {
  const list = type === 'domestic' ? getDomesticLocations()
             : type === 'overseas' ? getOverseasLocations()
             : getAllLocationsSorted();
  return list.map(l => ({ id: l.id, ko: l.ko, en: l.en }));
};

/** 레지스트리 캐시 초기화 (작가 데이터 변경 시) */
export const invalidateRegistry = () => { _registry = null; };

/** 일본 도시 판별 */
export const isJapanCity = (id) =>
  id in JAPAN_FIXED || JAPAN_EXTRA_CITIES.has(id);

// ── TASK 2: 글로벌 지역 선택 시스템 헬퍼 함수 ──────────────────────────

/** 국가 목록 (아시아 우선, 지정된 언어) */
export const getCountries = (lang = 'ko') => {
  const order = ['KR', 'JP', 'CN', 'TW', 'TH', 'VN', 'ID', 'US', 'FR', 'IT', 'ES', 'GB', 'DE', 'AU', 'SG', 'MY', 'PH', 'IN'];
  return order.filter(code => code in COUNTRIES).map(code => ({
    code,
    name: COUNTRIES[code][lang],
    flag: COUNTRIES[code].flag,
  }));
};

/** 작가 포트폴리오에 태그된 국가만 반환 (작가수 포함, 다국어) */
export const getCountriesFromPortfolio = (lang = 'ko') => {
  const registry = getRegistry();
  // 국가별 작가수 집계
  const countryArtists = {};
  registry.forEach(loc => {
    const meta = LOCATION_META[loc.id];
    const cc = meta?.countryCode;
    if (!cc) return;
    countryArtists[cc] = (countryArtists[cc] || 0) + loc.count;
  });
  // 정렬: 한국 우선 → 작가수 많은 순
  const order = ['KR', 'JP', 'CN', 'TW', 'TH', 'VN', 'ID', 'US', 'FR', 'IT', 'ES', 'GB', 'DE', 'AU', 'SG', 'MY', 'PH', 'IN'];
  const allCodes = Object.keys(countryArtists);
  const sorted = allCodes.sort((a, b) => {
    const ai = order.indexOf(a); const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (countryArtists[b] || 0) - (countryArtists[a] || 0);
  });
  return sorted.map(code => ({
    code,
    name: COUNTRIES[code]?.[lang] || code,
    flag: COUNTRIES[code]?.flag || '',
    artistCount: countryArtists[code] || 0,
  }));
};

/** 국가별 도시 프리셋 조회 */
export const getCityPresets = (countryCode, lang = 'ko') => {
  const presets = CITY_PRESETS[countryCode] || [];
  return presets.map(cityId => {
    const meta = LOCATION_META[cityId];
    return {
      id: cityId,
      name: meta?.nameI18n?.[lang] || cityId,
    };
  });
};

/** 특정 국가의 지역 필터링 */
export const getLocationsByCountry = (countryCode) => {
  return getRegistry().filter(l => {
    const meta = LOCATION_META[l.id];
    return meta?.countryCode === countryCode;
  });
};

/** 국가코드와 도시명으로 locationId 생성 */
export const generateLocationId = (countryCode, cityName) => {
  return cityName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
};

/** 새 지역을 동적으로 레지스트리에 등록 */
export const registerLocation = (locationId, { countryCode, names = {} }) => {
  // LOCATION_META에 추가
  const newMeta = {
    countryCode,
    nameI18n: {
      ko: names.ko || locationId,
      en: names.en || locationId,
      ja: names.ja || locationId,
      zh: names.zh || locationId,
    },
    img: names.img || `https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80`,
  };

  // 메타 데이터 업데이트
  Object.assign(LOCATION_META, { [locationId]: newMeta });

  // 캐시 무효화하여 다음 접근 시 다시 빌드
  invalidateRegistry();
};

/** DB에서 지역 레지스트리 새로고침 (비동기) */
export const refreshRegistryFromDB = async () => {
  try {
    const { getSupabase } = await import('../lib/supabase');
    const sb = getSupabase();

    if (!sb) return; // Supabase 초기화 안 됨

    // photographers 테이블에서 고유 location_id 조회
    const { data: photographers, error: photoErr } = await sb
      .from('photographers')
      .select('location_id');

    if (!photoErr && photographers) {
      photographers.forEach(p => {
        if (p.location_id && !LOCATION_META[p.location_id]) {
          // DB에만 있는 새로운 location_id 자동 등록
          registerLocation(p.location_id, { countryCode: 'KR', names: {} });
        }
      });
    }

    // dress_vendors 테이블에서 location_id 조회
    const { data: vendors, error: vendorErr } = await sb
      .from('dress_vendors')
      .select('location_id');

    if (!vendorErr && vendors) {
      vendors.forEach(v => {
        if (v.location_id && !LOCATION_META[v.location_id]) {
          registerLocation(v.location_id, { countryCode: 'KR', names: {} });
        }
      });
    }

    // stylists 테이블에서 location_id 조회
    const { data: stylists, error: stylistErr } = await sb
      .from('stylists')
      .select('location_id');

    if (!stylistErr && stylists) {
      stylists.forEach(s => {
        if (s.location_id && !LOCATION_META[s.location_id]) {
          registerLocation(s.location_id, { countryCode: 'KR', names: {} });
        }
      });
    }

    // 캐시 무효화
    invalidateRegistry();
  } catch (err) {
    // Silent failure
  }
};
