import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Mock styles for photographers (pre-computed)
 */
const MOCK_STYLES = {
  1: {
    brightness: 72,
    saturation: 55,
    contrast: 45,
    warmth: 25,
    style: 'warm',
    dominantColors: ['#E8C4A0', '#8B6F4E', '#D4A76A', '#F5E6D3', '#2C1810'],
  },
  2: {
    brightness: 45,
    saturation: 62,
    contrast: 68,
    warmth: -15,
    style: 'moody',
    dominantColors: ['#2C3E50', '#1A1A2E', '#4A6741', '#8B7355', '#D4C5B0'],
  },
};

/**
 * Analyze image style
 * Returns brightness, saturation, contrast, warmth, dominant colors
 */
export async function analyzeImageStyle(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 100, 100);

        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;

        // Calculate metrics
        let totalR = 0, totalG = 0, totalB = 0, totalBrightness = 0;
        const colorMap = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          totalR += r;
          totalG += g;
          totalB += b;

          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;

          // Store color frequency
          const colorKey = `${Math.round(r / 10)}${Math.round(g / 10)}${Math.round(b / 10)}`;
          colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
        }

        const pixelCount = data.length / 4;
        const avgR = Math.round(totalR / pixelCount);
        const avgG = Math.round(totalG / pixelCount);
        const avgB = Math.round(totalB / pixelCount);
        const brightness = Math.round((totalBrightness / pixelCount) / 255 * 100);

        // Extract dominant colors
        const sortedColors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key]) => {
            const r = parseInt(key.substring(0, 2)) * 10;
            const g = parseInt(key.substring(2, 4)) * 10;
            const b = parseInt(key.substring(4, 6)) * 10;
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
          });

        // Calculate saturation and warmth
        const max = Math.max(avgR, avgG, avgB);
        const min = Math.min(avgR, avgG, avgB);
        const saturation = max === 0 ? 0 : Math.round(((max - min) / max) * 100);

        const warmth = avgR - avgB;

        // Determine style based on brightness and saturation
        let style = 'balanced';
        if (brightness > 70) style = 'bright';
        else if (brightness < 40) style = 'moody';
        else if (warmth > 20) style = 'warm';
        else if (warmth < -20) style = 'cool';

        const contrast = Math.max(...[
          Math.abs(avgR - avgG),
          Math.abs(avgG - avgB),
          Math.abs(avgR - avgB),
        ]);

        resolve({
          brightness,
          saturation,
          contrast: Math.round((contrast / 255) * 100),
          warmth: Math.round(warmth / 255 * 100),
          style,
          dominantColors: sortedColors.length > 0 ? sortedColors : ['#8B8B8B'],
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = imageUrl;
  });
}

/**
 * Calculate similarity score between two style profiles
 */
function calculateStyleSimilarity(style1, style2) {
  const brightnessDiff = Math.abs(style1.brightness - style2.brightness);
  const saturationDiff = Math.abs(style1.saturation - style2.saturation);
  const contrastDiff = Math.abs(style1.contrast - style2.contrast);
  const warmthDiff = Math.abs(style1.warmth - style2.warmth);

  const maxDiff = (100 + 100 + 100 + 100) / 4;
  const totalDiff = (brightnessDiff + saturationDiff + contrastDiff + warmthDiff) / 4;
  const similarity = Math.max(0, 100 - (totalDiff / maxDiff) * 100);

  return Math.round(similarity);
}

/**
 * Match photographers by style
 */
