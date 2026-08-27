# Verification results

## Automated checks

| Check | Result | Notes |
|---|---|---|
| `pnpm check` | Passed | TypeScript completed with no errors |
| `pnpm test` | Passed | 5 files, 20 tests passed; 2 external integration checks are skipped unless explicitly enabled/configured |
| `pnpm build` | Passed | Vite client and Express bundle built successfully |
| Legacy-runtime scan | Passed for active frontend | No `localStorage`, `sessionStorage`, `AppStore`, `mockData`, `seedData`, or `INITIAL_*` in the active frontend/runtime files; the managed scaffold SDK contains only an old explanatory comment |
| Desktop visual check | Passed | `/`, `/recruitment`, `/verify`, `/dashboard` at 1280×720 |
| Mobile visual check | Passed | `/events`, `/committees`, `/certificate-access`, `/reset-password` at 390×844 |

## External verification still required

The target Supabase schema is authored in `supabase/20260827_aliens_space_core.sql` but cannot be treated as applied until it is run in the target Supabase SQL Editor. The preview currently demonstrates the deliberate empty-state behavior when PostgREST reports that those tables are not yet present.

Real Auth confirmation/reset redirect settings, private Storage policy behavior, access-code race tests, registration capacity tests, attendance/certificate issuance, guest claim, RLS cross-scope tests, and WhatsApp provider delivery must be exercised after the migration is applied with dedicated non-production accounts and approved provider credentials. The optional REST and WhatsApp integration tests are skipped by default; they can be enabled with `RUN_SUPABASE_INTEGRATION=1` and configured WhatsApp secrets. These are explicitly listed as unverified rather than represented as passing.
