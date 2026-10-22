create or replace function public.book_registration(
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

  select * into v_existing from public.registrations
  where family_profile_id = v_family.id
    and temple_id = p_temple_id
    and visit_date = p_visit_date
    and status = 'upcoming';
  if found then
    return (false, v_existing, 'duplicate: ' || v_existing.registration_number);
  end if;

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

  return (true, v_reg, 'confirmed'::text);
exception
  when unique_violation then
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

create or replace function public.reschedule_registration(
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

  select * into v_existing from public.registrations
  where family_profile_id = r.family_profile_id
    and temple_id = r.temple_id
    and visit_date = p_new_date
    and status = 'upcoming'
    and id <> r.id;
  if found then
    raise exception 'DUPLICATE_ACTIVE_BOOKING';
  end if;

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

  return (true, v_new_reg, 'rescheduled'::text);
end
$$;