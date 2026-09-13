// ─── 테스트 계정 시드 ───────────────────────────────────────────────────
//
// 목록·필터·사진이 실제로 어떻게 보이는지 확인하려면 데이터가 있어야 한다.
// 작가 1명·헤메 1명으로는 판단할 수가 없다.
//
// 쓰는 법 (프로젝트 루트에서)
//
//   SUPABASE_URL=https://znjkyvijjlahsxczweqh.supabase.co \
//   SUPABASE_SERVICE_KEY=<Supabase 대시보드 > Settings > API > service_role> \
//   SEED_PASSWORD=<테스트 계정 공통 비밀번호> \
//   node scripts/seed-test-accounts.mjs
//
//   개수를 바꾸려면  SEED_COUNT=10  (기본 10)
//
// ⚠ 비밀번호와 service_role key 는 **이 파일에 적지 않는다.**
//   적으면 GitHub 에 그대로 올라간다. 실행할 때만 환경변수로 준다.
//   service_role key 는 RLS 를 전부 우회하므로 절대 커밋하지 않는다.
//
// ⚠ 실서비스 DB 에 돌리지 않는다. 만드는 계정은 전부
//   (customer|photo|video|both|hnm|vendor)N@gmail.com 형식이고,
//   CLEANUP_TEST_ACCOUNTS.sql 로 한 번에 지울 수 있다.
//
// 메일에 대해
//   실제로 존재하지 않는 gmail 주소들이라 알림을 보내면 전부 반송된다.
//   반송이 쌓이면 도메인 평판이 떨어져 **정상 메일까지 스팸으로 간다.**
//   그래서 시드 계정은 profiles.email_bounced_at 을 미리 채워
//   발송 대상에서 제외한다 (FIX_32 의 워커가 이 값을 본다).
//   로그인은 정상적으로 된다.
//
// 사진에 대해
//   picsum.photos 를 쓴다. seed 기반이라 같은 계정은 늘 같은 사진이 나오고,
//   별도 업로드가 필요 없다. 실제 작가 사진이 아님이 분명하다.

const URL   = process.env.SUPABASE_URL;
const KEY   = process.env.SUPABASE_SERVICE_KEY;
const PW    = process.env.SEED_PASSWORD;
const COUNT = Number(process.env.SEED_COUNT || 10);

if (!URL || !KEY || !PW) {
  console.error(`
필요한 환경변수가 없습니다.

  SUPABASE_URL           https://<project>.supabase.co
  SUPABASE_SERVICE_KEY   Supabase 대시보드 > Settings > API > service_role
  SEED_PASSWORD          테스트 계정 공통 비밀번호

예시
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SEED_PASSWORD=... node scripts/seed-test-accounts.mjs
`);
  process.exit(1);
}

const LOCATIONS = ['seoul', 'busan', 'jeju', 'incheon', 'gyeongju'];
const LANGS     = [['KO'], ['KO', 'EN'], ['KO', 'EN', 'JP'], ['KO', 'CN']];

// 운영 시간 — 넉넉하게 열어둔다. 촬영 길이별 테스트를 하려면 폭이 있어야 한다.
const SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

const img = (seed, w = 900, h = 700) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

// ── 조합을 골고루 섞는다 ────────────────────────────────────────────────
// 같은 값만 나오면 "자체 헤메 있는 작가" 같은 경우를 못 본다.
const pick = (arr, i) => arr[i % arr.length];
const flag = (i, every) => i % every === 0;

let ok = 0, fail = 0;
const failures = [];

const api = async (path, { method = 'POST', body, prefer } = {}) => {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* 본문이 JSON 이 아닐 수 있다 */ }
  if (!res.ok) {
    const msg = json?.message || json?.msg || json?.error_description || text.slice(0, 200);
    throw new Error(`${res.status} ${path} — ${msg}`);
  }
  return json;
};

