#!/usr/bin/env node

/**
 * Act Background Generator for App Store Marketing Screenshots
 *
 * Generates backgrounds for all 3 onboarding Acts:
 * - Act 1: Blue/Purple (Calm, Intellectual)
 * - Act 2: Crimson/Red (Tension, Commitment)
 * - Act 3: Gold/Amber (Achievement, Celebration)
 *
 * Usage:
 *   node scripts/screenshots/generate-act-backgrounds.js
 */

const { createCanvas } = require('@napi-rs/canvas');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// App Store screenshot sizes
const OUTPUT_SIZE = {
  width: 1290,
  height: 2796,
};

// Act color themes (from src/config/animation.ts)
const ACT_THEMES = {
  act1: {
    name: 'Act 1 - Blue/Purple (Calm)',
    primary: '#0A0A1A',
    secondary: '#0F0F2A',
    accent: '#4A6FA5',
    orbColors: ['#4A6FA5', '#7B68EE', '#6A5ACD', '#483D8B'],
  },
  act2: {
    name: 'Act 2 - Crimson/Red (Tension)',
    primary: '#0A0A0A',
    secondary: '#1A0A0A',
    accent: '#8B0000',
    orbColors: ['#8B0000', '#DC143C', '#800000', '#4A0000'],
  },
  act3: {
    name: 'Act 3 - Gold/Amber (Achievement)',
    primary: '#0A0A0A',
    secondary: '#1A1A0A',
    accent: '#FFD700',
    orbColors: ['#FFD700', '#FFA500', '#FFFACD', '#F4E04D'],
  },
};

/**
 * Draw Act-themed background with orb-like gradients
 */
function drawActBackground(ctx, width, height, theme) {
  // Base gradient
  const baseGradient = ctx.createLinearGradient(0, 0, 0, height);
  baseGradient.addColorStop(0, theme.primary);
  baseGradient.addColorStop(0.5, theme.secondary);
  baseGradient.addColorStop(1, theme.primary);
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw orb-like glows
  const orbPositions = [
    { x: width * 0.2, y: height * 0.25, radius: width * 0.4 },
    { x: width * 0.8, y: height * 0.35, radius: width * 0.35 },
    { x: width * 0.3, y: height * 0.65, radius: width * 0.45 },
    { x: width * 0.7, y: height * 0.8, radius: width * 0.4 },
  ];

  orbPositions.forEach((orb, index) => {
    const color = theme.orbColors[index % theme.orbColors.length];
    const glowGradient = ctx.createRadialGradient(
      orb.x, orb.y, 0,
      orb.x, orb.y, orb.radius
    );

    // Parse color and add alpha
    const rgbMatch = color.match(/^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 16);
      const g = parseInt(rgbMatch[2], 16);
      const b = parseInt(rgbMatch[3], 16);
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
      glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.15)`);
      glowGradient.addColorStop(1, 'transparent');
    }

    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);
  });

  // Add accent glow at bottom center
  const accentGlow = ctx.createRadialGradient(
    width / 2, height * 0.85, 0,
    width / 2, height * 0.85, width * 0.6
  );
  const accentMatch = theme.accent.match(/^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
  if (accentMatch) {
    const r = parseInt(accentMatch[1], 16);
    const g = parseInt(accentMatch[2], 16);
    const b = parseInt(accentMatch[3], 16);
    accentGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
    accentGlow.addColorStop(1, 'transparent');
  }
  ctx.fillStyle = accentGlow;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Main function
 */
async function main() {
  const { width, height } = OUTPUT_SIZE;
  const outputDir = path.resolve(process.cwd(), 'output', 'act-backgrounds');

  console.log(`\n🎨 Generating Act Backgrounds`);
  console.log(`   Size: ${width}x${height} (App Store 6.7")`);
  console.log(`   Output: ${outputDir}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate background for each Act
  for (const [actKey, theme] of Object.entries(ACT_THEMES)) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw background
    drawActBackground(ctx, width, height, theme);

    // Save
    const outputPath = path.join(outputDir, `${actKey}_background.png`);
    const buffer = canvas.toBuffer('image/png');

    await sharp(buffer)
      .png({ quality: 100, compressionLevel: 6 })
      .toFile(outputPath);

    console.log(`   ✅ ${actKey}_background.png - ${theme.name}`);
  }

  console.log(`\n📁 Output directory: ${outputDir}`);
  console.log(`📐 All backgrounds: ${width}x${height}\n`);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
