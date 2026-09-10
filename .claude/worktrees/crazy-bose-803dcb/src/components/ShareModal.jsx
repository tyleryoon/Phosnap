import { useState } from 'react';
import { CloseIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import Corners from './Corners';

// ─── ShareModal Component ─────────────────────────────────────────────────
// Reusable modal for sharing photographer/vendor profiles via:
// - Link copy (with referral tracking)
// - KakaoTalk (with dynamic SDK loading)
// - Instagram Stories (mobile with fallback)
// - Web Share API (native share sheet)

const CONTENT = {
  ko: {
    modalTitle: '친구에게 추천',
    copyLink: '링크 복사',
    copied: '복사되었습니다!',
    kakao: '카카오톡',
    instagram: '인스타그램',
    nativeShare: '공유하기',
    instagramHint: '링크가 복사되었습니다.\n인스타그램 스토리에 붙여넣기 해주세요.',
  },
  en: {
    modalTitle: 'Share with Friends',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    kakao: 'KakaoTalk',
    instagram: 'Instagram',
    nativeShare: 'Share',
    instagramHint: 'Link copied.\nPaste it in your Instagram story.',
  },
  ja: {
    modalTitle: '友達に推薦',
    copyLink: 'リンクをコピー',
    copied: 'コピーしました!',
    kakao: 'カカオトーク',
    instagram: 'インスタグラム',
    nativeShare: '共有',
    instagramHint: 'リンクがコピーされました。\nInstagramストーリーに貼り付けてください。',
  },
  zh: {
    modalTitle: '推荐给朋友',
    copyLink: '复制链接',
    copied: '已复制!',
    kakao: '卡卡奥托克',
    instagram: 'Instagram',
    nativeShare: '分享',
    instagramHint: '链接已复制。\n请粘贴到您的Instagram故事中。',
  },
};

const ShareModal = ({ isOpen, onClose, shareData }) => {
  const { lang, t } = useLanguage();
  const c = CONTENT[lang] ?? CONTENT['ko'];
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen || !shareData) return null;

  const shareUrl = `${shareData.url}${shareData.url.includes('?') ? '&' : '?'}ref=share`;

  // ──────────────────────────────────────────────────────────────────────
  // A. Copy Link
  // ──────────────────────────────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ──────────────────────────────────────────────────────────────────────
  // B. Kakao Share
  // ──────────────────────────────────────────────────────────────────────
  const handleKakaoShare = () => {
    const kakaoKey = import.meta.env.VITE_KAKAO_KEY;
    // 카카오 앱키가 없으면 링크 복사 + 카카오톡 열기 fallback
    if (!kakaoKey || kakaoKey === 'placeholder') {
      handleCopyLink();
      setToastMessage(lang === 'ko' ? '링크가 복사되었습니다!\n카카오톡에 붙여넣기 해주세요.' :
        lang === 'ja' ? 'リンクがコピーされました！\nカカオトークに貼り付けてください。' :
        'Link copied! Paste it in KakaoTalk.');
      setTimeout(() => setToastMessage(''), 3000);
      // 모바일이면 카카오톡 열기 시도
      if (/Mobile|Android|iPhone/i.test(navigator.userAgent)) {
        setTimeout(() => { window.open('kakaotalk://'); }, 500);
      }
      return;
    }
    if (!window.Kakao) {
      const script = document.createElement('script');
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
      script.onload = () => {
        window.Kakao.init(kakaoKey);
        sendKakaoLink();
      };
      script.onerror = () => {
        handleCopyLink();
        setToastMessage(lang === 'ko' ? '링크가 복사되었습니다!' : 'Link copied!');
        setTimeout(() => setToastMessage(''), 2000);
      };
      document.head.appendChild(script);
      return;
    }
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(kakaoKey);
    }
    sendKakaoLink();
  };

  const sendKakaoLink = () => {
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: shareData.title,
          description: shareData.description,
          imageUrl: shareData.imageUrl || 'https://phosnap.com/og-default.jpg',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [
          {
            title: lang === 'ko' ? '프로필 보기' : lang === 'ja' ? 'プロフィールを表示' : lang === 'zh' ? '查看资料' : 'View Profile',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
          },
        ],
      });
    } catch (err) {
      // Fallback: open kakao share URL
      window.open(`https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // C. Instagram Stories
  // ──────────────────────────────────────────────────────────────────────
  const handleInstagramShare = () => {
    handleCopyLink();
    setToastMessage(c.instagramHint);
    setTimeout(() => setToastMessage(''), 3000);

    // Mobile: try to open Instagram camera
    if (/Mobile|Android|iPhone/i.test(navigator.userAgent)) {
      // Delayed to allow user to see the toast first
      setTimeout(() => {
        window.open('instagram://story-camera');
      }, 500);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // D. Web Share API (native share sheet)
  // ──────────────────────────────────────────────────────────────────────
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareUrl,
        });
      } catch (err) {
        // silently handled
      }
    } else {
      handleCopyLink();
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--gold-border)',
            borderRadius: '4px',
            maxWidth: '480px',
            width: '100%',
            padding: '40px 36px',
            position: 'relative',
            animation: 'modalFadeIn 0.3s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          <Corners />

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloseIcon />
          </button>

          {/* Modal Title */}
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '10px',
              letterSpacing: '0.3em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            {c.modalTitle}
          </div>

          {/* Preview Card */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '32px',
              padding: '16px',
              background: 'rgba(232,160,32,0.05)',
              border: '1px solid rgba(232,160,32,0.15)',
              borderRadius: '2px',
            }}
          >
            {/* Preview Image */}
            <div
              style={{
                width: '80px',
                height: '80px',
                minWidth: '80px',
                background: 'var(--bg1)',
                borderRadius: '2px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              {shareData.imageUrl ? (
                <img
                  src={shareData.imageUrl}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                    fontSize: '24px',
                  }}
                >
                  📷
                </div>
              )}
            </div>

            {/* Preview Text */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, marginBottom: '4px' }}>
                {shareData.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>
                {shareData.description}
              </div>
              {shareData.type && (
                <div style={{ fontSize: '9px', color: 'var(--gold)', marginTop: '8px', fontFamily: 'var(--font-serif)' }}>
                  {shareData.type === 'photographer' ? '📷 ' : '🏪 '}
                  {shareData.type === 'photographer'
                    ? lang === 'ko'
                      ? '사진작가'
                      : lang === 'ja'
                      ? '写真作家'
                      : lang === 'zh'
                      ? '摄影师'
                      : 'Photographer'
                    : lang === 'ko'
                    ? '판매자'
                    : lang === 'ja'
                    ? 'ベンダー'
                    : lang === 'zh'
                    ? '卖家'
                    : 'Vendor'}
                </div>
              )}
            </div>
          </div>

          {/* Share Buttons Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 12px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'var(--text)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.15)';
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
              }}
            >
              <div style={{ fontSize: '24px' }}>🔗</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
                {copied ? c.copied : c.copyLink}
              </div>
            </button>

            {/* KakaoTalk Button */}
            <button
              onClick={handleKakaoShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 12px',
                background: 'rgba(254,229,0,0.15)',
                border: '1px solid rgba(254,229,0,0.3)',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'var(--text)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(254,229,0,0.2)';
                e.currentTarget.style.borderColor = 'rgba(254,229,0,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(254,229,0,0.15)';
                e.currentTarget.style.borderColor = 'rgba(254,229,0,0.3)';
              }}
            >
              <div style={{ fontSize: '24px' }}>💬</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
                {c.kakao}
              </div>
            </button>

            {/* Instagram Button */}
            <button
              onClick={handleInstagramShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 12px',
                background: 'linear-gradient(135deg, rgba(245,101,101,0.15), rgba(168,85,247,0.15))',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'var(--text)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,101,101,0.2), rgba(168,85,247,0.2))';
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,101,101,0.15), rgba(168,85,247,0.15))';
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
              }}
            >
              <div style={{ fontSize: '24px' }}>📸</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
                {c.instagram}
              </div>
            </button>

            {/* Native Share Button */}
            <button
              onClick={handleNativeShare}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 12px',
                background: 'rgba(128,128,128,0.1)',
                border: '1px solid rgba(128,128,128,0.3)',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'var(--text)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(128,128,128,0.15)';
                e.currentTarget.style.borderColor = 'rgba(128,128,128,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(128,128,128,0.1)';
                e.currentTarget.style.borderColor = 'rgba(128,128,128,0.3)';
              }}
            >
              <div style={{ fontSize: '24px' }}>📤</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
                {c.nativeShare}
              </div>
            </button>
          </div>

          {/* Bottom CTA */}
          <button
            onClick={onClose}
            className="btn-outline"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '13px',
            }}
          >
            {lang === 'ko' ? '닫기' : lang === 'ja' ? '閉じる' : lang === 'zh' ? '关闭' : 'Close'}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10000,
            whiteSpace: 'pre-line',
            textAlign: 'center',
            maxWidth: '90vw',
            animation: 'toastFadeIn 0.3s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default ShareModal;
