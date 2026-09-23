import { useEffect } from 'react';

// ─── SEO ────────────────────────────────────────────────────────────────
//
// 페이지별 제목 · 설명 · OG · canonical 을 document.head 에 직접 쓴다.
//
// 왜 직접 쓰나
//   원래 react-helmet-async 를 썼는데 **아무것도 반영되지 않았다.**
//   컴포넌트는 정상적으로 렌더되고 값도 맞는데(콘솔로 확인) head 에는
//   태그가 하나도 안 생겼다. 개발 서버뿐 아니라 프로덕션 빌드에서도
//   같았다. 그래서 phosnap.com 의 모든 페이지가 index.html 의 홈 제목과
//   홈 설명을 그대로 달고 있었다 — 검색 결과에도, 카톡 미리보기에도.
//
//   그 라이브러리(2.0.5)는 관리가 멈춘 지 오래고, 여기서 필요한 건
//   "태그 몇 개를 최신 값으로 맞춘다" 뿐이다. 서른 줄이면 된다.
//
// 어떻게 지우나
//   index.html 에 이미 description·og·twitter 가 정적으로 있다. 새로
//   만들면 같은 키가 둘이 된다. 그래서 **키로 찾아 값만 갈아끼운다**
//   (meta 는 name/property, link 는 rel). 없을 때만 새로 만든다.
//
// Props
//   title        페이지 제목 (' | Phosnap' 은 여기서 붙인다)
//   description  160자 내
//   image        OG 이미지
//   url          canonical·og:url 을 직접 줄 때
//   type         og:type
//   noIndex      색인 금지 (404·대시보드)
//   lang         <html lang>
//   jsonLd       구조화 데이터
// ────────────────────────────────────────────────────────────────────────

const SITE_NAME = 'Phosnap';
const SITE_URL = 'https://phosnap.com';
const DEFAULT_DESCRIPTION =
  'Global snap photography & video booking platform. Book professional photographers in Seoul, Kyoto, Paris, Bali and more.';
const DEFAULT_IMAGE = '/og-default.svg';

const OG_LOCALE = { ko: 'ko_KR', ja: 'ja_JP', zh: 'zh_CN', en: 'en_US' };

/** 같은 키의 태그를 찾아 값만 갈아끼운다. 없으면 만든다. */
const put = (tag, keyAttr, keyVal, attrs) => {
  if (typeof document === 'undefined') return;
  const head = document.head;
  let el = head.querySelector(`${tag}[${keyAttr}="${keyVal}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(keyAttr, keyVal);
    head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
};

const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
  lang = 'ko',
  jsonLd,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — φῶς · phos · light`;
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const here = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
    const pageUrl = url || window.location.href;

    // canonical 은 쿼리를 뗀 주소다.
    //
    // 예전에는 index.html 에 https://phosnap.com/ 하나가 정적으로 박혀
    // 있어 **모든 페이지가 홈을 정본으로 지목**했다. 검색엔진에게
    // "작가 찾기도 헤메 찾기도 사실 홈이다" 라고 말한 셈이라 하위
    // 페이지가 통째로 색인에서 빠진다.
    //
    // 필터(?cat=hanbok)는 같은 목록의 다른 보기일 뿐이라 canonical 에서
    // 뗀다. 안 떼면 필터 조합마다 다른 페이지로 세어 평가가 흩어진다.
    const canonical = url || here || SITE_URL;
    const absImage = image?.startsWith('http') ? image : `${window.location.origin}${image}`;

    document.title = fullTitle;
    document.documentElement.lang = lang;

    put('link', 'rel', 'canonical', { href: canonical });
    put('meta', 'name', 'description', { content: description });
    // 색인 금지는 해제도 돼야 한다. 404 를 보고 나간 뒤에도 남아 있으면
    // 그 다음에 연 페이지까지 색인에서 빠진다.
    put('meta', 'name', 'robots', { content: noIndex ? 'noindex, nofollow' : 'index, follow' });

    put('meta', 'property', 'og:type', { content: type });
    put('meta', 'property', 'og:site_name', { content: SITE_NAME });
    put('meta', 'property', 'og:title', { content: fullTitle });
    put('meta', 'property', 'og:description', { content: description });
    put('meta', 'property', 'og:image', { content: absImage });
    put('meta', 'property', 'og:url', { content: pageUrl });
    put('meta', 'property', 'og:locale', { content: OG_LOCALE[lang] || OG_LOCALE.en });

    put('meta', 'name', 'twitter:card', { content: 'summary_large_image' });
    put('meta', 'name', 'twitter:title', { content: fullTitle });
    put('meta', 'name', 'twitter:description', { content: description });
    put('meta', 'name', 'twitter:image', { content: absImage });

    // 구조화 데이터는 한 페이지에 하나만 둔다. 앞 페이지 것이 남으면
    // 작가 프로필에 홈의 SearchAction 이 같이 붙는다.
    const old = document.head.querySelector('script[data-seo-jsonld]');
    if (old) old.remove();
    if (jsonLdKey) {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.setAttribute('data-seo-jsonld', '');
      el.textContent = jsonLdKey;
      document.head.appendChild(el);
    }
  }, [fullTitle, description, image, url, type, noIndex, lang, jsonLdKey]);

  return null;
};

