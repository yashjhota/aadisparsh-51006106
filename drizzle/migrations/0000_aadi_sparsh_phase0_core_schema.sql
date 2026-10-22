-- =====================================================================
-- Aadi Sparsh — Phase 0 core schema
-- Hierarchy: Organization → City → Temple → Families / Registrations
-- All tenant-owned records carry an organization and/or temple owner.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role as enum ('platform_superadmin', 'temple_admin', 'temple_manager', 'family_user');
create type public.registration_status as enum ('upcoming', 'completed', 'cancelled', 'rescheduled', 'no_show');
create type public.occasion_category as enum (
  'birthday', 'wedding_anniversary', 'family_pooja_seva', 'jain_religious_occasion',
  'kalyanak_festival', 'special_family_day', 'other'
);
create type public.org_status as enum ('active', 'suspended');
create type public.temple_status as enum ('active', 'inactive', 'suspended');
create type public.date_booking_policy as enum ('blocked', 'limited', 'open');
create type public.special_date_category as enum ('chaudas', 'kalyanak', 'festival', 'temple_event', 'other');
create type public.media_type as enum ('photo', 'video');
create type public.media_visibility as enum ('private', 'public');
create type public.consent_status as enum ('pending', 'granted', 'denied');
create type public.publication_status as enum ('unpublished', 'pending_review', 'published');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');
create type public.communication_channel as enum ('whatsapp', 'email', 'sms');
create type public.communication_status as enum ('draft', 'scheduled', 'queued', 'sent', 'delivered', 'failed', 'cancelled');

create sequence public.registration_number_seq;

-- ---------------------------------------------------------------------
-- Tenancy: organizations → cities → temples
-- ---------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.org_status not null default 'active',
  default_timezone text not null default 'Asia/Kolkata',
  default_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  state text,
  country text not null default 'India',
  slug text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.temples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  address text,
  locality text,
  contact_phone text,
  contact_email text,
  maps_url text,
  timezone text not null default 'Asia/Kolkata',
  morning_timings text,
  evening_timings text,
  visit_instructions text,
  default_language text not null default 'en',
  registration_enabled boolean not null default true,
  booking_window_months int not null default 6 check (booking_window_months between 1 and 24),
  registration_opening_date date,
  daily_family_capacity int not null default 15 check (daily_family_capacity between 1 and 1000),
  sunday_blocked boolean not null default true,
  registration_cutoff_days int not null default 0 check (registration_cutoff_days between 0 and 30),
  cancellation_cutoff_days int not null default 1 check (cancellation_cutoff_days between 0 and 30),
  reschedule_cutoff_days int not null default 1 check (reschedule_cutoff_days between 0 and 30),
  minimum_accompanying_people int not null default 0 check (minimum_accompanying_people >= 0),
  maximum_accompanying_people int not null default 10 check (maximum_accompanying_people >= 0),
  remarks_enabled boolean not null default true,
  public_settings jsonb not null default '{}'::jsonb,
  status public.temple_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index idx_temples_org on public.temples (organization_id);
create index idx_temples_city on public.temples (city_id);

-- ---------------------------------------------------------------------
-- Identity: profiles (auth mirror) + user_roles + memberships
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  phone_verified boolean not null default false,
  locality text,
  city text,
  state text,
  country text,
  preferred_language text not null default 'en',
  communication_preferences jsonb not null default '{"booking_updates": true, "reminders": true, "greetings": true, "media": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role in ('platform_superadmin', 'temple_admin')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);

create table public.temple_memberships (
  id uuid primary key default gen_random_uuid(),
  temple_id uuid not null references public.temples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role in ('temple_admin', 'temple_manager')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (temple_id, user_id, role)
);
create index idx_temple_memberships_user on public.temple_memberships (user_id);

-- ---------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------
create table public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_representative_user_id uuid not null references public.profiles(id) on delete cascade,
  verified_mobile_identity text,
  full_name text,
  locality text,
  city text,
  state text,
  country text,
  preferred_language text not null default 'en',
  communication_preferences jsonb not null default '{"booking_updates": true, "reminders": true, "greetings": true, "media": false}'::jsonb,
  consent_messages boolean not null default false,
  consent_media_sharing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, family_representative_user_id)
);
create index idx_family_profiles_rep on public.family_profiles (family_representative_user_id);

-- ---------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  temple_id uuid not null references public.temples(id) on delete restrict,
  family_profile_id uuid not null references public.family_profiles(id) on delete restrict,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  visit_date date not null,
  occasion_type public.occasion_category not null,
  occasion_date date,
  accompanying_people_count int not null default 0 check (accompanying_people_count >= 0),
  total_people int generated always as (1 + accompanying_people_count) stored,
  remarks text,
  status public.registration_status not null default 'upcoming',
  cancellation_reason text,
  rescheduled_from_registration_id uuid references public.registrations(id) on delete set null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  attendance_recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_registrations_temple_date on public.registrations (temple_id, visit_date);
