# Handoff: Session 2026-01-20

## Current Goal
**お知らせ・寄付のプッシュ通知 & バッジ表示 実装完了**

---

## Current Critical Status

### ✅ Completed This Session (2026-01-20)

| Task | Status | Details |
|------|--------|---------|
| **DB Triggers** | ✅ 完了 | announcements/donations → プッシュ通知 |
| **UnreadService** | ✅ 完了 | AsyncStorage + Supabaseで未読管理 |
| **UnreadContext** | ✅ 完了 | Realtime監視付きグローバル状態 |
| **Badge Display** | ✅ 完了 | SettingsTab に未読バッジ表示 |
| **Mark as Read** | ✅ 完了 | 画面表示時に自動クリア |
| **Migration Deploy** | ✅ 完了 | `supabase db push` 成功 |
| **TypeCheck** | ✅ 完了 | エラーなし |

---

## Key Files Created This Session

| File | Purpose |
|------|---------|
| `supabase/migrations/20260120100000_add_push_notification_triggers.sql` | DBトリガー（pg_net経由でEdge Function呼出） |
| `src/lib/UnreadService.ts` | 未読数管理（AsyncStorage + Supabase） |
| `src/contexts/UnreadContext.tsx` | 未読状態Context（Realtime監視付き） |

## Key Files Modified This Session

| File | Changes |
|------|---------|
| `src/navigation/AppNavigator.tsx` | UnreadProvider追加、SettingsTabにバッジ |
| `src/screens/AnnouncementsScreen.tsx` | markAsRead('announcements') 追加 |
| `src/screens/DonationHistoryScreen.tsx` | markAsRead('donations') 追加 |

---

## What Didn't Work (Lessons Learned)

### 1. Admin Dashboard Timezone Issue (PENDING)
**Problem:** 日本時間22:38を「Expires At」に設定したが、07:39と表示される

**Root Cause:**
- Admin Dashboard (commit-app-web) のタイムゾーン処理の問題
- datetime-local入力 → DB保存 → 表示の変換チェーンに問題あり

**Next Step:**
- commit-app-web のAdmin Dashboard日時入力/表示コードを確認
- UTC/JST変換ロジックを修正

### 2. Draft vs Published Confusion
**Clarification:**
- 「Expires At」を設定しただけでは公開されない
- **「Publish」ボタンをクリック** → `published_at`がセット → トリガー発火 → プッシュ通知送信
- Draft状態ではトリガーは発火しない

---

## Architecture Overview

```
[Admin Dashboard] → INSERT/UPDATE → [announcements/donations テーブル]
                                            ↓
                                 [Database Trigger (pg_net)]
                                            ↓
                      [send-push-notification Edge Function]
                                            ↓
                                 [全ユーザーにプッシュ通知]

[Mobile App]
    ├── UnreadContext (Realtime監視)
    │       ↓
    ├── SettingsTab Badge (unreadCounts.total)
    │
    └── AnnouncementsScreen / DonationHistoryScreen
            ↓ (useFocusEffect)
        markAsRead() → AsyncStorage更新 → Badge減少
```

---

## Git Status

**Uncommitted Files:**
```
src/contexts/UnreadContext.tsx (new)
src/lib/UnreadService.ts (new)
src/navigation/AppNavigator.tsx (modified)
src/screens/AnnouncementsScreen.tsx (modified)
src/screens/DonationHistoryScreen.tsx (modified)
supabase/migrations/20260120100000_add_push_notification_triggers.sql (new)
```

---

## Immediate Next Steps

### 🚀 Recommended Actions

1. **Git Commit**: 今回の変更をコミット
   ```bash
   git add .
   git commit -m "feat: add push notifications and badge for announcements/donations"
   ```

2. **Admin Dashboard タイムゾーン修正** (commit-app-web):
   - datetime-local入力のUTC変換を確認
   - 表示時のタイムゾーン処理を確認

3. **動作検証**:
   - Admin Dashboardで「Publish」ボタンをクリック
   - モバイルアプリにプッシュ通知が届くことを確認
   - SettingsTabにバッジが表示されることを確認
   - Announcements/DonationHistory画面を開いてバッジが減ることを確認

4. **Phase 7.9 (Apple IAP)**: ストア申請準備

---

## Testing Checklist

### プッシュ通知テスト
- [ ] Admin Dashboardでお知らせ作成 → 「Publish」クリック
- [ ] モバイルアプリにプッシュ通知が届く
- [ ] Admin Dashboardで寄付投稿を作成
- [ ] モバイルアプリにプッシュ通知が届く

### バッジ表示テスト
- [ ] 新規お知らせ/寄付がある状態でアプリ起動
- [ ] SettingsTab（SYSTEM）にバッジ表示
- [ ] 「運営からのお知らせ」画面を開く → バッジ減少
- [ ] 「寄付履歴」画面を開く → バッジ減少
- [ ] 全て見た後 → バッジ消滅

---

## Critical Architecture Rule

```
┌─────────────────────────────────────────────────────────┐
│                    COMMIT App                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   サブスクリプション              ペナルティ (寄付)      │
│   ┌─────────────────┐          ┌─────────────────┐     │
│   │ Apple IAP       │          │ Stripe          │     │
│   │ Google Play     │          │ (Web Portal)    │     │
│   │ Billing         │          │                 │     │
│   └────────┬────────┘          └────────┬────────┘     │
│            │                            │              │
│            ▼                            ▼              │
│   ストアアプリで解約            カード登録 & 課金       │
│   (設定 > サブスクリプション)    (/billing ページ)      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**絶対にWeb Portalでサブスクリプション解約を実装しないこと！**
