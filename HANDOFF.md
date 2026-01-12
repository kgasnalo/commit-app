# Handoff: Session 2026-01-10

## Current Goal
**Phase 4.8 Activity Matrix (Daily Habit HUD) - COMPLETED**

Duolingoスタイルのストリーク表示をDashboardに統合:
- 🔥 ストリーク数バッジ（タップでプロフィールへ遷移）
- ActivityMatrixはProfileScreenに集約（詳細表示用）
- 設計判断: 海外アプリのベストプラクティスに準拠

---

## Current Critical Status

### REQUIRES APP REBUILD (Native Modules)
`expo-camera`, `expo-notifications`, `expo-keep-awake`, `expo-live-activity` are native modules and **do not work in Expo Go**:

```bash
./run-ios-manual.sh    # Preferred
```

### Placeholder URLs to Replace (Phase 7)
- `https://commit-app.vercel.app/billing` - Payment management
- `https://commit-app.vercel.app/terms` - Terms of Service
- `https://commit-app.vercel.app/privacy` - Privacy Policy

---

## What Didn't Work (Lessons Learned)

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| `Animated.SharedValue` type error | Namespace doesn't export | Import `SharedValue` directly |
| Screen props type incompatibility | TypeScript strict typing | Use `{ route, navigation }: any` |
| `uuid_generate_v4()` not found | Extension not enabled | Use `gen_random_uuid()` |
| `colors.primary` error | Theme uses nested structure | Use `colors.accent.primary` |
| `i18n.language` not found | I18n type issue | Use `useLanguage()` hook |
| ActivityMatrix重複 | Dashboard + Profile両方に配置 | Duolingoパターン採用（Dashboard=ストリーク数のみ） |

---

## Completed This Session

| Task | Status |
|------|--------|
| Streak badge (Duolingo-style) | Done |
| Dashboard simplification | Done |
| ActivityMatrix soft-light upgrade | Done |
| i18n keys (streak_days) | Done |

### Design Decision
海外アプリ事例（GitHub, Duolingo, Strava）を参考:
- **Dashboard** = アクションの場、最小限の情報（ストリーク数のみ）
- **Profile** = 振り返りの場、詳細分析（ActivityMatrix, Reader Type等）

---

## Immediate Next Steps

1. **Phase 4.5 Advanced Animation Polish** (if needed based on beta feedback)
2. **Phase 4.7 The Hall of Fame** - Netflix-style Library
3. **Phase 7: Web Portal** (Critical for App Store compliance)

---

## Key File Locations

| Feature | Files |
|---------|-------|
| Dashboard | `src/screens/DashboardScreen.tsx` |
| Profile + Reading DNA | `src/screens/ProfileScreen.tsx`, `src/components/reading-dna/` |
| Activity Matrix | `src/components/titan/ActivityMatrix.tsx` |
| Monk Mode | `src/screens/monkmode/`, `src/lib/MonkModeService.ts` |
| Settings | `src/screens/SettingsScreen.tsx` |

## Supabase
- **Project Ref:** `rnksvjjcsnwlquaynduu`
