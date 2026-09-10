import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import Footer from '../components/Footer';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { PHOTOGRAPHERS, fmt } from '../data/photographers';
import { getMergedProfile } from '../data/artistProfile';
import {
  getInstance,
  addBooking,
  cancelBooking,
  confirmAdjustedPrice,
  declineAdjustedPrice,
  getActiveBookingCount,
  getRemainingSlots,
  getPerPersonPrice,
  getStatusLabel,
  getStatusColor,
  evaluateDeadlines,
} from '../data/tourBookingStore';

// ─── Tour Detail / Booking Page ─────────────────────────────────────────

const TourDetail = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const [instance, setInstance] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [tour, setTour] = useState(null);

  // 예약 폼
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', headcount: 1 });
  const [submitResult, setSubmitResult] = useState(null);

  // 내 예약 찾기 (이메일 기반 — 실제로는 auth)
  const [myEmail, setMyEmail] = useState('');
  const [myBooking, setMyBooking] = useState(null);

  const refresh = useCallback(() => {
    evaluateDeadlines();
    const inst = getInstance(instanceId);
    setInstance(inst);
    if (inst) {
      const pMock = PHOTOGRAPHERS.find(ph => ph.id === inst.photographerId);
      const p = getMergedProfile(pMock, 'photographer', inst.photographerId);
      setPhotographer(p);
      setTour(p?.tours?.[inst.tourIndex] || null);
    }
  }, [instanceId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('tourInstancesChanged', handler);
    return () => window.removeEventListener('tourInstancesChanged', handler);
  }, [refresh]);

  // 내 예약 검색
  useEffect(() => {
    if (!instance || !myEmail) { setMyBooking(null); return; }
    const found = instance.bookings.find(b => b.guestEmail === myEmail && b.status !== 'cancelled');
    setMyBooking(found || null);
  }, [instance, myEmail]);

  if (!instance) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              {lang === 'ko' ? '투어를 찾을 수 없습니다' : 'Tour not found'}
            </div>
            <button className="btn-ghost" onClick={() => navigate(-1)}>
              {lang === 'ko' ? '← 돌아가기' : '← Go Back'}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const count = getActiveBookingCount(instance);
  const remaining = getRemainingSlots(instance);
  const statusLabel = getStatusLabel(instance.status, lang);
  const statusColor = getStatusColor(instance.status);
  const isTotal = instance.pricingType === 'total';
  const perPersonPrice = getPerPersonPrice(instance);
  const fillPercent = Math.min(100, (count / instance.maxGuests) * 100);

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    const days = lang === 'ko' ? ['일','월','화','수','목','금','토'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${dt.getFullYear()}.${dt.getMonth()+1}.${dt.getDate()} (${days[dt.getDay()]})`;
  };

  const daysUntilDeadline = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dl = new Date(instance.deadline + 'T00:00:00');
    return Math.ceil((dl - today) / 86400000);
  };

  const handleSubmit = () => {
    if (!form.guestName || !form.guestEmail) return;
    const result = addBooking(instanceId, form);
    if (result.error) {
      setSubmitResult({ type: 'error', message: result.error === 'FULL' ? '이미 마감되었습니다' : result.error === 'NOT_RECRUITING' ? '모집이 종료되었습니다' : result.error });
    } else {
      setSubmitResult({ type: 'success', booking: result.booking });
      setMyEmail(form.guestEmail);
      setFormOpen(false);
      refresh();
    }
  };

  const handleCancelMyBooking = () => {
    if (!myBooking) return;
    if (!confirm(lang === 'ko' ? '참가를 취소하시겠습니까?' : 'Cancel your booking?')) return;
    cancelBooking(instanceId, myBooking.id);
    setMyBooking(null);
    refresh();
  };

  const handleConfirmAdjusted = () => {
    if (!myBooking) return;
    confirmAdjustedPrice(instanceId, myBooking.id);
    refresh();
  };

  const handleDeclineAdjusted = () => {
    if (!myBooking) return;
    if (!confirm(lang === 'ko' ? '새 가격을 거절하면 참가가 취소됩니다. 계속하시겠습니까?' : 'Declining will cancel your booking. Continue?')) return;
    declineAdjustedPrice(instanceId, myBooking.id);
    setMyBooking(null);
    refresh();
  };

  const durText = tour?.durationMin >= 60
    ? `${Math.floor(tour.durationMin / 60)}${lang === 'ko' ? '시간' : 'h'}${tour.durationMin % 60 ? ` ${tour.durationMin % 60}${lang === 'ko' ? '분' : 'm'}` : ''}`
    : `${tour?.durationMin || 0}${lang === 'ko' ? '분' : 'm'}`;

  const inputStyle = {
    display: 'block', marginTop: 6, width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '10px 14px', fontFamily: 'var(--font-serif)', fontSize: 13,
  };

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ flex: 1, maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        {/* 뒤로가기 */}
        <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 20, fontSize: 12 }}>
          <ArrowLeftIcon /> {lang === 'ko' ? '돌아가기' : 'Back'}
        </button>

        {/* 헤더 카드 */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '24px 28px', position: 'relative', marginBottom: 24 }}>
          <Corners />

          {/* 상태 뱃지 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'var(--gold)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 4 }}>
                🗺️ PHOTO TOUR
              </div>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-serif)', color: 'var(--text)', lineHeight: 1.3 }}>
                {instance.tourName}
              </div>
            </div>
            <div style={{
              fontSize: 10, padding: '4px 12px', fontFamily: 'var(--font-serif)',
              background: `${statusColor}15`, color: statusColor,
              border: `1px solid ${statusColor}30`, letterSpacing: '0.05em',
            }}>
              {statusLabel}
            </div>
          </div>

          {/* 작가 정보 */}
          {photographer && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}
              onClick={() => navigate(`/photographer/${photographer.id}`)}
            >
              {photographer.img && (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                  backgroundImage: `url(${photographer.img})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  border: '1px solid var(--border)',
                }} />
              )}
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                  {lang === 'ko' && photographer.nameKo ? photographer.nameKo : photographer.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {photographer.locationNames?.[lang] ?? photographer.location}
                </div>
              </div>
            </div>
          )}

          {/* 일정 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                📅 {lang === 'ko' ? '투어 날짜' : 'Tour Date'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                {fmtDate(instance.scheduledDate)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {instance.scheduledTime} · {durText}
              </div>
            </div>
            <div style={{ padding: '12px 16px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                ⏰ {lang === 'ko' ? '모집 마감' : 'Deadline'}
              </div>
              <div style={{ fontSize: 14, color: daysUntilDeadline() <= 3 ? '#e85d5d' : 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                {fmtDate(instance.deadline)}
              </div>
              <div style={{ fontSize: 11, color: daysUntilDeadline() <= 3 ? '#e85d5d' : 'var(--muted)', marginTop: 2 }}>
                {daysUntilDeadline() > 0 ? `D-${daysUntilDeadline()}` : lang === 'ko' ? '마감됨' : 'Closed'}
              </div>
            </div>
          </div>

          {/* 가격 정보 */}
          <div style={{ padding: '14px 18px', border: '1px solid rgba(232,160,32,0.2)', background: 'rgba(232,160,32,0.03)', marginBottom: 16 }}>
            {isTotal ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lang === 'ko' ? '총액' : 'Total'}</div>
                  <div style={{ fontSize: 20, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>₩{fmt(instance.basePrice)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(232,160,32,0.1)', color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
                    {lang === 'ko' ? '더치페이' : 'Split'}
                  </span>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                    {lang === 'ko' ? '1인당' : 'Per person'} ₩{fmt(perPersonPrice)}
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}> ({count}/{instance.maxGuests}{lang === 'ko' ? '명' : ''})</span>
                  </div>
                </div>
                {instance.status === 'adjusting' && instance.currentPrice !== Math.ceil(instance.basePrice / instance.maxGuests) && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)', fontSize: 11, color: '#ff9800' }}>
                    ⚠️ {lang === 'ko'
                      ? `인원 미달로 1인당 ₩${fmt(instance.currentPrice)}으로 조정되었습니다. 참여자 확인 대기 중...`
                      : `Price adjusted to ₩${fmt(instance.currentPrice)}/person due to fewer participants. Awaiting confirmation...`
                    }
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lang === 'ko' ? '1인당' : 'Per person'}</div>
                <div style={{ fontSize: 20, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>₩{fmt(instance.basePrice)}</div>
              </div>
            )}
          </div>

          {/* 인원 현황 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
                👥 {lang === 'ko' ? '참여 현황' : 'Participants'}
              </span>
              <span style={{ fontSize: 12, color: remaining > 0 ? 'var(--text)' : '#4caf50', fontFamily: 'var(--font-serif)' }}>
                {count} / {instance.maxGuests}
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
                width: `${fillPercent}%`,
                background: count >= instance.maxGuests ? '#4caf50' : count >= instance.minGuests ? '#e8a020' : `linear-gradient(90deg, #e85d5d, #e8a020)`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
              <span>{lang === 'ko' ? `최소 ${instance.minGuests}명` : `Min ${instance.minGuests}`}</span>
              <span>{remaining > 0 ? `${remaining}${lang === 'ko' ? '자리 남음' : ' spots left'}` : lang === 'ko' ? '마감' : 'Full'}</span>
            </div>

            {/* 참여자 아바타 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {instance.bookings.filter(b => b.status !== 'cancelled').map((b, i) => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  background: b.status === 'pendingConfirm' ? 'rgba(255,152,0,0.08)' : 'rgba(76,175,80,0.05)',
                  border: `1px solid ${b.status === 'pendingConfirm' ? 'rgba(255,152,0,0.2)' : 'rgba(76,175,80,0.1)'}`,
                  fontSize: 11, fontFamily: 'var(--font-serif)',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', fontSize: 10, lineHeight: '20px', textAlign: 'center',
                    background: `hsl(${(i * 60) % 360}, 40%, 85%)`, color: '#333',
                  }}>
                    {b.guestName.charAt(0)}
                  </div>
                  {b.guestName} {b.headcount > 1 && `+${b.headcount - 1}`}
                  {b.status === 'pendingConfirm' && <span style={{ fontSize: 9, color: '#ff9800' }}>⏳</span>}
                </div>
              ))}
              {/* 빈 자리 */}
              {Array.from({ length: remaining }, (_, i) => (
                <div key={`empty-${i}`} style={{
                  width: 20, height: 20, borderRadius: '50%', border: '1px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)',
                }}>
                  ?
                </div>
              ))}
            </div>
          </div>

          {/* 투어 상세 정보 */}
          {tour && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', gap: 16 }}>
                <span>⏱ {durText}</span>
                <span>📷 {tour.photos}{lang === 'ko' ? '장 보정' : ' edited photos'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>
                {tour.descI18n?.[lang] ?? tour.desc}
              </div>
              {tour.spots?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tour.spots.map((spot, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '3px 10px',
                      background: 'rgba(232,160,32,0.08)',
                      border: '1px solid rgba(232,160,32,0.15)',
                      color: 'var(--gold)', fontFamily: 'var(--font-serif)',
                    }}>
                      📍 {spot}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 예약 검색 (내 예약 확인) ── */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 24px', position: 'relative', marginBottom: 24 }}>
          <Corners />
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--muted)', fontFamily: 'var(--font-serif)', marginBottom: 10, textTransform: 'uppercase' }}>
            🔍 {lang === 'ko' ? '내 예약 확인' : 'Check My Booking'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder={lang === 'ko' ? '예약 시 사용한 이메일' : 'Email used for booking'}
              value={myEmail}
              onChange={e => setMyEmail(e.target.value)}
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
            />
          </div>

          {myBooking && (
            <div style={{ marginTop: 12, padding: '12px 16px', border: '1px solid rgba(76,175,80,0.2)', background: 'rgba(76,175,80,0.03)' }}>
              <div style={{ fontSize: 12, color: '#4caf50', fontFamily: 'var(--font-serif)', marginBottom: 6 }}>
                ✅ {lang === 'ko' ? '예약 확인됨' : 'Booking Found'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text)' }}>
                {myBooking.guestName} · {myBooking.headcount}{lang === 'ko' ? '명' : ' guest(s)'}
              </div>

              {/* adjusting 상태에서 가격 확인 요청 */}
              {instance.status === 'adjusting' && myBooking.status === 'pendingConfirm' && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)' }}>
                  <div style={{ fontSize: 11, color: '#ff9800', marginBottom: 8, lineHeight: 1.5 }}>
                    ⚠️ {lang === 'ko'
                      ? `인원이 ${count}명으로 확정되어 1인당 가격이 ₩${fmt(instance.currentPrice)}으로 변경되었습니다. 이 가격으로 참여하시겠습니까?`
                      : `With ${count} participants, the price per person is now ₩${fmt(instance.currentPrice)}. Would you like to continue?`
                    }
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleConfirmAdjusted}
                      style={{ flex: 1, padding: '8px', fontSize: 11, color: '#fff', background: '#4caf50', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                      {lang === 'ko' ? '✓ 수락' : '✓ Accept'}
                    </button>
                    <button onClick={handleDeclineAdjusted}
                      style={{ flex: 1, padding: '8px', fontSize: 11, color: '#e85d5d', background: 'transparent', border: '1px solid rgba(232,93,93,0.3)', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                      {lang === 'ko' ? '✗ 거절 (참가 취소)' : '✗ Decline (Cancel)'}
                    </button>
                  </div>
                </div>
              )}

              {/* 일반 취소 버튼 */}
              {myBooking.status === 'active' && instance.status !== 'adjusting' && (
                <button onClick={handleCancelMyBooking}
                  style={{ marginTop: 8, fontSize: 10, color: '#e85d5d', background: 'transparent', border: '1px solid rgba(232,93,93,0.3)', padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                  {lang === 'ko' ? '참가 취소' : 'Cancel Booking'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 참가 신청 ── */}
        {instance.status === 'recruiting' && remaining > 0 && (
          <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 24px', position: 'relative', marginBottom: 24 }}>
            <Corners />

            {!formOpen ? (
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '14px 0' }}
                onClick={() => setFormOpen(true)}
              >
                {lang === 'ko' ? `🗺️ 참가 신청 (${remaining}자리 남음)` : `🗺️ Join Tour (${remaining} spots left)`}
              </button>
            ) : (
              <>
                <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--gold)', fontFamily: 'var(--font-serif)', marginBottom: 14, textTransform: 'uppercase' }}>
                  🗺️ {lang === 'ko' ? '참가 신청' : 'Join This Tour'}
                </div>

                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 12 }}>
                  {lang === 'ko' ? '이름' : 'Name'} *
                  <input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })}
                    placeholder={lang === 'ko' ? '홍길동' : 'Your name'} style={inputStyle} />
                </label>

                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 12 }}>
                  {lang === 'ko' ? '이메일' : 'Email'} *
                  <input type="email" value={form.guestEmail} onChange={e => setForm({ ...form, guestEmail: e.target.value })}
                    placeholder="email@example.com" style={inputStyle} />
                </label>

                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 12 }}>
                  {lang === 'ko' ? '연락처' : 'Phone'}
                  <input value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })}
                    placeholder="010-0000-0000" style={inputStyle} />
                </label>

                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 16 }}>
                  {lang === 'ko' ? '인원 수' : 'Headcount'}
                  <select value={form.headcount} onChange={e => setForm({ ...form, headcount: Number(e.target.value) })} style={inputStyle}>
                    {Array.from({ length: Math.min(remaining, 4) }, (_, i) => (
                      <option key={i+1} value={i+1}>{i+1}{lang === 'ko' ? '명' : ''}</option>
                    ))}
                  </select>
                </label>

                {/* 가격 요약 */}
                <div style={{ padding: '12px 16px', border: '1px solid rgba(232,160,32,0.2)', background: 'rgba(232,160,32,0.03)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>
                      {isTotal
                        ? `${lang === 'ko' ? '더치페이' : 'Split'} ₩${fmt(perPersonPrice)} × ${form.headcount}`
                        : `₩${fmt(instance.basePrice)} × ${form.headcount}`
                      }
                    </span>
                    <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: 14 }}>
                      ₩{fmt((isTotal ? perPersonPrice : instance.basePrice) * form.headcount)}
                    </span>
                  </div>
                  {isTotal && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                      * {lang === 'ko'
                        ? '최종 인원에 따라 1인당 가격이 변동될 수 있습니다'
                        : 'Per-person price may adjust based on final group size'
                      }
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                    onClick={handleSubmit}
                    disabled={!form.guestName || !form.guestEmail}
                  >
                    {lang === 'ko' ? '참가 신청하기' : 'Submit Booking'}
                  </button>
                  <button className="btn-ghost" onClick={() => setFormOpen(false)} style={{ fontSize: 12 }}>
                    {lang === 'ko' ? '취소' : 'Cancel'}
                  </button>
                </div>
              </>
            )}

            {/* 결과 메시지 */}
            {submitResult && (
              <div style={{
                marginTop: 12, padding: '10px 14px', fontSize: 12,
                border: `1px solid ${submitResult.type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(232,93,93,0.3)'}`,
                background: submitResult.type === 'success' ? 'rgba(76,175,80,0.05)' : 'rgba(232,93,93,0.05)',
                color: submitResult.type === 'success' ? '#4caf50' : '#e85d5d',
              }}>
                {submitResult.type === 'success'
                  ? (lang === 'ko' ? '🎉 참가 신청이 완료되었습니다! 마감일에 확정 여부를 안내해 드립니다.' : '🎉 Booking confirmed! You will be notified when the tour is finalized.')
                  : `❌ ${submitResult.message}`
                }
              </div>
            )}
          </div>
        )}

        {/* 마감/확정 상태 메시지 */}
        {instance.status === 'confirmed' && (
          <div style={{ border: '1px solid rgba(76,175,80,0.3)', background: 'rgba(76,175,80,0.05)', padding: '20px 24px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 14, color: '#4caf50', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
              {lang === 'ko' ? '투어가 확정되었습니다!' : 'Tour Confirmed!'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {fmtDate(instance.scheduledDate)} {instance.scheduledTime}
            </div>
          </div>
        )}

        {instance.status === 'cancelled' && (
          <div style={{ border: '1px solid rgba(232,93,93,0.3)', background: 'rgba(232,93,93,0.05)', padding: '20px 24px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>😢</div>
            <div style={{ fontSize: 14, color: '#e85d5d', fontFamily: 'var(--font-serif)' }}>
              {lang === 'ko' ? '이 투어는 취소되었습니다' : 'This tour has been cancelled'}
            </div>
          </div>
        )}

        {/* 크라우드펀딩 진행 방식 안내 */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 24px', position: 'relative', marginBottom: 24 }}>
          <Corners />
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--muted)', fontFamily: 'var(--font-serif)', marginBottom: 12, textTransform: 'uppercase' }}>
            ℹ️ {lang === 'ko' ? '투어 진행 방식' : 'How It Works'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            {lang === 'ko' ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>1. 참가 신청</strong> — 원하는 투어에 참가 신청을 합니다.
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>2. 인원 모집</strong> — 마감일까지 인원을 모집합니다. 최대 인원이 모이면 자동 확정됩니다.
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>3. 마감 후 확인</strong> — 마감일에 최소 인원 이상이면 진행됩니다. {isTotal ? '인원에 따라 1인당 가격이 재계산되며, 새 가격을 수락해야 확정됩니다.' : ''}
                </div>
                <div>
                  <strong style={{ color: 'var(--text)' }}>4. 취소 시</strong> — 참가 취소 시 빈 자리가 다시 오픈되어 새로운 참가자를 모집합니다.
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>1. Sign Up</strong> — Apply to join the tour.
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>2. Recruitment</strong> — Spots fill up until the deadline. Auto-confirmed when full.
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>3. After Deadline</strong> — If minimum met, the tour proceeds. {isTotal ? 'Price recalculated per actual participants.' : ''}
                </div>
                <div>
                  <strong style={{ color: 'var(--text)' }}>4. Cancellation</strong> — Cancelled spots reopen for new participants.
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default TourDetail;
