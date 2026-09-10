import { useLanguage } from '../contexts/LanguageContext';

// ─── Size Selector ─────────────────────────────────────────────────────
// 의상 사이즈 선택 컴포넌트
// sizes: ['S','M','L','XL','Free'] or ['55','66','77']
// selected: 현재 선택된 사이즈
// onChange: (size) => void
// bookedSizes: optional array of sizes that are already booked (will appear disabled)

const SizeSelector = ({ sizes = [], selected, onChange, disabled = false, bookedSizes = [] }) => {
  const { t } = useLanguage();

  if (!sizes.length) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-serif)',
        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        Size
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {sizes.map(size => {
          const isSelected = selected === size;
          const isBooked = bookedSizes.includes(size);
          const isDisabled = disabled || isBooked;
          return (
            <button
              key={size}
              type="button"
              onClick={() => !isDisabled && onChange?.(size)}
              disabled={isDisabled}
              style={{
                padding: '8px 16px',
                border: `1px solid ${isSelected ? 'var(--gold)' : isBooked ? 'var(--border)' : 'var(--border)'}`,
                background: isSelected ? 'rgba(232,160,32,0.12)' : 'transparent',
                color: isSelected ? 'var(--gold)' : isDisabled ? 'var(--muted)' : 'var(--text)',
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                letterSpacing: '0.08em',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                transition: 'all 0.2s',
                minWidth: 44,
                textAlign: 'center',
              }}
              title={isBooked ? '예약됨' : ''}
            >
              {size} {isBooked ? '(예약됨)' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeSelector;
