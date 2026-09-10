import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// ─── OnboardingOverlay ────────────────────────────────────────────────
// A full-screen overlay with 3 slides explaining Phosnap to first-time visitors

const OnboardingOverlay = () => {
  const { lang, t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Check localStorage on mount and show after 1 second delay
  useEffect(() => {
    const alreadyDone = localStorage.getItem('phosnap_onboarding_done');
    const dismissedToday = localStorage.getItem('phosnap_onboarding_dismiss_today');
    // "오늘 하루 보지 않기" 체크: 저장된 날짜가 오늘이면 표시 안 함
    if (dismissedToday === new Date().toISOString().split('T')[0]) return;
    if (!alreadyDone) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem('phosnap_onboarding_done', 'true');
  };

  const handleDismissToday = () => {
    setIsVisible(false);
    localStorage.setItem('phosnap_onboarding_dismiss_today', new Date().toISOString().split('T')[0]);
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleSkip();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleDotClick = (slideIdx) => {
    setCurrentSlide(slideIdx);
  };

  if (!isVisible) return null;

  const slides = [
    {
      titleKey: 'onboarding.slide1.title',
      descKey: 'onboarding.slide1.desc',
      illustration: 'camera',
    },
    {
      titleKey: 'onboarding.slide2.title',
      descKey: 'onboarding.slide2.desc',
      illustration: 'search',
    },
    {
      titleKey: 'onboarding.slide3.title',
      descKey: 'onboarding.slide3.desc',
      illustration: 'calendar',
    },
  ];

  const slide = slides[currentSlide];
  const slideTitle = t(slide.titleKey);
  const slideDesc = t(slide.descKey);

  return (
    <>
      <style>{onboardingCSS}</style>
      <div className="onboarding-overlay">
        <div className="onboarding-backdrop" onClick={handleSkip} />
        <div className="onboarding-card">
          {/* Skip button */}
          <button
            className="onboarding-skip"
            onClick={handleSkip}
            aria-label={t('onboarding.skip') || 'Skip'}
          >
            {t('onboarding.skip')}
          </button>

          {/* Slide container */}
          <div className="onboarding-slides-wrapper">
            <div
              className="onboarding-slides-track"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {slides.map((s, idx) => (
                <div key={idx} className="onboarding-slide">
                  {/* Illustration */}
                  <div className="onboarding-illustration">
                    <Illustration type={s.illustration} />
                  </div>

                  {/* Text content */}
                  <h2 className="onboarding-title">
                    {t(s.titleKey)}
                  </h2>
                  <p className="onboarding-desc">
                    {t(s.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="onboarding-nav">
            <button
              className="onboarding-btn-prev"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              aria-label="Previous slide"
            >
              ←
            </button>

            {/* Dot indicators */}
            <div className="onboarding-dots">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  className={`onboarding-dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => handleDotClick(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={idx === currentSlide ? 'page' : undefined}
                />
              ))}
            </div>

            <button
              className="onboarding-btn-next"
              onClick={handleNext}
              aria-label={currentSlide === 2 ? 'Complete' : 'Next slide'}
            >
              {currentSlide === 2 ? '✓' : '→'}
            </button>
          </div>

          {/* CTA Button on last slide */}
          {currentSlide === 2 && (
            <button
              className="onboarding-cta"
              onClick={handleSkip}
            >
              {t('onboarding.startBtn') || '시작하기'}
            </button>
          )}

          {/* 오늘 하루 보지 않기 */}
          <button
            onClick={handleDismissToday}
            style={{
              background: 'none', border: 'none', color: 'var(--muted, #8A8070)',
              fontSize: 11, cursor: 'pointer', marginTop: 10, padding: '6px 0',
              fontFamily: 'var(--font-sans, Inter, sans-serif)', letterSpacing: '0.02em',
              textDecoration: 'underline', textUnderlineOffset: 3, opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >
            {lang === 'ko' ? '오늘 하루 보지 않기' : lang === 'ja' ? '今日は表示しない' : lang === 'zh' ? '今天不再显示' : "Don't show today"}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Illustration Components (CSS-only) ────────────────────────────────

const Illustration = ({ type }) => {
  if (type === 'camera') {
    return (
      <svg viewBox="0 0 120 120" className="illustration-svg camera-svg">
        <defs>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.8; }
            }
            .camera-lens { animation: pulse 2s infinite; }
          `}</style>
        </defs>
        {/* Camera body */}
        <rect x="20" y="30" width="80" height="70" fill="none" stroke="currentColor" strokeWidth="2" rx="4" />
        {/* Lens (circle) */}
        <circle cx="60" cy="65" r="24" fill="none" stroke="currentColor" strokeWidth="2" className="camera-lens" />
        {/* Lens inner rings */}
        <circle cx="60" cy="65" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx="60" cy="65" r="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </svg>
    );
  }

  if (type === 'search') {
    return (
      <svg viewBox="0 0 120 120" className="illustration-svg search-svg">
        <defs>
          <style>{`
            @keyframes floatCards {
              0%, 100% { transform: translateY(0px); opacity: 0.7; }
              50% { transform: translateY(-8px); opacity: 1; }
            }
            @keyframes rotateMagnifier {
              0%, 100% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .card-1 { animation: floatCards 3s ease-in-out infinite; }
            .card-2 { animation: floatCards 3.5s ease-in-out 0.3s infinite; }
            .magnifier { animation: rotateMagnifier 4s linear infinite; transform-origin: 35px 35px; }
          `}</style>
        </defs>
        {/* Magnifying glass */}
        <g className="magnifier">
          <circle cx="35" cy="35" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <line x1="52" y1="52" x2="65" y2="65" stroke="currentColor" strokeWidth="2.5" />
        </g>
        {/* Floating cards */}
        <rect x="70" y="20" width="35" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="card-1" />
        <line x1="76" y1="28" x2="98" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.6" className="card-1" />
        <line x1="76" y1="35" x2="98" y2="35" stroke="currentColor" strokeWidth="1" opacity="0.6" className="card-1" />
        <line x1="76" y1="42" x2="90" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.6" className="card-1" />

        <rect x="75" y="65" width="35" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" className="card-2" />
        <line x1="81" y1="73" x2="103" y2="73" stroke="currentColor" strokeWidth="1" opacity="0.6" className="card-2" />
        <line x1="81" y1="80" x2="103" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.6" className="card-2" />
        <line x1="81" y1="87" x2="95" y2="87" stroke="currentColor" strokeWidth="1" opacity="0.6" className="card-2" />
      </svg>
    );
  }

  if (type === 'calendar') {
    return (
      <svg viewBox="0 0 120 120" className="illustration-svg calendar-svg">
        <defs>
          <style>{`
            @keyframes checkmark {
              0% { stroke-dashoffset: 20; opacity: 0; }
              50% { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 1; }
            }
            .checkmark {
              animation: checkmark 1.5s ease-in-out infinite;
              stroke-dasharray: 20;
              fill: none;
              stroke-linecap: round;
              stroke-linejoin: round;
            }
          `}</style>
        </defs>
        {/* Calendar body */}
        <rect x="15" y="25" width="90" height="75" fill="none" stroke="currentColor" strokeWidth="2" rx="3" />
        {/* Header bar */}
        <rect x="15" y="25" width="90" height="18" fill="currentColor" opacity="0.1" rx="3" />
        {/* Grid lines (calendar cells) */}
        <line x1="15" y1="43" x2="105" y2="43" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="15" y1="57" x2="105" y2="57" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="15" y1="71" x2="105" y2="71" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        {/* Vertical dividers */}
        <line x1="29" y1="43" x2="29" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="43" y1="43" x2="43" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="57" y1="43" x2="57" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="71" y1="43" x2="71" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="85" y1="43" x2="85" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        {/* Checkmark */}
        <polyline
          points="50,70 60,80 85,55"
          stroke="currentColor"
          strokeWidth="2.5"
          className="checkmark"
        />
      </svg>
    );
  }

  return null;
};

// Export function to reset onboarding flag
export const resetOnboarding = () => {
  localStorage.removeItem('phosnap_onboarding_done');
};

// ─── Styles ─────────────────────────────────────────────────────────

const onboardingCSS = `
  .onboarding-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .onboarding-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(11, 11, 11, 0.75);
    backdrop-filter: blur(4px);
    cursor: pointer;
  }

  .onboarding-card {
    position: relative;
    z-index: 1;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 60px 48px 48px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  @media (max-width: 768px) {
    .onboarding-card {
      padding: 48px 24px 32px;
      max-width: 95%;
    }
  }

  /* Skip button */
  .onboarding-skip {
    position: absolute;
    top: 20px;
    right: 20px;
    background: transparent;
    border: none;
    color: var(--muted);
    font-family: var(--font-sans);
    font-size: 12px;
    cursor: pointer;
    transition: color 0.2s;
    padding: 4px 8px;
  }

  .onboarding-skip:hover {
    color: var(--text);
  }

  /* Slides wrapper & track */
  .onboarding-slides-wrapper {
    overflow: hidden;
    margin-bottom: 40px;
  }

  .onboarding-slides-track {
    display: flex;
    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .onboarding-slide {
    flex: 0 0 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  /* Illustration */
  .onboarding-illustration {
    width: 120px;
    height: 120px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gold);
  }

  .illustration-svg {
    width: 100%;
    height: 100%;
    color: inherit;
  }

  /* Title & Description */
  .onboarding-title {
    font-family: var(--font-serif);
    font-size: 24px;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: var(--text);
    margin-bottom: 12px;
  }

  .onboarding-desc {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
    max-width: 420px;
  }

  /* Navigation */
  .onboarding-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .onboarding-btn-prev,
  .onboarding-btn-next {
    background: transparent;
    border: none;
    color: var(--gold);
    font-size: 18px;
    cursor: pointer;
    padding: 8px 12px;
    transition: color 0.2s;
  }

  .onboarding-btn-prev:hover:not(:disabled),
  .onboarding-btn-next:hover:not(:disabled) {
    color: #f0ac2a;
  }

  .onboarding-btn-prev:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Dots */
  .onboarding-dots {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .onboarding-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(242, 242, 242, 0.3);
    cursor: pointer;
    transition: all 0.3s;
    padding: 0;
  }

  .onboarding-dot.active {
    background: var(--gold);
    transform: scale(1.2);
  }

  .onboarding-dot:hover {
    background: rgba(242, 242, 242, 0.5);
  }

  /* CTA Button */
  .onboarding-cta {
    display: block;
    width: 100%;
    background: var(--gold);
    color: #0B0B0B;
    font-family: var(--font-serif);
    font-size: 11px;
    letter-spacing: 0.15em;
    font-weight: 600;
    padding: 14px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s;
  }

  .onboarding-cta:hover {
    background: #f0ac2a;
    box-shadow: 0 0 20px rgba(232, 160, 32, 0.3);
  }

  @media (max-width: 600px) {
    .onboarding-title {
      font-size: 18px;
    }

    .onboarding-desc {
      font-size: 12px;
    }

    .onboarding-illustration {
      width: 100px;
      height: 100px;
      margin-bottom: 24px;
    }
  }
`;

export default OnboardingOverlay;
