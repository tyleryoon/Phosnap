// ─── Location Data (Explore 페이지용) ────────────────────────────────
// nameI18n: { ko, en, ja, zh }

// ── 국내 (인기순) ─────────────────────────────────────────────────────
export const LOCATIONS_DOMESTIC = [
  {
    id: 'seoul',
    name: '서울', nameEn: 'Seoul',
    nameI18n: { ko: '서울', en: 'Seoul', ja: 'ソウル', zh: '首尔' },
    count: 124,
    img: 'https://images.unsplash.com/photo-1538485399081-7c8272e0490d?w=600&q=80',
  },
  {
    id: 'jeju',
    name: '제주', nameEn: 'Jeju',
    nameI18n: { ko: '제주', en: 'Jeju', ja: '済州', zh: '济州' },
    count: 67,
    img: 'https://images.unsplash.com/photo-1570108975728-4e03fd1e9c4c?w=600&q=80',
  },
  {
    id: 'incheon',
    name: '인천', nameEn: 'Incheon',
    nameI18n: { ko: '인천', en: 'Incheon', ja: '仁川', zh: '仁川' },
    count: 14,
    img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  },
  {
    id: 'sokcho',
    name: '속초', nameEn: 'Sokcho',
    nameI18n: { ko: '속초', en: 'Sokcho', ja: '束草', zh: '束草' },
    count: 11,
    img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80',
  },
  {
    id: 'gangneung',
    name: '강릉', nameEn: 'Gangneung',
    nameI18n: { ko: '강릉', en: 'Gangneung', ja: '江陵', zh: '江陵' },
    count: 15,
    img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80',
  },
  {
    id: 'jeonju',
    name: '전주', nameEn: 'Jeonju',
    nameI18n: { ko: '전주', en: 'Jeonju', ja: '全州', zh: '全州' },
    count: 18,
    img: 'https://images.unsplash.com/photo-1578913071922-9b1bb28b1240?w=600&q=80',
  },
  {
    id: 'gyeongju',
    name: '경주', nameEn: 'Gyeongju',
    nameI18n: { ko: '경주', en: 'Gyeongju', ja: '慶州', zh: '庆州' },
    count: 23,
    img: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=600&q=80',
  },
  {
    id: 'busan',
    name: '부산', nameEn: 'Busan',
    nameI18n: { ko: '부산', en: 'Busan', ja: '釜山', zh: '釜山' },
    count: 48,
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80',
  },
  {
    id: 'yeosu',
    name: '여수', nameEn: 'Yeosu',
    nameI18n: { ko: '여수', en: 'Yeosu', ja: '麗水', zh: '丽水' },
    count: 9,
    img: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=600&q=80',
  },
];

// ── 해외 지역 (서울 기준 거리순) ─────────────────────────────────────
// 일본: 교토→도쿄→삿포로→오사카→후쿠오카 순서 고정
// 이후: 괌(~3,000km)→다낭(~3,200km)→발리(~5,500km)→하와이(~7,700km)
//       →프라하(~8,800km)→파리(~9,000km)→산토리니(~9,200km)
//       →로마(~9,300km)→바르셀로나(~10,000km)→뉴욕(~11,000km)
export const LOCATIONS_OVERSEAS = [
  // ── 일본 (고정 순서) ─────────────────────────────────────────────
  {
    id: 'kyoto',
    name: '교토', nameEn: 'Kyoto',
    nameI18n: { ko: '교토', en: 'Kyoto', ja: '京都', zh: '京都' },
    count: 89,
    img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80',
  },
  {
    id: 'tokyo',
    name: '도쿄', nameEn: 'Tokyo',
    nameI18n: { ko: '도쿄', en: 'Tokyo', ja: '東京', zh: '东京' },
    count: 76,
    img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80',
  },
  {
    id: 'sapporo',
    name: '삿포로', nameEn: 'Sapporo',
    nameI18n: { ko: '삿포로', en: 'Sapporo', ja: '札幌', zh: '札幌' },
    count: 14,
    img: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&q=80',
  },
  {
    id: 'osaka',
    name: '오사카', nameEn: 'Osaka',
    nameI18n: { ko: '오사카', en: 'Osaka', ja: '大阪', zh: '大阪' },
    count: 35,
    img: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=600&q=80',
  },
  {
    id: 'fukuoka',
    name: '후쿠오카', nameEn: 'Fukuoka',
    nameI18n: { ko: '후쿠오카', en: 'Fukuoka', ja: '福岡', zh: '福冈' },
    count: 9,
    img: 'https://images.unsplash.com/photo-1610547189313-1fbea2dcd059?w=600&q=80',
  },
  // ── 아시아·태평양 (~3,000–5,500km) ──────────────────────────────
  {
    id: 'guam',
    name: '괌', nameEn: 'Guam',
    nameI18n: { ko: '괌', en: 'Guam', ja: 'グアム', zh: '关岛' },
    count: 12,
    img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80',
  },
  {
    id: 'danang',
    name: '다낭', nameEn: 'Da Nang',
    nameI18n: { ko: '다낭', en: 'Da Nang', ja: 'ダナン', zh: '岘港' },
    count: 8,
    img: 'https://images.unsplash.com/photo-1555217851-6141535bd771?w=600&q=80',
  },
  {
    id: 'bali',
    name: '발리', nameEn: 'Bali',
    nameI18n: { ko: '발리', en: 'Bali', ja: 'バリ', zh: '巴厘岛' },
    count: 44,
    img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
  },
  // ── 태평양·유럽 (~7,700km~) ──────────────────────────────────────
  {
    id: 'hawaii',
    name: '하와이', nameEn: 'Hawaii',
    nameI18n: { ko: '하와이', en: 'Hawaii', ja: 'ハワイ', zh: '夏威夷' },
    count: 14,
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
  },
  {
    id: 'prague',
    name: '프라하', nameEn: 'Prague',
    nameI18n: { ko: '프라하', en: 'Prague', ja: 'プラハ', zh: '布拉格' },
    count: 31,
    img: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=600&q=80',
  },
  {
    id: 'paris',
    name: '파리', nameEn: 'Paris',
    nameI18n: { ko: '파리', en: 'Paris', ja: 'パリ', zh: '巴黎' },
    count: 52,
    img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80',
  },
  {
    id: 'santorini',
    name: '산토리니', nameEn: 'Santorini',
    nameI18n: { ko: '산토리니', en: 'Santorini', ja: 'サントリーニ', zh: '圣托里尼' },
    count: 19,
    img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80',
  },
  {
    id: 'rome',
    name: '로마', nameEn: 'Rome',
    nameI18n: { ko: '로마', en: 'Rome', ja: 'ローマ', zh: '罗马' },
    count: 28,
    img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80',
  },
  {
    id: 'barcelona',
    name: '바르셀로나', nameEn: 'Barcelona',
    nameI18n: { ko: '바르셀로나', en: 'Barcelona', ja: 'バルセロナ', zh: '巴塞罗那' },
    count: 22,
    img: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80',
  },
  // ── 북미 (~11,000km) ─────────────────────────────────────────────
  {
    id: 'newyork',
    name: '뉴욕', nameEn: 'New York',
    nameI18n: { ko: '뉴욕', en: 'New York', ja: 'ニューヨーク', zh: '纽约' },
    count: 17,
    img: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=600&q=80',
  },
];
