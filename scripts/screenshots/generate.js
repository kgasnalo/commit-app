#!/usr/bin/env node

/**
 * App Store Marketing Screenshot Generator
 *
 * Combines raw screenshots with device frames and marketing text
 * to create professional App Store screenshots.
 * Supports market-specific screen ordering and per-screen glow colors.
 *
 * Usage:
 *   node scripts/screenshots/generate.js [options]
 *
 * Options:
 *   --lang <lang>    Generate for specific language (ja, en, ko). Default: all
 *   --screen <id>    Generate specific screen only. Default: all
 *   --no-frame       Generate without device frame (full-bleed)
 *   --help           Show help
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Load configuration
const CONFIG_PATH = path.join(__dirname, 'templates', 'marketing-copy.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Paths
const PATHS = {
  rawScreenshots: path.join(__dirname, '..', '..', 'output', 'raw-screenshots'),
  output: path.join(__dirname, '..', '..', 'output', 'app-store-screenshots'),
  deviceFrames: path.join(__dirname, '..', '..', 'assets', 'device-frames'),
};

// Output dimensions for different App Store requirements
const OUTPUT_SIZES = {
  'iphone-6.7': { width: 1290, height: 2796 }, // iPhone 14 Pro Max, 15 Pro Max
  'iphone-6.5': { width: 1284, height: 2778 }, // iPhone 14 Plus, 15 Plus
  'iphone-5.5': { width: 1242, height: 2208 }, // iPhone 8 Plus (legacy)
};

// Design constants
const DESIGN = config.design;

/**
 * Register system fonts for text rendering
 */
function registerFonts() {
  const sfProPaths = [
    '/System/Library/Fonts/SFNS.ttf',
    '/System/Library/Fonts/SFNSDisplay.ttf',
    '/Library/Fonts/SF-Pro-Display-Regular.otf',
  ];

  for (const fontPath of sfProPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'SF Pro Display');
        break;
      } catch (e) {
        // Continue to next font
      }
    }
  }

  const hiragioPaths = [
    '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
    '/System/Library/Fonts/HiraginoSans.ttc',
    '/Library/Fonts/ヒラギノ角ゴ ProN W6.otf',
  ];

  for (const fontPath of hiragioPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'Hiragino Sans');
        break;
      } catch (e) {
        // Continue to next font
      }
    }
  }
}

/**
 * Create gradient background with per-screen glow color
 */
