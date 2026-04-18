// ─── expire-bookings Edge Function ──────────────────────────────────
// 48시간 초과 대기 중인 예약을 자동 취소 + Toss 환불 처리
//
// 호출 방법:
//   1. Supabase pg_cron: select cron.schedule('expire-bookings','*/30 * * * *', $$select net.http_post(...)$$)
//   2. 외부 cron (Vercel cron, GitHub Actions): POST /functions/v1/expire-bookings
//   3. 클라이언트에서 주기적 호출: expireStaleBookings() (supabase.js)
//
// 환경변수:
//   TOSS_SECRET_KEY — TossPayments 시크릿 키 (환불 API 호출용)
// ────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. 만료 대상 조회 (status=pending, expires_at < now)
    const { data: expiredBookings, error: fetchErr } = await sb
      .from('bookings')
      .select('id, toss_payment_key, total_price, customer_id, photographer_name, date')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    if (fetchErr) throw fetchErr

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(JSON.stringify({ expired: 0, refunded: 0, message: 'No stale bookings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let refundedCount = 0
    let cancelledCount = 0

    for (const booking of expiredBookings) {
      // 2. DB 상태 변경
      await sb.from('bookings').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        rejected_reason: 'auto_expired_48h',
        updated_at: new Date().toISOString(),
      }).eq('id', booking.id)
      cancelledCount++

      // 3. Toss 환불 (전액 — 작가 미응답이므로 100% 환불)
      if (booking.toss_payment_key && TOSS_SECRET_KEY) {
        try {
          const b64 = btoa(`${TOSS_SECRET_KEY}:`)
          const refundRes = await fetch(`https://api.tosspayments.com/v1/payments/${booking.toss_payment_key}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${b64}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cancelReason: '작가 48시간 미응답 — 자동 취소 및 전액 환불',
            }),
          })

          if (refundRes.ok) {
            await sb.from('bookings').update({
              status: 'refunded',
              refund_reason: 'auto_expired_48h_full_refund',
              refunded_at: new Date().toISOString(),
            }).eq('id', booking.id)
            refundedCount++
          } else {
            const errBody = await refundRes.text()
            console.error(`[expire-bookings] Toss refund failed for ${booking.id}:`, errBody)
          }
        } catch (refundErr) {
          console.error(`[expire-bookings] Refund error for ${booking.id}:`, refundErr)
        }
      }
    }

    return new Response(JSON.stringify({
      expired: cancelledCount,
      refunded: refundedCount,
      total: expiredBookings.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[expire-bookings] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