/** 계정 하나. 이미 있으면 그 id 를 찾아 쓴다 (여러 번 실행 가능). */
const ensureUser = async (email) => {
  try {
    const u = await api('/auth/v1/admin/users', {
      body: { email, password: PW, email_confirm: true },
    });
    return { id: u.id, created: true };
  } catch (e) {
    if (!/already|exists|registered/i.test(e.message)) throw e;
    // 이미 있는 계정을 찾는다.
    const list = await api(
      `/auth/v1/admin/users?per_page=1&page=1&filter=${encodeURIComponent(email)}`,
      { method: 'GET' },
    );
    const found = (list?.users || []).find(x => x.email === email);
    if (!found) throw new Error(`이미 있다는데 찾지 못했습니다: ${email}`);
    return { id: found.id, created: false };
  }
};

const upsert = (table, rows, onConflict) =>
  api(`/rest/v1/${table}${onConflict ? `?on_conflict=${onConflict}` : ''}`, {
    body: rows,
    prefer: `resolution=merge-duplicates,return=representation`,
  });

const insert = (table, rows) =>
  api(`/rest/v1/${table}`, { body: rows, prefer: 'return=representation' });

/** 포트폴리오 3게시물 × 5장. 맨 앞이 대표. */
const buildPortfolio = (key, region) =>
  [0, 1, 2].map(g => ({
    id: `${key}-post-${g}`,
    images: [0, 1, 2, 3, 4].map(n => img(`${key}-${g}-${n}`)),
    coverIdx: 0,
    caption: ['야외 스냅', '스튜디오 촬영', '웨딩 촬영'][g],
    regionId: region,
  }));