create index idx_registrations_family on public.registrations (family_profile_id);
create index idx_registrations_created_by on public.registrations (created_by_user_id);
-- One active booking per family per temple per date (backstop for the RPC check)
create unique index uq_active_registration on public.registrations (family_profile_id, temple_id, visit_date) where status = 'upcoming';

create table public.registration_history (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  previous_status public.registration_status,
  new_status public.registration_status not null,
  changed_by_user_id uuid references public.profiles(id) on delete set null,
  reason text,
  change_metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_registration_history_reg on public.registration_history (registration_id);

-- ---------------------------------------------------------------------
-- Calendar configuration
-- ---------------------------------------------------------------------
create table public.temple_closed_dates (
  id uuid primary key default gen_random_uuid(),
  temple_id uuid not null references public.temples(id) on delete cascade,
  date date not null,
  reason text,
  booking_policy public.date_booking_policy not null default 'blocked',
  public_instruction text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (temple_id, date)
);

create table public.temple_special_dates (
  id uuid primary key default gen_random_uuid(),
  temple_id uuid not null references public.temples(id) on delete cascade,
  date date not null,
  title text not null,
  category public.special_date_category not null default 'other',
  description text,
  booking_policy public.date_booking_policy not null default 'open',
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (temple_id, date)
);

-- ---------------------------------------------------------------------
-- CRM notes
-- ---------------------------------------------------------------------
create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  temple_id uuid not null references public.temples(id) on delete cascade,
  family_profile_id uuid references public.family_profiles(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_internal_notes_family on public.internal_notes (family_profile_id);
create index idx_internal_notes_registration on public.internal_notes (registration_id);

-- ---------------------------------------------------------------------
-- Communications
-- ---------------------------------------------------------------------
create table public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  temple_id uuid references public.temples(id) on delete cascade,
  message_type text not null,
  language text not null default 'en',
  template_content text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  temple_id uuid not null references public.temples(id) on delete cascade,
  family_profile_id uuid references public.family_profiles(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  channel public.communication_channel not null,
  message_type text not null,
  template_id uuid references public.communication_templates(id) on delete set null,
  scheduled_at timestamptz,
  attempted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  status public.communication_status not null default 'draft',
  provider_reference text,
  failure_reason text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_communication_logs_temple on public.communication_logs (temple_id, created_at desc);
create index idx_communication_logs_family on public.communication_logs (family_profile_id);

-- ---------------------------------------------------------------------
-- Media and testimonials
-- ---------------------------------------------------------------------
create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  temple_id uuid not null references public.temples(id) on delete cascade,
  family_profile_id uuid references public.family_profiles(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  storage_reference text not null,
  media_type public.media_type not null default 'photo',
  caption text,
  visibility public.media_visibility not null default 'private',
  consent_status public.consent_status not null default 'pending',
  publication_status public.publication_status not null default 'unpublished',
  uploaded_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_media_items_temple on public.media_items (temple_id);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  temple_id uuid not null references public.temples(id) on delete cascade,
  family_profile_id uuid not null references public.family_profiles(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  display_name_preference boolean not null default false,
  display_locality boolean not null default false,
  photo_media_id uuid references public.media_items(id) on delete set null,
  consent_status public.consent_status not null default 'pending',
  moderation_status public.moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index idx_testimonials_temple on public.testimonials (temple_id);

-- ---------------------------------------------------------------------
-- Governance: audit logs, field settings, referrals
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  temple_id uuid references public.temples(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_temple on public.audit_logs (temple_id, created_at desc);
create index idx_audit_logs_org on public.audit_logs (organization_id, created_at desc);

create table public.temple_field_settings (
  id uuid primary key default gen_random_uuid(),
  temple_id uuid not null unique references public.temples(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  source text not null,
  captured_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Security-definer helpers (no RLS recursion; stable)
-- ---------------------------------------------------------------------
create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create function public.is_superadmin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(_user_id, 'platform_superadmin') $$;

create function public.has_temple_role(_user_id uuid, _temple_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.temple_memberships m
    where m.user_id = _user_id
      and m.temple_id = _temple_id
      and m.status = 'active'
      and m.role = any(_roles)
  )
$$;

create function public.has_org_role(_user_id uuid, _organization_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.user_id = _user_id
      and om.organization_id = _organization_id
      and om.status = 'active'
      and om.role = any(_roles)
  )
$$;

create function public.can_access_registration(_registration_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.registrations r
    where r.id = _registration_id
      and (
        r.created_by_user_id = _user_id
        or public.has_temple_role(_user_id, r.temple_id, array['temple_admin', 'temple_manager']::public.app_role[])
        or public.is_superadmin(_user_id)
      )
  )
$$;

create function public.can_access_family(_family_profile_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.registrations r
    join public.temple_memberships m
      on m.temple_id = r.temple_id and m.user_id = _user_id and m.status = 'active'
    where r.family_profile_id = _family_profile_id
  )
$$;

create function public.can_access_family_user(_family_user_id uuid, _staff_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.registrations r
    join public.temple_memberships m
      on m.temple_id = r.temple_id and m.user_id = _staff_user_id and m.status = 'active'
    where r.created_by_user_id = _family_user_id
  )
$$;

-- ---------------------------------------------------------------------
-- Audit logger (actor is always the authenticated caller, never a param)
-- ---------------------------------------------------------------------
create function public.log_audit(
  p_organization_id uuid,
  p_temple_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_reason text,
  p_metadata jsonb
) returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (organization_id, temple_id, actor_user_id, action, entity_type, entity_id, reason, metadata)
  values (p_organization_id, p_temple_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_reason, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end
$$;

-- ---------------------------------------------------------------------
-- Signup: create profile + family_user role
-- (Supabase Auth lifecycle exception — app-owned trigger on auth.users)
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'family_user')
  on conflict (user_id, role) do nothing;

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create function public.touch_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;

create trigger trg_organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger trg_temples_touch before update on public.temples for each row execute function public.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_family_profiles_touch before update on public.family_profiles for each row execute function public.touch_updated_at();
create trigger trg_registrations_touch before update on public.registrations for each row execute function public.touch_updated_at();
create trigger trg_internal_notes_touch before update on public.internal_notes for each row execute function public.touch_updated_at();
create trigger trg_media_items_touch before update on public.media_items for each row execute function public.touch_updated_at();
create trigger trg_communication_templates_touch before update on public.communication_templates for each row execute function public.touch_updated_at();
create trigger trg_temple_field_settings_touch before update on public.temple_field_settings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Public availability (counts only — never identities or private details)
-- ---------------------------------------------------------------------
create function public.get_temple_availability(
  p_temple_id uuid,
  p_from date,
  p_to date
)
returns table (
  visit_date date,
  status text,
  families_registered int,
  capacity int,
  remaining int,
  expected_people int,
  label text,
  description text
)
language plpgsql stable security definer set search_path = public
as $$
declare
  t public.temples%rowtype;
  d date;
  v_count int;
  v_people int;
  v_closed public.temple_closed_dates%rowtype;
  v_special public.temple_special_dates%rowtype;
  v_today date;
  v_status text;
  v_show_people boolean;
begin
  select * into t from public.temples where id = p_temple_id;
  if not found then
    return;
  end if;

  v_today := (now() at time zone t.timezone)::date;
  v_show_people := coalesce(t.public_settings ->> 'show_expected_people', 'false')::boolean;

  d := p_from;
  while d <= p_to loop
    select count(*) into v_count
    from public.registrations r
    where r.temple_id = p_temple_id and r.visit_date = d and r.status = 'upcoming';

    select coalesce(sum(r.total_people), 0) into v_people
    from public.registrations r
    where r.temple_id = p_temple_id and r.visit_date = d and r.status = 'upcoming';

    select * into v_closed from public.temple_closed_dates c
    where c.temple_id = p_temple_id and c.date = d;

    select * into v_special from public.temple_special_dates s
    where s.temple_id = p_temple_id and s.date = d;

    if d < v_today then
      v_status := 'past';
    elsif t.registration_enabled = false then
      v_status := 'registration_disabled';
    elsif t.registration_opening_date is not null and v_today < t.registration_opening_date then
      v_status := 'not_open_yet';
    elsif d >= (v_today + make_interval(months => t.booking_window_months))::date then
      v_status := 'out_of_window';
    elsif v_closed.date is not null and v_closed.booking_policy = 'blocked' then
      v_status := 'closed';
    elsif extract(dow from d) = 0 and t.sunday_blocked then
      v_status := 'sunday_blocked';
    elsif d < v_today + t.registration_cutoff_days then
      v_status := 'past_cutoff';
    elsif v_count >= t.daily_family_capacity then
      v_status := 'full';
    else
      v_status := 'available';
    end if;

    visit_date := d;
    status := v_status;
    families_registered := v_count;
    capacity := t.daily_family_capacity;
    remaining := greatest(t.daily_family_capacity - v_count, 0);
    expected_people := case when v_show_people then v_people else null end;
    label := v_special.title;
    description := coalesce(v_closed.public_instruction, v_special.description);
    return next;

    d := d + 1;
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- Booking result type + atomic booking RPC
-- ---------------------------------------------------------------------
create type public.booking_result as (
  created boolean,
  registration public.registrations,
  message text
);

create function public.book_registration(
  p_temple_id uuid,
  p_visit_date date,
  p_occasion public.occasion_category,
  p_occasion_date date default null,
  p_accompanying_people_count integer default 0,
  p_remarks text default null
)
returns public.booking_result
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t public.temples%rowtype;
  v_today date;
  v_family public.family_profiles%rowtype;
  v_active int;
  v_existing public.registrations%rowtype;
  v_reg public.registrations%rowtype;
  v_reg_no text;
  v_msg text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into t from public.temples where id = p_temple_id and status = 'active' for update;
  if not found then
    raise exception 'TEMPLE_NOT_AVAILABLE';
  end if;
  if not t.registration_enabled then
    raise exception 'REGISTRATION_DISABLED';
  end if;

  v_today := (now() at time zone t.timezone)::date;

  if p_visit_date < v_today then
    raise exception 'PAST_DATE';
  end if;
  if extract(dow from p_visit_date) = 0 and t.sunday_blocked then
    raise exception 'SUNDAY_BLOCKED';
  end if;
  if p_visit_date >= (v_today + make_interval(months => t.booking_window_months))::date then
    raise exception 'OUT_OF_WINDOW';
  end if;
  if p_visit_date < v_today + t.registration_cutoff_days then
    raise exception 'PAST_REGISTRATION_CUTOFF';
  end if;
  if p_accompanying_people_count < t.minimum_accompanying_people
     or p_accompanying_people_count > t.maximum_accompanying_people then
    raise exception 'ACCOMPANYING_OUT_OF_RANGE';
  end if;
  if exists (
    select 1 from public.temple_closed_dates
    where temple_id = p_temple_id and date = p_visit_date and booking_policy = 'blocked'
  ) then
    raise exception 'TEMPLE_CLOSED';
  end if;
  if p_remarks is not null and not t.remarks_enabled then
    p_remarks := null;
  end if;

  select * into v_family from public.family_profiles
  where organization_id = t.organization_id and family_representative_user_id = v_uid;
  if not found then
    insert into public.family_profiles (
      organization_id, family_representative_user_id, full_name,
      locality, city, state, country, preferred_language, communication_preferences,
      verified_mobile_identity
    )
    select
      t.organization_id, v_uid, p.full_name,
      p.locality, p.city, p.state, p.country, p.preferred_language, p.communication_preferences,
      case when p.phone_verified then p.phone else null end
    from public.profiles p
    where p.id = v_uid
    on conflict (organization_id, family_representative_user_id) do update set updated_at = now()
    returning * into v_family;
  end if;

  -- Duplicate active registration for same family, temple, date
  select * into v_existing from public.registrations
  where family_profile_id = v_family.id
    and temple_id = p_temple_id
    and visit_date = p_visit_date
    and status = 'upcoming';
  if found then
    return (false, v_existing, 'duplicate: ' || v_existing.registration_number);
  end if;

  -- Capacity (temple row is locked FOR UPDATE, serializing concurrent bookings)
  select count(*) into v_active
  from public.registrations
  where temple_id = p_temple_id and visit_date = p_visit_date and status = 'upcoming';
  if v_active >= t.daily_family_capacity then
    raise exception 'DATE_FULL';
  end if;

  v_reg_no := 'AS-' || to_char(now() at time zone t.timezone, 'YYMM') || '-'
              || lpad(nextval('public.registration_number_seq')::text, 5, '0');

  insert into public.registrations (
    registration_number, organization_id, temple_id, family_profile_id,
    created_by_user_id, visit_date, occasion_type, occasion_date,
    accompanying_people_count, remarks, status
  ) values (
    v_reg_no, t.organization_id, p_temple_id, v_family.id,
    v_uid, p_visit_date, p_occasion, p_occasion_date,
    p_accompanying_people_count, p_remarks, 'upcoming'
  )
  returning * into v_reg;

  insert into public.registration_history (registration_id, previous_status, new_status, changed_by_user_id, reason)
  values (v_reg.id, null, 'upcoming', v_uid, 'Booking created');

  perform public.log_audit(
    t.organization_id, p_temple_id, 'booking_created', 'registration', v_reg.id, null,
    jsonb_build_object('visit_date', p_visit_date, 'total_people', 1 + p_accompanying_people_count)
  );

  return (true, v_reg, 'confirmed');
exception
  when unique_violation then
    -- Concurrent duplicate: the other transaction won; return its row
    select * into v_existing from public.registrations
    where family_profile_id = v_family.id
      and temple_id = p_temple_id
      and visit_date = p_visit_date
      and status = 'upcoming';
    if found then
      return (false, v_existing, 'duplicate: ' || v_existing.registration_number);
    end if;
    raise;
end
$$;

-- ---------------------------------------------------------------------
-- Cancellation (owner within cutoff; staff/admin can override)
-- ---------------------------------------------------------------------
create function public.cancel_registration(
  p_registration_id uuid,
  p_reason text default null
)
returns public.registrations
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.registrations%rowtype;
  t public.temples%rowtype;
  v_today date;
  v_is_staff boolean;
  v_is_admin boolean;
  v_out public.registrations%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if r.status <> 'upcoming' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  select * into t from public.temples where id = r.temple_id;
  v_today := (now() at time zone t.timezone)::date;
  v_is_staff := public.has_temple_role(v_uid, r.temple_id, array['temple_admin', 'temple_manager']::public.app_role[]);
  v_is_admin := public.has_temple_role(v_uid, r.temple_id, array['temple_admin']::public.app_role[]) or public.is_superadmin(v_uid);

  if r.created_by_user_id <> v_uid and not v_is_staff and not public.is_superadmin(v_uid) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not v_is_staff and r.visit_date < v_today + t.cancellation_cutoff_days then
    raise exception 'PAST_CANCELLATION_CUTOFF';
  end if;

  update public.registrations
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = coalesce(p_reason, case when v_is_staff then 'Cancelled by temple staff' else 'Cancelled by family' end),
      updated_at = now()
  where id = r.id
  returning * into v_out;

  insert into public.registration_history (registration_id, previous_status, new_status, changed_by_user_id, reason)
  values (r.id, 'upcoming', 'cancelled', v_uid, coalesce(p_reason, 'Cancellation'));

  perform public.log_audit(
    r.organization_id, r.temple_id, 'booking_cancelled', 'registration', r.id, p_reason,
    jsonb_build_object('registration_number', r.registration_number, 'by_family', r.created_by_user_id = v_uid)
  );

  return v_out;
end
$$;

-- ---------------------------------------------------------------------
-- Rescheduling: original is marked rescheduled, a linked replacement is
-- created. Only the replacement consumes capacity.
-- ---------------------------------------------------------------------
create function public.reschedule_registration(
  p_registration_id uuid,
  p_new_date date,
  p_reason text default null
)
returns public.booking_result
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.registrations%rowtype;
  t public.temples%rowtype;
  v_today date;
  v_is_staff boolean;
  v_is_admin boolean;
  v_active int;
  v_existing public.registrations%rowtype;
  v_new_reg public.registrations%rowtype;
  v_reg_no text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if r.status <> 'upcoming' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;
  if p_new_date = r.visit_date then
    raise exception 'SAME_DATE';
  end if;

  select * into t from public.temples where id = r.temple_id for update;
  v_today := (now() at time zone t.timezone)::date;
  v_is_staff := public.has_temple_role(v_uid, r.temple_id, array['temple_admin', 'temple_manager']::public.app_role[]);
  v_is_admin := public.has_temple_role(v_uid, r.temple_id, array['temple_admin']::public.app_role[]) or public.is_superadmin(v_uid);

  if r.created_by_user_id <> v_uid and not v_is_staff and not public.is_superadmin(v_uid) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not v_is_staff and r.visit_date < v_today + t.reschedule_cutoff_days then
    raise exception 'PAST_RESCHEDULE_CUTOFF';
  end if;

  -- Revalidate the destination date against all booking rules
  if p_new_date < v_today then
    raise exception 'PAST_DATE';
  end if;
  if extract(dow from p_new_date) = 0 and t.sunday_blocked then
    raise exception 'SUNDAY_BLOCKED';
  end if;
  if p_new_date >= (v_today + make_interval(months => t.booking_window_months))::date then
    raise exception 'OUT_OF_WINDOW';
  end if;
  if p_new_date < v_today + t.registration_cutoff_days then
    raise exception 'PAST_REGISTRATION_CUTOFF';
  end if;
  if exists (
    select 1 from public.temple_closed_dates
    where temple_id = r.temple_id and date = p_new_date and booking_policy = 'blocked'
  ) then
    raise exception 'TEMPLE_CLOSED';
  end if;

  -- Duplicate active registration on the destination date for this family
  select * into v_existing from public.registrations
  where family_profile_id = r.family_profile_id
    and temple_id = r.temple_id
    and visit_date = p_new_date
    and status = 'upcoming'
    and id <> r.id;
  if found then
    raise exception 'DUPLICATE_ACTIVE_BOOKING';
  end if;

  -- Capacity on the destination date (old booking is not counted; it will
  -- be marked rescheduled below and no longer consumes capacity)
  select count(*) into v_active
  from public.registrations
  where temple_id = r.temple_id
    and visit_date = p_new_date
    and status = 'upcoming';
  if v_active >= t.daily_family_capacity then
    raise exception 'DATE_FULL';
  end if;

  update public.registrations
  set status = 'rescheduled', updated_at = now()
  where id = r.id;

  insert into public.registration_history (registration_id, previous_status, new_status, changed_by_user_id, reason, change_metadata)
  values (r.id, 'upcoming', 'rescheduled', v_uid, coalesce(p_reason, 'Rescheduled'),
          jsonb_build_object('new_date', p_new_date));

  v_reg_no := 'AS-' || to_char(now() at time zone t.timezone, 'YYMM') || '-'
              || lpad(nextval('public.registration_number_seq')::text, 5, '0');

  insert into public.registrations (
    registration_number, organization_id, temple_id, family_profile_id,
    created_by_user_id, visit_date, occasion_type, occasion_date,
    accompanying_people_count, remarks, status, rescheduled_from_registration_id
  ) values (
    v_reg_no, r.organization_id, r.temple_id, r.family_profile_id,
    r.created_by_user_id, p_new_date, r.occasion_type, r.occasion_date,
    r.accompanying_people_count, r.remarks, 'upcoming', r.id
  )
  returning * into v_new_reg;

  insert into public.registration_history (registration_id, previous_status, new_status, changed_by_user_id, reason, change_metadata)
  values (v_new_reg.id, null, 'upcoming', v_uid, 'Rescheduled from ' || r.registration_number,
          jsonb_build_object('rescheduled_from', r.id, 'old_date', r.visit_date));

  perform public.log_audit(
    r.organization_id, r.temple_id, 'booking_rescheduled', 'registration', v_new_reg.id, p_reason,
    jsonb_build_object('from_registration', r.registration_number, 'old_date', r.visit_date, 'new_date', p_new_date,
                       'override_by_staff', r.created_by_user_id <> v_uid)
  );

  return (true, v_new_reg, 'rescheduled');
end
$$;

-- ---------------------------------------------------------------------
-- Attendance: staff record completed / no_show
-- ---------------------------------------------------------------------
create function public.set_attendance(
  p_registration_id uuid,
  p_new_status public.registration_status,
  p_reason text default null
)
returns public.registrations
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.registrations%rowtype;
  v_is_admin boolean;
  v_out public.registrations%rowtype;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;

  if not public.has_temple_role(v_uid, r.temple_id, array['temple_admin', 'temple_manager']::public.app_role[])
     and not public.is_superadmin(v_uid) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_is_admin := public.has_temple_role(v_uid, r.temple_id, array['temple_admin']::public.app_role[]) or public.is_superadmin(v_uid);

  if r.status = 'upcoming' and p_new_status in ('completed', 'no_show') then
    null; -- normal attendance recording
  elsif r.status in ('completed', 'no_show') and p_new_status in ('completed', 'no_show')
        and r.status <> p_new_status and v_is_admin and p_reason is not null then
    null; -- authorized correction with a recorded reason
  else
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.registrations
  set status = p_new_status,
      completed_at = case when p_new_status = 'completed' then now() else null end,
      attendance_recorded_by = v_uid,
      updated_at = now()
  where id = r.id
  returning * into v_out;

  insert into public.registration_history (registration_id, previous_status, new_status, changed_by_user_id, reason)
  values (r.id, r.status, p_new_status, v_uid, coalesce(p_reason, 'Attendance recorded'));

  perform public.log_audit(
    r.organization_id, r.temple_id, 'attendance_recorded', 'registration', r.id, p_reason,
    jsonb_build_object('registration_number', r.registration_number, 'new_status', p_new_status)
  );

  return v_out;
end
$$;

-- ---------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------

-- Public-readable tables (only information intended for public viewing)
grant select on public.organizations, public.cities, public.temples,
  public.temple_closed_dates, public.temple_special_dates to anon, authenticated;

-- Authenticated-readable tables (policies scope the rows)
grant select on public.profiles, public.user_roles, public.organization_memberships,
  public.temple_memberships, public.family_profiles, public.registrations,
  public.registration_history, public.internal_notes, public.communication_templates,
  public.communication_logs, public.media_items, public.testimonials,
  public.audit_logs, public.temple_field_settings, public.referrals to authenticated;

-- Writes allowed by policy (all sensitive writes also flow through RPCs)
grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.family_profiles to authenticated;
grant insert, update, delete on public.internal_notes to authenticated;
grant insert, update, delete on public.communication_templates to authenticated;
grant insert, update, delete on public.communication_logs to authenticated;
grant insert, update, delete on public.media_items to authenticated;
grant insert, update, delete on public.testimonials to authenticated;
grant insert, update, delete on public.temple_closed_dates, public.temple_special_dates to authenticated;
grant insert, update, delete on public.temple_field_settings to authenticated;
grant insert, update, delete on public.temples to authenticated;
grant insert, update, delete on public.cities to authenticated;
grant insert, update, delete on public.user_roles to authenticated;
grant insert, update, delete on public.organization_memberships, public.temple_memberships to authenticated;

-- Service role: full access for backend/admin code
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage, select on sequence public.registration_number_seq to authenticated;

-- Function execute privileges
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.is_superadmin(uuid) from public;
revoke execute on function public.has_temple_role(uuid, uuid, public.app_role[]) from public;
revoke execute on function public.has_org_role(uuid, uuid, public.app_role[]) from public;
revoke execute on function public.can_access_registration(uuid, uuid) from public;
revoke execute on function public.can_access_family(uuid, uuid) from public;
revoke execute on function public.can_access_family_user(uuid, uuid) from public;
revoke execute on function public.log_audit(uuid, uuid, text, text, uuid, text, jsonb) from public;
revoke execute on function public.book_registration(uuid, date, public.occasion_category, date, integer, text) from public;
revoke execute on function public.cancel_registration(uuid, text) from public;
revoke execute on function public.reschedule_registration(uuid, date, text) from public;
revoke execute on function public.set_attendance(uuid, public.registration_status, text) from public;
revoke execute on function public.get_temple_availability(uuid, date, date) from public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_superadmin(uuid) to authenticated;
grant execute on function public.has_temple_role(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.has_org_role(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.can_access_registration(uuid, uuid) to authenticated;
grant execute on function public.can_access_family(uuid, uuid) to authenticated;
grant execute on function public.can_access_family_user(uuid, uuid) to authenticated;
grant execute on function public.log_audit(uuid, uuid, text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.book_registration(uuid, date, public.occasion_category, date, integer, text) to authenticated;
grant execute on function public.cancel_registration(uuid, text) to authenticated;
grant execute on function public.reschedule_registration(uuid, date, text) to authenticated;
grant execute on function public.set_attendance(uuid, public.registration_status, text) to authenticated;
grant execute on function public.get_temple_availability(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.cities enable row level security;
alter table public.temples enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.temple_memberships enable row level security;
alter table public.family_profiles enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_history enable row level security;
alter table public.temple_closed_dates enable row level security;
alter table public.temple_special_dates enable row level security;
alter table public.internal_notes enable row level security;
alter table public.communication_templates enable row level security;
alter table public.communication_logs enable row level security;
alter table public.media_items enable row level security;
alter table public.testimonials enable row level security;
alter table public.audit_logs enable row level security;
alter table public.temple_field_settings enable row level security;
alter table public.referrals enable row level security;

-- Tenancy (public info)
create policy "Organizations are publicly readable"
  on public.organizations for select to public using (true);
create policy "Cities are publicly readable"
  on public.cities for select to public using (true);
create policy "Temples are publicly readable"
  on public.temples for select to public using (true);
create policy "Closed dates are publicly readable"
  on public.temple_closed_dates for select to public using (true);
create policy "Special dates are publicly readable"
  on public.temple_special_dates for select to public using (true);

create policy "Superadmin manages organizations"
  on public.organizations for all to authenticated
  using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));
create policy "Superadmin or org admin manages cities"
  on public.cities for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]));
create policy "Superadmin or org admin creates temples"
  on public.temples for insert to authenticated
  with check (public.is_superadmin(auth.uid()) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]));
create policy "Temple admin manages own temple"
  on public.temples for update to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), id, array['temple_admin']::public.app_role[]) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), id, array['temple_admin']::public.app_role[]) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]));

