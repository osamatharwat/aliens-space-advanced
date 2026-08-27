-- ALIENS SPACE 2.0 — current bootstrap/test state -> final canonical database
--
-- SAFETY CONTRACT
-- 1. Run ALIENS_FINAL_DATABASE.sql first in the target Supabase SQL Editor.
-- 2. Run this file second, in a reviewed non-production project first.
-- 3. This file never drops tables, deletes rows, changes auth users, or invents member/application data.
-- 4. Existing bootstrap rows are preserved. Required committee dictionary rows are inserted only when absent.
-- 5. Live Supabase execution is UNVERIFIED until an authorized operator applies both files and records the verification queries.

begin;

create extension if not exists pgcrypto;

-- Normalize an older attendance table name without deleting its rows.
do $$
begin
  if to_regclass('public.attendance') is not null and to_regclass('public.event_attendance') is null then
    alter table public.attendance rename to event_attendance;
  end if;
exception when undefined_table then
  null;
end $$;

-- Ensure the certificate contract exists when the final file is applied to a partially bootstrapped database.
do $$
begin
  alter table public.certificates add column if not exists event_id uuid references public.events(id) on delete restrict;
  alter table public.certificates add column if not exists user_id uuid references public.profiles(id) on delete set null;
  alter table public.certificates add column if not exists certificate_template text;
exception when undefined_table then
  raise exception 'Run ALIENS_FINAL_DATABASE.sql before this migration';
end $$;

-- Complete the certificate columns before backfilling only derivable relationships.
alter table public.certificates add column if not exists status public.certificate_status not null default 'issued';
alter table public.certificates add column if not exists certificate_template text;

-- Canonical Storage transition. Create the final bucket set, but do not delete legacy buckets or objects.
-- Legacy IDs such as profile-avatars, gallery-media, committee-resources, and certificate-files remain preserved for manual review.
insert into storage.buckets(id, name, public)
values
  ('public-assets', 'public-assets', true),
  ('avatars', 'avatars', false),
  ('gallery', 'gallery', true),
  ('private-files', 'private-files', false),
  ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- Backfill only derivable relationships; never overwrite recipient or signatory data.
update public.certificates c
set event_id = r.event_id,
    user_id = r.user_id
from public.event_registrations r
where c.registration_id = r.id
  and (c.event_id is null or c.user_id is null);

-- Required committee dictionary. These are structural bootstrap rows, not members or content.
insert into public.committees(name, slug, short_description, public_description, is_public, is_active, sort_order)
values
  ('Marketing', 'marketing', null, null, false, true, 1),
  ('PR', 'pr', null, null, false, true, 2),
  ('Media', 'media', null, null, false, true, 3),
  ('IR', 'ir', null, null, false, true, 4),
  ('Event Planning', 'event-planning', null, null, false, true, 5),
  ('Secretary', 'secretary', null, null, false, true, 6),
  ('Charity', 'charity', null, null, false, true, 7),
  ('Magic Hand', 'magic-hand', null, null, false, true, 8),
  ('Data Analysis', 'data-analysis', null, null, false, true, 9)
on conflict (slug) do nothing;

