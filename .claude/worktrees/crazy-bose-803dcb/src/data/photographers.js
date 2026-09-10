// ─── Photographer Mock Data ────────────────────────────────────────────

// ── 지역 상수 (가나다 순) ────────────────────────────────────────────────
export const LOCATIONS_DOMESTIC = [
  // ── 고정: 서울 → 제주 항상 맨 앞 ──
  { id: 'seoul',    ko: '서울',   en: 'Seoul'      },
  { id: 'jeju',     ko: '제주',   en: 'Jeju'       },
  // ── 나머지 가나다순 ──
  { id: 'gangneung', ko: '강릉',   en: 'Gangneung' },
  { id: 'gyeongju', ko: '경주',   en: 'Gyeongju'  },
  { id: 'busan',    ko: '부산',   en: 'Busan'      },
  { id: 'sokcho',   ko: '속초',   en: 'Sokcho'     },
  { id: 'yeosu',    ko: '여수',   en: 'Yeosu'      },
  { id: 'incheon',  ko: '인천',   en: 'Incheon'    },
  { id: 'jeonju',   ko: '전주',   en: 'Jeonju'     },
];

// 해외: 서울 기준 거리순 / 일본은 교토→도쿄→삿포로→오사카→후쿠오카 고정
export const LOCATIONS_OVERSEAS = [
  // 일본 (고정 순서)
  { id: 'kyoto',    ko: '교토',   en: 'Kyoto'   },
  { id: 'tokyo',    ko: '도쿄',   en: 'Tokyo'   },
  { id: 'sapporo',  ko: '삿포로', en: 'Sapporo' },
  { id: 'osaka',    ko: '오사카', en: 'Osaka'   },
  { id: 'fukuoka',  ko: '후쿠오카', en: 'Fukuoka' },
  // 아시아·태평양
  { id: 'guam',       ko: '괌',       en: 'Guam'        },
  { id: 'danang',     ko: '다낭',     en: 'Da Nang'     },
  { id: 'bali',       ko: '발리',     en: 'Bali'        },
  // 태평양·유럽
  { id: 'hawaii',     ko: '하와이',   en: 'Hawaii'      },
  { id: 'prague',     ko: '프라하',   en: 'Prague'      },
  { id: 'paris',      ko: '파리',     en: 'Paris'       },
  { id: 'santorini',  ko: '산토리니', en: 'Santorini'   },
  { id: 'rome',       ko: '로마',     en: 'Rome'        },
  { id: 'barcelona',  ko: '바르셀로나', en: 'Barcelona' },
  // 북미
  { id: 'newyork',    ko: '뉴욕',     en: 'New York'    },
];

export const ALL_LOCATIONS = [...LOCATIONS_DOMESTIC, ...LOCATIONS_OVERSEAS];

// ── 유틸 ──────────────────────────────────────────────────────────────
export const fmt = (n) => n.toLocaleString('ko-KR');
export const ALL_TAG_KEYS = ['all','wedding','couple','outdoor','birthday1st','portrait','video','iphone','indoor','landmark'];

// ── GYG 벤치마킹: 스냅 특화 필터 키 ──────────────────────────────────
// 장르 필터(ALL_TAG_KEYS)와 별도로 운영되는 특수 필터
export const SNAP_FILTER_KEYS = [
  'traditional_costume', 'hanbok', 'dress_rental', 'suit_rental', 'other_costume', 'props',
  'hmu', 'golden_hour', 'instant_booking', 'photo_tour',
  'couple', 'family', 'solo', 'wedding', 'maternity', 'pet', 'night', 'studio',
];

// 스냅 필터 4개국어 라벨
export const SNAP_FILTER_LABELS = {
  traditional_costume: { ko: '전통의상',    en: 'Traditional Costume', ja: '伝統衣装',           zh: '传统服装' },
  hanbok:              { ko: '한복',        en: 'Hanbok',             ja: '韓服',               zh: '韩服' },
  dress_rental:        { ko: '드레스',      en: 'Dress',              ja: 'ドレス',              zh: '礼服' },
  suit_rental:         { ko: '정장',        en: 'Suit',               ja: 'スーツ',              zh: '西装' },
  other_costume:       { ko: '기타 의상',   en: 'Other Costume',      ja: 'その他衣装',          zh: '其他服装' },
  props:               { ko: '소품 보유',   en: 'Props',              ja: '小道具あり',           zh: '道具提供' },
  hmu:                 { ko: '헤어메이크업', en: 'HMU Included',       ja: 'HMU込み',             zh: '含化妆' },
  golden_hour:         { ko: '골든아워',    en: 'Golden Hour',        ja: 'ゴールデンアワー',      zh: '黄金时段' },
  instant_booking:     { ko: '즉시 예약',   en: 'Instant Booking',    ja: '即時予約',             zh: '即时预订' },
  photo_tour:          { ko: '포토투어',    en: 'Photo Tour',         ja: 'フォトツアー',          zh: '摄影之旅' },
  couple:              { ko: '커플',        en: 'Couple',             ja: 'カップル',             zh: '情侣' },
  family:              { ko: '가족',        en: 'Family',             ja: 'ファミリー',            zh: '家庭' },
  solo:                { ko: '1인 촬영',    en: 'Solo',               ja: 'ソロ',                zh: '个人' },
  wedding:             { ko: '웨딩',        en: 'Wedding',            ja: 'ウェディング',          zh: '婚礼' },
  maternity:           { ko: '만삭',        en: 'Maternity',          ja: 'マタニティ',            zh: '孕妇' },
  pet:                 { ko: '반려동물',    en: 'Pet',                ja: 'ペット',               zh: '宠物' },
  night:               { ko: '야간 촬영',   en: 'Night Shoot',        ja: 'ナイト撮影',           zh: '夜拍' },
  studio:              { ko: '스튜디오',    en: 'Studio',             ja: 'スタジオ',             zh: '工作室' },
};

