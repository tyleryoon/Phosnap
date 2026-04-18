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
];
