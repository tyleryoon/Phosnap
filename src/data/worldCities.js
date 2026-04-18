/**
 * World Cities Data for Phosnap Luxury Photography Booking Platform
 * Comprehensive database of countries and their major cities for photographer location selection
 *
 * Structure:
 * - WORLD_COUNTRIES: All ~195 UN-recognized countries with flags and Korean/English names
 * - WORLD_CITIES: Major cities indexed by country code, with Korean and English names
 */

// ============================================================================
// WORLD COUNTRIES - All UN-recognized countries + major territories
// ============================================================================

export const WORLD_COUNTRIES = {
  // EAST ASIA
  KR: { flag: '🇰🇷', ko: '한국', en: 'South Korea' },
  KP: { flag: '🇰🇵', ko: '북한', en: 'North Korea' },
  JP: { flag: '🇯🇵', ko: '일본', en: 'Japan' },
  CN: { flag: '🇨🇳', ko: '중국', en: 'China' },
  MN: { flag: '🇲🇳', ko: '몽골', en: 'Mongolia' },
  TW: { flag: '🇹🇼', ko: '대만', en: 'Taiwan' },
  HK: { flag: '🇭🇰', ko: '홍콩', en: 'Hong Kong' },
  MO: { flag: '🇲🇴', ko: '마카오', en: 'Macau' },

  // SOUTHEAST ASIA
  TH: { flag: '🇹🇭', ko: '태국', en: 'Thailand' },
  VN: { flag: '🇻🇳', ko: '베트남', en: 'Vietnam' },
  KH: { flag: '🇰🇭', ko: '캄보디아', en: 'Cambodia' },
  LA: { flag: '🇱🇦', ko: '라오스', en: 'Laos' },
  MM: { flag: '🇲🇲', ko: '미얀마', en: 'Myanmar' },
  MY: { flag: '🇲🇾', ko: '말레이시아', en: 'Malaysia' },
  SG: { flag: '🇸🇬', ko: '싱가포르', en: 'Singapore' },
  ID: { flag: '🇮🇩', ko: '인도네시아', en: 'Indonesia' },
  PH: { flag: '🇵🇭', ko: '필리핀', en: 'Philippines' },
  BN: { flag: '🇧🇳', ko: '브루나이', en: 'Brunei' },
  TL: { flag: '🇹🇱', ko: '동티모르', en: 'East Timor' },

  // SOUTH ASIA
  IN: { flag: '🇮🇳', ko: '인도', en: 'India' },
  PK: { flag: '🇵🇰', ko: '파키스탄', en: 'Pakistan' },
  BD: { flag: '🇧🇩', ko: '방글라데시', en: 'Bangladesh' },
  NP: { flag: '🇳🇵', ko: '네팔', en: 'Nepal' },
  BT: { flag: '🇧🇹', ko: '부탄', en: 'Bhutan' },
  LK: { flag: '🇱🇰', ko: '스리랑카', en: 'Sri Lanka' },
  MV: { flag: '🇲🇻', ko: '몰디브', en: 'Maldives' },
  AF: { flag: '🇦🇫', ko: '아프가니스탄', en: 'Afghanistan' },

  // MIDDLE EAST
  SA: { flag: '🇸🇦', ko: '사우디아라비아', en: 'Saudi Arabia' },
  AE: { flag: '🇦🇪', ko: '아랍에미리트', en: 'United Arab Emirates' },
  QA: { flag: '🇶🇦', ko: '카타르', en: 'Qatar' },
  BH: { flag: '🇧🇭', ko: '바레인', en: 'Bahrain' },
  KW: { flag: '🇰🇼', ko: '쿠웨이트', en: 'Kuwait' },
  OM: { flag: '🇴🇲', ko: '오만', en: 'Oman' },
  YE: { flag: '🇾🇪', ko: '예멘', en: 'Yemen' },
  JO: { flag: '🇯🇴', ko: '요르단', en: 'Jordan' },
  LB: { flag: '🇱🇧', ko: '레바논', en: 'Lebanon' },
  SY: { flag: '🇸🇾', ko: '시리아', en: 'Syria' },
  IQ: { flag: '🇮🇶', ko: '이라크', en: 'Iraq' },
  IR: { flag: '🇮🇷', ko: '이란', en: 'Iran' },
  IL: { flag: '🇮🇱', ko: '이스라엘', en: 'Israel' },
  PS: { flag: '🇵🇸', ko: '팔레스타인', en: 'Palestine' },
  TR: { flag: '🇹🇷', ko: '터키', en: 'Turkey' },

  // CENTRAL ASIA
  KZ: { flag: '🇰🇿', ko: '카자흐스탄', en: 'Kazakhstan' },
  UZ: { flag: '🇺🇿', ko: '우즈베키스탄', en: 'Uzbekistan' },
  TM: { flag: '🇹🇲', ko: '투르크메니스탄', en: 'Turkmenistan' },
  KG: { flag: '🇰🇬', ko: '키르기스스탄', en: 'Kyrgyzstan' },
  TJ: { flag: '🇹🇯', ko: '타지키스탄', en: 'Tajikistan' },

  // EASTERN EUROPE
  RU: { flag: '🇷🇺', ko: '러시아', en: 'Russia' },
  UA: { flag: '🇺🇦', ko: '우크라이나', en: 'Ukraine' },
  BY: { flag: '🇧🇾', ko: '벨라루스', en: 'Belarus' },
  MD: { flag: '🇲🇩', ko: '몰도바', en: 'Moldova' },
  RO: { flag: '🇷🇴', ko: '루마니아', en: 'Romania' },
  BG: { flag: '🇧🇬', ko: '불가리아', en: 'Bulgaria' },
  RS: { flag: '🇷🇸', ko: '세르비아', en: 'Serbia' },
  HR: { flag: '🇭🇷', ko: '크로아티아', en: 'Croatia' },
  BA: { flag: '🇧🇦', ko: '보스니아헤르체고비나', en: 'Bosnia and Herzegovina' },
  ME: { flag: '🇲🇪', ko: '몬테네그로', en: 'Montenegro' },
  MK: { flag: '🇲🇰', ko: '북마케도니아', en: 'North Macedonia' },
  AL: { flag: '🇦🇱', ko: '알바니아', en: 'Albania' },
  GR: { flag: '🇬🇷', ko: '그리스', en: 'Greece' },

  // CENTRAL EUROPE
  PL: { flag: '🇵🇱', ko: '폴란드', en: 'Poland' },
  CZ: { flag: '🇨🇿', ko: '체코', en: 'Czech Republic' },
  SK: { flag: '🇸🇰', ko: '슬로바키아', en: 'Slovakia' },
  HU: { flag: '🇭🇺', ko: '헝가리', en: 'Hungary' },
  AT: { flag: '🇦🇹', ko: '오스트리아', en: 'Austria' },
  SI: { flag: '🇸🇮', ko: '슬로베니아', en: 'Slovenia' },

  // NORTHERN EUROPE
  SE: { flag: '🇸🇪', ko: '스웨덴', en: 'Sweden' },
  NO: { flag: '🇳🇴', ko: '노르웨이', en: 'Norway' },
  FI: { flag: '🇫🇮', ko: '핀란드', en: 'Finland' },
  DK: { flag: '🇩🇰', ko: '덴마크', en: 'Denmark' },
  IS: { flag: '🇮🇸', ko: '아이슬란드', en: 'Iceland' },
  EE: { flag: '🇪🇪', ko: '에스토니아', en: 'Estonia' },
  LV: { flag: '🇱🇻', ko: '라트비아', en: 'Latvia' },
  LT: { flag: '🇱🇹', ko: '리투아니아', en: 'Lithuania' },

  // WESTERN EUROPE
  GB: { flag: '🇬🇧', ko: '영국', en: 'United Kingdom' },
  IE: { flag: '🇮🇪', ko: '아일랜드', en: 'Ireland' },
  FR: { flag: '🇫🇷', ko: '프랑스', en: 'France' },
  DE: { flag: '🇩🇪', ko: '독일', en: 'Germany' },
  NL: { flag: '🇳🇱', ko: '네덜란드', en: 'Netherlands' },
  BE: { flag: '🇧🇪', ko: '벨기에', en: 'Belgium' },
  LU: { flag: '🇱🇺', ko: '룩셈부르크', en: 'Luxembourg' },
  CH: { flag: '🇨🇭', ko: '스위스', en: 'Switzerland' },

  // SOUTHERN EUROPE
  IT: { flag: '🇮🇹', ko: '이탈리아', en: 'Italy' },
  ES: { flag: '🇪🇸', ko: '스페인', en: 'Spain' },
  PT: { flag: '🇵🇹', ko: '포르투갈', en: 'Portugal' },
  GR: { flag: '🇬🇷', ko: '그리스', en: 'Greece' },
  HR: { flag: '🇭🇷', ko: '크로아티아', en: 'Croatia' },
  MT: { flag: '🇲🇹', ko: '몰타', en: 'Malta' },
  CY: { flag: '🇨🇾', ko: '키프로스', en: 'Cyprus' },

  // AFRICA - NORTH
  EG: { flag: '🇪🇬', ko: '이집트', en: 'Egypt' },
  LY: { flag: '🇱🇾', ko: '리비아', en: 'Libya' },
  TN: { flag: '🇹🇳', ko: '튀니지', en: 'Tunisia' },
  DZ: { flag: '🇩🇿', ko: '알제리', en: 'Algeria' },
  MA: { flag: '🇲🇦', ko: '모로코', en: 'Morocco' },
  SD: { flag: '🇸🇩', ko: '수단', en: 'Sudan' },

  // AFRICA - WEST
  MR: { flag: '🇲🇷', ko: '모리타니', en: 'Mauritania' },
  SN: { flag: '🇸🇳', ko: '세네갈', en: 'Senegal' },
  GM: { flag: '🇬🇲', ko: '감비아', en: 'Gambia' },
  GW: { flag: '🇬🇼', ko: '기니비사우', en: 'Guinea-Bissau' },
  GN: { flag: '🇬🇳', ko: '기니', en: 'Guinea' },
  SL: { flag: '🇸🇱', ko: '시에라리온', en: 'Sierra Leone' },
  LR: { flag: '🇱🇷', ko: '라이베리아', en: 'Liberia' },
  ML: { flag: '🇲🇱', ko: '말리', en: 'Mali' },
  CI: { flag: '🇨🇮', ko: '코트디부아르', en: 'Ivory Coast' },
  BF: { flag: '🇧🇫', ko: '부르키나파소', en: 'Burkina Faso' },
  GH: { flag: '🇬🇭', ko: '가나', en: 'Ghana' },
  TG: { flag: '🇹🇬', ko: '토고', en: 'Togo' },
  BJ: { flag: '🇧🇯', ko: '베냉', en: 'Benin' },
  NE: { flag: '🇳🇪', ko: '니제르', en: 'Niger' },
  NG: { flag: '🇳🇬', ko: '나이지리아', en: 'Nigeria' },
  CM: { flag: '🇨🇲', ko: '카메룬', en: 'Cameroon' },

  // AFRICA - CENTRAL
  GA: { flag: '🇬🇦', ko: '가봉', en: 'Gabon' },
  CG: { flag: '🇨🇬', ko: '콩고', en: 'Congo' },
  CD: { flag: '🇨🇩', ko: '콩고민주공화국', en: 'Democratic Republic of Congo' },
  AO: { flag: '🇦🇴', ko: '앙골라', en: 'Angola' },
  ST: { flag: '🇸🇹', ko: '상투메프린시페', en: 'São Tomé and Príncipe' },
  GQ: { flag: '🇬🇶', ko: '적도기니', en: 'Equatorial Guinea' },
  CF: { flag: '🇨🇫', ko: '중앙아프리카공화국', en: 'Central African Republic' },
  TD: { flag: '🇹🇩', ko: '차드', en: 'Chad' },

  // AFRICA - EAST
  ET: { flag: '🇪🇹', ko: '에티오피아', en: 'Ethiopia' },
  ER: { flag: '🇪🇷', ko: '에리트레아', en: 'Eritrea' },
  DJ: { flag: '🇩🇯', ko: '지부티', en: 'Djibouti' },
  SO: { flag: '🇸🇴', ko: '소말리아', en: 'Somalia' },
  KE: { flag: '🇰🇪', ko: '케냐', en: 'Kenya' },
  UG: { flag: '🇺🇬', ko: '우간다', en: 'Uganda' },
  RW: { flag: '🇷🇼', ko: '르완다', en: 'Rwanda' },
  BI: { flag: '🇧🇮', ko: '부룬디', en: 'Burundi' },
  TZ: { flag: '🇹🇿', ko: '탄자니아', en: 'Tanzania' },
  MZ: { flag: '🇲🇿', ko: '모잠비크', en: 'Mozambique' },
  ZM: { flag: '🇿🇲', ko: '잠비아', en: 'Zambia' },
  ZW: { flag: '🇿🇼', ko: '짐바브웨', en: 'Zimbabwe' },
  MW: { flag: '🇲🇼', ko: '말라위', en: 'Malawi' },

  // AFRICA - SOUTH
  ZA: { flag: '🇿🇦', ko: '남아프리카', en: 'South Africa' },
  BW: { flag: '🇧🇼', ko: '보츠와나', en: 'Botswana' },
  NA: { flag: '🇳🇦', ko: '나미비아', en: 'Namibia' },
  LS: { flag: '🇱🇸', ko: '레소토', en: 'Lesotho' },
  SZ: { flag: '🇸🇿', ko: '에스와티니', en: 'Eswatini' },
  MG: { flag: '🇲🇬', ko: '마다가스카르', en: 'Madagascar' },
  MU: { flag: '🇲🇺', ko: '모리셔스', en: 'Mauritius' },
  SC: { flag: '🇸🇨', ko: '세이셸', en: 'Seychelles' },
  KM: { flag: '🇰🇲', ko: '코모로', en: 'Comoros' },

  // NORTH AMERICA
  CA: { flag: '🇨🇦', ko: '캐나다', en: 'Canada' },
  US: { flag: '🇺🇸', ko: '미국', en: 'United States' },
  MX: { flag: '🇲🇽', ko: '멕시코', en: 'Mexico' },

  // CENTRAL AMERICA & CARIBBEAN
  BZ: { flag: '🇧🇿', ko: '벨리즈', en: 'Belize' },
  GT: { flag: '🇬🇹', ko: '과테말라', en: 'Guatemala' },
  HN: { flag: '🇭🇳', ko: '온두라스', en: 'Honduras' },
  SV: { flag: '🇸🇻', ko: '엘살바도르', en: 'El Salvador' },
  NI: { flag: '🇳🇮', ko: '니카라과', en: 'Nicaragua' },
  CR: { flag: '🇨🇷', ko: '코스타리카', en: 'Costa Rica' },
  PA: { flag: '🇵🇦', ko: '파나마', en: 'Panama' },
  CU: { flag: '🇨🇺', ko: '쿠바', en: 'Cuba' },
  DO: { flag: '🇩🇴', ko: '도미니카공화국', en: 'Dominican Republic' },
  HT: { flag: '🇭🇹', ko: '아이티', en: 'Haiti' },
  JM: { flag: '🇯🇲', ko: '자메이카', en: 'Jamaica' },
  TT: { flag: '🇹🇹', ko: '트리니다드토바고', en: 'Trinidad and Tobago' },
  BS: { flag: '🇧🇸', ko: '바하마', en: 'Bahamas' },
  BB: { flag: '🇧🇧', ko: '바베이도스', en: 'Barbados' },
  AG: { flag: '🇦🇬', ko: '앤티가바부다', en: 'Antigua and Barbuda' },
  KN: { flag: '🇰🇳', ko: '세인트키츠네비스', en: 'Saint Kitts and Nevis' },
  LC: { flag: '🇱🇨', ko: '세인트루시아', en: 'Saint Lucia' },
  VC: { flag: '🇻🇨', ko: '세인트빈센트그레나딘', en: 'Saint Vincent and the Grenadines' },
  GD: { flag: '🇬🇩', ko: '그레나다', en: 'Grenada' },
  DM: { flag: '🇩🇲', ko: '도미니카', en: 'Dominica' },

  // SOUTH AMERICA
  CO: { flag: '🇨🇴', ko: '콜롬비아', en: 'Colombia' },
  VE: { flag: '🇻🇪', ko: '베네수엘라', en: 'Venezuela' },
  GY: { flag: '🇬🇾', ko: '가이아나', en: 'Guyana' },
  SR: { flag: '🇸🇷', ko: '수리남', en: 'Suriname' },
  GF: { flag: '🇬🇫', ko: '프랑스령기아나', en: 'French Guiana' },
  EC: { flag: '🇪🇨', ko: '에콰도르', en: 'Ecuador' },
  PE: { flag: '🇵🇪', ko: '페루', en: 'Peru' },
  BR: { flag: '🇧🇷', ko: '브라질', en: 'Brazil' },
  BO: { flag: '🇧🇴', ko: '볼리비아', en: 'Bolivia' },
  PY: { flag: '🇵🇾', ko: '파라과이', en: 'Paraguay' },
  CL: { flag: '🇨🇱', ko: '칠레', en: 'Chile' },
  AR: { flag: '🇦🇷', ko: '아르헨티나', en: 'Argentina' },
  UY: { flag: '🇺🇾', ko: '우루과이', en: 'Uruguay' },

  // OCEANIA
  AU: { flag: '🇦🇺', ko: '호주', en: 'Australia' },
  NZ: { flag: '🇳🇿', ko: '뉴질랜드', en: 'New Zealand' },
  FJ: { flag: '🇫🇯', ko: '피지', en: 'Fiji' },
  PG: { flag: '🇵🇬', ko: '파푸아뉴기니', en: 'Papua New Guinea' },
  SB: { flag: '🇸🇧', ko: '솔로몬제도', en: 'Solomon Islands' },
  VU: { flag: '🇻🇺', ko: '바누아투', en: 'Vanuatu' },
  WS: { flag: '🇼🇸', ko: '사모아', en: 'Samoa' },
  KI: { flag: '🇰🇮', ko: '키리바시', en: 'Kiribati' },
  TO: { flag: '🇹🇴', ko: '통가', en: 'Tonga' },
  PW: { flag: '🇵🇼', ko: '팔라우', en: 'Palau' },
  MH: { flag: '🇲🇭', ko: '마셜제도', en: 'Marshall Islands' },
  FM: { flag: '🇫🇲', ko: '미크로네시아', en: 'Micronesia' },
  NR: { flag: '🇳🇷', ko: '나우루', en: 'Nauru' },
  TV: { flag: '🇹🇻', ko: '투발루', en: 'Tuvalu' },
  PF: { flag: '🇵🇫', ko: '프랑스령폴리네시아', en: 'French Polynesia' },
  NC: { flag: '🇳🇨', ko: '뉴칼레도니아', en: 'New Caledonia' },
  GU: { flag: '🇬🇺', ko: '괌', en: 'Guam' },
  MP: { flag: '🇲🇵', ko: '북마리아나제도', en: 'Northern Mariana Islands' },
  AS: { flag: '🇦🇸', ko: '미국령사모아', en: 'American Samoa' },
};

