export const VENUE_VENDORS = [
  {
    id: 'vv-1',
    userId: 'user-seoul-venue-001',
    name: '경복궁 한옥 스튜디오',
    nameI18n: {
      ko: '경복궁 한옥 스튜디오',
      en: 'Gyeongbokgung Hanok Studio',
      ja: '景福宮韓屋スタジオ',
      zh: '景福宫韩屋工作室'
    },
    bio: '서울 북촌에 위치한 전통 한옥을 현대적으로 리모델링한 프리미엄 촬영 스튜디오입니다. 역사적인 한옥의 아름다운 건축미와 전통 공간의 정취를 완벽하게 담아낼 수 있는 최고급 촬영 환경을 제공합니다.',
    bioI18n: {
      ko: '서울 북촌에 위치한 전통 한옥을 현대적으로 리모델링한 프리미엄 촬영 스튜디오입니다. 역사적인 한옥의 아름다운 건축미와 전통 공간의 정취를 완벽하게 담아낼 수 있는 최고급 촬영 환경을 제공합니다.',
      en: 'A premium photography studio located in Seoul\'s Bukchon district featuring a beautifully restored traditional hanok. We provide an upscale shooting environment that perfectly captures the architectural elegance and authentic atmosphere of historic Korean heritage.',
      ja: 'ソウル北村に位置する、伝統的な韓屋を現代的にリモデルしたプレミアム撮影スタジオです。歴史的な韓屋の美しい建築美と伝統空間の趣を完璧に捉えることができる最高級の撮影環境を提供します。',
      zh: '位于首尔北村的高级摄影工作室，拥有精心修复的传统韩屋。我们提供一流的拍摄环境，完美呈现历史悠久的韓屋建筑美学和传统空间的魅力。'
    },
    locationId: 'seoul-bukchon',
    locationNames: {
      ko: '서울 북촌',
      en: 'Seoul Bukchon',
      ja: 'ソウル北村',
      zh: '首尔北村'
    },
    categories: ['traditional_space'],
    tags: ['hanok', 'traditional', 'korean_architecture', 'indoor', 'premium'],
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    contactInfo: {
      phone: '+82-2-XXXX-XXXX',
      email: 'booking@gyeongbokgung-studio.com',
      instagram: '@gyeongbokgung_studio',
      website: 'https://gyeongbokgung-studio.com'
    },
    isActive: true,
    createdAt: '2023-05-10T09:00:00Z',
    updatedAt: '2024-03-15T14:20:00Z'
  },
  {
    id: 'vv-2',
    userId: 'user-jeju-venue-001',
    name: '제주 오션뷰 가든',
    nameI18n: {
      ko: '제주 오션뷰 가든',
      en: 'Jeju Ocean View Garden',
      ja: '済州オーシャンビューガーデン',
      zh: '济州海景花园'
    },
    bio: '제주도의 해안 절벽 위에 자리잡은 프라이빗 가든 촬영장입니다. 에메랄드빛 제주의 바다와 하늘, 그리고 정성스럽게 가꾼 정원이 어우러져 영화 같은 웨딩 사진을 만들어냅니다. 자연 채광과 바다의 푸른색감은 어떤 스튜디오도 흉내낼 수 없는 독특한 분위기를 제공합니다.',
    bioI18n: {
      ko: '제주도의 해안 절벽 위에 자리잡은 프라이빗 가든 촬영장입니다. 에메랄드빛 제주의 바다와 하늘, 그리고 정성스럽게 가꾼 정원이 어우러져 영화 같은 웨딩 사진을 만들어냅니다. 자연 채광과 바다의 푸른색감은 어떤 스튜디오도 흉내낼 수 없는 독특한 분위기를 제공합니다.',
      en: 'A private garden wedding venue perched on Jeju\'s coastal cliffs. The emerald waters and pristine sky of Jeju combine with our meticulously landscaped gardens to create cinematic wedding photography. Natural lighting and the ocean\'s serene blue hues create an atmosphere no studio can replicate.',
      ja: '済州島の海岸崖の上に位置するプライベートガーデン撮影場です。エメラルド色の済州の海と空、そして細心に手入れされた庭園が相まって、映画のようなウェディングフォトを生み出します。自然光と海の青色は、どのスタジオも模倣できないユニークな雰囲気を提供します。',
      zh: '位于济州岛海岸悬崖上的私人花园婚礼场地。翠绿色的济州海水、清晰的天空和精心打理的花园完美结合，打造出电影般的婚礼摄影。自然光线和海洋的蔚蓝色彩营造出任何工作室都无法复制的独特氛围。'
    },
    locationId: 'jeju-coastal',
    locationNames: {
      ko: '제주 해안',
      en: 'Jeju Coastal Area',
      ja: '済州海岸',
      zh: '济州海岸'
    },
    categories: ['outdoor'],
    tags: ['ocean', 'garden', 'coastal', 'natural', 'beach', 'scenic'],
    img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    contactInfo: {
      phone: '+82-64-XXXX-XXXX',
      email: 'info@jejuoceanview.com',
      instagram: '@jeju_ocean_view_garden',
      website: 'https://jejuoceanview.com'
    },
    isActive: true,
    createdAt: '2023-02-20T10:30:00Z',
    updatedAt: '2024-02-28T13:15:00Z'
  },
  {
    id: 'vv-3',
    userId: 'user-kyoto-venue-001',
    name: '교토 전통 정원',
    nameI18n: {
      ko: '교토 전통 정원',
      en: 'Kyoto Traditional Garden',
      ja: '京都伝統庭園',
      zh: '京都传统花园'
    },
    bio: '400년 이상의 역사를 지닌 교토의 전통 정원에서의 촬영을 제공합니다. 일본식 정원의 정취를 오롯이 느낄 수 있는 이 공간에서는 기모노, 한복 등의 전통 의상이 최고로 어울립니다. 사철 변하는 정원의 아름다움을 담은 타이밍에 맞춰 예약하시면 더욱 특별한 사진을 남기실 수 있습니다.',
    bioI18n: {
      ko: '400년 이상의 역사를 지닌 교토의 전통 정원에서의 촬영을 제공합니다. 일본식 정원의 정취를 오롯이 느낄 수 있는 이 공간에서는 기모노, 한복 등의 전통 의상이 최고로 어울립니다. 사철 변하는 정원의 아름다움을 담은 타이밍에 맞춰 예약하시면 더욱 특별한 사진을 남기실 수 있습니다.',
      en: 'Photography in Kyoto\'s traditional garden with over 400 years of history. This authentic Japanese garden space is the perfect setting for traditional attire such as kimono and hanbok. Book according to the season to capture the garden\'s ever-changing beauty and create truly unforgettable photographs.',
      ja: '400年以上の歴史を持つ京都の伝統庭園での撮影を提供します。日本庭園の趣を十分に感じることができるこの空間では、着物や韓服などの伝統衣装が最高に映えます。四季折々の庭園の美しさを捉えたタイミングに合わせて予約すると、さらに特別な写真を残すことができます。',
      zh: '在拥有400多年历史的京都传统花园中进行摄影。这个真正的日本庭园空间是穿着和服和韩服等传统服装的完美场地。根据季节安排拍摄，捕捉花园不断变化的美景，留下真正难忘的照片。'
    },
    locationId: 'kyoto',
    locationNames: {
      ko: '교토',
      en: 'Kyoto',
      ja: '京都',
      zh: '京都'
    },
    categories: ['traditional_space', 'outdoor'],
    tags: ['japanese_garden', 'traditional', 'outdoor', 'natural', 'historical', 'seasonal'],
    img: 'https://images.unsplash.com/photo-1522383881649-7b4c4a9c32e1?w=800&q=80',
    contactInfo: {
      phone: '+81-75-XXXX-XXXX',
      email: 'booking@kyoto-garden.jp',
      instagram: '@kyoto_traditional_garden',
      website: 'https://kyoto-garden.jp'
    },
    isActive: true,
    createdAt: '2023-04-05T08:45:00Z',
    updatedAt: '2024-03-10T11:30:00Z'
  },
  {
    id: 'vv-4',
    userId: 'user-seoul-venue-002',
    name: '강남 루프탑 스튜디오',
    nameI18n: {
      ko: '강남 루프탑 스튜디오',
      en: 'Gangnam Rooftop Studio',
      ja: '江南ルーフトップスタジオ',
      zh: '江南屋顶工作室'
    },
    bio: '강남 한복판 50층 빌딩의 루프탑에 위치한 초현대식 촬영 스튜디오입니다. 서울의 스카이라인을 배경으로 하는 도시적이고 세련된 촬영이 가능합니다. 최신 조명 시스템과 무반사 소재를 활용한 전문가급 촬영 환경으로 어떤 컨셉도 완벽하게 구현할 수 있습니다.',
    bioI18n: {
      ko: '강남 한복판 50층 빌딩의 루프탑에 위치한 초현대식 촬영 스튜디오입니다. 서울의 스카이라인을 배경으로 하는 도시적이고 세련된 촬영이 가능합니다. 최신 조명 시스템과 무반사 소재를 활용한 전문가급 촬영 환경으로 어떤 컨셉도 완벽하게 구현할 수 있습니다.',
      en: 'Ultra-modern photography studio located on the rooftop of a 50-story building in central Gangnam. Featuring Seoul\'s impressive skyline as backdrop, we enable sophisticated and urban photography. Our state-of-the-art lighting systems and professional-grade environment ensure any concept is executed flawlessly.',
      ja: '江南中心部の50階建ビルのルーフトップに位置する超現代的な撮影スタジオです。ソウルのスカイラインをバックグラウンドとした都会的で洗練された撮影が可能です。最新照明システムと無反射素材を活用した専門家レベルの撮影環境で、あらゆるコンセプトを完璧に実現できます。',
      zh: '位于江南中心地带50层建筑屋顶的超现代摄影工作室。以首尔天际线为背景，可进行城市化和精致的拍摄。最先进的照明系统和专业级的环境确保任何概念都能完美执行。'
    },
    locationId: 'seoul-gangnam',
    locationNames: {
      ko: '서울 강남',
      en: 'Seoul Gangnam',
      ja: 'ソウル江南',
      zh: '首尔江南'
    },
    categories: ['studio', 'urban'],
    tags: ['rooftop', 'modern', 'urban', 'skyline', 'contemporary', 'professional'],
    img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    contactInfo: {
      phone: '+82-2-XXXX-XXXX',
      email: 'bookings@gangnam-rooftop.com',
      instagram: '@gangnam_rooftop_studio',
      website: 'https://gangnam-rooftop.com'
    },
    isActive: true,
    createdAt: '2023-08-15T12:00:00Z',
    updatedAt: '2024-03-22T16:45:00Z'
  },
  {
    id: 'vv-5',
    userId: 'user-paris-venue-001',
    name: '파리 클래식 스튜디오',
    nameI18n: {
      ko: '파리 클래식 스튜디오',
      en: 'Paris Classic Studio',
      ja: 'パリクラシックスタジオ',
      zh: '巴黎古典工作室'
    },
    bio: '파리의 역사적인 마레 지구에 위치한 유럽식 고전 스튜디오입니다. 18세기 건축 양식의 아름다운 벽면, 대형 아치 창, 그리고 앤틱 스타일의 인테리어가 조화를 이루어 유럽 클래식 웨딩 사진에 최적의 배경을 제공합니다. 파리의 우아함과 낭만을 오롯이 느낄 수 있는 공간입니다.',
    bioI18n: {
      ko: '파리의 역사적인 마레 지구에 위치한 유럽식 고전 스튜디오입니다. 18세기 건축 양식의 아름다운 벽면, 대형 아치 창, 그리고 앤틱 스타일의 인테리어가 조화를 이루어 유럽 클래식 웨딩 사진에 최적의 배경을 제공합니다. 파리의 우아함과 낭만을 오롯이 느낄 수 있는 공간입니다.',
      en: 'European classical studio located in Paris\'s historic Marais district. Featuring beautiful 18th-century architectural elements, grand arched windows, and antique-style interiors that harmonize perfectly for classic European wedding photography. Experience the elegance and romance of Paris in this refined setting.',
      ja: 'パリの歴史的なマレ地区に位置するヨーロッパ古典スタジオです。18世紀建築様式の美しい壁面、大きなアーチ型の窓、そしてアンティークスタイルのインテリアが調和し、ヨーロッパ古典ウェディング写真に最適の背景を提供します。パリの優雅さとロマンスを十分に感じることができる空間です。',
      zh: '位于巴黎历史悠久的玛黑区的欧洲古典工作室。采用18世纪建筑元素、宏伟的拱形窗户和古董风格的室内设计，为欧洲古典婚礼摄影提供完美背景。体验巴黎的优雅和浪漫。'
    },
    locationId: 'paris-marais',
    locationNames: {
      ko: '파리 마레',
      en: 'Paris Marais',
      ja: 'パリマレ',
      zh: '巴黎玛黑'
    },
    categories: ['studio'],
    tags: ['european', 'classic', 'historic', 'elegant', 'antique', 'romantic'],
    img: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
    contactInfo: {
      phone: '+33-1-XXXX-XXXX',
      email: 'reservations@paris-classic-studio.fr',
      instagram: '@paris_classic_studio',
      website: 'https://paris-classic-studio.fr'
    },
    isActive: true,
    createdAt: '2023-06-20T13:30:00Z',
    updatedAt: '2024-02-05T10:15:00Z'
  },
  {
    id: 'vv-6',
    userId: 'user-osaka-venue-001',
    name: '오사카 신사 정원',
    nameI18n: {
      ko: '오사카 신사 정원',
      en: 'Osaka Shrine Garden',
      ja: '大阪神社庭園',
      zh: '大阪神社花园'
    },
    bio: '오사카의 오래된 신사 경내에 위치한 프리미엄 촬영 공간입니다. 일본의 신성한 분위기와 자연이 어우러진 정원에서 기모노, 타이쇼 로망 스타일의 촬영에 최적입니다. 신사 특유의 수수한 아름다움과 자연 채광이 한폭의 미술 작품 같은 사진을 완성시킵니다.',
    bioI18n: {
      ko: '오사카의 오래된 신사 경내에 위치한 프리미엄 촬영 공간입니다. 일본의 신성한 분위기와 자연이 어우러진 정원에서 기모노, 타이쇼 로망 스타일의 촬영에 최적입니다. 신사 특유의 수수한 아름다움과 자연 채광이 한폭의 미술 작품 같은 사진을 완성시킵니다.',
      en: 'Premium photography space located within Osaka\'s historic shrine grounds. The garden combines Japan\'s sacred atmosphere with nature, making it ideal for kimono and Taisho romance style photography. The shrine\'s subtle beauty and natural lighting create photographs that resemble fine art.',
      ja: '大阪の古い神社境内に位置するプレミアム撮影スペースです。日本の神聖な雰囲気と自然が調和した庭園で、着物や大正ロマンスタイルの撮影に最適です。神社特有の控えめな美しさと自然光が、絵画のような写真を完成させます。',
      zh: '位于大阪古老神社境内的高级摄影空间。花园融合了日本神圣的氛围与自然，非常适合和服和大正浪漫风格的摄影。神社独特的精致美感和自然光线打造出艺术般的照片。'
    },
    locationId: 'osaka',
    locationNames: {
      ko: '오사카',
      en: 'Osaka',
      ja: '大阪',
      zh: '大阪'
    },
    categories: ['traditional_space', 'outdoor'],
    tags: ['shrine', 'traditional', 'japanese', 'sacred', 'garden', 'historical'],
    img: 'https://images.unsplash.com/photo-1504681869696-d977e3a3c5d8?w=800&q=80',
    contactInfo: {
      phone: '+81-6-XXXX-XXXX',
      email: 'booking@osaka-shrine-garden.jp',
      instagram: '@osaka_shrine_garden',
      website: 'https://osaka-shrine-garden.jp'
    },
    isActive: true,
    createdAt: '2023-07-10T09:15:00Z',
    updatedAt: '2024-03-18T14:50:00Z'
  },
  {
    id: 'vv-7',
    userId: 'user-jeonju-venue-001',
    name: '전주 한옥마을 포토존',
    nameI18n: {
      ko: '전주 한옥마을 포토존',
      en: 'Jeonju Hanok Village Photo Zone',
      ja: '全州韓屋村フォトゾーン',
      zh: '全州韩屋村摄影区'
    },
    bio: '전주 한옥마을의 핵심 지역에 위치한 대규모 프리미엄 촬영 공간입니다. 400년 역사의 한옥마을이 제공하는 자연 배경에 더해, 스튜디오급 조명 시설과 전문 스타일링 서비스까지 갖춘 종합 촬영 솔루션을 제공합니다. 한복, 혼례복 등 전통 의상 촬영에 최고의 선택지입니다.',
    bioI18n: {
      ko: '전주 한옥마을의 핵심 지역에 위치한 대규모 프리미엄 촬영 공간입니다. 400년 역사의 한옥마을이 제공하는 자연 배경에 더해, 스튜디오급 조명 시설과 전문 스타일링 서비스까지 갖춘 종합 촬영 솔루션을 제공합니다. 한복, 혼례복 등 전통 의상 촬영에 최고의 선택지입니다.',
      en: 'Large-scale premium photography space in the heart of Jeonju Hanok Village. Beyond the natural backdrop provided by the village\'s 400-year history, we offer comprehensive solutions including studio-grade lighting systems and professional styling services. The premier choice for hanbok and traditional wedding attire photography.',
      ja: '全州韓屋村の中心地に位置する大規模プレミアム撮影スペースです。400年の歴史を持つ韓屋村が提供する自然な背景に加えて、スタジオレベルの照明設備と専門的なスタイリングサービスを備えた包括的な撮影ソリューションを提供します。韓服、婚礼衣装など伝統衣装撮影の最高の選択肢です。',
      zh: '位于全州韩屋村中心的大型高级摄影空间。除了400年历史的韩屋村提供的自然背景外，我们还提供包括工作室级照明系统和专业造型服务的综合摄影解决方案。是韩服和传统婚礼服装摄影的最佳选择。'
    },
    locationId: 'jeonju',
    locationNames: {
      ko: '전주',
      en: 'Jeonju',
      ja: '全州',
      zh: '全州'
    },
    categories: ['traditional_space'],
    tags: ['hanok', 'traditional', 'korean_heritage', 'village', 'historical', 'wedding'],
    img: 'https://images.unsplash.com/photo-1578926314433-ed6d87e1f289?w=800&q=80',
    contactInfo: {
      phone: '+82-63-XXXX-XXXX',
      email: 'info@jeonju-photozone.com',
      instagram: '@jeonju_hanok_photozone',
      website: 'https://jeonju-photozone.com'
    },
    isActive: true,
    createdAt: '2023-03-25T11:20:00Z',
    updatedAt: '2024-02-14T15:40:00Z'
  }
];

