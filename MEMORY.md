# ALIENS SPACE — Rebuild Memory

## Reference findings

The legacy project contains a public navigation model centered on Home, Committees, Events, Gallery, Projects, Members, cultural resources, internships, memories, a CV builder, profiles, recruitment, authentication, and an administrative area. Its visual language uses a dark cosmic background, emerald neon as the primary accent, cyan as a secondary glow, translucent glass panels, rounded cards, bilingual Arabic/English copy, and a protective/restricted dashboard state. These ideas are retained as visual and UX references.

## Explicitly excluded from the new runtime

The legacy `AppStore`, browser `localStorage`, `seedData.ts`, `INITIAL_*` collections, mock or demo records, direct client table fallbacks, old role strings, and old Supabase workarounds are not authoritative. The new project is not a migration of the old data layer. Any useful legacy content requires an explicit database content migration or manual entry into the new normalized model.

## Current implementation state

The clean WebDev project has been initialized as a full-stack application with server, database, and user capabilities. Supabase URL, public key, and service-role key are configured as managed environment variables. A lightweight REST connectivity test passes. The starter UI and starter MySQL/Manus-auth model still need to be replaced or isolated before the product can be considered Supabase-only.

## Unverified items

No production content has been seeded. Supabase Auth provider settings, email confirmation behavior, storage bucket policies, deployed Edge Functions, and WhatsApp provider credentials require validation in the user's Supabase project. These must not be represented as complete until tested against real project configuration.
