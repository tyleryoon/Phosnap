import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Creating icon placeholders (SVG-based)...\n');

// Function to create SVG content with specified size
function createIconSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="256" fill="#0B0B0B"/>
  <g fill="#E8A020">
    <rect x="160" y="140" width="60" height="240" rx="4"/>
    <path d="M 220 140 Q 300 140 300 200 Q 300 240 260 245 L 220 245 Z" fill="#E8A020"/>
  </g>
  <circle cx="256" cy="256" r="240" fill="none" stroke="#E8A020" stroke-width="2" opacity="0.3"/>
</svg>`;
}

// Create SVG copies for each size (as a fallback)
sizes.forEach((size) => {
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  const svgContent = createIconSVG(size);
  fs.writeFileSync(filename, svgContent, 'utf-8');
  console.log(`✓ Created icon-${size}x${size}.svg`);
});

console.log('\nIcon generation complete!');
console.log('Note: These are SVG files. For true PNG support, install the "canvas" package.');
console.log('Modern browsers handle SVG icons well in PWA manifests.');
