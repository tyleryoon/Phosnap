import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ShareModal from '../components/ShareModal';
import { confirmPayment, createBooking, getBookingByOrderId } from '../lib/supabase';
import CarbonFootprint from '../components/CarbonFootprint';

// ─── Booking Success Page ──────────────────────────────────────────────
// TossPayments 결제 성공 후 리다이렉트되는 페이지
// URL params: paymentKey, orderId, amount (TossPayments 자동 전달)
// + 커스텀: artist, artistId, date, time, pkg (Booking.jsx → successUrl)

const CONTENT = {
  ko: {
    label:      '결제 완료',
    title:      '작가 확정 대기 중입니다',
    sub:        '결제가 완료되었습니다. 작가님이 48시간 이내 예약을 수락하면\n최종 확정 알림을 보내드립니다.',
    orderLabel: '주문 정보',
    artist:     '작가',
    date:       '촬영 날짜',
    time:       '촬영 시간',
    pkg:        '패키지',
    amount:     '결제 금액',
    orderId:    '주문 번호',
    next:       '다음 단계',
    nextItems: [
      '작가가 48시간 이내에 연락드릴 예정입니다.',
      '촬영 당일 장소 및 시간을 작가와 최종 확인해주세요.',
      '환불이 필요한 경우 촬영일 기준 정책을 확인해주세요.',
    ],
    homeBtn:     '홈으로 돌아가기',
    myBookingsBtn: '내 예약 보기',
    contactBtn:  '문의하기',
    refundTitle: '환불 정책',
    refundItems: [
      '촬영일 7일 전 이상: 전액 환불',
      '촬영일 3~6일 전: 50% 환불',
      '촬영일 2일 전 이하: 환불 불가',
    ],
    saving:      '예약 저장 중...',
    saved:       '예약이 저장되었습니다',
    saveError:   '예약 저장에 실패했습니다. 고객센터에 문의해주세요.',
    alreadySaved:'이미 저장된 예약입니다.',
  },
  en: {
    label:      'Payment Complete',
    title:      'Awaiting artist confirmation',
    sub:        'Payment was successful. Your booking will be fully confirmed\nonce the artist accepts within 48 hours.',
    orderLabel: 'Order Summary',
    artist:     'Artist',
    date:       'Session Date',
    time:       'Session Time',
    pkg:        'Package',
    amount:     'Amount Paid',
    orderId:    'Order ID',
    next:       'What\'s Next',
    nextItems: [
      'The artist will contact you within 48 hours.',
      'Confirm the final location and time with the artist before your session.',
      'Please review the cancellation policy if you need a refund.',
    ],
    homeBtn:     'Back to Home',
    myBookingsBtn: 'My Bookings',
    contactBtn:  'Contact Us',
    refundTitle: 'Cancellation Policy',
    refundItems: [
      '7+ days before: Full refund',
      '3–6 days before: 50% refund',
      '2 days or less: No refund',
    ],
    saving:      'Saving booking...',
    saved:       'Booking saved successfully',
    saveError:   'Failed to save booking. Please contact support.',
    alreadySaved:'Booking already saved.',
  },
  ja: {
    label:      'お支払い完了',
    title:      '作家の確認をお待ちください',
    sub:        'お支払いが完了しました。作家が48時間以内に承認すると\n予約が最終確定されます。',
    orderLabel: 'ご注文内容',
    artist:     '作家',
    date:       '撮影日',
    time:       '撮影時間',
    pkg:        'パッケージ',
    amount:     'お支払い金額',
    orderId:    '注文番号',
    next:       '次のステップ',
    nextItems: [
      '作家が48時間以内にご連絡いたします。',
      '撮影当日の場所・時間を作家と最終確認してください。',
      '返金が必要な場合はキャンセルポリシーをご確認ください。',
    ],
    homeBtn:     'ホームへ戻る',
    myBookingsBtn: '予約を確認する',
    contactBtn:  'お問い合わせ',
    refundTitle: 'キャンセルポリシー',
    refundItems: [
      '撮影日7日以上前：全額返金',
      '撮影日3〜6日前：50%返金',
      '撮影日2日以内：返金不可',
    ],
    saving:      '予約を保存中...',
    saved:       '予約が保存されました',
    saveError:   '予約の保存に失敗しました。サポートにお問い合わせください。',
    alreadySaved:'すでに保存済みの予約です。',
  },
  zh: {
    label:      '支付完成',
    title:      '等待摄影师确认',
    sub:        '支付成功。摄影师在48小时内接受后，\n预约将最终确认。',
    orderLabel: '订单信息',
    artist:     '摄影师',
    date:       '拍摄日期',
    time:       '拍摄时间',
    pkg:        '套餐',
    amount:     '支付金额',
    orderId:    '订单号',
    next:       '后续步骤',
    nextItems: [
      '摄影师将在48小时内联系您。',
      '请在拍摄当天与摄影师确认最终地点和时间。',
      '如需退款，请查看取消政策。',
    ],
    homeBtn:     '返回首页',
    myBookingsBtn: '我的预约',
    contactBtn:  '联系我们',
    refundTitle: '取消政策',
    refundItems: [
      '拍摄日7天以上前：全额退款',
      '拍摄日3-6天前：退款50%',
      '拍摄日2天以内：不予退款',
    ],
    saving:      '保存预约中...',
    saved:       '预约已保存',
    saveError:   '保存预约失败，请联系客服。',
    alreadySaved:'预约已保存。',
  },
};