export const VENUE_ITEMS = [
  // VV-1: 경복궁 한옥 스튜디오
  {
    id: 'vi-1',
    vendorId: 'vv-1',
    name: '메인 홀 - 전통 촉석 배경',
    nameI18n: {
      ko: '메인 홀 - 전통 촉석 배경',
      en: 'Main Hall - Traditional Stone Wall Backdrop',
      ja: 'メインホール - 伝統石壁背景',
      zh: '主厅 - 传统石墙背景'
    },
    category: 'studio_space',
    capacity: 15,
    price: 450000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80'],
    desc: '한옥의 전통적인 돌담을 배경으로 한 주요 촬영 공간으로, 자연광과 스튜디오 조명을 모두 활용할 수 있습니다.',
    descI18n: {
      ko: '한옥의 전통적인 돌담을 배경으로 한 주요 촬영 공간으로, 자연광과 스튜디오 조명을 모두 활용할 수 있습니다.',
      en: 'Primary shooting space with traditional stone wall backdrop, allowing use of both natural and studio lighting.',
      ja: '韓屋の伝統的な石壁を背景にした主な撮影スペースで、自然光とスタジオ照明の両方を活用できます。',
      zh: '以韩屋传统石墙为背景的主要拍摄空间，可同时利用自然光和摄影棚照明。'
    },
    amenities: ['natural_light', 'studio_lighting', 'makeup_room', 'dressing_room', 'reflection_board'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-2',
    vendorId: 'vv-1',
    name: '정원 에어리어 - 야외 촬영',
    nameI18n: {
      ko: '정원 에어리어 - 야외 촬영',
      en: 'Garden Area - Outdoor Photography',
      ja: '庭園エリア - 屋外撮影',
      zh: '花园区域 - 室外摄影'
    },
    category: 'outdoor_space',
    capacity: 20,
    price: 350000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80'],
    desc: '한옥 정원의 계절감 넘치는 자연 배경을 활용한 야외 촬영 공간입니다. 사계절 다양한 매력을 담을 수 있습니다.',
    descI18n: {
      ko: '한옥 정원의 계절감 넘치는 자연 배경을 활용한 야외 촬영 공간입니다. 사계절 다양한 매력을 담을 수 있습니다.',
      en: 'Outdoor photography space utilizing seasonal garden backdrop. Capture diverse charm throughout the year.',
      ja: '韓屋庭園の季節感あふれる自然背景を活用した屋外撮影スペースです。四季折々の様々な魅力を捉えることができます。',
      zh: '利用韩屋花园四季分明的自然背景的室外摄影空间。可拍摄全年不同的魅力。'
    },
    amenities: ['outdoor_space', 'seasonal_decor', 'parasol', 'backup_location'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-3',
    vendorId: 'vv-1',
    name: '온돌 방 - 전통 촬영',
    nameI18n: {
      ko: '온돌 방 - 전통 촬영',
      en: 'Ondol Room - Traditional Photography',
      ja: 'オンドル部屋 - 伝統撮影',
      zh: '温炕房 - 传统摄影'
    },
    category: 'studio_space',
    capacity: 10,
    price: 400000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1522383881649-7b4c4a9c32e1?w=600&q=80'],
    desc: '전통 온돌 방으로 한복 촬영에 가장 적합한 공간입니다. 정통성 있는 한국 전통 분위기를 완벽히 표현합니다.',
    descI18n: {
      ko: '전통 온돌 방으로 한복 촬영에 가장 적합한 공간입니다. 정통성 있는 한국 전통 분위기를 완벽히 표현합니다.',
      en: 'Traditional ondol room ideal for hanbok photography. Perfectly captures authentic Korean heritage atmosphere.',
      ja: '伝統的なオンドル部屋で、韓服撮影に最も適した空間です。正統な韓国伝統の雰囲気を完璧に表現します。',
      zh: '传统温炕房，最适合韩服摄影。完美诠释正统的韩国传统氛围。'
    },
    amenities: ['traditional_decor', 'floor_heating', 'low_seating', 'natural_light'],
    sortOrder: 3,
    isAvailable: true
  },

  // VV-2: 제주 오션뷰 가든
  {
    id: 'vi-4',
    vendorId: 'vv-2',
    name: '클리프탑 메인 정원',
    nameI18n: {
      ko: '클리프탑 메인 정원',
      en: 'Clifftop Main Garden',
      ja: 'クリフトップメインガーデン',
      zh: '悬崖顶主花园'
    },
    category: 'outdoor_space',
    capacity: 30,
    price: 800000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80'],
    desc: '절벽 위 메인 정원으로 제주의 탁월한 해양 경관을 배경으로 한 프리미엄 촬영이 가능합니다.',
    descI18n: {
      ko: '절벽 위 메인 정원으로 제주의 탁월한 해양 경관을 배경으로 한 프리미엄 촬영이 가능합니다.',
      en: 'Main clifftop garden offering premium photography with Jeju\'s outstanding marine landscape as backdrop.',
      ja: '崖の上のメインガーデンで、済州の優れた海洋景観を背景にしたプレミアム撮影が可能です。',
      zh: '悬崖顶主花园，可以以济州杰出的海洋景观为背景进行高级摄影。'
    },
    amenities: ['ocean_view', 'natural_light', 'wind_protection', 'emergency_backup_location'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-5',
    vendorId: 'vv-2',
    name: '비치 가든 - 모래사장 촬영장',
    nameI18n: {
      ko: '비치 가든 - 모래사장 촬영장',
      en: 'Beach Garden - Sandy Beach Area',
      ja: 'ビーチガーデン - 砂浜撮影場',
      zh: '沙滩花园 - 沙滩摄影区'
    },
    category: 'outdoor_space',
    capacity: 25,
    price: 650000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80'],
    desc: '해변의 모래사장에서 진행되는 로맨틱한 비치 웨딩 촬영. 썰물 시간에 예약하면 더 넓은 촬영 공간을 활용할 수 있습니다.',
    descI18n: {
      ko: '해변의 모래사장에서 진행되는 로맨틱한 비치 웨딩 촬영. 썰물 시간에 예약하면 더 넓은 촬영 공간을 활용할 수 있습니다.',
      en: 'Romantic beach wedding photography on sandy shores. Book during low tide for expanded shooting space.',
      ja: 'ビーチの砂浜で行われるロマンティックなビーチウェディング撮影。干潮時間に予約するとより広い撮影スペースが利用できます。',
      zh: '在沙滩上进行浪漫的海滩婚礼摄影。在潮汐时间预约可获得更大的拍摄空间。'
    },
    amenities: ['beach_access', 'water_protection', 'natural_tide_schedule', 'emergency_shelter'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-6',
    vendorId: 'vv-2',
    name: '플라워 가든 - 계절 꽃밭',
    nameI18n: {
      ko: '플라워 가든 - 계절 꽃밭',
      en: 'Flower Garden - Seasonal Bloom Area',
      ja: 'フラワーガーデン - 季節の花畑',
      zh: '花园 - 季节花卉区'
    },
    category: 'outdoor_space',
    capacity: 20,
    price: 700000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1490684969653-9a60b3f59ebc?w=600&q=80'],
    desc: '계절별 개화 시기에 맞춰 찾아가는 가장 프리미엄한 꽃밭 촬영. 봄 유채꽃, 여름 해바라기, 가을 코스모스, 겨울 팜파스로 사계절 모두 아름답습니다.',
    descI18n: {
      ko: '계절별 개화 시기에 맞춰 찾아가는 가장 프리미엄한 꽃밭 촬영. 봄 유채꽃, 여름 해바라기, 가을 코스모스, 겨울 팜파스로 사계절 모두 아름답습니다.',
      en: 'Premium flower field photography timed with seasonal blooms. Spring rapeseed, summer sunflowers, autumn cosmos, winter pampas - beautiful year-round.',
      ja: '季節の開花時期に合わせて訪ねる最高級の花畑撮影。春の菜の花、夏のひまわり、秋のコスモス、冬のパンパスで四季すべてが美しいです。',
      zh: '根据季节开花时间进行的最高端花卉田摄影。春菜花、夏向日葵、秋波斯菊、冬草刈草四季如画。'
    },
    amenities: ['seasonal_blooms', 'natural_light', 'extended_hours', 'guest_seating'],
    sortOrder: 3,
    isAvailable: true
  },

  // VV-3: 교토 전통 정원
  {
    id: 'vi-7',
    vendorId: 'vv-3',
    name: '메인 호수 정원',
    nameI18n: {
      ko: '메인 호수 정원',
      en: 'Main Pond Garden',
      ja: 'メイン池庭園',
      zh: '主池花园'
    },
    category: 'outdoor_space',
    capacity: 20,
    price: 60000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1522383881649-7b4c4a9c32e1?w=600&q=80'],
    desc: '교토식 정원의 핵심인 연못을 중심으로 한 촬영 공간. 물의 반사를 이용한 독특한 구성이 가능합니다.',
    descI18n: {
      ko: '교토식 정원의 핵심인 연못을 중심으로 한 촬영 공간. 물의 반사를 이용한 독특한 구성이 가능합니다.',
      en: 'Photography space centered on the pond, essential to Kyoto gardens. Unique compositions utilizing water reflections possible.',
      ja: '京都庭園の核となる池を中心とした撮影スペース。水の反射を利用したユニークな構成が可能です。',
      zh: '以京都花园核心的池塘为中心的摄影空间。可利用水面反射进行独特构图。'
    },
    amenities: ['pond_view', 'natural_light', 'stepping_stones', 'bridge_access'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-8',
    vendorId: 'vv-3',
    name: '돌 정원 - 선정적 미니멀 공간',
    nameI18n: {
      ko: '돌 정원 - 선정적 미니멀 공간',
      en: 'Stone Garden - Zen Minimalist Space',
      ja: '石庭 - 禅ミニマリストスペース',
      zh: '石头花园 - 禅意极简空间'
    },
    category: 'outdoor_space',
    capacity: 10,
    price: 50000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1504681869696-d977e3a3c5d8?w=600&q=80'],
    desc: '전통 일본 돌 정원으로 극도로 미니멀한 미학을 추구하는 촬영에 적합합니다. 침묵과 고요함이 전해집니다.',
    descI18n: {
      ko: '전통 일본 돌 정원으로 극도로 미니멀한 미학을 추구하는 촬영에 적합합니다. 침묵과 고요함이 전해집니다.',
      en: 'Traditional Japanese stone garden ideal for extremely minimalist aesthetics. Conveys silence and tranquility.',
      ja: '伝統的な日本の石庭で、非常にミニマルな美学を追求する撮影に適しています。静寂と静謐さが伝わります。',
      zh: '传统日本石头花园，适合追求极简美学的摄影。传达出寂静与安宁。'
    },
    amenities: ['zen_aesthetic', 'minimalist_design', 'natural_light', 'seating_area'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-9',
    vendorId: 'vv-3',
    name: '나무 터널 - 계절 변화',
    nameI18n: {
      ko: '나무 터널 - 계절 변화',
      en: 'Tree Tunnel - Seasonal Changes',
      ja: 'ツリートンネル - 季節の変化',
      zh: '树隧道 - 季节变化'
    },
    category: 'outdoor_space',
    capacity: 15,
    price: 55000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80'],
    desc: '계절에 따라 다양한 색감으로 변하는 나무 아래 터널. 봄 벚꽃, 여름 녹음, 가을 단풍, 겨울 눈으로 사계절 모두 특별한 사진을 남길 수 있습니다.',
    descI18n: {
      ko: '계절에 따라 다양한 색감으로 변하는 나무 아래 터널. 봄 벚꽃, 여름 녹음, 가을 단풍, 겨울 눈으로 사계절 모두 특별한 사진을 남길 수 있습니다.',
      en: 'Tree tunnel with colors changing by season. Spring cherry blossoms, summer green foliage, fall maple leaves, winter snow - special photos all year.',
      ja: '季節に応じてさまざまな色に変わる木のトンネル。春の桜、夏の新緑、秋の紅葉、冬の雪で四季すべてが特別な写真を残せます。',
      zh: '随季节变化的树木隧道。春樱花、夏绿叶、秋红叶、冬雪每个季节都能留下特别的照片。'
    },
    amenities: ['seasonal_foliage', 'natural_tunnel', 'shaded_area', 'romantic_atmosphere'],
    sortOrder: 3,
    isAvailable: true
  },

  // VV-4: 강남 루프탑 스튜디오
  {
    id: 'vi-10',
    vendorId: 'vv-4',
    name: '스카이라인 루프탑 - 메인 촬영 공간',
    nameI18n: {
      ko: '스카이라인 루프탑 - 메인 촬영 공간',
      en: 'Skyline Rooftop - Main Studio Space',
      ja: 'スカイラインルーフトップ - メインスタジオスペース',
      zh: '天际线屋顶 - 主摄影棚空间'
    },
    category: 'studio_space',
    capacity: 25,
    price: 550000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80'],
    desc: '50층 루프탑의 메인 촬영 공간으로 서울 전역을 배경으로 한 도시적이고 세련된 촬영이 가능합니다. 일몰 시간대 촬영은 특히 아름답습니다.',
    descI18n: {
      ko: '50층 루프탑의 메인 촬영 공간으로 서울 전역을 배경으로 한 도시적이고 세련된 촬영이 가능합니다. 일몰 시간대 촬영은 특히 아름답습니다.',
      en: 'Main rooftop studio on 50th floor with Seoul\'s skyline backdrop. Urban, sophisticated photography possible. Sunset photography particularly stunning.',
      ja: '50階ルーフトップのメインスタジオスペースで、ソウル全体を背景にした都会的で洗練された撮影が可能です。夕日の時間帯の撮影は特に美しいです。',
      zh: '50楼屋顶的主摄影棚空间，以首尔全景为背景，可进行城市化和精致的摄影。日落时段的摄影特别美丽。'
    },
    amenities: ['skyline_view', 'professional_lighting', 'wind_protection', 'heating_cooling', 'backup_power'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-11',
    vendorId: 'vv-4',
    name: '인피니티 엣지 - 무한 전망 공간',
    nameI18n: {
      ko: '인피니티 엣지 - 무한 전망 공간',
      en: 'Infinity Edge - Endless View Space',
      ja: 'インフィニティエッジ - 無限ビュースペース',
      zh: '无限边缘 - 无限视野空间'
    },
    category: 'outdoor_space',
    capacity: 15,
    price: 600000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80'],
    desc: '루프탑 가장자리의 특수 설계된 무한 전망 공간. 도시의 고층 경관과 하늘이 만나는 지점에서의 드라마틱한 사진이 가능합니다.',
    descI18n: {
      ko: '루프탑 가장자리의 특수 설계된 무한 전망 공간. 도시의 고층 경관과 하늘이 만나는 지점에서의 드라마틱한 사진이 가능합니다.',
      en: 'Specially designed infinite view space at rooftop edge. Dramatic photography possible where city skyline meets sky.',
      ja: 'ルーフトップエッジの特別設計された無限ビュースペース。都市高層景観と空が出会う地点でのドラマチックな写真が可能です。',
      zh: '屋顶边缘的特殊设计无限视野空间。城市高层景观与天空相接之处可进行戏剧性拍摄。'
    },
    amenities: ['infinity_edge', 'city_view', 'safety_railings', 'professional_grip', 'drone_certified'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-12',
    vendorId: 'vv-4',
    name: '인도어 스튜디오 - 풀 라이팅',
    nameI18n: {
      ko: '인도어 스튜디오 - 풀 라이팅',
      en: 'Indoor Studio - Full Lighting',
      ja: 'インドアスタジオ - フルライティング',
      zh: '室内摄影棚 - 全灯光系统'
    },
    category: 'studio_space',
    capacity: 20,
    price: 500000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80'],
    desc: '최신 프로 조명 시스템을 갖춘 실내 스튜디오. 날씨의 영향 없이 완벽한 조명 컨트롤과 다양한 배경 설정이 가능합니다.',
    descI18n: {
      ko: '최신 프로 조명 시스템을 갖춘 실내 스튜디오. 날씨의 영향 없이 완벽한 조명 컨트롤과 다양한 배경 설정이 가능합니다.',
      en: 'Indoor studio with cutting-edge professional lighting system. Perfect lighting control and diverse background setups possible regardless of weather.',
      ja: '最新のプロ照明システムを備えたインドアスタジオ。天候の影響なく、完璧な照明コントロールと様々な背景設定が可能です。',
      zh: '配备最新专业照明系统的室内摄影棚。无论天气如何，都可实现完美灯光控制和多样背景设置。'
    },
    amenities: ['professional_lighting', 'multiple_backgrounds', 'makeup_room', 'dressing_room', 'climate_control'],
    sortOrder: 3,
    isAvailable: true
  },

  // VV-5: 파리 클래식 스튜디오
  {
    id: 'vi-13',
    vendorId: 'vv-5',
    name: '그랜드 홀 - 클래식 라운지',
    nameI18n: {
      ko: '그랜드 홀 - 클래식 라운지',
      en: 'Grand Hall - Classic Lounge',
      ja: 'グランドホール - クラシックラウンジ',
      zh: '大厅 - 古典酒廊'
    },
    category: 'studio_space',
    capacity: 30,
    price: 65000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80'],
    desc: '18세기 건축 양식의 화려한 샹들리에와 고급 목재 패널이 특징인 그랜드 홀. 유럽 클래식 웨딩의 대표적인 배경입니다.',
    descI18n: {
      ko: '18세기 건축 양식의 화려한 샹들리에와 고급 목재 패널이 특징인 그랜드 홀. 유럽 클래식 웨딩의 대표적인 배경입니다.',
      en: 'Grand hall featuring ornate chandeliers and premium wooden panels in 18th-century architectural style. Iconic European classic wedding backdrop.',
      ja: '18世紀建築様式の豪華なシャンデリアと高級木材パネルが特徴のグランドホール。ヨーロッパ古典ウェディングの代表的な背景です。',
      zh: '采用18世纪建筑风格，以华丽吊灯和高级木制面板为特色的大厅。是欧洲古典婚礼的代表背景。'
    },
    amenities: ['chandeliers', 'wooden_panels', 'classic_decor', 'portrait_walls', 'natural_light_windows'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-14',
    vendorId: 'vv-5',
    name: '정원실 - 아치형 창문 공간',
    nameI18n: {
      ko: '정원실 - 아치형 창문 공간',
      en: 'Garden Room - Arched Window Space',
      ja: 'ガーデンルーム - アーチ型窓スペース',
      zh: '花园房 - 拱形窗口空间'
    },
    category: 'indoor_garden',
    capacity: 20,
    price: 60000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80'],
    desc: '큰 아치형 창문을 통해 파리 거리 풍경이 보이는 공간. 실내와 실외의 경계가 모호한 아름다운 분위기를 연출합니다.',
    descI18n: {
      ko: '큰 아치형 창문을 통해 파리 거리 풍경이 보이는 공간. 실내와 실외의 경계가 모호한 아름다운 분위기를 연출합니다.',
      en: 'Space with grand arched windows overlooking Paris street views. Creates beautiful atmosphere blurring indoor-outdoor boundaries.',
      ja: '大きなアーチ型の窓を通してパリの街の景色が見える空間。室内と屋外の境界が曖昧な美しい雰囲気を演出します。',
      zh: '通过大型拱形窗户可以看到巴黎街景的空间。营造出室内与室外界限模糊的美丽氛围。'
    },
    amenities: ['arched_windows', 'paris_view', 'natural_light', 'potted_plants', 'classic_furniture'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-15',
    vendorId: 'vv-5',
    name: '미러 살롱 - 대칭 거울 홀',
    nameI18n: {
      ko: '미러 살롱 - 대칭 거울 홀',
      en: 'Mirror Salon - Symmetrical Mirror Hall',
      ja: 'ミラーサロン - 対称ミラーホール',
      zh: '镜廊 - 对称镜厅'
    },
    category: 'studio_space',
    capacity: 15,
    price: 70000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1578926314433-ed6d87e1f289?w=600&q=80'],
    desc: '양쪽 벽면이 전체 거울로 이루어진 특별한 공간. 무한히 반복되는 거울의 반사를 이용한 창의적인 구성이 가능합니다.',
    descI18n: {
      ko: '양쪽 벽면이 전체 거울로 이루어진 특별한 공간. 무한히 반복되는 거울의 반사를 이용한 창의적인 구성이 가능합니다.',
      en: 'Special space with mirrored walls on both sides. Creative compositions utilizing infinitely repeating mirror reflections possible.',
      ja: '両側の壁面が全面鏡でできた特別な空間。無限に繰り返される鏡の反射を利用した創造的な構成が可能です。',
      zh: '两侧墙面均为镜面的特别空间。可利用无限重复的镜面反射进行创意构图。'
    },
    amenities: ['mirror_walls', 'infinity_effect', 'dramatic_lighting', 'professional_staging'],
    sortOrder: 3,
    isAvailable: true
  },

  // VV-6: 오사카 신사 정원
  {
    id: 'vi-16',
    vendorId: 'vv-6',
    name: '토리이 게이트 정원',
    nameI18n: {
      ko: '토리이 게이트 정원',
      en: 'Torii Gate Garden',
      ja: '鳥居ゲート庭園',
      zh: '鸟居门花园'
    },
    category: 'outdoor_space',
    capacity: 20,
    price: 55000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1504681869696-d977e3a3c5d8?w=600&q=80'],
    desc: '신사 입구의 전통 토리이 게이트를 통과하는 진입로. 신성한 분위기와 일본 전통 미학이 응축된 공간입니다.',
    descI18n: {
      ko: '신사 입구의 전통 토리이 게이트를 통과하는 진입로. 신성한 분위기와 일본 전통 미학이 응축된 공간입니다.',
      en: 'Entrance path through traditional torii gate at shrine entrance. Space condensing sacred atmosphere and Japanese traditional aesthetics.',
      ja: '神社入口の伝統的な鳥居ゲートを通る参道。神聖な雰囲気と日本の伝統美学が凝縮された空間です。',
      zh: '通过神社入口传统鸟居门的参道。集神圣气氛和日本传统美学于一身的空间。'
    },
    amenities: ['torii_gate', 'sacred_path', 'natural_light', 'stone_lanterns'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-17',
    vendorId: 'vv-6',
    name: '대나무 숲 - 은신처',
    nameI18n: {
      ko: '대나무 숲 - 은신처',
      en: 'Bamboo Forest - Retreat',
      ja: '竹林 - 隠れ家',
      zh: '竹林 - 隐居所'
    },
    category: 'outdoor_space',
    capacity: 15,
    price: 50000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80'],
    desc: '신사 경내의 울창한 대나무 숲. 서걸리는 빛과 자연 소리가 고요하고 명상적인 분위기를 만듭니다. 기모노 촬영에 최적입니다.',
    descI18n: {
      ko: '신사 경내의 울창한 대나무 숲. 서걸리는 빛과 자연 소리가 고요하고 명상적인 분위기를 만듭니다. 기모노 촬영에 최적입니다.',
      en: 'Dense bamboo forest within shrine grounds. Filtering light and natural sounds create serene, meditative atmosphere. Ideal for kimono photography.',
      ja: '神社境内の鬱蒼とした竹林。漏れる光と自然音が静寂で瞑想的な雰囲気を作ります。着物撮影に最適です。',
      zh: '神社境内茂密的竹林。透光和自然声音营造出宁静冥想的氛围。最适合和服摄影。'
    },
    amenities: ['bamboo_forest', 'natural_light_filtering', 'natural_sound', 'peaceful_atmosphere'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-18',
    vendorId: 'vv-6',
    name: '오래된 사당 - 역사적 배경',
    nameI18n: {
      ko: '오래된 사당 - 역사적 배경',
      en: 'Historic Shrine Hall - Heritage Backdrop',
      ja: '古い社殿 - 歴史的背景',
      zh: '历史神殿 - 遗产背景'
    },
    category: 'outdoor_space',
    capacity: 15,
    price: 60000,
    priceUnit: 'per_hour',
    images: ['https://images.unsplash.com/photo-1578926314433-ed6d87e1f289?w=600&q=80'],
    desc: '200년 이상 된 신사의 메인 사당 앞 공간. 깊은 역사감과 신성성이 느껴지는 가장 정통적인 촬영 배경입니다.',
    descI18n: {
      ko: '200년 이상 된 신사의 메인 사당 앞 공간. 깊은 역사감과 신성성이 느껴지는 가장 정통적인 촬영 배경입니다.',
      en: 'Space in front of 200+ year old shrine main hall. Most authentic shooting backdrop with profound historical and sacred feeling.',
      ja: '200年以上の神社の本殿前の空間。深い歴史感と神聖性が感じられるもっとも正統的な撮影背景です。',
      zh: '200多年的神社主殿前的空间。最具正统感的拍摄背景，具有深厚的历史感和神圣性。'
    },
    amenities: ['historic_shrine', 'heritage_architecture', 'natural_light', 'traditional_setting'],
    sortOrder: 3,
    isAvailable: true
  },

  // VV-7: 전주 한옥마을 포토존
  {
    id: 'vi-19',
    vendorId: 'vv-7',
    name: '메인 갤러리 스튜디오',
    nameI18n: {
      ko: '메인 갤러리 스튜디오',
      en: 'Main Gallery Studio',
      ja: 'メインギャラリースタジオ',
      zh: '主画廊工作室'
    },
    category: 'studio_space',
    capacity: 25,
    price: 480000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1578926314433-ed6d87e1f289?w=600&q=80'],
    desc: '한옥마을의 핵심 건물을 현대적으로 개조한 프리미엄 갤러리 스튜디오. 전문 조명 시스템과 다양한 한옥 배경을 활용한 완벽한 촬영이 가능합니다.',
    descI18n: {
      ko: '한옥마을의 핵심 건물을 현대적으로 개조한 프리미엄 갤러리 스튜디오. 전문 조명 시스템과 다양한 한옥 배경을 활용한 완벽한 촬영이 가능합니다.',
      en: 'Premium gallery studio modernly adapted from a key building in Hanok Village. Perfect photography utilizing professional lighting and diverse hanok backdrops.',
      ja: 'ハノック村の中心建物をモダンに改装したプレミアム갤러리スタジオ。プロの照明システムと多様な韓屋背景を活用した完璧な撮影が可能です。',
      zh: '由韩屋村核心建筑现代改造的高级画廊工作室。可利用专业照明系统和多样的韩屋背景进行完美拍摄。'
    },
    amenities: ['professional_lighting', 'hanok_backdrop', 'makeup_room', 'dressing_room', 'styling_service'],
    sortOrder: 1,
    isAvailable: true
  },
  {
    id: 'vi-20',
    vendorId: 'vv-7',
    name: '마당 야외 공간 - 전통 한옥 배경',
    nameI18n: {
      ko: '마당 야외 공간 - 전통 한옥 배경',
      en: 'Courtyard Outdoor Space - Traditional Hanok Backdrop',
      ja: '中庭屋外スペース - 伝統韓屋背景',
      zh: '庭院室外空间 - 传统韩屋背景'
    },
    category: 'outdoor_space',
    capacity: 20,
    price: 400000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80'],
    desc: '한옥마을의 전형적인 나무 담장과 돌담, 그리고 전통 정원으로 둘러싸인 마당. 정통 한옥 분위기 속에서의 촬영이 가능합니다.',
    descI18n: {
      ko: '한옥마을의 전형적인 나무 담장과 돌담, 그리고 전통 정원으로 둘러싸인 마당. 정통 한옥 분위기 속에서의 촬영이 가능합니다.',
      en: 'Courtyard surrounded by typical wooden and stone fences of Hanok Village and traditional gardens. Photography in authentic hanok atmosphere possible.',
      ja: 'ハノック村の典型的な木製と石造りの塀、そして伝統庭園に囲まれた中庭。正統な韓屋の雰囲気の中での撮影が可能です。',
      zh: '由韩屋村典型的木制和石墙以及传统花园围绕的庭院。可在正统韩屋氛围中进行摄影。'
    },
    amenities: ['hanok_courtyard', 'traditional_walls', 'stone_path', 'seasonal_plants'],
    sortOrder: 2,
    isAvailable: true
  },
  {
    id: 'vi-21',
    vendorId: 'vv-7',
    name: '나이트 갤러리 - 야간 조명 촬영',
    nameI18n: {
      ko: '나이트 갤러리 - 야간 조명 촬영',
      en: 'Night Gallery - Evening Lighting Photography',
      ja: 'ナイトギャラリー - 夜間照明撮影',
      zh: '夜廊 - 夜间照明摄影'
    },
    category: 'studio_space',
    capacity: 20,
    price: 520000,
    priceUnit: 'per_session',
    images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80'],
    desc: '전통 한옥의 야간 분위기를 연출하는 특별한 조명 시스템을 갖춘 공간. 따뜻한 조명 속의 로맨틱한 야간 촬영이 가능합니다.',
    descI18n: {
      ko: '전통 한옥의 야간 분위기를 연출하는 특별한 조명 시스템을 갖춘 공간. 따뜻한 조명 속의 로맨틱한 야간 촬영이 가능합니다.',
      en: 'Space with special lighting system creating evening hanok atmosphere. Romantic night photography in warm lighting possible.',
      ja: '伝統的な韓屋の夜間の雰囲気を演出する特別な照明システムを備えた空間。温かい照明の中でのロマンティックな夜間撮影が可能です。',
      zh: '拥有特殊照明系统营造传统韩屋夜间氛围的空间。可在温暖照明中进行浪漫的夜间摄影。'
    },
    amenities: ['night_lighting', 'warm_ambiance', 'romantic_atmosphere', 'mood_lighting'],
    sortOrder: 3,
    isAvailable: true
  }
];

export const getVenueVendors = () => {
  return VENUE_VENDORS;
};

export const getVenueVendorById = (id) => {
  return VENUE_VENDORS.find(v => v.id === id);
};

export const getVenueVendorsByLocation = (locationId) => {
  return VENUE_VENDORS.filter(v => v.locationId === locationId);
};

export const getVenueItemsByVendor = (vendorId) => {
  return VENUE_ITEMS.filter(item => item.vendorId === vendorId);
};

export const getVenueItemById = (id) => {
  return VENUE_ITEMS.find(item => item.id === id);
};
