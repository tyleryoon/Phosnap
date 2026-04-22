import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Generate a perceptual hash of an image
 * Uses resize to 8x8 grayscale and average hash algorithm
 */
export async function generateImageHash(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');

        // Draw image resized to 8x8
        ctx.drawImage(img, 0, 0, 8, 8);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, 8, 8);
        const data = imageData.data;

        // Calculate average brightness
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          sum += brightness;
        }
        const avg = sum / 64;

        // Generate hash based on brightness comparison
        let hash = '';
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          hash += brightness > avg ? '1' : '0';
        }

        resolve(hash);
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
 * Compare two hashes and return similarity score
 */
export function compareHashes(hash1, hash2, threshold = 0.9) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return false;
  }

  let matches = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) {
      matches++;
    }
  }

  const similarity = matches / hash1.length;
  return similarity >= threshold;
}

/**
 * ImageVerification Component
 * Verifies portfolio images for authenticity using perceptual hashing
 */
const ImageVerification = ({ images, onVerified }) => {
  const { lang } = useLanguage();
  const [verificationStatus, setVerificationStatus] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const labels = {
    header: {
      ko: '포트폴리오 진위 검증',
      en: 'Portfolio Verification',
      ja: 'ポートフォリオ認証',
      zh: '作品集验证',
    },
    verified: {
      ko: '인증된 촬영작',
      en: 'Verified Photo',
      ja: '認証済み写真',
      zh: '已验证照片',
    },
    duplicate: {
      ko: '중복 감지',
      en: 'Duplicate Detected',
      ja: '重複検出',
      zh: '检测到重复',
    },
    verifying: {
      ko: '검증 중...',
      en: 'Verifying...',
      ja: '検証中...',
      zh: '验证中...',
    },
    summary: {
      ko: '장 인증 완료 / ',
      en: ' verified / ',
      ja: '件認証済み / ',
      zh: '已验证 / ',
    },
    summaryTotal: {
      ko: '장 중복 감지',
      en: ' duplicates detected',
      ja: '件重複検出',
      zh: '个重复',
    },
  };

  useEffect(() => {
    if (!images || images.length === 0) {
      return;
    }

    verifyImages();
  }, [images]);

  const verifyImages = async () => {
    setIsProcessing(true);
    setProgress(0);
    const status = {};

    try {
      // Get stored hashes from localStorage
      const storedHashesJson = localStorage.getItem('phosnap_image_hashes');
      const storedHashes = storedHashesJson ? JSON.parse(storedHashesJson) : {};

      // Generate hashes for current images
      const currentHashes = {};
      const results = [];

      for (let i = 0; i < images.length; i++) {
        try {
          const image = images[i];
          const hash = await generateImageHash(image.url);
          currentHashes[image.id] = hash;

          // Check for duplicates across stored hashes
          let isDuplicate = false;
          let duplicateCount = 0;

          for (const storedId in storedHashes) {
            if (compareHashes(hash, storedHashes[storedId], 0.85)) {
              isDuplicate = true;
              duplicateCount++;
            }
          }

          // Also check against current batch
          for (const currentId in currentHashes) {
            if (currentId !== image.id && compareHashes(hash, currentHashes[currentId], 0.85)) {
              isDuplicate = true;
              duplicateCount++;
            }
          }

          status[image.id] = {
            status: isDuplicate ? 'duplicate' : 'verified',
            hash,
            duplicateCount,
          };

          results.push({
            id: image.id,
            status: isDuplicate ? 'duplicate' : 'verified',
            duplicateCount,
          });
        } catch (error) {
          status[images[i].id] = { status: 'error', error: error.message };
          results.push({ id: images[i].id, status: 'error' });
        }

        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      // Merge with stored hashes
      const updatedHashes = { ...storedHashes, ...currentHashes };
      localStorage.setItem('phosnap_image_hashes', JSON.stringify(updatedHashes));

      setVerificationStatus(status);
      setProgress(100);

      if (onVerified) {
        const verified = Object.values(status).filter((s) => s.status === 'verified').length;
        const duplicates = Object.values(status).filter((s) => s.status === 'duplicate').length;
        onVerified({ verified, duplicates, results });
      }
    } catch (error) {
      // silently handled
    } finally {
      setIsProcessing(false);
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  const verifiedCount = Object.values(verificationStatus).filter((s) => s.status === 'verified').length;
  const duplicateCount = Object.values(verificationStatus).filter((s) => s.status === 'duplicate').length;
  const totalCount = images.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'var(--bg2)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'var(--font-serif)',
          color: 'var(--text)',
        }}
      >
        {labels.header[lang]}
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {progress}%
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--border)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: 'var(--gold)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Image grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '12px',
        }}
      >
        {images.map((image) => {
          const status = verificationStatus[image.id];
          const isVerified = status?.status === 'verified';
          const isDuplicate = status?.status === 'duplicate';
          const isLoading = !status;

          let badgeColor = 'var(--muted)';
          let badgeLabel = labels.verifying[lang];
          let badgeIcon = '○';

          if (isVerified) {
            badgeColor = '#4CAF50';
            badgeLabel = labels.verified[lang];
            badgeIcon = '✓';
          } else if (isDuplicate) {
            badgeColor = '#FFC107';
            badgeLabel = labels.duplicate[lang];
            badgeIcon = '⚠';
          }

          return (
            <div
              key={image.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '6px',
                aspectRatio: '1',
                border: `1px solid ${badgeColor}`,
              }}
            >
              <img
                src={image.url}
                alt={`Portfolio ${image.id}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: isDuplicate ? 0.5 : 1,
                }}
              />

              {/* Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: badgeColor,
                  padding: '4px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  animation: isLoading ? 'spin 2s linear infinite' : 'none',
                }}
              >
                <span>{badgeIcon}</span>
                {isLoading && <span>•</span>}
              </div>

              {/* Tooltip on hover */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  color: badgeColor,
                  padding: '8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: '1.3',
                  textAlign: 'center',
                  transform: 'translateY(100%)',
                  transition: 'transform 0.2s ease',
                }}
                className="image-verification-tooltip"
              >
                {badgeLabel}
                {isDuplicate && status.duplicateCount > 0 && (
                  <div style={{ marginTop: '2px', opacity: 0.8 }}>
                    {status.duplicateCount} match{status.duplicateCount > 1 ? 'es' : ''}
                  </div>
                )}
              </div>

              <style>{`
                div[class="image-verification-tooltip"] {
                  cursor: pointer;
                }
              `}</style>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {!isProcessing && Object.keys(verificationStatus).length > 0 && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-sans)',
            paddingTop: '8px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ color: '#4CAF50' }}>{verifiedCount}</span>
          {labels.summary[lang]}
          <span style={{ color: '#FFC107' }}>{duplicateCount}</span>
          {labels.summaryTotal[lang]}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        div[class="image-verification-tooltip"] {
          pointer-events: none;
        }

        div:has(> img):hover div[class="image-verification-tooltip"] {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default ImageVerification;
