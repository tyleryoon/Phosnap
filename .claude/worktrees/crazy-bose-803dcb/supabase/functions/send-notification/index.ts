import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FROM_EMAIL = 'Phosnap <noreply@phosnap.com>';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://phosnap.com';

// ─── Email Templates ─────────────────────────────────────────────

const EMAIL_TEMPLATES: Record<string, Record<string, { subject: string; title: string; body: string; details: string; cta?: string }>> = {
  booking_created_customer: {
    ko: {
      subject: '[Phosnap] 예약이 접수되었습니다',
      title: '예약이 접수되었습니다',
      body: '작가님의 확인을 기다리고 있습니다. 예약 확인에는 최대 24시간이 소요될 수 있습니다.',
      details: `<p><strong>작가:</strong> {{photographerName}}</p>
               <p><strong>날짜:</strong> {{date}}</p>
               <p><strong>시간:</strong> {{time}}</p>
               <p><strong>패키지:</strong> {{packageName}}</p>
               <p><strong>총액:</strong> ₩{{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">예약 상세보기</a>`,
    },
    en: {
      subject: '[Phosnap] Booking Received',
      title: 'Your Booking Has Been Received',
      body: 'We\'re waiting for the photographer\'s confirmation. This usually takes up to 24 hours.',
      details: `<p><strong>Photographer:</strong> {{photographerName}}</p>
               <p><strong>Date:</strong> {{date}}</p>
               <p><strong>Time:</strong> {{time}}</p>
               <p><strong>Package:</strong> {{packageName}}</p>
               <p><strong>Total:</strong> ${{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">View Booking</a>`,
    },
    ja: {
      subject: '[Phosnap] 予約が受け付けられました',
      title: 'ご予約をお受けいたしました',
      body: '写真家の方の確認をお待ちしております。確認には最大24時間かかる場合があります。',
      details: `<p><strong>写真家:</strong> {{photographerName}}</p>
               <p><strong>日付:</strong> {{date}}</p>
               <p><strong>時間:</strong> {{time}}</p>
               <p><strong>パッケージ:</strong> {{packageName}}</p>
               <p><strong>合計:</strong> ¥{{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">予約詳細を見る</a>`,
    },
    zh: {
      subject: '[Phosnap] 预约已受理',
      title: '您的预约已被接收',
      body: '我们正在等待摄影师的确认。通常需要24小时以内。',
      details: `<p><strong>摄影师:</strong> {{photographerName}}</p>
               <p><strong>日期:</strong> {{date}}</p>
               <p><strong>时间:</strong> {{time}}</p>
               <p><strong>套餐:</strong> {{packageName}}</p>
               <p><strong>总额:</strong> ¥{{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">查看预约</a>`,
    },
  },

  booking_created_artist: {
    ko: {
      subject: '[Phosnap] 새로운 예약 신청이 있습니다',
      title: '새로운 예약 신청',
      body: '고객으로부터 새로운 예약 신청이 들어왔습니다. 예약을 확인하고 수락 또는 거절해 주세요.',
      details: `<p><strong>고객:</strong> {{customerName}}</p>
               <p><strong>날짜:</strong> {{date}}</p>
               <p><strong>시간:</strong> {{time}}</p>
               <p><strong>패키지:</strong> {{packageName}}</p>
               <p><strong>금액:</strong> ₩{{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/artist/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">예약 확인하기</a>`,
    },
    en: {
      subject: '[Phosnap] New Booking Request',
      title: 'New Booking Request',
      body: 'You\'ve received a new booking request from a customer. Please review and confirm or decline.',
      details: `<p><strong>Customer:</strong> {{customerName}}</p>
               <p><strong>Date:</strong> {{date}}</p>
               <p><strong>Time:</strong> {{time}}</p>
               <p><strong>Package:</strong> {{packageName}}</p>
               <p><strong>Amount:</strong> ${{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/artist/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">Review Booking</a>`,
    },
    ja: {
      subject: '[Phosnap] 新しい予約申し込みがあります',
      title: '新しい予約申し込み',
      body: 'お客様からの新しい予約申し込みを受け取りました。ご確認の上、承認または却下をお願いします。',
      details: `<p><strong>お客様:</strong> {{customerName}}</p>
               <p><strong>日付:</strong> {{date}}</p>
               <p><strong>時間:</strong> {{time}}</p>
               <p><strong>パッケージ:</strong> {{packageName}}</p>
               <p><strong>金額:</strong> ¥{{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/artist/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">予約を確認する</a>`,
    },
    zh: {
      subject: '[Phosnap] 新的预约申请',
      title: '新的预约申请',
      body: '您收到了来自客户的新预约申请。请审核并确认或拒绝。',
      details: `<p><strong>客户:</strong> {{customerName}}</p>
               <p><strong>日期:</strong> {{date}}</p>
               <p><strong>时间:</strong> {{time}}</p>
               <p><strong>套餐:</strong> {{packageName}}</p>
               <p><strong>金额:</strong> ¥{{totalPrice}}</p>`,
      cta: `<a href="${SITE_URL}/artist/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">查看预约</a>`,
    },
  },

  booking_confirmed: {
    ko: {
      subject: '[Phosnap] 예약이 확정되었습니다',
      title: '예약이 확정되었습니다',
      body: '작가님이 귀하의 예약을 수락하셨습니다. 촬영일에 뵙겠습니다!',
      details: `<p><strong>작가:</strong> {{photographerName}}</p>
               <p><strong>날짜:</strong> {{date}}</p>
               <p><strong>시간:</strong> {{time}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">예약 확인</a>`,
    },
    en: {
      subject: '[Phosnap] Booking Confirmed',
      title: 'Your Booking Is Confirmed',
      body: 'The photographer has confirmed your booking. See you on the date of the shoot!',
      details: `<p><strong>Photographer:</strong> {{photographerName}}</p>
               <p><strong>Date:</strong> {{date}}</p>
               <p><strong>Time:</strong> {{time}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">View Booking</a>`,
    },
    ja: {
      subject: '[Phosnap] 予約が確定されました',
      title: 'ご予約が確定されました',
      body: '写真家がご予約を承認されました。撮影日にお会いしましょう!',
      details: `<p><strong>写真家:</strong> {{photographerName}}</p>
               <p><strong>日付:</strong> {{date}}</p>
               <p><strong>時間:</strong> {{time}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">予約を確認する</a>`,
    },
    zh: {
      subject: '[Phosnap] 预约已确认',
      title: '您的预约已确认',
      body: '摄影师已确认您的预约。拍摄当天见!',
      details: `<p><strong>摄影师:</strong> {{photographerName}}</p>
               <p><strong>日期:</strong> {{date}}</p>
               <p><strong>时间:</strong> {{time}}</p>`,
      cta: `<a href="${SITE_URL}/bookings" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">查看预约</a>`,
    },
  },

  booking_rejected: {
    ko: {
      subject: '[Phosnap] 예약이 거절되었습니다',
      title: '예약이 거절되었습니다',
      body: '죄송하지만 작가님이 예약을 거절하셨습니다. 다른 작가를 찾아보세요.',
      details: `<p><strong>작가:</strong> {{photographerName}}</p>
               <p><strong>날짜:</strong> {{date}}</p>
               {{#reason}}<p><strong>거절 이유:</strong> {{reason}}</p>{{/reason}}`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">작가 찾기</a>`,
    },
    en: {
      subject: '[Phosnap] Booking Declined',
      title: 'Your Booking Was Declined',
      body: 'Unfortunately, the photographer has declined your booking. Try searching for another photographer.',
      details: `<p><strong>Photographer:</strong> {{photographerName}}</p>
               <p><strong>Date:</strong> {{date}}</p>
               {{#reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/reason}}`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">Find a Photographer</a>`,
    },
    ja: {
      subject: '[Phosnap] 予約が却下されました',
      title: 'ご予約が却下されました',
      body: '申し訳ございませんが、写真家がご予約を却下されました。別の写真家をお探しください。',
      details: `<p><strong>写真家:</strong> {{photographerName}}</p>
               <p><strong>日付:</strong> {{date}}</p>
               {{#reason}}<p><strong>理由:</strong> {{reason}}</p>{{/reason}}`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">写真家を探す</a>`,
    },
    zh: {
      subject: '[Phosnap] 预约已被拒绝',
      title: '您的预约已被拒绝',
      body: '抱歉，摄影师拒绝了您的预约。请尝试寻找其他摄影师。',
      details: `<p><strong>摄影师:</strong> {{photographerName}}</p>
               <p><strong>日期:</strong> {{date}}</p>
               {{#reason}}<p><strong>原因:</strong> {{reason}}</p>{{/reason}}`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">查找摄影师</a>`,
    },
  },

  photos_delivered: {
    ko: {
      subject: '[Phosnap] 사진이 전달되었습니다',
      title: '사진이 전달되었습니다',
      body: '작가님이 사진을 전달하셨습니다. 아래 링크에서 확인하세요.',
      details: `<p><strong>작가:</strong> {{photographerName}}</p>
               <p><strong>전달일:</strong> {{deliveryDate}}</p>`,
      cta: `<a href="{{deliveryUrl}}" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">사진 보기</a>`,
    },
    en: {
      subject: '[Phosnap] Your Photos Have Been Delivered',
      title: 'Your Photos Are Ready',
      body: 'The photographer has delivered your photos. Download them using the link below.',
      details: `<p><strong>Photographer:</strong> {{photographerName}}</p>
               <p><strong>Delivered:</strong> {{deliveryDate}}</p>`,
      cta: `<a href="{{deliveryUrl}}" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">View Photos</a>`,
    },
    ja: {
      subject: '[Phosnap] 写真が配信されました',
      title: 'お写真の準備ができました',
      body: '写真家が写真を配信されました。下記のリンクからダウンロードしてください。',
      details: `<p><strong>写真家:</strong> {{photographerName}}</p>
               <p><strong>配信日:</strong> {{deliveryDate}}</p>`,
      cta: `<a href="{{deliveryUrl}}" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">写真を見る</a>`,
    },
    zh: {
      subject: '[Phosnap] 您的照片已交付',
      title: '您的照片已准备好',
      body: '摄影师已交付您的照片。请使用下面的链接下载。',
      details: `<p><strong>摄影师:</strong> {{photographerName}}</p>
               <p><strong>交付日期:</strong> {{deliveryDate}}</p>`,
      cta: `<a href="{{deliveryUrl}}" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">查看照片</a>`,
    },
  },

  booking_expired: {
    ko: {
      subject: '[Phosnap] 예약이 만료되었습니다',
      title: '예약이 만료되었습니다',
      body: '작가님의 미응답으로 인해 예약이 자동으로 취소되었습니다.',
      details: `<p><strong>작가:</strong> {{photographerName}}</p>
               <p><strong>예정 날짜:</strong> {{date}}</p>`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">다시 예약하기</a>`,
    },
    en: {
      subject: '[Phosnap] Booking Expired',
      title: 'Booking Expired',
      body: 'Your booking has been automatically cancelled due to no response from the photographer.',
      details: `<p><strong>Photographer:</strong> {{photographerName}}</p>
               <p><strong>Scheduled Date:</strong> {{date}}</p>`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">Book Again</a>`,
    },
    ja: {
      subject: '[Phosnap] 予約が期限切れになりました',
      title: '予約が期限切れになりました',
      body: '写真家からの応答がないため、ご予約は自動的に取消されました。',
      details: `<p><strong>写真家:</strong> {{photographerName}}</p>
               <p><strong>予定日:</strong> {{date}}</p>`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">再度予約する</a>`,
    },
    zh: {
      subject: '[Phosnap] 预约已过期',
      title: '预约已过期',
      body: '由于摄影师未作回应，您的预约已自动取消。',
      details: `<p><strong>摄影师:</strong> {{photographerName}}</p>
               <p><strong>预定日期:</strong> {{date}}</p>`,
      cta: `<a href="${SITE_URL}/photographers" style="display:inline-block;padding:12px 30px;background:#e8a020;color:#0b0b0b;text-decoration:none;font-weight:bold;margin-top:20px;">重新预约</a>`,
    },
  },
};

