// ═══════════════════════════════════════════════════════════════════════
// notify-worker — 앱 내 알림을 이메일로 내보내는 워커
//
// 왜 별도 함수인가
//   기존 send-notification 은 "이 사람에게 이 타입 메일을 보내라" 는
//   명령형이라, 부르는 쪽이 빠뜨리면 그대로 메일이 안 간다.
//   실제로 createBooking 한 군데에서만 불렸고, 작가는 예약이 들어온 줄도
//   몰랐다. (앱 내 알림도 RLS 때문에 실패하고 있었다 — FIX_18)
//
//   이 워커는 반대로 동작한다.
//   notifications 테이블에서 "아직 안 보냈고, 보낼 때가 됐고,
//   아직 안 읽은" 것을 스스로 찾아 보낸다.
//   알림을 만드는 것이 곧 메일을 예약하는 것이 되므로,
//   앞으로 알림을 추가하면 메일은 저절로 따라간다.
//
// 호출
//   pg_cron 이 1분마다 호출하거나, 수동으로 POST 해도 된다.
//   멱등하다 — 보낼 게 없으면 아무 일도 하지 않는다.
//
// 필요한 환경변수
//   RESEND_API_KEY             Resend API 키
//   SUPABASE_URL               (자동 주입)
//   SUPABASE_SERVICE_ROLE_KEY  (자동 주입)
//   SITE_URL                   메일 안의 링크 주소
// ═══════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.phosnap.com';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Phosnap <noreply@phosnap.com>';
const BATCH = 50;

// ─── 알림 유형별 문구 ────────────────────────────────────────────────
// 제목·본문은 알림에 이미 들어 있다. 여기서는 맥락과 행동 유도만 붙인다.
const COPY: Record<string, Record<string, { subject: string; lead: string; cta: string }>> = {
  booking_created: {
    ko: { subject: '새 예약 요청이 도착했습니다',
          lead: '48시간 안에 확정하지 않으면 예약이 자동으로 취소됩니다. 고객이 기다리고 있어요.',
          cta: '예약 확인하기' },
    en: { subject: 'New booking request',
          lead: 'Bookings are cancelled automatically if not confirmed within 48 hours.',
          cta: 'Review booking' },
  },
  booking_confirmed: {
    ko: { subject: '예약이 확정되었습니다', lead: '일정을 확인해 주세요.', cta: '예약 보기' },
    en: { subject: 'Booking confirmed', lead: 'Please check the details.', cta: 'View booking' },
  },
  booking_rejected: {
    ko: { subject: '예약이 거절되었습니다', lead: '다른 작가를 찾아보실 수 있습니다.', cta: '예약 보기' },
    en: { subject: 'Booking declined', lead: 'You can look for another photographer.', cta: 'View booking' },
  },
  booking_cancelled: {
    ko: { subject: '예약이 취소되었습니다', lead: '해당 일정이 다시 열렸습니다.', cta: '일정 보기' },
    en: { subject: 'Booking cancelled', lead: 'That slot is open again.', cta: 'View schedule' },
  },
  chat_message: {
    ko: { subject: '새 메시지가 도착했습니다',
          lead: '아직 확인하지 않은 메시지가 있습니다.', cta: '답장하기' },
    en: { subject: 'New message',
          lead: 'You have an unread message.', cta: 'Reply' },
  },
  role_approved: {
    ko: { subject: '가입이 승인되었습니다',
          lead: '대시보드에서 상품과 일정을 등록하시면 고객에게 노출됩니다.',
          cta: '대시보드 열기' },
    en: { subject: 'Your application was approved',
          lead: 'Add your packages and schedule to appear in search results.',
          cta: 'Open dashboard' },
  },
  role_rejected: {
    // 반려 사유는 notifications.body 에 담겨 본문으로 내려간다.
    // 여기 lead 에 또 쓰면 같은 말이 두 번 나온다.
    ko: { subject: '가입 심사 결과 안내',
          lead: '아래 내용을 보완해 다시 신청해 주시면 재심사해 드립니다.',
          cta: '포스냅 열기' },
    en: { subject: 'About your application',
          lead: 'Please address the note below and apply again.',
          cta: 'Open Phosnap' },
  },
  role_reapplied: {
    // 관리자에게 간다. 보완 내용은 body 로 내려간다.
    ko: { subject: '보완 후 재신청이 접수되었습니다',
          lead: '승인 탭에서 이전 반려 사유와 함께 확인하실 수 있습니다.',
          cta: '승인 화면 열기' },
    en: { subject: 'An applicant resubmitted',
          lead: 'Review it alongside the previous rejection note.',
          cta: 'Open approvals' },
  },
  photos_delivered: {
    ko: { subject: '사진이 전달되었습니다', lead: '작업물을 확인해 주세요.', cta: '사진 보기' },
    en: { subject: 'Your photos are ready', lead: 'Your gallery is available.', cta: 'View photos' },
  },
};

