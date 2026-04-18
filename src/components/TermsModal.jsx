import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Corners from './Corners';

// ─── 약관 뷰어 모달 (클릭하면 전문 펼침) ──────────────────────────────
const TermsViewer = ({ data, onClose }) => {
  const { lang } = useLanguage();
  const content = data[lang] || data.ko;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--gold-border)',
        maxWidth: 640, width: '100%', maxHeight: '80vh', overflow: 'auto',
        padding: '32px 36px', position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 18,
          background: 'transparent', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', fontSize: 20,
        }}>×</button>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: '0.08em', marginBottom: 4 }}>
          {content.title}
        </h2>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>{content.lastUpdated}</div>

        {content.sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--gold)', marginBottom: 6 }}>
              {sec.title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {sec.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── 약관 동의 블록 (회원가입 폼 안에 삽입) ──────────────────────────
// items: [{ key, label, data, required }]
// agreed: { [key]: boolean }
// onToggle: (key) => void
const TermsAgreement = ({ items, agreed, onToggle }) => {
  const [viewingTerms, setViewingTerms] = useState(null);

  const allRequired = items.filter(i => i.required).every(i => agreed[i.key]);
  const allChecked = items.every(i => agreed[i.key]);

  const toggleAll = () => {
    const next = !allChecked;
    items.forEach(i => {
      if (agreed[i.key] !== next) onToggle(i.key);
    });
  };

  return (
    <>
      <div style={{ border: '1px solid var(--border)', padding: '20px 24px', background: 'var(--bg2)', position: 'relative' }}>
        <Corners />

        {/* 전체 동의 */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)',
        }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            style={{ accentColor: 'var(--gold)', width: 18, height: 18, flexShrink: 0 }}
          />
          <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', letterSpacing: '0.03em' }}>
            전체 동의
          </div>
        </label>

        {/* 개별 항목 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={!!agreed[item.key]}
                onChange={() => onToggle(item.key)}
                style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
              />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                <span style={{ color: item.required ? 'var(--gold)' : 'var(--muted)', fontSize: 11, marginRight: 4 }}>
                  [{item.required ? '필수' : '선택'}]
                </span>
                {item.label}
              </div>
              {item.data && (
                <button
                  onClick={(e) => { e.preventDefault(); setViewingTerms(item.data); }}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--muted)', cursor: 'pointer', fontSize: 10,
                    padding: '3px 10px', borderRadius: 2, whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
                  }}
                >
                  보기
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 약관 전문 모달 */}
      {viewingTerms && (
        <TermsViewer data={viewingTerms} onClose={() => setViewingTerms(null)} />
      )}
    </>
  );
};

export default TermsAgreement;
export { TermsViewer };
