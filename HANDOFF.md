# Handoff: Session 2026-01-14

## Current Goal
**Batch A+B Pre-Launch Fixes Complete**

Phase 8完了後の最終ポリッシュ。Batch A (UX/Security) と Batch B (Timezone/i18n) 完了。
次は残りのポリッシュタスクまたは EAS Build へ。

---

## Current Critical Status

### Batch A: UX & Security ✅ COMPLETE

| Task | Description | Status |
|------|-------------|--------|
| P.1 | KeyboardAvoidingView (CreateCommitment, Verification) | ✅ |
| S.7 | Upload Security (5MB file size limit) | ✅ |
| C.2 | Offline Handling (NetInfo + OfflineBanner) | ✅ |

**New Files Created:**
- `src/contexts/OfflineContext.tsx` - Network status context
- `src/components/OfflineBanner.tsx` - Animated offline indicator

### Batch B: Timezone & i18n ✅ COMPLETE

| Task | Description | Status |
|------|-------------|--------|
| S.5 | DateUtils.ts (UTC-first date handling) | ✅ |
| W.2 | Hardcoded colors → theme (tag.purple, tag.pink) | ✅ |
| W.4/P.3 | alert() → Alert.alert() fix | ✅ |

**New Files Created:**
- `src/lib/DateUtils.ts` - UTC date utilities

**Key Refactoring:**
- `MonkModeService.ts`: Uses `getNowUTC()`, `getTodayUTC()`, `getYesterdayUTC()`
- `commitmentHelpers.ts`: Uses `getNowDate()` for deadline calculation
- `BookDetailScreen.tsx`: Uses `colors.tag.purple/pink` from titan.ts

---

## Immediate Next Steps

### Option A: Continue Polish (Recommended)
Remaining tasks from ROADMAP.md:
- **P.2** Image Caching (`expo-image` replacement)
- **S.6** Edge Function Stripe SDK version unification
- **S.8** Deep Link validation (`Linking.canOpenURL`)

### Option B: EAS Build
直接本番ビルドへ進む:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## What Didn't Work (Lessons Learned)

### 1. Theme Colors Location
- **Problem:** Added `tag.purple/pink` to `colors.ts` but app uses `titanColors` from `titan.ts`
- **Fix:** Theme colors must be added to `src/theme/titan.ts` (exported via `src/theme/index.ts`)

### 2. MonkModeService Raw Date Usage
- **Problem:** Gemini audit found `new Date().toISOString()` on line 100 after initial fix
- **Fix:** Import `getNowUTC` from DateUtils and use for all timestamp creation

### 3. PostHog Type Compatibility
- `Record<string, unknown>` is NOT compatible with PostHog's `JsonType`
- Use `Record<string, JsonType>` where `JsonType = string | number | boolean | null | object | array`

---

## Key File Locations

### Batch A+B Files
| File | Purpose |
|------|---------|
| `src/lib/DateUtils.ts` | UTC-first date utilities |
| `src/contexts/OfflineContext.tsx` | Network status context |
| `src/components/OfflineBanner.tsx` | Offline UI indicator |
| `src/screens/VerificationScreen.tsx` | 5MB limit + KeyboardAvoidingView |
| `src/screens/CreateCommitmentScreen.tsx` | KeyboardAvoidingView |
| `src/lib/MonkModeService.ts` | Refactored to use DateUtils |
| `src/theme/titan.ts` | Added tag.purple, tag.pink |

### Phase 8 Files (Reference)
| File | Purpose |
|------|---------|
| `src/lib/RemoteConfigService.ts` | Force Update / Maintenance Mode |
| `src/contexts/AnalyticsContext.tsx` | PostHog provider |
| `src/lib/ReviewService.ts` | In-App Review (90-day cooldown) |

---

## Git Status
- Branch: `main`
- Latest Commit: `8bfd26bc` - Batch A+B pre-launch fixes
- CI/CD: ✅ All workflows passing
