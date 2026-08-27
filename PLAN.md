# ALIENS SPACE — Rebuild Plan

## Product decision

ALIENS SPACE will be rebuilt as a database-backed public PR platform and private team operating system. The supplied legacy ZIP is reference material only. Its branding, page inventory, content vocabulary, and useful interaction patterns may inform the new interface, but its local store, seed data, fallback logic, role assumptions, and table design are not part of the new runtime.

## Source of truth

Supabase is the only operational source of truth. The browser reads and mutates data through typed server procedures that call Supabase. Browser storage is not used for authentication, domain records, caches presented as truth, or file bytes. The server owns authorization-sensitive workflows and the database owns relational integrity, RLS, constraints, and atomic RPC behavior.

## Risk slices

| Risk slice | Implementation focus | Verification criterion |
|---|---|---|
| Identity and scope | Supabase Auth session, profile, memberships, system roles, committee positions, permission helpers | Unauthenticated users cannot reach private data; client cannot select a role or committee during activation |
| Database security | Normalized schema, constraints, indexes, RLS, SECURITY DEFINER RPCs using auth.uid() | Unauthorized direct reads/writes fail at the database/RPC boundary |
| Access-code activation | Hashed code verification, expiry, usage limits, unique redemption, atomic membership and audit transaction | Concurrent or repeated redemption cannot create duplicate or unauthorized memberships |
| Recruitment integrity | Question bank, immutable snapshots, scoped reviews, shift history | Historical answers remain unchanged after question edits or deletion |
| Event operations | Registration, capacity, attendance, certificate issuance | Attendance is separate from registration; only authorized actors can mark it or issue certificates |
| Certificate privacy | Server-issued immutable verification code, member/guest claim, public verification projection | Recipient name comes from registration; public verification never exposes private identifiers |
| Committee workspace | Scope-aware tasks, resources, announcements, activity | Committee members cannot read or mutate another committee's workspace |
| External notification | Database notification records and server-side provider boundary | A notification is marked sent only after provider confirmation; secrets never reach the client |
| Public content | Public Supabase views/procedures for approved content | Empty database remains empty; no runtime fallback to legacy or mock content |

## Delivery sequence

1. Establish canonical SQL schema, indexes, functions, storage buckets, RLS policies, audit triggers, and secure RPCs.
2. Connect Supabase Auth and profile workflows, then implement public read services.
3. Implement recruitment, access-code, events, registration, attendance, certificates, and notification records.
4. Implement role-aware dashboard modules and committee workspaces.
5. Replace all starter UI with a polished bilingual-friendly visual system based on the legacy cosmic/neon language.
6. Add unit and integration-oriented tests for authorization invariants and critical state transitions.
7. Run type check, tests, production build, runtime checks, browser verification, and document every unverified external-provider item.

## Verification standard

A feature is not complete because a button renders or TypeScript compiles. It is complete only when the UI calls a service, the service calls a secure procedure, RLS/constraints authorize the operation, the database changes, the client refetches, and the user can see the resulting state. Any workflow requiring a real Supabase project setting, external WhatsApp provider, email confirmation configuration, or production data will be explicitly marked unverified until exercised.
