/**
 * Phosnap Tag Registry — 태그 ID + 다국어 라벨 시스템
 *
 * DB에는 태그를 고유 ID(예: 'hanbok')로 저장하고,
 * UI에서는 사용자의 언어에 맞는 라벨을 보여줌.
 *
 * 예: 일본 벤더가 'hanbok' 태그를 추가 → 일본 고객에게 '韓服', 한국 고객에게 '한복'으로 표시
 */

// ─── 의상 태그 (Costume Tags) ────────────────────────────────────────
export const COSTUME_TAG_REGISTRY = {
  // 전통 의상
  hanbok:     { ko: '한복',     en: 'Hanbok',     ja: '韓服',       zh: '韩服',     category: 'traditional' },
  kimono:     { ko: '기모노',   en: 'Kimono',     ja: '着物',       zh: '和服',     category: 'traditional' },
  yukata:     { ko: '유카타',   en: 'Yukata',     ja: '浴衣',       zh: '浴衣',     category: 'traditional' },
  cheongsam:  { ko: '치파오',   en: 'Cheongsam',  ja: 'チャイナドレス', zh: '旗袍',   category: 'traditional' },
  aodai:      { ko: '아오자이', en: 'Ao Dai',     ja: 'アオザイ',     zh: '奥黛',   category: 'traditional' },
  sari:       { ko: '사리',     en: 'Sari',       ja: 'サリー',       zh: '纱丽',   category: 'traditional' },
  dirndl:     { ko: '디른들',   en: 'Dirndl',     ja: 'ディアンドル',   zh: '迪恩德尔', category: 'traditional' },

  // 서양 정장/드레스
  wedding_dress: { ko: '웨딩드레스', en: 'Wedding Dress', ja: 'ウェディングドレス', zh: '婚纱',       category: 'western_formal' },
  tuxedo:        { ko: '턱시도',     en: 'Tuxedo',        ja: 'タキシード',         zh: '燕尾服',     category: 'western_formal' },
  suit:          { ko: '수트',       en: 'Suit',          ja: 'スーツ',             zh: '西装',       category: 'western_formal' },
  evening_gown:  { ko: '이브닝가운', en: 'Evening Gown',  ja: 'イブニングガウン',     zh: '晚礼服',   category: 'western_formal' },
  cocktail:      { ko: '칵테일드레스', en: 'Cocktail Dress', ja: 'カクテルドレス',   zh: '鸡尾酒裙', category: 'western_formal' },

  // 특수 의상
  cosplay:       { ko: '코스프레',     en: 'Cosplay',       ja: 'コスプレ',     zh: '角色扮演',   category: 'special' },
  stage_costume: { ko: '무대의상',     en: 'Stage Costume', ja: 'ステージ衣装', zh: '舞台服装',   category: 'special' },
  period_drama:  { ko: '시대극의상',   en: 'Period Costume', ja: '時代劇衣装',  zh: '古装',       category: 'special' },
  uniform:       { ko: '유니폼',       en: 'Uniform',       ja: 'ユニフォーム', zh: '制服',       category: 'special' },

  // 캐주얼/스타일링
  couple_look:   { ko: '커플룩',       en: 'Couple Look',   ja: 'カップルルック', zh: '情侣装',   category: 'casual' },
  family_look:   { ko: '가족촬영복',   en: 'Family Look',   ja: 'ファミリールック', zh: '亲子装', category: 'casual' },
  street_style:  { ko: '스트릿스타일', en: 'Street Style',  ja: 'ストリートスタイル', zh: '街头风', category: 'casual' },
  maternity:     { ko: '만삭촬영복',   en: 'Maternity',     ja: 'マタニティ',       zh: '孕妇装', category: 'casual' },

  // 소품/액세서리
  crown:         { ko: '화관',   en: 'Crown',   ja: '花冠',     zh: '花冠',   category: 'accessory' },
  fan:           { ko: '부채',   en: 'Fan',     ja: '扇子',     zh: '扇子',   category: 'accessory' },
  umbrella:      { ko: '우산',   en: 'Umbrella', ja: '傘',       zh: '伞',     category: 'accessory' },
  hat:           { ko: '모자',   en: 'Hat',     ja: '帽子',     zh: '帽子',   category: 'accessory' },
  veil:          { ko: '베일',   en: 'Veil',    ja: 'ベール',   zh: '面纱',   category: 'accessory' },
  jewelry:       { ko: '쥬얼리', en: 'Jewelry', ja: 'ジュエリー', zh: '珠宝', category: 'accessory' },
  bouquet:       { ko: '부케',   en: 'Bouquet', ja: 'ブーケ',   zh: '花束',   category: 'accessory' },
};

