import { Helmet } from 'react-helmet-async';

// ─── SEO Component ──────────────────────────────────────────────────────
// 동적 메타태그 + OG 태그 관리
// 사용법: <SEO title="..." description="..." image="..." />
//
// Props:
//   title        — 페이지 제목 (자동으로 " | Phosnap" 접미사 추가)
//   description  — 메타 설명 (160자 내)
//   image        — OG 이미지 URL (절대경로)
//   url          — 페이지 URL (기본: window.location.href)
//   type         — OG 타입 (기본: 'website')
//   noIndex      — 검색엔진 인덱싱 차단 (admin 페이지 등)
//   lang         — html lang 속성 (기본: 'ko')
//   jsonLd       — 구조화 데이터 (JSON-LD) 객체
// ────────────────────────────────────────────────────────────────────────

const SITE_NAME = 'Phosnap';
const DEFAULT_DESCRIPTION = 'Global snap photography & video booking platform. Book professional photographers in Seoul, Kyoto, Paris, Bali and more.';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80';

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
  const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      {/* 기본 */}
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : lang === 'ja' ? 'ja_JP' : lang === 'zh' ? 'zh_CN' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD 구조화 데이터 */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
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
        aggregateRating: photographer.rating ? {
          '@type': 'AggregateRating',
          ratingValue: photographer.rating,
          reviewCount: photographer.reviews,
        } : undefined,
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
  return <SEO title={titles[lang] || titles.en} description={descs[lang] || descs.en} lang={lang} />;
};
