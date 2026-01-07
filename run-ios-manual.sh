#!/bin/bash
set -e

DEVICE_NAME="iPhone 17 Pro"

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
