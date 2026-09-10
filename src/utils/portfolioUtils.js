// ─── Portfolio Utils ────────────────────────────────────────────────────
// 포트폴리오 데이터를 Instagram 게시물 형태로 정규화
// 각 "게시물"은 대표사진(cover) + 여러 장의 사진(images)으로 구성

// 보조 이미지 풀 — 웨딩/커플/스냅 사진 (Unsplash)
// 각 게시물에 2~4장의 추가 이미지를 자동 배정
const EXTRA_POOL = [
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600&q=80',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&q=80',
  'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  'https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&q=80',
  'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&q=80',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&q=80',
  'https://images.unsplash.com/photo-1549417229-7686ac5595fd?w=600&q=80',
  'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&q=80',
  'https://images.unsplash.com/photo-1585241936939-be4099591252?w=600&q=80',
  'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=600&q=80',
  'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80',
  'https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=600&q=80',
  'https://images.unsplash.com/photo-1609151354296-e17e5ad8e598?w=600&q=80',
  'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=600&q=80',
  'https://images.unsplash.com/photo-1537907510278-a838254edb85?w=600&q=80',
  'https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?w=600&q=80',
  'https://images.unsplash.com/photo-1494955464529-790512c65305?w=600&q=80',
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80',
  'https://images.unsplash.com/photo-1518611507436-f9221403cca2?w=600&q=80',
  'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=600&q=80',
  'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?w=600&q=80',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80',
  'https://images.unsplash.com/photo-1542027220-726e0a0f7a8e?w=600&q=80',
  'https://images.unsplash.com/photo-1504437948306-56b69710b1f3?w=600&q=80',
];

/**
 * 시드 기반 의사난수 — 같은 입력이면 항상 같은 결과
 * (매 렌더링에서 게시물이 바뀌지 않도록)
 */
function seededShuffle(arr, seed) {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 포트폴리오 정규화 — flat URL 배열 또는 post 객체 배열 모두 지원
 *
 * @param {Array} portfolio      — string[] 또는 { cover, images, location?, caption? }[]
 * @param {Array} locations      — 위치 ID 배열 (flat 포맷용)
 * @param {number} photographerId — 시드로 사용 (일관된 보조 이미지 배정)
 * @returns {{ cover: string, images: string[], location: string|null, caption: string }[]}
 */
export function normalizePortfolio(portfolio, locations = [], photographerId = 0) {
  if (!Array.isArray(portfolio) || portfolio.length === 0) return [];

  // 이미 새 형식인 경우 (첫 요소가 object)
  if (typeof portfolio[0] === 'object' && portfolio[0] !== null && portfolio[0].images) {
    return portfolio.map((post, i) => ({
      cover:    post.cover || post.images?.[0] || '',
      images:   post.images || [post.cover],
      location: post.location || locations[i] || null,
      caption:  post.caption || '',
    }));
  }

  // ── Flat format → 게시물로 변환 ──
  // string[] 또는 { url, caption, regionId }[] 모두 지원
  //
  // 예전에는 EXTRA_POOL(Unsplash 스톡 사진)에서 보조 이미지를 2~3장씩
  // 섞어 넣었는데, 실제 작가의 포트폴리오에 남의 사진이 붙는 셈이라
  // 제거했다. 보조 이미지는 mock 작가에게만 의미가 있었다.
  return portfolio.map((item, i) => {
    const isStr   = typeof item === 'string';
    const url     = isStr ? item : (item?.url || item?.cover || '');
    const caption = isStr ? '' : (item?.caption || '');
    // 지역은 저장 형태에 따라 location / regionId 어느 쪽으로도 올 수 있다.
    const location = isStr
      ? (locations[i] || null)
      : (item?.location || item?.regionId || locations[i] || null);

    return {
      cover:  url,
      images: [url],
      location,
      caption,
    };
  }).filter(post => post.cover);
}

/**
 * 게시물에서 고해상도 URL 생성
 */
export function toHdUrl(url) {
  return url.replace(/w=\d+/, 'w=1400').replace(/q=\d+/, 'q=90');
}
