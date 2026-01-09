# Handoff: Session 2026-01-09

## Current Goal
**Phase 1.9 "Hyper Scanner (ISBN Barcode)" - COMPLETED (Pending User Test)**

Users can now scan book barcodes to instantly search for books.

---

## Current Critical Status

### ⚠️ REQUIRES APP REBUILD
`expo-camera` is a native module and **does not work in Expo Go**. You must rebuild the development client:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Or with EAS
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Edge Function Deployed
The `isbn-lookup` Edge Function is deployed with `--no-verify-jwt` flag (no Authorization header required):

```bash
# Test command (no auth header needed)
curl -X POST https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/isbn-lookup \
  -H "Content-Type: application/json" \
  -d '{"isbn":"9784167158057"}'
```

---

## What Didn't Work (Lessons Learned)

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| `Cannot find native module 'ExpoCamera'` | expo-camera requires native code, doesn't work in Expo Go | Must rebuild with `npx expo run:ios/android` |
| Close button (×) not responding | Overlay View blocking touch events to CameraView | Added `pointerEvents="box-none"` to overlay and SafeAreaView, `pointerEvents="auto"` to header |

---

## Completed This Session

| Task | Status | Notes |
|------|--------|-------|
| expo-camera installation | ✅ Done | `npx expo install expo-camera` |
| isbn-lookup Edge Function | ✅ Done | `supabase/functions/isbn-lookup/index.ts` |
| Edge Function deployment | ✅ Done | Deployed with `--no-verify-jwt` |
| ISBN utility functions | ✅ Done | `src/utils/isbn.ts` |
| i18n keys (ja/en/ko) | ✅ Done | `scanner.*` keys added |
| app.json permissions | ✅ Done | expo-camera plugin + Android CAMERA permission |
| BarcodeScannerModal component | ✅ Done | `src/components/BarcodeScannerModal.tsx` |
| CreateCommitmentScreen integration | ✅ Done | Scan button in search bar |
| OnboardingScreen3 integration | ✅ Done | Scan button in search bar |
| Close button touch fix | ✅ Done | pointerEvents pattern applied |

### Files Created
| File | Description |
|------|-------------|
| `supabase/functions/isbn-lookup/index.ts` | Edge Function for ISBN → Google Books lookup |
| `src/utils/isbn.ts` | ISBN validation utilities (EAN-13, ISBN-10) |
| `src/components/BarcodeScannerModal.tsx` | Full-screen barcode scanner modal |

### Files Modified
| File | Change |
|------|--------|
| `app.json` | Added expo-camera plugin + Android CAMERA permission |
| `src/i18n/locales/ja.json` | Added scanner.* i18n keys |
| `src/i18n/locales/en.json` | Added scanner.* i18n keys |
| `src/i18n/locales/ko.json` | Added scanner.* i18n keys |
| `src/screens/CreateCommitmentScreen.tsx` | Added scan button + BarcodeScannerModal |
| `src/screens/onboarding/OnboardingScreen3_BookSelect.tsx` | Added scan button + BarcodeScannerModal |

---

## Immediate Next Steps

1. **Rebuild App & Test Scanner** (User action required):
   - Run `npx expo run:ios` or `npx expo run:android`
   - Open CreateCommitmentScreen
   - Tap barcode icon (📷) next to search bar
   - Grant camera permission
   - Scan a book's ISBN barcode
   - Verify close button (×) works
   - Verify book is auto-selected on successful scan

2. **Resume Phase 3.5:** User Profile & Settings
   - 3.5.1: Create `ProfileScreen.tsx`
   - 3.5.2: Settings navigation & legal links
   - 3.5.3: Account deletion (Apple requirement)

---

## Feature Details

### ISBN Scanner Flow
1. User taps barcode icon next to search bar
2. Camera opens in full-screen modal
3. User points camera at book's ISBN barcode (EAN-13)
4. ISBN detected → Edge Function called → Google Books API lookup
5. On success: Book auto-selected, modal closes, continue to next screen
6. On not found: Options to "Rescan" or "Search Manually"

### Edge Function: isbn-lookup
- **Endpoint**: `POST /functions/v1/isbn-lookup`
- **Request**: `{ "isbn": "9784167158057" }`
- **Response Success**: `{ "success": true, "book": { "id", "title", "authors", "thumbnail" } }`
- **Response Not Found**: `{ "success": false, "error": "BOOK_NOT_FOUND" }`
- **Auth**: None required (--no-verify-jwt)

---

## Critical Context for Future Development

### Supabase Deployment Checklist
When creating database changes or Edge Functions, ALWAYS:
1. Create migration file → `supabase db push`
2. Create Edge Function → `supabase functions deploy <name>`
3. Update `database.types.ts` Insert/Update types
4. Verify with `supabase migration list`

### Navigation Patterns
- **Cross-tab:** `navigate('TabName', { screen: 'ScreenName' })`
- **Cross-stack state:** Use AsyncStorage (route params lost on stack switch)

### i18n Rules
- **NEVER** use `defaultValue` in `i18n.t()`
- **ALWAYS** add keys to ALL 3 locale files (ja, en, ko) simultaneously

### Camera/Scanner Notes
- `expo-camera` requires native rebuild (not Expo Go compatible)
- Supports EAN-13 and EAN-8 barcode types
- Permission request handled in component
- ISBN validation in `src/utils/isbn.ts`
- Use `pointerEvents="box-none"` on overlay containers for proper touch handling

---

## Supabase Project Info
- **Project Ref:** `rnksvjjcsnwlquaynduu`
- **Functions Dashboard:** https://supabase.com/dashboard/project/rnksvjjcsnwlquaynduu/functions
