import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getCountries, getCityPresets, generateLocationId, COUNTRIES } from '../data/locationUtils';

// ─── LocationPicker Component ───────────────────────────────────────────
// 2단계 위치 선택: 국가 → 도시 (프리셋 또는 자유 입력)
// Props:
//   - value: { countryCode, city, locationId } 또는 null
//   - onChange: (value) => void
//   - lang: 'ko' | 'en' | 'ja' | 'zh' (기본: 'ko')
// ────────────────────────────────────────────────────────────────────────

const LocationPicker = ({ value, onChange, lang = 'ko' }) => {
  const [step, setStep] = useState(value?.countryCode ? 'city' : 'country');
  const [selectedCountry, setSelectedCountry] = useState(value?.countryCode || '');
  const [city, setCity] = useState(value?.city || '');
  const [showPresets, setShowPresets] = useState(false);
  const cityInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const countries = useMemo(() => getCountries(lang), [lang]);
  const cityPresets = useMemo(() => {
    return selectedCountry ? getCityPresets(selectedCountry, lang) : [];
  }, [selectedCountry, lang]);

  // 프리셋과 유입력 값 필터링
  const filteredPresets = useMemo(() => {
    if (!city) return cityPresets;
    const lowerCity = city.toLowerCase();
    return cityPresets.filter(p => p.name.toLowerCase().includes(lowerCity) || p.id.toLowerCase().includes(lowerCity));
  }, [city, cityPresets]);

  // 국가 선택 완료
  const handleSelectCountry = (code) => {
    setSelectedCountry(code);
    setCity('');
    setStep('city');
  };

  // 도시 선택 완료
  const handleSelectCity = (cityId, cityName) => {
    setCity(cityName);
    const newValue = {
      countryCode: selectedCountry,
      city: cityName,
      locationId: cityId,
    };
    onChange(newValue);
    setShowPresets(false);
  };

  // 자유 입력 도시명 확인
  const handleCityInput = (e) => {
    const newCity = e.target.value;
    setCity(newCity);
    setShowPresets(true);
  };

  // 자유 입력 도시 등록
  const handleCustomCity = () => {
    if (!city.trim()) return;
    const locationId = generateLocationId(selectedCountry, city);
    const newValue = {
      countryCode: selectedCountry,
      city: city.trim(),
      locationId,
    };
    onChange(newValue);
    setShowPresets(false);
  };

  // 외부 클릭으로 프리셋 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && cityInputRef.current && !cityInputRef.current.contains(e.target)) {
        setShowPresets(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 국가 선택 또는 선택됨 표시 */}
      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
          {lang === 'ko' ? '국가' : lang === 'en' ? 'Country' : lang === 'ja' ? '国' : '国家'}
        </label>
        {step === 'country' || !selectedCountry ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
            gap: 8,
            maxHeight: 300,
            overflowY: 'auto',
          }}>
            {countries.map(c => (
              <button
                key={c.code}
                onClick={() => handleSelectCountry(c.code)}
                style={{
                  padding: '8px 12px',
                  background: selectedCountry === c.code ? 'var(--gold)' : 'var(--bg)',
                  border: selectedCountry === c.code ? '1px solid var(--gold)' : '1px solid var(--border)',
                  color: selectedCountry === c.code ? 'var(--bg)' : 'var(--text)',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  fontWeight: selectedCountry === c.code ? 600 : 400,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span>{c.flag}</span>
                <span style={{ fontSize: 9 }}>{c.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            onClick={() => setStep('country')}
            style={{
              padding: '8px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--gold-border)',
              color: 'var(--text)',
              cursor: 'pointer',
              borderRadius: 2,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{COUNTRIES[selectedCountry]?.flag}</span>
            <span>{COUNTRIES[selectedCountry]?.[lang]}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>변경</span>
          </div>
        )}
      </div>

      {/* 도시 선택 */}
      {selectedCountry && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
            {lang === 'ko' ? '도시' : lang === 'en' ? 'City' : lang === 'ja' ? '都市' : '城市'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              ref={cityInputRef}
              type="text"
              value={city}
              onChange={handleCityInput}
              onFocus={() => setShowPresets(true)}
              placeholder={lang === 'ko' ? '도시명 입력 또는 선택' : lang === 'en' ? 'Enter or select city' : lang === 'ja' ? '都市名を入力または選択' : '输入或选择城市'}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
                borderRadius: 2,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                borderColor: showPresets ? 'var(--gold)' : 'var(--border)',
              }}
            />

            {/* 프리셋 드롭다운 */}
            {showPresets && filteredPresets.length > 0 && (
              <div
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg2)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: 2,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                {filteredPresets.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectCity(p.id, p.name)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s',
                      background: city.toLowerCase() === p.name.toLowerCase() ? 'rgba(232,160,32,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,160,32,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = city.toLowerCase() === p.name.toLowerCase() ? 'rgba(232,160,32,0.1)' : 'transparent'}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}

            {/* 자유 입력 도시 확인 버튼 */}
            {city && !cityPresets.some(p => p.id === generateLocationId(selectedCountry, city)) && (
              <button
                onClick={handleCustomCity}
                style={{
                  marginTop: 6,
                  padding: '6px 12px',
                  background: 'var(--gold)',
                  color: 'var(--bg)',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {lang === 'ko' ? `"${city}" 추가` : lang === 'en' ? `Add "${city}"` : lang === 'ja' ? `"${city}"を追加` : `添加"${city}"`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 선택 요약 */}
      {value?.countryCode && value?.city && (
        <div style={{
          padding: 8,
          background: 'rgba(232,160,32,0.05)',
          border: '1px solid rgba(232,160,32,0.2)',
          borderRadius: 2,
          fontSize: 12,
          color: 'var(--text)',
        }}>
          <span style={{ color: 'var(--gold)', fontWeight: 500 }}>선택:</span> {COUNTRIES[value.countryCode]?.flag} {COUNTRIES[value.countryCode]?.[lang]} · {value.city}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