const fallback = (lang: string) =>
  lang === 'ko'
    ? { subject: '알림', lead: '', cta: '확인하기' }
    : { subject: 'Notification', lead: '', cta: 'Open' };

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function buildHtml(title: string, lead: string, body: string, link: string, cta: string) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0b0b0b;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="color:#e8a020;font-size:20px;letter-spacing:.18em;margin-bottom:32px;">PHOSNAP</div>
    <div style="background:#141414;border:1px solid #2a2a2a;padding:32px;">
      <h1 style="color:#f5f5f5;font-size:20px;margin:0 0 14px;font-weight:600;">${escapeHtml(title)}</h1>
      ${body ? `<p style="color:#cfcfcf;font-size:15px;line-height:1.75;margin:0 0 14px;">${escapeHtml(body)}</p>` : ''}
      ${lead ? `<p style="color:#8f8f8f;font-size:13px;line-height:1.75;margin:0;">${escapeHtml(lead)}</p>` : ''}
      <a href="${SITE_URL}${link || '/'}"
         style="display:inline-block;margin-top:26px;padding:13px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:600;font-size:14px;">
        ${escapeHtml(cta)}
      </a>
    </div>
    <p style="color:#5a5a5a;font-size:11px;line-height:1.7;margin-top:26px;">
      이 메일은 Phosnap 알림 설정에 따라 발송되었습니다.<br/>
      <a href="${SITE_URL}/account/settings" style="color:#8f8f8f;">알림 설정 변경</a>
    </p>
  </div>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return await res.json();
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // 키가 없으면 조용히 넘어간다.
  // 메일 설정 전에도 앱 내 알림은 정상 동작해야 한다.
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ skipped: 'RESEND_API_KEY not set' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: rows, error } = await sb.rpc('pending_notification_emails', { p_limit: BATCH });
  if (error) {
    console.error('[notify-worker] 대기 목록 조회 실패:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!rows?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  let sent = 0, failed = 0;
  for (const n of rows) {
    const lang = n.lang === 'ko' ? 'ko' : 'en';
    const copy = COPY[n.type]?.[lang] || COPY[n.type]?.['en'] || fallback(lang);
    try {
      await sendEmail(
        n.email,
        `[Phosnap] ${n.title || copy.subject}`,
        buildHtml(n.title || copy.subject, copy.lead, n.body || '', n.link || '/', copy.cta),
      );
      await sb.rpc('mark_notification_email', { p_id: n.id, p_ok: true });
      sent++;
    } catch (err) {
      // 실패를 기록해 둔다. 조용히 삼키면 왜 메일이 안 왔는지 알 수 없다.
      console.error('[notify-worker] 발송 실패:', n.id, err);
      await sb.rpc('mark_notification_email', {
        p_id: n.id, p_ok: false, p_error: String(err).slice(0, 500),
      });
      failed++;
    }
  }

  console.log(`[notify-worker] sent=${sent} failed=${failed}`);
  return new Response(JSON.stringify({ sent, failed }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