// ─── HTML Email Builder ──────────────────────────────────────────

function buildEmailHtml(subject: string, title: string, body: string, details: string, ctaButton?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0b0b0b;">
  <div style="max-width:600px;margin:0 auto;background:#0b0b0b;color:#f2f2f2;font-family:Georgia,serif;">
    <div style="padding:40px;border-bottom:1px solid rgba(232,160,32,0.3);">
      <h1 style="font-size:24px;letter-spacing:0.15em;color:#e8a020;margin:0;font-family:Georgia,serif;font-weight:normal;">PHOSNAP</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#f2f2f2;font-size:18px;font-family:Georgia,serif;margin:0 0 20px 0;">${title}</h2>
      <p style="color:rgba(242,242,242,0.7);line-height:1.8;margin:0 0 20px 0;font-family:Georgia,serif;">${body}</p>
      <div style="background:rgba(232,160,32,0.06);border:1px solid rgba(232,160,32,0.2);padding:20px;margin:20px 0;font-family:Georgia,serif;">
        ${details}
      </div>
      ${ctaButton ? `<div style="text-align:center;">${ctaButton}</div>` : ''}
    </div>
    <div style="padding:20px 40px;border-top:1px solid rgba(232,160,32,0.15);font-size:12px;color:rgba(242,242,242,0.4);font-family:Georgia,serif;">
      <p style="margin:0;">© 2026 Phosnap. All rights reserved.</p>
      <p style="margin:8px 0 0 0;"><a href="${SITE_URL}" style="color:#e8a020;text-decoration:none;">Visit Phosnap</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Simple Mustache-style Template Renderer ────────────────────

function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
  }
  return result;
}

// ─── Resend API Call ─────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<any> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ─── Main Handler ───────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { type, bookingId, recipientEmail, recipientName, lang = 'ko', data = {} } = body;

    // Validate inputs
    if (!type || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, recipientEmail' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const template = EMAIL_TEMPLATES[type]?.[lang] || EMAIL_TEMPLATES[type]?.['en'];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown notification type: ${type}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Render template with data
    let renderedDetails = renderTemplate(template.details, data);
    let renderedCta = template.cta ? renderTemplate(template.cta, data) : '';

    // Build HTML email
    const html = buildEmailHtml(template.subject, template.title, template.body, renderedDetails, renderedCta);

    // Send email via Resend
    const result = await sendEmail(recipientEmail, template.subject, html);

    console.log(`[Notification] Sent ${type} to ${recipientEmail} (booking: ${bookingId})`);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