const PKG = (name, price, hours, photos, desc, popular = false) => ({
  name, price, hours, photos, desc, popular,
  descI18n: { ko: desc, en: desc, ja: desc, zh: desc },
});

// 리뷰 헬퍼 — textI18n: { ko, en, ja, zh } 지원, locationId: 촬영 위치
const REV = (author, date, stars, text, locationId = null, textI18n = null, reply = null) => ({
  author, date, stars, text, locationId,
  textI18n: textI18n || { ko: text, en: text, ja: text, zh: text },
  ...(reply ? { reply } : {}),
});

// 포토 투어 헬퍼
// pricingType: 'perPerson' (1인당 가격) | 'total' (총액, 더치페이 가능)
// maxGuests: 최대 인원 (total 모드에서 의미 있음, perPerson에서도 제한용)
// minGuests: 최소 진행 인원 (미달 시 투어 취소, 기본 = ceil(maxGuests/2))
// deadlineDays: 마감 기한 (투어 D-N일, 기본 7)
const TOUR = (name, price, durationMin, photos, desc, spots = [], pricingType = 'perPerson', maxGuests = 6, minGuests, deadlineDays = 7) => ({
  name, price, durationMin, photos, desc, spots, pricingType, maxGuests,
  minGuests: minGuests ?? Math.ceil(maxGuests / 2),
  deadlineDays,
  descI18n: { ko: desc, en: desc, ja: desc, zh: desc },
});

