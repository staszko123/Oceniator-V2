create table if not exists public.user_drafts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('r','m','s')),
  payload         jsonb not null default '{}',
  saved_at        timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, assessment_type)
);

create index if not exists idx_user_drafts_user on public.user_drafts(user_id);

create table if not exists public.assessment_comments (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  body          text not null,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_assessment_comments_assessment on public.assessment_comments(assessment_id, created_at desc);

create table if not exists public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  type                text not null,
  title               text not null default '',
  message             text not null default '',
  read                boolean not null default false,
  related_entity_type text,
  related_entity_id   text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, read);

create table if not exists public.user_preferences (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  key        text not null,
  value      jsonb not null default 'null',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);


-- ──────────────────────────────────────────────────────────────────

create trigger trg_user_drafts_updated before update on public.user_drafts for each row execute function public.touch_updated_at();
create trigger trg_assessment_comments_updated before update on public.assessment_comments for each row execute function public.touch_updated_at();
create trigger trg_user_preferences_updated before update on public.user_preferences for each row execute function public.touch_updated_at();
alter table public.user_drafts enable row level security;
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

-- ── assessment_comments ──
alter table public.assessment_comments enable row level security;
create policy "assessment_comments: read with assessment access"
  on public.assessment_comments for select
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_comments.assessment_id
    )
  );
create policy "assessment_comments: scoped insert"
  on public.assessment_comments for insert
  with check (
    created_by = auth.uid()
    and public.my_role() in ('admin','director','leader','assessor')
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_comments.assessment_id
    )
  );
create policy "assessment_comments: owner or admin update"
  on public.assessment_comments for update
  using (created_by = auth.uid() or public.my_role() in ('admin','director'))
  with check (created_by = auth.uid() or public.my_role() in ('admin','director'));
create policy "assessment_comments: owner or admin delete"
  on public.assessment_comments for delete
  using (created_by = auth.uid() or public.my_role() in ('admin','director'));

-- ── notifications ──
alter table public.notifications enable row level security;
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

-- ── user_preferences ──
alter table public.user_preferences enable row level security;
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


-- ──────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.user_drafts, public.assessment_comments, public.notifications, public.user_preferences to authenticated;
notify pgrst, 'reload schema';
