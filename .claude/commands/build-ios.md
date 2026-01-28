---
name: build-ios
description: |
  iOSビルドを実行し、エラーがあれば自動修正して成功させる。
  以下の場合に使用:
  - 動作確認が必要な時
  - ネイティブモジュール追加後
  - リリース前のビルド確認
---

# iOS Build & Auto-fix

## 手順

1. `./run-ios-manual.sh` を実行
2. エラーがあれば原因を分析して修正
3. 成功するまで繰り返す（最大3回）

## よくあるエラーと対処

### Xcodeproj Consistency issue
```bash
rm -rf ios && npx expo prebuild
./run-ios-manual.sh
```

### Native module missing
```bash
npx expo run:ios
```

### Pod install 失敗
```bash
cd ios && pod install --repo-update && cd ..
./run-ios-manual.sh
```

### expo-audio / expo-camera 追加後
```bash
npx expo prebuild
./run-ios-manual.sh
```

## CLAUDE.mdルール

- `npx expo install` でライブラリ追加（バージョン互換性確保）
- ネイティブモジュールはExpo Goでは動作しない
- `expo-image` は `blurRadius` 非対応、blur必要なら `react-native` の Image を使用

## 成功条件

シミュレータでアプリが起動する。
