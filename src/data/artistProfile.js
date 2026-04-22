// ─── Artist Profile Data Layer ─────────────────────────────────────────
// 작가가 직접 관리하는 프로필 정보 (스케줄 외)
// localStorage 기반 MVP → 추후 DB 연동 예정
//
// 저장 키: phosnap_profile_{type}_{id}

const profileKey = (type, id) => `phosnap_profile_${type}_${id}`;

// ── 기본 프로필 구조 ──────────────────────────────────────────────────
// {
//   locations: [
//     { id: 'kyoto', name: '교토', nameEn: 'Kyoto', active: true,
//       period: { start: '2026-10-10', end: '2026-10-17' } | null }
//   ],
//   hmk: {
//     selfAvailable: boolean,   // 직접 H&M 작가 동반 가능 여부
//     note: string,             // 추가 설명
//   },
//   props: [
//     { id: string, name: string, note: string }   // 소품 목록
//   ],
//   dresses: [
//     { id: string, name: string, sizes: string[], note: string }  // 드레스 + 사이즈
//   ],
//   portfolio: [
//     { id: string, url: string, caption: string }  // 포트폴리오 이미지 URL
//   ],
//   paymentInfo: {
//     bankName: string,         // 은행명 (내부 정산용 — 고객에게 직접 노출 안 함)
//     accountNumber: string,    // 계좌번호 (내부용)
//     accountHolder: string,    // 예금주
//     note: string,
//   }
// }

