import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserPoints, getTier, TIER_INFO } from '../lib/points';
import Corners from './Corners';

const PointsCard = ({ userId }) => {
  const { lang } = useLanguage();
  const [points, setPoints] = useState(null);
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const pointsData = await getUserPoints(userId);
        if (pointsData) {
          setPoints(pointsData);
          const tierData = getTier(pointsData.total_earned);
          setTier(tierData);
        }
      } catch (err) {
        // silently handled
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '24px',
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontSize: 13,
      }}>
        {lang === 'ko' ? '로딩 중...' : lang === 'ja' ? 'ロード中...' : lang === 'zh' ? '加载中...' : 'Loading...'}
      </div>
    );
  }

  if (!points || !tier) {
    return null;
  }

  const tierInfo = TIER_INFO[tier.tier];
  const tierLabel = tierInfo?.[lang] || tierInfo?.ko;
  const progressPercent = Math.min((points.total_earned / (tier.nextTier ? tier.nextTier.range[0] : points.total_earned + 1)) * 100, 100);

  const labelMap = {
    ko: {
      title: '포인트 & 멤버십',
      subtitle: '리뷰 작성으로 포인트를 모으고 등급을 올려보세요',
      current: '현재 포인트',
      earned: '누적 포인트',
      tier: '멤버십 등급',
      benefits: '혜택',
      next: '다음 등급',
      pointsTo: '까지',
    },
    en: {
      title: 'Points & Membership',
      subtitle: 'Earn points from reviews and climb the tier ladder',
      current: 'Current Balance',
      earned: 'Total Earned',
      tier: 'Membership Tier',
      benefits: 'Benefits',
      next: 'Next Tier',
      pointsTo: 'points to go',
    },
    ja: {
      title: 'ポイント＆メンバーシップ',
      subtitle: 'レビューでポイントを獲得し、ランクを上げよう',
      current: '現在のポイント',
      earned: '累計ポイント',
      tier: 'メンバーシップレベル',
      benefits: '特典',
      next: '次のレベル',
      pointsTo: 'ポイント残り',
    },
    zh: {
      title: '积分与会员',
      subtitle: '通过评价赚取积分，提升等级',
      current: '当前余额',
      earned: '累计积分',
      tier: '会员等级',
      benefits: '权益',
      next: '下一等级',
      pointsTo: '剩余积分',
    },
  };

  const labels = labelMap[lang] || labelMap.ko;

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--gold-border)',
      borderRadius: 8,
      padding: '28px',
      marginBottom: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Corners />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 10,
          letterSpacing: '0.3em',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-serif)',
          marginBottom: 8,
        }}>
          {labels.title}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}>
          {labels.subtitle}
        </div>
      </div>

      {/* Points Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 24,
      }}>
        <div style={{
          padding: '16px',
          background: 'rgba(232,160,32,0.06)',
          border: '1px solid var(--gold-border)',
          borderRadius: 6,
        }}>
          <div style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.08em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}>
            {labels.current}
          </div>
          <div style={{
            fontSize: 28,
            fontFamily: 'var(--font-serif)',
            fontWeight: 'bold',
            color: 'var(--gold)',
            letterSpacing: '0.02em',
          }}>
            {points.points}P
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'rgba(232,160,32,0.06)',
          border: '1px solid var(--gold-border)',
          borderRadius: 6,
        }}>
          <div style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.08em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}>
            {labels.earned}
          </div>
          <div style={{
            fontSize: 28,
            fontFamily: 'var(--font-serif)',
            fontWeight: 'bold',
            color: 'var(--text)',
            letterSpacing: '0.02em',
          }}>
            {points.total_earned}P
          </div>
        </div>
      </div>

      {/* Tier Badge */}
      <div style={{
        padding: '16px',
        background: 'rgba(232,160,32,0.08)',
        border: '1px solid var(--gold-border)',
        borderRadius: 6,
        marginBottom: 24,
      }}>
        <div style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--font-serif)',
          letterSpacing: '0.08em',
          marginBottom: 12,
          textTransform: 'uppercase',
        }}>
          {labels.tier}
        </div>
        <div style={{
          fontSize: 20,
          fontFamily: 'var(--font-serif)',
          fontWeight: 'bold',
          color: 'var(--text)',
          marginBottom: 12,
        }}>
          {tierLabel?.name || tier.tier}
        </div>

        {/* Progress Bar */}
        {tier.nextTier && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--gold), rgba(232,160,32,0.6))',
                transition: 'width 0.3s ease-out',
              }} />
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--muted)',
              textAlign: 'right',
            }}>
              {tier.pointsToNext} {labels.pointsTo}
            </div>
          </div>
        )}

        {/* Benefits */}
        {tierLabel?.benefits && (
          <div style={{
            paddingTop: 12,
            borderTop: '1px solid var(--gold-border)',
          }}>
            <div style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.08em',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}>
              {labels.benefits}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {tierLabel.benefits.map((benefit, idx) => (
                <div key={idx} style={{
                  fontSize: 12,
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ color: 'var(--gold)' }}>✓</span>
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Tier Preview */}
      {tier.nextTier && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(232,160,32,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          fontSize: 11,
          color: 'var(--muted)',
          textAlign: 'center',
        }}>
          {labels.next}: {tier.nextTier.label?.[lang]?.name || tier.nextTier.tier}
        </div>
      )}
    </div>
  );
};

export default PointsCard;