// ─── 장소 태그 (Venue Tags) ──────────────────────────────────────────
export const VENUE_TAG_REGISTRY = {
  photo_studio:   { ko: '사진스튜디오',   en: 'Photo Studio',   ja: 'フォトスタジオ',   zh: '摄影棚',   category: 'studio' },
  white_studio:   { ko: '화이트스튜디오', en: 'White Studio',   ja: 'ホワイトスタジオ', zh: '白色摄影棚', category: 'studio' },
  black_studio:   { ko: '블랙스튜디오',   en: 'Black Studio',   ja: 'ブラックスタジオ', zh: '黑色摄影棚', category: 'studio' },
  natural_light:  { ko: '자연광스튜디오', en: 'Natural Light',  ja: '自然光スタジオ',   zh: '自然光棚', category: 'studio' },

  hanok:          { ko: '한옥',     en: 'Hanok',         ja: '韓屋',         zh: '韩屋',     category: 'traditional_space' },
  gotaek:         { ko: '고택',     en: 'Traditional House', ja: '古宅',     zh: '古宅',     category: 'traditional_space' },
  garden:         { ko: '정원',     en: 'Garden',        ja: '庭園',         zh: '庭院',     category: 'traditional_space' },
  temple:         { ko: '사찰',     en: 'Temple',        ja: '寺院',         zh: '寺庙',     category: 'traditional_space' },
  shrine:         { ko: '신사',     en: 'Shrine',        ja: '神社',         zh: '神社',     category: 'traditional_space' },

  park:           { ko: '공원',     en: 'Park',          ja: '公園',         zh: '公园',     category: 'outdoor' },
  beach:          { ko: '해변',     en: 'Beach',         ja: 'ビーチ',       zh: '海滩',     category: 'outdoor' },
  flower_field:   { ko: '꽃밭',     en: 'Flower Field',  ja: 'お花畑',       zh: '花田',     category: 'outdoor' },
  forest:         { ko: '숲',       en: 'Forest',        ja: '森',           zh: '森林',     category: 'outdoor' },
  mountain:       { ko: '산',       en: 'Mountain',      ja: '山',           zh: '山',       category: 'outdoor' },
  riverside:      { ko: '강변',     en: 'Riverside',     ja: '川辺',         zh: '河畔',     category: 'outdoor' },

  cafe:           { ko: '카페',     en: 'Café',          ja: 'カフェ',       zh: '咖啡馆',   category: 'urban' },
  rooftop:        { ko: '루프탑',   en: 'Rooftop',       ja: 'ルーフトップ', zh: '屋顶',     category: 'urban' },
  gallery:        { ko: '갤러리',   en: 'Gallery',       ja: 'ギャラリー',   zh: '画廊',     category: 'urban' },
  bookshop:       { ko: '서점',     en: 'Bookshop',      ja: '書店',         zh: '书店',     category: 'urban' },
  hotel:          { ko: '호텔',     en: 'Hotel',         ja: 'ホテル',       zh: '酒店',     category: 'urban' },

  party_room:     { ko: '파티룸',   en: 'Party Room',    ja: 'パーティールーム', zh: '派对房', category: 'event_hall' },
  wedding_hall:   { ko: '웨딩홀',   en: 'Wedding Hall',  ja: 'ウェディングホール', zh: '婚礼厅', category: 'event_hall' },
  banquet:        { ko: '연회장',   en: 'Banquet Hall',  ja: '宴会場',       zh: '宴会厅',   category: 'event_hall' },
};

// ─── 작가 스냅 필터 태그 (Artist Snap Tags) ──────────────────────────
export const SNAP_TAG_REGISTRY = {
  wedding:        { ko: '웨딩',       en: 'Wedding',       ja: 'ウェディング', zh: '婚礼' },
  couple:         { ko: '커플',       en: 'Couple',        ja: 'カップル',     zh: '情侣' },
  family:         { ko: '가족',       en: 'Family',        ja: 'ファミリー',   zh: '家庭' },
  profile:        { ko: '프로필',     en: 'Profile',       ja: 'プロフィール', zh: '个人写真' },
  graduation:     { ko: '졸업',       en: 'Graduation',    ja: '卒業',         zh: '毕业' },
  maternity:      { ko: '만삭',       en: 'Maternity',     ja: 'マタニティ',   zh: '孕妇' },
  newborn:        { ko: '뉴본',       en: 'Newborn',       ja: 'ニューボーン', zh: '新生儿' },
  travel:         { ko: '여행',       en: 'Travel',        ja: '旅行',         zh: '旅行' },
  outdoor:        { ko: '야외',       en: 'Outdoor',       ja: 'アウトドア',   zh: '户外' },
  studio:         { ko: '스튜디오',   en: 'Studio',        ja: 'スタジオ',     zh: '摄影棚' },
  hanbok:         { ko: '한복',       en: 'Hanbok',        ja: '韓服',         zh: '韩服' },
  kimono:         { ko: '기모노',     en: 'Kimono',        ja: '着物',         zh: '和服' },
  traditional:    { ko: '전통의상',   en: 'Traditional',   ja: '伝統衣装',     zh: '传统服饰' },
  night:          { ko: '야경',       en: 'Night',         ja: '夜景',         zh: '夜景' },
  pet:            { ko: '반려동물',   en: 'Pet',           ja: 'ペット',       zh: '宠物' },
  commercial:     { ko: '상업',       en: 'Commercial',    ja: 'コマーシャル', zh: '商业' },
  food:           { ko: '음식',       en: 'Food',          ja: 'フード',       zh: '美食' },
  concert:        { ko: '콘서트',     en: 'Concert',       ja: 'コンサート',   zh: '演唱会' },
  video:          { ko: '영상',       en: 'Video',         ja: '動画',         zh: '视频' },
  drone:          { ko: '드론',       en: 'Drone',         ja: 'ドローン',     zh: '无人机' },
  film:           { ko: '필름',       en: 'Film',          ja: 'フィルム',     zh: '胶片' },
  vintage:        { ko: '빈티지',     en: 'Vintage',       ja: 'ヴィンテージ', zh: '复古' },
};


