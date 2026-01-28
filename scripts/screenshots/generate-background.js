#!/usr/bin/env node

/**
 * Background Generator for App Store Marketing Screenshots
 *
 * Generates only the gradient background (without device frames or text)
 * for use in Figma or other design tools.
 *
 * Usage:
 *   node scripts/screenshots/generate-background.js [options]
 *
 * Options:
 *   --width <px>    Output width (default: 10272)
 *   --height <px>   Output height (default: 2778)
 *   --output <path> Output file path (default: output/background.png)
 */

const { createCanvas } = require('@napi-rs/canvas');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Design constants (from marketing-copy.json)
const DESIGN = {
  background: {
    gradient: ['#0D0B09', '#1A1008', '#0D0B09'],
    gradientStops: [0, 0.5, 1],
  },
  accentColor: 'rgba(255, 107, 53, 0.3)',
};

/**
 * Create gradient background
 */
function drawGradientBackground(ctx, width, height) {
  // Main gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const colors = DESIGN.background.gradient;
  const stops = DESIGN.background.gradientStops;

  colors.forEach((color, i) => {
    gradient.addColorStop(stops[i], color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle orange glow at bottom
  const glowGradient = ctx.createRadialGradient(
    width / 2, height * 0.85, 0,
    width / 2, height * 0.85, width * 0.6
  );
  glowGradient.addColorStop(0, 'rgba(255, 107, 53, 0.15)');
  glowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Main function
 */
async function main() {
  program
    .option('-w, --width <px>', 'Output width', '10272')
    .option('-h, --height <px>', 'Output height', '2778')
    .option('-o, --output <path>', 'Output file path', 'output/background.png')
    .option('--no-glow', 'Disable orange glow effect')
    .parse(process.argv);

  const options = program.opts();
  const width = parseInt(options.width, 10);
  const height = parseInt(options.height, 10);
  const outputPath = path.resolve(process.cwd(), options.output);

  console.log(`\n🎨 Generating Background`);
  console.log(`   Size: ${width}x${height}`);
  console.log(`   Output: ${outputPath}\n`);

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw gradient background
  drawGradientBackground(ctx, width, height);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Convert to buffer and save
  const buffer = canvas.toBuffer('image/png');

  await sharp(buffer)
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(outputPath);

  console.log(`   ✅ Background saved to: ${outputPath}`);
  console.log(`   📐 Dimensions: ${width}x${height}\n`);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