create policy "Temple admin manages closed dates"
  on public.temple_closed_dates for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]));
create policy "Temple admin manages special dates"
  on public.temple_special_dates for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]));

-- Profiles
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_superadmin(auth.uid())
    or public.can_access_family_user(id, auth.uid())
  );
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Roles and memberships (managed by superadmin / temple admins only)
create policy "Users read own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));
create policy "Superadmin manages roles"
  on public.user_roles for all to authenticated
  using (public.is_superadmin(auth.uid())) with check (public.is_superadmin(auth.uid()));

create policy "Members read own org membership"
  on public.organization_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]));
create policy "Superadmin or org admin manages org membership"
  on public.organization_memberships for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]));

create policy "Members read temple staff"
  on public.temple_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));
create policy "Temple admin manages staff"
  on public.temple_memberships for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]));

-- Families
create policy "Owner or assigned staff reads family"
  on public.family_profiles for select to authenticated
  using (
    family_representative_user_id = auth.uid()
    or public.is_superadmin(auth.uid())
    or public.can_access_family(id, auth.uid())
  );
create policy "Owner writes own family profile"
  on public.family_profiles for insert to authenticated
  with check (family_representative_user_id = auth.uid());
create policy "Owner updates own family profile"
  on public.family_profiles for update to authenticated
  using (family_representative_user_id = auth.uid()) with check (family_representative_user_id = auth.uid());

