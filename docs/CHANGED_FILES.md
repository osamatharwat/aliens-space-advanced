# Changed files

| Area | Files | Purpose |
|---|---|---|
| Public experience | `client/src/pages/Home.tsx`, `client/src/pages/PublicCatalogPage.tsx`, `client/src/index.css`, `client/index.html`, `client/src/services/publicContent.ts` | Cosmic public shell, database-backed committees/events/gallery/projects/members/partners/About/PR catalogs, responsive visual system, metadata/fonts |
| Routing and startup | `client/src/App.tsx`, `client/src/main.tsx` | Supabase-facing routes and removal of the old tRPC/sessionStorage browser bootstrap |
| Auth and profile | `client/src/lib/supabase.ts`, `client/src/hooks/useSupabaseAuth.ts`, `client/src/_core/hooks/useAuth.ts`, `client/src/pages/PortalPages.tsx` | Cookie-backed Supabase Auth wrapper, signup/login/logout/reset/update-password, authoritative profile and avatar flow |
| Private portal | `client/src/pages/PortalPages.tsx`, `client/src/services/operations.ts`, `client/src/services/publicContent.ts` | Workspace with members/tasks/resources/activity, access-code redemption, recruitment, dashboard analytics, certificate views, guest claim, public verification, typed CRUD/RPC operation boundary |
| Backend workflow | `server/services/whatsapp.ts` | Server-only queued shift-notification processor with sent/failed/deferred outcomes |
| Database | `supabase/20260827_aliens_space_core.sql` | Canonical schema, constraints, indexes, RLS, storage buckets/policies, governance triggers, secure CRUD/RPCs, IR reassign/evaluation scope, event settings, and shift notification enqueue |
| Database setup | `supabase/README.md` | Exact Supabase application/configuration instructions and verification checklist |
| Documentation | `PLAN.md`, `STRUCTURE.md`, `MEMORY.md`, `docs/ALIENS_SPACE_ARCHITECTURE.md`, `docs/VISUAL_CHECKS.md`, `docs/CHANGED_FILES.md` | Decisions, boundaries, relationship/RLS/RPC/permission matrices, migration plan, visual checks, and changed-file index |
| Tests | `server/supabase.credentials.test.ts`, `server/supabase.security.test.ts`, `server/whatsapp.credentials.test.ts`, `client/src/pages/ScopedModulePage.test.tsx`, `client/src/services/operations.test.ts`, existing auth test | Secret/provider guards, Supabase-only/runtime security regressions, executable scope guards, rendered route-state checks, and createEvent domain parameter/error coverage |
| Tracking | `todo.md` | Feature history and remaining implementation/unverified items |

The scaffold's `server/_core` and Drizzle files remain because they belong to the managed WebDev template. The active browser product does not call the scaffold Manus OAuth/tRPC data path; Supabase is the only data/auth/storage client used by the new feature surface. Removing framework internals would make the managed project less recoverable without changing the authoritative runtime behavior.
