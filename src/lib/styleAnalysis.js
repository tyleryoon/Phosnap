/**
 * AI 스타일 분석 — Canvas API 기반 색상/밝기/채도 분석
 * No external API needed - uses HTML Canvas for image analysis
 */

/**
 * Simple k-means-like clustering for dominant colors
 * @param {Array} pixels - Array of {r, g, b, a} objects
 * @param {number} k - Number of clusters
 * @returns {Array} Dominant colors with percentages
 */
function clusterColors(pixels, k = 5) {
  if (pixels.length === 0) return [];

  // Initialize clusters with random pixels
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < Math.min(k, pixels.length); i++) {
    let idx;
    do {
      idx = Math.floor(Math.random() * pixels.length);
    } while (used.has(idx));
    used.add(idx);
    const p = pixels[idx];
    clusters.push({
      r: p.r,
      g: p.g,
      b: p.b,
      count: 0,
      sumR: 0,
      sumG: 0,
      sumB: 0,
    });
  }

  // Simple single iteration of k-means (fast, good enough for style detection)
  pixels.forEach((pixel) => {
    let closestIdx = 0;
    let minDist = Infinity;

    clusters.forEach((cluster, idx) => {
      const dist =
        Math.pow(pixel.r - cluster.r, 2) +
        Math.pow(pixel.g - cluster.g, 2) +
        Math.pow(pixel.b - cluster.b, 2);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    const cluster = clusters[closestIdx];
    cluster.count += 1;
    cluster.sumR += pixel.r;
    cluster.sumG += pixel.g;
    cluster.sumB += pixel.b;
  });

  // Update cluster centers and convert to percentages
  return clusters
    .map((cluster) => {
      const percentage = Math.round((cluster.count / pixels.length) * 10000) / 100;
      return {
        r: Math.round(cluster.count > 0 ? cluster.sumR / cluster.count : cluster.r),
        g: Math.round(cluster.count > 0 ? cluster.sumG / cluster.count : cluster.g),
        b: Math.round(cluster.count > 0 ? cluster.sumB / cluster.count : cluster.b),
        hex: rgbToHex(
          Math.round(cluster.count > 0 ? cluster.sumR / cluster.count : cluster.r),
          Math.round(cluster.count > 0 ? cluster.sumG / cluster.count : cluster.g),
          Math.round(cluster.count > 0 ? cluster.sumB / cluster.count : cluster.b)
        ),
        percentage: percentage,
        count: cluster.count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, k);
}

/**
 * Converts RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * Calculates perceived brightness (luminance)
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {number} Brightness 0-100
 */
function calculateBrightness(r, g, b) {
  // Using relative luminance formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return Math.round((brightness / 255) * 100);
}

/**
 * Calculates saturation of a color
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {number} Saturation 0-100
 */
function calculateSaturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (max === 0) return 0;
  const saturation = (delta / max) * 100;
  return Math.round(saturation);
}

/**
 * Calculates color warmth (-100 to 100)
 * Negative = cool (blue), Positive = warm (red/yellow)
 * @param {number} r - Red
 * @param {number} g - Green
 * @param {number} b - Blue
 * @returns {number} Warmth -100 to 100
 */
function calculateWarmth(r, g, b) {
  // Warm colors (red, yellow) have high R and G
  // Cool colors (blue, cyan) have high B
  const warmScore = r + g - b;
  // Normalize to -100 to 100
  return Math.round(((warmScore - 127.5) / 127.5) * 100);
}

/**
 * Analyzes image style using Canvas API
 * @param {string} imageUrl - URL of image to analyze
 * @returns {Promise<Object>} Style analysis results
 */
export async function analyzeImageStyle(imageUrl) {
  return new Promise((resolve, reject) => {
    // Check if canvas is available
    if (typeof document === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      resolve({
        dominantColors: [],
        brightness: 50,
        saturation: 50,
        contrast: 50,
        warmth: 0,
        style: 'natural',
        styleLabel: {
          ko: '자연스러운',
          en: 'Natural',
          ja: '自然',
          zh: '自然',
        },
      });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas and context
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size - resize for performance
        const maxDimension = 200;
        const ratio = img.width / img.height;
        let width = maxDimension;
        let height = maxDimension;

        if (ratio > 1) {
          height = Math.round(maxDimension / ratio);
        } else {
          width = Math.round(maxDimension * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Sample pixels (every 4th pixel for performance)
        const pixels = [];
        const luminances = [];

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a > 127) {
            pixels.push({ r, g, b, a });

            // Calculate luminance for contrast
            const lum = calculateBrightness(r, g, b);
            luminances.push(lum);
          }
        }

        if (pixels.length === 0) {
          throw new Error('No valid pixels found');
        }

        // Get dominant colors
        const dominantColors = clusterColors(pixels, 5);

        // Calculate overall metrics
        const avgBrightness = Math.round(luminances.reduce((a, b) => a + b, 0) / luminances.length);
        const brightnessVariance = luminances.reduce((sum, lum) => sum + Math.pow(lum - avgBrightness, 2), 0) / luminances.length;
        const contrast = Math.round(Math.sqrt(brightnessVariance) / 2.55);

        const avgSaturation = Math.round(
          pixels.reduce((sum, p) => sum + calculateSaturation(p.r, p.g, p.b), 0) / pixels.length
        );

        const avgWarmth = Math.round(
          pixels.reduce((sum, p) => sum + calculateWarmth(p.r, p.g, p.b), 0) / pixels.length
        );

        // Classify style
        const style = classifyStyle({
          brightness: avgBrightness,
          saturation: avgSaturation,
          warmth: avgWarmth,
          contrast: contrast,
        });

        const styleLabel = getStyleLabel(style, 'object');

        resolve({
          dominantColors: dominantColors.map(({ r, g, b, hex, percentage }) => ({
            r,
            g,
            b,
            hex,
            percentage,
          })),
          brightness: avgBrightness,
          saturation: avgSaturation,
          contrast: Math.min(contrast, 100),
          warmth: avgWarmth,
          style: style,
          styleLabel: styleLabel,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };

    img.src = imageUrl;
  });
}

/**
 * Calculates similarity between two style analyses
 * @param {Object} style1 - First style analysis
 * @param {Object} style2 - Second style analysis
 * @returns {number} Similarity score 0-100
 */
export function calculateStyleSimilarity(style1, style2) {
  if (!style1 || !style2) return 0;

  // Weight components
  const brightnessDiff = Math.abs(style1.brightness - style2.brightness);
  const saturationDiff = Math.abs(style1.saturation - style2.saturation);
  const warmthDiff = Math.abs(style1.warmth - style2.warmth);

  // Color palette similarity
  let colorSimilarity = 0;
  if (style1.dominantColors && style2.dominantColors) {
    const colors1 = style1.dominantColors.slice(0, 3);
    const colors2 = style2.dominantColors.slice(0, 3);

    colors1.forEach((c1) => {
      const match = colors2.find((c2) => {
        const dist = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
        return dist < 50;
      });
      if (match) colorSimilarity += 1;
    });
    colorSimilarity = (colorSimilarity / Math.max(colors1.length, 1)) * 100;
  }

  // Calculate weighted score
  const brightScore = 100 - Math.min(brightnessDiff * 1.5, 100);
  const satScore = 100 - Math.min(saturationDiff * 1.5, 100);
  const warmScore = 100 - Math.min(warmthDiff * 1.5, 100);

  const similarity =
    brightScore * 0.3 +
    satScore * 0.25 +
    warmScore * 0.25 +
    colorSimilarity * 0.2;

  return Math.round(similarity);
}

/**
 * Matches photographers by style similarity
 * @param {string} referenceImageUrl - Reference image URL
 * @param {Array} photographers - Array of photographer objects with portfolioThumbnails
 * @returns {Promise<Array>} Sorted photographers by match score
 */
export async function matchPhotographersByStyle(referenceImageUrl, photographers) {
  if (!Array.isArray(photographers)) return [];

  try {
    const referenceStyle = await analyzeImageStyle(referenceImageUrl);

    const matches = await Promise.all(
      photographers.map(async (photographer) => {
        let maxSimilarity = 0;

        if (photographer.portfolioThumbnails && Array.isArray(photographer.portfolioThumbnails)) {
          for (const thumbUrl of photographer.portfolioThumbnails.slice(0, 3)) {
            try {
              const thumbStyle = await analyzeImageStyle(thumbUrl);
              const similarity = calculateStyleSimilarity(referenceStyle, thumbStyle);
              maxSimilarity = Math.max(maxSimilarity, similarity);
            } catch (err) {
              // Silently ignore thumbnail analysis errors
            }
          }
        }

        return {
          photographer: photographer,
          similarityScore: maxSimilarity,
          matchedStyle: referenceStyle.style,
        };
      })
    );

    return matches.sort((a, b) => b.similarityScore - a.similarityScore);
  } catch (error) {
    return photographers.map((p) => ({
      photographer: p,
      similarityScore: 0,
      matchedStyle: 'unknown',
    }));
  }
}

/**
 * Classifies style based on analysis metrics
 * @param {Object} analysis - Style analysis with brightness, saturation, warmth, contrast
 * @returns {string} Style category
 */
export function classifyStyle(analysis) {
  const { brightness = 50, saturation = 50, warmth = 0, contrast = 50 } = analysis;

  // Bright style
  if (brightness > 70 && saturation > 50) {
    return 'bright';
  }

  // Moody style
  if (brightness < 40 && contrast > 60) {
    return 'moody';
  }

  // Warm style
  if (warmth > 30) {
    return 'warm';
  }

  // Cool style
  if (warmth < -30) {
    return 'cool';
  }

  // Pastel style
  if (saturation < 40 && brightness > 60) {
    return 'pastel';
  }

  // Vivid style
  if (saturation > 70) {
    return 'vivid';
  }

  // Film style (high contrast, warm-ish, lower saturation)
  if (contrast > 70 && warmth > 10 && saturation < 60) {
    return 'film';
  }

  // Natural (balanced)
  return 'natural';
}

/**
 * Gets localized label for style
 * @param {string} style - Style category
 * @param {string|'object'} lang - Language code or 'object' to return all
 * @returns {string|Object} Localized label or object with all languages
 */
export function getStyleLabel(style, lang = 'ko') {
  const labels = {
    bright: {
      ko: '밝은',
      en: 'Bright',
      ja: '明るい',
      zh: '明亮',
    },
    moody: {
      ko: '감성적인',
      en: 'Moody',
      ja: 'ムーディー',
      zh: '氛围感',
    },
    warm: {
      ko: '따뜻한',
      en: 'Warm',
      ja: '温かい',
      zh: '温暖',
    },
    cool: {
      ko: '차가운',
      en: 'Cool',
      ja: 'クール',
      zh: '冷调',
    },
    pastel: {
      ko: '파스텔',
      en: 'Pastel',
      ja: 'パステル',
      zh: '清淡',
    },
    vivid: {
      ko: '선명한',
      en: 'Vivid',
      ja: 'ビビッド',
      zh: '鲜艳',
    },
    film: {
      ko: '필름',
      en: 'Film',
      ja: 'フィルム',
      zh: '胶片',
    },
    natural: {
      ko: '자연스러운',
      en: 'Natural',
      ja: '自然',
      zh: '自然',
    },
  };

  const styleLabels = labels[style] || labels.natural;

  if (lang === 'object') {
    return styleLabels;
  }

  return styleLabels[lang] || styleLabels.en;
}
