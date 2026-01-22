# Handoff: Session 2026-01-22 (ウィジェット + 職種別推薦)

## Current Goal
**2つの新機能実装: iOSホーム画面ウィジェット + 職種別本推薦「同じ職種の人が読んでる本」**

---

## Current Critical Status

### ✅ Phase A: 職種別推薦 - 完了

| ステップ | 内容 | 結果 |
|---------|------|------|
| 1 | DBマイグレーション | ✅ `job_category` カラム追加、`supabase db push` 完了 |
| 2 | 型定義更新 | ✅ `database.types.ts` + `index.ts` に `JobCategory` 追加 |
| 3 | オンボーディング画面作成 | ✅ `OnboardingScreen1_5_JobCategory.tsx` 新規作成 |
| 4 | 全オンボーディング画面更新 | ✅ `totalSteps: 14→15`, `currentStep` 調整 (12ファイル) |
| 5 | AppNavigator登録 | ✅ `OnboardingJobCategory` 画面登録 |
| 6 | Edge Function作成 | ✅ `job-recommendations` デプロイ完了 |
| 7 | 推薦UIコンポーネント | ✅ `JobRecommendations.tsx` 新規作成 |
| 8 | i18n追加 | ✅ ja/en/ko 全言語に `job_categories.*`, `recommendations.*` 追加 |

### ✅ Phase B: iOSホーム画面ウィジェット - コード完了

| ステップ | 内容 | 結果 |
|---------|------|------|
| 1 | App Groups設定 | ✅ `group.com.kgxxx.commitapp` を両entitlementsに追加 |
| 2 | Swift Widget実装 | ✅ `COMMITWidget.swift` (Small + Medium サイズ) |
| 3 | WidgetBundle登録 | ✅ `LiveActivityWidgetBundle.swift` に追加 |
| 4 | Native Module作成 | ✅ `WidgetModule.swift` + `WidgetModule.m` |
| 5 | TypeScript Service | ✅ `src/lib/WidgetService.ts` |
| 6 | Widget更新トリガー | ✅ `DashboardScreen.tsx` に追加 |

### 🔶 残タスク: iOS ネイティブビルド

Widget機能を有効化するには、iOSの再ビルドが必要:
```bash
npx expo prebuild && ./run-ios-manual.sh
```

**注意:** Apple Developer Portalで `group.com.kgxxx.commitapp` App Groupの作成と、App IDへの関連付けが必要。

---

## What Didn't Work (This Session)

### 1. TypeScript型エラー (修正済み)

**問題:** `JobRecommendations.tsx` で3つの型エラー

```typescript
// ❌ 存在しないプロパティ
typography.fontSize.bodyLarge  // → body
typography.fontSize.small      // → caption

// ❌ expo-image source が null を受け付けない
source={{ uri: ensureHttps(book.cover_url) }}  // → ?? undefined を追加
```

**修正:** 正しいプロパティ名を使用、null coalescing で undefined に変換

---

## Architecture Note

### 職種別推薦データフロー
```
┌─────────────────────────────────────────────────────────────────┐
│  オンボーディング (Screen 1.5)                                   │
│  - 職種選択 → AsyncStorage に一時保存                            │
│  - アカウント作成時に DB の users.job_category に保存             │
├─────────────────────────────────────────────────────────────────┤
│  Edge Function: job-recommendations                              │
│  - 同じ job_category かつ show_in_ranking=true のユーザーを取得  │
│  - 読了した本を集計、上位N件を返却                               │
│  - k-anonymity: 3人未満は推薦非表示                              │
├─────────────────────────────────────────────────────────────────┤
│  UI: JobRecommendations コンポーネント                           │
│  - 横スクロールカード形式                                        │
│  - 職種未設定時は設定促進UI表示                                  │
└─────────────────────────────────────────────────────────────────┘
```

### iOS Widget データフロー
```
┌─────────────────────────────────────────────────────────────────┐
│  React Native App                                                │
│  └─ WidgetService.updateWidget()                                 │
│       └─ NativeModules.WidgetModule.updateWidget()               │
├─────────────────────────────────────────────────────────────────┤
│  Native Module (WidgetModule.swift)                              │
│  └─ UserDefaults(suiteName: "group.com.kgxxx.commitapp")         │
│       └─ JSON encode → widgetData key に保存                     │
│       └─ WidgetCenter.shared.reloadTimelines()                   │
├─────────────────────────────────────────────────────────────────┤
│  WidgetKit (COMMITWidget.swift)                                  │
│  └─ TimelineProvider.getTimeline()                               │
│       └─ UserDefaults.appGroup?.widgetData → decode              │
│       └─ COMMITWidgetEntryView (Small/Medium)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Immediate Next Steps

### 🚀 必須アクション

1. **Apple Developer Portal 設定:**
   - App Groups `group.com.kgxxx.commitapp` を作成
   - App ID に関連付け

2. **iOS ビルド:**
   ```bash
   npx expo prebuild && ./run-ios-manual.sh
   ```

3. **動作確認:**
   - オンボーディングで職種選択画面が表示される
   - 職種スキップ可能
   - ホーム画面でウィジェットを追加できる
   - ウィジェットにコミットメント情報が表示される

---

## Files Changed This Session

### Phase A: 職種別推薦

| ファイル | 変更 |
|----------|------|
| `supabase/migrations/20260122100000_add_job_category.sql` | **新規** |
| `src/types/database.types.ts` | `job_category` カラム追加 |
| `src/types/index.ts` | `JobCategory` 型追加 |
| `src/screens/onboarding/OnboardingScreen1_5_JobCategory.tsx` | **新規** |
| `src/screens/onboarding/OnboardingScreen1_TsundokuCount.tsx` | 遷移先変更 |
| `src/screens/onboarding/OnboardingScreen{2-13}_*.tsx` | `totalSteps`/`currentStep` 更新 |
| `src/navigation/AppNavigator.tsx` | 画面登録追加 |
| `supabase/functions/job-recommendations/index.ts` | **新規** |
| `src/components/JobRecommendations.tsx` | **新規** |
| `src/i18n/locales/ja.json` | i18n追加 |
| `src/i18n/locales/en.json` | i18n追加 |
| `src/i18n/locales/ko.json` | i18n追加 |

### Phase B: iOS Widget

| ファイル | 変更 |
|----------|------|
| `ios/COMMIT/COMMIT.entitlements` | App Groups追加 |
| `ios/LiveActivity/LiveActivity.entitlements` | App Groups追加 |
| `ios/LiveActivity/COMMITWidget.swift` | **新規** |
| `ios/LiveActivity/LiveActivityWidgetBundle.swift` | COMMITWidget登録 |
| `ios/COMMIT/WidgetModule.swift` | **新規** |
| `ios/COMMIT/WidgetModule.m` | **新規** |
| `src/lib/WidgetService.ts` | **新規** |
| `src/screens/DashboardScreen.tsx` | Widget更新トリガー追加 |

---

## Previous Sessions Summary

**ランキング機能実装 (2026-01-21):**
- LeaderboardScreen: 月間/年間タブ、上位100名表示
- Dashboard: ランキングバッジ追加

**PAGE_COUNT_EXCEEDS_BOOK修正 (2026-01-21):**
- Google Books API 不整合問題を解決

**Tesla UI実装 (2026-01-21):**
- Dashboard + MonkMode に ambient glow UI 追加
