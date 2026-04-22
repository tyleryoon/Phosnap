// ─── Collabo System ─────────────────────────────────────────────────
// 작가 간 콜라보레이션 제의 · 매칭 시스템
// MVP: localStorage 기반

// ── 상수 ──
export const COLLABO_RULES = {
  // 보완형 콜라보 (사진+영상, 사진+헤메, 영상+헤메)
  maxProposalsPerMonth: 10,    // 월 최대 수락 횟수
  maxDailyProposals: 3,        // 하루 제안 발송 제한
  // 확장형 콜라보 (동종: 사진+사진, 영상+영상)
  maxSameTypePerMonth: 3,      // 동종 콜라보 월 최대 횟수
  sameTypeRequiresRole: true,  // 동종 콜라보 시 메인/서브 역할 지정 필수
  // 공통
  rejectDoesNotCount: true,     // 거절 · 미응답 시 차감 안 함
  consecutiveDaysAsOne: true,   // 연속일 제의 = 1회 차감
  autoExpireDays: 7,            // 미응답 시 7일 후 자동 만료
  cooldownSamePerson: 7,        // 같은 사람에게 재제의 쿨다운 7일
};

// ── 작가 등급 시스템 (Badge Progress) ──
// 기준: 누적 완료 건수 + 평균 평점
export const ARTIST_TIERS = {
  rising:      { ko: 'Rising',      en: 'Rising',      icon: '✦',    stars: '✦',       minShoots: 0,   minRating: 0,   feeNormal: 20, feeCollabo: 18, benefits: '기본 프로필 노출, 예약 수신' },
  established: { ko: 'Established', en: 'Established', icon: '✦✦',   stars: '✦✦',      minShoots: 30,  minRating: 4.0, feeNormal: 15, feeCollabo: 13, benefits: '검색 우선 노출, 뱃지 표시, 콜라보 제의 +2회/월' },
  premier:     { ko: 'Premier',     en: 'Premier',     icon: '✦✦✦',  stars: '✦✦✦',     minShoots: 100, minRating: 4.5, feeNormal: 12, feeCollabo: 10, benefits: '홈 추천 등록, 수수료 12%, 즉시예약 활성화' },
  elite:       { ko: 'Elite',       en: 'Elite',       icon: '✦✦✦✦', stars: '✦✦✦✦',    minShoots: 300, minRating: 4.7, feeNormal: 12, feeCollabo: 10, benefits: '최우선 노출, 수수료 12%, 전용 매니저 배정' },
};

// 등급 색상
export const TIER_COLORS = {
  rising:      'var(--muted)',
  established: '#60a5fa',     // 파란색
  premier:     'var(--gold)',  // 골드
  elite:       '#c084fc',     // 보라색
};

// 작가 등급 판별 (높은 등급부터 체크 — 건수 + 평점 모두 충족 필요)
export const getArtistTier = (shoots, rating = 0) => {
  if (shoots >= 300 && rating >= 4.7) return 'elite';
  if (shoots >= 100 && rating >= 4.5) return 'premier';
  if (shoots >= 30  && rating >= 4.0) return 'established';
  return 'rising';
};

// 작가의 수수료율 조회
export const getArtistFees = (shoots, rating = 0) => {
  const tier = getArtistTier(shoots, rating);
  const info = ARTIST_TIERS[tier];
  return { tier, feeNormal: info.feeNormal, feeCollabo: info.feeCollabo };
};

// 다음 등급까지 남은 조건
export const getNextTierProgress = (shoots, rating = 0) => {
  const tier = getArtistTier(shoots, rating);
  const tierOrder = ['rising', 'established', 'premier', 'elite'];
  const idx = tierOrder.indexOf(tier);
  if (idx >= tierOrder.length - 1) return null; // 이미 최고 등급
  const next = ARTIST_TIERS[tierOrder[idx + 1]];
  return {
    nextTier: tierOrder[idx + 1],
    nextTierInfo: next,
    shootsNeeded: Math.max(0, next.minShoots - shoots),
    ratingNeeded: Math.max(0, +(next.minRating - rating).toFixed(1)),
  };
};

// ── 작가 유형 ──
export const ARTIST_TYPES = {
  photographer: { ko: '사진작가', en: 'Photographer', icon: '📸' },
  videographer: { ko: '영상작가', en: 'Videographer', icon: '🎬' },
  both:         { ko: '사진·영상 작가', en: 'Photo & Video', icon: '📸🎬' },
  hmua:         { ko: 'H&M 작가', en: 'H&M Artist', icon: '💄' },
};

