# ALIENS SPACE — Canonical Structure

## Runtime layers

| Layer | Responsibility | Prohibited behavior |
|---|---|---|
| `client/src/pages` | Public pages, authenticated profile, and scoped operational views | Direct table queries, local operational truth, client-selected authority |
| `client/src/components` | Reusable visual primitives, navigation, dialogs, tables, empty/loading/error states | Hiding security behind UI-only conditions |
| `client/src/lib` | Typed tRPC client, formatting, navigation, display helpers | LocalStorage database or fallback records |
| `server/routers` | Public and protected procedure contracts, input validation, request-level orchestration | Trusting actor, role, committee, signatory, or evaluator IDs from input |
| `server/services` | Domain services for auth/profile, committees, recruitment, IR, events, certificates, notifications, analytics, and audit | Bypassing the canonical Supabase service boundary |
| `server/supabase` | Server-only Supabase clients and RPC/storage wrappers | Exposing service-role keys to the browser |
| `supabase` | Canonical relational schema, functions, triggers, policies, storage definitions, public projections | Broad permissive policies or duplicated legacy tables |

## Domain vocabulary

The authoritative identity chain is `auth.users → profiles → memberships → committee positions/system roles → permissions → scoped dashboard`. A registered user can exist without a membership. A committee `head` or `sub_head` position is a board membership through database logic; arbitrary strings never confer authority. IR evaluator eligibility is separate from IR committee membership.

## Canonical frontend routes

| Route | Audience | Data boundary |
|---|---|---|
| `/` | Guest | Approved public content projections |
| `/about` | Guest | Public content |
| `/committees` | Guest | Committees and approved public member data |
| `/events` | Guest and registered users | Published public events and registration procedures |
| `/gallery` | Guest | Published albums/media references |
| `/projects` | Guest | Published projects and achievements |
| `/recruitment` | Guest and registered users | Enabled question projections and secure application procedure |
| `/verify` | Guest | Public certificate verification RPC only |
| `/profile` | Authenticated user | Own profile and own certificates |
| `/workspace` | Team members | Membership-scoped workspace procedures |
| `/dashboard` | Authorized team users | Role/scope-scoped operational procedures |

## Canonical dashboard modules

Dashboard navigation is computed from server-returned permissions and membership scope. Modules are applications, questions, IR assignments, evaluations, events, registrations, attendance, certificates, committee workspace, tasks, resources, announcements, analytics, notifications, audit history, and exports. Empty result sets remain empty and show a clear state; they never become demo rows.

## Storage structure

| Bucket | Visibility | Reference model |
|---|---|---|
| `profile-avatars` | Private or approved transformed public projection | `profiles.avatar_object_key` |
| `gallery-media` | Public only for published rows | `gallery_media.object_key` |
| `committee-resources` | Private, membership-scoped | `committee_resources.object_key` |
| `certificate-files` | Private, owner/authorized access or secure claim | `certificates.file_object_key` |

Database rows contain object keys and metadata, never file bytes or base64 payloads. Access is via server-authorized signed URLs or public projections where explicitly intended.