// ── Mock 초기 데이터 ───────────────────────────────────────────────────
const seedProfileData = () => {
  const defaultProfile = {
    locations: [
      { id: 'busan',  name: '부산',  nameEn: 'Busan',  active: true,  period: null },
    ],
    hmk: { selfAvailable: false, note: '' },
    props: [],
    dresses: [],
    portfolio: [],
    paymentInfo: { bankName: '', accountNumber: '', accountHolder: '', note: '' },
  };

  // 작가 1: 교토 임시 활동 예시 포함
  const profile1 = {
    ...defaultProfile,
    locations: [
      { id: 'kyoto', name: '교토', nameEn: 'Kyoto', active: true,  period: { start: '2026-10-10', end: '2026-10-17' } },
      { id: 'busan', name: '부산', nameEn: 'Busan', active: true,  period: null },
    ],
    hmk: { selfAvailable: true, note: '동료 헤어메이크업 작가 동반 가능 (별도 문의)' },
    props: [
      { id: 'p1', name: '베일', note: '화이트, 플로팅 베일 1종' },
      { id: 'p2', name: '꽃 소품', note: '드라이플라워 부케 · 생화 부케 중 선택' },
    ],
    dresses: [
      { id: 'd1', name: '아이보리 드레스 A', sizes: ['55', '66', '77'], note: '플로우 라인, 끈 조절 가능' },
      { id: 'd2', name: '화이트 미니 드레스', sizes: ['44', '55'], note: '숏 타입, 교토 거리 촬영 추천' },
    ],
    portfolio: [
      { id: 'pf1', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', caption: '교토 기온 거리' },
      { id: 'pf2', url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80', caption: '벚꽃 스냅' },
      { id: 'pf3', url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80', caption: '실내 스튜디오' },
    ],
    paymentInfo: { bankName: '', accountNumber: '', accountHolder: '', note: '카드/간편결제로만 수령' },
  };

  // ── H&M 작가 27: 김유나 — 메인 서울, 해외 도쿄 ──
  const profile27 = {
    ...defaultProfile,
    locations: [
      { id: 'loc-27-1', locType: 'domestic', regionId: 'seoul', name: '서울', nameEn: 'Seoul', active: true, isMain: true, period: null },
      { id: 'loc-27-2', locType: 'overseas', regionId: 'tokyo', name: '도쿄', nameEn: 'Tokyo', active: true, isMain: false, period: { start: '2026-04-13', end: '2026-05-20', savedAt: '2026-04-13 09:00' } },
    ],
  };

  // ── H&M 작가 28: 박하나 — 메인 인천, 해외 교토 ──
  const profile28 = {
    ...defaultProfile,
    locations: [
      { id: 'loc-28-1', locType: 'domestic', regionId: 'incheon', name: '인천', nameEn: 'Incheon', active: true, isMain: true, period: null },
      { id: 'loc-28-2', locType: 'overseas', regionId: 'kyoto', name: '교토', nameEn: 'Kyoto', active: true, isMain: false, period: { start: '2026-04-13', end: '2026-05-20', savedAt: '2026-04-13 09:00' } },
    ],
  };

  // ── H&M 작가 29: 아오이 린 — 메인 도쿄, 해외 삿포로 ──
  const profile29 = {
    ...defaultProfile,
    locations: [
      { id: 'loc-29-1', locType: 'overseas', regionId: 'tokyo', name: '도쿄', nameEn: 'Tokyo', active: true, isMain: true, period: null },
      { id: 'loc-29-2', locType: 'overseas', regionId: 'sapporo', name: '삿포로', nameEn: 'Sapporo', active: true, isMain: false, period: { start: '2026-04-13', end: '2026-05-20', savedAt: '2026-04-13 09:00' } },
    ],
  };

  // ── 영상작가 30: 한시우 — 메인 부산, 해외 베네치아 ──
  const profile30 = {
    ...defaultProfile,
    locations: [
      { id: 'loc-30-1', locType: 'domestic', regionId: 'busan', name: '부산', nameEn: 'Busan', active: true, isMain: true, period: null },
      { id: 'loc-30-2', locType: 'overseas', regionId: 'venice', name: '베네치아', nameEn: 'Venice', active: true, isMain: false, period: { start: '2026-04-13', end: '2026-05-20', savedAt: '2026-04-13 09:00' } },
    ],
  };

  const seedMap = { 1: profile1, 27: profile27, 28: profile28, 29: profile29, 30: profile30 };

  [1, 2, 3, 4, 27, 28, 29, 30].forEach(id => {
    const key = profileKey('photographer', id);
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(seedMap[id] || defaultProfile));
    }
  });
};

// ── 공개 API ─────────────────────────────────────────────────────────

export const getProfile = (type, id) => {
  try {
    const raw = localStorage.getItem(profileKey(type, id));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    locations: [],
    hmk: { selfAvailable: false, note: '' },
    props: [], dresses: [], portfolio: [],
    paymentInfo: { bankName: '', accountNumber: '', accountHolder: '', note: '' },
  };
};

export const saveProfile = (type, id, profile) => {
  localStorage.setItem(profileKey(type, id), JSON.stringify(profile));
};

/**
 * 목(mock) 데이터 + localStorage 저장 데이터 병합
 * 고객 화면에서 작가가 편집한 최신 데이터를 보여주기 위한 헬퍼
 * @param {Object} mockData - photographers.js 등에서 온 기본 데이터
 * @param {string} type - 'photographer' | 'videographer' | 'stylist'
 * @param {number|string} id - 작가 ID
 * @returns {Object} 병합된 프로필
 */
export const getMergedProfile = (mockData, type, id) => {
  if (!mockData) return null;
  try {
    const raw = localStorage.getItem(profileKey(type, id));
    if (!raw) return mockData;
    const saved = JSON.parse(raw);
    // 작가가 저장한 필드가 있으면 덮어쓰기, 없는 필드는 mock 유지
    return {
      ...mockData,
      ...saved,
      // mock 전용 필드는 항상 유지 (id, name, nameEn, avatar 등 기본 정보)
      id: mockData.id,
      name: saved.name || mockData.name,
      nameEn: saved.nameEn || mockData.nameEn,
      avatar: saved.avatar || mockData.avatar,
      coverImage: saved.coverImage || mockData.coverImage,
      // 배열 필드: 저장 데이터가 있으면 우선, 없으면 mock 유지
      portfolio: saved.portfolio?.length > 0 ? saved.portfolio : mockData.portfolio,
      packages: saved.snapProducts?.length > 0
        ? saved.snapProducts.map(sp => ({
            id: sp.id,
            name: sp.name || '스냅 촬영',
            duration: sp.duration || '1시간',
            editedCount: sp.editedCount || '',
            price: Number(sp.price) || 0,
            desc: sp.desc || '',
            images: sp.images || [],
          }))
        : mockData.packages,
      tours: saved.tours?.length > 0 ? saved.tours : mockData.tours,
      props: saved.props?.length > 0 ? saved.props : mockData.props,
      costumes: saved.costumes?.length > 0 ? saved.costumes : (mockData.costumes || mockData.dresses),
      hmk: saved.hmk?.selfAvailable !== undefined ? saved.hmk : mockData.hmk,
      locations: saved.locations?.length > 0 ? saved.locations : mockData.locations,
      hourlyRate: saved.hourlyRate ?? mockData.hourlyRate,
      hourlyRateEnabled: saved.hourlyRateEnabled ?? mockData.hourlyRateEnabled,
    };
  } catch {
    return mockData;
  }
};

// ── 마지막 로그인 시간 기록 ──
const LAST_LOGIN_KEY = (id) => `phosnap_lastLogin_${id}`;
const INACTIVE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 2주

export const recordLogin = (id) => {
  localStorage.setItem(LAST_LOGIN_KEY(id), new Date().toISOString());
};

export const getLastLogin = (id) => {
  return localStorage.getItem(LAST_LOGIN_KEY(id)) || null;
};

// 2주 이상 미로그인 시 전체 활동 지역 노출 OFF 처리
// 로그인 시 호출하여 체크
export const checkInactiveAutoOff = (type, id) => {
  const lastLogin = getLastLogin(id);
  if (!lastLogin) {
    // 최초 로그인 기록
    recordLogin(id);
    return false;
  }
  const elapsed = Date.now() - new Date(lastLogin).getTime();
  if (elapsed >= INACTIVE_THRESHOLD_MS) {
    // 2주 이상 미로그인 → 전체 지역 노출 OFF
    const profile = getProfile(type, id);
    if (profile?.locations?.length > 0) {
      const hasActive = profile.locations.some(l => l.active !== false);
      if (hasActive) {
        const updated = {
          ...profile,
          locations: profile.locations.map(l => ({ ...l, active: false })),
          _inactiveAutoOff: true, // 자동 OFF 표시
          _inactiveAutoOffDate: new Date().toISOString(),
        };
        saveProfile(type, id, updated);
        recordLogin(id); // 로그인 시간 갱신
        return true; // 자동 OFF 발생 알림
      }
    }
    recordLogin(id);
    return false;
  }
  // 활성 상태 → 로그인 시간 갱신
  recordLogin(id);
  return false;
};

export const initProfiles = () => {
  try { seedProfileData(); } catch {}
};