// ── 콜라보 가능 조합 ──
// 보완형: 무제한 허용 / 확장형(동종): 조건부 허용
export const COLLABO_MATRIX = {
  photographer: ['videographer', 'hmua', 'both', 'photographer'],  // +동종 허용
  videographer: ['photographer', 'hmua', 'both', 'videographer'],  // +동종 허용
  both:         ['videographer', 'hmua', 'photographer', 'both'],
  hmua:         ['photographer', 'videographer', 'both', 'hmua'],
};

// ── 동종 콜라보 여부 판별 ──
export const isSameTypeCollabo = (myType, theirType) => {
  // photographer-photographer, videographer-videographer, hmua-hmua
  if (myType === theirType) return true;
  // both는 photographer/videographer와 동종 취급
  if (myType === 'both' && (theirType === 'photographer' || theirType === 'videographer')) return true;
  if (theirType === 'both' && (myType === 'photographer' || myType === 'videographer')) return true;
  return false;
};

// ── 콜라보 역할 ──
export const COLLABO_ROLES = {
  main: { ko: '메인', en: 'Main' },
  sub:  { ko: '서브', en: 'Sub' },
};

// ── 제의 상태 ──
export const PROPOSAL_STATUS = {
  pending:  { ko: '대기 중', en: 'Pending',  color: 'var(--gold)' },
  accepted: { ko: '수락',   en: 'Accepted', color: '#22c55e' },
  rejected: { ko: '거절',   en: 'Rejected', color: '#e85d5d' },
  expired:  { ko: '만료',   en: 'Expired',  color: 'var(--muted)' },
};

// ── Storage helpers ──
const STORAGE_KEY = 'phosnap_collabo';

const loadAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { proposals: [], notifications: [] };
  } catch { return { proposals: [], notifications: [] }; }
};
const saveAll = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// ── 이번 달 제의 횟수 계산 (연속일 = 1회) ──
export const getMonthlyProposalCount = (artistId) => {
  const { proposals } = loadAll();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 이번 달 내가 보낸 수락된 제의
  const mine = proposals
    .filter(p => p.fromId === artistId && p.createdAt?.startsWith(thisMonth) && p.status === 'accepted')
    .sort((a, b) => a.dates[0].localeCompare(b.dates[0]));

  let count = 0;
  let lastEndDate = null;
  for (const p of mine) {
    const startDate = p.dates[0];
    if (lastEndDate && isConsecutive(lastEndDate, startDate)) {
      lastEndDate = p.dates[p.dates.length - 1];
    } else {
      count++;
      lastEndDate = p.dates[p.dates.length - 1];
    }
  }
  return count;
};

// ── 동종 콜라보 월 횟수 ──
export const getMonthlySameTypeCount = (artistId, myType) => {
  const { proposals } = loadAll();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return proposals.filter(p =>
    p.fromId === artistId &&
    p.createdAt?.startsWith(thisMonth) &&
    p.status === 'accepted' &&
    p.isSameType
  ).length;
};

// ── 오늘 제안 발송 횟수 ──
export const getDailyProposalCount = (artistId) => {
  const { proposals } = loadAll();
  const today = new Date().toISOString().slice(0, 10);
  return proposals.filter(p => p.fromId === artistId && p.createdAt === today).length;
};

// ── 같은 사람 쿨다운 체크 ──
export const checkCooldown = (fromId, toId) => {
  const { proposals } = loadAll();
  const cooldown = COLLABO_RULES.cooldownSamePerson;
  if (!cooldown) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cooldown);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = proposals.find(p =>
    p.fromId === fromId && p.toId === toId && p.createdAt >= cutoffStr
  );
  return !recent; // true = 쿨다운 통과
};

// 두 날짜가 연속인지 (1일 차이)
const isConsecutive = (dateA, dateB) => {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diff = Math.abs(b - a) / (1000 * 60 * 60 * 24);
  return diff <= 1;
};

export const getRemainingProposals = (artistId) => {
  return COLLABO_RULES.maxProposalsPerMonth - getMonthlyProposalCount(artistId);
};

