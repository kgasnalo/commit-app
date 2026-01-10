# Handoff: Session 2026-01-10

## Current Goal
**Phase 4.4 Lock Screen Live Activity - COMPLETED**

iOS Lock Screen / Dynamic Island にMonk Modeタイマーを表示する機能:
1. `expo-live-activity` パッケージを使用
2. タイマー開始時にLive Activity開始
3. 毎秒の残り時間更新
4. 一時停止/再開状態の反映
5. 完了/キャンセル時に終了
6. iOS 16.2未満およびAndroidでのgraceful degradation

**Previous: Phase 4.3 "Monk Mode" Deep Reading Timer - COMPLETED**

---

## Current Critical Status

### REQUIRES APP REBUILD (Native Modules)
`expo-camera`, `expo-notifications`, `expo-keep-awake`, `expo-live-activity` are native modules and **do not work in Expo Go**. You must rebuild the development client:

```bash
# iOS (Preferred)
./run-ios-manual.sh

# Or standard
npx expo run:ios
npx expo run:android
```

### Placeholder URLs to Replace
The following URLs in `SettingsScreen.tsx` need real destinations:
- `https://commit-app.vercel.app/billing` - Payment management
- `https://commit-app.vercel.app/terms` - Terms of Service
- `https://commit-app.vercel.app/privacy` - Privacy Policy
- `mailto:support@commit-app.com` - Support email

---

## What Didn't Work (Lessons Learned)

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| `Animated.SharedValue` type error | Namespace doesn't export SharedValue | Import `SharedValue` directly from `react-native-reanimated` |
| Screen props type incompatibility | TypeScript strict typing vs React Navigation | Use `{ route, navigation }: any` pattern |
| `uuid_generate_v4()` not found | PostgreSQL extension not enabled | Changed to `gen_random_uuid()` (built-in) |
| Migration history mismatch | Remote versions not in local | Run `supabase migration repair --status reverted <version>` |
| `colors.primary` TypeScript error | Theme uses nested structure | Use `colors.accent.primary` not `colors.primary` |
| `i18n.language` not found | I18n type doesn't expose language | Use `useLanguage()` hook from LanguageContext |
| Live Activity icons warning | Directory not created | Icons are optional, can add later to `assets/liveActivity/` |

---

## Completed This Session

| Task | Status | Notes |
|------|--------|-------|
| Install expo-live-activity | Done | `npx expo install expo-live-activity` |
| app.json plugin config | Done | Auto-added by expo install |
| LiveActivityService.ts | Done | Singleton with iOS-only conditional import |
| i18n keys (ja/en/ko) | Done | 5 new keys for Live Activity text |
| useMonkModeTimer hook integration | Done | All timer events call LiveActivityService |
| Prebuild | Done | Generated LiveActivity.appex |
| iOS Build | Succeeded | App launches with Live Activity extension |
| TypeCheck | Passed | (Supabase Deno files excluded) |

### Files Created (1 file)
| File | Purpose |
|------|---------|
| `src/lib/LiveActivityService.ts` | iOS Live Activity management singleton |

### Files Modified (4 files)
| File | Changes |
|------|---------|
| `src/hooks/useMonkModeTimer.ts` | Added LiveActivityService integration |
| `src/i18n/locales/ja.json` | Added Live Activity i18n keys |
| `src/i18n/locales/en.json` | Added Live Activity i18n keys |
| `src/i18n/locales/ko.json` | Added Live Activity i18n keys |

---

## Immediate Next Steps

1. **Test Live Activity Feature** (requires iOS 16.2+ device):
   - Open app → Navigate to "Focus" tab
   - Start timer
   - Lock device → Verify timer appears on Lock Screen
   - Test Dynamic Island on iPhone 14 Pro+
   - Pause/Resume → Verify "Paused" state shown
   - Complete timer → Verify "Session Complete!" shown
   - Cancel timer → Verify Live Activity dismissed

2. **Optional: Add Live Activity Icons**:
   - Create `assets/liveActivity/` folder
   - Add `book_icon.png` and `timer_icon.png` (40x40, @2x, @3x)
   - Run `npx expo prebuild --clean` and rebuild

3. **Phase 7: Web Portal**:
   - Next.js app on Vercel for payment management
   - Replace placeholder URLs in SettingsScreen

---

## Supabase Project Info
- **Project Ref:** `rnksvjjcsnwlquaynduu`
- **Functions Dashboard:** https://supabase.com/dashboard/project/rnksvjjcsnwlquaynduu/functions

## Key File Locations
| Feature | Files |
|---------|-------|
| **Live Activity** | `src/lib/LiveActivityService.ts` |
| **Monk Mode** | `src/screens/monkmode/`, `src/components/monkmode/`, `src/lib/MonkModeService.ts`, `src/hooks/useMonkModeTimer.ts` |
| **Smart Notifications** | `src/lib/NotificationService.ts`, `src/screens/NotificationSettingsScreen.tsx` |
| **Commitment Receipt** | `src/components/receipt/CommitmentReceipt.tsx`, `src/components/receipt/ReceiptPreviewModal.tsx` |
| Profile | `src/screens/ProfileScreen.tsx` |
| Settings | `src/screens/SettingsScreen.tsx` |
| Account Deletion | `supabase/functions/delete-account/index.ts` |
| Barcode Scanner | `src/components/BarcodeScannerModal.tsx` |
| ISBN Lookup | `supabase/functions/isbn-lookup/index.ts` |
| Theme Colors | `src/theme/colors.ts` |