-- Registrations (writes flow through the booking RPCs)
create policy "Owner or assigned staff reads registrations"
  on public.registrations for select to authenticated
  using (
    created_by_user_id = auth.uid()
    or public.is_superadmin(auth.uid())
    or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[])
  );

create policy "Access via registration for history"
  on public.registration_history for select to authenticated
  using (public.can_access_registration(registration_id, auth.uid()));

-- Notes (staff only, never public or family-visible)
create policy "Assigned staff manage notes"
  on public.internal_notes for all to authenticated
  using (public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]) or public.is_superadmin(auth.uid()))
  with check (public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]) or public.is_superadmin(auth.uid()));

-- Communications
create policy "Assigned staff read templates"
  on public.communication_templates for select to authenticated
  using (
    public.is_superadmin(auth.uid())
    or (temple_id is not null and public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]))
    or (organization_id is not null and public.has_org_role(auth.uid(), organization_id, array['temple_admin', 'temple_manager']::public.app_role[]))
  );
create policy "Temple admins manage templates"
  on public.communication_templates for all to authenticated
  using (
    public.is_superadmin(auth.uid())
    or (temple_id is not null and public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]))
    or (organization_id is not null and public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]))
  )
  with check (
    public.is_superadmin(auth.uid())
    or (temple_id is not null and public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]))
    or (organization_id is not null and public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]))
  );