const fmt = (n) => Number(n).toLocaleString();

// ─── 저장 상태 배지 ──────────────────────────────────────────────────
const SaveBadge = ({ status, message }) => {
  const colors = {
    saving:      { bg: 'rgba(232,160,32,0.1)',  border: 'rgba(232,160,32,0.3)', color: 'var(--gold)' },
    saved:       { bg: 'rgba(72,187,120,0.1)',  border: 'rgba(72,187,120,0.4)', color: '#48bb78'     },
    error:       { bg: 'rgba(245,101,101,0.1)', border: 'rgba(245,101,101,0.4)',color: '#f56565'     },
    duplicate:   { bg: 'rgba(160,160,160,0.1)', border: 'rgba(160,160,160,0.3)',color: 'var(--muted)'},
  };
  const icons = { saving: '⟳', saved: '✓', error: '!', duplicate: '✓' };
  const s = colors[status] || colors.saving;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 4,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 12, color: s.color, fontFamily: 'var(--font-serif)',
      letterSpacing: '0.05em',
    }}>
      <span style={{ fontSize: status === 'saving' ? 14 : 12 }}>{icons[status]}</span>
      {message}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────
const BookingSuccess = () => {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const { lang }    = useLanguage();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const c = CONTENT[lang] ?? CONTENT['ko'];
  const [showShareModal, setShowShareModal] = useState(false);

  // TossPayments 자동 전달 params
  const paymentKey = params.get('paymentKey') || '';
  const orderId    = params.get('orderId')    || '';
  const amount     = params.get('amount')     || '';
  // Booking.jsx에서 추가한 params
  const artist     = params.get('artist')     || '';
  const artistId   = params.get('artistId')   || '';   // mock ID (숫자 문자열)
  const date       = params.get('date')       || '';
  const time       = params.get('time')       || '';
  const pkg        = params.get('pkg')        || '';
  const pkgPrice       = params.get('pkgPrice')       || '0';
  const stylistPrice   = params.get('stylistPrice')   || '0';
  const stylistName    = params.get('stylistName')    || '';
  const stylistSvc     = params.get('stylistSvc')     || '';
  const dressName      = params.get('dressName')      || '';
  const dressSize      = params.get('dressSize')      || '';
  const dressPrice     = params.get('dressPrice')     || '0';
  const venueName      = params.get('venueName')      || '';
  const venuePrice     = params.get('venuePrice')     || '0';

  // 저장 상태
  const [saveStatus,  setSaveStatus]  = useState('saving'); // 'saving' | 'saved' | 'error' | 'duplicate'
  const [saveMessage, setSaveMessage] = useState(c.saving);
  // 중복 실행 방지 — sessionStorage 키로 브라우저 뒤로가기도 차단
  const savedRef = useRef(false);
  const SAVE_KEY = `phosnap_saved_${orderId}`;

  // ── 페이지 최상단 스크롤 ──
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── orderId 없으면 홈으로 ──
  useEffect(() => {
    if (!orderId && !paymentKey) {
      navigate('/', { replace: true });
    }
  }, [orderId, paymentKey, navigate]);

  // ── Supabase에 예약 저장 ──
  useEffect(() => {
    if (!orderId || !paymentKey) return;  // 유효한 결제 아님
    if (authLoading) return;              // 아직 세션 로딩 중 → 대기
    if (savedRef.current) return;         // 이미 실행됨 (같은 페이지 내)
    if (sessionStorage.getItem(SAVE_KEY)) {
      // 뒤로가기로 돌아온 경우 — 이미 저장됨
      setSaveStatus('duplicate');
      setSaveMessage(c.alreadySaved);
      return;
    }
    savedRef.current = true;

    const save = async () => {
      // 로그인 안 된 경우 → 저장 건너뜀 (게스트 체크아웃은 미구현)
      if (!isLoggedIn || !user) {
        setSaveStatus('error');
        setSaveMessage(c.saveError);
        return;
      }

      // ── 서버 검증 우선 (Edge Function: confirm-payment) ──
      // TossPayments confirm API를 서버에서 호출 → 금액 검증 → DB 저장
      try {
        const result = await confirmPayment({
          paymentKey,
          orderId,
          amount:                 Number(amount),
          photographerName:       decodeURIComponent(artist),
          photographerLegacyId:   artistId || null,
          date,
          time:                   decodeURIComponent(time),
          packageName:            decodeURIComponent(pkg),
          stylistPrice:           Number(stylistPrice),
          dressPrice:             Number(dressPrice),
          stylistName:            decodeURIComponent(stylistName),
          stylistService:         decodeURIComponent(stylistSvc),
          dressName:              decodeURIComponent(dressName),
          dressSize:              decodeURIComponent(dressSize),
          venueName:              decodeURIComponent(venueName),
          venuePrice:             Number(venuePrice),
          lang,
        });

        if (result.duplicate) {
          setSaveStatus('duplicate');
          setSaveMessage(c.alreadySaved);
          sessionStorage.setItem(SAVE_KEY, '1');
          return;
        }

        if (result.success) {
          sessionStorage.setItem(SAVE_KEY, '1');
          setSaveStatus('saved');
          setSaveMessage(c.saved);
          return;
        }
      } catch (edgeFnErr) {
        // silently handled
      }

      // ── Fallback: 클라이언트 직접 저장 (Edge Function 미배포 시) ──
      // ⚠ 개발/테스트 환경 전용 — 프로덕션에서는 반드시 Edge Function 사용
      try {
        const existing = await getBookingByOrderId(orderId);
        if (existing) {
          setSaveStatus('duplicate');
          setSaveMessage(c.alreadySaved);
          return;
        }
      } catch (_) { /* ignore */ }

      const { error } = await createBooking({
        customer_id:            user.id,
        photographer_name:      decodeURIComponent(artist),
        photographer_legacy_id: artistId || null,
        date,
        time:                   decodeURIComponent(time),
        package_name:           decodeURIComponent(pkg),
        package_price:          Number(pkgPrice),
        total_price:            Number(amount),
        stylist_price:          Number(stylistPrice),
        stylist_name:           decodeURIComponent(stylistName),
        stylist_service:        decodeURIComponent(stylistSvc),
        dress_name:             decodeURIComponent(dressName),
        dress_size:             decodeURIComponent(dressSize),
        dress_price:            Number(dressPrice),
        venue_name:             decodeURIComponent(venueName),
        venue_price:            Number(venuePrice),
        toss_order_id:          orderId,
        toss_payment_key:       paymentKey,
        lang,
      });

      if (error) {
        setSaveStatus('error');
        setSaveMessage(c.saveError);
      } else {
        sessionStorage.setItem(SAVE_KEY, '1');
        setSaveStatus('saved');
        setSaveMessage(c.saved);
      }
    };

    save();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentKey, isLoggedIn, user, authLoading]);

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* ── 성공 헤더 ── */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(232,160,32,0.12)', border: '1px solid var(--gold-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: 28,
          }}>
            ✓
          </div>
          <div className="section-label">{c.label}</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(22px, 4vw, 36px)', marginBottom: 16 }}>
            {c.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', fontFamily: 'var(--font-elegant)', fontStyle: 'italic', marginBottom: 20 }}>
            {c.sub}
          </p>

          {/* 저장 상태 배지 */}
          <SaveBadge status={saveStatus} message={saveMessage} />
        </div>

        {/* ── 주문 정보 ── */}
        <div style={{ border: '1px solid var(--gold-border)', padding: '40px 36px', background: 'var(--gold-dim)', position: 'relative', marginBottom: 24 }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 24 }}>
            {c.orderLabel}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: c.artist,  value: decodeURIComponent(artist) },
              { label: c.date,    value: date },
              { label: c.time,    value: decodeURIComponent(time) },
              { label: c.pkg,     value: decodeURIComponent(pkg) },
              { label: c.dressLabel, value: dressName ? decodeURIComponent(dressName) : '' },
              { label: c.venueLabel, value: venueName ? decodeURIComponent(venueName) : '' },
              { label: c.amount,  value: amount ? `₩${fmt(amount)}` : '' },
              { label: c.orderId, value: orderId },
            ].filter(item => item.value).map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderBottom: '1px solid rgba(232,160,32,0.15)',
              }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize: 13, fontFamily: 'var(--font-serif)',
                  color: item.label === c.amount ? 'var(--gold)' : 'var(--text)',
                  fontWeight: item.label === c.amount ? 600 : 400,
                }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 환불 정책 ── */}
        <div style={{ border: '1px solid var(--border)', padding: '28px 32px', background: 'var(--bg2)', position: 'relative', marginBottom: 24 }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>
            {c.refundTitle}
          </div>
          {c.refundItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, color: 'var(--gold)', marginTop: 2, flexShrink: 0 }}>—</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* ── 다음 단계 ── */}
        <div style={{ border: '1px solid var(--border)', padding: '28px 32px', background: 'var(--bg2)', position: 'relative', marginBottom: 48 }}>
          <Corners />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>
            {c.next}
          </div>
          {c.nextItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', flexShrink: 0, marginTop: 1 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* ── 탄소발자국 ── */}
        <div style={{ marginBottom: 48 }}>
          <CarbonFootprint mode="booking" booking={{ hasRental: true, rentalItems: [{ type: 'dress', quantity: 1 }], distanceKm: 15, transportMode: 'public', sessionType: 'outdoor', durationHours: 2 }} />
        </div>

        {/* ── 버튼 ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/my-bookings" className="btn-primary" style={{ flex: 1, minWidth: 160, justifyContent: 'center', textDecoration: 'none' }}>
            {c.myBookingsBtn}
          </Link>
          <Link to="/" className="btn-outline" style={{ textDecoration: 'none' }}>
            {c.homeBtn}
          </Link>
          <Link to="/contact" className="btn-outline" style={{ textDecoration: 'none' }}>
            {c.contactBtn}
          </Link>
        </div>

        {/* ── Share Button ── */}
        <button
          onClick={() => setShowShareModal(true)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px 16px',
            fontSize: '13px',
            background: 'transparent',
            border: '1px solid var(--gold-border)',
            color: 'var(--gold)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '2px',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(232,160,32,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ↗ {lang === 'ko' ? '작가 추천하기' : lang === 'ja' ? '作家を推薦' : lang === 'zh' ? '推荐摄影师' : 'Recommend Photographer'}
        </button>

      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareData={{
          title: `${decodeURIComponent(artist)} — Phosnap`,
          description: lang === 'ko'
            ? `${lang === 'ko' ? '뛰어난 촬영 작가를 발견하세요!' : lang === 'ja' ? '素晴らしいカメラマンを発見しましょう！' : lang === 'zh' ? '发现优秀摄影师！' : 'Discover an excellent photographer!'}`
            : lang === 'ja'
            ? '素晴らしいカメラマンを発見しましょう！'
            : lang === 'zh'
            ? '发现优秀摄影师！'
            : 'Discover an excellent photographer!',
          imageUrl: null,
          url: `/profile/${artistId}`,
          type: 'photographer',
        }}
      />

      <Footer />
    </div>
  );
};

export default BookingSuccess;
