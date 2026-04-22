import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getMyReferralCode, saveReferralCode, getReferralStats, REWARD_INFO } from '../lib/referral';

const ReferralCard = ({ userId, role = 'customer' }) => {
  const { lang } = useLanguage();
  const m = REWARD_INFO[lang] || REWARD_INFO.en;

  const [referralCode, setReferralCode] = useState(null);
  const [stats, setStats] = useState({ totalReferred: 0, referrals: [] });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadReferralData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Try to get existing code
        let code = await getMyReferralCode(userId);

        // If no code exists, generate one
        if (!code) {
          code = await saveReferralCode(userId, role);
        }

        setReferralCode(code);

        // Load referral stats
        const referralStats = await getReferralStats(userId);
        setStats(referralStats);
      } catch (err) {
        // silently handled
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [userId, role]);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRewardsText = () => {
    if (role === 'customer') {
      return [m.referrerCustomer, m.referred];
    } else if (role === 'artist' || role === 'vendor') {
      const key = role === 'artist' ? 'referrerArtist' : 'referrerVendor';
      return [m[key], m.referred];
    }
    return [m.referred];
  };

  const rewards = getRewardsText();

  return (
    <div style={{
      border: '1px solid var(--gold-border)',
      background: 'var(--bg2)',
      borderRadius: 8,
      padding: '24px',
      marginBottom: '20px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1rem',
          color: 'var(--gold)',
          margin: 0,
          letterSpacing: '0.05em',
        }}>
          {m.title}
        </h3>
        <div style={{ fontSize: '1.8rem' }}>
          🎁
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          {lang === 'ko' ? '로딩 중...' : 'Loading...'}
        </div>
      ) : (
        <>
          {/* Referral Code Section */}
          {referralCode && (
            <div style={{
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid var(--gold-border)',
              borderRadius: 6,
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--muted)',
                fontFamily: 'var(--font-serif)',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}>
                {lang === 'ko' ? '나의 추천 코드' : lang === 'ja' ? '私の紹介コード' : lang === 'zh' ? '我的推荐码' : 'Your Referral Code'}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <code style={{
                  fontSize: '1.3rem',
                  color: 'var(--gold)',
                  fontFamily: 'monospace',
                  letterSpacing: '0.15em',
                  fontWeight: 'bold',
                }}>
                  {referralCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    background: 'var(--gold)',
                    color: '#0B0B0B',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: copied ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) e.target.style.opacity = '0.85';
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) e.target.style.opacity = '1';
                  }}
                >
                  {copied ? m.copied : (lang === 'ko' ? '복사' : lang === 'ja' ? 'コピー' : lang === 'zh' ? '复制' : 'Copy')}
                </button>
              </div>
            </div>
          )}

          {/* Benefits Section */}
          <div style={{
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text)',
              fontFamily: 'var(--font-serif)',
              marginBottom: '12px',
              fontWeight: 500,
            }}>
              {lang === 'ko' ? '추천 혜택' : lang === 'ja' ? '紹介特典' : lang === 'zh' ? '推荐奖励' : 'Referral Benefits'}
            </div>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {rewards.map((reward, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <span style={{
                    color: 'var(--gold)',
                    marginTop: '2px',
                    fontWeight: 'bold',
                  }}>
                    •
                  </span>
                  <span>{reward}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Referral Stats */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--muted)',
                fontFamily: 'var(--font-serif)',
              }}>
                {m.totalReferred}
              </span>
              <span style={{
                fontSize: '1.3rem',
                fontWeight: 'bold',
                color: 'var(--gold)',
              }}>
                {stats.totalReferred}
              </span>
            </div>

            {/* Referral List */}
            {stats.totalReferred > 0 ? (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {stats.referrals.map((referral) => (
                  <div
                    key={referral.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.8rem',
                      color: 'var(--muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      {referral.referred?.full_name || (lang === 'ko' ? '사용자' : 'User')}
                    </span>
                    <span style={{ fontSize: '0.75rem' }}>
                      {referral.created_at ? new Date(referral.created_at).toLocaleDateString(
                        lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US'
                      ) : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--muted)',
                textAlign: 'center',
                padding: '12px 0',
              }}>
                {m.noReferrals}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReferralCard;