function drawGradientBackground(ctx, width, height, glowColor) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const colors = DESIGN.background.gradient;
  const stops = DESIGN.background.gradientStops;

  colors.forEach((color, i) => {
    gradient.addColorStop(stops[i], color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Parse glowColor hex to rgba
  const hex = glowColor || '#FF6B35';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Add screen-specific glow at bottom
  const glowGradient = ctx.createRadialGradient(
    width / 2, height * 0.85, 0,
    width / 2, height * 0.85, width * 0.6
  );
  glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.15)`);
  glowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Resolve layout values with per-screen overrides
 */
function resolveLayout(screen) {
  const layout = screen.layout || {};
  return {
    pattern: layout.pattern || 'text-top',
    headlineFontSize: layout.headlineFontSize || DESIGN.text.headline.size,
    subtitleFontSize: layout.subtitleFontSize || DESIGN.text.subtitle.size,
    subtitleColor: layout.subtitleColor || DESIGN.text.subtitle.color,
    headlineY: layout.headlineY || DESIGN.layout.headlineY,
    subtitleY: layout.subtitleY || DESIGN.layout.subtitleY,
    frameY: layout.frameY || DESIGN.layout.frameY,
    frameScale: layout.frameScale || null,
  };
}

/**
 * Draw marketing text (headline and subtitle)
 */
function drawMarketingText(ctx, width, headline, subtitle, lang, layoutOverrides) {
  const lo = layoutOverrides || {};
  const fontFamily = lang === 'ja'
    ? '"Hiragino Sans", "SF Pro Display", sans-serif'
    : '"SF Pro Display", "Hiragino Sans", sans-serif';

  const headlineSize = lo.headlineFontSize || DESIGN.text.headline.size;
  const subtitleSize = lo.subtitleFontSize || DESIGN.text.subtitle.size;
  const subtitleColor = lo.subtitleColor || DESIGN.text.subtitle.color;
  const headlineY = lo.headlineY || DESIGN.layout.headlineY;
  const subtitleY = lo.subtitleY || DESIGN.layout.subtitleY;

  // Headline
  ctx.font = `bold ${headlineSize}px ${fontFamily}`;
  ctx.fillStyle = DESIGN.text.headline.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.fillText(headline, width / 2, headlineY);

  // Subtitle
  ctx.font = `${subtitleSize}px ${fontFamily}`;
  ctx.fillStyle = subtitleColor;
  ctx.shadowBlur = 10;

  ctx.fillText(subtitle, width / 2, subtitleY);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * Draw device frame with screenshot
 */
async function drawDeviceFrame(ctx, width, height, screenshotPath, frameY, maxScaleOverride) {
  let screenshot;
  try {
    screenshot = await loadImage(screenshotPath);
  } catch (e) {
    console.error(`Failed to load screenshot: ${screenshotPath}`);
    throw e;
  }

  const frameConfig = config.deviceFrames.iphone14ProMax;
  const maxFrameHeight = height - frameY - 80;
  const maxFrameWidth = width - 80;

  const scaleByHeight = maxFrameHeight / frameConfig.height;
  const scaleByWidth = maxFrameWidth / frameConfig.width;
  const maxScale = maxScaleOverride || 0.8;
  const scale = Math.min(scaleByHeight, scaleByWidth, maxScale);

  const frameWidth = frameConfig.width * scale;
  const frameHeight = frameConfig.height * scale;
  const frameX = (width - frameWidth) / 2;

  const cornerRadius = 60 * scale;
  const screenX = frameX + frameConfig.screenOffset.x * scale;
  const screenY = frameY + frameConfig.screenOffset.y * scale;
  const screenWidth = frameConfig.screenSize.width * scale;
  const screenHeight = frameConfig.screenSize.height * scale;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(screenX, screenY, screenWidth, screenHeight, cornerRadius);
  ctx.clip();

  ctx.drawImage(screenshot, screenX, screenY, screenWidth, screenHeight);
  ctx.restore();

  const framePath = path.join(PATHS.deviceFrames, frameConfig.frameFile);
  if (fs.existsSync(framePath)) {
    try {
      const frame = await loadImage(framePath);
      ctx.drawImage(frame, frameX, frameY, frameWidth, frameHeight);
    } catch (e) {
      console.warn(`Device frame not found or invalid: ${framePath}`);
    }
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(screenX - 2, screenY - 2, screenWidth + 4, screenHeight + 4, cornerRadius + 2);
    ctx.stroke();
  }
}

/**
 * Generate a single marketing screenshot
 */
async function generateMarketingImage(screen, lang, outputSize) {
  const { width, height } = outputSize;
  const lo = resolveLayout(screen);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw gradient background with screen-specific glow
  drawGradientBackground(ctx, width, height, screen.glowColor);

  const screenshotPath = path.join(PATHS.rawScreenshots, `${screen.id}.png`);

  if (lo.pattern === 'hero-center') {
    // Hero-Center: device first, then text below
    if (fs.existsSync(screenshotPath)) {
      await drawDeviceFrame(ctx, width, height, screenshotPath, lo.frameY, lo.frameScale);
    } else {
      console.warn(`Screenshot not found: ${screenshotPath}`);
      drawPlaceholder(ctx, width, height);
    }
    drawMarketingText(ctx, width, screen.headline, screen.subtitle, lang, lo);
  } else {
    // Text-Top (default): text first, then device
    drawMarketingText(ctx, width, screen.headline, screen.subtitle, lang, lo);
    if (fs.existsSync(screenshotPath)) {
      await drawDeviceFrame(ctx, width, height, screenshotPath, lo.frameY, lo.frameScale);
    } else {
      console.warn(`Screenshot not found: ${screenshotPath}`);
      drawPlaceholder(ctx, width, height);
    }
  }

  const buffer = canvas.toBuffer('image/png');
  return buffer;
}

/**
 * Draw placeholder when screenshot is missing
 */
function drawPlaceholder(ctx, width, height) {
  const placeholderWidth = width * 0.6;
  const placeholderHeight = height * 0.5;
  const x = (width - placeholderWidth) / 2;
  const y = DESIGN.layout.frameY;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);

  ctx.beginPath();
  ctx.roundRect(x, y, placeholderWidth, placeholderHeight, 40);
  ctx.fill();
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Screenshot Missing', width / 2, y + placeholderHeight / 2);
  ctx.font = '20px sans-serif';
  ctx.fillText('Run: npm run screenshots:capture', width / 2, y + placeholderHeight / 2 + 40);
}

/**
 * Get screens for a specific market/language
 */
function getScreensForMarket(lang) {
  const market = config.markets[lang];
  if (!market) {
    console.error(`Unknown market: ${lang}. Available: ${Object.keys(config.markets).join(', ')}`);
    process.exit(1);
  }
  return market.screens;
}

/**
 * Main generation function
 */
async function main() {
  program
    .option('-l, --lang <lang>', 'Generate for specific language (ja, en, ko)')
    .option('-s, --screen <id>', 'Generate specific screen only')
    .option('--size <size>', 'Output size (iphone-6.7, iphone-6.5, iphone-5.5)', 'iphone-6.7')
    .parse(process.argv);

  const options = program.opts();

  registerFonts();

  const languages = options.lang ? [options.lang] : ['ja', 'en'];

  const outputSize = OUTPUT_SIZES[options.size];
  if (!outputSize) {
    console.error(`Invalid size: ${options.size}. Valid options: ${Object.keys(OUTPUT_SIZES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📸 Generating App Store Screenshots`);
  console.log(`   Languages: ${languages.join(', ')}`);
  console.log(`   Size: ${options.size} (${outputSize.width}x${outputSize.height})\n`);

  let generated = 0;
  let skipped = 0;

  for (const lang of languages) {
    const langDir = path.join(PATHS.output, lang);

    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    // Get market-specific screens
    let screens = getScreensForMarket(lang);

    // Filter by screen id if specified
    if (options.screen) {
      screens = screens.filter((s) => s.id === options.screen);
      if (screens.length === 0) {
        console.error(`No screen "${options.screen}" found for market: ${lang}`);
        continue;
      }
    }

    console.log(`   [${lang}] ${screens.length} screens: ${screens.map((s) => s.id).join(' → ')}`);

    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      const orderNum = String(i + 1).padStart(2, '0');
      const outputPath = path.join(langDir, `${orderNum}_${screen.id}.png`);

      try {
        const buffer = await generateMarketingImage(screen, lang, outputSize);

        await sharp(buffer)
          .png({ quality: 90, compressionLevel: 9 })
          .toFile(outputPath);

        console.log(`   ✅ ${lang}/${orderNum}_${screen.id}.png`);
        generated++;
      } catch (error) {
        console.error(`   ❌ ${lang}/${orderNum}_${screen.id}.png - ${error.message}`);
        skipped++;
      }
    }
  }

  console.log(`\n📊 Summary: ${generated} generated, ${skipped} skipped`);
  console.log(`📁 Output: ${PATHS.output}\n`);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
