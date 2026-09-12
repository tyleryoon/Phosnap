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

  const toUrl = (x) => (typeof x === 'string' ? x : x?.url || '');

  // ── 게시물 형식 — { id, images[], coverIdx, caption, regionId } ──
  //
  // 작가 대시보드의 포트폴리오 편집기가 이 형식으로 저장한다.
  //
  // 고쳤던 것 둘
  //   1) coverIdx 를 무시하고 늘 images[0] 을 대표로 썼다.
  //      작가가 세 번째 사진을 대표로 골라도 첫 장이 나왔다.
  //   2) regionId 를 안 봐서 지역 필터에 걸리지 않았다.
  //      (flat 형식 분기는 regionId 를 보고 있었다 — 형식마다 달랐다)
  if (typeof portfolio[0] === 'object' && portfolio[0] !== null && portfolio[0].images) {
    return portfolio.map((post, i) => {
      const imgs = (post.images || []).map(toUrl).filter(Boolean);
      const ci = Number.isInteger(post.coverIdx) ? post.coverIdx : 0;
      const cover = post.cover || imgs[ci] || imgs[0] || '';

      // 대표를 맨 앞으로 옮긴다. 그래야 cover === images[0] 이 늘 성립하고,
      // 라이트박스를 열었을 때 대표부터 보인다.
      const ordered = cover ? [cover, ...imgs.filter(u => u !== cover)] : imgs;

      return {
        cover,
        images:   ordered.length ? ordered : [cover].filter(Boolean),
        location: post.location || post.regionId || locations[i] || null,
        caption:  post.caption || '',
      };
    }).filter(post => post.cover);
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