const seedOne = async (kind, i) => {
  const n     = i + 1;
  const email = `${kind}${n}@gmail.com`;
  const region = pick(LOCATIONS, i);
  const { id: uid } = await ensureUser(email);

  // 실제로 없는 주소다. 알림 발송 대상에서 빼둔다 (위 주석 참조).
  const roleForProfile =
    kind === 'customer' ? 'customer'
    : kind === 'hnm'    ? 'stylist'
    : kind === 'vendor' ? 'vendor'
    : 'artist';

  await upsert('profiles', [{
    id: uid,
    email,
    full_name: `${kind}${n}`,
    role: roleForProfile,
    lang: 'ko',
    email_bounced_at: new Date().toISOString(),
    email_bounce_reason: '테스트 계정 — 발송 제외',
  }], 'id');

  if (kind === 'customer') return;

  await upsert('user_roles', [{
    user_id: uid, role: roleForProfile, status: 'active',
  }], 'user_id,role');

  // ── 작가 ──
  if (kind === 'photo' || kind === 'video' || kind === 'both') {
    const artistType = kind === 'photo' ? 'photographer'
                     : kind === 'video' ? 'videographer' : 'both';
    const hmkSelf   = flag(i, 3);    // 3명 중 1명은 자체 헤메
    const dressSelf = flag(i, 4);    // 4명 중 1명은 자체 의상

    const [p] = await upsert('photographers', [{
      user_id: uid,
      name: `${kind}${n}`,
      name_ko: `${kind === 'photo' ? '사진' : kind === 'video' ? '영상' : '종합'}작가${n}`,
      artist_type: artistType,
      location_id: region,
      img: img(`${kind}${n}-avatar`, 400, 400),
      portfolio: buildPortfolio(`${kind}${n}`, region),
      languages: pick(LANGS, i),
      hmk_self: hmkSelf,
      dress_self: dressSelf,
    }], 'user_id');

    await upsert('provider_defaults', [{
      provider_type: 'photographer', provider_id: p.id,
      default_slots: SLOTS, weekly_off: [],
    }], 'provider_type,provider_id');

    // 촬영 상품 — 길이를 섞어야 '4시간으로 조회' 같은 필터를 볼 수 있다
    const hoursSet = [[2, 3], [3, 4], [2, 4], [2, 3, 4]][i % 4];
    await insert('packages', hoursSet.map((h, k) => ({
      photographer_id: p.id,
      type: 'snap',
      name: `${h}시간 ${['데이','골든아워','스튜디오'][k % 3]} 패키지`,
      price: 150000 + h * 50000 + (i % 5) * 10000,
      duration_hours: h,
      description: `${h}시간 촬영. 보정본 ${h * 15}장 전달.`,
      images: [img(`${kind}${n}-pkg-${h}`)],
      is_active: true,
    })));

    if (hmkSelf) {
      await insert('packages', [{
        photographer_id: p.id, type: 'hmk',
        name: '작가 제공 헤어메이크업',
        price: 80000 + (i % 4) * 10000,
        description: '촬영 전 현장에서 진행합니다.',
        is_active: true,
      }]);
    }
    if (dressSelf) {
      await insert('packages', [{
        photographer_id: p.id, type: 'costume',
        name: pick(['작가 보유 한복', '작가 보유 드레스', '작가 보유 정장'], i),
        price: 60000 + (i % 3) * 20000,
        sizes: ['S', 'M', 'L'],
        images: [img(`${kind}${n}-dress`)],
        is_active: true,
      }]);
    }
    return;
  }

  // ── 헤메 ──
  if (kind === 'hnm') {
    const dressSelf = flag(i, 2);    // 절반은 자체 의상 보유

    const [s] = await upsert('stylists', [{
      user_id: uid,
      name_ko: `헤메${n}`,
      display_name: `헤메${n}`,
      specialty: pick(['웨딩 전문', '한복 전문', '내추럴 메이크업', '화보 메이크업'], i),
      location_id: region,
      portfolio_images: [0, 1, 2, 3, 4].map(k => img(`hnm${n}-${k}`)),
      dress_self: dressSelf,
    }], 'user_id');

    await upsert('provider_defaults', [{
      provider_type: 'stylist', provider_id: s.id,
      default_slots: SLOTS, weekly_off: [],
    }], 'provider_type,provider_id');

    await insert('stylist_services', [
      { stylist_id: s.id, name_ko: '웨딩 헤어메이크업', price: 100000 + (i % 5) * 20000,
        duration_minutes: 90, timing: 'before', offset_minutes: 30, is_active: true },
      { stylist_id: s.id, name_ko: '헤어 변형 (촬영 중)', price: 40000 + (i % 3) * 10000,
        duration_minutes: 30, timing: 'during', offset_minutes: 30, is_active: true },
      // 종일 동행은 max_hours 가 있어야 한다 (VERIFY 가 검사한다)
      { stylist_id: s.id, name_ko: '종일 동행', price: 250000 + (i % 4) * 30000,
        duration_minutes: 60, timing: 'full', offset_minutes: 0,
        max_hours: pick([4, 5, 8], i), is_active: true },
    ]);

    if (dressSelf) {
      await insert('dress_items', [0, 1].map(k => ({
        stylist_id: s.id, vendor_id: null,
        name_ko: `헤메${n} 보유 ${['한복','드레스'][k]}`,
        category: k === 0 ? 'hanbok' : 'dress',
        price: 70000 + k * 30000,
        sizes: ['S', 'M', 'L'],
        size_stock: { S: 1, M: 2, L: 1 },
        images: [img(`hnm${n}-dress-${k}`)],
        image_url: img(`hnm${n}-dress-${k}`),
        is_available: true,
      })));
    }
    return;
  }

  // ── 벤더 — 의상만 / 장소만 / 둘 다 ──
  if (kind === 'vendor') {
    const mode = i % 3;                    // 0=의상만 1=장소만 2=둘 다
    const hasDress = mode === 0 || mode === 2;
    const hasVenue = mode === 1 || mode === 2;

    if (hasDress) {
      const [v] = await upsert('dress_vendors', [{
        user_id: uid,
        name: `의상벤더${n}`, name_ko: `의상벤더${n}`,
        vendor_type: hasVenue ? 'costume,venue' : 'costume',
        location_id: region,
        img: img(`vendor${n}-shop`, 600, 400),
        intro: '한복·드레스 대여 전문',
      }], 'user_id');

      await upsert('provider_defaults', [{
        provider_type: 'dress', provider_id: v.id,
        default_slots: SLOTS, weekly_off: [],
      }], 'provider_type,provider_id');

      await insert('dress_items', [0, 1, 2].map(k => ({
        vendor_id: v.id, stylist_id: null,
        name_ko: `${['전통 한복','웨딩 드레스','남성 정장'][k]} ${n}`,
        category: ['hanbok', 'dress', 'suit'][k],
        price: 80000 + k * 40000 + (i % 4) * 5000,
        sizes: ['S', 'M', 'L'],
        size_stock: { S: 2, M: 3, L: 2 },
        color: ['아이보리', '네이비', '블랙'][k],
        images: [0, 1, 2].map(q => img(`vendor${n}-d${k}-${q}`)),
        image_url: img(`vendor${n}-d${k}-0`),
        description: '촬영 당일 대여. 세탁비 포함.',
        is_available: true,
      })));
    }

    if (hasVenue) {
      const [vv] = await upsert('venue_vendors', [{
        user_id: uid,
        name: `장소벤더${n}`, name_ko: `장소벤더${n}`,
        location_id: region,
        img: img(`venue${n}-cover`, 800, 600),
        bio: '촬영 전용 공간',
      }], 'user_id');

      await upsert('provider_defaults', [{
        provider_type: 'venue', provider_id: vv.id,
        default_slots: SLOTS, weekly_off: [],
      }], 'provider_type,provider_id');

      await insert('venue_items', [0, 1].map(k => ({
        vendor_id: vv.id,
        name: `${['한옥 스튜디오','화이트 스튜디오'][k]} ${n}호`,
        category: k === 0 ? 'traditional_space' : 'studio',
        capacity: 6 + k * 4,
        price: 120000 + k * 60000 + (i % 3) * 10000,
        price_unit: 'per_session',
        images: [0, 1, 2, 3].map(q => ({ url: img(`venue${n}-${k}-${q}`) })),
        description: '자연광이 좋은 공간입니다.',
        amenities: ['parking', 'dressing', 'restroom', 'aircon'].slice(0, 2 + (i % 3)),
        is_available: true,
      })));
    }
  }
};

