export const DRESS_VENDORS = [
  {
    id: 'dv-1',
    userId: 'user-kyoto-001',
    name: '교토 한복 & 기모노 전문',
    nameI18n: {
      ko: '교토 한복 & 기모노 전문',
      en: 'Kyoto Hanbok & Kimono Specialists',
      ja: '京都韓服・着物専門店',
      zh: '京都韩服和服租赁专家'
    },
    bio: '교토에서 40년 이상 한복과 기모노를 전문으로 취급해온 명문 의상 대여점입니다. 전통적이고 우아한 스타일을 추구하는 고객들을 위해 최고 품질의 의상을 제공합니다.',
    bioI18n: {
      ko: '교토에서 40년 이상 한복과 기모노를 전문으로 취급해온 명문 의상 대여점입니다. 전통적이고 우아한 스타일을 추구하는 고객들을 위해 최고 품질의 의상을 제공합니다.',
      en: 'A prestigious rental boutique in Kyoto specializing in hanbok and kimono for over 40 years. We provide the highest quality traditional garments for customers seeking elegant, authentic style.',
      ja: '京都で40年以上、韓服と着物の専門レンタルを行う老舗です。伝統的で優雅なスタイルをお求めのお客様に最高品質の衣装をご提供します。',
      zh: '京都40多年来专门从事韩服和服租赁的老字号精品店。为追求优雅传统风格的顾客提供最高品质的服装。'
    },
    locationId: 'kyoto',
    locationNames: {
      ko: '교토',
      en: 'Kyoto',
      ja: '京都',
      zh: '京都'
    },
    categories: ['hanbok', 'traditional_jp'],
    tags: ['hanbok', 'kimono', 'yukata', 'crown', 'fan'],
    img: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80',
    contactInfo: {
      phone: '+81-75-XXX-XXXX',
      email: 'info@kyoto-hanbok-kimono.jp',
      instagram: '@kyoto_hanbok_kimono',
      website: 'https://kyoto-hanbok-kimono.jp'
    },
    isActive: true,
    createdAt: '2023-06-15T08:00:00Z',
    updatedAt: '2024-02-10T12:30:00Z'
  },
  {
    id: 'dv-2',
    userId: 'user-seoul-001',
    name: '서울 웨딩드레스 전문',
    nameI18n: {
      ko: '서울 웨딩드레스 전문',
      en: 'Seoul Wedding Dress Specialists',
      ja: 'ソウルウェディングドレス専門店',
      zh: '首尔婚纱礼服专家'
    },
    bio: '강남 중심부에 위치한 한국 최고의 웨딩드레스와 신랑 턱시도 대여 전문점입니다. 국내외 유명 디자이너 컬렉션과 맞춤 서비스로 완벽한 결혼식을 준비해드립니다.',
    bioI18n: {
      ko: '강남 중심부에 위치한 한국 최고의 웨딩드레스와 신랑 턱시도 대여 전문점입니다. 국내외 유명 디자이너 컬렉션과 맞춤 서비스로 완벽한 결혼식을 준비해드립니다.',
      en: 'Premier wedding dress and groom tuxedo rental boutique located in central Gangnam, Seoul. We offer renowned domestic and international designer collections with personalized styling services.',
      ja: 'ソウル江南中心部に位置する韓国有数のウェディングドレスと新郎タキシード専門レンタル店です。国内外の有名デザイナーコレクションと カスタムサービスで完璧な挙式をお手伝いします。',
      zh: '位于首尔江南中心的韩国首屈一指的婚纱和新郎礼服租赁专家。提供国际知名设计师系列和定制服务，为您完美筹备婚礼。'
    },
    locationId: 'seoul',
    locationNames: {
      ko: '서울',
      en: 'Seoul',
      ja: 'ソウル',
      zh: '首尔'
    },
    categories: ['dress', 'tuxedo'],
    tags: ['wedding_dress', 'tuxedo', 'suit', 'evening_gown', 'veil', 'bouquet'],
    img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    contactInfo: {
      phone: '+82-2-XXX-XXXX',
      email: 'bridal@seoulweddingdress.com',
      instagram: '@seoul_wedding_dress_official',
      website: 'https://seoulweddingdress.com'
    },
    isActive: true,
    createdAt: '2022-03-20T10:15:00Z',
    updatedAt: '2024-03-05T14:45:00Z'
  },
];

export const getVendorsByLocation = (locationId) => {
  return DRESS_VENDORS.filter(v => v.locationId === locationId);
};

export const getVendorById = (id) => {
  return DRESS_VENDORS.find(v => v.id === id);
};
