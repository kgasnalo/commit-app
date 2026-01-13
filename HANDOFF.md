# Handoff: Session 2026-01-13

## Current Goal
**Phase 8: Reliability & Ops**

Phase 8.1 Sentry Integration 完了。Phase 8.2 CI/CD Pipeline 完了。次は Phase 8.3 Product Analytics へ。

---

## Current Critical Status

### Phase 8.2: CI/CD Pipeline ✅ COMPLETE

**GitHub Actions Workflow** (`.github/workflows/ci-cd.yml`):
| Job | Trigger | Duration | Status |
|-----|---------|----------|--------|
| Quality Check | All pushes/PRs | ~27s | ✅ TypeScript check |
| Deploy Edge Functions | Push to main only | ~27s | ✅ 7 functions deployed |

**Deployed Edge Functions** (Auto-deploy on push to main):
| Function | Size | Purpose |
|----------|------|---------|
| `admin-actions` | 174.9kB | Admin dashboard operations |
| `create-commitment` | 142.4kB | Commitment creation with validation |
| `delete-account` | 139.2kB | Apple-required account deletion |
| `isbn-lookup` | 93.25kB | Barcode scanning |
| `process-expired-commitments` | 183.3kB | The Reaper |
| `send-push-notification` | 142.2kB | System push notifications |
| `use-lifeline` | 140.1kB | Emergency freeze |

**Maestro Smoke Test** (`.maestro/smoke_test.yaml`):
- ✅ App launches successfully on iOS Simulator
- ✅ "COMMIT" text visible on Welcome screen
- Run locally: `MAESTRO_DRIVER_STARTUP_TIMEOUT=180000 ~/.maestro/bin/maestro test .maestro/smoke_test.yaml`

**GitHub Secrets Required**:
| Secret | Purpose |
|--------|---------|
| `SUPABASE_PROJECT_ID` | Remote project reference ID |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI authentication |

### Phase 8.1: Sentry Integration ✅ COMPLETE

**Coverage**: Mobile App, Web Portal, All 7 Edge Functions
**Sampling Rate**: 10% (`tracesSampleRate: 0.1`)
**Business Events**: `logBusinessEvent()` for critical actions

---

## What Didn't Work (Lessons Learned)

### 1. Supabase CLI `--all` Flag Does NOT Exist
```bash
# BAD - Will fail with "unknown flag: --all"
supabase functions deploy --all

# GOOD - Deploy each function individually
for func in admin-actions create-commitment ...; do
  supabase functions deploy $func
done
```

### 2. Maestro iOS Driver Timeout
**Symptom**: `iOS driver not ready in time` even with simulator running
**Solution**:
```bash
# Kill stale processes first
pkill -f maestro; pkill -f XCTestRunner

# Run with extended timeout
MAESTRO_DRIVER_STARTUP_TIMEOUT=180000 ~/.maestro/bin/maestro test .maestro/smoke_test.yaml
```

### 3. GitHub CLI Not in PATH
**Solution**: Use full path `/opt/homebrew/bin/gh` or add to PATH

---

## Immediate Next Steps: Phase 8.3-8.5

### 8.3 Product Analytics (PostHog/Mixpanel) ← NEXT
- Track: Commitment Created, Completed, Defaulted
- Dashboard: Completion Rate, Churn

### 8.4 Remote Config & Force Update
- Check `min_required_version` on app launch
- Block old versions with update modal

### 8.5 Maintenance Mode
- Global "Under Maintenance" switch
- Graceful offline for DB migrations

---

## Key File Locations

### CI/CD Pipeline
| File | Purpose |
|------|---------|
| `.github/workflows/ci-cd.yml` | GitHub Actions workflow |
| `.maestro/smoke_test.yaml` | Local smoke test |
| `package.json` | `typecheck` script |

### Sentry Integration
| Platform | Files |
|----------|-------|
| Mobile | `App.js`, `src/utils/errorLogger.ts`, `src/lib/MetricsService.ts` |
| Web | `sentry.*.config.ts`, `src/app/global-error.tsx` |
| Edge | `supabase/functions/_shared/sentry.ts` |

---

## Environment Setup

### GitHub Secrets (Already Configured)
```
SUPABASE_PROJECT_ID=<your-project-ref>
SUPABASE_ACCESS_TOKEN=<your-access-token>
```

### Supabase Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set CRON_SECRET=your-cron-secret
supabase secrets set GOOGLE_BOOKS_API_KEY=xxx
supabase secrets set ADMIN_EMAILS=your-email@example.com
supabase secrets set SENTRY_DSN_EDGE=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Git Status
- Branch: `main`
- Latest commit: `0ecdb3ef` - docs: update ROADMAP with detailed code quality findings
- CI/CD: ✅ All workflows passing
