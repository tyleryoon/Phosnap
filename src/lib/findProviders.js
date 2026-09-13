// 찾기 페이지의 속.
//
// 왜 이 파일이 있나
//   찾기 페이지는 유형별로 4개다 — 작가·헤메·의상·장소. 주소가 따로 있어야
//   검색에 잡히고, 유형마다 필터도 다르다. 그런데 예전에 /photographers 와
//   /vendors 를 따로 만들었더니 /vendors 쪽이 DB 를 아예 안 읽는 가짜가 됐고
//   몇 달간 아무도 몰랐다. 화면이 멀쩡해 보였으니까. (규칙 5-18)
//
//   그래서 이번에는 **페이지는 4개, 속은 하나**로 간다.
//   페이지는 어떤 유형인지와 어떤 필터를 보여줄지만 정하고,
//   데이터를 가져오는 일은 전부 여기를 지난다.
//
// 두 경로가 있다 — 이게 이 파일의 핵심
//   · 날짜·시각을 안 넣으면  → 그냥 전체 목록 (둘러보기)
//   · 날짜·시각을 넣으면      → available_providers RPC (그때 가능한 사람만)
//
//   두 경로는 컬럼 모양이 다르다. RPC 는 vendor_name 을 펼쳐주지만
//   테이블 조회는 dress_vendors: { name_ko } 로 중첩해서 준다.
//   한쪽만 보고 카드를 만들면 **다른 경로에서 이름이 빈칸이 된다.**
//   그것도 오류 없이 조용히.
//
//   그래서 두 경로 모두 아래 normalize* 를 반드시 지난다.
//   화면은 어느 경로로 왔는지 몰라도 된다.

import {
  fetchPhotographers, getStylists, getDressItems,
  getVenueItemsByLocation, getAvailableProviders,
} from './supabase';

export const KINDS = ['photographer', 'stylist', 'dress', 'venue'];

export const KIND_LABEL = {
  photographer: '작가',
  stylist:      '헤어메이크업',
  dress:        '의상',
  venue:        '장소',
};

// ── 정규화 ────────────────────────────────────────────────────────────
// 화면이 기대하는 모양은 하나뿐이다. 여기가 그 정의다.
//
// 값이 없으면 null 로 둔다. '' 이나 '이름 없음' 으로 채우지 않는다 —
// 비어 있다는 사실이 화면까지 전달돼야 빠진 걸 알아챈다.

const first = (...xs) => xs.find(x => x !== undefined && x !== null) ?? null;

// 대표사진을 포트폴리오에서 뽑는다.
//
// 왜 필요한가
//   stylists 테이블에는 img 컬럼이 아예 없다. 사진은 portfolio_images 에만
//   있다. 그래서 img 만 보면 **헤메 카드가 전부 '사진 없음' 으로 나온다** —
//   사진이 멀쩡히 있는데도. 실제로 33개 메뉴 중 30개가 그랬다. (규칙 5-18)
//
//   작가 포트폴리오는 모양이 다르다. 게시물 배열이고 각 게시물이 사진을
//   여럿 갖는다: [{ images: [...], coverIdx }]. 대표사진은 coverIdx 가
//   가리키는 장이다 (드래그로 순서를 바꿔 대표를 정하는 기능이 있다).
//
//   두 모양을 다 받는다. 못 찾으면 null 을 돌려준다 —
//   빈 문자열로 채우면 <img src=""> 가 되어 깨진 아이콘이 뜬다.
const coverOf = (portfolio) => {
  if (!Array.isArray(portfolio) || !portfolio.length) return null;
  const p0 = portfolio[0];
  // 헤메: ['https://…', …]
  if (typeof p0 === 'string') return p0;
  // 작가: [{ images: [...], coverIdx }]
  if (Array.isArray(p0?.images) && p0.images.length) {
    const i = Number.isInteger(p0.coverIdx) ? p0.coverIdx : 0;
    const hit = p0.images[i] ?? p0.images[0];
    return typeof hit === 'string' ? hit : (hit?.url ?? null);
  }
  // 기타: [{ url }]
  return p0?.url ?? null;
};

