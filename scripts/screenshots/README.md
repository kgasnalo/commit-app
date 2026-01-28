# App Store Marketing Screenshot Generator

## 概要

3言語（ja/en/ko）× 8画面のマーケティング用スクリーンショットを自動生成するシステム。

## ディレクトリ構成

```
scripts/screenshots/
├── generate.js              # 画像合成スクリプト
├── README.md                # このファイル
└── templates/
    └── marketing-copy.json  # 多言語マーケティング文言

.maestro/screenshots/
├── marketing-flow.yaml      # メインアプリ撮影フロー
└── onboarding-flow.yaml     # オンボーディング撮影フロー

assets/device-frames/
└── iphone-14-pro-max.png    # デバイスフレーム（要配置）

output/
├── raw-screenshots/         # Maestroで撮影した生スクリーンショット
└── app-store-screenshots/   # 最終出力
    ├── ja/
    ├── en/
    └── ko/
```

## セットアップ

### 1. デバイスフレーム取得

iPhone 14 Pro Max のフレーム画像を以下から取得:
- [Facebook Design - Devices](https://design.facebook.com/toolsandresources/devices/)
- [Figma Community - Apple Device Frames](https://www.figma.com/community/file/...)

PNG形式で `assets/device-frames/iphone-14-pro-max.png` に配置。

### 2. Maestro インストール

```bash
# macOS
curl -fsSL https://get.maestro.mobile.dev | bash
```

## 使い方

### Step 1: スクリーンショット撮影

```bash
# シミュレータでアプリを起動（テストユーザーでログイン済み状態）
./run-ios-manual.sh

# メインアプリのスクリーンショット撮影
npm run screenshots:capture

# オンボーディングのスクリーンショット撮影
npm run screenshots:capture:onboarding
```

### Step 2: マーケティング画像生成

```bash
# 全言語生成
npm run screenshots:generate

# 特定言語のみ
npm run screenshots:generate:ja
npm run screenshots:generate:en
npm run screenshots:generate:ko
```

### Step 3: 確認

```bash
open output/app-store-screenshots/ja/
```

## マーケティング文言の変更

`scripts/screenshots/templates/marketing-copy.json` を編集:

```json
{
  "screens": [
    {
      "id": "01_dashboard",
      "headline": {
        "ja": "積ん読を撃退せよ",
        "en": "Crush Your Backlog",
        "ko": "독서 목표를 달성하라"
      },
      "subtitle": {
        "ja": "読書の約束を管理する",
        "en": "Manage Your Reading Commitments",
        "ko": "독서 약속을 관리하세요"
      }
    }
  ]
}
```

## App Store 要件

| デバイス | サイズ | 対応オプション |
|---------|--------|---------------|
| iPhone 6.7" | 1290 x 2796 | `--size iphone-6.7` (デフォルト) |
| iPhone 6.5" | 1284 x 2778 | `--size iphone-6.5` |
| iPhone 5.5" | 1242 x 2208 | `--size iphone-5.5` |

## トラブルシューティング

### Maestroがアプリを見つけられない

```bash
# アプリIDを確認
xcrun simctl list apps | grep commitapp

# 正しいappIdを .maestro/screenshots/*.yaml に設定
```

### フォントが正しく表示されない

macOS のシステムフォント（SF Pro Display, Hiragino Sans）を使用。
カスタムフォントを使用する場合は `generate.js` の `registerFonts()` を修正。

### スクリーンショットが空/欠落

1. `output/raw-screenshots/` にファイルが存在するか確認
2. Maestroフローが正しく動作しているか確認
3. アプリが正しい状態（ログイン済み、データあり）か確認
