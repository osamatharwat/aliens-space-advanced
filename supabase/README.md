# Supabase setup for ALIENS SPACE

## Apply the canonical migration

Open the SQL Editor in the Supabase project configured by `VITE_SUPABASE_URL`, paste the complete contents of `20260827_aliens_space_core.sql`, and run it once. This project cannot safely apply an external Supabase migration through the local WebDev database tool; the target Supabase SQL Editor is the authoritative migration surface.

After execution, refresh the API schema cache or wait for PostgREST to refresh. The public pages intentionally show an empty state until the tables exist and authorized content is published. They do not fall back to local or demo records.

## Authentication settings

In Supabase Auth, enable Email provider. Choose whether email confirmation is required for your membership model. Add the deployed origin plus `/reset-password` to the Auth URL configuration. The app uses PKCE, persistent cookie-backed browser sessions, `signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, and `updateUser({ password })`.

The app needs these public frontend values in the managed project secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The server-side notification processor additionally needs `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_API_URL`, and `WHATSAPP_API_TOKEN`; never expose those values to browser code.

## Storage

The migration creates private buckets and storage policies for `profile-avatars`, `gallery-media`, `committee-resources`, and `certificate-files`. The browser uploads only to a user/committee-scoped object key and stores the key in the related table. Private reads use short-lived signed URLs. Do not make certificate or committee-resource buckets public.

## Content import

Review the legacy reference manually, approve the copy/media to migrate, then import only approved records into the canonical tables. The legacy ZIP is not imported automatically and its seed/mock/local-store modules are not runtime dependencies.

## WhatsApp delivery

The shift RPC writes a `committee_shift` notification in `queued` state. A trusted server-side worker can call `processQueuedShiftNotifications()` from `server/services/whatsapp.ts`. It marks `sent` only after a successful provider response and marks `failed` with a bounded error message otherwise. Configure the provider contract and a deployment-safe trigger before enabling delivery; no provider is assumed by this repository.

## Verification checklist

1. Run the migration in the target Supabase SQL Editor.
2. Confirm the `profiles`, `committees`, `events`, `questions`, `public_members`, `public_members`, `certificates`, and storage buckets exist.
3. Create one real Auth user and confirm a profile trigger row is created.
4. Publish one real committee/event/question record through an authorized workflow.
5. Confirm public reads work with the anon key and private reads fail outside the owner/scope.
6. Test signup, confirmation/reset redirect, login, logout, access-code redemption, guest registration, authenticated registration, attendance, certificate issue, and public verification with non-production test accounts.
7. Enable WhatsApp only after provider credentials, delivery status callbacks if supported, and retry/idempotency behavior are verified.
