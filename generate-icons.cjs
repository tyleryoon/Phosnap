#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Simple PNG generator using DataURL approach
 * Creates simple PNG icons with gold "P" on dark background
 * Falls back to SVG if canvas is not available
 */

const iconsDir = path.join(__dirname, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

try {
  // Try to use canvas for PNG generation
  const { createCanvas } = require('canvas');

  sizes.forEach((size) => {
    try {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      // Dark background
      ctx.fillStyle = '#0B0B0B';
      ctx.fillRect(0, 0, size, size);

      // Gold accent circle (subtle)
      ctx.strokeStyle = 'rgba(232, 160, 32, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, (size / 2) - 6, 0, Math.PI * 2);
      ctx.stroke();

      // Draw gold "P" logo
      const padding = size * 0.15;
      const barWidth = size * 0.12;
      const barHeight = size * 0.48;
      const x = padding;
      const y = padding + size * 0.1;

      ctx.fillStyle = '#E8A020';

      // Vertical bar
      ctx.fillRect(x, y, barWidth, barHeight);

      // Top curve (semicircle)
      const curveX = x + barWidth;
      const curveY = y + size * 0.05;
      const curveRadius = size * 0.2;

      ctx.beginPath();
      ctx.arc(curveX + curveRadius, curveY + curveRadius, curveRadius, Math.PI, 0);
      ctx.lineTo(curveX, curveY + curveRadius * 2);
      ctx.lineTo(curveX, curveY);
      ctx.closePath();
      ctx.fill();

      // Save PNG
      const buffer = canvas.toBuffer('image/png');
      const filename = path.join(iconsDir, `icon-${size}x${size}.png`);
      fs.writeFileSync(filename, buffer);
      console.log(`✓ Generated icon-${size}x${size}.png`);
    } catch (err) {
      console.warn(`Warning: Could not generate ${size}x${size} icon: ${err.message}`);
    }
  });

  console.log('\nIcon generation complete!');
} catch (err) {
  console.warn('Canvas not available, using SVG fallback approach...');
  console.log('Install "canvas" package for PNG generation: npm install canvas');
  console.log('\nUsing SVG icon at public/icons/icon.svg for PWA');
}
