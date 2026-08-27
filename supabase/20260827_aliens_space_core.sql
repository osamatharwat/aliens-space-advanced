-- ALIENS SPACE canonical Supabase migration
-- Apply this file in the target Supabase SQL editor after reviewing it with the project owner.
-- The WebDev starter database is intentionally not used as an operational source of truth.

create extension if not exists pgcrypto;

create type public.system_role as enum ('registered_user', 'team_member', 'team_head', 'team_sub_head', 'committee_head', 'committee_sub_head', 'ir_head', 'ir_sub_head', 'ir_evaluator', 'og');
create type public.membership_status as enum ('active', 'pending', 'inactive', 'suspended');
create type public.committee_position as enum ('member', 'head', 'sub_head');
create type public.question_category as enum ('global', 'committee', 'ir');
create type public.application_status as enum ('submitted', 'ir_review', 'head_review', 'approved', 'rejected', 'conflict', 'shifted');
create type public.registration_status as enum ('confirmed', 'cancelled');
create type public.attendance_status as enum ('attended', 'not_attended');
create type public.notification_status as enum ('queued', 'sent', 'failed');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  username text unique,
  email text,
  phone text,
  faculty text,
  academic_level text,
  avatar_object_key text,
  avatar_url text,
  public_position text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.system_role not null,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.permissions (
  key text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role public.system_role not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

create table if not exists public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  public_description text,
  accent text,
  is_public boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.committee_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  committee_id uuid not null references public.committees(id) on delete restrict,
  status public.membership_status not null default 'pending',
  position public.committee_position not null default 'member',
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, committee_id)
);

create table if not exists public.board_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.committee_access_codes (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  code_hash text not null,
  position public.committee_position not null default 'member',
  expires_at timestamptz,
  max_uses integer,
  uses_count integer not null default 0,
  single_use boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (max_uses is null or max_uses > 0),
  check (uses_count >= 0 and (max_uses is null or uses_count <= max_uses))
);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null references public.committee_access_codes(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  committee_id uuid not null references public.committees(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (access_code_id, user_id)
);

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'ALIENS SPACE',
  tagline text,
  certificate_signatory_name text,
  certificate_signatory_title text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  title text,
  body text,
  object_key text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category public.question_category not null,
  committee_id uuid references public.committees(id) on delete restrict,
  prompt text not null,
  help_text text,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((category = 'committee' and committee_id is not null) or (category <> 'committee' and committee_id is null))
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  guest_phone text,
  committee_id uuid references public.committees(id) on delete restrict,
  status public.application_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_email is not null)
);