export function matchPhotographersByStyle(refStyle, photographers) {
  if (!photographers || !photographers.length) {
    return [];
  }

  return photographers
    .filter((p) => p.id && MOCK_STYLES[p.id])
    .map((photographer) => {
      const photoStyle = MOCK_STYLES[photographer.id];
      const similarity = calculateStyleSimilarity(refStyle, photoStyle);
      return { ...photographer, similarity, photoStyle };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * StyleMatcher Component
 */
const StyleMatcher = ({ photographers, onMatch }) => {
  const { lang } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageStyle, setImageStyle] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const labels = {
    button: {
      ko: '📸 참고 사진으로 작가 찾기',
      en: '📸 Find Photographers by Style',
      ja: '📸 写真スタイルで作家を探す',
      zh: '📸 按风格查找摄影师',
    },
    uploadZone: {
      ko: '사진을 드래그하여 놓으세요',
      en: 'Drag and drop a photo here',
      ja: '写真をドラッグして放してください',
      zh: '将照片拖放到此处',
    },
    or: {
      ko: '또는',
      en: 'or',
      ja: 'または',
      zh: '或',
    },
    browse: {
      ko: '파일 선택',
      en: 'Browse Files',
      ja: 'ファイルを選択',
      zh: '浏览文件',
    },
    analyzing: {
      ko: '사진 스타일 분석 중...',
      en: 'Analyzing image style...',
      ja: '写真スタイルを分析中...',
      zh: '分析照片风格中...',
    },
    detectedStyle: {
      ko: '감지된 스타일',
      en: 'Detected Style',
      ja: '検出されたスタイル',
      zh: '检测到的样式',
    },
    brightness: {
      ko: '밝기',
      en: 'Brightness',
      ja: '明るさ',
      zh: '亮度',
    },
    saturation: {
      ko: '채도',
      en: 'Saturation',
      ja: '彩度',
      zh: '饱和度',
    },
    contrast: {
      ko: '명암',
      en: 'Contrast',
      ja: 'コントラスト',
      zh: '对比度',
    },
    warmth: {
      ko: '색온도',
      en: 'Warmth',
      ja: '色温度',
      zh: '色温',
    },
    dominantColors: {
      ko: '주요 색상',
      en: 'Dominant Colors',
      ja: '支配的な色',
      zh: '主色',
    },
    findMatches: {
      ko: '이 스타일과 비슷한 작가 찾기',
      en: 'Find Similar Photographers',
      ja: 'このスタイルに似た作家を探す',
      zh: '查找风格相似的摄影师',
    },
    noPhotographers: {
      ko: '작가 포트폴리오 분석 데이터가 준비되지 않았습니다',
      en: 'Photographer portfolio data not available',
      ja: '写真家のポートフォリオデータが利用できません',
      zh: '摄影师作品集数据不可用',
    },
    styleLabels: {
      bright: { ko: '밝은 톤', en: 'Bright', ja: '明るい', zh: '明亮' },
      moody: { ko: '무드 있는', en: 'Moody', ja: 'ムーディー', zh: '气氛' },
      warm: { ko: '따뜻한', en: 'Warm', ja: 'ウォーム', zh: '温暖' },
      cool: { ko: '차가운', en: 'Cool', ja: 'クール', zh: '凉爽' },
      balanced: { ko: '균형잡힌', en: 'Balanced', ja: 'バランス', zh: '平衡' },
    },
    similarPhotographers: {
      ko: '비슷한 스타일의 작가',
      en: 'Similar Photographers',
      ja: '似たスタイルの作家',
      zh: '风格相似的摄影师',
    },
    similarity: {
      ko: '스타일 일치도',
      en: 'Style Match',
      ja: 'スタイルマッチ',
      zh: '风格匹配',
    },
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  };

  const handleImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      setUploadedImage(url);
      analyzeStyle(url);
    };
    reader.readAsDataURL(file);
  };

  const analyzeStyle = async (url) => {
    setIsAnalyzing(true);
    try {
      const style = await analyzeImageStyle(url);
      setImageStyle(style);
    } catch (error) {
      setImageStyle(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFindMatches = () => {
    if (!imageStyle || !photographers) {
      return;
    }

    const results = matchPhotographersByStyle(imageStyle, photographers);
    setMatchResults(results);

    if (onMatch) {
      onMatch(results);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          color: 'var(--gold)',
          border: `2px solid var(--gold-border)`,
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'var(--font-sans)',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          width: '100%',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(212, 167, 106, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
      >
        {labels.button[lang]}
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        backgroundColor: 'var(--bg2)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}
    >
      {/* Upload area */}
      {!uploadedImage && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '40px 20px',
            backgroundColor: isDragging ? 'rgba(212, 167, 106, 0.1)' : 'rgba(212, 167, 106, 0.05)',
            border: `2px dashed ${isDragging ? 'var(--gold)' : 'var(--border)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '32px' }}>📸</div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text)',
            }}
          >
            {labels.uploadZone[lang]}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {labels.or[lang]}
          </div>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--gold)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
            }}
          >
            {labels.browse[lang]}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
            }}
          />
        </div>
      )}

      {/* Uploaded image preview */}
      {uploadedImage && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <img
              src={uploadedImage}
              alt="Reference"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <button
              onClick={() => {
                setUploadedImage(null);
                setImageStyle(null);
                setMatchResults(null);
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Analysis progress */}
      {isAnalyzing && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          {labels.analyzing[lang]}
        </div>
      )}

      {/* Style analysis results */}
      {imageStyle && !matchResults && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'var(--font-serif)',
              color: 'var(--gold)',
            }}
          >
            {labels.detectedStyle[lang]}: {labels.styleLabels[imageStyle.style][lang]}
          </div>

          {/* Metrics */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {[
              { label: labels.brightness[lang], value: imageStyle.brightness },
              { label: labels.saturation[lang], value: imageStyle.saturation },
              { label: labels.contrast[lang], value: imageStyle.contrast },
              { label: labels.warmth[lang], value: Math.abs(imageStyle.warmth) },
            ].map((metric) => (
              <div key={metric.label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-sans)',
                    marginBottom: '4px',
                  }}
                >
                  <span>{metric.label}</span>
                  <span>{metric.value}%</span>
                </div>
                <div
                  style={{
                    height: '4px',
                    backgroundColor: 'var(--border)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${metric.value}%`,
                      backgroundColor: 'var(--gold)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Dominant colors */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                marginBottom: '6px',
              }}
            >
              {labels.dominantColors[lang]}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
              }}
            >
              {imageStyle.dominantColors.map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: color,
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Find matches button */}
          <button
            onClick={handleFindMatches}
            disabled={!photographers || photographers.length === 0}
            style={{
              padding: '12px',
              backgroundColor: photographers && photographers.length > 0 ? 'var(--gold)' : 'var(--muted)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              fontWeight: '600',
              cursor: photographers && photographers.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.2s ease',
              marginTop: '8px',
            }}
            onMouseEnter={(e) => {
              if (photographers && photographers.length > 0) {
                e.target.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
            }}
          >
            {labels.findMatches[lang]}
          </button>
        </div>
      )}

      {/* Match results */}
      {matchResults && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'var(--font-serif)',
              color: 'var(--gold)',
            }}
          >
            {labels.similarPhotographers[lang]}
          </div>

          {matchResults.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {matchResults.map((photographer) => (
                <div
                  key={photographer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(212, 167, 106, 0.05)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                  }}
                >
                  {photographer.profileImage && (
                    <img
                      src={photographer.profileImage}
                      alt={photographer.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-sans)',
                        marginBottom: '2px',
                      }}
                    >
                      {photographer.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {labels.similarPhotographers[lang]}: {photographer.similarity}%
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: 'var(--gold)',
                    }}
                  >
                    {photographer.similarity}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                padding: '20px',
              }}
            >
              {labels.noPhotographers[lang]}
            </div>
          )}
        </div>
      )}

      <style>{`
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

export default StyleMatcher;
