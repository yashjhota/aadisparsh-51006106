create or replace function public.claim_superadmin(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_completed timestamptz;
begin
  if v_uid is null then
    perform public.log_audit(null, null, 'setup.claim.unauthenticated', 'app_setup', null, null, '{}'::jsonb);
    return false;
  end if;

  -- Permanently closed once a superadmin exists.
  if exists (select 1 from public.user_roles where role = 'platform_superadmin') then
    return false;
  end if;

  select setup_code_hash, setup_completed_at into v_hash, v_completed from public.app_setup where id = 1;
  if v_completed is not null or v_hash is null then
    return false;
  end if;

  if p_code is null or length(btrim(p_code)) = 0 or extensions.crypt(btrim(p_code), v_hash) is distinct from v_hash then
    perform public.log_audit(null, null, 'setup.claim.wrong_code', 'app_setup', v_uid, 'setup code rejected', '{}'::jsonb);
    return false;
  end if;

  if not exists (select 1 from public.user_roles where user_id = v_uid and role = 'platform_superadmin') then
    insert into public.user_roles (user_id, role) values (v_uid, 'platform_superadmin');
  end if;

  update public.app_setup
    set setup_completed_at = now(), setup_code_hash = null
    where id = 1;

  perform public.log_audit(null, null, 'setup.claim.superadmin_granted', 'app_setup', v_uid, 'initial superadmin designated', jsonb_build_object('granted_to', v_uid));

  return true;
end;
$$;