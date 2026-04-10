import { useState } from 'react';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';

const CONTACT_ENDPOINT = import.meta.env.VITE_FORMSPREE_CONTACT_ID
  ? `https://formspree.io/f/${import.meta.env.VITE_FORMSPREE_CONTACT_ID}`
  : null;

const CONTENT = {
  ko: {
    label: '문의하기',
    title: '무엇이든 물어보세요',
    sub: '작가 등록, 예약, 파트너십 등 궁금한 점이 있으시면 편하게 연락주세요.',
    typeLabel: '문의 유형',
    types: ['일반 문의', '작가 등록', '예약 관련', '파트너십', '버그 신고', '기타'],
    nameLabel: '이름',
    namePlaceholder: '홍길동',
    emailLabel: '이메일',
    emailPlaceholder: 'hello@example.com',
    msgLabel: '문의 내용',
    msgPlaceholder: '궁금하신 내용을 자유롭게 적어주세요.',
    submit: '문의 보내기 →',
    sending: '전송 중···',
    doneTitle: '✓ 문의가 접수되었습니다',
    doneMsg: '빠른 시일 내에 이메일로 답변 드리겠습니다.',
    errorMsg: '전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    infoTitle: '연락처 정보',
    infoEmail: 'keonsik806@gmail.com',
    infoInstagram: '@phosnap.kr',
    infoResponse: '평균 응답 시간: 24시간 이내',
  },
  en: {
    label: 'Contact',
    title: 'Get in Touch',
    sub: 'Have a question about artist registration, bookings, or partnerships? We\'d love to hear from you.',
    typeLabel: 'Inquiry Type',
    types: ['General', 'Artist Registration', 'Booking', 'Partnership', 'Bug Report', 'Other'],
    nameLabel: 'Name',
    namePlaceholder: 'John Doe',
    emailLabel: 'Email',
    emailPlaceholder: 'hello@example.com',
    msgLabel: 'Message',
    msgPlaceholder: 'Tell us what\'s on your mind.',
    submit: 'Send Message →',
    sending: 'Sending···',
    doneTitle: '✓ Message received',
    doneMsg: 'We\'ll get back to you by email as soon as possible.',
    errorMsg: 'Something went wrong. Please try again.',
    infoTitle: 'Contact Info',
    infoEmail: 'keonsik806@gmail.com',
    infoInstagram: '@phosnap.kr',
    infoResponse: 'Average response time: within 24 hours',
  },
  ja: {
    label: 'お問い合わせ',
    title: 'お気軽にご連絡ください',
    sub: '作家登録、予約、パートナーシップなど、ご不明な点がございましたらお気軽にお問い合わせください。',
    typeLabel: 'お問い合わせ種別',
    types: ['一般お問い合わせ', '作家登録', '予約について', 'パートナーシップ', 'バグ報告', 'その他'],
    nameLabel: 'お名前',
    namePlaceholder: '山田太郎',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'hello@example.com',
    msgLabel: 'お問い合わせ内容',
    msgPlaceholder: 'ご質問やご要望をご記入ください。',
    submit: '送信する →',
    sending: '送信中···',
    doneTitle: '✓ お問い合わせを受け付けました',
    doneMsg: 'できるだけ早くメールにてご回答いたします。',
    errorMsg: '送信中にエラーが発生しました。しばらくしてからもう一度お試しください。',
    infoTitle: '連絡先',
    infoEmail: 'keonsik806@gmail.com',
    infoInstagram: '@phosnap.kr',
    infoResponse: '平均応答時間：24時間以内',
  },
  zh: {
    label: '联系我们',
    title: '随时联系我们',
    sub: '关于艺术家注册、预约或合作等问题，欢迎随时与我们联系。',
    typeLabel: '咨询类型',
    types: ['一般咨询', '艺术家注册', '预约相关', '合作洽谈', '问题反馈', '其他'],
    nameLabel: '姓名',
    namePlaceholder: '张三',
    emailLabel: '电子邮件',
    emailPlaceholder: 'hello@example.com',
    msgLabel: '咨询内容',
    msgPlaceholder: '请告诉我们您想了解的内容。',
    submit: '发送消息 →',
    sending: '发送中···',
    doneTitle: '✓ 消息已收到',
    doneMsg: '我们将尽快通过电子邮件回复您。',
    errorMsg: '发送失败，请稍后重试。',
    infoTitle: '联系方式',
    infoEmail: 'keonsik806@gmail.com',
    infoInstagram: '@phosnap.kr',
    infoResponse: '平均响应时间：24小时内',
  },
};

const Contact = () => {
  const { lang } = useLanguage();
  const c = CONTENT[lang] ?? CONTENT['ko'];
  // eslint-disable-next-line no-unused-vars

  const [type, setType]       = useState(c.types[0]);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (CONTACT_ENDPOINT) {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, email, type, message, _subject: `[Phosnap Contact] ${type} — ${name}`, _language: lang }),
        });
        if (!res.ok) throw new Error();
      } else {
        console.warn('[Phosnap] VITE_FORMSPREE_CONTACT_ID not set');
      }
      setDone(true);
    } catch {
      setError(c.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px 80px' }}>

        <div className="section-label">{c.label}</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(24px, 4vw, 44px)' }}>{c.title}</h1>
        <p className="section-sub">{c.sub}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, marginTop: 56, alignItems: 'start' }}>

          {/* ── 폼 ── */}
          <div style={{ border: '1px solid var(--border)', padding: '48px 40px', background: 'var(--bg2)', position: 'relative' }}>
            <Corners />

            {done ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 16 }}>
                  {c.doneTitle}
                </div>
                <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-elegant)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.8 }}>
                  {c.doneMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>

                {/* 문의 유형 */}
                <div className="form-group">
                  <label className="form-label">{c.typeLabel}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {c.types.map(tp => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setType(tp)}
                        style={{
                          padding: '7px 14px',
                          fontSize: 12,
                          letterSpacing: '0.04em',
                          border: `1px solid ${type === tp ? 'var(--gold)' : 'var(--border)'}`,
                          background: type === tp ? 'rgba(232,160,32,0.08)' : 'transparent',
                          color: type === tp ? 'var(--gold)' : 'var(--muted)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 이름 + 이메일 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">{c.nameLabel}</label>
                    <input className="form-input" type="text" placeholder={c.namePlaceholder}
                      value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{c.emailLabel}</label>
                    <input className="form-input" type="email" placeholder={c.emailPlaceholder}
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                {/* 메시지 */}
                <div className="form-group">
                  <label className="form-label">{c.msgLabel}</label>
                  <textarea
                    className="form-input"
                    placeholder={c.msgPlaceholder}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={6}
                    style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                  />
                </div>

                {error && <p style={{ color: '#e85d5d', fontSize: 12, marginBottom: 8 }}>{error}</p>}

                <button type="submit" className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '16px', opacity: loading ? 0.7 : 1 }}>
                  {loading ? c.sending : c.submit}
                </button>
              </form>
            )}
          </div>

          {/* ── 연락처 정보 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ border: '1px solid var(--border)', padding: '32px 28px', background: 'var(--bg2)', position: 'relative' }}>
              <Corners />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: 20, textTransform: 'uppercase' }}>
                {c.infoTitle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
                  <a href={`mailto:${c.infoEmail}`} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}>{c.infoEmail}</a>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Instagram</div>
                  <a href="https://instagram.com/phosnap.kr" target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}>{c.infoInstagram}</a>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{c.infoResponse}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