-- Explicit legacy/bootstrap inventory for the deployment record.
-- This section is read-only and intentionally does not drop structures or rows.
with known_objects(object_name, object_type, intended_action, rationale) as (
  values
    ('profiles', 'table', 'PRESERVE', 'authoritative profile linked to auth.users'),
    ('user_roles', 'table', 'PRESERVE', 'normalized role authority'),
    ('committees', 'table', 'PRESERVE', 'canonical committee authority'),
    ('committee_memberships', 'table', 'PRESERVE', 'canonical membership/position authority'),
    ('committee_access_codes', 'table', 'PRESERVE', 'hashed code authority'),
    ('access_code_redemptions', 'table', 'PRESERVE', 'redemption history and duplicate protection'),
    ('applications', 'table', 'PRESERVE', 'recruitment authority'),
    ('application_answers', 'table', 'PRESERVE', 'immutable answer snapshots'),
    ('application_reviews', 'table', 'PRESERVE', 'review history'),
    ('application_shifts', 'table', 'PRESERVE', 'shift history'),
    ('ir_evaluator_eligibility', 'table', 'PRESERVE', 'explicit evaluator eligibility'),
    ('ir_assignments', 'table', 'PRESERVE', 'sole active assignment authority'),
    ('evaluations', 'table', 'PRESERVE', 'evaluation authority'),
    ('events', 'table', 'PRESERVE', 'event authority'),
    ('event_registrations', 'table', 'PRESERVE', 'registration authority'),
    ('event_attendance', 'table', 'PRESERVE', 'canonical attendance authority'),
    ('certificates', 'table', 'PRESERVE', 'certificate authority'),
    ('certificate_claims', 'table', 'PRESERVE', 'guest/member claim history'),
    ('committee_tasks', 'table', 'PRESERVE', 'committee task authority'),
    ('committee_resources', 'table', 'PRESERVE', 'committee resource metadata'),
    ('committee_announcements', 'table', 'PRESERVE', 'committee announcement authority'),
    ('notifications', 'table', 'PRESERVE', 'delivery state authority'),
    ('audit_logs', 'table', 'PRESERVE', 'trusted audit authority'),
    ('users', 'table', 'REVIEW/REPLACE', 'legacy or scaffold user authority; auth.users + profiles are canonical'),
    ('memberships', 'table', 'REVIEW/REPLACE', 'legacy membership authority; committee_memberships is canonical'),
    ('attendance', 'table', 'REVIEW/REPLACE', 'legacy name; event_attendance is canonical'),
    ('profile-avatars', 'bucket', 'REVIEW/REPLACE', 'legacy bucket; avatars is canonical'),
    ('gallery-media', 'bucket', 'REVIEW/REPLACE', 'legacy bucket; gallery is canonical'),
    ('committee-resources', 'bucket', 'REVIEW/REPLACE', 'legacy bucket; private-files is canonical'),
    ('certificate-files', 'bucket', 'REVIEW/REPLACE', 'legacy bucket; certificates is canonical'),
    ('localStorage/sessionStorage/AppStore/mock/seed', 'client source', 'OBSOLETE', 'never an operational database authority')
)
select k.object_name, k.object_type, k.intended_action, k.rationale,
       case when k.object_type = 'bucket' then exists (select 1 from storage.buckets b where b.id = k.object_name)
            when k.object_type = 'table' then exists (select 1 from information_schema.tables t where t.table_schema = 'public' and t.table_name = k.object_name)
            else null end as exists_in_target
from known_objects k order by k.object_type, k.object_name;

-- View inventory based on every local SQL/legacy artifact scan.
-- The only locally declared view is public_members. No legacy/bootstrap view declaration was found locally.
with known_views(view_name, intended_action, rationale) as (
  values
    ('public_members', 'PRESERVE', 'public-safe projection of approved profiles and active committee names')
), known_legacy_views(view_name, intended_action, rationale) as (
  values
    ('<none-known-locally>', 'NONE', 'No legacy/bootstrap view declaration was found in the current or legacy artifacts')
)
select v.view_name, v.intended_action, v.rationale,
       exists (select 1 from information_schema.views x where x.table_schema = 'public' and x.table_name = v.view_name) as exists_in_target
from known_views v
union all
select v.view_name, v.intended_action, v.rationale, false
from known_legacy_views v
union all
select x.table_name, 'UNVERIFIED/REVIEW', 'live-only public view not observable from local artifacts; classify after connector access', true
from information_schema.views x
where x.table_schema = 'public' and x.table_name <> 'public_members'
order by 1;

-- Derived profile fields are never authority. Detect them for review without dropping or rewriting them.
with derived_profile_fields(field_name, intended_action) as (
  values
    ('committee', 'REVIEW/REPLACE'), ('committee_key', 'REVIEW/REPLACE'), ('assigned_ir', 'REVIEW/REPLACE'),
    ('role', 'REVIEW/REPLACE'), ('position', 'REVIEW/REPLACE'), ('committee_position', 'REVIEW/REPLACE'),
    ('membership_status', 'REVIEW/REPLACE'), ('is_board_member', 'REVIEW/REPLACE')
)
select d.field_name, d.intended_action,
       exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'profiles' and c.column_name = d.field_name) as exists_on_profiles
from derived_profile_fields d order by d.field_name;

select id, name, public from storage.buckets order by id;

-- Record a non-sensitive migration marker without storing passwords, raw access codes, or provider secrets.
insert into public.audit_logs(actor_id, action, entity_type, metadata)
values (auth.uid(), 'canonical_migration_reviewed', 'database', jsonb_build_object('source', 'ALIENS_DATABASE_MIGRATION.sql', 'destructive_deletes', false));

commit;

-- Post-application verification queries. Run read-only and retain their output with the deployment record.
select table_name from information_schema.tables where table_schema = 'public' order by table_name;
select table_name, row_security from pg_tables where schemaname = 'public' order by table_name;
select c.relname as relation_name, count(i.indexrelid) as index_count from pg_class c left join pg_index i on i.indrelid = c.oid where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','v') group by c.relname order by c.relname;
select name, slug from public.committees order by sort_order, name;
select count(*) as profile_count from public.profiles;
select count(*) as membership_count from public.committee_memberships;
select count(*) as application_count from public.applications;
select count(*) as event_count from public.events;
select count(*) as registration_count from public.event_registrations;
select count(*) as certificate_count from public.certificates;
