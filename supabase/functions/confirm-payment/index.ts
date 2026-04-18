// ─── Supabase Edge Function: confirm-payment ───────────────────────────
// TossPayments 결제 승인(confirm) + 예약 저장을 서버 사이드에서 처리
//
// 클라이언트(BookingSuccess) → 이 Edge Function → TossPayments confirm API → DB insert
// 이렇게 해야 URL 파라미터 조작으로 가짜 결제를 저장하는 것을 방지할 수 있음
//
// Deploy:
//   supabase functions deploy confirm-payment --no-verify-jwt
//
// Env vars (Supabase Dashboard → Edge Functions → Secrets):
//   TOSS_SECRET_KEY = test_sk_... 또는 live_sk_... (시크릿키, 클라이언트키 아님!)
//
// ────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

// CORS 헤더 (프론트엔드에서 fetch 허용)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Request body 파싱 ──
    const body = await req.json();
    const {
      paymentKey,
      orderId,
      amount,
      // 예약 메타데이터 (클라이언트에서 전달)
      customerName,
      photographerName,
      photographerLegacyId,
      date,
      time,
      packageName,
      stylistPrice,
      dressPrice,
      lang,
      note,
    } = body;

    // 필수 파라미터 검증
    if (!paymentKey || !orderId || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: paymentKey, orderId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. TossPayments confirm API 호출 ──
    // 시크릿키는 Base64 인코딩 (Basic auth)
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY');
    if (!tossSecretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server misconfiguration: TOSS_SECRET_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const basicAuth = btoa(`${tossSecretKey}:`);

    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    const tossData = await tossRes.json();

    // TossPayments 승인 실패
    if (!tossRes.ok) {
      console.error('[confirm-payment] Toss confirm failed:', tossData);
      return new Response(
        JSON.stringify({
          success: false,
          error: tossData.message || 'Payment confirmation failed',
          code: tossData.code || 'TOSS_ERROR',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. 결제 금액 일치 검증 ──
    if (tossData.totalAmount !== Number(amount)) {
      console.error('[confirm-payment] Amount mismatch:', tossData.totalAmount, '!==', amount);
      return new Response(
        JSON.stringify({ success: false, error: 'Amount mismatch', code: 'AMOUNT_MISMATCH' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Supabase에 예약 저장 ──
    // JWT에서 user ID 추출 (Authorization 헤더)
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // service_role로 DB 접근 (RLS 바이패스)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // anon key로 유저 정보 조회 (JWT 기반)
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 중복 체크
    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('toss_order_id', orderId)
      .maybeSingle();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ success: true, duplicate: true, bookingId: existingBooking.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 예약 insert
    const { data: booking, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        customer_id:              user.id,
        photographer_name:        photographerName || null,
        photographer_legacy_id:   photographerLegacyId || null,
        date:                     date || null,
        time:                     time || null,
        package_name:             packageName || null,
        package_price:            Number(amount) - Number(stylistPrice || 0) - Number(dressPrice || 0),
        stylist_price:            Number(stylistPrice || 0),
        total_price:              Number(amount),
        toss_order_id:            orderId,
        toss_payment_key:         paymentKey,
        // TossPayments 응답에서 실제 결제 시간 사용
        paid_at:                  tossData.approvedAt || new Date().toISOString(),
        status:                   'pending',
        lang:                     lang || 'ko',
        note:                     note || null,
        // TossPayments 응답 메타 (추후 환불/조회용)
        toss_method:              tossData.method || null,
        toss_receipt_url:         tossData.receipt?.url || null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[confirm-payment] DB insert failed:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save booking', code: 'DB_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. 성공 응답 ──
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        orderId: tossData.orderId,
        approvedAt: tossData.approvedAt,
        receiptUrl: tossData.receipt?.url || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[confirm-payment] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
