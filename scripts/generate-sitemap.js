import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// ─── Setup ──────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Configuration
const BASE_URL = 'https://phosnap.com';
const TODAY = new Date().toISOString().split('T')[0];

// ─── Types ──────────────────────────────────────────────────────────────
/**
 * @typedef {Object} SitemapURL
 * @property {string} loc - URL location
 * @property {string} lastmod - Last modified date (YYYY-MM-DD)
 * @property {string} changefreq - Change frequency (always, hourly, daily, weekly, monthly, yearly, never)
 * @property {number} priority - Priority from 0.0 to 1.0
 */

// ─── Static URLs ────────────────────────────────────────────────────────
const STATIC_URLS = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/photographers', changefreq: 'weekly', priority: 0.9 },
  { loc: '/for-artists', changefreq: 'monthly', priority: 0.8 },
  // /for-vendors 라는 주소는 없다. 구글이 계속 404 를 받고 있었다.
  { loc: '/vendor/register', changefreq: 'monthly', priority: 0.7 },
  // 유형별 찾기 페이지. 검색 노출을 위해 주소를 넷으로 나눠뒀는데
  // 정작 사이트맵에 빠져 있었다.
  { loc: '/stylists', changefreq: 'weekly', priority: 0.8 },
  { loc: '/dresses',  changefreq: 'weekly', priority: 0.8 },
  { loc: '/venues',   changefreq: 'weekly', priority: 0.8 },
  { loc: '/contact',  changefreq: 'monthly', priority: 0.4 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.3 },
];

// ─── Load Photographer Data ──────────────────────────────────────────────
/**
 * Dynamically import PHOTOGRAPHERS from src/data/photographers.js
 */
async function loadPhotographersData() {
  try {
    // Windows 에서 'C:\...' 를 그대로 import() 에 넘기면 ESM 로더가
    // 'c:' 를 프로토콜로 읽고 거부한다. 그래서 작가 프로필이 사이트맵에서
    // 통째로 빠져 있었다 — 경고만 찍히고 빈 배열로 넘어가서 아무도 몰랐다.
    const photographersPath = pathToFileURL(
      path.join(rootDir, 'src', 'data', 'photographers.js'),
    ).href;
    const { PHOTOGRAPHERS } = await import(photographersPath);
    return PHOTOGRAPHERS || [];
  } catch (err) {
    console.warn('⚠ Warning: Could not load PHOTOGRAPHERS data', err.message);
    return [];
  }
}

// ─── Generate Sitemap ───────────────────────────────────────────────────
/**
 * Generate a complete sitemap XML with static and dynamic URLs
 */
async function generateSitemap() {
  console.log('🗺 Generating sitemap...');

  // Load photographers
  const photographers = await loadPhotographersData();
  console.log(`📷 Loaded ${photographers.length} photographers`);

  // Build URL entries
  const urls = [];

  // Add static URLs
  STATIC_URLS.forEach(({ loc, changefreq, priority }) => {
    urls.push({
      loc: `${BASE_URL}${loc}`,
      lastmod: TODAY,
      changefreq,
      priority: priority.toFixed(1),
    });
  });

  // Add photographer profile URLs
  photographers.forEach((photographer) => {
    urls.push({
      // 라우트는 /photographer/:id 다. /profile/:id 는 존재한 적이 없다.
      loc: `${BASE_URL}/photographer/${photographer.id}`,
      lastmod: TODAY,
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  console.log(`✅ Generated ${urls.length} URLs for sitemap`);

  // Generate XML
  const xml = generateXML(urls);

  // Write to file
  const outputPath = path.join(publicDir, 'sitemap.xml');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(outputPath, xml, 'utf-8');
  console.log(`✓ Sitemap written to ${outputPath}`);

  return outputPath;
}

// ─── XML Generation ─────────────────────────────────────────────────────
/**
 * Generate XML string for sitemap
 * @param {SitemapURL[]} urls
 * @returns {string}
 */
function generateXML(urls) {
  const urlElements = urls
    .map((url) => {
      return `  <url>
    <loc>${escapeXML(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

// ─── Utility: Escape XML ────────────────────────────────────────────────
/**
 * Escape special characters in XML
 */
function escapeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Main ───────────────────────────────────────────────────────────────
generateSitemap().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});