create policy "Assigned staff read communication logs"
  on public.communication_logs for select to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));
create policy "Assigned staff create communication logs"
  on public.communication_logs for insert to authenticated
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));
create policy "Assigned staff update communication logs"
  on public.communication_logs for update to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));

-- Media (public only when published and consented; staff manage; owner sees own)
create policy "Public sees published consented media"
  on public.media_items for select to public
  using (publication_status = 'published' and consent_status = 'granted' and visibility = 'public');
create policy "Assigned staff manage media"
  on public.media_items for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));
create policy "Family sees own private media"
  on public.media_items for select to authenticated
  using (public.can_access_family(family_profile_id, auth.uid()));

-- Testimonials
create policy "Public sees approved testimonials"
  on public.testimonials for select to public
  using (moderation_status = 'approved');
create policy "Assigned staff manage testimonials"
  on public.testimonials for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));
create policy "Family submits own testimonial"
  on public.testimonials for insert to authenticated
  with check (public.can_access_family(id, auth.uid()) = false or family_profile_id in (select f.id from public.family_profiles f where f.family_representative_user_id = auth.uid()));

-- Audit logs (read-only for staff; written via log_audit)
create policy "Superadmin reads all audit logs"
  on public.audit_logs for select to authenticated
  using (public.is_superadmin(auth.uid()));
