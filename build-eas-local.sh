#!/bin/bash
# =============================================================================
# EAS Local Build Script
# =============================================================================
#
# CRITICAL: ローカルビルドでは EAS Secrets が読み込まれない！
# このスクリプトは .env ファイルの環境変数をエクスポートしてからビルドを実行する。
#
# 直接 `eas build --local` を実行すると環境変数が欠落しアプリがクラッシュする。
# 必ずこのスクリプト経由でローカルビルドを実行すること。
#
# Usage:
#   ./build-eas-local.sh                    # Production iOS build (default)
#   ./build-eas-local.sh preview            # Preview iOS build
#   ./build-eas-local.sh production android # Production Android build
#
# =============================================================================

set -e

PROFILE="${1:-production}"
PLATFORM="${2:-ios}"

echo "================================================"
echo "EAS Local Build (with .env export)"
echo "================================================"
echo "Profile: $PROFILE"
echo "Platform: $PLATFORM"
echo "================================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  echo "Please create a .env file with required environment variables."
  echo "See .env.example for reference."
  exit 1
fi

echo "✅ .env file found"
echo ""

# Export all variables from .env
# set -a: Mark all subsequent variables for export
# set +a: Stop marking variables for export
echo "🔐 Exporting environment variables from .env..."
set -a
source .env
set +a

# Required environment variables list
REQUIRED_VARS=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  "EXPO_PUBLIC_GOOGLE_API_KEY"
  "EXPO_PUBLIC_SENTRY_DSN"
  "EXPO_PUBLIC_POSTHOG_API_KEY"
  "EXPO_PUBLIC_POSTHOG_HOST"
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"
)

# Verify all required variables are set
MISSING=0
echo ""
echo "📋 Checking required environment variables:"
echo ""

for VAR in "${REQUIRED_VARS[@]}"; do
  VALUE="${!VAR}"
  if [ -n "$VALUE" ]; then
    # Show first 25 chars only for security
    echo "  ✅ $VAR: ${VALUE:0:25}..."
  else
    echo "  ❌ $VAR: NOT SET"
    MISSING=1
  fi
done

echo ""

if [ $MISSING -eq 1 ]; then
  echo "❌ ERROR: Some required environment variables are missing!"
  echo ""
  echo "Please add the missing variables to your .env file."
  echo "See .env.example for reference."
  exit 1
fi

echo "✅ All required environment variables are set"
echo ""
echo "================================================"
echo "🚀 Starting EAS local build..."
echo "================================================"
echo ""

# Run EAS build
eas build --local --profile "$PROFILE" --platform "$PLATFORM" --non-interactive

BUILD_EXIT_CODE=$?

echo ""
echo "================================================"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo "✅ Build completed successfully!"
  echo ""
  echo "📱 To submit to TestFlight:"
  echo "   eas submit --platform $PLATFORM --path ./build-*.ipa --non-interactive"
else
  echo "❌ Build failed with exit code: $BUILD_EXIT_CODE"
fi

echo "================================================"
exit $BUILD_EXIT_CODE
