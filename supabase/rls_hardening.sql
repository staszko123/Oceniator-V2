alter table public.profiles add column if not exists viewer_specialist_name text;

-- OCENIATOR - RLS hardening after moving auth/data to Supabase.
-- Run after schema.sql. The important part is WITH CHECK on writes:
-- the browser cannot insert or update rows outside its own role/scope.

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

create unique index if not exists idx_periods_code_unique on public.periods(code);

drop policy if exists "profiles: admin edyt" on public.profiles;
drop policy if exists "profiles: admin edytuje" on public.profiles;
drop policy if exists "profiles: admin update" on public.profiles;

create policy "profiles: admin update"
  on public.profiles for update
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

drop policy if exists "profiles: admin insert" on public.profiles;
drop policy if exists "profiles: admin wstaw" on public.profiles;
create policy "profiles: admin insert"
  on public.profiles for insert
  with check (public.my_role() = 'admin');

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

drop policy if exists "admin_history: insert przez zalogowanych" on public.admin_history;
drop policy if exists "admin_history: admin i dyrektor wstawiaja" on public.admin_history;
create policy "admin_history: admin i dyrektor wstawiaja"
  on public.admin_history for insert
  with check (public.my_role() in ('admin','director'));

drop policy if exists "goals: admin insert" on public.goals;
create policy "goals: admin insert"
  on public.goals for insert
  with check (public.my_role() in ('admin','director'));

drop policy if exists "assessments: admin pełny dostęp" on public.assessments;
drop policy if exists "assessments: dyrektor czyta wszystko" on public.assessments;
drop policy if exists "assessments: lider swój zakres" on public.assessments;
drop policy if exists "assessments: oceniający swój zakres" on public.assessments;
drop policy if exists "assessments: viewer odczyt" on public.assessments;
drop policy if exists "asses: admin" on public.assessments;
drop policy if exists "asses: dyrektor" on public.assessments;
drop policy if exists "asses: lider" on public.assessments;
drop policy if exists "asses: oceniaj" on public.assessments;
drop policy if exists "asses: viewer" on public.assessments;

create policy "assessments: admin read"
  on public.assessments for select
  using (public.my_role() = 'admin');

create policy "assessments: admin insert"
  on public.assessments for insert
  with check (public.my_role() = 'admin');

create policy "assessments: admin update"
  on public.assessments for update
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

create policy "assessments: admin delete"
  on public.assessments for delete
  using (public.my_role() = 'admin');

create policy "assessments: director read"
  on public.assessments for select
  using (public.my_role() = 'director');

create policy "assessments: leader read"
  on public.assessments for select
  using (public.my_role() = 'leader' and leader_scope = public.my_scope());

create policy "assessments: leader insert"
  on public.assessments for insert
  with check (public.my_role() = 'leader' and leader_scope = public.my_scope());

create policy "assessments: leader update"
  on public.assessments for update
  using (public.my_role() = 'leader' and leader_scope = public.my_scope())
  with check (public.my_role() = 'leader' and leader_scope = public.my_scope());

create policy "assessments: assessor read"
  on public.assessments for select
  using (public.my_role() = 'assessor' and leader_scope = public.my_scope());

create policy "assessments: assessor insert"
  on public.assessments for insert
  with check (public.my_role() = 'assessor' and leader_scope = public.my_scope());

create policy "assessments: assessor update"
  on public.assessments for update
  using (public.my_role() = 'assessor' and leader_scope = public.my_scope())
  with check (public.my_role() = 'assessor' and leader_scope = public.my_scope());

create policy "assessments: viewer read"
  on public.assessments for select
  using (
    public.my_role() = 'viewer'
    and status = 'approved'
    and (
      spec = nullif(public.current_profile_full_name(), '')
      or spec = auth.uid()::text
      or spec = nullif(public.current_profile_email(), '')
    )
  );

alter table public.user_drafts enable row level security;
drop policy if exists "user_drafts: owner read" on public.user_drafts;
drop policy if exists "user_drafts: owner insert" on public.user_drafts;
drop policy if exists "user_drafts: owner update" on public.user_drafts;
drop policy if exists "user_drafts: owner delete" on public.user_drafts;
create policy "user_drafts: owner read"
  on public.user_drafts for select
  using (user_id = auth.uid());
create policy "user_drafts: owner insert"
  on public.user_drafts for insert
  with check (user_id = auth.uid());
create policy "user_drafts: owner update"
  on public.user_drafts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "user_drafts: owner delete"
  on public.user_drafts for delete
  using (user_id = auth.uid());

alter table public.assessment_comments enable row level security;
drop policy if exists "assessment_comments: read with assessment access" on public.assessment_comments;
drop policy if exists "assessment_comments: scoped insert" on public.assessment_comments;
drop policy if exists "assessment_comments: owner or admin update" on public.assessment_comments;
drop policy if exists "assessment_comments: owner or admin delete" on public.assessment_comments;
create policy "assessment_comments: read with assessment access"
  on public.assessment_comments for select
  using (public.can_access_assessment(assessment_id));
create policy "assessment_comments: scoped insert"
  on public.assessment_comments for insert
  with check (
    created_by = auth.uid()
    and public.my_role() in ('admin','director','leader','assessor')
    and public.can_access_assessment(assessment_id)
  );
create policy "assessment_comments: owner or admin update"
  on public.assessment_comments for update
  using (
    (created_by = auth.uid() and public.can_access_assessment(assessment_id))
    or public.my_role() in ('admin','director')
  )
  with check (
    (created_by = auth.uid() and public.can_access_assessment(assessment_id))
    or public.my_role() in ('admin','director')
  );
create policy "assessment_comments: owner or admin delete"
  on public.assessment_comments for delete
  using (
    (created_by = auth.uid() and public.can_access_assessment(assessment_id))
    or public.my_role() in ('admin','director')
  );

alter table public.notifications enable row level security;
drop policy if exists "notifications: owner read" on public.notifications;
drop policy if exists "notifications: owner insert" on public.notifications;
drop policy if exists "notifications: owner update" on public.notifications;
drop policy if exists "notifications: owner delete" on public.notifications;
create policy "notifications: owner read"
  on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications: owner insert"
  on public.notifications for insert
  with check (user_id = auth.uid());
create policy "notifications: owner update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "notifications: owner delete"
  on public.notifications for delete
  using (user_id = auth.uid());

alter table public.user_preferences enable row level security;
drop policy if exists "user_preferences: owner read" on public.user_preferences;
drop policy if exists "user_preferences: owner insert" on public.user_preferences;
drop policy if exists "user_preferences: owner update" on public.user_preferences;
drop policy if exists "user_preferences: owner delete" on public.user_preferences;
create policy "user_preferences: owner read"
  on public.user_preferences for select
  using (user_id = auth.uid());
create policy "user_preferences: owner insert"
  on public.user_preferences for insert
  with check (user_id = auth.uid());
create policy "user_preferences: owner update"
  on public.user_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "user_preferences: owner delete"
  on public.user_preferences for delete
  using (user_id = auth.uid());

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
