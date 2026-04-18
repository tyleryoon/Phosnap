// ─── Supabase Edge Function: cancel-payment ─────────────────────────────
// TossPayments 결제 취소(환불) + 예약 상태 업데이트
//
// 환불 정책:
//   - 촬영일 7일 이상 전: 전액 환불
//   - 촬영일 3~6일 전:   50% 환불
//   - 촬영일 2일 이내:   환불 불가
//
// Deploy:
//   supabase functions deploy cancel-payment --no-verify-jwt
//
// Env vars:
//   TOSS_SECRET_KEY = test_sk_... 또는 live_sk_...
// ────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const TOSS_CANCEL_URL = 'https://api.tosspayments.com/v1/payments';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * 환불 금액 계산
 * @param {string} sessionDate — 촬영일 'YYYY-MM-DD'
 * @param {number} totalPrice  — 총 결제 금액
 * @returns {{ refundAmount, refundRate, daysUntil, refundable }}
 */
const calculateRefund = (sessionDate: string, totalPrice: number) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const session = new Date(sessionDate);
  session.setHours(0, 0, 0, 0);
  const diffMs = session.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntil >= 7) {
    return { refundAmount: totalPrice, refundRate: 100, daysUntil, refundable: true };
  } else if (daysUntil >= 3) {
    return { refundAmount: Math.floor(totalPrice * 0.5), refundRate: 50, daysUntil, refundable: true };
  } else {
    return { refundAmount: 0, refundRate: 0, daysUntil, refundable: false };
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'bookingId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 1. 인증 확인 ──
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? '' } },
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. 예약 조회 ──
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 본인 예약인지 확인
    if (booking.customer_id !== user.id) {
      // admin 체크
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Not authorized to cancel this booking' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 이미 취소/환불된 예약
    if (['cancelled', 'refunded'].includes(booking.status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking is already cancelled/refunded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. 환불 금액 계산 ──
    const { refundAmount, refundRate, daysUntil, refundable } = calculateRefund(
      booking.date,
      booking.total_price
    );

    if (!refundable) {
      // 환불 불가이지만 취소 처리는 가능 (환불금 0원)
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          refund_reason: reason || `환불 불가 (촬영 ${daysUntil}일 전)`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          cancelled: true,
          refunded: false,
          refundAmount: 0,
          refundRate: 0,
          daysUntil,
          message: 'Booking cancelled. No refund (less than 3 days before session).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. TossPayments 취소 API 호출 ──
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY');
    if (!tossSecretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server misconfiguration: TOSS_SECRET_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const basicAuth = btoa(`${tossSecretKey}:`);
    const cancelReason = reason || (refundRate === 100
      ? '고객 요청 (전액 환불)'
      : `고객 요청 (${refundRate}% 부분 환불, 촬영 ${daysUntil}일 전)`);

    const tossRes = await fetch(`${TOSS_CANCEL_URL}/${booking.toss_payment_key}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason,
        cancelAmount: refundAmount,  // 부분 취소 가능
      }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error('[cancel-payment] Toss cancel failed:', tossData);
      return new Response(
        JSON.stringify({
          success: false,
          error: tossData.message || 'Payment cancellation failed',
          code: tossData.code || 'TOSS_CANCEL_ERROR',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. DB 업데이트 ──
    const newStatus = refundRate === 100 ? 'refunded' : 'cancelled';
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: newStatus,
        cancelled_at: new Date().toISOString(),
        refunded_at: new Date().toISOString(),
        refund_reason: cancelReason,
        refund_amount: refundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[cancel-payment] DB update failed:', updateError);
      // TossPayments 취소는 성공했으므로 에러여도 success 반환 (수동 처리 필요)
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelled: true,
        refunded: true,
        refundAmount,
        refundRate,
        daysUntil,
        tossStatus: tossData.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[cancel-payment] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