// ── 작가 목록 ──────────────────────────────────────────────────────────
// ⚠️ LEGACY: dressVendorId 필드는 Booking.jsx에서 아직 참조 중.
//    새 벤더 시스템(VendorRegister/VendorDashboard) 완성 후 마이그레이션 필요.
//    ArtistRegister에서는 이미 제거 완료 (2026-04).
export const PHOTOGRAPHERS = [
  // ────── 1. 교토 ──────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Mina J.', nameKo: '정미나',
    locationId: 'kyoto',
    location: '교토 · 오사카',
    locationNames: { ko: '교토 · 오사카', en: 'Kyoto · Osaka', ja: '京都・大阪', zh: '京都・大阪' },
    tags: ['wedding','outdoor','couple'],
    snapFilters: ['traditional_costume', 'hmu', 'golden_hour'],
    instantBooking: true,
    languages: ['KO','JP','EN'],
    rating: 4.9, reviews: 142, price: 280000,
    img: 'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80',
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80',
    ],
    portfolioLocations: ['kyoto','kyoto','osaka','kyoto','osaka','kyoto'],
    bio: '빛과 순간의 경계에서 작업합니다. 교토의 골목과 신사, 벚꽃 아래서 당신의 이야기를 담아드립니다.',
    bioI18n: {
      ko: '빛과 순간의 경계에서 작업합니다. 교토의 골목과 신사, 벚꽃 아래서 당신의 이야기를 담아드립니다.',
      en: "Working at the edge of light and moment. I capture your story in Kyoto's alleys, shrines, and under cherry blossoms.",
      ja: '光と瞬間の境界で仕事をしています。京都の路地や神社、桜の下であなたの物語を残します。',
      zh: '在光与瞬间的边界工作。在京都的小巷、神社和樱花树下，为您记录属于您的故事。',
    },
    hmk: true,
    artistType: "photographer",
    hmkSelf: true,
    hmkOptions: [{"name":"Natural","price":80000,"desc":"내추럴 메이크업 + 헤어"},{"name":"Bridal","price":120000,"desc":"웨딩 전문 메이크업"}],
    dressSelf: false,
    dressVendorId: "dv-1",
    props: ['부케','한복 소품','레트로 카메라'],
    propsI18n: { ko:['부케','한복 소품','레트로 카메라'], en:['Bouquet','Hanbok Props','Retro Camera'], ja:['ブーケ','韓服小道具','レトロカメラ'], zh:['花束','韩服道具','复古相机'] },
    hourlyRate: 150000,
    tours: [
      TOUR('교토 골목 스냅 투어', 350000, 150, 50, '기온 거리 → 하나미코지 → 야사카 신사 → 니넨자카를 걸으며 자연스러운 스냅 촬영', ['기온 거리','하나미코지','야사카 신사','니넨자카'], 'total', 6),
      TOUR('교토 야간 스냅 투어', 80000, 90, 30, '해질녘부터 야간까지, 교토의 등불과 함께하는 감성 촬영', ['야사카 신사','기온 야경','시조 거리'], 'perPerson', 4),
    ],
    packages: [
      PKG('Snapshot', 180000, 1, 30, '가볍게 1시간, 핵심 장면 위주의 스냅'),
      PKG('Story',    280000, 2, 60, '충분한 시간으로 자연스러운 순간들을 담아냅니다', true),
      PKG('Full Day', 480000, 4,120, '하루 종일 함께하며 모든 순간을 기록합니다'),
    ],
    reviewList: [
      REV('Kim S.','2025.11',5,'교토에서 정말 잊을 수 없는 사진을 남길 수 있었어요. 미나 작가님이 장소 하나하나 세심하게 안내해주셔서 너무 좋았습니다.','kyoto',{ko:'교토에서 정말 잊을 수 없는 사진을 남길 수 있었어요. 미나 작가님이 장소 하나하나 세심하게 안내해주셔서 너무 좋았습니다.',en:'I was able to leave truly unforgettable photos in Kyoto. Mina carefully guided us to each location.',ja:'京都で本当に忘れられない写真を残すことができました。ミナさんが一つ一つ丁寧に案内してくれました。',zh:'在京都留下了难忘的照片。Mina仔细地带我们去了每个地方。'},{body:'따뜻한 리뷰 감사합니다! 함께 교토 골목골목 다니며 촬영했던 시간이 저에게도 정말 소중한 기억이에요. 또 만나뵐 수 있기를 바랍니다 😊',created_at:'2025-11-15',updated_at:'2025-11-15'}),
      REV('Tanaka H.','2025.10',5,'自然な表情を引き出してくれる素晴らしいフォトグラファーです。また依頼したいです。',null,null,{body:'素敵なレビューありがとうございます！自然な雰囲気を大切にしているので、そう言っていただけてとても嬉しいです。またぜひお会いしましょう！',created_at:'2025-10-20',updated_at:'2025-10-20'}),
      REV('Chris L.','2025.09',5,'Absolutely stunning photos. Mina captured our honeymoon perfectly.','kyoto',{ko:'정말 놀라운 사진들. 미나가 우리 허니문을 완벽하게 담아줬어요.',en:'Absolutely stunning photos. Mina captured our honeymoon perfectly.',ja:'本当に素晴らしい写真。ミナが私たちのハネムーンを完璧に撮ってくれました。',zh:'照片绝对令人惊叹。Mina完美地捕捉了我们的蜜月。'},{body:'Thank you so much, Chris! Your honeymoon trip was such a joy to photograph. Wishing you both a lifetime of happiness!',created_at:'2025-09-22',updated_at:'2025-09-22'}),
      REV('Park J.','2025.08',4,'사진 퀄리티는 최고인데 시간이 좀 촉박했어요. 전체적으로 만족합니다.','kyoto',{ko:'사진 퀄리티는 최고인데 시간이 좀 촉박했어요. 전체적으로 만족합니다.',en:'Photo quality was top-notch but the time was a bit tight. Overall satisfied.',ja:'写真のクオリティは最高ですが、少し時間が足りませんでした。全体的に満足です。',zh:'照片质量一流，但时间有点紧。总体满意。'}),
      REV('Yuki M.','2025.07',5,'京都の路地裏での撮影が最高でした。光の使い方が素晴らしい。','osaka',{ko:'교토 뒷골목 촬영이 최고였어요. 빛 사용이 훌륭합니다.',en:'The alley shooting in Kyoto was the best. Wonderful use of light.',ja:'京都の路地裏での撮影が最高でした。光の使い方が素晴らしい。',zh:'京都小巷拍摄是最好的。光线运用非常出色。'}),
      REV('Amy W.','2025.06',5,'My friend recommended Mina and she exceeded all expectations!','kyoto',{ko:'친구가 미나를 추천해줬는데 기대 이상이었어요!',en:'My friend recommended Mina and she exceeded all expectations!',ja:'友達がミナを勧めてくれて、期待以上でした！',zh:'朋友推荐了Mina，她超出了所有期望！'}),
      REV('이수진','2025.05',4,'오사카 촬영도 해주셔서 좋았어요. 다만 비가 와서 야외 촬영이 제한적이었습니다.','osaka',{ko:'오사카 촬영도 해주셔서 좋았어요. 다만 비가 와서 야외 촬영이 제한적이었습니다.',en:'Glad she also covers Osaka. However, rain limited outdoor shooting.',ja:'大阪でも撮影してくれて良かったです。ただ雨で屋外撮影が制限されました。',zh:'很高兴她也在大阪拍摄。不过下雨限制了户外拍摄。'}),
    ],
  },

  // ────── 2. 서울 ──────────────────────────────────────────────────────
  {
    id: 2,
    name: 'Seo H.', nameKo: '서혜원',
    locationId: 'seoul',
    location: '서울 · 제주',
    locationNames: { ko: '서울 · 제주', en: 'Seoul · Jeju', ja: 'ソウル・済州', zh: '首尔·济州' },
    tags: ['wedding','birthday1st','indoor'],
    snapFilters: ['traditional_costume', 'hmu'],
    instantBooking: true,
    languages: ['KO','EN','CN'],
    rating: 4.8, reviews: 98, price: 220000,
    img: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80',
      'https://images.unsplash.com/photo-1529636444744-adffc9135a5e?w=600&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      'https://images.unsplash.com/photo-1595407416011-cdfae46e0aad?w=600&q=80',
      'https://images.unsplash.com/photo-1597775169066-4ae81c2bfa9a?w=600&q=80',
      'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600&q=80',
    ],
    portfolioLocations: ['seoul','seoul','jeju','seoul','jeju','seoul'],
    bio: '서울의 모든 계절을 담아왔습니다. 경복궁부터 익선동 골목까지, 당신만의 공간에서 당신만의 이야기를.',
    bioI18n: {
      ko: '서울의 모든 계절을 담아왔습니다. 경복궁부터 익선동 골목까지, 당신만의 공간에서 당신만의 이야기를.',
      en: "I've captured every season of Seoul. From Gyeongbokgung to the alleys of Ikseon-dong — your story, in your space.",
      ja: 'ソウルのすべての季節を撮り続けています。景福宮から益善洞の路地まで、あなたの空間であなたの物語を。',
      zh: '我拍遍了首尔的四季。从景福宫到益善洞的小巷，在属于你的空间里讲述你的故事。',
    },
    hmk: true,
    artistType: "photographer",
    hmkSelf: true,
    hmkOptions: [{"name":"Basic","price":70000,"desc":"기본 메이크업 + 헤어 세팅"},{"name":"Premium","price":130000,"desc":"프리미엄 메이크업 + 헤어 + 리터치"}],
    dressSelf: false,
    dressVendorId: "dv-2",
    props: ['돌잔치 소품 세트','꽃장식'],
    propsI18n: { ko:['돌잔치 소품 세트','꽃장식'], en:['1st Birthday Prop Set','Floral Decoration'], ja:['トルジャンチ小道具セット','フラワーデコ'], zh:['周岁道具套装','花卉装饰'] },
    hourlyRate: 120000,
    tours: [
      TOUR('경복궁 한복 스냅 투어', 300000, 120, 60, '경복궁 → 북촌 한옥마을 → 삼청동 카페 거리를 한복 차림으로 촬영하며 걷는 코스', ['경복궁','북촌 한옥마을','삼청동'], 'total', 5),
      TOUR('익선동 골목 워킹 투어', 60000, 90, 40, '익선동의 감성 골목과 카페에서 자연스러운 스냅 촬영', ['익선동','종로3가','운현궁'], 'perPerson', 4),
    ],
    packages: [
      PKG('Light',   150000, 1, 25, '핵심 장면 선별 촬영'),
      PKG('Standard',220000, 2, 50, '2시간 기본 스냅', true),
      PKG('Premium', 380000, 4,100, '4시간 프리미엄 스냅 + 보정 강화'),
    ],
    reviewList: [
      REV('이지은','2025.12',5,'돌잔치 사진을 부탁드렸는데 아이의 표정을 너무 자연스럽게 잘 담아주셨어요.'),
      REV('Park M.','2025.11',4,'전문적이고 친절하게 진행해주셨습니다. 결과물이 기대 이상이었어요.'),
    ],
  },

  // ────── 3. 부산 ──────────────────────────────────────────────────────
  {
    id: 3,
    name: 'Jiwon K.', nameKo: '김지원',
    locationId: 'busan',
    location: '부산 · 경주',
    locationNames: { ko: '부산 · 경주', en: 'Busan · Gyeongju', ja: '釜山・慶州', zh: '釜山·庆州' },
    tags: ['couple','outdoor','portrait'],
    snapFilters: ['golden_hour', 'instant_booking'],
    instantBooking: true,
    languages: ['KO','EN'],
    rating: 4.7, reviews: 76, price: 200000,
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
      'https://images.unsplash.com/photo-1516846327321-8f594f3664c7?w=600&q=80',
      'https://images.unsplash.com/photo-1517840901100-8179e7aae67b?w=600&q=80',
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80',
      'https://images.unsplash.com/photo-1480649359383-c0281f81b55a?w=600&q=80',
      'https://images.unsplash.com/photo-1516020527051-3e70d0c0a86f?w=600&q=80',
    ],
    portfolioLocations: ['busan','busan','gyeongju','busan','gyeongju','busan'],
    bio: '해운대의 파도와 감천문화마을의 색채를 담는 감성 포토그래퍼',
    bioI18n: {
      ko: '해운대의 파도와 감천문화마을의 색채를 담는 감성 포토그래퍼',
      en: 'Emotional photographer capturing the waves of Haeundae and the vibrant colors of Gamcheon Culture Village.',
      ja: '釜山の波と感川文化村の色彩を捉える感性的なフォトグラファー',
      zh: '捕捉海云台海浪和感川文化村色彩的情感摄影师',
    },
    hmk: true,
    artistType: "photographer",
    hmkSelf: false,
    dressSelf: false,
    props: ['감성 소품','꽃 장식','빈티지 소품'],
    propsI18n: { ko:['감성 소품','꽃 장식','빈티지 소품'], en:['Emotional Props','Flower Decoration','Vintage Props'], ja:['エモーショナル小道具','フラワー装飾','ヴィンテージ小道具'], zh:['情感道具','花卉装饰','复古道具'] },
    hourlyRate: 150000,
    tours: [
      TOUR('감천문화마을 스냅 투어', 280000, 120, 50, '감천문화마을의 알록달록한 계단과 미로 같은 골목, 카페에서 촬영', ['감천문화마을','감천 전망대','감천역'], 'total', 5),
    ],
    packages: [
      PKG('Quick Snap', 160000, 1, 25, '30분 스냅 + 30분 카페 촬영'),
      PKG('Standard', 200000, 2, 50, '2시간 야외 투어 스냅', true),
      PKG('Premium', 350000, 4, 100, '4시간 풀데이 투어 + 감천 & 경주'),
    ],
    reviewList: [
      REV('Lee M.','2025.11',5,'감천문화마을에서의 촬영이 정말 최고였어요. 지원 작가님이 위치를 정말 잘 알고 있더라고요.','busan',{ko:'감천문화마을에서의 촬영이 정말 최고였어요. 지원 작가님이 위치를 정말 잘 알고 있더라고요.',en:'The shoot in Gamcheon Culture Village was amazing. Jiwon really knows the best spots.',ja:'感川文化村での撮影は最高でした。ジウォンさんはロケーションをよく知っていました。',zh:'感川文化村的拍摄真是太好了。Jiwon对这个地方非常熟悉。'},{body:'좋은 평가 감사합니다! 함께 감천의 색감을 담을 수 있어 저도 즐거웠어요. 다음에 또 만나요!',created_at:'2025-11-12',updated_at:'2025-11-12'}),
      REV('Park C.','2025.10',4,'부산에서 특색 있는 사진을 원했는데 기대 이상이었어요. 포토 퀄리티 최고!','busan',{ko:'부산에서 특색 있는 사진을 원했는데 기대 이상이었어요. 포토 퀄리티 최고!',en:'I wanted unique Busan photos and exceeded expectations!',ja:'ユニークな釜山の写真が欲しかったのですが、期待以上でした！',zh:'想要独特的釜山照片，超出了期望！'}),
      REV('Kim S.','2025.09',5,'경주 불국사 촬영도 가능하다고 해서 함께했는데 정말 전문적이었어요.','gyeongju',{ko:'경주 불국사 촬영도 가능하다고 해서 함께했는데 정말 전문적이었어요.',en:'We did a shoot at Bulguksa Temple in Gyeongju and it was very professional.',ja:'慶州の仏国寺での撮影も本当にプロでした。',zh:'在庆州佛国寺的拍摄也非常专业。'}),
      REV('Ryu J.','2025.08',5,'감정을 잘 읽고 그 순간을 잘 포착해요. 추천합니다!','busan',{ko:'감정을 잘 읽고 그 순간을 잘 포착해요. 추천합니다!',en:'Great at reading emotions and capturing the moment. Highly recommended!',ja:'感情をよく読んで、その瞬間を捉えるのが上手です。推奨します！',zh:'很好地理解情感并捕捉瞬间。强烈推荐！'}),
      REV('Choi E.','2025.07',5,'해운대 해변에서의 촬영이 완벽했어요. 시간도 금방 지났어요.','busan',{ko:'해운대 해변에서의 촬영이 완벽했어요. 시간도 금방 지났어요.',en:'The beach shoot at Haeundae was perfect. Time flew by!',ja:'海雲台のビーチでの撮影は完璧でした。時間が早く過ぎました！',zh:'海云台海滩的拍摄完美无缺。时间过得很快！'}),
    ],
  },

  // ────── 4. 제주 ──────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Yuna L.', nameKo: '이유나',
    locationId: 'jeju',
    location: '제주',
    locationNames: { ko: '제주', en: 'Jeju', ja: '済州', zh: '济州' },
    tags: ['couple','outdoor','wedding'],
    snapFilters: ['golden_hour', 'hmu'],
    instantBooking: false,
    languages: ['KO','EN','JP'],
    rating: 4.9, reviews: 134, price: 300000,
    img: 'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80',
      'https://images.unsplash.com/photo-1516846327321-8f594f3664c7?w=600&q=80',
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      'https://images.unsplash.com/photo-1524578271613-d2dca89d60a0?w=600&q=80',
    ],
    portfolioLocations: ['jeju','jeju','jeju','jeju','jeju','jeju'],
    bio: '제주 바다와 오름, 돌담길에서 자연 그대로의 아름다움을 담습니다',
    bioI18n: {
      ko: '제주 바다와 오름, 돌담길에서 자연 그대로의 아름다움을 담습니다',
      en: 'Capturing the natural beauty of Jeju sea, oreum hills, and stone walls.',
      ja: '済州の海とオルム、石垣道で自然のままの美しさを捉えます',
      zh: '在济州海洋、火山丘陵和石墙路上捕捉自然之美',
    },
    hmk: true,
    artistType: "photographer",
    hmkSelf: true,
    hmkOptions: [{"name":"Natural","price":90000,"desc":"자연스러운 웨딩 메이크업"},{"name":"Romantic","price":130000,"desc":"로맨틱 웨딩 메이크업 + 헤어"}],
    dressSelf: false,
    dressVendorId: "dv-4",
    props: ['웨딩 부케','플로랄 아치','자연 소품'],
    propsI18n: { ko:['웨딩 부케','플로랄 아치','자연 소품'], en:['Wedding Bouquet','Floral Arch','Natural Props'], ja:['ウェディングブーケ','フローラルアーチ','自然小道具'], zh:['婚礼花束','花卉拱门','自然道具'] },
    hourlyRate: 180000,
    tours: [
      TOUR('성산일출봉 스냅 투어', 400000, 150, 60, '성산일출봉 일출 촬영 → 해안도로 → 흑모래 해변 투어', ['성산일출봉','오섬','흑모래 해변'], 'total', 4, 2, 3),
    ],
    packages: [
      PKG('Sunrise', 250000, 1.5, 40, '성산일출봉 일출 촬영'),
      PKG('Island', 300000, 3, 80, '제주 오름 & 해안선 풀코스', true),
      PKG('Full Day', 500000, 6, 150, '제주 전일 웨딩 스냅'),
    ],
    reviewList: [
      REV('Kim T.','2025.12',5,'제주 웨딩 스냅을 부탁했는데 정말 아름다운 사진들이 나왔어요. 유나 작가님 최고!','jeju',{ko:'제주 웨딩 스냅을 부탁했는데 정말 아름다운 사진들이 나왔어요. 유나 작가님 최고!',en:'We did a wedding snap in Jeju and got beautiful photos. Yuna is the best!',ja:'済州でのウェディングスナップは本当に美しい写真になりました。ユナさん最高！',zh:'在济州进行婚礼拍摄，得到了美丽的照片。Yuna是最好的！'},{body:'따뜻한 응원 감사합니다! 제주의 자연과 당신들의 행복감이 너무 좋았어요. 행복하세요!',created_at:'2025-12-05',updated_at:'2025-12-05'}),
      REV('Yamamoto Y.','2025.11',5,'済州の自然を活かした撮影が素晴らしい。本当に素敵な写真をもらいました。',null,null,{body:'素敵なレビューありがとうございます。済州の美しさを引き出せて光栄です。また機会があれば幜しいです！',created_at:'2025-11-18',updated_at:'2025-11-18'}),
      REV('Park J.','2025.10',5,'성산일출봉 투어를 했는데 일출 전부터 후까지 모든 순간을 멋지게 담아주셨어요.','jeju',{ko:'성산일출봉 투어를 했는데 일출 전부터 후까지 모든 순간을 멋지게 담아주셨어요.',en:'We did the sunrise tour and she captured every moment beautifully.',ja:'サンライズツアーをして、すべての瞬間を素敵に撮ってくれました。',zh:'我们参加了日出之旅，她完美地捕捉了每一刻。'}),
      REV('Lee S.','2025.09',5,'자연스럽고 로맨틱한 결과물. 제주 촬영 무조건 유나님 추천!','jeju',{ko:'자연스럽고 로맨틱한 결과물. 제주 촬영 무조건 유나님 추천!',en:'Natural and romantic results. Definitely recommend Yuna for Jeju shoots!',ja:'自然でロマンティックな写真。済州撮影はユナさん推奨です！',zh:'自然而浪漫的结果。绝对推荐Yuna进行济州拍摄！'}),
      REV('Choi M.','2025.08',5,'가격은 조금 높지만 그만한 가치가 있는 포토그래퍼예요.','jeju',{ko:'가격은 조금 높지만 그만한 가치가 있는 포토그래퍼예요.',en:'Pricey but definitely worth it.',ja:'価格は少し高いですが、それだけの価値があります。',zh:'价格有点高，但绝对值得。'}),
      REV('James K.','2025.07',5,'Best wedding photos we could have asked for in Jeju. Highly professional!','jeju',{ko:'제주에서 원하던 최고의 웨딩 사진. 매우 전문적이에요!',en:'Best wedding photos we could have asked for in Jeju. Highly professional!',ja:'済州での最高のウェディング写真。とてもプロフェッショナルです！',zh:'这是我们在济州拍摄的最好的婚礼照片。非常专业！'}),
    ],
  },

  // ────── 5. 도쿄 ──────────────────────────────────────────────────────
  {
    id: 5,
    name: 'Ryo T.', nameKo: '타나카 료',
    locationId: 'tokyo',
    location: '도쿄 · 요코하마',
    locationNames: { ko: '도쿄 · 요코하마', en: 'Tokyo · Yokohama', ja: '東京・横浜', zh: '东京·横滨' },
    tags: ['portrait','indoor','couple'],
    snapFilters: ['studio', 'night', 'instant_booking'],
    instantBooking: true,
    languages: ['JP','EN','KO'],
    rating: 4.8, reviews: 203, price: 350000,
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1507371341519-ef13b88979d2?w=600&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80',
      'https://images.unsplash.com/photo-1516846327321-8f594f3664c7?w=600&q=80',
      'https://images.unsplash.com/photo-1513807534179-a78ddb8ef9f3?w=600&q=80',
    ],
    portfolioLocations: ['tokyo','tokyo','tokyo','yokohama','tokyo','tokyo'],
    bio: '도쿄의 네온과 고요함 사이에서 당신의 이야기를 찾습니다',
    bioI18n: {
      ko: '도쿄의 네온과 고요함 사이에서 당신의 이야기를 찾습니다',
      en: 'Finding your story between Tokyo\'s neon and silence. Urban and intimate photography.',
      ja: '東京のネオンと静寂の間にあなたの物語を見つけます',
      zh: '在东京的霓虹灯和寂静之间寻找你的故事',
    },
    hmk: false,
    artistType: "photographer",
    hmkSelf: false,
    dressSelf: false,
    props: ['스튜디오 의상 소품','조명 보조도구','배경장식'],
    propsI18n: { ko:['스튜디오 의상 소품','조명 보조도구','배경장식'], en:['Studio Props','Lighting Assist','Backdrop'], ja:['スタジオ小道具','ライティング補助','バックドロップ'], zh:['工作室道具','照明辅助','背景布'] },
    hourlyRate: 200000,
    tours: [
      TOUR('시부야-하라주쿠 야간 스냅 투어', 380000, 120, 50, '시부야 스크랜블 교차로 → 다카시타 거리 → 메이종 & 야경 촬영', ['시부야','하라주쿠','메이종'], 'total', 4, 2, 3),
    ],
    packages: [
      PKG('Studio', 280000, 1.5, 35, '스튜디오 실내 촬영'),
      PKG('Urban Night', 350000, 2, 60, '도쿄 야간 거리 촬영', true),
      PKG('City Explorer', 550000, 4, 120, '도쿄 전일 투어 스냅'),
    ],
    reviewList: [
      REV('佐藤 健太','2025.11',5,'東京での撮影は最高でした。ナイトシーンの撮影が特に素晴らしい。',null,null,{body:'素敵なレビューをありがとうございます。東京の夜の雰囲気を引き出せて光栄です。また是非！',created_at:'2025-11-25',updated_at:'2025-11-25'}),
      REV('Kim J.','2025.10',5,'도쿄 출장에서 야경 촬영을 부탁했는데 역시 료 작가님! 도쿄 감성 최고!','tokyo',{ko:'도쿄 출장에서 야경 촬영을 부탁했는데 역시 료 작가님! 도쿄 감성 최고!',en:'Did a night shoot during my Tokyo business trip. Ryo is the best!',ja:'東京出張での夜景撮影。さすがリョウさん！東京の雰囲気最高！',zh:'在东京出差期间拍摄夜景。Ryo是最好的！'}),
      REV('Sarah M.','2025.09',5,'Very professional and captured our Tokyo experience perfectly. Great urban photographer!','tokyo',{ko:'매우 전문적이고 도쿄 경험을 완벽하게 담았어요. 최고의 도시 포토그래퍼!',en:'Very professional and captured our Tokyo experience perfectly. Great urban photographer!',ja:'とてもプロフェッショナルで、東京での経験を完璧に捉えました。素晴らしい都市フォトグラファー！',zh:'非常专业，完美地捕捉了我们的东京体验。很棒的城市摄影师！'}),
      REV('Tanaka M.','2025.08',5,'スタジオ撮影も依頼しましたが、光の使い方が本当に素晴らしい。',null,null,{body:'ありがとうございました。スタジオでの光の扱いを大事にしているので、嬉しいお言葉です。',created_at:'2025-08-20',updated_at:'2025-08-20'}),
      REV('Park H.','2025.07',4,'도쿄 여행 중에 좋은 기념사진을 얻었어요. 다만 가격이 좀 비싼 편입니다.','tokyo',{ko:'도쿄 여행 중에 좋은 기념사진을 얻었어요. 다만 가격이 좀 비싼 편입니다.',en:'Got nice travel photos in Tokyo. Price is a bit high though.',ja:'東京旅行で良い記念写真が取れました。ただ価格は少し高めです。',zh:'在东京旅行中得到了好照片。不过价格有点贵。'}),
      REV('Chris L.','2025.06',5,'Perfect for Tokyo couple photography. Ryo captured our best moments!','tokyo',{ko:'도쿄 커플 촬영 최고! 료님이 최고의 순간을 다 담았어요!',en:'Perfect for Tokyo couple photography. Ryo captured our best moments!',ja:'東京でのカップル撮影に完璧。リョウさんが最高の瞬間を捉えました！',zh:'非常适合东京情侣拍摄。Ryo捕捉了我们最美的瞬间！'}),
    ],
  },

  // ────── 6. 파리 ──────────────────────────────────────────────────────
  {
    id: 6,
    name: 'Claire D.', nameKo: '클레어 뒤봉',
    locationId: 'paris',
    location: '파리',
    locationNames: { ko: '파리', en: 'Paris', ja: 'パリ', zh: '巴黎' },
    tags: ['wedding','couple','outdoor'],
    snapFilters: ['golden_hour', 'hmu'],
    instantBooking: false,
    languages: ['FR','EN','KO'],
    rating: 4.9, reviews: 187, price: 450000,
    img: 'https://images.unsplash.com/photo-1506611537872-a4a16f6355c2?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80',
      'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=600&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
      'https://images.unsplash.com/photo-1516846327321-8f594f3664c7?w=600&q=80',
      'https://images.unsplash.com/photo-1524578271613-d2dca89d60a0?w=600&q=80',
    ],
    portfolioLocations: ['paris','paris','paris','paris','paris','paris'],
    bio: '파리의 빛 아래서 가장 아름다운 순간을 포착합니다',
    bioI18n: {
      ko: '파리의 빛 아래서 가장 아름다운 순간을 포착합니다',
      en: 'Capturing the most beautiful moments under Paris light. Romance and elegance in every frame.',
      ja: 'パリの光の下で最も美しい瞬間を捉えます',
      zh: '在巴黎的灯光下捕捉最美时刻',
    },
    hmk: true,
    artistType: "photographer",
    hmkSelf: true,
    hmkOptions: [{"name":"Romantique","price":120000,"desc":"로맨틱 웨딩 메이크업"},{"name":"Elegante","price":160000,"desc":"우아한 클래식 웨딩 메이크업 + 헤어"}],
    dressSelf: false,
    props: ['웨딩 부케','프렌치 엘리건스 소품','빈티지 액세서리'],
    propsI18n: { ko:['웨딩 부케','프렌치 엘리건스 소품','빈티지 액세서리'], en:['Wedding Bouquet','French Elegance Props','Vintage Accessories'], ja:['ウェディングブーケ','フランスエレガンス小道具','ヴィンテージアクセサリー'], zh: ['婚礼花束','法式优雅道具','复古饰品'] },
    hourlyRate: 250000,
    tours: [
      TOUR('에펠탑-세느강 로맨틱 투어', 500000, 120, 80, '에펠탑 → 트로카데로 → 세느강 크루즈 → 노트르담 야경 촬영', ['에펠탑','세느강','노트르담'], 'total', 4, 2, 7),
    ],
    packages: [
      PKG('Parisian', 380000, 2, 60, '파리의 고풍스러운 거리 촬영'),
      PKG('Romance', 450000, 3, 90, '파리 웨딩 스냅 (부케 & 메이크업 포함)', true),
      PKG('Luxe', 700000, 5, 150, '전일 파리 프리미엄 웨딩 스냅'),
    ],
    reviewList: [
      REV('Dupont J.','2025.11',5,'Paris avec Claire était magnifique. Les photos sont absolument parfaites!',null,null,{body:'Merci pour vos aimables commentaires! C\'était un honneur de capturer votre jour spécial à Paris. Bisous!',created_at:'2025-11-20',updated_at:'2025-11-20'}),
      REV('Kim T.','2025.10',5,'파리에서 웨딩 촬영을 했는데 정말 꿈 같았어요. 클레어 작가님의 감각과 센스가 최고입니다.','paris',{ko:'파리에서 웨딩 촬영을 했는데 정말 꿈 같았어요. 클레어 작가님의 감각과 센스가 최고입니다.',en:'Wedding shoot in Paris was like a dream. Claire\'s sense and style are the best!',ja:'パリでのウェディング撮影は本当に夢のようでした。クレアさんのセンスは最高です！',zh:'在巴黎的婚礼拍摄就像一场梦。Claire的品味和风格是最好的！'},{body:'정말 고마운 말씀이에요. 당신들의 행복함이 렌즈에 그대로 담겼어요. 행복하세요!',created_at:'2025-10-15',updated_at:'2025-10-15'}),
      REV('Laurent M.','2025.09',5,'Les photos de notre mariage à Paris sont magnifiques. Claire est une vraie artiste!','paris',{ko:'파리에서의 결혼식 사진들이 멋져요. 클레어는 진정한 예술가예요!',en:'Our Paris wedding photos are stunning. Claire is a true artist!',ja:'パリでの結婚式の写真は素晴らしい。クレアは真の芸術家です！',zh:'我们在巴黎的婚礼照片太漂亮了。Claire是真正的艺术家！'}),
      REV('Emma S.','2025.08',5,'Absolutely stunning work. Worth every penny for Paris wedding photography!','paris',{ko:'정말 멋진 작품들. 파리 웨딩 촬영의 가치가 충분해요!',en:'Absolutely stunning work. Worth every penny for Paris wedding photography!',ja:'本当に素晴らしい作品。パリのウェディング撮影の価値は十分です！',zh:'绝对令人惊艳的作品。值得为巴黎婚礼拍摄花费！'}),
      REV('Park J.','2025.07',5,'신혼 첫 여행이 파리였는데 클레어 작가님 덕분에 더 특별한 추억이 되었어요. 프랑스에서 꼭 만나고 싶었던 분입니다.','paris',{ko:'신혼 첫 여행이 파리였는데 클레어 작가님 덕분에 더 특별한 추억이 되었어요. 프랑스에서 꼭 만나고 싶었던 분입니다.',en:'Our first honeymoon trip was in Paris. Meeting Claire made it even more special!',ja:'新婚初めての旅がパリでしたが、クレアさんのおかげでさらに特別な思い出になりました。',zh:'我们的新婚蜜月第一站是巴黎。与Claire相遇让它更加特别！'}),
      REV('Sophie L.','2025.06',5,'Impeccable service and breathtaking photos. Highly recommended for any Paris wedding!','paris',{ko:'완벽한 서비스와 아름다운 사진들. 파리 웨딩 추천합니다!',en:'Impeccable service and breathtaking photos. Highly recommended for any Paris wedding!',ja:'完璧なサービスと素晴らしい写真。パリのウェディングをお勧めします！',zh:'无可挑剔的服务和绝美的照片。强烈推荐巴黎婚礼拍摄！'}),
    ],
  },

  // ────── 7. 강릉 ──────────────────────────────────────────────────────
  {
    id: 7,
    name: 'Dohyun P.', nameKo: '박도현',
    locationId: 'gangneung',
    location: '강릉 · 속초',
    locationNames: { ko: '강릉 · 속초', en: 'Gangneung · Sokcho', ja: '江陵・束草', zh: '江陵·束草' },
    tags: ['couple','outdoor','portrait'],
    snapFilters: ['golden_hour'],
    instantBooking: false,
    languages: ['KO','EN'],
    rating: 4.6, reviews: 45, price: 180000,
    img: 'https://images.unsplash.com/photo-1514736569399-37201b2851cf?w=800&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
      'https://images.unsplash.com/photo-1516846327321-8f594f3664c7?w=600&q=80',
      'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=600&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
      'https://images.unsplash.com/photo-1480649359383-c0281f81b55a?w=600&q=80',
      'https://images.unsplash.com/photo-1506611537872-a4a16f6355c2?w=600&q=80',
    ],
    portfolioLocations: ['gangneung','gangneung','sokcho','gangneung','sokcho','gangneung'],
    bio: '동해의 일출과 소나무 숲, 강릉의 고즈넉한 카페 거리에서 촬영합니다',
    bioI18n: {
      ko: '동해의 일출과 소나무 숲, 강릉의 고즈넉한 카페 거리에서 촬영합니다',
      en: 'Capturing sunrise over the East Sea, pine forests, and cozy Gangneung cafes.',
      ja: '東海の日出と松の林、江陵の落ち着いたカフェ通りで撮影します',
      zh: '在东海日出、松树林和江陵舒适咖啡街拍摄',
    },
    hmk: false,
    artistType: "photographer",
    hmkSelf: false,
    dressSelf: false,
    props: ['자연 소품','카페 배경','플로럴 데코'],
    propsI18n: { ko:['자연 소품','카페 배경','플로럴 데코'], en:['Natural Props','Cafe Background','Floral Deco'], ja:['自然小道具','カフェ背景','フローラルデコ'], zh: ['自然道具','咖啡馆背景','花卉装饰'] },
    hourlyRate: 130000,
    tours: [
      TOUR('강릉 해변 & 카페거리 투어', 250000, 120, 45, '정동진 해변 → 카페거리 → 강릉 해상케이블카 촬영', ['정동진','강릉 카페거리','해상케이블카'], 'total', 4, 2, 7),
    ],
    packages: [
      PKG('Sunrise', 140000, 1, 25, '동해 일출 촬영'),
      PKG('Gangneung', 180000, 2, 50, '강릉 카페 & 해변 스냅', true),
      PKG('Full Coast', 320000, 3.5, 90, '강릉·속초 해안선 투어'),
    ],
    reviewList: [
      REV('Lee M.','2025.10',5,'강릉 카페거리에서 촬영했는데 감성 최고였어요. 자연스러운 스타일이 정말 좋습니다.','gangneung',{ko:'강릉 카페거리에서 촬영했는데 감성 최고였어요. 자연스러운 스타일이 정말 좋습니다.',en:'Shot in Gangneung cafe street, very emotional! Natural style is great.',ja:'江陵のカフェ通りで撮影、感性最高！自然なスタイルが素晴らしい。',zh:'在江陵咖啡街拍摄，感性最佳！自然风格很棒。'}),
      REV('Park C.','2025.09',4,'동해 일출 촬영도 좋았는데 더 많은 위치 제안이 있으면 좋겠어요.','sokcho',{ko:'동해 일출 촬영도 좋았는데 더 많은 위치 제안이 있으면 좋겠어요.',en:'Sunrise shoot was good but would like more location suggestions.',ja:'日出の撮影は良かったが、もっと多くの場所の提案があると良い。',zh:'日出拍摄不错，但希望有更多地点建议。'}),
      REV('Kim J.','2025.08',5,'처음 쓰는 포토그래퍼인데 정말 친절하고 편하게 촬영할 수 있었어요.','gangneung',{ko:'처음 쓰는 포토그래퍼인데 정말 친절하고 편하게 촬영할 수 있었어요.',en:'First time using this photographer, very kind and comfortable!',ja:'初めてのフォトグラファーですが、本当に親切で快適です！',zh:'第一次使用这位摄影师，非常友善和舒适！'}),
      REV('Choi H.','2025.07',5,'속초 여행 중에 남은 추억을 멋진 사진으로 남겼어요. 감사합니다!','sokcho',{ko:'속초 여행 중에 남은 추억을 멋진 사진으로 남겼어요. 감사합니다!',en:'Left memories from Sokcho trip as beautiful photos. Thank you!',ja:'束草旅行の思い出を美しい写真に残しました。ありがとう！',zh:'将束草之旅的回忆留作美丽的照片。谢谢！'}),
      REV('Ryu S.','2025.06',5,'예산 조건에 맞춰서 좋은 패키지를 만들어주셨어요. 추천합니다!','gangneung',{ko:'예산 조건에 맞춰서 좋은 패키지를 만들어주셨어요. 추천합니다!',en:'Made a good package to fit my budget. Recommended!',ja:'予算に合わせて良いパッケージを作ってくれました。推奨します！',zh:'根据我的预算制定了很好的套餐。推荐！'}),
    ],
  },
];
