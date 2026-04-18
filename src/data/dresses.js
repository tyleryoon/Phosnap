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
      { url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80', sizeLabel: 'main', caption: 'Vibrant furisode with traditional patterns' },
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
      { url: 'https://images.unsplash.com/photo-1614008375890-cb53b6c5f8d5?w=600&q=80', sizeLabel: 'main', caption: 'Traditional men\'s formal kimono' },
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
      { url: 'https://images.unsplash.com/photo-1506930477529-9c1f2f1ed5bb?w=600&q=80', sizeLabel: 'main', caption: 'Glamorous mermaid-style wedding dress' },
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

  // dv-3: Jeju casual & hanbok (4 items)
  {
    id: 'di-9',
    vendorId: 'dv-3',
    name: '제주 린넨 한복',
    nameI18n: {
      ko: '제주 린넨 한복',
      en: 'Jeju Linen Hanbok',
      ja: 'チェジュ麻ハンボク',
      zh: '济州亚麻韩服'
    },
    category: 'hanbok',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 75000,
    images: [
      { url: 'https://images.unsplash.com/photo-1599599810694-e5efd57d1876?w=600&q=80', sizeLabel: 'main', caption: 'Light and comfortable linen hanbok' },
      { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', sizeLabel: 'outdoor', caption: 'Jeju outdoor shot' },
      { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', sizeLabel: 'fabric', caption: 'Linen texture detail' },
    ],
    desc: '제주의 바다 감성을 담은 가벼운 린넨 한복입니다.',
    descI18n: {
      ko: '제주의 바다 감성을 담은 가벼운 린넨 한복입니다.',
      en: 'Light linen hanbok infused with Jeju\'s ocean essence.',
      ja: 'チェジュの海の感性を表現した軽い麻のハンボクです。',
      zh: '承载济州海洋气息的轻盈亚麻韩服。'
    },
    color: 'beige',
    sortOrder: 9,
    isAvailable: true,
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  },
  {
    id: 'di-10',
    vendorId: 'dv-3',
    name: '카주얼 원피스',
    nameI18n: {
      ko: '카주얼 원피스',
      en: 'Casual One-Piece Dress',
      ja: 'カジュアルワンピース',
      zh: '休闲连衣裙'
    },
    category: 'casual',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    price: 55000,
    images: [
      { url: 'https://images.unsplash.com/photo-1595777707802-9b2be8c84e4e?w=600&q=80', sizeLabel: 'main', caption: 'Comfortable everyday one-piece dress' },
      { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80', sizeLabel: 'full', caption: 'Full length view' },
      { url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80', sizeLabel: 'styled', caption: 'Styled with accessories' },
    ],
    desc: '일상에서 편하게 입을 수 있는 고급스러운 원피스입니다.',
    descI18n: {
      ko: '일상에서 편하게 입을 수 있는 고급스러운 원피스입니다.',
      en: 'Sophisticated one-piece dress for comfortable everyday wear.',
      ja: '日常で楽に着られるラグジュアリーなワンピースです。',
      zh: '日常舒适穿着的精致连衣裙。'
    },
    color: 'navy',
    sortOrder: 10,
    isAvailable: true,
    createdAt: '2024-01-15T12:30:00Z',
    updatedAt: '2024-01-15T12:30:00Z'
  },
  {
    id: 'di-11',
    vendorId: 'dv-3',
    name: '린넨 셋업 2피스',
    nameI18n: {
      ko: '린넨 셋업 2피스',
      en: 'Linen Setup Two-Piece',
      ja: 'リネンセットアップ2ピース',
      zh: '亚麻套装两件套'
    },
    category: 'casual',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 68000,
    images: [
      { url: 'https://images.unsplash.com/photo-1612621776059-1df55cda8703?w=600&q=80', sizeLabel: 'main', caption: 'Breathable linen setup for hot days' },
      { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80', sizeLabel: 'top', caption: 'Top piece detail' },
      { url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80', sizeLabel: 'full', caption: 'Full set view' },
    ],
    desc: '통풍이 잘 되는 린넨 소재의 세련된 2피스 셋업입니다.',
    descI18n: {
      ko: '통풍이 잘 되는 린넨 소재의 세련된 2피스 셋업입니다.',
      en: 'Breathable linen two-piece set with sophisticated style.',
      ja: '通気性の良いリネン素材の洗練された2ピースセットアップです。',
      zh: '透气性强的亚麻材质精致两件套。'
    },
    color: 'cream',
    sortOrder: 11,
    isAvailable: true,
    createdAt: '2024-01-15T13:00:00Z',
    updatedAt: '2024-01-15T13:00:00Z'
  },
  {
    id: 'di-12',
    vendorId: 'dv-3',
    name: '커플 캐주얼 세트',
    nameI18n: {
      ko: '커플 캐주얼 세트',
      en: 'Couple Casual Set',
      ja: 'カップルカジュアルセット',
      zh: '情侣休闲套装'
    },
    category: 'casual',
    sizes: ['S-M', 'M-L', 'L-XL'],
    price: 120000,
    images: [
      { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80', sizeLabel: 'main', caption: 'Matching couple casual outfits' },
      { url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80', sizeLabel: 'pair', caption: 'Couple wearing together' },
      { url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80', sizeLabel: 'styled', caption: 'Styled couple look' },
    ],
    desc: '연인과 함께 매칭할 수 있는 캐주얼한 커플 세트입니다.',
    descI18n: {
      ko: '연인과 함께 매칭할 수 있는 캐주얼한 커플 세트입니다.',
      en: 'Casual couple set perfect for matching with your significant other.',
      ja: 'パートナーとマッチングできるカジュアルなカップルセットです。',
      zh: '与伴侣相配的休闲情侣套装。'
    },
    color: 'white',
    sortOrder: 12,
    isAvailable: true,
    createdAt: '2024-01-15T13:30:00Z',
    updatedAt: '2024-01-15T13:30:00Z'
  },

  // dv-4: Paris formal wear (4 items)
  {
    id: 'di-13',
    vendorId: 'dv-4',
    name: '파리 엘레강스 드레스',
    nameI18n: {
      ko: '파리 엘레강스 드레스',
      en: 'Paris Elegance Dress',
      ja: 'パリエレガンスドレス',
      zh: '巴黎优雅礼服'
    },
    category: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    price: 220000,
    images: [
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', sizeLabel: 'main', caption: 'Sophisticated Parisian formal dress' },
      { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80', sizeLabel: 'back', caption: 'Back drape detail' },
      { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', sizeLabel: 'scene', caption: 'Evening event styling' },
    ],
    desc: '파리의 우아함을 담은 클래식한 포멀 드레스입니다.',
    descI18n: {
      ko: '파리의 우아함을 담은 클래식한 포멀 드레스입니다.',
      en: 'Classic formal dress infused with Parisian elegance.',
      ja: 'パリの優雅さを表現したクラシックなフォーマルドレスです。',
      zh: '承载巴黎优雅气质的经典正装礼服。'
    },
    color: 'black',
    sortOrder: 13,
    isAvailable: true,
    createdAt: '2024-01-15T14:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z'
  },
  {
    id: 'di-14',
    vendorId: 'dv-4',
    name: '로맨틱 공주 드레스',
    nameI18n: {
      ko: '로맨틱 공주 드레스',
      en: 'Romantic Princess Dress',
      ja: 'ロマンティックプリンセスドレス',
      zh: '浪漫公主礼服'
    },
    category: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    price: 240000,
    images: [
      { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', sizeLabel: 'main', caption: 'Dreamy princess-style formal gown' },
      { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80', sizeLabel: 'skirt', caption: 'Full skirt detail' },
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', sizeLabel: 'scene', caption: 'Venue styling' },
      { url: 'https://images.unsplash.com/photo-1519671482677-e139c192d163?w=600&q=80', sizeLabel: 'accessory', caption: 'With accessories' },
    ],
    desc: '공주처럼 우아한 볼유민의 포멀 드레스입니다.',
    descI18n: {
      ko: '공주처럼 우아한 볼유민의 포멀 드레스입니다.',
      en: 'Elegant full-skirted formal dress fit for a princess.',
      ja: '公主のように優雅なボールガウンのフォーマルドレスです。',
      zh: '如同公主般优雅的蓬裙正装礼服。'
    },
    color: 'blush',
    sortOrder: 14,
    isAvailable: true,
    createdAt: '2024-01-15T14:30:00Z',
    updatedAt: '2024-01-15T14:30:00Z'
  },
  {
    id: 'di-15',
    vendorId: 'dv-4',
    name: '파리 턱시도',
    nameI18n: {
      ko: '파리 턱시도',
      en: 'Paris Tuxedo',
      ja: 'パリタキシード',
      zh: '巴黎燕尾服'
    },
    category: 'tuxedo',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 195000,
    images: [
      { url: 'https://images.unsplash.com/photo-1505857671763-a42ada556417?w=600&q=80', sizeLabel: 'main', caption: 'Parisian-style elegant tuxedo' },
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', sizeLabel: 'detail', caption: 'Pocket square detail' },
      { url: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&q=80', sizeLabel: 'styled', caption: 'Formal event styling' },
    ],
    desc: '파리의 샤린을 느낄 수 있는 세련된 턱시도입니다.',
    descI18n: {
      ko: '파리의 샤린을 느낄 수 있는 세련된 턱시도입니다.',
      en: 'Refined tuxedo that embodies Parisian charm.',
      ja: 'パリの魅力を感じさせる洗練されたタキシードです。',
      zh: '散发巴黎魅力的精致燕尾服。'
    },
    color: 'black',
    sortOrder: 15,
    isAvailable: true,
    createdAt: '2024-01-15T15:00:00Z',
    updatedAt: '2024-01-15T15:00:00Z'
  },
  {
    id: 'di-16',
    vendorId: 'dv-4',
    name: '세련된 캐주얼 드레스',
    nameI18n: {
      ko: '세련된 캐주얼 드레스',
      en: 'Sophisticated Casual Dress',
      ja: '洗練されたカジュアルドレス',
      zh: '精致休闲礼服'
    },
    category: 'casual',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 95000,
    images: [
      { url: 'https://images.unsplash.com/photo-1612621776059-1df55cda8703?w=600&q=80', sizeLabel: 'main', caption: 'Chic casual yet sophisticated dress' },
      { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80', sizeLabel: 'full', caption: 'Full length' },
      { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', sizeLabel: 'scene', caption: 'Parisian street styling' },
    ],
    desc: '캐주얼하면서도 품격있는 파리식 세련된 드레스입니다.',
    descI18n: {
      ko: '캐주얼하면서도 품격있는 파리식 세련된 드레스입니다.',
      en: 'Casual yet sophisticated Parisian-inspired refined dress.',
      ja: 'カジュアルながらも品格のあるパリ式洗練ドレスです。',
      zh: '休闲而不失品味的巴黎风精致礼服。'
    },
    color: 'grey',
    sortOrder: 16,
    isAvailable: false,
    createdAt: '2024-01-15T15:30:00Z',
    updatedAt: '2024-01-15T15:30:00Z'
  },

  // dv-5: Jeonju traditional hanbok (4 items)
  {
    id: 'di-17',
    vendorId: 'dv-5',
    name: '혼례복 세트',
    nameI18n: {
      ko: '혼례복 세트',
      en: 'Traditional Wedding Hanbok Set',
      ja: '婚礼衣装セット',
      zh: '传统婚礼韩服套装'
    },
    category: 'hanbok',
    sizes: ['S', 'M', 'L'],
    price: 150000,
    images: [
      { url: 'https://images.unsplash.com/photo-1599599810694-e5efd57d1876?w=600&q=80', sizeLabel: 'main', caption: 'Ornate traditional wedding hanbok' },
      { url: 'https://images.unsplash.com/photo-1609525881570-2a2fa32e7b7e?w=600&q=80', sizeLabel: 'full', caption: 'Full ceremonial view' },
      { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', sizeLabel: 'embroidery', caption: 'Embroidery detail' },
      { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', sizeLabel: 'set', caption: 'Complete set view' },
    ],
    desc: '전주의 정통성을 담은 화려한 혼례복 세트입니다.',
    descI18n: {
      ko: '전주의 정통성을 담은 화려한 혼례복 세트입니다.',
      en: 'Ornate traditional wedding hanbok set from Jeonju.',
      ja: '全州の伝統性を表現した豪華な婚礼衣装セットです。',
      zh: '承载全州传统的华丽婚礼韩服套装。'
    },
    color: 'red',
    sortOrder: 17,
    isAvailable: true,
    createdAt: '2024-01-15T16:00:00Z',
    updatedAt: '2024-01-15T16:00:00Z'
  },
  {
    id: 'di-18',
    vendorId: 'dv-5',
    name: '당의 전통 한복',
    nameI18n: {
      ko: '당의 전통 한복',
      en: 'Dangui Traditional Hanbok',
      ja: 'タンイ伝統ハンボク',
      zh: '党衣传统韩服'
    },
    category: 'hanbok',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 120000,
    images: [
      { url: 'https://images.unsplash.com/photo-1609525881570-2a2fa32e7b7e?w=600&q=80', sizeLabel: 'main', caption: 'Classic dangui traditional hanbok' },
      { url: 'https://images.unsplash.com/photo-1599599810694-e5efd57d1876?w=600&q=80', sizeLabel: 'front', caption: 'Front detail' },
      { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', sizeLabel: 'pattern', caption: 'Pattern close-up' },
    ],
    desc: '깊이 있는 전주 당의 한복으로 우아함을 표현합니다.',
    descI18n: {
      ko: '깊이 있는 전주 당의 한복으로 우아함을 표현합니다.',
      en: 'Elegant Jeonju dangui hanbok expressing timeless grace.',
      ja: '深みのある全州の党衣ハンボクで優雅さを表現します。',
      zh: '蕴含深度的全州党衣韩服表现优雅气质。'
    },
    color: 'purple',
    sortOrder: 18,
    isAvailable: true,
    createdAt: '2024-01-15T16:30:00Z',
    updatedAt: '2024-01-15T16:30:00Z'
  },
  {
    id: 'di-19',
    vendorId: 'dv-5',
    name: '철릭 정장 한복',
    nameI18n: {
      ko: '철릭 정장 한복',
      en: 'Cheolik Formal Hanbok',
      ja: 'チョルリク正装ハンボク',
      zh: '彻里克正装韩服'
    },
    category: 'hanbok',
    sizes: ['M', 'L', 'XL', 'XXL'],
    price: 135000,
    images: [
      { url: 'https://images.unsplash.com/photo-1591447159903-d0bd0f68c8d3?w=600&q=80', sizeLabel: 'main', caption: 'Formal cheolik hanbok with intricate details' },
      { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', sizeLabel: 'back', caption: 'Rear view' },
      { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80', sizeLabel: 'detail', caption: 'Belt and knot detail' },
    ],
    desc: '남성의 격식있는 행사에 어울리는 철릭 정장 한복입니다.',
    descI18n: {
      ko: '남성의 격식있는 행사에 어울리는 철릭 정장 한복입니다.',
      en: 'Formal cheolik hanbok perfect for dignified male occasions.',
      ja: '男性の格式ある行事に相応しいチョルリク正装ハンボクです。',
      zh: '适合男性正式场合的彻里克正装韩服。'
    },
    color: 'blue',
    sortOrder: 19,
    isAvailable: true,
    createdAt: '2024-01-15T17:00:00Z',
    updatedAt: '2024-01-15T17:00:00Z'
  },
  {
    id: 'di-20',
    vendorId: 'dv-5',
    name: '노리개 비녀 악세사리 세트',
    nameI18n: {
      ko: '노리개 비녀 악세사리 세트',
      en: 'Norigae & Binyeo Accessory Set',
      ja: 'ノリゲ・ビニョ アクセサリーセット',
      zh: '诺里盖和비녀 饰品套装'
    },
    category: 'accessory',
    sizes: ['Free'],
    price: 38000,
    images: [
      { url: 'https://images.unsplash.com/photo-1599599810985-06eb542cafcd?w=600&q=80', sizeLabel: 'main', caption: 'Traditional hanging ornaments and hair pin' },
      { url: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80', sizeLabel: 'set', caption: 'Full accessory set' },
      { url: 'https://images.unsplash.com/photo-1609525881570-2a2fa32e7b7e?w=600&q=80', sizeLabel: 'worn', caption: 'Worn with hanbok' },
    ],
    desc: '한복을 완성시키는 전통 노리개와 비녀 악세사리 세트입니다.',
    descI18n: {
      ko: '한복을 완성시키는 전통 노리개와 비녀 악세사리 세트입니다.',
      en: 'Traditional norigae and binyeo set that completes the hanbok.',
      ja: 'ハンボクを完成させる伝統的なノリゲとビニョのアクセサリーセットです。',
      zh: '完成韩服的传统诺里盖和비녀 饰品套装。'
    },
    color: 'gold',
    sortOrder: 20,
    isAvailable: true,
    createdAt: '2024-01-15T17:30:00Z',
    updatedAt: '2024-01-15T17:30:00Z'
  },

  // dv-6: Osaka kimono & qipao (4 items)
  {
    id: 'di-21',
    vendorId: 'dv-6',
    name: '후리소데 기모노',
    nameI18n: {
      ko: '후리소데 기모노',
      en: 'Furisode Kimono',
      ja: '振袖着物',
      zh: '振袖和服'
    },
    category: 'traditional_jp',
    sizes: ['Free'],
    price: 115000,
    images: [
      { url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80', sizeLabel: 'main', caption: 'Ornate furisode with long sleeves' },
      { url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', sizeLabel: 'obi', caption: 'Obi tie detail' },
      { url: 'https://images.unsplash.com/photo-1545048702-79362596cdc9?w=600&q=80', sizeLabel: 'scene', caption: 'Temple photoshoot' },
      { url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600&q=80', sizeLabel: 'sleeve', caption: 'Sleeve pattern' },
    ],
    desc: '오사카 전통 기모노로 화려함과 우아함을 표현합니다.',
    descI18n: {
      ko: '오사카 전통 기모노로 화려함과 우아함을 표현합니다.',
      en: 'Osaka traditional furisode expressing vibrancy and grace.',
      ja: '大阪伝統の振袖で華やかさと優雅さを表現します。',
      zh: '大阪传统振袖表现华丽与优雅。'
    },
    color: 'red',
    sortOrder: 21,
    isAvailable: true,
    createdAt: '2024-01-15T18:00:00Z',
    updatedAt: '2024-01-15T18:00:00Z'
  },
  {
    id: 'di-22',
    vendorId: 'dv-6',
    name: '유카타 캐주얼 기모노',
    nameI18n: {
      ko: '유카타 캐주얼 기모노',
      en: 'Yukata Casual Kimono',
      ja: '浴衣カジュアル着物',
      zh: '浴衣休闲和服'
    },
    category: 'traditional_jp',
    sizes: ['Free', 'S', 'M', 'L'],
    price: 65000,
    images: [
      { url: 'https://images.unsplash.com/photo-1614008375890-cb53b6c5f8d5?w=600&q=80', sizeLabel: 'main', caption: 'Light casual yukata for summer' },
      { url: 'https://images.unsplash.com/photo-1545048702-79362596cdc9?w=600&q=80', sizeLabel: 'full', caption: 'Full summer look' },
      { url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', sizeLabel: 'belt', caption: 'Obi belt detail' },
    ],
    desc: '여름철에 입기 편한 가벼운 유카타 기모노입니다.',
    descI18n: {
      ko: '여름철에 입기 편한 가벼운 유카타 기모노입니다.',
      en: 'Light and comfortable yukata perfect for summer wear.',
      ja: '夏季に快適に着られる軽い浴衣です。',
      zh: '夏季穿着舒适的轻盈浴衣。'
    },
    color: 'indigo',
    sortOrder: 22,
    isAvailable: true,
    createdAt: '2024-01-15T18:30:00Z',
    updatedAt: '2024-01-15T18:30:00Z'
  },
  {
    id: 'di-23',
    vendorId: 'dv-6',
    name: '클래식 치파오',
    nameI18n: {
      ko: '클래식 치파오',
      en: 'Classic Chipao',
      ja: 'クラシックチーパオ',
      zh: '经典旗袍'
    },
    category: 'qipao',
    sizes: ['XS', 'S', 'M', 'L'],
    price: 140000,
    images: [
      { url: 'https://images.unsplash.com/photo-1595777707802-9b2be8c84e4e?w=600&q=80', sizeLabel: 'main', caption: 'Elegant classic qipao dress' },
      { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80', sizeLabel: 'back', caption: 'Qipao back slit' },
      { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', sizeLabel: 'collar', caption: 'Mandarin collar detail' },
    ],
    desc: '전통적인 중국 치파오로 우아한 몸라인을 표현합니다.',
    descI18n: {
      ko: '전통적인 중국 치파오로 우아한 몸라인을 표현합니다.',
      en: 'Traditional Chinese qipao expressing elegant body lines.',
      ja: '伝統的な中国のチーパオで優雅なボディラインを表現します。',
      zh: '传统中国旗袍展现优雅的身体线条。'
    },
    color: 'black',
    sortOrder: 23,
    isAvailable: true,
    createdAt: '2024-01-15T19:00:00Z',
    updatedAt: '2024-01-15T19:00:00Z'
  },
  {
    id: 'di-24',
    vendorId: 'dv-6',
    name: '모던 치파오',
    nameI18n: {
      ko: '모던 치파오',
      en: 'Modern Chipao',
      ja: 'モダンチーパオ',
      zh: '现代旗袍'
    },
    category: 'qipao',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    price: 125000,
    images: [
      { url: 'https://images.unsplash.com/photo-1599599810694-e5efd57d1876?w=600&q=80', sizeLabel: 'main', caption: 'Contemporary qipao with modern twist' },
      { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80', sizeLabel: 'side', caption: 'Modern side profile' },
      { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', sizeLabel: 'detail', caption: 'Fabric pattern detail' },
      { url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80', sizeLabel: 'full', caption: 'Full standing view' },
    ],
    desc: '현대적인 감각으로 재해석한 모던 치파오입니다.',
    descI18n: {
      ko: '현대적인 감각으로 재해석한 모던 치파오입니다.',
      en: 'Modern qipao reinterpreted with contemporary sensibility.',
      ja: '現代的なセンスで再解釈されたモダンなチーパオです。',
      zh: '以现代感重新演绎的现代旗袍。'
    },
    color: 'emerald',
    sortOrder: 24,
    isAvailable: true,
    createdAt: '2024-01-15T19:30:00Z',
    updatedAt: '2024-01-15T19:30:00Z'
  }
];

export const getDressesByVendor = (vendorId) =>
  DRESS_ITEMS.filter(d => d.vendorId === vendorId && d.isAvailable);

export const getDressesByCategory = (category) =>
  DRESS_ITEMS.filter(d => d.category === category && d.isAvailable);

export const getDressById = (id) =>
  DRESS_ITEMS.find(d => d.id === id);
