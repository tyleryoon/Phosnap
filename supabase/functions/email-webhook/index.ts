// ═══════════════════════════════════════════════════════════════════════
// email-webhook — Resend 발송 결과를 되받는다
//
// 왜 필요한가
//   notify-worker 가 Resend 에 요청을 보내고 200 을 받으면 'sent' 로 적는다.
//   그건 **접수됐다**는 뜻이지 도착했다는 뜻이 아니다.
//
//   실제로 photo2@gmail.com 은 존재하지 않는 주소인데 'sent' 로 남았다.
//   Resend 는 일단 받고 나서 반송시킨다. 우리는 그걸 모른다.
//
//   그대로 두면
//     · 작가가 알림을 못 받는데 우리는 보냈다고 믿는다
//     · 반송률이 올라가면 도메인 평판이 떨어져 정상 메일까지 스팸으로 간다
//
// 설정
//   Resend 대시보드 → Webhooks → Add Endpoint
//     URL    https://<project>.supabase.co/functions/v1/email-webhook
//     Events email.delivered, email.bounced, email.complained
//   받은 Signing Secret 을 Edge Function Secret 으로 넣는다.
//     RESEND_WEBHOOK_SECRET = whsec_...
//
// 검증
//   Resend 는 Svix 규격 서명을 쓴다.
//     svix-id / svix-timestamp / svix-signature
//   서명을 확인하지 않으면 아무나 "이 메일 반송됐다" 고 보낼 수 있다.
//   시크릿이 없으면 **요청을 거부한다** — 검증 없이 받는 것보다 안 받는 게 낫다.
// ═══════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') || '';

// 재생 공격 방지 — 5분 넘은 요청은 받지 않는다.
const MAX_SKEW_SEC = 5 * 60;

const toBytes = (s: string) => new TextEncoder().encode(s);

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

/**
 * Svix 서명 검증.
 *
 * 서명 대상은 `${id}.${timestamp}.${body}` 이고,
 * 키는 'whsec_' 를 뗀 base64 를 디코드한 바이트다.
 * signature 헤더에는 `v1,<base64>` 가 공백으로 여러 개 올 수 있다(키 교체 중).
 */
async function verify(req: Request, raw: string): Promise<string | null> {
  const id   = req.headers.get('svix-id');
  const ts   = req.headers.get('svix-timestamp');
  const sigs = req.headers.get('svix-signature');
  if (!id || !ts || !sigs) return '서명 헤더 누락';

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));
  if (!Number.isFinite(age) || age > MAX_SKEW_SEC) return '요청 시각이 너무 오래됨';

  const secretB64 = WEBHOOK_SECRET.replace(/^whsec_/, '');
  const keyBytes = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, toBytes(`${id}.${ts}.${raw}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  const ok = sigs.split(' ').some((part) => {
    const [ver, val] = part.split(',');
    return ver === 'v1' && val && timingSafeEqual(toBytes(val), toBytes(expected));
  });
  return ok ? null : '서명 불일치';
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // 시크릿이 없으면 받지 않는다.
  // 검증 없이 받으면 아무나 "이 주소 반송됐다" 고 보내 정상 사용자에게
  // 메일이 안 가게 만들 수 있다.
  if (!WEBHOOK_SECRET) {
    console.error('[email-webhook] RESEND_WEBHOOK_SECRET 미설정 — 요청 거부');
    return new Response(JSON.stringify({ error: 'webhook secret not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }

  const raw = await req.text();
  const bad = await verify(req, raw);
  if (bad) {
    console.warn('[email-webhook] 검증 실패:', bad);
    return new Response(JSON.stringify({ error: bad }), { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }

  // Resend 형식: { type: 'email.bounced', data: { email_id, to: [...], ... } }
  const type = String(payload?.type || '');
  const event = type.startsWith('email.') ? type.slice('email.'.length) : '';
  if (!['delivered', 'bounced', 'complained'].includes(event)) {
    // 관심 없는 이벤트도 200 을 준다. 400 을 주면 Resend 가 계속 재시도한다.
    return new Response(JSON.stringify({ ignored: type }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const d = payload.data || {};
  const emailId = d.email_id || d.id || null;
  const to = Array.isArray(d.to) ? d.to[0] : (d.to || null);
  const reason = d.bounce?.message || d.reason || d.bounce_type || null;

  if (!emailId) {
    return new Response(JSON.stringify({ error: 'email_id 없음' }), { status: 400 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await sb.rpc('record_email_event', {
    p_email_id: emailId,
    p_event:    event,
    p_to:       to,
    p_reason:   reason ? String(reason).slice(0, 500) : null,
  });

  if (error) {
    // 500 을 주면 Resend 가 재시도한다. 일시적 장애라면 그게 맞다.
    console.error('[email-webhook] 기록 실패:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log('[email-webhook]', event, emailId, to, JSON.stringify(data));
  return new Response(JSON.stringify({ ok: true, event, result: data }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
