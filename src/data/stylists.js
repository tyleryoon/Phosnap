// ─── Hair & Makeup Stylist Mock Data ──────────────────────────────────

export const STYLISTS = [
  {
    id: 101,
    name: 'Hana Y.',
    nameKo: '야마모토 하나',
    location: '교토 · 오사카',
    locationIds: ['kyoto', 'osaka'],
    tags: ['웨딩메이크업', '내추럴', '한복메이크업'],
    tagsI18n: {
      ko: ['웨딩메이크업', '내추럴', '한복메이크업'],
      en: ['Wedding Makeup', 'Natural', 'Hanbok Makeup'],
      ja: ['ウェディングメイク', 'ナチュラル', '韓服メイク'],
      zh: ['婚礼妆', '自然妆', '韩服妆'],
    },
    languages: ['JP', 'KO', 'EN'],
    rating: 4.9,
    reviews: 88,
    price: 120000,
    img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80',
    bio: '교토 기반 웨딩 & 스냅 전문 헤어메이크업 아티스트. 한복, 기모노 메이크업 전문.',
    services: [
      { name: 'Basic',  price: 80000,  desc: '내추럴 메이크업 + 헤어 세팅',              descI18n: { ko: '내추럴 메이크업 + 헤어 세팅', en: 'Natural makeup + hair setting', ja: 'ナチュラルメイク＋ヘアセット', zh: '自然妆容 + 发型设计' } },
      { name: 'Bridal', price: 120000, desc: '웨딩 & 스냅 전문 메이크업 + 헤어', popular: true, descI18n: { ko: '웨딩 & 스냅 전문 메이크업 + 헤어', en: 'Wedding & snap specialist makeup + hair', ja: 'ウェディング＆スナップ専門メイク＋ヘア', zh: '婚礼&写真专业妆容 + 发型' } },
      { name: 'Full',   price: 180000, desc: '촬영 동행 + 리터치 포함',                  descI18n: { ko: '촬영 동행 + 리터치 포함', en: 'On-site attendance + retouching included', ja: '撮影同行＋リタッチ込み', zh: '全程陪拍 + 含补妆' } },
    ],
  },
  {
    id: 102,
    name: 'Soyeon P.',
    nameKo: '박소연',
    location: '서울 전지역',
    locationIds: ['seoul'],
    tags: ['웨딩메이크업', '돌잔치', '글램메이크업'],
    tagsI18n: {
      ko: ['웨딩메이크업', '돌잔치', '글램메이크업'],
      en: ['Wedding Makeup', '1st Birthday', 'Glam Makeup'],
      ja: ['ウェディングメイク', 'トルジャンチ', 'グラムメイク'],
      zh: ['婚礼妆', '周岁宴', '魅力妆'],
    },
    languages: ['KO', 'EN'],
    rating: 4.8,
    reviews: 112,
    price: 100000,
    img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    bio: '서울에서 5년간 웨딩 & 돌잔치 전문으로 활동. 자연스럽고 오래가는 메이크업.',
    services: [
      { name: 'Light',    price: 70000,  desc: '내추럴 데일리 메이크업',                   descI18n: { ko: '내추럴 데일리 메이크업', en: 'Natural daily makeup', ja: 'ナチュラルデイリーメイク', zh: '自然日常妆' } },
      { name: 'Standard', price: 100000, desc: '스냅 전문 메이크업 + 헤어', popular: true, descI18n: { ko: '스냅 전문 메이크업 + 헤어', en: 'Snap specialist makeup + hair', ja: 'スナップ専門メイク＋ヘア', zh: '写真专业妆容 + 发型' } },
      { name: 'Premium',  price: 160000, desc: '웨딩 풀메이크업 + 헤어 + 리터치',          descI18n: { ko: '웨딩 풀메이크업 + 헤어 + 리터치', en: 'Full wedding makeup + hair + retouching', ja: 'ウェディングフルメイク＋ヘア＋リタッチ', zh: '婚礼全套妆容 + 发型 + 补妆' } },
    ],
  },
  {
    id: 103,
    name: 'Marie C.',
    nameKo: '마리 샤를로',
    location: '파리 · 리옹',
    locationIds: ['paris'],
    tags: ['파리지앵룩', '내추럴', '화보메이크업'],
    tagsI18n: {
      ko: ['파리지앵룩', '내추럴', '화보메이크업'],
      en: ['Parisian Look', 'Natural', 'Editorial Makeup'],
      ja: ['パリジャンルック', 'ナチュラル', '撮影用メイク'],
      zh: ['巴黎风格', '自然妆', '杂志妆'],
    },
    languages: ['FR', 'EN', 'KO'],
    rating: 5.0,
    reviews: 43,
    price: 150000,
    img: 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=600&q=80',
    bio: '파리 기반 메이크업 아티스트. 파리지앵 내추럴 룩부터 고급 화보 메이크업까지.',
    services: [
      { name: 'Parisian', price: 100000, desc: '파리지앵 내추럴 메이크업',           descI18n: { ko: '파리지앵 내추럴 메이크업', en: 'Parisian natural makeup', ja: 'パリジャンナチュラルメイク', zh: '巴黎自然妆' } },
      { name: 'Chic',     price: 150000, desc: '화보 메이크업 + 헤어', popular: true, descI18n: { ko: '화보 메이크업 + 헤어', en: 'Editorial makeup + hair', ja: '撮影メイク＋ヘア', zh: '杂志妆容 + 发型' } },
      { name: 'Haute',    price: 220000, desc: '풀 촬영 동행 + 리터치',              descI18n: { ko: '풀 촬영 동행 + 리터치', en: 'Full on-site attendance + retouching', ja: 'フル撮影同行＋リタッチ', zh: '全程陪拍 + 含补妆' } },
    ],
  },
  {
    id: 104,
    name: 'Rina T.',
    nameKo: '타나카 리나',
    location: '도쿄 · 요코하마',
    locationIds: ['tokyo'],
    tags: ['일본식메이크업', '내추럴', '웨딩메이크업'],
    tagsI18n: {
      ko: ['일본식메이크업', '내추럴', '웨딩메이크업'],
      en: ['Japanese Style', 'Natural', 'Wedding Makeup'],
      ja: ['和風メイク', 'ナチュラル', 'ウェディングメイク'],
      zh: ['日式妆容', '自然妆', '婚礼妆'],
    },
    languages: ['JP', 'EN'],
    rating: 4.7,
    reviews: 61,
    price: 90000,
    img: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&q=80',
    bio: '도쿄 기반. 일본식 내추럴 메이크업과 현대적 웨딩룩을 전문으로 합니다.',
    services: [
      { name: 'Simple',   price: 60000,  desc: '내추럴 메이크업',                        descI18n: { ko: '내추럴 메이크업', en: 'Natural makeup', ja: 'ナチュラルメイク', zh: '自然妆' } },
      { name: 'Standard', price: 90000,  desc: '스냅 전문 메이크업 + 헤어', popular: true, descI18n: { ko: '스냅 전문 메이크업 + 헤어', en: 'Snap specialist makeup + hair', ja: 'スナップ専門メイク＋ヘア', zh: '写真专业妆容 + 发型' } },
      { name: 'Bridal',   price: 140000, desc: '웨딩 풀패키지',                          descI18n: { ko: '웨딩 풀패키지', en: 'Full wedding package', ja: 'ウェディングフルパッケージ', zh: '婚礼全套服务' } },
    ],
  },
];

// 작가 locationId 기준으로 활동 가능한 스타일리스트 필터링
export const getStylistsByLocation = (locationId) => {
  if (!locationId) return STYLISTS;
  return STYLISTS.filter(s => s.locationIds.includes(locationId));
};

export const fmtStylist = (n) => n.toLocaleString('ko-KR');
