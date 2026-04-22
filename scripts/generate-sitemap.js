import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  { loc: '/explore', changefreq: 'weekly', priority: 0.9 },
  { loc: '/photographers', changefreq: 'weekly', priority: 0.9 },
  { loc: '/for-artists', changefreq: 'monthly', priority: 0.8 },
  { loc: '/for-vendors', changefreq: 'monthly', priority: 0.7 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.3 },
];

// ─── Load Photographer Data ──────────────────────────────────────────────
/**
 * Dynamically import PHOTOGRAPHERS from src/data/photographers.js
 */
async function loadPhotographersData() {
  try {
    // Use absolute path with .js extension for ESM import
    const photographersPath = path.join(rootDir, 'src', 'data', 'photographers.js');
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
      loc: `${BASE_URL}/profile/${photographer.id}`,
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