// ── 콜라보 제의 생성 ──
export const createProposal = (fromId, toId, { dates, locationId, message, role, collaboRole, isSameType: sameType }) => {
  const data = loadAll();

  // 하루 제안 제한
  const dailyCount = getDailyProposalCount(fromId);
  if (dailyCount >= COLLABO_RULES.maxDailyProposals) {
    return { error: 'daily_limit', message: `하루 최대 ${COLLABO_RULES.maxDailyProposals}회까지 제안할 수 있습니다.` };
  }

  // 쿨다운 체크
  if (!checkCooldown(fromId, toId)) {
    return { error: 'cooldown', message: `같은 작가에게 ${COLLABO_RULES.cooldownSamePerson}일 이내 재요청할 수 없습니다.` };
  }

  // 동종 콜라보 역할 필수 체크
  if (sameType && COLLABO_RULES.sameTypeRequiresRole && !collaboRole) {
    return { error: 'role_required', message: '동종 콜라보 시 메인/서브 역할을 지정해주세요.' };
  }

  const proposal = {
    id: Math.random().toString(36).substring(2, 10),
    fromId,
    toId,
    dates: Array.isArray(dates) ? dates.sort() : [dates],
    locationId,
    message: message || '',
    role: role || '',           // 요청자 타입 (예: 'photographer', 'hmua')
    collaboRole: collaboRole || '',  // 콜라보 역할 ('main' | 'sub')
    isSameType: !!sameType,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10),
    respondedAt: null,
    rejectReason: '',
    revenueShare: sameType ? { main: 60, sub: 40 } : null,  // 동종 기본 분배
  };

  data.proposals.push(proposal);

  // 알림 생성
  data.notifications.push({
    id: Math.random().toString(36).substring(2, 10),
    targetId: toId,
    type: 'collabo_proposal',
    proposalId: proposal.id,
    read: false,
    createdAt: proposal.createdAt,
  });

  saveAll(data);
  return { ok: true, proposal };
};

// ── 제의 응답 (수락 / 거절) ──
export const respondToProposal = (proposalId, status, rejectReason = '') => {
  const data = loadAll();
  const idx = data.proposals.findIndex(p => p.id === proposalId);
  if (idx < 0) return { error: 'not_found' };

  // 동종 콜라보 수락 시 월 횟수 체크
  if (status === 'accepted' && data.proposals[idx].isSameType) {
    const fromId = data.proposals[idx].fromId;
    const count = getMonthlySameTypeCount(fromId, data.proposals[idx].role);
    if (count >= COLLABO_RULES.maxSameTypePerMonth) {
      return { error: 'same_type_limit', message: `동종 콜라보는 월 ${COLLABO_RULES.maxSameTypePerMonth}회까지 가능합니다.` };
    }
  }

  data.proposals[idx].status = status; // 'accepted' | 'rejected'
  data.proposals[idx].respondedAt = new Date().toISOString().slice(0, 10);
  data.proposals[idx].rejectReason = rejectReason;

  // 알림 (제의자에게)
  data.notifications.push({
    id: Math.random().toString(36).substring(2, 10),
    targetId: data.proposals[idx].fromId,
    type: status === 'accepted' ? 'collabo_accepted' : 'collabo_rejected',
    proposalId,
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });

  saveAll(data);
  return { ok: true };
};

// ── 내가 보낸 / 받은 제의 조회 ──
export const getSentProposals = (artistId) => {
  return loadAll().proposals.filter(p => p.fromId === artistId);
};
export const getReceivedProposals = (artistId) => {
  return loadAll().proposals.filter(p => p.toId === artistId);
};
export const getPendingReceived = (artistId) => {
  return loadAll().proposals.filter(p => p.toId === artistId && p.status === 'pending');
};

// ── 알림 조회 ──
export const getNotifications = (artistId) => {
  return loadAll().notifications.filter(n => n.targetId === artistId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
export const markNotificationRead = (notifId) => {
  const data = loadAll();
  const n = data.notifications.find(n => n.id === notifId);
  if (n) n.read = true;
  saveAll(data);
};

// ── 콜라보 가능 작가 검색 (같은 지역 + 호환 타입) ──
export const canCollabo = (myType, theirType) => {
  return (COLLABO_MATRIX[myType] || []).includes(theirType);
};

// ── 만료 처리 ──
export const expireOldProposals = () => {
  const data = loadAll();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COLLABO_RULES.autoExpireDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let changed = false;
  data.proposals.forEach(p => {
    if (p.status === 'pending' && p.createdAt < cutoffStr) {
      p.status = 'expired';
      changed = true;
    }
  });
  if (changed) saveAll(data);
};
