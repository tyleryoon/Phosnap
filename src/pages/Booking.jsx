import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Corners from '../components/Corners';
import StylistCard from '../components/StylistCard';
import { ArrowLeftIcon } from '../components/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { PHOTOGRAPHERS, fmt } from '../data/photographers';
import { getStylistsByLocation, fmtStylist } from '../data/stylists';

// ─── Booking Page ──────────────────────────────────────────────────────

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDay   = (year, month) => new Date(year, month, 1).getDay();

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const p = PHOTOGRAPHERS.find(ph => ph.id === Number(id));

  const [step, setStep]               = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPkg,  setSelectedPkg]  = useState(null);
  const [selectedStylist, setSelectedStylist] = useState(null);

  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  if (!p) return null;

  const availableStylists = getStylistsByLocation(p.locationId);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);

  const isPast = (day) => {
    const d = new Date(calYear, calMonth, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const pkgData     = p.packages.find(pk => pk.name === selectedPkg);
  const stylistData = availableStylists.find(s => s.id === selectedStylist);
  const totalPrice  = (pkgData?.price || 0) + (stylistData?.price || 0);

  const STEPS = [
    t('booking.selectDate'),
    t('booking.selectPackage'),
    t('booking.hmkStep'),
    t('booking.confirm'),
  ];

  const DAYS   = t('booking.days');
  const MONTHS = t('booking.months');

  // 이름: 언어별
  const artistName = lang === 'ko' && p.nameKo ? p.nameKo : p.name;
  const locationLabel = p.locationNames?.[lang] ?? p.location;

  const handleConfirm = () => {
    alert('MVP 단계입니다. 결제 기능은 곧 오픈됩니다!\n웨이트리스트에 등록해주세요.');
    navigate('/waitlist');
  };

  return (
    <div className="page-enter" style={{ paddingTop: 100 }}>
      <div className="section">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftIcon /> {t('booking.backBtn')}
        </button>

        {/* ── Progress bar ── */}
        <div className="booking-progress">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="booking-progress-step"
              style={{
                color: step === i + 1 ? 'var(--gold)' : step > i + 1 ? 'rgba(232,160,32,0.5)' : 'var(--muted)',
                borderBottom: step === i + 1 ? '2px solid var(--gold)' : '2px solid transparent',
                cursor: step > i + 1 ? 'pointer' : 'default',
              }}
              onClick={() => step > i + 1 && setStep(i + 1)}
            >
              {String(i + 1).padStart(2, '0')}
              <span className="booking-progress-step-label"> · {s}</span>
            </div>
          ))}
        </div>

        <div className="booking-layout">

          {/* ── Left: step content ── */}
          <div>

            {/* ─ Step 1: Calendar ─ */}
            {step === 1 && (
              <div>
                <div className="section-label">Step 01</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 32 }}>
                  {t('booking.step1Title')}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <button className="btn-ghost" onClick={() => {
                    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                    else setCalMonth(m => m - 1);
                  }}>{t('booking.calPrev')}</button>
                  <span style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.1em' }}>
                    {calYear} {Array.isArray(MONTHS) ? MONTHS[calMonth] : `${calMonth + 1}월`}
                  </span>
                  <button className="btn-ghost" onClick={() => {
                    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                    else setCalMonth(m => m + 1);
                  }}>{t('booking.calNext')}</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 32 }}>
                  {(Array.isArray(DAYS) ? DAYS : ['일','월','화','수','목','금','토']).map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: '8px 0', fontFamily: 'var(--font-serif)' }}>
                      {d}
                    </div>
                  ))}
                  {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                  {Array(daysInMonth).fill(null).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const past     = isPast(day);
                    const selected = selectedDate === dateStr;
                    return (
                      <button
                        key={day}
                        disabled={past}
                        onClick={() => !past && setSelectedDate(dateStr)}
                        style={{
                          padding: '10px 0', textAlign: 'center', fontSize: 13,
                          background: selected ? 'var(--gold)' : 'transparent',
                          color: past ? 'rgba(136,136,136,0.3)' : selected ? '#0B0B0B' : 'var(--text)',
                          border: '1px solid', borderColor: selected ? 'var(--gold)' : 'transparent',
                          cursor: past ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s', fontFamily: 'var(--font-serif)',
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn-primary"
                  disabled={!selectedDate}
                  style={{ opacity: selectedDate ? 1 : 0.4 }}
                  onClick={() => selectedDate && setStep(2)}
                >
                  {t('booking.nextStep')}
                </button>
              </div>
            )}

            {/* ─ Step 2: Package ─ */}
            {step === 2 && (
              <div>
                <div className="section-label">Step 02</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 32 }}>
                  {t('booking.step2Title')}
                </h2>
                <div className="packages">
                  {p.packages.map(pkg => (
                    <div
                      key={pkg.name}
                      className={`package ${pkg.popular ? 'recommended' : ''} ${selectedPkg === pkg.name ? 'selected' : ''}`}
                      onClick={() => setSelectedPkg(pkg.name)}
                    >
                      <Corners />
                      <div className="package-name">{pkg.name}</div>
                      <div className="package-price">₩{fmt(pkg.price)}<span>/ session</span></div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {pkg.hours}{t('profile.hours')} · {pkg.photos}{t('profile.photos')}
                      </div>
                      <div className="package-desc">{pkg.descI18n?.[lang] ?? pkg.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                  <button className="btn-outline" onClick={() => setStep(1)}>{t('booking.prev')}</button>
                  <button
                    className="btn-primary"
                    disabled={!selectedPkg}
                    style={{ opacity: selectedPkg ? 1 : 0.4 }}
                    onClick={() => selectedPkg && setStep(3)}
                  >
                    {t('booking.nextStep')}
                  </button>
                </div>
              </div>
            )}

            {/* ─ Step 3: H&M Stylist ─ */}
            {step === 3 && (
              <div>
                <div className="section-label">Step 03 · {t('booking.step3Optional')}</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('booking.step3Title')}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.8 }}>
                  {t('booking.step3Sub')}
                </p>

                {availableStylists.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
                    {availableStylists.map(s => (
                      <StylistCard
                        key={s.id}
                        s={s}
                        selected={selectedStylist === s.id}
                        onClick={() => setSelectedStylist(prev => prev === s.id ? null : s.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', marginBottom: 32 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', marginBottom: 8 }}>
                      {t('booking.noStylist')}
                    </div>
                    <div style={{ fontSize: 12 }}>{t('booking.stylistSoon')}</div>
                  </div>
                )}

                {selectedStylist && (
                  <div style={{ border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', padding: 24, marginBottom: 32, position: 'relative' }}>
                    <Corners />
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>
                      {t('booking.selectService')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      {availableStylists.find(s => s.id === selectedStylist)?.services.map(svc => (
                        <div key={svc.name} style={{ border: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg2)', cursor: 'default', position: 'relative' }}>
                          {svc.popular && (
                            <div style={{ position: 'absolute', top: -1, right: 12, background: 'var(--gold)', color: '#0B0B0B', fontFamily: 'var(--font-serif)', fontSize: 8, fontWeight: 600, letterSpacing: '0.1em', padding: '2px 8px' }}>
                              POPULAR
                            </div>
                          )}
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.08em', marginBottom: 6 }}>{svc.name}</div>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--gold)', marginBottom: 4 }}>₩{fmtStylist(svc.price)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{svc.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-outline" onClick={() => setStep(2)}>{t('booking.prev')}</button>
                  <button className="btn-primary" onClick={() => setStep(4)}>
                    {selectedStylist ? t('booking.withStylist') : t('booking.skipStylist')}
                  </button>
                </div>
              </div>
            )}

            {/* ─ Step 4: Confirm ─ */}
            {step === 4 && (
              <div>
                <div className="section-label">Step 04</div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, letterSpacing: '0.05em', marginBottom: 32 }}>
                  {t('booking.step4Title')}
                </h2>

                <div style={{ border: '1px solid var(--border)', padding: 32, background: 'var(--bg2)', position: 'relative', marginBottom: 24 }}>
                  <Corners />
                  <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
                    {t('booking.sessionInfo')}
                  </div>
                  {[
                    { label: t('booking.labelArtist'),   value: artistName },
                    { label: t('booking.labelLocation'), value: locationLabel },
                    { label: t('booking.labelDate'),     value: selectedDate },
                    { label: t('booking.labelPackage'),  value: selectedPkg },
                    { label: t('booking.labelFee'),      value: `₩${fmt(pkgData?.price || 0)}` },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {stylistData ? (
                  <div style={{ border: '1px solid var(--gold-border)', padding: 32, background: 'var(--gold-dim)', position: 'relative', marginBottom: 24 }}>
                    <Corners />
                    <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 20 }}>
                      {t('booking.hmkLabel')}
                    </div>
                    {[
                      { label: t('booking.hmkLabel'),      value: `${stylistData.name} (${stylistData.nameKo})` },
                      { label: t('booking.labelLocation'), value: stylistData.location },
                      { label: t('booking.labelFee'),      value: `₩${fmtStylist(stylistData.price)}~` },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(232,160,32,0.2)' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-serif)' }}>{item.value}</span>
                      </div>
                    ))}
                    <button
                      style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setSelectedStylist(null); setStep(3); }}
                    >
                      {t('booking.hmkChange')}
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', padding: '16px 24px', marginBottom: 24, fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('booking.hmkNone')}</span>
                    <button style={{ fontSize: 11, color: 'var(--gold)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setStep(3)}>
                      {t('booking.hmkAdd')}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderTop: '1px solid var(--border)', marginBottom: 32 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>{t('booking.totalEst')}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--gold)' }}>₩{fmt(totalPrice)}<span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>~</span></span>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-outline" onClick={() => setStep(3)}>{t('booking.prev')}</button>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleConfirm}>
                    {t('booking.pay')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: summary sidebar ── */}
          <div className="booking-sidebar">
            <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 100 }}>
              <div style={{ aspectRatio: '4/3', backgroundImage: `url(${p.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 10 }}>{t('booking.sidebarArtist')}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.08em', marginBottom: 4 }}>{artistName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{locationLabel}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {p.languages.map(l => <span key={l} className="lang-chip">{l}</span>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>★ {p.rating} · {t('booking.sidebarReviews')} {p.reviews}</div>
              </div>

              {stylistData && (
                <div style={{ padding: 24, borderBottom: '1px solid var(--border)', background: 'var(--gold-dim)' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 10 }}>H&M Stylist</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundImage: `url(${stylistData.img})`, backgroundSize: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 2 }}>{stylistData.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{stylistData.location}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--muted)', fontFamily: 'var(--font-serif)', textTransform: 'uppercase', marginBottom: 14 }}>{t('booking.sidebarSummary')}</div>
                {selectedDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                    <span style={{ color: 'var(--muted)' }}>{t('booking.sidebarDate')}</span>
                    <span>{selectedDate}</span>
                  </div>
                )}
                {selectedPkg && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                    <span style={{ color: 'var(--muted)' }}>{t('booking.sidebarPackage')}</span>
                    <span>{selectedPkg}</span>
                  </div>
                )}
                {totalPrice > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('booking.sidebarTotal')}</span>
                    <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>₩{fmt(totalPrice)}~</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Booking;
