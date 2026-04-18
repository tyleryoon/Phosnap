// ─── Hair & Makeup Stylist Mock Data ──────────────────────────────────

export const STYLISTS = [
  {
    id: 101,
    name: 'Hana Y.',
    nameKo: '야마모토 하나',
    location: '교토 · 오사카',
    locationIds: ['kyoto', 'osaka', 'seoul'],
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
    bioI18n: {
      ko: '교토 기반 웨딩 & 스냅 전문 헤어메이크업 아티스트. 한복, 기모노 메이크업 전문.',
      en: 'Kyoto-based hair & makeup artist specializing in wedding and snap photography. Expert in Hanbok and Kimono styling.',
      ja: '京都拠点のウェディング＆スナップ専門ヘアメイクアップアーティスト。韓服・着物メイク専門。',
      zh: '京都专业婚礼写真发型化妆师。专精韩服、和服造型。',
    },
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80', caption: '웨딩 내추럴 메이크업' },
      { url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&q=80', caption: '한복 메이크업' },
      { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80', caption: '기모노 헤어스타일' },
      { url: 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=600&q=80', caption: '스냅 촬영 메이크업' },
    ],
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
    bioI18n: {
      ko: '서울에서 5년간 웨딩 & 돌잔치 전문으로 활동. 자연스럽고 오래가는 메이크업.',
      en: '5 years of experience in wedding and birthday ceremonies across Seoul. Known for natural, long-lasting makeup.',
      ja: 'ソウルでウェディング＆トルジャンチ専門5年のキャリア。自然で持続力のあるメイクが得意。',
      zh: '在首尔从事婚礼及周岁宴专业化妆5年。以自然持久的妆容著称。',
    },
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80', caption: '웨딩 메이크업' },
      { url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&q=80', caption: '돌잔치 메이크업' },
      { url: 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=600&q=80', caption: '글램 스타일' },
    ],
    services: [
      { name: 'Light',    price: 70000,  desc: '내추럴 데일리 메이크업',                   descI18n: { ko: '내추럴 데일리 메이크업', en: 'Natural daily makeup', ja: 'ナチュラルデイリーメイク', zh: '自然日常妆' } },
      { name: 'Standard', price: 100000, desc: '스냅 전문 메이크업 + 헤어', popular: true, descI18n: { ko: '스냅 전문 메이크업 + 헤어', en: 'Snap specialist makeup + hair', ja: 'スナップ専門メイク＋ヘア', zh: '写真专业妆容 + 发型' } },
      { name: 'Premium',  price: 160000, desc: '웨딩 풀메이크업 + 헤어 + 리터치',          descI18n: { ko: '웨딩 풀메이크업 + 헤어 + 리터치', en: 'Full wedding makeup + hair + retouching', ja: 'ウェディングフルメイク＋ヘア＋リタッチ', zh: '婚礼全套妆容 + 发型 + 补妆' } },
    ],
  },
];

// 작가 locationId 기준으로 활동 가능한 스타일리스트 필터링
export const getStylistsByLocation = (locationId) => {
  if (!locationId) return STYLISTS;
  return STYLISTS.filter(s => s.locationIds.includes(locationId));
};

export const fmtStylist = (n) => n.toLocaleString('ko-KR');