create policy "Assigned staff read temple audit logs"
  on public.audit_logs for select to authenticated
  using (
    (temple_id is not null and public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]))
    or (organization_id is not null and public.has_org_role(auth.uid(), organization_id, array['temple_admin']::public.app_role[]))
  );

-- Field settings
create policy "Assigned staff read field settings"
  on public.temple_field_settings for select to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin', 'temple_manager']::public.app_role[]));
create policy "Temple admin manages field settings"
  on public.temple_field_settings for all to authenticated
  using (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]))
  with check (public.is_superadmin(auth.uid()) or public.has_temple_role(auth.uid(), temple_id, array['temple_admin']::public.app_role[]));

-- Referrals (staff read; written via service code)
create policy "Assigned staff read referrals"
  on public.referrals for select to authenticated
  using (
    public.is_superadmin(auth.uid())
    or exists (
      select 1 from public.registrations r
      where r.id = registration_id
        and (public.has_temple_role(auth.uid(), r.temple_id, array['temple_admin', 'temple_manager']::public.app_role[]) or public.is_superadmin(auth.uid()))
    )
  );

-- ---------------------------------------------------------------------
-- Seed: launch organization, city, temple (official details are left
-- blank on purpose — authorized administrators configure them in the UI)
-- ---------------------------------------------------------------------
insert into public.organizations (name, slug, status, default_timezone, default_language)
values ('Aadi Sparsh', 'aadi-sparsh', 'active', 'Asia/Kolkata', 'en')
on conflict (slug) do nothing;

insert into public.cities (organization_id, name, state, country, slug)
select o.id, 'Bengaluru', 'Karnataka', 'India', 'bengaluru'
from public.organizations o where o.slug = 'aadi-sparsh'
on conflict (organization_id, slug) do nothing;

insert into public.temples (
  organization_id, city_id, name, slug, description, address, locality,
  timezone, registration_enabled, booking_window_months, daily_family_capacity,
  sunday_blocked, registration_cutoff_days, cancellation_cutoff_days,
  reschedule_cutoff_days, minimum_accompanying_people, maximum_accompanying_people,
  remarks_enabled, public_settings, status
)
select
  o.id, c.id, 'Adinath Bhagwan Jain Temple (Chickpete)', 'adinath-bhagwan-chickpete',
  'Launch temple on Aadi Sparsh. Official name, address, timings and contact details are confirmed and published by the temple administrators.',
  null, 'Chickpete, Bengaluru', 'Asia/Kolkata', true, 6, 15, true, 0, 1, 1, 0, 10, true,
  '{"show_expected_people": false}'::jsonb, 'active'
from public.organizations o, public.cities c
where o.slug = 'aadi-sparsh' and c.slug = 'bengaluru' and c.organization_id = o.id
on conflict (organization_id, slug) do nothing;
