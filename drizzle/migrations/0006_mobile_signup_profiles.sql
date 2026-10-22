CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_mobile boolean := coalesce(new.email, '') like '%@mobile.aadisparsh.app';
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    case when v_mobile then null else new.email end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.phone, nullif(new.raw_user_meta_data ->> 'phone', ''))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'family_user')
  on conflict (user_id, role) do nothing;
  return new;
end
$$;