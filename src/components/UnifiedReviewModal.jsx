import { useState, useMemo } from 'react';
import Corners from './Corners';
import { useLanguage } from '../contexts/LanguageContext';
import { submitPhotographerReview, submitPackageReview } from '../lib/supabase';

// ─── 당근마켓 스타일 태그 버튼 리뷰 모달 ──────────────────────────────
// booking.pipeline = { artist, stylist, costume, venue }
// 실제 사용한 항목만 리뷰 섹션이 나옴

// ── 빠른 평가 태그 (당근마켓 스타일) ──
const QUICK_TAGS = {
  artist: {
    ko: ['친절해요', '소통이 잘돼요', '결과물 최고', '시간 엄수', '자연스러운 포즈', '분위기 좋아요', '전문적이에요', '또 찍고싶어요'],
    en: ['Very kind', 'Great communication', 'Amazing results', 'Punctual', 'Natural poses', 'Great vibe', 'Very professional', 'Would book again'],
    ja: ['親切です', 'やり取りがスムーズ', '仕上がり最高', '時間厳守', 'ポーズが自然', '雰囲気が良い', 'プロフェッショナル', 'また撮りたい'],
    zh: ['很亲切', '沟通顺畅', '成果最棒', '准时', '姿势自然', '氛围很好', '很专业', '还想再拍'],
  },
  stylist: {
    ko: ['손이 빨라요', '섬세해요', '내 스타일 파악', '오래 유지돼요', '피부 잘 표현', '꼼꼼해요', '센스 있어요', '추천해요'],
    en: ['Fast hands', 'Very detailed', 'Understood my style', 'Long-lasting', 'Great skin finish', 'Thorough', 'Great taste', 'Recommend'],
    ja: ['手際が良い', '繊細です', 'スタイル把握', '長持ちする', '肌の表現が上手', '丁寧です', 'センスが良い', 'おすすめ'],
    zh: ['手速快', '很细腻', '理解风格', '持久', '皮肤表现好', '很仔细', '有品味', '推荐'],
  },
  costume: {
    ko: ['의상 상태 좋아요', '사이즈 딱 맞아요', '디자인 예뻐요', '대응이 빨라요', '가성비 좋아요', '종류가 다양해요'],
    en: ['Great condition', 'Perfect fit', 'Beautiful design', 'Quick response', 'Good value', 'Wide selection'],
    ja: ['衣装の状態が良い', 'サイズぴったり', 'デザインが素敵', '対応が早い', 'コスパ良い', '種類が豊富'],
    zh: ['服装状态好', '尺码合适', '设计漂亮', '响应快', '性价比高', '种类丰富'],
  },
  venue: {
    ko: ['공간이 넓어요', '분위기 좋아요', '조명이 좋아요', '접근성 좋아요', '깨끗해요', '배경이 다양해요'],
    en: ['Spacious', 'Great ambience', 'Good lighting', 'Easy access', 'Very clean', 'Various backdrops'],
    ja: ['広い空間', '雰囲気が良い', '照明が良い', 'アクセスが良い', '清潔', '背景が多様'],
    zh: ['空间宽敞', '氛围好', '灯光好', '交通便利', '很干净', '背景丰富'],
  },
};

const SECTION_LABELS = {
  artist:  { ko: '📸 작가', en: '📸 Photographer', ja: '📸 フォトグラファー', zh: '📸 摄影师' },
  stylist: { ko: '💇 헤어메이크업', en: '💇 Hair & Makeup', ja: '💇 ヘアメイク', zh: '💇 造型师' },
  costume: { ko: '👗 의상 대여', en: '👗 Costume Rental', ja: '👗 衣装レンタル', zh: '👗 服装租赁' },
  venue:   { ko: '📍 촬영 장소', en: '📍 Venue', ja: '📍 撮影場所', zh: '📍 拍摄场地' },
};

const StarInput = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
    {[1,2,3,4,5].map(n => (
      <button key={n} onClick={() => onChange(n)} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 24, color: n <= value ? 'var(--gold)' : 'var(--border)',
        transition: 'color 0.15s', padding: '2px',
      }}>
        ★
      </button>
    ))}
  </div>
);

