// ─── Portfolio Utils ────────────────────────────────────────────────────
// 포트폴리오 데이터를 Instagram 게시물 형태로 정규화
// 각 "게시물"은 대표사진(cover) + 여러 장의 사진(images)으로 구성



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