// ============================================================================
// WORLD CITIES - Major cities by country code
// ============================================================================

export const WORLD_CITIES = {
  // SOUTH KOREA - All 17 administrative divisions
  KR: [
    { id: 'seoul', ko: '서울', en: 'Seoul' },
    { id: 'busan', ko: '부산', en: 'Busan' },
    { id: 'daegu', ko: '대구', en: 'Daegu' },
    { id: 'incheon', ko: '인천', en: 'Incheon' },
    { id: 'gwangju', ko: '광주', en: 'Gwangju' },
    { id: 'daejeon', ko: '대전', en: 'Daejeon' },
    { id: 'ulsan', ko: '울산', en: 'Ulsan' },
    { id: 'sejong', ko: '세종', en: 'Sejong' },
    { id: 'gyeonggi', ko: '경기', en: 'Gyeonggi' },
    { id: 'gangwon', ko: '강원', en: 'Gangwon' },
    { id: 'chungbuk', ko: '충북', en: 'Chungcheongbuk' },
    { id: 'chungnam', ko: '충남', en: 'Chungcheongnam' },
    { id: 'jeonbuk', ko: '전북', en: 'Jeollabuk' },
    { id: 'jeonnam', ko: '전남', en: 'Jeollanam' },
    { id: 'gyeongbuk', ko: '경북', en: 'Gyeongsangbuk' },
    { id: 'gyeongnam', ko: '경남', en: 'Gyeongsangnam' },
    { id: 'jeju', ko: '제주', en: 'Jeju' },
  ],

  // JAPAN - Major cities (20+ for major photography destination)
  JP: [
    { id: 'tokyo', ko: '도쿄', en: 'Tokyo' },
    { id: 'yokohama', ko: '요코하마', en: 'Yokohama' },
    { id: 'osaka', ko: '오사카', en: 'Osaka' },
    { id: 'kyoto', ko: '교토', en: 'Kyoto' },
    { id: 'kobe', ko: '고베', en: 'Kobe' },
    { id: 'kawasaki', ko: '가와사키', en: 'Kawasaki' },
    { id: 'saitama', ko: '사이타마', en: 'Saitama' },
    { id: 'nagoya', ko: '나고야', en: 'Nagoya' },
    { id: 'fukuoka', ko: '후쿠오카', en: 'Fukuoka' },
    { id: 'kita-kyushu', ko: '기타큐슈', en: 'Kitakyushu' },
    { id: 'sapporo', ko: '삿포로', en: 'Sapporo' },
    { id: 'sendai', ko: '센다이', en: 'Sendai' },
    { id: 'kawaguchi', ko: '가와구치', en: 'Kawaguchi' },
    { id: 'saitama-city', ko: '사이타마시', en: 'Saitama City' },
    { id: 'chiba', ko: '치바', en: 'Chiba' },
    { id: 'nara', ko: '나라', en: 'Nara' },
    { id: 'kanazawa', ko: '가나자와', en: 'Kanazawa' },
    { id: 'hiroshima', ko: '히로시마', en: 'Hiroshima' },
    { id: 'okayama', ko: '오카야마', en: 'Okayama' },
    { id: 'matsuyama', ko: '마쓰야마', en: 'Matsuyama' },
  ],

  // CHINA - Major cities (25+ for size and photography destinations)
  CN: [
    { id: 'beijing', ko: '베이징', en: 'Beijing' },
    { id: 'shanghai', ko: '상하이', en: 'Shanghai' },
    { id: 'guangzhou', ko: '광저우', en: 'Guangzhou' },
    { id: 'shenzhen', ko: '선전', en: 'Shenzhen' },
    { id: 'chengdu', ko: '청두', en: 'Chengdu' },
    { id: 'hangzhou', ko: '항저우', en: 'Hangzhou' },
    { id: 'chongqing', ko: '충칭', en: 'Chongqing' },
    { id: 'wuhan', ko: '우한', en: 'Wuhan' },
    { id: 'xian', ko: '시안', en: "Xi'an" },
    { id: 'suzhou', ko: '소주', en: 'Suzhou' },
    { id: 'nanjing', ko: '난징', en: 'Nanjing' },
    { id: 'jinan', ko: '지난', en: 'Jinan' },
    { id: 'shenyang', ko: '심양', en: 'Shenyang' },
    { id: 'harbin', ko: '하얼빈', en: 'Harbin' },
    { id: 'changchun', ko: '창춘', en: 'Changchun' },
    { id: 'tianjin', ko: '톈진', en: 'Tianjin' },
    { id: 'qingdao', ko: '칭다오', en: 'Qingdao' },
    { id: 'xiamen', ko: '샤먼', en: 'Xiamen' },
    { id: 'fuzhou', ko: '푸저우', en: 'Fuzhou' },
    { id: 'nanchang', ko: '난창', en: 'Nanchang' },
    { id: 'changsha', ko: '창사', en: 'Changsha' },
    { id: 'guiyang', ko: '귀양', en: 'Guiyang' },
    { id: 'kunming', ko: '쿤밍', en: 'Kunming' },
    { id: 'lanzhou', ko: '란저우', en: 'Lanzhou' },
    { id: 'urumqi', ko: '우루무치', en: 'Urumqi' },
  ],

  // THAILAND - Major cities (15+)
  TH: [
    { id: 'bangkok', ko: '방콕', en: 'Bangkok' },
    { id: 'chiang-mai', ko: '치앙마이', en: 'Chiang Mai' },
    { id: 'pattaya', ko: '파타야', en: 'Pattaya' },
    { id: 'phuket', ko: '푸켓', en: 'Phuket' },
    { id: 'krabi', ko: '크라비', en: 'Krabi' },
    { id: 'samui', ko: '사무이', en: 'Koh Samui' },
    { id: 'sukhothai', ko: '수코타이', en: 'Sukhothai' },
    { id: 'ayutthaya', ko: '아유타야', en: 'Ayutthaya' },
    { id: 'phitsanulok', ko: '피삿누록', en: 'Phitsanulok' },
    { id: 'udon-thani', ko: '우돈타니', en: 'Udon Thani' },
    { id: 'khon-kaen', ko: '콘깬', en: 'Khon Kaen' },
    { id: 'korat', ko: '나콘랏차시마', en: 'Nakhon Ratchasima' },
    { id: 'hua-hin', ko: '후아힌', en: 'Hua Hin' },
    { id: 'kanchanaburi', ko: '깐짜나부리', en: 'Kanchanaburi' },
    { id: 'trang', ko: '트랑', en: 'Trang' },
  ],

  // VIETNAM - Major cities (15+)
  VN: [
    { id: 'hanoi', ko: '하노이', en: 'Hanoi' },
    { id: 'ho-chi-minh', ko: '호찌민', en: 'Ho Chi Minh City' },
    { id: 'da-nang', ko: '다낭', en: 'Da Nang' },
    { id: 'hai-phong', ko: '하이퐁', en: 'Hai Phong' },
    { id: 'can-tho', ko: '깐토', en: 'Can Tho' },
    { id: 'vinh', ko: '빈', en: 'Vinh' },
    { id: 'rach-gia', ko: '락자', en: 'Rach Gia' },
    { id: 'quy-nhon', ko: '꾸이년', en: 'Quy Nhon' },
    { id: 'phan-thiet', ko: '판티에트', en: 'Phan Thiet' },
    { id: 'hoi-an', ko: '호이안', en: 'Hoi An' },
    { id: 'nha-trang', ko: '냐짱', en: 'Nha Trang' },
    { id: 'vung-tau', ko: '붕타우', en: 'Vung Tau' },
    { id: 'sapa', ko: '사파', en: 'Sa Pa' },
    { id: 'ha-long', ko: '할롱', en: 'Ha Long' },
    { id: 'hue', ko: '후에', en: 'Hue' },
  ],

  // INDIA - Major cities (25+)
  IN: [
    { id: 'delhi', ko: '델리', en: 'Delhi' },
    { id: 'mumbai', ko: '뭄바이', en: 'Mumbai' },
    { id: 'bangalore', ko: '방갈로르', en: 'Bangalore' },
    { id: 'hyderabad', ko: '하이데라바드', en: 'Hyderabad' },
    { id: 'kolkata', ko: '콜카타', en: 'Kolkata' },
    { id: 'chennai', ko: '첸나이', en: 'Chennai' },
    { id: 'pune', ko: '푼', en: 'Pune' },
    { id: 'ahmedabad', ko: '아메다바드', en: 'Ahmedabad' },
    { id: 'jaipur', ko: '자이푸르', en: 'Jaipur' },
    { id: 'lucknow', ko: '럭나우', en: 'Lucknow' },
    { id: 'kanpur', ko: '칸푸르', en: 'Kanpur' },
    { id: 'nagpur', ko: '나그푸르', en: 'Nagpur' },
    { id: 'indore', ko: '인도르', en: 'Indore' },
    { id: 'thane', ko: '타네', en: 'Thane' },
    { id: 'bhopal', ko: '보팔', en: 'Bhopal' },
    { id: 'ghaziabad', ko: '가지아바드', en: 'Ghaziabad' },
    { id: 'visakhapatnam', ko: '비샤카파트남', en: 'Visakhapatnam' },
    { id: 'agra', ko: '아그라', en: 'Agra' },
    { id: 'varanasi', ko: '바라나시', en: 'Varanasi' },
    { id: 'srinagar', ko: '스리나가르', en: 'Srinagar' },
    { id: 'amritsar', ko: '암리차르', en: 'Amritsar' },
    { id: 'udaipur', ko: '우다이푸르', en: 'Udaipur' },
    { id: 'goa', ko: '고아', en: 'Goa' },
    { id: 'kochi', ko: '코치', en: 'Kochi' },
    { id: 'ooty', ko: '우티', en: 'Ooty' },
  ],

  // UNITED STATES - Major cities (30+)
  US: [
    { id: 'new-york', ko: '뉴욕', en: 'New York' },
    { id: 'los-angeles', ko: '로스앤젤레스', en: 'Los Angeles' },
    { id: 'chicago', ko: '시카고', en: 'Chicago' },
    { id: 'houston', ko: '휴스턴', en: 'Houston' },
    { id: 'phoenix', ko: '피닉스', en: 'Phoenix' },
    { id: 'philadelphia', ko: '필라델피아', en: 'Philadelphia' },
    { id: 'san-antonio', ko: '산안토니오', en: 'San Antonio' },
    { id: 'san-diego', ko: '샌디에이고', en: 'San Diego' },
    { id: 'dallas', ko: '달라스', en: 'Dallas' },
    { id: 'san-jose', ko: '산호세', en: 'San Jose' },
    { id: 'austin', ko: '오스틴', en: 'Austin' },
    { id: 'jacksonville', ko: '잭슨빌', en: 'Jacksonville' },
    { id: 'fort-worth', ko: '포트워스', en: 'Fort Worth' },
    { id: 'columbus', ko: '콜럼버스', en: 'Columbus' },
    { id: 'charlotte', ko: '샬롯', en: 'Charlotte' },
    { id: 'san-francisco', ko: '샌프란시스코', en: 'San Francisco' },
    { id: 'indianapolis', ko: '인디애나폴리스', en: 'Indianapolis' },
    { id: 'seattle', ko: '시애틀', en: 'Seattle' },
    { id: 'denver', ko: '덴버', en: 'Denver' },
    { id: 'boston', ko: '보스턴', en: 'Boston' },
    { id: 'miami', ko: '마이애미', en: 'Miami' },
    { id: 'new-orleans', ko: '뉴올리언스', en: 'New Orleans' },
    { id: 'las-vegas', ko: '라스베이거스', en: 'Las Vegas' },
    { id: 'washington-dc', ko: '워싱턴DC', en: 'Washington, D.C.' },
    { id: 'portland', ko: '포틀랜드', en: 'Portland' },
    { id: 'nashville', ko: '내슈빌', en: 'Nashville' },
    { id: 'memphis', ko: '멤피스', en: 'Memphis' },
    { id: 'santa-fe', ko: '산타페', en: 'Santa Fe' },
    { id: 'charleston', ko: '찰스턴', en: 'Charleston' },
    { id: 'savannah', ko: '사바나', en: 'Savannah' },
  ],

  // FRANCE - Major cities (20+)
  FR: [
    { id: 'paris', ko: '파리', en: 'Paris' },
    { id: 'marseille', ko: '마르세유', en: 'Marseille' },
    { id: 'lyon', ko: '리옹', en: 'Lyon' },
    { id: 'toulouse', ko: '툴루즈', en: 'Toulouse' },
    { id: 'nice', ko: '니스', en: 'Nice' },
    { id: 'nantes', ko: '낭트', en: 'Nantes' },
    { id: 'strasbourg', ko: '스트라스부르', en: 'Strasbourg' },
    { id: 'bordeaux', ko: '보르도', en: 'Bordeaux' },
    { id: 'lille', ko: '릴', en: 'Lille' },
    { id: 'rennes', ko: '렌', en: 'Rennes' },
    { id: 'reims', ko: '랭스', en: 'Reims' },
    { id: 'havre', ko: '르아브르', en: 'Le Havre' },
    { id: 'saint-etienne', ko: '생테티엔', en: 'Saint-Étienne' },
    { id: 'toulon', ko: '툴롱', en: 'Toulon' },
    { id: 'grenoble', ko: '그르노블', en: 'Grenoble' },
    { id: 'avignon', ko: '아비뇽', en: 'Avignon' },
    { id: 'aix-en-provence', ko: '엑상프로방스', en: 'Aix-en-Provence' },
    { id: 'versailles', ko: '베르사유', en: 'Versailles' },
    { id: 'chamonix', ko: '샤모니', en: 'Chamonix' },
    { id: 'annecy', ko: '안시', en: 'Annecy' },
  ],

  // ITALY - Major cities (20+)
  IT: [
    { id: 'rome', ko: '로마', en: 'Rome' },
    { id: 'milan', ko: '밀라노', en: 'Milan' },
    { id: 'naples', ko: '나폴리', en: 'Naples' },
    { id: 'turin', ko: '토리노', en: 'Turin' },
    { id: 'palermo', ko: '팔레르모', en: 'Palermo' },
    { id: 'genoa', ko: '제노바', en: 'Genoa' },
    { id: 'bologna', ko: '볼로냐', en: 'Bologna' },
    { id: 'florence', ko: '피렌체', en: 'Florence' },
    { id: 'bari', ko: '바리', en: 'Bari' },
    { id: 'catania', ko: '카타니아', en: 'Catania' },
    { id: 'venice', ko: '베니스', en: 'Venice' },
    { id: 'verona', ko: '베로나', en: 'Verona' },
    { id: 'messina', ko: '메시나', en: 'Messina' },
    { id: 'padua', ko: '파도바', en: 'Padua' },
    { id: 'trieste', ko: '트리에스테', en: 'Trieste' },
    { id: 'brescia', ko: '브레시아', en: 'Brescia' },
    { id: 'parma', ko: '파르마', en: 'Parma' },
    { id: 'ravenna', ko: '라벤나', en: 'Ravenna' },
    { id: 'cinque-terre', ko: '친케테레', en: 'Cinque Terre' },
    { id: 'positano', ko: '포지타노', en: 'Positano' },
  ],

  // SPAIN - Major cities (20+)
  ES: [
    { id: 'madrid', ko: '마드리드', en: 'Madrid' },
    { id: 'barcelona', ko: '바르셀로나', en: 'Barcelona' },
    { id: 'valencia', ko: '발렌시아', en: 'Valencia' },
    { id: 'seville', ko: '세비야', en: 'Seville' },
    { id: 'bilbao', ko: '빌바오', en: 'Bilbao' },
    { id: 'malaga', ko: '말라가', en: 'Málaga' },
    { id: 'palma', ko: '팔마', en: 'Palma de Mallorca' },
    { id: 'alicante', ko: '알리칸테', en: 'Alicante' },
    { id: 'cordoba', ko: '코르도바', en: 'Córdoba' },
    { id: 'murcia', ko: '무르시아', en: 'Murcia' },
    { id: 'zaragoza', ko: '사라고사', en: 'Zaragoza' },
    { id: 'salamanca', ko: '살라망카', en: 'Salamanca' },
    { id: 'toledo', ko: '톨레도', en: 'Toledo' },
    { id: 'segovia', ko: '세고비아', en: 'Segovia' },
    { id: 'avila', ko: '아빌라', en: 'Ávila' },
    { id: 'cuenca', ko: '꾸엔카', en: 'Cuenca' },
    { id: 'tarragona', ko: '타라고나', en: 'Tarragona' },
    { id: 'girona', ko: '헤로나', en: 'Girona' },
    { id: 'ibiza', ko: '이비자', en: 'Ibiza' },
    { id: 'granada', ko: '그라나다', en: 'Granada' },
  ],

  // UNITED KINGDOM - Major cities (15+)
  GB: [
    { id: 'london', ko: '런던', en: 'London' },
    { id: 'manchester', ko: '맨체스터', en: 'Manchester' },
    { id: 'birmingham', ko: '버밍엄', en: 'Birmingham' },
    { id: 'leeds', ko: '리즈', en: 'Leeds' },
    { id: 'glasgow', ko: '글래스고', en: 'Glasgow' },
    { id: 'liverpool', ko: '리버풀', en: 'Liverpool' },
    { id: 'edinburgh', ko: '에든버러', en: 'Edinburgh' },
    { id: 'bristol', ko: '브리스톨', en: 'Bristol' },
    { id: 'cardiff', ko: '카디프', en: 'Cardiff' },
    { id: 'belfast', ko: '벨파스트', en: 'Belfast' },
    { id: 'york', ko: '요크', en: 'York' },
    { id: 'oxford', ko: '옥스퍼드', en: 'Oxford' },
    { id: 'cambridge', ko: '케임브리지', en: 'Cambridge' },
    { id: 'bath', ko: '배스', en: 'Bath' },
    { id: 'stratford-upon-avon', ko: '스트래포드어폰에이번', en: 'Stratford-upon-Avon' },
  ],

  // GERMANY - Major cities (18+)
  DE: [
    { id: 'berlin', ko: '베를린', en: 'Berlin' },
    { id: 'munich', ko: '뮌헨', en: 'Munich' },
    { id: 'frankfurt', ko: '프랑크푸르트', en: 'Frankfurt' },
    { id: 'hamburg', ko: '함부르크', en: 'Hamburg' },
    { id: 'cologne', ko: '쾰른', en: 'Cologne' },
    { id: 'dusseldorf', ko: '뒤셀도르프', en: 'Düsseldorf' },
    { id: 'dortmund', ko: '도르트문트', en: 'Dortmund' },
    { id: 'essen', ko: '에센', en: 'Essen' },
    { id: 'leipzig', ko: '라이프치히', en: 'Leipzig' },
    { id: 'dresden', ko: '드레스덴', en: 'Dresden' },
    { id: 'hanover', ko: '하노버', en: 'Hanover' },
    { id: 'nuremberg', ko: '뉘른베르크', en: 'Nuremberg' },
    { id: 'mannheim', ko: '만하임', en: 'Mannheim' },
    { id: 'augsburg', ko: '아우크스부르크', en: 'Augsburg' },
    { id: 'wiesbaden', ko: '비스바덴', en: 'Wiesbaden' },
    { id: 'heidelberg', ko: '하이델베르크', en: 'Heidelberg' },
    { id: 'hamburg', ko: '함부르크', en: 'Hamburg' },
    { id: 'rothenburg', ko: '로텐부르크', en: 'Rothenburg' },
  ],

  // BRAZIL - Major cities (20+)
  BR: [
    { id: 'sao-paulo', ko: '상파울루', en: 'São Paulo' },
    { id: 'rio-de-janeiro', ko: '리우데자네이루', en: 'Rio de Janeiro' },
    { id: 'salvador', ko: '살바도르', en: 'Salvador' },
    { id: 'fortaleza', ko: '포르탈레자', en: 'Fortaleza' },
    { id: 'belo-horizonte', ko: '벨루오리존치', en: 'Belo Horizonte' },
    { id: 'brasilia', ko: '브라질리아', en: 'Brasília' },
    { id: 'manaus', ko: '마나우스', en: 'Manaus' },
    { id: 'curitiba', ko: '쿠리치바', en: 'Curitiba' },
    { id: 'recife', ko: '헤시피', en: 'Recife' },
    { id: 'porto-alegre', ko: '포르투알레그리', en: 'Porto Alegre' },
    { id: 'goiania', ko: '고이아니아', en: 'Goiânia' },
    { id: 'guarulhos', ko: '과룰류스', en: 'Guarulhos' },
    { id: 'campinas', ko: '캄피나스', en: 'Campinas' },
    { id: 'santo-andre', ko: '산투앙드레', en: 'Santo André' },
    { id: 'maceio', ko: '마세이오', en: 'Maceió' },
    { id: 'joao-pessoa', ko: '조앙페소아', en: 'João Pessoa' },
    { id: 'teresina', ko: '테레지나', en: 'Teresina' },
    { id: 'natal', ko: '나탈', en: 'Natal' },
    { id: 'sao-luis', ko: '상루이스', en: 'São Luís' },
    { id: 'aracaju', ko: '아라카주', en: 'Aracaju' },
  ],

  // MEXICO - Major cities (15+)
  MX: [
    { id: 'mexico-city', ko: '멕시코시티', en: 'Mexico City' },
    { id: 'guadalajara', ko: '과달라하라', en: 'Guadalajara' },
    { id: 'monterrey', ko: '몬테레이', en: 'Monterrey' },
    { id: 'puebla', ko: '푸에블라', en: 'Puebla' },
    { id: 'toluca', ko: '톨루카', en: 'Toluca' },
    { id: 'tijuana', ko: '티후아나', en: 'Tijuana' },
    { id: 'leon', ko: '레온', en: 'León' },
    { id: 'queretaro', ko: '케레타로', en: 'Querétaro' },
    { id: 'cancun', ko: '칸쿤', en: 'Cancún' },
    { id: 'playa-del-carmen', ko: '플라야델카르멘', en: 'Playa del Carmen' },
    { id: 'acapulco', ko: '아카풀코', en: 'Acapulco' },
    { id: 'puerto-vallarta', ko: '푸에르토바야르타', en: 'Puerto Vallarta' },
    { id: 'merida', ko: '메리다', en: 'Mérida' },
    { id: 'veracruz', ko: '베라크루스', en: 'Veracruz' },
    { id: 'morelia', ko: '모렐리아', en: 'Morelia' },
  ],

  // CANADA - Major cities (15+)
  CA: [
    { id: 'toronto', ko: '토론토', en: 'Toronto' },
    { id: 'vancouver', ko: '밴쿠버', en: 'Vancouver' },
    { id: 'montreal', ko: '몬트리올', en: 'Montreal' },
    { id: 'calgary', ko: '캘거리', en: 'Calgary' },
    { id: 'ottawa', ko: '오타와', en: 'Ottawa' },
    { id: 'edmonton', ko: '에드먼턴', en: 'Edmonton' },
    { id: 'winnipeg', ko: '위니펙', en: 'Winnipeg' },
    { id: 'quebec-city', ko: '퀘벡시티', en: 'Quebec City' },
    { id: 'victoria', ko: '빅토리아', en: 'Victoria' },
    { id: 'halifax', ko: '핼리팩스', en: 'Halifax' },
    { id: 'whistler', ko: '휘슬러', en: 'Whistler' },
    { id: 'banff', ko: '밴프', en: 'Banff' },
    { id: 'lake-louise', ko: '레이크루이즈', en: 'Lake Louise' },
    { id: 'niagara-falls', ko: '나이아가라폭포', en: 'Niagara Falls' },
    { id: 'bermuda', ko: '버뮤다', en: 'Bermuda' },
  ],

  // AUSTRALIA - Major cities (15+)
  AU: [
    { id: 'sydney', ko: '시드니', en: 'Sydney' },
    { id: 'melbourne', ko: '멜버른', en: 'Melbourne' },
    { id: 'brisbane', ko: '브리즈번', en: 'Brisbane' },
    { id: 'perth', ko: '퍼스', en: 'Perth' },
    { id: 'adelaide', ko: '애들레이드', en: 'Adelaide' },
    { id: 'gold-coast', ko: '골드코스트', en: 'Gold Coast' },
    { id: 'canberra', ko: '캔버라', en: 'Canberra' },
    { id: 'hobart', ko: '호바트', en: 'Hobart' },
    { id: 'darwin', ko: '다윈', en: 'Darwin' },
    { id: 'cairns', ko: '케언즈', en: 'Cairns' },
    { id: 'townsville', ko: '타운즈빌', en: 'Townsville' },
    { id: 'wollongong', ko: '울롱공', en: 'Wollongong' },
    { id: 'newcastle', ko: '뉴캐슬', en: 'Newcastle' },
    { id: 'great-barrier-reef', ko: '그레이트배리어리프', en: 'Great Barrier Reef Area' },
    { id: 'uluru', ko: '울루루', en: 'Uluru' },
  ],

  // NEW ZEALAND - Major cities (10+)
  NZ: [
    { id: 'auckland', ko: '오클랜드', en: 'Auckland' },
    { id: 'wellington', ko: '웰링턴', en: 'Wellington' },
    { id: 'christchurch', ko: '크라이스트처치', en: 'Christchurch' },
    { id: 'queenstown', ko: '퀸스타운', en: 'Queenstown' },
    { id: 'dunedin', ko: '더니든', en: 'Dunedin' },
    { id: 'tauranga', ko: '타우랑가', en: 'Tauranga' },
    { id: 'rotorua', ko: '로토루아', en: 'Rotorua' },
    { id: 'napier', ko: '네이피어', en: 'Napier' },
    { id: 'palmerston-north', ko: '팔머스턴노스', en: 'Palmerston North' },
    { id: 'milford-sound', ko: '밀포드사운드', en: 'Milford Sound' },
  ],

  // SINGAPORE
  SG: [
    { id: 'singapore', ko: '싱가포르', en: 'Singapore' },
    { id: 'marina-bay', ko: '마리나베이', en: 'Marina Bay' },
    { id: 'orchard', ko: '오차드', en: 'Orchard' },
    { id: 'sentosa', ko: '센토사', en: 'Sentosa' },
    { id: 'chinatown', ko: '차이나타운', en: 'Chinatown' },
    { id: 'little-india', ko: '리틀인디아', en: 'Little India' },
  ],

  // HONG KONG
  HK: [
    { id: 'hong-kong', ko: '홍콩', en: 'Hong Kong' },
    { id: 'central', ko: '센트럴', en: 'Central' },
    { id: 'causeway-bay', ko: '코즈웨이베이', en: 'Causeway Bay' },
    { id: 'tsim-sha-tsui', ko: '침사츠이', en: 'Tsim Sha Tsui' },
    { id: 'victoria-peak', ko: '빅토리아피크', en: 'Victoria Peak' },
    { id: 'stanley', ko: '스탠리', en: 'Stanley' },
  ],

  // TAIWAN
  TW: [
    { id: 'taipei', ko: '타이베이', en: 'Taipei' },
    { id: 'kaohsiung', ko: '가오슝', en: 'Kaohsiung' },
    { id: 'taichung', ko: '타이중', en: 'Taichung' },
    { id: 'tainan', ko: '타이난', en: 'Tainan' },
    { id: 'keelung', ko: '지롱', en: 'Keelung' },
    { id: 'hsinchu', ko: '신주', en: 'Hsinchu' },
    { id: 'taitung', ko: '타이둥', en: 'Taitung' },
    { id: 'jiufen', ko: '주펀', en: 'Jiufen' },
    { id: 'sun-moon-lake', ko: '일월담', en: 'Sun Moon Lake' },
  ],

  // MACAU
  MO: [
    { id: 'macau', ko: '마카오', en: 'Macau' },
    { id: 'taipa', ko: '타이파', en: 'Taipa' },
  ],

  // INDONESIA - Major cities (12+)
  ID: [
    { id: 'jakarta', ko: '자카르타', en: 'Jakarta' },
    { id: 'surabaya', ko: '수라바야', en: 'Surabaya' },
    { id: 'bandung', ko: '반둥', en: 'Bandung' },
    { id: 'medan', ko: '메단', en: 'Medan' },
    { id: 'semarang', ko: '세마랑', en: 'Semarang' },
    { id: 'makassar', ko: '마카사르', en: 'Makassar' },
    { id: 'palembang', ko: '팔렘방', en: 'Palembang' },
    { id: 'tangerang', ko: '탄게랑', en: 'Tangerang' },
    { id: 'depok', ko: '드포크', en: 'Depok' },
    { id: 'yogyakarta', ko: '욕야카르타', en: 'Yogyakarta' },
    { id: 'bali', ko: '발리', en: 'Bali' },
    { id: 'lombok', ko: '롬복', en: 'Lombok' },
  ],

  // PHILIPPINES - Major cities (12+)
  PH: [
    { id: 'manila', ko: '마닐라', en: 'Manila' },
    { id: 'quezon-city', ko: '케손시티', en: 'Quezon City' },
    { id: 'cebu', ko: '세부', en: 'Cebu' },
    { id: 'davao', ko: '다바오', en: 'Davao' },
    { id: 'caloocan', ko: '칼루칸', en: 'Caloocan' },
    { id: 'makati', ko: '마카티', en: 'Makati' },
    { id: 'pasig', ko: '파식', en: 'Pasig' },
    { id: 'cagayan-de-oro', ko: '카가얀데오로', en: 'Cagayan de Oro' },
    { id: 'zamboanga', ko: '잠보앙가', en: 'Zamboanga' },
    { id: 'boracay', ko: '보라카이', en: 'Boracay' },
    { id: 'palawan', ko: '팔라완', en: 'Palawan' },
    { id: 'siargao', ko: '시아르가오', en: 'Siargao' },
  ],

  // MALAYSIA - Major cities (12+)
  MY: [
    { id: 'kuala-lumpur', ko: '쿠알라룸푸르', en: 'Kuala Lumpur' },
    { id: 'george-town', ko: '조지타운', en: 'George Town' },
    { id: 'ipoh', ko: '이포', en: 'Ipoh' },
    { id: 'johor-bahru', ko: '조호르바루', en: 'Johor Bahru' },
    { id: 'kuching', ko: '쿠칭', en: 'Kuching' },
    { id: 'kota-kinabalu', ko: '코타키나발루', en: 'Kota Kinabalu' },
    { id: 'petaling-jaya', ko: '페탈링자야', en: 'Petaling Jaya' },
    { id: 'klang', ko: '클랑', en: 'Klang' },
    { id: 'subang-jaya', ko: '수방자야', en: 'Subang Jaya' },
    { id: 'ampang', ko: '암팡', en: 'Ampang' },
    { id: 'cameron-highlands', ko: '카메론하일랜드', en: 'Cameron Highlands' },
    { id: 'langkawi', ko: '랑카위', en: 'Langkawi' },
  ],

  // CAMBODIA
  KH: [
    { id: 'phnom-penh', ko: '프놈펜', en: 'Phnom Penh' },
    { id: 'siem-reap', ko: '씨엠립', en: 'Siem Reap' },
    { id: 'battambang', ko: '바탐방', en: 'Battambang' },
    { id: 'sihanoukville', ko: '시하누크빌', en: 'Sihanoukville' },
    { id: 'kampong-thom', ko: '캄퐁톰', en: 'Kampong Thom' },
    { id: 'kampong-chhnang', ko: '캄퐁창', en: 'Kampong Chhnang' },
  ],

  // LAOS
  LA: [
    { id: 'vientiane', ko: '비엔티안', en: 'Vientiane' },
    { id: 'luang-prabang', ko: '루앙프라방', en: 'Luang Prabang' },
    { id: 'pakse', ko: '팍세', en: 'Pakse' },
    { id: 'savannakhet', ko: '사반나켓', en: 'Savannakhet' },
    { id: 'vang-vieng', ko: '방비엥', en: 'Vang Vieng' },
  ],

  // MYANMAR
  MM: [
    { id: 'yangon', ko: '양곤', en: 'Yangon' },
    { id: 'naypyidaw', ko: '네피도', en: 'Naypyidaw' },
    { id: 'mandalay', ko: '만달레이', en: 'Mandalay' },
    { id: 'bagan', ko: '바간', en: 'Bagan' },
    { id: 'inle-lake', ko: '인레호수', en: 'Inle Lake' },
    { id: 'tachileik', ko: '타칠렉', en: 'Tachileik' },
  ],

  // PAKISTAN
  PK: [
    { id: 'karachi', ko: '카라치', en: 'Karachi' },
    { id: 'lahore', ko: '라호르', en: 'Lahore' },
    { id: 'islamabad', ko: '이슬라마바드', en: 'Islamabad' },
    { id: 'rawalpindi', ko: '롤핀디', en: 'Rawalpindi' },
    { id: 'faisalabad', ko: '페이살라바드', en: 'Faisalabad' },
    { id: 'multan', ko: '물탄', en: 'Multan' },
    { id: 'peshawar', ko: '페샤와르', en: 'Peshawar' },
    { id: 'gilgit', ko: '길깃', en: 'Gilgit' },
    { id: 'hunza', ko: '훈자', en: 'Hunza' },
  ],

  // BANGLADESH
  BD: [
    { id: 'dhaka', ko: '다카', en: 'Dhaka' },
    { id: 'chittagong', ko: '치타공', en: 'Chittagong' },
    { id: 'khulna', ko: '쿨나', en: 'Khulna' },
    { id: 'rajshahi', ko: '라즈샤히', en: 'Rajshahi' },
    { id: 'sylhet', ko: '실렛', en: 'Sylhet' },
    { id: 'cox-bazar', ko: '콕스바자르', en: 'Cox Bazar' },
    { id: 'sundarbans', ko: '순다르반', en: 'Sundarbans' },
  ],

  // SRI LANKA
  LK: [
    { id: 'colombo', ko: '콜롬보', en: 'Colombo' },
    { id: 'kandy', ko: '캔디', en: 'Kandy' },
    { id: 'galle', ko: '갈레', en: 'Galle' },
    { id: 'negombo', ko: '네고보', en: 'Negombo' },
    { id: 'jaffna', ko: '자프나', en: 'Jaffna' },
    { id: 'sigiriya', ko: '시기리야', en: 'Sigiriya' },
    { id: 'ella', ko: '엘라', en: 'Ella' },
  ],

  // NEPAL
  NP: [
    { id: 'kathmandu', ko: '카트만두', en: 'Kathmandu' },
    { id: 'pokhara', ko: '포카라', en: 'Pokhara' },
    { id: 'bhaktapur', ko: '박타푸르', en: 'Bhaktapur' },
    { id: 'patan', ko: '파탄', en: 'Patan' },
    { id: 'nagarkot', ko: '나가르콧', en: 'Nagarkot' },
    { id: 'nuwakot', ko: '누와콧', en: 'Nuwakot' },
  ],

  // TURKEY
  TR: [
    { id: 'istanbul', ko: '이스탄불', en: 'Istanbul' },
    { id: 'ankara', ko: '앙카라', en: 'Ankara' },
    { id: 'izmir', ko: '이즈미르', en: 'Izmir' },
    { id: 'bursa', ko: '부르사', en: 'Bursa' },
    { id: 'antalya', ko: '안탈야', en: 'Antalya' },
    { id: 'cappadocia', ko: '카파도키아', en: 'Cappadocia' },
    { id: 'ephesus', ko: '에페소스', en: 'Ephesus' },
    { id: 'bodrum', ko: '보드룸', en: 'Bodrum' },
    { id: 'alanya', ko: '알라냐', en: 'Alanya' },
    { id: 'marmaris', ko: '마르마리스', en: 'Marmaris' },
  ],

  // EGYPT
  EG: [
    { id: 'cairo', ko: '카이로', en: 'Cairo' },
    { id: 'giza', ko: '기자', en: 'Giza' },
    { id: 'alexandria', ko: '알렉산드리아', en: 'Alexandria' },
    { id: 'luxor', ko: '룩소르', en: 'Luxor' },
    { id: 'aswan', ko: '아스완', en: 'Aswan' },
    { id: 'hurghada', ko: '후르가다', en: 'Hurghada' },
    { id: 'sharm-el-sheikh', ko: '샤름엘셰이크', en: 'Sharm el-Sheikh' },
  ],

  // GREECE
  GR: [
    { id: 'athens', ko: '아테네', en: 'Athens' },
    { id: 'thessaloniki', ko: '살로니키', en: 'Thessaloniki' },
    { id: 'mykonos', ko: '미코노스', en: 'Mykonos' },
    { id: 'santorini', ko: '산토리니', en: 'Santorini' },
    { id: 'rhodes', ko: '로도스', en: 'Rhodes' },
    { id: 'crete', ko: '크레타', en: 'Crete' },
    { id: 'delphi', ko: '델포이', en: 'Delphi' },
    { id: 'meteora', ko: '메테오라', en: 'Meteora' },
  ],

  // PORTUGAL
  PT: [
    { id: 'lisbon', ko: '리스본', en: 'Lisbon' },
    { id: 'porto', ko: '포르토', en: 'Porto' },
    { id: 'faro', ko: '파루', en: 'Faro' },
    { id: 'covilha', ko: '코빌랑', en: 'Covilhã' },
    { id: 'sintra', ko: '신트라', en: 'Sintra' },
    { id: 'cascais', ko: '카스카이스', en: 'Cascais' },
    { id: 'madeira', ko: '마데이라', en: 'Madeira' },
  ],

  // SWITZERLAND
  CH: [
    { id: 'zurich', ko: '취리히', en: 'Zurich' },
    { id: 'geneva', ko: '제네바', en: 'Geneva' },
    { id: 'bern', ko: '베른', en: 'Bern' },
    { id: 'basel', ko: '바젤', en: 'Basel' },
    { id: 'lausanne', ko: '로잔', en: 'Lausanne' },
    { id: 'lucerne', ko: '루체른', en: 'Lucerne' },
    { id: 'interlaken', ko: '인터라켄', en: 'Interlaken' },
    { id: 'zermatt', ko: '체르마트', en: 'Zermatt' },
    { id: 'st-moritz', ko: '생모리츠', en: 'St. Moritz' },
  ],

  // AUSTRIA
  AT: [
    { id: 'vienna', ko: '빈', en: 'Vienna' },
    { id: 'salzburg', ko: '잘츠부르크', en: 'Salzburg' },
    { id: 'innsbruck', ko: '인스브루크', en: 'Innsbruck' },
    { id: 'graz', ko: '그라츠', en: 'Graz' },
    { id: 'linz', ko: '린츠', en: 'Linz' },
    { id: 'hallstatt', ko: '할슈타트', en: 'Hallstatt' },
  ],

  // BELGIUM
  BE: [
    { id: 'brussels', ko: '브뤼셀', en: 'Brussels' },
    { id: 'antwerp', ko: '앤트워프', en: 'Antwerp' },
    { id: 'bruges', ko: '브뤼헤', en: 'Bruges' },
    { id: 'ghent', ko: '겐트', en: 'Ghent' },
    { id: 'liege', ko: '리에주', en: 'Liège' },
  ],

  // NETHERLANDS
  NL: [
    { id: 'amsterdam', ko: '암스테르담', en: 'Amsterdam' },
    { id: 'rotterdam', ko: '로테르담', en: 'Rotterdam' },
    { id: 'the-hague', ko: '헤이그', en: 'The Hague' },
    { id: 'utrecht', ko: '위트레흐트', en: 'Utrecht' },
    { id: 'groningen', ko: '흐로닝언', en: 'Groningen' },
  ],

  // RUSSIA
  RU: [
    { id: 'moscow', ko: '모스크바', en: 'Moscow' },
    { id: 'saint-petersburg', ko: '상트페테르부르크', en: 'Saint Petersburg' },
    { id: 'novosibirsk', ko: '노보시비르스크', en: 'Novosibirsk' },
    { id: 'yekaterinburg', ko: '예카테린부르크', en: 'Yekaterinburg' },
    { id: 'nizhny-novgorod', ko: '니즈니노브고로드', en: 'Nizhny Novgorod' },
    { id: 'kazan', ko: '카잔', en: 'Kazan' },
    { id: 'chelyabinsk', ko: '첼랴빈스크', en: 'Chelyabinsk' },
    { id: 'sochi', ko: '소치', en: 'Sochi' },
    { id: 'vladivostok', ko: '블라디보스톡', en: 'Vladivostok' },
  ],

  // UKRAINE
  UA: [
    { id: 'kyiv', ko: '키이우', en: 'Kyiv' },
    { id: 'kharkiv', ko: '카르키우', en: 'Kharkiv' },
    { id: 'odesa', ko: '오데사', en: 'Odesa' },
    { id: 'lviv', ko: '리우', en: 'Lviv' },
    { id: 'dnipro', ko: '드니프로', en: 'Dnipro' },
  ],

  // POLAND
  PL: [
    { id: 'warsaw', ko: '바르샤바', en: 'Warsaw' },
    { id: 'krakow', ko: '크라쿠프', en: 'Kraków' },
    { id: 'wroclaw', ko: '브로츠와프', en: 'Wrocław' },
    { id: 'gdansk', ko: '그단스크', en: 'Gdańsk' },
    { id: 'poznań', ko: '포즈난', en: 'Poznań' },
    { id: 'warsaw', ko: '바르샤바', en: 'Warsaw' },
  ],

  // CZECH REPUBLIC
  CZ: [
    { id: 'prague', ko: '프라하', en: 'Prague' },
    { id: 'brno', ko: '브르노', en: 'Brno' },
    { id: 'ostrava', ko: '오스트라바', en: 'Ostrava' },
    { id: 'cesky-krumlov', ko: '체스키크룸로프', en: 'Český Krumlov' },
  ],

  // HUNGARY
  HU: [
    { id: 'budapest', ko: '부다페스트', en: 'Budapest' },
    { id: 'debrecen', ko: '데브레첸', en: 'Debrecen' },
    { id: 'szeged', ko: '세게드', en: 'Szeged' },
    { id: 'pecs', ko: '페치', en: 'Pécs' },
  ],

  // ROMANIA
  RO: [
    { id: 'bucharest', ko: '부쿠레슈티', en: 'Bucharest' },
    { id: 'cluj-napoca', ko: '클루즈나포카', en: 'Cluj-Napoca' },
    { id: 'timisoara', ko: '티미쇼아라', en: 'Timișoara' },
    { id: 'sibiu', ko: '시비우', en: 'Sibiu' },
    { id: 'brașov', ko: '브라쇼브', en: 'Brașov' },
  ],

  // SCANDINAVIA
  SE: [
    { id: 'stockholm', ko: '스톡홀름', en: 'Stockholm' },
    { id: 'gothenburg', ko: '예테보리', en: 'Gothenburg' },
    { id: 'malmo', ko: '말뫼', en: 'Malmö' },
    { id: 'uppsala', ko: '웁살라', en: 'Uppsala' },
  ],
  NO: [
    { id: 'oslo', ko: '오슬로', en: 'Oslo' },
    { id: 'bergen', ko: '베르겐', en: 'Bergen' },
    { id: 'trondheim', ko: '트론헤임', en: 'Trondheim' },
    { id: 'stavanger', ko: '스타방에르', en: 'Stavanger' },
  ],
  FI: [
    { id: 'helsinki', ko: '헬싱키', en: 'Helsinki' },
    { id: 'tampere', ko: '탐페레', en: 'Tampere' },
    { id: 'turku', ko: '투르쿠', en: 'Turku' },
    { id: 'rovaniemi', ko: '로바니에미', en: 'Rovaniemi' },
  ],
  DK: [
    { id: 'copenhagen', ko: '코펜하겐', en: 'Copenhagen' },
    { id: 'aarhus', ko: '오르후스', en: 'Aarhus' },
    { id: 'odense', ko: '오덴세', en: 'Odense' },
  ],
  IS: [
    { id: 'reykjavik', ko: '레이캬비크', en: 'Reykjavík' },
    { id: 'akureyri', ko: '아쿠레이리', en: 'Akureyri' },
    { id: 'blue-lagoon', ko: '블루라군', en: 'Blue Lagoon' },
  ],

  // ARGENTINA
  AR: [
    { id: 'buenos-aires', ko: '부에노스아이레스', en: 'Buenos Aires' },
    { id: 'cordoba', ko: '코르도바', en: 'Córdoba' },
    { id: 'rosario', ko: '로사리오', en: 'Rosario' },
    { id: 'la-plata', ko: '라플라타', en: 'La Plata' },
    { id: 'mendoza', ko: '멘도사', en: 'Mendoza' },
    { id: 'san-juan', ko: '산후안', en: 'San Juan' },
    { id: 'bariloche', ko: '바릴로체', en: 'Bariloche' },
  ],

  // CHILE
  CL: [
    { id: 'santiago', ko: '산티아고', en: 'Santiago' },
    { id: 'valparaiso', ko: '발파라이소', en: 'Valparaíso' },
    { id: 'atacama', ko: '아타카마', en: 'Atacama' },
    { id: 'punta-arenas', ko: '푼타아레나스', en: 'Punta Arenas' },
    { id: 'torres-del-paine', ko: '토레스델파이네', en: 'Torres del Paine' },
  ],

  // PERU
  PE: [
    { id: 'lima', ko: '리마', en: 'Lima' },
    { id: 'cusco', ko: '쿠스코', en: 'Cusco' },
    { id: 'machu-picchu', ko: '마추픽추', en: 'Machu Picchu' },
    { id: 'arequipa', ko: '아레키파', en: 'Arequipa' },
    { id: 'puno', ko: '푸노', en: 'Puno' },
    { id: 'iquitos', ko: '이키토스', en: 'Iquitos' },
  ],

  // COLOMBIA
  CO: [
    { id: 'bogota', ko: '보고타', en: 'Bogotá' },
    { id: 'medellin', ko: '메델린', en: 'Medellín' },
    { id: 'cartagena', ko: '카르타헤나', en: 'Cartagena' },
    { id: 'santa-marta', ko: '산타마르타', en: 'Santa Marta' },
    { id: 'bogota', ko: '보고타', en: 'Bogotá' },
  ],

  // ECUADOR
  EC: [
    { id: 'quito', ko: '키토', en: 'Quito' },
    { id: 'guayaquil', ko: '과야킬', en: 'Guayaquil' },
    { id: 'galapagos', ko: '갈라파고스', en: 'Galápagos' },
    { id: 'otavalo', ko: '오타발로', en: 'Otavalo' },
  ],

  // SOUTH AFRICA
  ZA: [
    { id: 'cape-town', ko: '케이프타운', en: 'Cape Town' },
    { id: 'johannesburg', ko: '요하네스버그', en: 'Johannesburg' },
    { id: 'pretoria', ko: '프리토리아', en: 'Pretoria' },
    { id: 'durban', ko: '더반', en: 'Durban' },
    { id: 'bloemfontein', ko: '블로엠폰테인', en: 'Bloemfontein' },
  ],

  // MOROCCO
  MA: [
    { id: 'casablanca', ko: '카사블랑카', en: 'Casablanca' },
    { id: 'marrakech', ko: '마라케시', en: 'Marrakech' },
    { id: 'fez', ko: '페즈', en: 'Fez' },
    { id: 'tangier', ko: '탕헤르', en: 'Tangier' },
    { id: 'essaouira', ko: '에사우이라', en: 'Essaouira' },
  ],

  // KENYA
  KE: [
    { id: 'nairobi', ko: '나이로비', en: 'Nairobi' },
    { id: 'mombasa', ko: '몸바사', en: 'Mombasa' },
    { id: 'kisumu', ko: '키수무', en: 'Kisumu' },
    { id: 'nakuru', ko: '나쿠루', en: 'Nakuru' },
    { id: 'kericho', ko: '케리초', en: 'Kericho' },
  ],

  // TANZANIA
  TZ: [
    { id: 'dar-es-salaam', ko: '다르에살람', en: 'Dar es Salaam' },
    { id: 'arusha', ko: '아루샤', en: 'Arusha' },
    { id: 'moshi', ko: '모시', en: 'Moshi' },
    { id: 'zanzibar', ko: '잔지바르', en: 'Zanzibar' },
  ],

  // UKRAINE cities (already added above, just completing)
  // ... (additional countries with minimal tourism)
};

export default { WORLD_COUNTRIES, WORLD_CITIES };
