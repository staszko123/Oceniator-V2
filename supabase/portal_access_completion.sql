alter table public.profiles add column if not exists viewer_specialist_name text;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.my_scope()
returns text language sql stable security definer set search_path = public as $$
  select nullif(leader_scope, '') from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_profile_full_name()
returns text language sql stable security definer set search_path = public as $$
  select viewer_specialist_name from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_profile_email()
returns text language sql stable security definer set search_path = public as $$
  select p.email from public.profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.is_active = true
      and u.email_confirmed_at is not null and u.email = p.email;
$$;

create or replace function public.can_access_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessments a
    where a.id = target_assessment_id
      and (
        public.my_role() in ('admin','director')
        or (public.my_role() in ('leader','assessor') and a.leader_scope = public.my_scope())
        or (
          public.my_role() = 'viewer'
          and a.status = 'approved'
          and (
            a.spec = nullif(public.current_profile_full_name(), '')
            or a.spec = auth.uid()::text
            or a.spec = nullif(public.current_profile_email(), '')
          )
        )
      )
  );
$$;


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

-- Replace both historical and current viewer policies: PostgreSQL ORs permissive policies.
drop policy if exists "assessments: viewer odczyt" on public.assessments;
drop policy if exists "asses: viewer" on public.assessments;
drop policy if exists "assessments: viewer read" on public.assessments;
create policy "assessments: viewer read" on public.assessments for select to authenticated
using (public.my_role() = 'viewer' and status = 'approved' and (
  spec = auth.uid()::text
  or spec = nullif(public.current_profile_full_name(), '')
  or spec = nullif(public.current_profile_email(), '')
));

-- Only an active administrator can bind an account to the named legacy specialist.
create or replace function public.admin_link_viewer(target_id uuid, target_specialist_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if nullif(target_specialist_name, '') is not null and
     (select count(*) from public.specialists where name = target_specialist_name and is_active = true) <> 1 then
    raise exception 'Select one unique active specialist';
  end if;
  update public.profiles set viewer_specialist_name = nullif(target_specialist_name, '')
    where id = target_id and role = 'viewer';
  if not found then raise exception 'Viewer profile not found'; end if;
end;
$$;
revoke all on function public.admin_link_viewer(uuid,text) from public, anon;
grant execute on function public.admin_link_viewer(uuid,text) to authenticated;

-- Profile fields and the viewer binding commit together or not at all.
create or replace function public.admin_update_profile_with_binding(
 target_id uuid, target_full_name text, target_role text, target_leader_scope text,
 target_is_active boolean, target_specialist_name text
) returns public.profiles language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  if public.my_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if target_role = 'viewer' and nullif(target_specialist_name, '') is not null and
    (select count(*) from public.specialists where name = target_specialist_name and is_active = true) <> 1 then
    raise exception 'Select one unique active specialist';
  end if;
  perform public.admin_update_profile(target_id,target_full_name,target_role,target_leader_scope,target_is_active);
  update public.profiles set viewer_specialist_name = case when target_role = 'viewer' then nullif(target_specialist_name, '') else null end
    where id = target_id returning * into result;
  return result;
end;
$$;
revoke all on function public.admin_update_profile_with_binding(uuid,text,text,text,boolean,text) from public, anon;
grant execute on function public.admin_update_profile_with_binding(uuid,text,text,text,boolean,text) to authenticated;
notify pgrst, 'reload schema';

-- Match the portal workflow at the database boundary, including direct API writes.
create or replace function public.guard_assessment_write()
returns trigger language plpgsql set search_path = public as $$
declare caller_role text;
begin
  if auth.uid() is null then return new; end if;
  caller_role := public.my_role();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if caller_role is distinct from 'admin' and new.status is distinct from 'submitted' then raise exception 'New assessment must be submitted'; end if;
  else
    new.created_at := old.created_at;
    if new.created_by is distinct from old.created_by or new.leader_scope is distinct from old.leader_scope then
      raise exception 'Assessment author and scope are immutable';
    end if;
    if new.status is distinct from old.status then
      if caller_role is null or caller_role not in ('admin','leader') then raise exception 'Status decision requires admin or leader'; end if;
      if new.status is distinct from (case old.status when 'submitted' then 'review' when 'review' then 'approved' when 'approved' then 'archived' when 'archived' then 'submitted' end) then
        raise exception 'Invalid status transition';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_assessments_write_guard on public.assessments;
create trigger trg_assessments_write_guard before insert or update on public.assessments
for each row execute function public.guard_assessment_write();
