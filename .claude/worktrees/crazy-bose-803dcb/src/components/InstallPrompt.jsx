import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Language strings ────────────────────────────────────────────
const INSTALL_STRINGS = {
  ko: {
    title: '홈 화면에 추가',
    subtitle: 'Phosnap을 홈 화면에 추가하여 더 쉽게 접근하세요',
    install: '설치',
    dismiss: '닫기',
    iosTitle: '홈 화면에 추가',
    iosInstruction: '공유 > 홈 화면에 추가를 선택해주세요',
  },
  en: {
    title: 'Add to Home Screen',
    subtitle: 'Install Phosnap for quick access',
    install: 'Install',
    dismiss: 'Dismiss',
    iosTitle: 'Add to Home Screen',
    iosInstruction: 'Tap Share > Add to Home Screen',
  },
  ja: {
    title: 'ホーム画面に追加',
    subtitle: 'Phosnapをホーム画面に追加してアクセスします',
    install: 'インストール',
    dismiss: '閉じる',
    iosTitle: 'ホーム画面に追加',
    iosInstruction: '共有 > ホーム画面に追加を選択してください',
  },
  zh: {
    title: '添加到主屏幕',
    subtitle: '安装Phosnap以便快速访问',
    install: '安装',
    dismiss: '关闭',
    iosTitle: '添加到主屏幕',
    iosInstruction: '点击共享 > 添加到主屏幕',
  },
};

// ─── Helper: Detect if running as standalone (installed) ───────
const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
};

// ─── Helper: Detect iOS ──────────────────────────────────────────
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// ─── Helper: Check if mobile ────────────────────────────────────
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// ─── Component ───────────────────────────────────────────────────
const InstallPrompt = () => {
  const { lang } = useLanguage();
  const strings = INSTALL_STRINGS[lang] || INSTALL_STRINGS.en;

  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS_, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Skip if not mobile or already standalone
    if (!isMobile() || isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Check dismissal in localStorage
    const dismissed = localStorage.getItem('phosnap_install_dismissed');
    if (dismissed) return;

    setIsIOS(isIOS());

    // Capture beforeinstallprompt event (Chrome/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt after 30 seconds
    const timer = setTimeout(() => {
      if (!isIOS()) {
        setShowPrompt(true);
      } else {
        // For iOS, also show but with iOS-specific instructions
        setShowPrompt(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('phosnap_install_dismissed', 'true');
  };

  if (!showPrompt || isInstalled) return null;

  // ─── iOS prompt ────────────────────────────────────────────────
  if (isIOS_) {
    return (
      <div className="install-overlay">
        <div className="install-sheet ios">
          <button className="install-close" onClick={handleDismiss}>×</button>

          <div className="install-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v8M16 12h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h2 className="install-title">{strings.iosTitle}</h2>
          <p className="install-subtitle">{strings.iosInstruction}</p>

          <button className="install-btn-ok" onClick={handleDismiss}>
            {strings.dismiss}
          </button>
        </div>
      </div>
    );
  }

  // ─── Chrome/Android prompt ─────────────────────────────────────
  return (
    <div className="install-overlay">
      <div className="install-sheet">
        <button className="install-close" onClick={handleDismiss}>×</button>

        <div className="install-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor" />
          </svg>
        </div>

        <h2 className="install-title">{strings.title}</h2>
        <p className="install-subtitle">{strings.subtitle}</p>

        <div className="install-buttons">
          <button
            className="install-btn-primary"
            onClick={handleInstall}
            disabled={!deferredPrompt}
          >
            {strings.install}
          </button>
          <button className="install-btn-secondary" onClick={handleDismiss}>
            {strings.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Styles (inject via CSS) ───────────────────────────────────
export const installPromptCSS = `
  .install-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    animation: installFadeIn 0.3s ease-out;
    backdrop-filter: blur(4px);
  }

  @keyframes installFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .install-sheet {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px 12px 0 0;
    padding: 28px 24px;
    width: 100%;
    max-width: 400px;
    position: relative;
    animation: installSlideUp 0.3s ease-out;
  }

  @keyframes installSlideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .install-sheet.ios {
    border-radius: 16px;
    margin: 32px;
  }

  .install-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .install-close:hover {
    color: var(--text);
  }

  .install-icon {
    margin: 0 auto 20px;
    width: 60px;
    height: 60px;
    background: rgba(232, 160, 32, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gold);
  }

  .install-icon svg {
    width: 32px;
    height: 32px;
  }

  .install-title {
    font-family: 'Cinzel', serif;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-align: center;
    margin-bottom: 8px;
    color: var(--text);
  }

  .install-subtitle {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 300;
    text-align: center;
    color: var(--muted);
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .install-buttons {
    display: flex;
    gap: 12px;
    flex-direction: column;
  }

  .install-btn-primary,
  .install-btn-secondary,
  .install-btn-ok {
    padding: 14px 20px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-family: 'Cinzel', serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
  }

  .install-btn-primary {
    background: var(--gold);
    color: #0B0B0B;
    border-color: var(--gold);
  }

  .install-btn-primary:hover:not(:disabled) {
    background: #F0AC2A;
    border-color: #F0AC2A;
    transform: translateY(-1px);
  }

  .install-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .install-btn-secondary,
  .install-btn-ok {
    background: transparent;
    color: var(--text);
    border-color: var(--border);
  }

  .install-btn-secondary:hover,
  .install-btn-ok:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  @media (max-width: 480px) {
    .install-sheet {
      border-radius: 16px 16px 0 0;
      padding: 24px 20px;
    }

    .install-title {
      font-size: 16px;
    }

    .install-subtitle {
      font-size: 13px;
    }

    .install-btn-primary,
    .install-btn-secondary,
    .install-btn-ok {
      padding: 12px 16px;
      font-size: 11px;
    }
  }
`;

export default InstallPrompt;
