#!/bin/bash
set -e

DEVICE_NAME="iPhone 17 Pro"

# Patch .xcode.env.local to source .env (prebuild overwrites this file)
XCODE_ENV_LOCAL="ios/.xcode.env.local"
if [ -f "$XCODE_ENV_LOCAL" ] && ! grep -q 'source.*\.env' "$XCODE_ENV_LOCAL"; then
  cat >> "$XCODE_ENV_LOCAL" << 'PATCH'

# Load .env for Xcode direct builds (EAS uses eas.json env instead)
if [ -f "$PROJECT_DIR/../../.env" ]; then
  set -a
  source "$PROJECT_DIR/../../.env"
  set +a
fi
PATCH
  echo "✅ Patched $XCODE_ENV_LOCAL with .env loader"
fi

echo "Building for $DEVICE_NAME..."
xcodebuild -workspace ios/COMMIT.xcworkspace \
  -scheme COMMIT \
  -configuration Debug \
  -destination "platform=iOS Simulator,name=$DEVICE_NAME" \
  -derivedDataPath build

echo "Installing on simulator..."
xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/COMMIT.app

echo "Launching app..."
xcrun simctl launch booted com.kgxxx.commitapp

echo "✅ App launched! Ensure 'npx expo start' is running in another terminal."
