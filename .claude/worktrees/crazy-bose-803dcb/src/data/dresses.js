export const DRESS_ITEMS = [
  // dv-1: Kyoto hanbok & kimono (4 items)
  {
    id: 'di-1',
    vendorId: 'dv-1',
    name: '여성 경주 한복',
    nameI18n: {
      ko: '여성 경주 한복',
      en: 'Women\'s Gyeongju Hanbok',
      ja: '女性用京都ハンボク',
      zh: '女性京都韩服'
    },
    category: 'hanbok',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 85000,
    images: [
      { url: 'https://images.unsplash.com/photo-1599599810694-e5efd57d1876?w=600&q=80', sizeLabel: 'main', caption: 'Traditional hanbok in graceful colors' },
      { url: 'https://images.unsplash.com/photo-1609525881570-2a2fa32e7b7e?w=600&q=80', sizeLabel: 'back', caption: 'Back view' },
      { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', sizeLabel: 'detail', caption: 'Fabric detail' },
      { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', sizeLabel: 'side', caption: 'Side silhouette' },
    ],
    desc: '전통적인 경주 한복으로 우아함과 정성이 담긴 디자인입니다.',
    descI18n: {
      ko: '전통적인 경주 한복으로 우아함과 정성이 담긴 디자인입니다.',
      en: 'Traditional Gyeongju-style hanbok with elegant and thoughtful design.',
      ja: '伝統的な京都ハンボクで、優雅で丁寧なデザインです。',
      zh: '传统京都风格韩服，优雅细致的设计。'
    },
    color: 'pink',
    sortOrder: 1,
    isAvailable: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z'
  },
  {
    id: 'di-2',
    vendorId: 'dv-1',
    name: '남성 경주 한복',
    nameI18n: {
      ko: '남성 경주 한복',
      en: 'Men\'s Gyeongju Hanbok',
      ja: '男性用京都ハンボク',
      zh: '男性京都韩服'
    },
    category: 'hanbok',
    sizes: ['M', 'L', 'XL', 'XXL'],
    price: 95000,
    images: [
      { url: 'https://images.unsplash.com/photo-1591447159903-d0bd0f68c8d3?w=600&q=80', sizeLabel: 'main', caption: 'Classic men\'s hanbok' },
      { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', sizeLabel: 'full', caption: 'Full length view' },
      { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', sizeLabel: 'detail', caption: 'Fabric texture detail' },
    ],
    desc: '고급스러운 남성 경주 한복 정장입니다.',
    descI18n: {
      ko: '고급스러운 남성 경주 한복 정장입니다.',
      en: 'Luxurious men\'s Gyeongju hanbok formal wear.',
      ja: 'ラグジュアリーな男性用京都ハンボク正装です。',
      zh: '高级男性京都韩服正装。'
    },
    color: 'navy',
    sortOrder: 2,
    isAvailable: true,
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T08:30:00Z'
  },
  {
    id: 'di-3',
    vendorId: 'dv-1',
    name: '여성 기모노 후리소데',
    nameI18n: {
      ko: '여성 기모노 후리소데',
      en: 'Women\'s Furisode Kimono',
      ja: '女性用振袖着物',
      zh: '女性振袖和服'
    },
    category: 'traditional_jp',
    sizes: ['Free'],
    price: 110000,
    images: [
      { url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', sizeLabel: 'main', caption: 'Vibrant furisode with traditional patterns' },
      { url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', sizeLabel: 'back', caption: 'Obi detail from behind' },
      { url: 'https://images.unsplash.com/photo-1545048702-79362596cdc9?w=600&q=80', sizeLabel: 'scene', caption: 'Traditional setting' },
      { url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600&q=80', sizeLabel: 'sleeve', caption: 'Long sleeve detail' },
    ],
    desc: '화려한 문양과 긴 소매가 특징인 미혼 여성용 기모노입니다.',
    descI18n: {
      ko: '화려한 문양과 긴 소매가 특징인 미혼 여성용 기모노입니다.',
      en: 'Unmarried woman\'s kimono with vibrant patterns and long flowing sleeves.',
      ja: '鮮やかな文様と長い袖が特徴の未婚女性用着物です。',
      zh: '未婚女性和服，鲜艳花纹和长飘袖。'
    },
    color: 'red',
    sortOrder: 3,
    isAvailable: true,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'di-4',
    vendorId: 'dv-1',
    name: '남성 기모노 착용',
    nameI18n: {
      ko: '남성 기모노 착용',
      en: 'Men\'s Formal Kimono',
      ja: '男性用紋付羽織袴',
      zh: '男性正式和服'
    },
    category: 'traditional_jp',
    sizes: ['M', 'L', 'XL'],
    price: 125000,
    images: [
      { url: 'https://images.unsplash.com/photo-1545048702-79362596cdc9?w=600&q=80', sizeLabel: 'main', caption: 'Traditional men\'s formal kimono' },
      { url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', sizeLabel: 'full', caption: 'Full formal wear' },
      { url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600&q=80', sizeLabel: 'hakama', caption: 'Hakama detail' },
    ],
    desc: '남성의 격식있는 자리에 어울리는 전통 기모노입니다.',
    descI18n: {
      ko: '남성의 격식있는 자리에 어울리는 전통 기모노입니다.',
      en: 'Traditional men\'s formal kimono for dignified occasions.',
      ja: '男性の格式ある場に相応しい伝統的な着物です。',
      zh: '适合男性正式场合的传统和服。'
    },
    color: 'black',
    sortOrder: 4,
    isAvailable: true,
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T09:30:00Z'
  },

  // dv-2: Seoul wedding dress & tuxedo (4 items)
  {
    id: 'di-5',
    vendorId: 'dv-2',
    name: 'A라인 웨딩드레스',
    nameI18n: {
      ko: 'A라인 웨딩드레스',
      en: 'A-Line Wedding Dress',
      ja: 'Aラインウェディングドレス',
      zh: 'A字婚礼礼服'
    },
    category: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    price: 250000,
    images: [
      { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', sizeLabel: 'main', caption: 'Classic A-line wedding dress' },
      { url: 'https://images.unsplash.com/photo-1595777707802-9b2be8c84e4e?w=600&q=80', sizeLabel: 'back', caption: 'Elegant back view' },
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', sizeLabel: 'veil', caption: 'With veil styling' },
      { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80', sizeLabel: 'train', caption: 'Train detail' },
    ],
    desc: '우아한 A라인 실루엣의 웨딩드레스로 모든 체형에 잘 어울립니다.',
    descI18n: {
      ko: '우아한 A라인 실루엣의 웨딩드레스로 모든 체형에 잘 어울립니다.',
      en: 'Elegant A-line wedding dress that flatters all body types.',
      ja: '優雅なAラインシルエットのウェディングドレスで、すべての体型に似合います。',
      zh: '优雅的A字婚礼礼服，适合所有身型。'
    },
    color: 'white',
    sortOrder: 5,
    isAvailable: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'di-6',
    vendorId: 'dv-2',
    name: '머메이드 웨딩드레스',
    nameI18n: {
      ko: '머메이드 웨딩드레스',
      en: 'Mermaid Wedding Dress',
      ja: 'マーメイドウェディングドレス',
      zh: '鱼尾婚礼礼服'
    },
    category: 'dress',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    price: 280000,
    images: [
      { url: 'https://images.unsplash.com/photo-1595777707802-9b2be8c84e4e?w=600&q=80', sizeLabel: 'main', caption: 'Glamorous mermaid-style wedding dress' },
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', sizeLabel: 'back', caption: 'Back silhouette' },
      { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', sizeLabel: 'side', caption: 'Side profile' },
    ],
    desc: '몸라인을 강조하는 머메이드 드레스로 여성스러운 매력을 극대화합니다.',
    descI18n: {
      ko: '몸라인을 강조하는 머메이드 드레스로 여성스러운 매력을 극대화합니다.',
      en: 'Body-hugging mermaid dress that maximizes feminine allure.',
      ja: 'ボディラインを強調するマーメイドドレスで、女性らしい魅力を最大化します。',
      zh: '突出身型的鱼尾礼服，展现女性魅力。'
    },
    color: 'ivory',
    sortOrder: 6,
    isAvailable: false,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'di-7',
    vendorId: 'dv-2',
    name: '남성 웨딩 턱시도',
    nameI18n: {
      ko: '남성 웨딩 턱시도',
      en: 'Men\'s Wedding Tuxedo',
      ja: '男性用ウェディングタキシード',
      zh: '男性婚礼燕尾服'
    },
    category: 'tuxedo',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    price: 180000,
    images: [
      { url: 'https://images.unsplash.com/photo-1505857671763-a42ada556417?w=600&q=80', sizeLabel: 'main', caption: 'Classic black wedding tuxedo' },
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', sizeLabel: 'detail', caption: 'Lapel & boutonniere detail' },
      { url: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&q=80', sizeLabel: 'full', caption: 'Full standing pose' },
    ],
    desc: '세련된 검정색 턱시도로 신부와의 조화를 이룹니다.',
    descI18n: {
      ko: '세련된 검정색 턱시도로 신부와의 조화를 이룹니다.',
      en: 'Sophisticated black tuxedo that harmonizes with the bride.',
      ja: '洗練された黒いタキシードで花嫁との調和を実現します。',
      zh: '精致的黑色燕尾服，与新娘相得益彰。'
    },
    color: 'black',
    sortOrder: 7,
    isAvailable: true,
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z'
  },
  {
    id: 'di-8',
    vendorId: 'dv-2',
    name: '웨딩 베일 세트',
    nameI18n: {
      ko: '웨딩 베일 세트',
      en: 'Wedding Veil Set',
      ja: 'ウェディングベールセット',
      zh: '婚礼头纱套装'
    },
    category: 'accessory',
    sizes: ['Free'],
    price: 45000,
    images: [
      { url: 'https://images.unsplash.com/photo-1519671482677-e139c192d163?w=600&q=80', sizeLabel: 'main', caption: 'Delicate wedding veil with tiara' },
      { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80', sizeLabel: 'worn', caption: 'Veil worn by bride' },
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', sizeLabel: 'tiara', caption: 'Tiara close-up' },
    ],
    desc: '우아한 베일과 티아라 세트로 신부를 완성시킵니다.',
    descI18n: {
      ko: '우아한 베일과 티아라 세트로 신부를 완성시킵니다.',
      en: 'Elegant veil and tiara set that completes the bridal look.',
      ja: '優雅なベールとティアラセットで花嫁を完成させます。',
      zh: '优雅的头纱和皇冠套装，完美诠释新娘形象。'
    },
    color: 'white',
    sortOrder: 8,
    isAvailable: true,
    createdAt: '2024-01-15T11:30:00Z',
    updatedAt: '2024-01-15T11:30:00Z'
  },
];

export const getDressesByVendor = (vendorId) =>
  DRESS_ITEMS.filter(d => d.vendorId === vendorId && d.isAvailable);

export const getDressesByCategory = (category) =>
  DRESS_ITEMS.filter(d => d.category === category && d.isAvailable);

export const getDressById = (id) =>
  DRESS_ITEMS.find(d => d.id === id);