const normalizePhotographer = (p) => ({
  kind: 'photographer',
  id: p.id,
  name: first(p.name_ko, p.name),
  image: first(p.img, p.image, p.avatar_url, coverOf(p.portfolio)),
  portfolio: Array.isArray(p.portfolio) ? p.portfolio : [],
  price: first(p.price_from, p.price),
  rating: first(p.rating),
  reviewsCount: first(p.reviews_count, 0),
  locationId: first(p.location_id),
  artistType: first(p.artist_type),
  languages: Array.isArray(p.languages) ? p.languages : [],
  tags: Array.isArray(p.tags) ? p.tags : [],
  hmkSelf: p.hmk_self === true,
  dressSelf: p.dress_self === true,
  raw: p,
});

// 헤메만 두 경로의 *단위*가 다르다.
//
//   앵커 경로   → 시술 메뉴 한 줄 (한 사람이 메뉴 3개면 3줄)
//                 "그 시간에 가능한가" 는 메뉴마다 다르니까. 샵 시술은 되는데
//                 종일 동행은 안 되는 경우가 있다.
//   둘러보기    → 사람 한 줄 (메뉴는 stylist_services 에 중첩)
//
// 이걸 그냥 두면 둘러보기에서 시술명·가격 칸이 통째로 빈다.
// 오류는 안 나고 카드에 가격만 안 뜬다 — 알아채기 어렵다.
// 그래서 사람 단위로 왔을 때는 메뉴들을 눌러 요약값을 만든다.
const normalizeStylist = (s) => {
  const services = Array.isArray(s.stylist_services) ? s.stylist_services : [];
  const prices = services.map(v => v.price).filter(v => typeof v === 'number');
  const byPerson = !s.service_id;   // 둘러보기 경로인가
  const photos = Array.isArray(s.portfolio) ? s.portfolio
               : Array.isArray(s.portfolio_images) ? s.portfolio_images : [];

  return {
    kind: 'stylist',
    // 카드 key. 메뉴 단위면 메뉴 id, 사람 단위면 사람 id.
    id: first(s.service_id, s.id),
    stylistId: first(s.stylist_id, s.id),
    serviceId: first(s.service_id),
    // 사람 단위 목록인지 — 화면이 "6만원부터" 로 쓸지 정가로 쓸지 판단한다
    byPerson,
    name: first(s.name_ko, s.display_name, s.name),
    serviceName: first(s.service_name),
    serviceCount: byPerson ? services.length : null,
    // stylists 에는 img 컬럼이 없다. 포트폴리오 첫 장이 대표사진이다.
    image: first(s.img, s.image, s.avatar_url, coverOf(photos)),
    portfolio: photos,
    // 메뉴 단위면 그 메뉴 값, 사람 단위면 최저가.
    price: first(s.price, prices.length ? Math.min(...prices) : null),
    rating: first(s.rating),
    reviewsCount: first(s.review_count, s.reviews_count, 0),
    locationId: first(s.location_id),
    specialty: first(s.specialty),
    timing: first(s.timing),
    durationMinutes: first(s.duration_minutes),
    offsetMinutes: first(s.offset_minutes),
    dressSelf: s.dress_self === true,
    services,
    raw: s,
  };
};

