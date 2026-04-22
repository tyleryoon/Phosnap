import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const PointRewardToast = ({ amount, details, onDismiss }) => {
  const { lang } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes spinCoin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .point-coin {
          display: inline-block;
          animation: spinCoin 2s linear infinite;
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, var(--gold), rgba(232,160,32,0.8))',
        border: '2px solid var(--gold)',
        borderRadius: 12,
        padding: '16px 20px',
        minWidth: 280,
        boxShadow: '0 8px 32px rgba(232,160,32,0.25), 0 0 20px rgba(232,160,32,0.15)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}>
          <span className="point-coin" style={{ fontSize: 28 }}>💰</span>
          <div>
            <div style={{
              fontSize: 20,
              fontFamily: 'var(--font-serif)',
              fontWeight: 'bold',
              color: '#0B0B0B',
              letterSpacing: '0.05em',
            }}>
              +{amount}P
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(11,11,11,0.7)',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.02em',
            }}>
              {lang === 'ko' ? '리뷰 보상' : lang === 'ja' ? 'レビュー報酬' : lang === 'zh' ? '评价奖励' : 'Review Reward'}
            </div>
          </div>
        </div>

        {/* Details */}
        {details && details.length > 0 && (
          <div style={{
            fontSize: 11,
            color: 'rgba(11,11,11,0.6)',
            paddingTop: 8,
            borderTop: '1px solid rgba(11,11,11,0.1)',
            marginTop: 8,
          }}>
            {details.map((detail, idx) => (
              <div key={idx} style={{ padding: '4px 0' }}>
                • {detail.label || detail.key}: <strong style={{ color: '#0B0B0B' }}>+{detail.amount}P</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointRewardToast;
