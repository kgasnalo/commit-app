# Handoff: Session 2026-01-13

## Current Goal
**Phase 8: Reliability & Ops + Technical Debt Cleanup**

Phase 8.1 Sentry ✅, Phase 8.2 CI/CD ✅ 完了。
技術的負債 Batch 1-3 完了（8項目解決）。次は Phase 8.3 Product Analytics または追加の技術的負債修正へ。

---

## Current Critical Status

### Technical Debt Cleanup ✅ Batch 1-3 COMPLETE

**Batch 1 (Critical/Money):**
| ID | Item | Status |
|----|------|--------|
| H.1 | React 19 JSX Runtime (`babel.config.js`) | ✅ |
| S.4 | Stripe Idempotency Key (二重課金防止) | ✅ |
| H.3 | Hardcoded i18n defaultValue | ✅ |

**Batch 2 (Compliance):**
| ID | Item | Status |
|----|------|--------|
| C.1 | Permission Strings (Japanese) | ✅ |
| C.3 | In-App Legal View (`expo-web-browser`) | ✅ |
| P.5 | Dark Theme (`userInterfaceStyle`) | ✅ |

**Batch 3 (Code Quality):**
| ID | Item | Status |
|----|------|--------|
| D.2 | Console Log Cleanup | ✅ |
| D.7 | File Naming (`hall-of-fame`) | ✅ |

### Phase 8.2: CI/CD Pipeline ✅ COMPLETE

**GitHub Actions Workflow** (`.github/workflows/ci-cd.yml`):
| Job | Trigger | Duration | Status |
|-----|---------|----------|--------|
| Quality Check | All pushes/PRs | ~27s | ✅ TypeScript check |
| Deploy Edge Functions | Push to main only | ~27s | ✅ 7 functions deployed |

**Deployed Edge Functions** (Auto-deploy on push to main):
| Function | Purpose |
|----------|---------|
| `admin-actions` | Admin dashboard operations |
| `create-commitment` | Commitment creation with validation |
| `delete-account` | Apple-required account deletion |
| `isbn-lookup` | Barcode scanning |
| `process-expired-commitments` | The Reaper (with idempotencyKey) |
| `send-push-notification` | System push notifications |
| `use-lifeline` | Emergency freeze |

### Phase 8.1: Sentry Integration ✅ COMPLETE

**Coverage**: Mobile App, Web Portal, All 7 Edge Functions
**Sampling Rate**: 10% (`tracesSampleRate: 0.1`)
**Business Events**: `logBusinessEvent()` for critical actions

---

## What Didn't Work (Lessons Learned)

### 1. sed で console.log 一括削除は危険
**Symptom**: TypeScript構文エラー（`Declaration or statement expected`）
**Cause**: `sed '/console\.log/d'` が try-catch 内のログを削除すると、残った文字列リテラルが壊れたコードになる
```typescript
// Before sed (valid):
console.log('[Service] Starting:', { data });
return result;

// After sed (BROKEN):
        '[Service] Starting:', { data });  // ← 残骸
return result;
```
**Solution**: 一括削除後に必ず `npx tsc --noEmit` で確認し、壊れたファイルを手動修正

### 2. Supabase CLI `--all` Flag Does NOT Exist
```bash
# BAD - Will fail with "unknown flag: --all"
supabase functions deploy --all

# GOOD - Deploy each function individually
for func in admin-actions create-commitment ...; do
  supabase functions deploy $func
done
```

### 3. Maestro iOS Driver Timeout
**Symptom**: `iOS driver not ready in time` even with simulator running
**Solution**:
```bash
pkill -f maestro; pkill -f XCTestRunner
MAESTRO_DRIVER_STARTUP_TIMEOUT=180000 ~/.maestro/bin/maestro test .maestro/smoke_test.yaml
```

### 4. GitHub CLI Not in PATH
**Solution**: Use full path `/opt/homebrew/bin/gh` or add to PATH

---

## Immediate Next Steps

### Option A: Phase 8.3-8.5 (Ops)
- **8.3** Product Analytics (PostHog/Mixpanel)
- **8.4** Remote Config & Force Update
- **8.5** Maintenance Mode

### Option B: Continue Technical Debt (Remaining Items)
- **W.1** Type Safety Enforcement (`any` → strict types)
- **D.5** God Component Refactoring (CreateCommitmentScreen)
- **P.2** Image Caching (`expo-image`)
- **C.2** Offline Handling (`NetInfo`)

---

## Key File Locations

### Technical Debt Fixes (This Session)
| File | Change |
|------|--------|
| `babel.config.js` | `jsxRuntime: 'automatic'` |
| `supabase/functions/process-expired-commitments/index.ts` | `idempotencyKey` |
| `src/screens/VerificationScreen.tsx` | Remove `defaultValue` |
| `src/screens/SettingsScreen.tsx` | `expo-web-browser` |
| `app.json` | Dark theme + Japanese permissions |
| `src/components/hall-of-fame/` | Renamed from `halloffame` |

### CI/CD Pipeline
| File | Purpose |
|------|---------|
| `.github/workflows/ci-cd.yml` | GitHub Actions workflow |
| `.maestro/smoke_test.yaml` | Local smoke test |

### Sentry Integration
| Platform | Files |
|----------|-------|
| Mobile | `App.js`, `src/utils/errorLogger.ts`, `src/lib/MetricsService.ts` |
| Web | `sentry.*.config.ts`, `src/app/global-error.tsx` |
| Edge | `supabase/functions/_shared/sentry.ts` |

---

## Git Status
- Branch: `main`
- Latest commit: `23e08993` - fix: batch 2-3 technical debt cleanup
- CI/CD: ✅ All workflows passing
