-- OCENIATOR - fix zapisu roli z panelu admina.
-- Uruchom w Supabase SQL Editor, jeśli przycisk "Zapisz" w profilach
-- nie zmienia roli użytkownika.

create or replace function public.admin_update_profile(
  target_id uuid,
  target_full_name text,
  target_role text,
  target_leader_scope text,
  target_is_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  updated_profile public.profiles;
begin
  select role
    into caller_role
    from public.profiles
   where id = auth.uid()
     and is_active = true;

  if caller_role is distinct from 'admin' then
    raise exception 'Admin role required';
  end if;

  if target_role is null or target_role not in ('admin','director','leader','assessor','viewer') then
    raise exception 'Invalid role: %', target_role;
  end if;

  update public.profiles
     set full_name = coalesce(target_full_name, ''),
         role = target_role,
         leader_scope = nullif(target_leader_scope, ''),
         is_active = coalesce(target_is_active, true)
   where id = target_id
   returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.admin_update_profile(uuid,text,text,text,boolean) from public, anon;

grant execute on function public.admin_update_profile(uuid,text,text,text,boolean) to authenticated;

notify pgrst, 'reload schema';