const run = async () => {
  const kinds = ['customer', 'photo', 'video', 'both', 'hnm', 'vendor'];
  console.log(`\n${URL}\n각 ${COUNT}개씩 · 총 ${kinds.length * COUNT}계정\n`);

  for (const kind of kinds) {
    for (let i = 0; i < COUNT; i++) {
      const label = `${kind}${i + 1}@gmail.com`;
      try {
        await seedOne(kind, i);
        ok++;
        process.stdout.write(`✓ ${label}\n`);
      } catch (e) {
        fail++;
        failures.push(`${label} — ${e.message}`);
        process.stdout.write(`✗ ${label} — ${e.message}\n`);
      }
    }
  }

  // 노출 자격을 다시 계산한다 (FIX_35).
  // 지역·상품·운영시간이 다 들어갔으니 조건을 만족하면 자동으로 켜진다.
  try {
    const r = await api('/rest/v1/rpc/refresh_provider_listing', { body: {} });
    console.log(`\n노출 재계산: ${JSON.stringify(r)}`);
  } catch (e) {
    console.log(`\n⚠ 노출 재계산 실패 — ${e.message}`);
    console.log('  SQL Editor 에서 select public.refresh_provider_listing(); 를 직접 실행하세요.');
  }

  console.log(`\n성공 ${ok} · 실패 ${fail}`);
  if (failures.length) {
    console.log('\n실패 목록');
    for (const f of failures) console.log('  ' + f);
    // 실패를 성공처럼 보이게 하지 않는다.
    process.exitCode = 1;
  }
};

run().catch(e => {
  console.error('\n중단됨 —', e.message);
  process.exitCode = 1;
});
