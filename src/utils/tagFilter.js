/**
 * Tag filtering utility for Phosnap
 * Filters out profanity and inappropriate tags for luxury photography booking platform
 */

const BLOCKED_WORDS = [
  // English profanity
  'damn', 'crap', 'hell', 'piss', 'arsehole', 'bastard', 'bitch', 'dumb', 'stupid',
  'idiot', 'asshole', 'shit', 'fuck', 'dick', 'cock', 'pussy', 'whore', 'slut',
  'jackass', 'moron', 'retard', 'cunt', 'twat', 'wank',

  // Japanese profanity
  'ばか', 'バカ', 'あほ', 'アホ', 'くそ', 'クソ', 'きちがい', 'キチガイ', 'しね', 'シネ',
  'うんこ', 'ウンコ', 'めくら', 'めっくら', 'つんぼ', 'ろう', 'ろうあ',

  // Korean profanity (Hangul)
  '개새끼', '씨발', '미친', '미친놈', '멍청이', '병신', '새끼', '개지랄', '개념', '돈키호테',
  '빠순내', '아가리', '지랄', '장애인', '왜곡', '빨갱이', '우랑', '뻘쭉', '모디', '뜨네',
  '엠창', '개같은', '씹', '병신', '잔머리', '비아냥', '정신병', '시넹', '존나',

  // Additional international slurs/hate speech indicators
  'racist', 'sexist', 'hateful', 'terrorism', 'nazi', 'klan', 'slave', 'racial',
];

/**
 * Checks if a tag is allowed based on content validation rules
 * @param {string} tag - The tag to validate
 * @returns {boolean} - True if tag is allowed, false otherwise
 */
export function isTagAllowed(tag) {
  if (typeof tag !== 'string') {
    return false;
  }

  const trimmedTag = tag.trim();

  // Check length constraints
  if (trimmedTag.length < 1 || trimmedTag.length > 20) {
    return false;
  }

  // Check if tag is only numbers
  if (/^\d+$/.test(trimmedTag)) {
    return false;
  }

  // Check for invalid special characters (allow spaces, hyphens, underscores, CJK chars, middle dot)
  if (!/^[a-zA-Z0-9\s\-_·\u00C0-\u024F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+$/.test(trimmedTag)) {
    return false;
  }

  // Check for blocked words (case-insensitive for ASCII, as-is for CJK)
  const lowerTag = trimmedTag.toLowerCase();

  for (const blockedWord of BLOCKED_WORDS) {
    const lowerBlockedWord = blockedWord.toLowerCase();
    if (lowerTag.includes(lowerBlockedWord)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes a tag by trimming whitespace and normalizing spaces
 * @param {string} tag - The tag to sanitize
 * @returns {string|null} - Sanitized tag if valid, null if invalid
 */
export function sanitizeTag(tag) {
  if (typeof tag !== 'string') {
    return null;
  }

  // Trim and normalize multiple spaces to single space
  let sanitized = tag.trim().replace(/\s+/g, ' ');

  // Validate the sanitized tag
  if (!isTagAllowed(sanitized)) {
    return null;
  }

  return sanitized;
}