create table if not exists public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  question_text_snapshot text not null,
  question_category public.question_category not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  stage text not null check (stage in ('ir', 'committee_head', 'leadership')),
  decision public.application_status not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.application_shifts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  old_committee_id uuid references public.committees(id) on delete restrict,
  new_committee_id uuid not null references public.committees(id) on delete restrict,
  reason text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.ir_evaluator_eligibility (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_eligible boolean not null default false,
  max_capacity integer not null default 30 check (max_capacity = 30),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.ir_assignments (
  id uuid primary key default gen_random_uuid(),
  evaluator_id uuid not null references public.profiles(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unique (evaluator_id, member_id, assigned_at)
);

create unique index if not exists one_active_ir_assignment_per_member on public.ir_assignments(member_id) where unassigned_at is null;

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  evaluator_id uuid not null references public.profiles(id) on delete restrict,
  committee_id uuid references public.committees(id) on delete restrict,
  score numeric(5,2) check (score >= 0 and score <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_closes_at timestamptz,
  location text,
  category text,
  committee_id uuid references public.committees(id) on delete set null,
  capacity integer check (capacity is null or capacity > 0),
  is_paid boolean not null default false,
  price numeric(10,2) check (price is null or price >= 0),
  whatsapp_group_url text,
  certificate_enabled boolean not null default false,
  is_published boolean not null default false,
  is_public boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  guest_phone text,
  ticket_code text not null unique default encode(gen_random_bytes(9), 'hex'),
  status public.registration_status not null default 'confirmed',
  registered_at timestamptz not null default now(),
  check (user_id is not null or guest_email is not null)
);

create unique index if not exists one_active_user_registration on public.event_registrations(event_id, user_id) where user_id is not null and status = 'confirmed';
create unique index if not exists one_active_guest_registration on public.event_registrations(event_id, guest_email) where guest_email is not null and status = 'confirmed';

create table if not exists public.attendance (
  registration_id uuid primary key references public.event_registrations(id) on delete cascade,
  status public.attendance_status not null,
  marked_by uuid not null references public.profiles(id) on delete restrict,
  marked_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete restrict,
  recipient_name text not null,
  event_title text not null,
  event_date timestamptz not null,
  signatory_name text not null,
  signatory_title text not null,
  verification_code text not null unique default upper(encode(gen_random_bytes(8), 'hex')),
  file_object_key text,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  issued_at timestamptz not null default now()
);

create table if not exists public.certificate_claims (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  ticket_code_hash text,
  claimed_at timestamptz not null default now(),
  check ((user_id is not null) <> (ticket_code_hash is not null))
);

create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.gallery_albums(id) on delete cascade,
  title text not null,
  caption text,
  object_key text not null,
  object_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  object_key text,
  object_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  object_key text,
  object_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  object_key text,
  object_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.committee_tasks (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  is_completed boolean not null default false,
  due_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.committee_resources (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  title text not null,
  object_key text not null,
  object_url text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.committee_announcements (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  reference_id uuid,
  message text not null,
  status public.notification_status not null default 'queued',
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists committees_public_order_idx on public.committees(is_public, is_active, sort_order);
create index if not exists events_public_start_idx on public.events(is_published, is_public, starts_at);
create index if not exists memberships_committee_status_idx on public.committee_memberships(committee_id, status, position);
create index if not exists applications_scope_idx on public.applications(committee_id, status, submitted_at desc);
create index if not exists audit_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists notifications_status_idx on public.notifications(status, created_at);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), lower(TG_OP), TG_TABLE_NAME, coalesce(new.id, old.id), jsonb_build_object('source', 'database_trigger'));
  return coalesce(new, old);
end; $$;

create or replace function public.sync_profile_from_auth() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  insert into public.user_roles(user_id, role) values (new.id, 'registered_user') on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.sync_profile_from_auth();

drop trigger if exists committee_board_rule on public.committee_memberships;
create or replace function public.enforce_board_rule() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and new.position in ('head', 'sub_head') then
    insert into public.board_memberships(user_id, reason) values (new.user_id, 'active committee head/sub-head position') on conflict (user_id) do update set reason = excluded.reason;
  end if;
  return new;
end; $$;
create trigger committee_board_rule before insert or update on public.committee_memberships for each row execute function public.enforce_board_rule();

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger committees_touch before update on public.committees for each row execute function public.touch_updated_at();
create trigger memberships_touch before update on public.committee_memberships for each row execute function public.touch_updated_at();
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.committee_tasks for each row execute function public.touch_updated_at();

create or replace function public.has_role(p_user uuid, p_role public.system_role) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = coalesce(p_user, auth.uid()) and role = p_role);
$$;

create or replace function public.is_committee_lead(p_user uuid, p_committee uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.committee_memberships where user_id = coalesce(p_user, auth.uid()) and committee_id = p_committee and status = 'active' and position in ('head', 'sub_head'));
$$;

create or replace function public.can_manage_scope(p_committee uuid) returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return public.has_role(auth.uid(), 'og') or public.has_role(auth.uid(), 'team_head') or public.has_role(auth.uid(), 'team_sub_head') or public.is_committee_lead(auth.uid(), p_committee);
end; $$;

create or replace function public.redeem_committee_access_code(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code public.committee_access_codes%rowtype; v_membership public.committee_memberships%rowtype;
begin
  if auth.uid() is null or nullif(trim(p_code), '') is null then raise exception 'access denied'; end if;
  select * into v_code from public.committee_access_codes c where c.is_active and (c.expires_at is null or c.expires_at > now()) and (c.max_uses is null or c.uses_count < c.max_uses) and crypt(trim(p_code), c.code_hash) = c.code_hash for update limit 1;
  if not found then raise exception 'invalid or expired access code'; end if;
  if exists (select 1 from public.access_code_redemptions where access_code_id = v_code.id and user_id = auth.uid()) then raise exception 'access code already redeemed'; end if;
  insert into public.access_code_redemptions(access_code_id, user_id, committee_id) values (v_code.id, auth.uid(), v_code.committee_id);
  update public.committee_access_codes set uses_count = uses_count + 1, is_active = case when single_use or (max_uses is not null and uses_count + 1 >= max_uses) then false else is_active end where id = v_code.id;
  insert into public.committee_memberships(user_id, committee_id, status, position, joined_at) values (auth.uid(), v_code.committee_id, 'active', v_code.position, now()) on conflict (user_id, committee_id) do update set status = 'active', position = excluded.position, joined_at = coalesce(public.committee_memberships.joined_at, excluded.joined_at), updated_at = now() returning * into v_membership;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'redeem', 'committee_access_code', v_code.id, jsonb_build_object('committee_id', v_code.committee_id, 'membership_id', v_membership.id));
  return jsonb_build_object('membership_id', v_membership.id, 'committee_id', v_membership.committee_id, 'position', v_membership.position, 'status', v_membership.status);
exception when unique_violation then raise exception 'access code already redeemed';
end; $$;

create or replace function public.register_event_authenticated(p_event_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.event_registrations(event_id, user_id) select e.id, auth.uid() from public.events e where e.id = p_event_id and e.is_published and e.is_public and (e.registration_closes_at is null or e.registration_closes_at > now()) and (e.capacity is null or (select count(*) from public.event_registrations r where r.event_id = e.id and r.status = 'confirmed') < e.capacity) returning id into v_id;
  if v_id is null then raise exception 'event is unavailable'; end if;
  return v_id;
exception when unique_violation then raise exception 'already registered';
end; $$;

create or replace function public.mark_event_attendance(p_registration_id uuid, p_status public.attendance_status) returns boolean language plpgsql security definer set search_path = public as $$
declare v_event uuid;
begin
  select event_id into v_event from public.event_registrations where id = p_registration_id and status = 'confirmed';
  if v_event is null or not public.can_manage_scope((select committee_id from public.events where id = v_event)) then raise exception 'attendance permission denied'; end if;
  insert into public.attendance(registration_id, status, marked_by) values (p_registration_id, p_status, auth.uid()) on conflict (registration_id) do update set status = excluded.status, marked_by = auth.uid(), marked_at = now();
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'mark_attendance', 'event_registration', p_registration_id, jsonb_build_object('status', p_status));
  return true;
end; $$;

create or replace function public.issue_certificate(p_registration_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare v_certificate uuid; v_event public.events%rowtype; v_registration public.event_registrations%rowtype; v_profile public.profiles%rowtype; v_settings public.site_settings%rowtype;
begin
  if not public.has_role(auth.uid(), 'og') and not public.has_role(auth.uid(), 'team_head') and not public.has_role(auth.uid(), 'team_sub_head') then raise exception 'certificate permission denied'; end if;
  select * into v_registration from public.event_registrations where id = p_registration_id and status = 'confirmed';
  select * into v_event from public.events where id = v_registration.event_id and certificate_enabled;
  if not found or not exists (select 1 from public.attendance where registration_id = p_registration_id and status = 'attended') then raise exception 'certificate eligibility not met'; end if;
  select * into v_profile from public.profiles where id = v_registration.user_id;
  select * into v_settings from public.site_settings where id = true;
  insert into public.certificates(registration_id, recipient_name, event_title, event_date, signatory_name, signatory_title, issued_by) values (p_registration_id, coalesce(v_profile.name, v_registration.guest_name), v_event.title, v_event.starts_at, coalesce(v_settings.certificate_signatory_name, ''), coalesce(v_settings.certificate_signatory_title, ''), auth.uid()) on conflict (registration_id) do update set recipient_name = public.certificates.recipient_name returning id into v_certificate;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id) values (auth.uid(), 'issue', 'certificate', v_certificate);
  return v_certificate;
end; $$;

create or replace function public.verify_certificate_public(p_verification_code text) returns table(valid boolean, recipient_name text, event_title text, event_date date, signatory_name text, signatory_title text) language sql stable security definer set search_path = public as $$
  select true, c.recipient_name, c.event_title, c.event_date::date, c.signatory_name, c.signatory_title from public.certificates c where c.verification_code = upper(trim(p_verification_code));
$$;

create or replace view public.public_members as
select p.id, p.name, p.username, p.avatar_url, p.public_position, c.name as committee_name
from public.profiles p left join public.committee_memberships m on m.user_id = p.id and m.status = 'active' left join public.committees c on c.id = m.committee_id
where p.is_public = true;

-- Public storage buckets. Private buckets are accessed only with server-authorized signed URLs.
insert into storage.buckets(id, name, public) values ('profile-avatars', 'profile-avatars', false), ('gallery-media', 'gallery-media', true), ('committee-resources', 'committee-resources', false), ('certificate-files', 'certificate-files', false) on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.committees enable row level security;
alter table public.committee_memberships enable row level security;
alter table public.committee_access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_content enable row level security;
alter table public.questions enable row level security;
alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_reviews enable row level security;
alter table public.application_shifts enable row level security;
alter table public.ir_evaluator_eligibility enable row level security;
alter table public.ir_assignments enable row level security;
alter table public.evaluations enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.attendance enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_claims enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_media enable row level security;
alter table public.projects enable row level security;
alter table public.achievements enable row level security;
alter table public.partners enable row level security;
alter table public.committee_tasks enable row level security;
alter table public.committee_resources enable row level security;
alter table public.committee_announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy public_committees_read on public.committees for select to anon, authenticated using (is_public = true and is_active = true);
create policy public_events_read on public.events for select to anon, authenticated using (is_published = true and is_public = true);
create policy public_gallery_read on public.gallery_media for select to anon, authenticated using (is_published = true);
create policy public_projects_read on public.projects for select to anon, authenticated using (is_published = true);
create policy public_achievements_read on public.achievements for select to anon, authenticated using (is_published = true);
create policy public_partners_read on public.partners for select to anon, authenticated using (is_published = true);
create policy public_members_read on public.profiles for select to anon, authenticated using (is_public = true);
create policy self_profile_read on public.profiles for select to authenticated using (id = auth.uid());
create policy self_profile_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy self_membership_read on public.committee_memberships for select to authenticated using (user_id = auth.uid() or public.can_manage_scope(committee_id));
create policy self_registration_read on public.event_registrations for select to authenticated using (user_id = auth.uid() or public.can_manage_scope((select committee_id from public.events where id = event_id)));
create policy self_certificate_read on public.certificates for select to authenticated using (exists (select 1 from public.event_registrations r where r.id = registration_id and r.user_id = auth.uid()) or public.has_role(auth.uid(), 'og') or public.has_role(auth.uid(), 'team_head') or public.has_role(auth.uid(), 'team_sub_head'));
create policy own_tasks_read on public.committee_tasks for select to authenticated using (public.can_manage_scope(committee_id) or assigned_to = auth.uid());
create policy own_resources_read on public.committee_resources for select to authenticated using (public.can_manage_scope(committee_id) or exists (select 1 from public.committee_memberships m where m.committee_id = committee_resources.committee_id and m.user_id = auth.uid() and m.status = 'active'));
create policy own_announcements_read on public.committee_announcements for select to authenticated using (public.can_manage_scope(committee_id) or exists (select 1 from public.committee_memberships m where m.committee_id = committee_announcements.committee_id and m.user_id = auth.uid() and m.status = 'active'));

revoke all on public.committee_access_codes from anon, authenticated;
revoke all on public.access_code_redemptions from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.certificates from anon;
revoke all on public.evaluations from anon, authenticated;
revoke all on public.application_answers from anon, authenticated;

grant execute on function public.redeem_committee_access_code(text) to authenticated;
grant execute on function public.register_event_authenticated(uuid) to authenticated;
grant execute on function public.mark_event_attendance(uuid, public.attendance_status) to authenticated;
grant execute on function public.issue_certificate(uuid) to authenticated;
grant execute on function public.verify_certificate_public(text) to anon, authenticated;

-- Public recruitment submission is atomic and snapshots the exact prompts at submission time.
create or replace function public.submit_public_application(
  p_user_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_committee_id uuid,
  p_answers jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_application uuid; v_answer jsonb; v_question public.questions%rowtype;
begin
  if p_user_id is not null and p_user_id <> auth.uid() then raise exception 'user identity mismatch'; end if;
  if p_user_id is null and nullif(trim(coalesce(p_guest_email, '')), '') is null then raise exception 'guest email required'; end if;
  if p_committee_id is null or not exists (select 1 from public.committees where id = p_committee_id and is_active and is_public) then raise exception 'committee unavailable'; end if;
  insert into public.applications(user_id, guest_name, guest_email, guest_phone, committee_id)
  values (case when auth.uid() is not null then auth.uid() else null end, nullif(trim(p_guest_name), ''), nullif(lower(trim(p_guest_email)), ''), nullif(trim(p_guest_phone), ''), p_committee_id)
  returning id into v_application;
  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    select * into v_question from public.questions where id = (v_answer ->> 'question_id')::uuid and is_enabled and (category <> 'committee' or committee_id = p_committee_id);
    if not found then raise exception 'question is not available'; end if;
    insert into public.application_answers(application_id, question_id, question_text_snapshot, question_category, answer)
    values (v_application, v_question.id, v_question.prompt, v_question.category, coalesce(v_answer ->> 'answer', ''));
  end loop;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'submit', 'application', v_application, jsonb_build_object('committee_id', p_committee_id, 'answer_count', jsonb_array_length(coalesce(p_answers, '[]'::jsonb))));
  return v_application;
end; $$;

alter view public.public_members set (security_invoker = true);
grant execute on function public.submit_public_application(uuid, text, text, text, uuid, jsonb) to anon, authenticated;
create policy public_questions_read on public.questions for select to anon, authenticated using (is_enabled = true and (category <> 'committee' or exists (select 1 from public.committees c where c.id = committee_id and c.is_public and c.is_active)));

-- Additional scoped workflows for committee shifts, IR assignments, and guest registrations.
create or replace function public.shift_application(p_application_id uuid, p_new_committee_id uuid, p_reason text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_application public.applications%rowtype; v_old_name text; v_new_name text; v_shift uuid; v_recipient uuid;
begin
  if auth.uid() is null or (not public.has_role(auth.uid(), 'og') and not public.has_role(auth.uid(), 'team_head') and not public.has_role(auth.uid(), 'team_sub_head') and not public.has_role(auth.uid(), 'ir_head') and not public.has_role(auth.uid(), 'ir_sub_head')) then raise exception 'shift permission denied'; end if;
  select * into v_application from public.applications where id = p_application_id for update;
  if not found or not exists (select 1 from public.committees where id = p_new_committee_id and is_active) then raise exception 'application or destination unavailable'; end if;
  select name into v_old_name from public.committees where id = v_application.committee_id;
  select name into v_new_name from public.committees where id = p_new_committee_id;
  update public.applications set committee_id = p_new_committee_id, status = 'shifted', reviewed_at = now() where id = p_application_id;
  insert into public.application_shifts(application_id, old_committee_id, new_committee_id, reason, actor_id) values (p_application_id, v_application.committee_id, p_new_committee_id, trim(p_reason), auth.uid()) returning id into v_shift;
  v_recipient := v_application.user_id;
  if v_recipient is not null then
    insert into public.notifications(recipient_user_id, type, reference_id, message) values (v_recipient, 'committee_shift', p_application_id, format('Your application moved from %s to %s. Current status: shifted. Next step: follow the new committee activation instructions.', coalesce(v_old_name, 'the previous committee'), v_new_name));
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'shift', 'application', p_application_id, jsonb_build_object('old_committee', v_application.committee_id, 'new_committee', p_new_committee_id, 'shift_id', v_shift));
  return v_shift;
end; $$;

grant execute on function public.shift_application(uuid, uuid, text) to authenticated;

create or replace function public.assign_ir_member(p_evaluator_id uuid, p_member_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare v_assignment uuid; v_capacity integer; v_active integer;
begin
  if auth.uid() is null or (not public.has_role(auth.uid(), 'og') and not public.has_role(auth.uid(), 'ir_head') and not public.has_role(auth.uid(), 'ir_sub_head')) then raise exception 'IR assignment permission denied'; end if;
  if not exists (select 1 from public.ir_evaluator_eligibility where user_id = p_evaluator_id and is_eligible) then raise exception 'evaluator is not eligible'; end if;
  select max_capacity, (select count(*) from public.ir_assignments a where a.evaluator_id = p_evaluator_id and a.unassigned_at is null) into v_capacity, v_active from public.ir_evaluator_eligibility where user_id = p_evaluator_id;
  if v_active >= v_capacity then raise exception 'evaluator capacity reached'; end if;
  if exists (select 1 from public.ir_assignments where member_id = p_member_id and unassigned_at is null) then raise exception 'member already assigned'; end if;
  insert into public.ir_assignments(evaluator_id, member_id, assigned_by) values (p_evaluator_id, p_member_id, auth.uid()) returning id into v_assignment;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'assign', 'ir_assignment', v_assignment, jsonb_build_object('evaluator_id', p_evaluator_id, 'member_id', p_member_id));
  return v_assignment;
end; $$;

grant execute on function public.assign_ir_member(uuid, uuid) to authenticated;

create or replace function public.unassign_ir_member(p_assignment_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or (not public.has_role(auth.uid(), 'og') and not public.has_role(auth.uid(), 'ir_head') and not public.has_role(auth.uid(), 'ir_sub_head')) then raise exception 'IR assignment permission denied'; end if;
  update public.ir_assignments set unassigned_at = now() where id = p_assignment_id and unassigned_at is null;
  if not found then raise exception 'active assignment not found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id) values (auth.uid(), 'unassign', 'ir_assignment', p_assignment_id);
  return true;
end; $$;

grant execute on function public.unassign_ir_member(uuid) to authenticated;

create or replace function public.register_event_guest(p_event_id uuid, p_guest_name text, p_guest_email text, p_guest_phone text) returns table(registration_id uuid, ticket_code text) language plpgsql security definer set search_path = public as $$
declare v_registration public.event_registrations%rowtype;
begin
  if nullif(trim(p_guest_name), '') is null or nullif(lower(trim(p_guest_email)), '') is null then raise exception 'guest identity required'; end if;
  insert into public.event_registrations(event_id, guest_name, guest_email, guest_phone)
  select e.id, trim(p_guest_name), lower(trim(p_guest_email)), nullif(trim(p_guest_phone), '') from public.events e where e.id = p_event_id and e.is_published and e.is_public and (e.registration_closes_at is null or e.registration_closes_at > now()) and (e.capacity is null or (select count(*) from public.event_registrations r where r.event_id = e.id and r.status = 'confirmed') < e.capacity) returning * into v_registration;
  if v_registration.id is null then raise exception 'event is unavailable'; end if;
  registration_id := v_registration.id; ticket_code := v_registration.ticket_code; return next;
exception when unique_violation then raise exception 'already registered';
end; $$;

grant execute on function public.register_event_guest(uuid, text, text, text) to anon, authenticated;

create unique index if not exists one_guest_certificate_claim on public.certificate_claims(certificate_id) where ticket_code_hash is not null;

create or replace function public.claim_guest_certificate(p_ticket_code text) returns table(certificate_id uuid, recipient_name text, event_title text, event_date timestamptz, verification_code text, file_object_key text) language plpgsql security definer set search_path = public as $$
declare v_certificate public.certificates%rowtype; v_registration public.event_registrations%rowtype;
begin
  if nullif(trim(p_ticket_code), '') is null then raise exception 'ticket code required'; end if;
  select r.* into v_registration from public.event_registrations r where r.ticket_code = trim(p_ticket_code) and r.status = 'confirmed' for update;
  if not found then raise exception 'ticket not found'; end if;
  if not exists (select 1 from public.attendance a where a.registration_id = v_registration.id and a.status = 'attended') then raise exception 'certificate unavailable'; end if;
  select c.* into v_certificate from public.certificates c where c.registration_id = v_registration.id;
  if not found then raise exception 'certificate unavailable'; end if;
  insert into public.certificate_claims(certificate_id, ticket_code_hash) values (v_certificate.id, crypt(trim(p_ticket_code), gen_salt('bf'))) on conflict do nothing;
  return query select v_certificate.id, v_certificate.recipient_name, v_certificate.event_title, v_certificate.event_date, v_certificate.verification_code, v_certificate.file_object_key;
end; $$;

grant execute on function public.claim_guest_certificate(text) to anon, authenticated;