// ─── 유틸 함수 ────────────────────────────────────────────────────────

/**
 * 태그 ID로 현재 언어의 라벨을 반환
 * @param {string} tagId - 태그 ID (예: 'hanbok')
 * @param {string} lang - 언어 코드 (ko/en/ja/zh)
 * @param {'costume'|'venue'|'snap'} type - 태그 종류
 * @returns {string} 다국어 라벨 (못 찾으면 tagId 그대로 반환 — 커스텀 태그)
 */
export function getTagLabel(tagId, lang = 'ko', type = 'costume') {
  const registry =
    type === 'venue' ? VENUE_TAG_REGISTRY :
    type === 'snap'  ? SNAP_TAG_REGISTRY :
    COSTUME_TAG_REGISTRY;

  const entry = registry[tagId];
  if (entry) return entry[lang] || entry.ko || tagId;

  // 다른 레지스트리에서도 찾아봄 (교차 검색)
  const allRegistries = [COSTUME_TAG_REGISTRY, VENUE_TAG_REGISTRY, SNAP_TAG_REGISTRY];
  for (const reg of allRegistries) {
    if (reg[tagId]) return reg[tagId][lang] || reg[tagId].ko || tagId;
  }

  return tagId; // 커스텀 태그는 ID 그대로 표시
}

/**
 * 해당 카테고리의 태그 목록을 반환
 * @param {string} category - 카테고리 (예: 'traditional', 'studio')
 * @param {'costume'|'venue'} type - 벤더 유형
 * @returns {string[]} 태그 ID 배열
 */
export function getTagsByCategory(category, type = 'costume') {
  const registry = type === 'venue' ? VENUE_TAG_REGISTRY : COSTUME_TAG_REGISTRY;
  return Object.entries(registry)
    .filter(([, val]) => val.category === category)
    .map(([key]) => key);
}

/**
 * 모든 태그 ID 목록 반환
 * @param {'costume'|'venue'|'snap'} type
 * @returns {string[]}
 */
export function getAllTagIds(type = 'costume') {
  const registry =
    type === 'venue' ? VENUE_TAG_REGISTRY :
    type === 'snap'  ? SNAP_TAG_REGISTRY :
    COSTUME_TAG_REGISTRY;
  return Object.keys(registry);
}

/**
 * 텍스트(라벨)로 태그 ID 역검색 — 벤더가 한국어로 '한복'이라 입력하면 'hanbok' ID 반환
 * @param {string} text - 검색할 텍스트
 * @param {'costume'|'venue'|'snap'} type
 * @returns {string|null} 매칭된 태그 ID 또는 null
 */
export function findTagIdByLabel(text, type = 'costume') {
  const registry =
    type === 'venue' ? VENUE_TAG_REGISTRY :
    type === 'snap'  ? SNAP_TAG_REGISTRY :
    COSTUME_TAG_REGISTRY;

  const normalized = text.trim().toLowerCase();

  for (const [id, labels] of Object.entries(registry)) {
    for (const lang of ['ko', 'en', 'ja', 'zh']) {
      if (labels[lang] && labels[lang].toLowerCase() === normalized) {
        return id;
      }
    }
  }

  // 다른 레지스트리에서도 찾기
  const allRegistries = [
    { reg: COSTUME_TAG_REGISTRY, t: 'costume' },
    { reg: VENUE_TAG_REGISTRY, t: 'venue' },
    { reg: SNAP_TAG_REGISTRY, t: 'snap' },
  ];
  for (const { reg } of allRegistries) {
    for (const [id, labels] of Object.entries(reg)) {
      for (const lang of ['ko', 'en', 'ja', 'zh']) {
        if (labels[lang] && labels[lang].toLowerCase() === normalized) {
          return id;
        }
      }
    }
  }

  return null; // 등록되지 않은 커스텀 태그
}
