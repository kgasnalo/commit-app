#!/usr/bin/env node

/**
 * App Store Marketing Screenshot Generator
 *
 * Combines raw screenshots with device frames and marketing text
 * to create professional App Store screenshots.
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
  // Try to register SF Pro Display (macOS system font)
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

  // Register Hiragino for Japanese text
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
 * Create gradient background
 */
function drawGradientBackground(ctx, width, height) {
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
 * Draw marketing text (headline and subtitle)
 */
function drawMarketingText(ctx, width, headline, subtitle, lang) {
  // Choose appropriate font based on language
  const fontFamily = lang === 'ja'
    ? '"Hiragino Sans", "SF Pro Display", sans-serif'
    : '"SF Pro Display", "Hiragino Sans", sans-serif';

  // Headline
  ctx.font = `bold ${DESIGN.text.headline.size}px ${fontFamily}`;
  ctx.fillStyle = DESIGN.text.headline.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.fillText(headline, width / 2, DESIGN.layout.headlineY);

  // Subtitle
  ctx.font = `${DESIGN.text.subtitle.size}px ${fontFamily}`;
  ctx.fillStyle = DESIGN.text.subtitle.color;
  ctx.shadowBlur = 10;

  ctx.fillText(subtitle, width / 2, DESIGN.layout.subtitleY);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * Draw device frame with screenshot
 */
async function drawDeviceFrame(ctx, width, height, screenshotPath, frameY) {
  // Load screenshot
  let screenshot;
  try {
    screenshot = await loadImage(screenshotPath);
  } catch (e) {
    console.error(`Failed to load screenshot: ${screenshotPath}`);
    throw e;
  }

  // Calculate device frame dimensions (scaled to fit)
  const frameConfig = config.deviceFrames.iphone14ProMax;
  const maxFrameHeight = height - frameY - 80; // Leave padding at bottom
  const maxFrameWidth = width - 80; // Leave padding on sides

  // Calculate scale to fit
  const scaleByHeight = maxFrameHeight / frameConfig.height;
  const scaleByWidth = maxFrameWidth / frameConfig.width;
  const scale = Math.min(scaleByHeight, scaleByWidth, 0.8); // Cap at 80% of original

  const frameWidth = frameConfig.width * scale;
  const frameHeight = frameConfig.height * scale;
  const frameX = (width - frameWidth) / 2;

  // Draw screenshot (with rounded corners to match device)
  const cornerRadius = 60 * scale;
  const screenX = frameX + frameConfig.screenOffset.x * scale;
  const screenY = frameY + frameConfig.screenOffset.y * scale;
  const screenWidth = frameConfig.screenSize.width * scale;
  const screenHeight = frameConfig.screenSize.height * scale;

  // Create rounded rectangle clip path
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(screenX, screenY, screenWidth, screenHeight, cornerRadius);
  ctx.clip();

  // Draw screenshot
  ctx.drawImage(screenshot, screenX, screenY, screenWidth, screenHeight);
  ctx.restore();

  // Draw device frame overlay if exists
  const framePath = path.join(PATHS.deviceFrames, frameConfig.frameFile);
  if (fs.existsSync(framePath)) {
    try {
      const frame = await loadImage(framePath);
      ctx.drawImage(frame, frameX, frameY, frameWidth, frameHeight);
    } catch (e) {
      // Frame file optional, continue without it
      console.warn(`Device frame not found or invalid: ${framePath}`);
    }
  }

  // Draw subtle device bezel effect (if no frame file)
  else {
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

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw gradient background
  drawGradientBackground(ctx, width, height);

  // 2. Draw marketing text
  const headline = screen.headline[lang];
  const subtitle = screen.subtitle[lang];
  drawMarketingText(ctx, width, headline, subtitle, lang);

  // 3. Draw device frame with screenshot
  const screenshotPath = path.join(PATHS.rawScreenshots, `${screen.id}.png`);

  if (fs.existsSync(screenshotPath)) {
    await drawDeviceFrame(ctx, width, height, screenshotPath, DESIGN.layout.frameY);
  } else {
    // Draw placeholder if screenshot doesn't exist
    console.warn(`Screenshot not found: ${screenshotPath}`);
    drawPlaceholder(ctx, width, height);
  }

  // 4. Convert to buffer and save
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

  // Draw placeholder rectangle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);

  ctx.beginPath();
  ctx.roundRect(x, y, placeholderWidth, placeholderHeight, 40);
  ctx.fill();
  ctx.stroke();

  // Draw placeholder text
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
 * Main generation function
 */
async function main() {
  program
    .option('-l, --lang <lang>', 'Generate for specific language (ja, en, ko)')
    .option('-s, --screen <id>', 'Generate specific screen only')
    .option('--size <size>', 'Output size (iphone-6.7, iphone-6.5, iphone-5.5)', 'iphone-6.7')
    .parse(process.argv);

  const options = program.opts();

  // Register fonts
  registerFonts();

  // Determine languages to process
  const languages = options.lang ? [options.lang] : ['ja', 'en', 'ko'];

  // Determine screens to process
  const screens = options.screen
    ? config.screens.filter((s) => s.id === options.screen)
    : config.screens;

  if (screens.length === 0) {
    console.error(`No screens found matching: ${options.screen}`);
    process.exit(1);
  }

  // Get output size
  const outputSize = OUTPUT_SIZES[options.size];
  if (!outputSize) {
    console.error(`Invalid size: ${options.size}. Valid options: ${Object.keys(OUTPUT_SIZES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📸 Generating App Store Screenshots`);
  console.log(`   Languages: ${languages.join(', ')}`);
  console.log(`   Screens: ${screens.length}`);
  console.log(`   Size: ${options.size} (${outputSize.width}x${outputSize.height})\n`);

  let generated = 0;
  let skipped = 0;

  for (const lang of languages) {
    const langDir = path.join(PATHS.output, lang);

    // Ensure output directory exists
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    for (const screen of screens) {
      const outputPath = path.join(langDir, `${screen.id}.png`);

      try {
        const buffer = await generateMarketingImage(screen, lang, outputSize);

        // Use sharp to optimize and save
        await sharp(buffer)
          .png({ quality: 90, compressionLevel: 9 })
          .toFile(outputPath);

        console.log(`   ✅ ${lang}/${screen.id}.png`);
        generated++;
      } catch (error) {
        console.error(`   ❌ ${lang}/${screen.id}.png - ${error.message}`);
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
