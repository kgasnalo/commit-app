# Handoff: Session 2026-01-14

## Current Goal
**Phase 8: Reliability & Ops + Technical Debt Cleanup**

Phase 8.1 Sentry ✅, Phase 8.2 CI/CD ✅, Phase 8.3 PostHog ✅, Phase 8.4-8.5 Remote Config ✅ 完了。
技術的負債 Batch 1-3 完了（8項目解決）。次は Phase 4.8 Review & Rating または追加の技術的負債修正へ。

---

## Current Critical Status

### Phase 8.4-8.5: Remote Config & Force Update ✅ COMPLETE

**Implementation:**
- PostHog Feature Flags による Kill Switch と Force Update
- `useBlockingStatus()` フックで一元管理
- `expo-application` でネイティブバージョン取得

**Blocking Screens:**
| Screen | Trigger | File |
|--------|---------|------|
| MaintenanceScreen | `maintenance_mode: true` | `src/screens/blocking/MaintenanceScreen.tsx` |
| ForceUpdateScreen | `min_app_version > current` | `src/screens/blocking/ForceUpdateScreen.tsx` |

**Feature Flags (PostHog Dashboard で作成必要):**
| Flag Key | Type | Default | Purpose |
|----------|------|---------|---------|
| `maintenance_mode` | Boolean | `false` | 全ユーザーをメンテナンス画面にブロック |
| `min_app_version` | String | `"1.0.0"` | このバージョン未満はアップデート強制 |

**AppNavigator Integration:**
```typescript
// ブロッキングチェックは最優先（auth/loading より前）
const blockingStatus = useBlockingStatus();
if (blockingStatus.isBlocked) {
  return <BlockingScreen reason={blockingStatus.reason} />;
}
```

### Phase 8.3: PostHog Analytics ✅ COMPLETE

**Tracked Events:**
| Event | Location |
|-------|----------|
| `app_launched` | AppNavigator |
| `commitment_created` | CreateCommitmentScreen |
| `commitment_completed` | VerificationScreen |
| `lifeline_used` | CommitmentDetailScreen |
| `onboarding_completed` | OnboardingScreen13 |
| `user_logged_out`, `account_deleted` | SettingsScreen |
| `book_scanned` | BarcodeScannerModal |
| `monk_mode_session_*` | MonkModeScreen/ActiveScreen |
| `receipt_shared`, `receipt_preview_opened` | ReceiptPreviewModal |

### Technical Debt ✅ Batch 1-3 + 2.5 COMPLETE

| Batch | Items | Status |
|-------|-------|--------|
| 1 (Critical) | JSX Runtime, Stripe Idempotency, i18n | ✅ |
| 2 (Compliance) | Permission Strings, Legal View, Dark Theme | ✅ |
| 2.5 (Localization) | iOS Permission Locales (`app.json` + `locales/`) | ✅ |
| 3 (Code Quality) | Console Cleanup, File Naming | ✅ |

---

## What Didn't Work (Lessons Learned)

### 1. PostHog Type Compatibility
- `Record<string, unknown>` is NOT compatible with PostHog's `JsonType`
- Use `Record<string, JsonType>` where `JsonType = string | number | boolean | null | object | array`
- `autocapture.captureLifecycleEvents` does NOT exist in posthog-react-native types

### 2. Supabase CLI `--all` Flag Does NOT Exist
```bash
# BAD
supabase functions deploy --all

# GOOD
for func in admin-actions create-commitment ...; do
  supabase functions deploy $func
done
```

### 3. sed で console.log 一括削除は危険
- `sed '/console\.log/d'` が try-catch 内のログを削除するとコードが壊れる
- 一括削除後は必ず `npx tsc --noEmit` で確認

---

## Immediate Next Steps

### Option A: Phase 4.8 Review & Rating
- Implement StoreKit In-App Review API
- Trigger after positive moments (commitment completion)

### Option B: Continue Technical Debt
- **W.1** Type Safety Enforcement (`any` → strict types)
- **D.5** God Component Refactoring (CreateCommitmentScreen)
- **P.2** Image Caching (`expo-image`)
- **C.2** Offline Handling (`NetInfo`)

### Required: PostHog Dashboard Setup
1. Create `maintenance_mode` flag (Boolean, default: false)
2. Create `min_app_version` flag (String payload, e.g., "1.0.0")

---

## Key File Locations

### Phase 8.4-8.5 Remote Config
| File | Purpose |
|------|---------|
| `src/lib/RemoteConfigService.ts` | `useBlockingStatus()` hook |
| `src/screens/blocking/MaintenanceScreen.tsx` | Maintenance UI (Titan design) |
| `src/screens/blocking/ForceUpdateScreen.tsx` | Force Update UI with store link |
| `src/navigation/AppNavigator.tsx` | Blocking check integration |

### Phase 8.3 PostHog
| File | Purpose |
|------|---------|
| `src/contexts/AnalyticsContext.tsx` | PostHog provider |
| `src/lib/AnalyticsService.ts` | Centralized tracking |
| `.env` | `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` |

### Localization (Batch 2.5)
| File | Purpose |
|------|---------|
| `locales/ja.json` | Japanese iOS permission strings |
| `locales/en.json` | English iOS permission strings |
| `app.json` → `locales` | Expo localization config |

---

## Git Status
- Branch: `main`
- Latest changes: Phase 8.4-8.5 Remote Config (uncommitted)
- CI/CD: ✅ All workflows passing
