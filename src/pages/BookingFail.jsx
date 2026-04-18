import { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Booking Fail Page ─────────────────────────────────────────────────
// TossPayments 결제 실패/취소 후 리다이렉트되는 페이지
// URL params: code, message, orderId (TossPayments 자동 전달)

const CONTENT = {
  ko: {
    label:    '결제 실패',
    title:    '결제가 완료되지 않았습니다',
    sub:      '결제 중 문제가 발생했거나 취소되었습니다.\n아래에서 원인을 확인하고 다시 시도해주세요.',
    errorCode: '오류 코드',
    errorMsg:  '오류 내용',
    retryBtn: '다시 시도하기',
    homeBtn:  '홈으로 돌아가기',
    contactBtn: '문의하기',
    tipTitle: '결제가 안 되시나요?',
    tips: [
      '카드 한도 또는 잔액을 확인해주세요.',
      '해외 결제 차단 여부를 카드사에 문의해주세요.',
      '다른 결제 수단(카카오페이, 네이버페이 등)을 시도해보세요.',
      '문제가 지속되면 고객센터로 문의해주세요.',
    ],
    cancelNote: '결제를 취소하셨습니다. 언제든지 다시 예약하실 수 있습니다.',
  },
  en: {
    label:    'Payment Failed',
    title:    'Payment was not completed',
    sub:      'Something went wrong or the payment was cancelled.\nPlease check the details below and try again.',
    errorCode: 'Error Code',
    errorMsg:  'Error Message',
    retryBtn: 'Try Again',
    homeBtn:  'Back to Home',
    contactBtn: 'Contact Us',
    tipTitle: 'Having trouble paying?',
    tips: [
      'Check your card limit or balance.',
      'Contact your bank about international payment restrictions.',
      'Try a different payment method (KakaoPay, NaverPay, etc.).',
      'If the issue persists, please contact our support team.',
    ],
    cancelNote: 'You cancelled the payment. You can restart your booking anytime.',
  },
  ja: {
    label:    'お支払い失敗',
    title:    'お支払いが完了しませんでした',
    sub:      '決済中に問題が発生したか、キャンセルされました。\n下記をご確認のうえ、もう一度お試しください。',
    errorCode: 'エラーコード',
    errorMsg:  'エラー内容',
    retryBtn: '再試行する',
    homeBtn:  'ホームへ戻る',
    contactBtn: 'お問い合わせ',
    tipTitle: 'お支払いでお困りですか？',
    tips: [
      'カードの限度額または残高をご確認ください。',
      '海外決済の制限についてカード会社にお問い合わせください。',
      '別の支払い方法（カカオペイ、ネイバーペイ等）をお試しください。',
      '問題が続く場合はサポートまでご連絡ください。',
    ],
    cancelNote: 'お支払いをキャンセルしました。いつでも再予約いただけます。',
  },
  zh: {
    label:    '支付失败',
    title:    '支付未能完成',
    sub:      '支付过程中出现问题或被取消。\n请查看以下信息并重试。',
    errorCode: '错误代码',
    errorMsg:  '错误信息',
    retryBtn: '重试',
    homeBtn:  '返回首页',
    contactBtn: '联系我们',
    tipTitle: '支付遇到问题？',
    tips: [
      '请检查您的信用卡额度或余额。',
      '请咨询发卡行关于境外支付限制。',
      '请尝试其他支付方式（KakaoPay、NaverPay等）。',
      '如问题持续，请联系客服。',
    ],
    cancelNote: '您已取消支付，可随时重新预约。',
  },
};

const BookingFail = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const c = CONTENT[lang] ?? CONTENT['ko'];

  const code    = params.get('code')    || '';
  const message = params.get('message') || '';
  const orderId = params.get('orderId') || '';

  const isCancelled = code === 'USER_CANCEL' || code === 'PAY_PROCESS_CANCELED';

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* ── 실패 헤더 ── */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(232,80,80,0.08)', border: '1px solid rgba(232,80,80,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: 28, color: '#e85d5d',
          }}>
            ✕
          </div>
          <div className="section-label" style={{ color: '#e85d5d' }}>{c.label}</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(20px, 4vw, 32px)', marginBottom: 16 }}>
            {c.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', fontFamily: 'var(--font-elegant)', fontStyle: 'italic' }}>
            {isCancelled ? c.cancelNote : c.sub}
          </p>
        </div>

        {/* ── 오류 상세 (취소 아닐 때만) ── */}
        {!isCancelled && (code || message) && (
          <div style={{ border: '1px solid rgba(232,80,80,0.2)', padding: '28px 32px', background: 'rgba(232,80,80,0.04)', position: 'relative', marginBottom: 24 }}>
            <Corners />
            {code && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.errorCode}</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#e85d5d' }}>{code}</span>
              </div>
            )}
            {message && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>{c.errorMsg}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{message}</span>
              </div>
            )}
          </div>
        )}

        {/* ── 도움말 ── */}
        {!isCancelled && (
          <div style={{ border: '1px solid var(--border)', padding: '28px 32px', background: 'var(--bg2)', position: 'relative', marginBottom: 40 }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>
              {c.tipTitle}
            </div>
            {c.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: 'var(--gold)', marginTop: 2, flexShrink: 0 }}>—</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── 버튼 ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(-2)}>
            {c.retryBtn}
          </button>
          <Link to="/" className="btn-outline" style={{ textDecoration: 'none' }}>
            {c.homeBtn}
          </Link>
          <Link to="/contact" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 12 }}>
            {c.contactBtn}
          </Link>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default BookingFail;
