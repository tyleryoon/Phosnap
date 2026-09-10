import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Language detection helper function
 */
export function detectLanguage(text) {
  if (!text) return 'en';

  const koreanPattern = /[\uAC00-\uD7AF]/;
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
  const chinesePattern = /[\u4E00-\u9FFF]/;

  if (koreanPattern.test(text)) return 'ko';
  if (japanesePattern.test(text)) return 'ja';
  if (chinesePattern.test(text)) return 'zh';

  return 'en';
}

/**
 * Language code to language name mapping
 */
const LANGUAGE_NAMES = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese',
  zh: 'Chinese',
};

const LANGUAGE_NAMES_LOCALIZED = {
  ko: { ko: '한국어', en: 'Korean', ja: '韓国語', zh: '韓語' },
  en: { ko: '영어', en: 'English', ja: '英語', zh: '英語' },
  ja: { ko: '일본어', en: 'Japanese', ja: '日本語', zh: '日語' },
  zh: { ko: '중국어', en: 'Chinese', ja: '中国語', zh: '中文' },
};

/**
 * ChatTranslator Component
 * Provides toggle translation functionality for chat messages
 */
const ChatTranslator = ({
  text,
  sourceLang,
  targetLang,
  onTranslated,
}) => {
  const { lang: currentLang, t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect language if not provided
  // sourceLang 으로 'auto' 가 넘어오는 호출부가 있다. 그대로 두면
  // LANGUAGE_NAMES_LOCALIZED['auto'] 가 undefined 가 되어 라벨을 읽을 때
  // 채팅 화면 전체가 크래시한다. 지원 언어가 아니면 직접 감지한다.
  const SUPPORTED = ['ko', 'en', 'ja', 'zh'];
  const rawSource = sourceLang && SUPPORTED.includes(sourceLang)
    ? sourceLang
    : detectLanguage(text);
  const detectedSourceLang = SUPPORTED.includes(rawSource) ? rawSource : 'en';
  const rawTarget = targetLang || (currentLang === detectedSourceLang ? 'en' : currentLang);
  const detectedTargetLang = SUPPORTED.includes(rawTarget) ? rawTarget : 'en';

  // Skip translation if source and target are the same
  if (detectedSourceLang === detectedTargetLang) {
    return null;
  }

  const handleTranslateClick = async () => {
    if (translatedText) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: text,
          source: detectedSourceLang,
          target: detectedTargetLang,
          format: 'text',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const translated = data.translatedText || '';

      setTranslatedText(translated);
      setIsExpanded(true);

      if (onTranslated) {
        onTranslated({ original: text, translated, sourceLang: detectedSourceLang, targetLang: detectedTargetLang });
      }
    } catch (err) {
      setError('translation_service_preparing');
      setIsExpanded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const translationLabels = {
    ko: '번역 보기',
    en: 'Show Translation',
    ja: '翻訳を見る',
    zh: '查看翻译',
  };

  const translatingLabels = {
    ko: '번역 중...',
    en: 'Translating...',
    ja: '翻訳中...',
    zh: '翻译中...',
  };

  const preparingLabels = {
    ko: '번역 서비스 준비 중',
    en: 'Translation service preparing',
    ja: '翻訳サービスの準備中',
    zh: '翻译服务准备中',
  };

  // 라벨 조회도 방어적으로 — 예상 못 한 언어 코드에도 화면이 죽지 않게 한다.
  const langLabel = (code) =>
    LANGUAGE_NAMES_LOCALIZED[code]?.[currentLang]
    ?? LANGUAGE_NAMES_LOCALIZED[code]?.en
    ?? code;
  const sourceLanguageLabel = langLabel(detectedSourceLang);
  const targetLanguageLabel = langLabel(detectedTargetLang);

  return (
    <div
      style={{
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <button
        onClick={handleTranslateClick}
        disabled={isLoading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: 'transparent',
          color: isLoading ? 'var(--muted)' : 'var(--gold)',
          border: `1px solid ${isLoading ? 'var(--muted)' : 'var(--gold-border)'}`,
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.2s ease',
          opacity: isLoading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.target.style.backgroundColor = 'rgba(212, 167, 106, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
      >
        <span>🌐</span>
        <span>{isLoading ? translatingLabels[currentLang] : translationLabels[currentLang]}</span>
      </button>

      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            backgroundColor: 'rgba(212, 167, 106, 0.05)',
            borderLeft: `2px solid var(--gold-border)`,
            borderRadius: '4px',
            animation: 'slideDown 0.2s ease',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: 'var(--muted)',
              fontFamily: 'var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {sourceLanguageLabel} → {targetLanguageLabel}
          </div>

          {error ? (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                fontStyle: 'italic',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {preparingLabels[currentLang]}
            </div>
          ) : (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text)',
                lineHeight: '1.5',
                fontStyle: 'italic',
                fontFamily: 'var(--font-sans)',
                opacity: 0.9,
              }}
            >
              {translatedText}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatTranslator;