export default SEO;

// ─── Presets ──────────────────────────────────────────────────────────

/** 홈 페이지 SEO */
export const HomeSEO = ({ lang }) => {
  const titles = {
    ko: '프로 스냅 사진 · 영상 예약 플랫폼',
    en: 'Global Snap Photography Booking',
    ja: 'プロスナップ写真・映像予約',
    zh: '全球摄影预约平台',
  };
  const descs = {
    ko: '서울, 교토, 파리, 발리 등 전 세계 프로 스냅 작가를 만나보세요. 웨딩, 커플, 가족 촬영을 한 곳에서 예약.',
    en: 'Book professional snap photographers worldwide. Wedding, couple, and family photography in Seoul, Kyoto, Paris, Bali and more.',
    ja: 'ソウル、京都、パリなど世界中のプロフォトグラファーを予約。ウェディング・カップル・家族撮影。',
    zh: '在首尔、京都、巴黎等全球预约专业摄影师。婚纱、情侣、家庭摄影一站式预约。',
  };
  return (
    <SEO
      lang={lang}
      description={descs[lang] || descs.en}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Phosnap',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        description: titles[lang] || titles.en,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${typeof window !== 'undefined' ? window.location.origin : ''}/photographers?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  );
};

/** 작가 프로필 SEO */
export const ProfileSEO = ({ photographer, lang }) => {
  if (!photographer) return null;
  const name = lang === 'ko' && photographer.nameKo ? photographer.nameKo : photographer.name;
  const loc = photographer.locationNames?.[lang] || photographer.location;
  const title = `${name} — ${loc}`;
  const desc = photographer.bioI18n?.[lang] || photographer.bio || '';

  return (
    <SEO
      title={title}
      description={desc.slice(0, 160)}
      image={photographer.img}
      type="profile"
      lang={lang}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: photographer.name,
        image: photographer.img,
        jobTitle: 'Photographer',
        address: {
          '@type': 'PostalAddress',
          addressLocality: photographer.locationNames?.en || photographer.location,
        },
        aggregateRating: photographer.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: photographer.rating,
              reviewCount: photographer.reviews,
            }
          : undefined,
      }}
    />
  );
};

/** Explore 페이지 SEO */
export const ExploreSEO = ({ lang }) => {
  const titles = {
    ko: '촬영 지역 탐색',
    en: 'Explore Locations',
    ja: '撮影地域を探す',
    zh: '探索拍摄地点',
  };
  const descs = {
    ko: '국내·해외 인기 촬영 지역을 탐색하고, 각 도시의 전문 스냅 작가를 찾아보세요.',
    en: 'Explore popular photography locations worldwide and find expert photographers in each city.',
    ja: '国内・海外の人気撮影スポットを探索し、各都市のプロフォトグラファーを見つけましょう。',
    zh: '探索全球热门拍摄地点，找到每个城市的专业摄影师。',
  };
  return (
    <SEO title={titles[lang] || titles.en} description={descs[lang] || descs.en} lang={lang} />
  );
};