const UnifiedReviewModal = ({ booking, onClose, onSaved }) => {
  const { lang } = useLanguage();
  const pl = booking?.pipeline;

  // 실제 사용된 항목만 추출
  const sections = useMemo(() => {
    if (!pl) return [{ key: 'artist', data: { name: booking?.artistName } }];
    const result = [];
    if (pl.artist) result.push({ key: 'artist', data: pl.artist });
    if (pl.stylist) result.push({ key: 'stylist', data: pl.stylist });
    if (pl.costume) result.push({ key: 'costume', data: pl.costume });
    if (pl.venue) result.push({ key: 'venue', data: pl.venue });
    return result;
  }, [pl, booking]);

  // 각 섹션별 state: { rating, tags, comment }
  const [reviewData, setReviewData] = useState(() => {
    const init = {};
    sections.forEach(s => {
      init[s.key] = { rating: 0, tags: [], comment: '' };
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const updateSection = (key, field, value) => {
    setReviewData(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const toggleTag = (key, tag) => {
    setReviewData(prev => {
      const current = prev[key].tags;
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      return { ...prev, [key]: { ...prev[key], tags: next } };
    });
  };

  // 최소 하나의 섹션에 별점이 있어야 저장 가능
  const canSave = Object.values(reviewData).some(d => d.rating > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSavedMsg('');

    try {
      // 작가 리뷰
      const artistData = reviewData.artist;
      if (artistData?.rating > 0) {
        await submitPhotographerReview({
          booking_id: booking.id,
          photographer_id: booking.artistId || booking.photographer_id,
          rating: artistData.rating,
          title: '',
          body: artistData.comment || '',
          tags: artistData.tags || [],
        }).catch(() => {});
      }

      // 패키지 리뷰 (작가 패키지 기반)
      if (artistData?.rating > 0) {
        await submitPackageReview({
          booking_id: booking.id,
          photographer_id: booking.artistId || booking.photographer_id,
          rating: artistData.rating,
          title: '',
          body: artistData.comment || '',
        }).catch(() => {});
      }

      // Stylist/costume/venue 리뷰는 아직 전용 테이블이 없으므로
      // 벤더 대시보드에서 조회할 수 있도록 localStorage에 보존
      // TODO: stylist_reviews, costume_reviews, venue_reviews 테이블 생성 후 전환
      const hasStylistOrVendorReview = reviewData.stylist?.rating > 0 ||
        reviewData.costume?.rating > 0 || reviewData.venue?.rating > 0;
      if (hasStylistOrVendorReview) {
        const allReviewData = {
          bookingId: booking.id,
          photographerId: booking.artistId || booking.photographer_id,
          reviews: reviewData,
          createdAt: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem('phosnap_unified_reviews') || '[]');
        existing.push(allReviewData);
        localStorage.setItem('phosnap_unified_reviews', JSON.stringify(existing));
      }

      setSavedMsg(lang === 'ko' ? '리뷰가 저장되었습니다! 감사합니다 ✓' :
                  lang === 'ja' ? 'レビューが保存されました！ありがとうございます ✓' :
                  lang === 'zh' ? '评价已保存！谢谢 ✓' :
                  'Reviews saved! Thank you ✓');
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1500);
    } catch (err) {
      setSavedMsg(lang === 'ko' ? '저장에 실패했습니다.' : 'Save failed.');
    }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        padding: '36px 32px', position: 'relative',
      }}>
        <Corners />

        {/* 헤더 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 10, letterSpacing: '0.3em',
            color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {lang === 'ko' ? '리뷰 작성' : lang === 'ja' ? 'レビュー作成' : lang === 'zh' ? '撰写评价' : 'Write Review'}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '0.04em', marginBottom: 6 }}>
            {booking?.artistName} — {booking?.date}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {lang === 'ko' ? '각 서비스에 대한 평가를 남겨주세요.' :
             lang === 'ja' ? '各サービスについて評価してください。' :
             lang === 'zh' ? '请对各项服务进行评价。' :
             'Rate each service you used.'}
          </div>
        </div>

        {/* 닫기 */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'transparent', border: 'none', color: 'var(--muted)',
          fontSize: 20, cursor: 'pointer', padding: 4,
        }}>✕</button>

        {/* 각 섹션 */}
        {sections.map(({ key, data }) => {
          const d = reviewData[key];
          const tags = QUICK_TAGS[key]?.[lang] || QUICK_TAGS[key]?.ko || [];
          const sLabel = SECTION_LABELS[key]?.[lang] || SECTION_LABELS[key]?.ko;
          const displayName = data?.name || data?.vendor || data?.item || '';

          return (
            <div key={key} style={{
              marginBottom: 24, padding: '20px 20px 16px',
              border: d.rating > 0 ? '1px solid var(--gold-border)' : '1px solid var(--border)',
              background: d.rating > 0 ? 'rgba(232,160,32,0.03)' : 'var(--bg2)',
              position: 'relative', transition: 'all 0.2s',
            }}>
              <Corners />

              {/* 섹션 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {data?.img && (
                  <img src={data.img} alt="" style={{
                    width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                    border: '1px solid var(--border)',
                  }} />
                )}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em' }}>
                    {sLabel}
                  </div>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-serif)', letterSpacing: '0.03em' }}>
                    {displayName}
                  </div>
                </div>
              </div>

              {/* 별점 */}
              <StarInput value={d.rating} onChange={v => updateSection(key, 'rating', v)} />

              {/* 당근마켓 스타일 퀵 태그 */}
              {d.rating > 0 && (
                <>
                  <div style={{
                    fontSize: 11, color: 'var(--muted)', marginBottom: 8,
                    fontFamily: 'var(--font-serif)', letterSpacing: '0.06em',
                  }}>
                    {lang === 'ko' ? '이런 점이 좋았어요' : lang === 'ja' ? '良かった点は？' : lang === 'zh' ? '哪些方面好？' : 'What was great?'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {tags.map(tag => {
                      const selected = d.tags.includes(tag);
                      return (
                        <button key={tag} onClick={() => toggleTag(key, tag)} style={{
                          padding: '6px 14px', fontSize: 12,
                          background: selected ? 'rgba(232,160,32,0.15)' : 'transparent',
                          border: selected ? '1px solid var(--gold)' : '1px solid var(--border)',
                          color: selected ? 'var(--gold)' : 'var(--muted)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'var(--font-serif)', letterSpacing: '0.02em',
                        }}>
                          {selected ? '✓ ' : ''}{tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* 텍스트 코멘트 */}
                  <textarea
                    value={d.comment}
                    onChange={e => updateSection(key, 'comment', e.target.value)}
                    placeholder={
                      lang === 'ko' ? '추가로 남기고 싶은 말이 있다면 자유롭게 적어주세요 (선택)' :
                      lang === 'ja' ? '自由にコメントしてください（任意）' :
                      lang === 'zh' ? '请自由留言（可选）' :
                      'Any additional comments? (optional)'
                    }
                    style={{
                      width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13, padding: '10px 12px',
                      resize: 'vertical', minHeight: 60, lineHeight: 1.6,
                      boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* 저장 메시지 */}
        {savedMsg && (
          <div style={{
            padding: '10px 14px', marginBottom: 16, fontSize: 13,
            color: savedMsg.includes('✓') ? '#4ade80' : '#ef4444',
            background: savedMsg.includes('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${savedMsg.includes('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {savedMsg}
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            width: '100%', padding: '14px 0',
            background: canSave ? 'var(--gold)' : 'var(--bg2)',
            color: canSave ? '#0B0B0B' : 'var(--muted)',
            border: canSave ? 'none' : '1px solid var(--border)',
            fontFamily: 'var(--font-serif)', fontSize: 14,
            letterSpacing: '0.1em', cursor: canSave ? 'pointer' : 'default',
            transition: 'all 0.2s', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving
            ? (lang === 'ko' ? '저장 중…' : 'Saving…')
            : (lang === 'ko' ? '리뷰 저장' : lang === 'ja' ? 'レビュー保存' : lang === 'zh' ? '保存评价' : 'Save Reviews')}
        </button>
      </div>
    </div>
  );
};

export default UnifiedReviewModal;