const normalizeDress = (d) => ({
  kind: 'dress',
  id: d.id,
  name: first(d.name_ko, d.name),
  nameEn: first(d.name_en),
  image: first(d.image_url, d.images?.[0]?.url, d.images?.[0]),
  images: Array.isArray(d.images) ? d.images : [],
  price: first(d.price),
  category: first(d.category),
  color: first(d.color),
  sizes: Array.isArray(d.sizes) ? d.sizes : [],
  sizeStock: first(d.size_stock),
  bookedSizes: Array.isArray(d.booked_sizes) ? d.booked_sizes : [],
  description: first(d.description),
  vendorId: first(d.vendor_id),
  // RPC 는 펼쳐서, 테이블 조회는 중첩해서 준다. 둘 다 받는다.
  vendorName: first(d.vendor_name, d.dress_vendors?.name_ko),
  locationId: first(d.location_id, d.dress_vendors?.location_id),
  raw: d,
});

const normalizeVenue = (v) => ({
  kind: 'venue',
  id: v.id,
  name: first(v.name_ko, v.name),
  image: first(v.images?.[0]?.url, v.images?.[0], v.image_url),
  images: Array.isArray(v.images) ? v.images : [],
  price: first(v.price),
  priceUnit: first(v.price_unit),
  category: first(v.category),
  capacity: first(v.capacity),
  amenities: Array.isArray(v.amenities) ? v.amenities : [],
  description: first(v.description),
  vendorId: first(v.vendor_id),
  vendorName: first(v.vendor_name, v.venue_vendors?.name_ko),
  locationId: first(v.location_id, v.venue_vendors?.location_id),
  raw: v,
});

const NORMALIZE = {
  photographer: normalizePhotographer,
  stylist:      normalizeStylist,
  dress:        normalizeDress,
  venue:        normalizeVenue,
};

// RPC 응답에서 유형별로 꺼낼 칸 이름
const RPC_FIELD = {
  photographer: 'photographers',
  stylist:      'stylists',
  dress:        'dresses',
  venue:        'venues',
};

/**
 * 찾기 조회. 페이지 4개가 전부 이 함수만 부른다.
 *
 * @param {object} o
 * @param {'photographer'|'stylist'|'dress'|'venue'} o.kind
 * @param {string|null} o.locationId  지역 슬러그 (seoul 등). null 이면 전 지역
 * @param {string|null} o.date        'YYYY-MM-DD'. date+time 이 다 있어야 앵커가 켜진다
 * @param {string|null} o.time        'HH:MM'
 * @param {number} o.hours            촬영 길이. 앵커일 때만 쓴다
 * @returns {{ data: object[], anchored: boolean, error: object|null }}
 */
export const findProviders = async ({
  kind, locationId = null, date = null, time = null, hours = 2,
} = {}) => {
  if (!KINDS.includes(kind)) {
    return { data: [], anchored: false, error: { message: `알 수 없는 유형: ${kind}` } };
  }
  const normalize = NORMALIZE[kind];
  const anchored = !!(date && time);

  // ── 앵커 경로 — 그 날 그 시간에 실제로 가능한 사람만 ──
  if (anchored) {
    const { data, error } = await getAvailableProviders({ locationId, date, time, hours });
    if (error) return { data: [], anchored, error };
    const rows = data?.[RPC_FIELD[kind]] || [];
    return { data: rows.map(normalize), anchored, error: null };
  }

  // ── 둘러보기 경로 — 날짜를 안 정한 사람 ──
  let res;
  switch (kind) {
    case 'photographer':
      // fetchPhotographers 는 지역을 city/countryCode 로 받는다.
      // 여기서는 location_id 로 걸러야 하므로 받아서 거른다.
      res = await fetchPhotographers({ limit: 200 });
      if (!res.error && locationId) {
        res = { ...res, data: (res.data || []).filter(p => p.location_id === locationId) };
      }
      break;
    case 'stylist':
      res = await getStylists(locationId);
      break;
    case 'dress':
      res = await getDressItems({ locationId });
      break;
    case 'venue':
      res = await getVenueItemsByLocation(locationId);
      break;
    default:
      res = { data: [], error: null };
  }
  if (res.error) return { data: [], anchored, error: res.error };
  return { data: (res.data || []).map(normalize), anchored, error: null };
};
