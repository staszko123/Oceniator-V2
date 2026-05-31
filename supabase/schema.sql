-- ══════════════════════════════════════════════════════════════════
-- OCENIATOR — Supabase schema
-- Wklej w: Supabase Dashboard → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 0. ROZSZERZENIA
-- ──────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ──────────────────────────────────────────────────────────────────
-- 1. PROFILE UŻYTKOWNIKÓW
--    Powiązane z auth.users (Supabase Auth → Atlassian SSO).
--    Rola i zakres lidera przypisywane przez admina.
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  email         text not null default '',
  role          text not null default 'viewer'
                  check (role in ('admin','director','leader','assessor','viewer')),
  leader_scope  text,          -- imię i nazwisko lidera (dla roli leader/assessor)
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Profile użytkowników — jeden wiersz na konto Atlassian. Rola i zakres zarządzane przez admina.';

comment on column public.profiles.leader_scope is
  'Pełne imię i nazwisko lidera. Assessments filtrowane są po tym polu dla ról leader i assessor.';


-- ──────────────────────────────────────────────────────────────────
-- 2. SŁOWNIKI ORGANIZACYJNE
-- ──────────────────────────────────────────────────────────────────

create table if not exists public.departments (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.positions (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.specialists (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null unique,
  leader_scope   text not null default '',   -- imię i nazwisko lidera-opiekuna
  department     text not null default '',
  position       text not null default '',
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.specialists.leader_scope is
  'Powiązanie ze scope lidera — ten sam string co profiles.leader_scope.';


-- ──────────────────────────────────────────────────────────────────
-- 3. OKRESY ROZLICZENIOWE
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.periods (
  id         uuid primary key default uuid_generate_v4(),
  code       text not null,        -- np. 'P1'
  name       text not null,        -- np. 'Okres 1'
  date_from  text not null,        -- 'MM-DD', np. '01-01'
  date_to    text not null,        -- 'MM-DD', np. '04-30'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.periods (code, name, date_from, date_to, sort_order) values
  ('P1', 'P1', '01-01', '04-30', 1),
  ('P2', 'P2', '05-01', '08-31', 2),
  ('P3', 'P3', '09-01', '12-31', 3)
on conflict do nothing;


-- ──────────────────────────────────────────────────────────────────
-- 4. CELE JAKOŚCIOWE
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id                   uuid primary key default uuid_generate_v4(),
  calls_per_period     int not null default 9,
  mails_per_period     int not null default 9,
  systems_per_period   int not null default 9,
  min_avg              int not null default 92,   -- % minimalny średni wynik
  great_share          int not null default 60,   -- % udział ocen "bardzo dobry"
  updated_at           timestamptz not null default now(),
  updated_by           uuid references public.profiles(id)
);

-- Jeden wiersz (singleton) — upsert po stałym id
insert into public.goals (id) values ('00000000-0000-0000-0000-000000000001')
on conflict do nothing;


-- ──────────────────────────────────────────────────────────────────
-- 5. KARTY OCENY (główna tabela)
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.assessments (
  id             uuid primary key default uuid_generate_v4(),

  -- Dane podstawowe
  type           text not null check (type in ('r','m','s')),
                 -- r = rozmowa, m = mail, s = system
  spec           text not null default '',   -- imię i nazwisko specjalisty
  stand          text not null default '',   -- stanowisko
  dzial          text not null default '',   -- dział
  oce            text not null default '',   -- oceniający (leader_scope)
  assessment_date date not null,
  period         text not null default '',   -- wyliczony okres, np. 'P1 2025'

  -- Wyniki
  avg_final      int not null default 0,     -- wynik końcowy %
  rating         text not null default ''    -- 'great' | 'good' | 'below'
                   check (rating in ('','great','good','below')),

  -- Scores i dane szczegółowe (JSONB — zachowana pełna struktura z formularzy)
  scores         jsonb not null default '{}',
  gold           jsonb not null default '[]',   -- indeksy złotych kontaktów
  contact_ids    jsonb not null default '[]',   -- ID kontaktów
  notes          jsonb not null default '{}',   -- notatki per kryterium
  gold_desc      text not null default '',
  contact_count  int not null default 3,

  -- Status
  status         text not null default 'submitted'
                   check (status in ('submitted','review','approved','archived')),
  status_history jsonb not null default '[]',
  archived_at    timestamptz,

  -- Metadane
  created_by     uuid references public.profiles(id),
  leader_scope   text not null default '',   -- kopia scope w momencie zapisu (do RLS)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.assessments is
  'Karty oceny jakości — odpowiednik tablicy registry z localStorage.';

comment on column public.assessments.scores is
  'Surowe wyniki per sekcja/kryterium. Struktura: {"s1":{"c1":100,"c2":80},...}';

comment on column public.assessments.leader_scope is
  'Skopiowany leader_scope z profilu oceniającego w momencie zapisu. '
  'Używany przez RLS — nie zmienia się gdy lider zmieni scope.';

-- Indeksy dla typowych zapytań
create index if not exists idx_assessments_spec         on public.assessments(spec);
create index if not exists idx_assessments_oce          on public.assessments(oce);
create index if not exists idx_assessments_leader_scope on public.assessments(leader_scope);
create index if not exists idx_assessments_date         on public.assessments(assessment_date);
create index if not exists idx_assessments_status       on public.assessments(status);
create index if not exists idx_assessments_type         on public.assessments(type);


-- ──────────────────────────────────────────────────────────────────
-- 6. HISTORIA ZMIAN W PANELU ADMIN
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.admin_history (
  id          uuid primary key default uuid_generate_v4(),
  description text not null,
  changed_by  uuid references public.profiles(id),
  changed_at  timestamptz not null default now()
);

create index if not exists idx_admin_history_at on public.admin_history(changed_at desc);

create table if not exists public.user_drafts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('r','m','s')),
  payload         jsonb not null default '{}',
  saved_at        timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, assessment_type)
);

create index if not exists idx_user_drafts_user on public.user_drafts(user_id);

create table if not exists public.assessment_comments (
  id            uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  body          text not null,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_assessment_comments_assessment on public.assessment_comments(assessment_id, created_at desc);

create table if not exists public.notifications (
  id                  uuid primary key default uuid_generate_v4(),
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
-- 7. TRIGGER — updated_at automatycznie
-- ──────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger trg_specialists_updated
  before update on public.specialists
  for each row execute function public.touch_updated_at();

create trigger trg_user_drafts_updated
  before update on public.user_drafts
  for each row execute function public.touch_updated_at();

create trigger trg_assessment_comments_updated
  before update on public.assessment_comments
  for each row execute function public.touch_updated_at();

create trigger trg_user_preferences_updated
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();

create or replace function public.guard_assessment_write()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.leader_scope = coalesce(nullif(new.leader_scope, ''), public.current_leader_scope(), '');
    new.created_at = coalesce(new.created_at, now());
  else
    new.created_by = old.created_by;
    new.leader_scope = old.leader_scope;
    new.created_at = old.created_at;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_assessments_write_guard
  before insert or update on public.assessments
  for each row execute function public.guard_assessment_write();


-- ──────────────────────────────────────────────────────────────────
-- 8. TRIGGER — nowy użytkownik → profil (po zalogowaniu przez Atlassian)
-- ──────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    coalesce(new.email, ''),
    'viewer'   -- domyślna rola; admin przypisuje właściwą ręcznie
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ──────────────────────────────────────────────────────────────────
-- 9. HELPER — rola bieżącego użytkownika (używany w RLS)
-- ──────────────────────────────────────────────────────────────────
create or replace function public.current_role_name()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_leader_scope()
returns text language sql stable security definer as $$
  select leader_scope from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_profile_full_name()
returns text language sql stable security definer as $$
  select full_name from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_profile_email()
returns text language sql stable security definer as $$
  select email from public.profiles where id = auth.uid() and is_active = true;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────

-- ── profiles ──
alter table public.profiles enable row level security;

create policy "profiles: własny profil zawsze widoczny"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: admin widzi wszystkich"
  on public.profiles for select
  using (public.current_role_name() = 'admin');

create policy "profiles: admin edytuje"
  on public.profiles for update
  using (public.current_role_name() = 'admin');

-- ── specialists ──
alter table public.specialists enable row level security;

create policy "specialists: wszyscy zalogowani czytają"
  on public.specialists for select
  using (auth.uid() is not null);

create policy "specialists: admin i dyrektor piszą"
  on public.specialists for all
  using (public.current_role_name() in ('admin','director'));

-- ── departments / positions ──
alter table public.departments enable row level security;
create policy "departments: wszyscy czytają"
  on public.departments for select using (auth.uid() is not null);
create policy "departments: admin pisze"
  on public.departments for all using (public.current_role_name() = 'admin');

alter table public.positions enable row level security;
create policy "positions: wszyscy czytają"
  on public.positions for select using (auth.uid() is not null);
create policy "positions: admin pisze"
  on public.positions for all using (public.current_role_name() = 'admin');

-- ── periods ──
alter table public.periods enable row level security;
create policy "periods: wszyscy czytają"
  on public.periods for select using (auth.uid() is not null);
create policy "periods: admin pisze"
  on public.periods for all using (public.current_role_name() = 'admin');

-- ── goals ──
alter table public.goals enable row level security;
create policy "goals: wszyscy zalogowani czytają"
  on public.goals for select using (auth.uid() is not null);
create policy "goals: admin i dyrektor edytują"
  on public.goals for update using (public.current_role_name() in ('admin','director'));

-- ── assessments ──
alter table public.assessments enable row level security;

-- Admin i dyrektor: pełny widok
create policy "assessments: admin pełny dostęp"
  on public.assessments for all
  using (public.current_role_name() = 'admin');

create policy "assessments: dyrektor czyta wszystko"
  on public.assessments for select
  using (public.current_role_name() = 'director');

-- Lider: widzi i edytuje tylko swój zakres
create policy "assessments: lider swój zakres"
  on public.assessments for all
  using (
    public.current_role_name() = 'leader'
    and leader_scope = public.current_leader_scope()
  );

-- Oceniający: widzi i tworzy karty w swoim zakresie
create policy "assessments: oceniający swój zakres"
  on public.assessments for all
  using (
    public.current_role_name() = 'assessor'
    and leader_scope = public.current_leader_scope()
  );

-- Viewer: tylko odczyt swojego zakresu
create policy "assessments: viewer odczyt"
  on public.assessments for select
  using (
    public.current_role_name() = 'viewer'
    and status = 'approved'
    and (
      spec = public.current_profile_full_name()
      or spec = public.current_profile_email()
    )
  );

-- ── admin_history ──
alter table public.admin_history enable row level security;
create policy "admin_history: admin i dyrektor czytają"
  on public.admin_history for select
  using (public.current_role_name() in ('admin','director'));
create policy "admin_history: admin i dyrektor wstawiaja"
  on public.admin_history for insert
  with check (public.current_role_name() in ('admin','director'));

-- ── user_drafts ──
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
    and public.current_role_name() in ('admin','director','leader','assessor')
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_comments.assessment_id
    )
  );
create policy "assessment_comments: owner or admin update"
  on public.assessment_comments for update
  using (created_by = auth.uid() or public.current_role_name() in ('admin','director'))
  with check (created_by = auth.uid() or public.current_role_name() in ('admin','director'));
create policy "assessment_comments: owner or admin delete"
  on public.assessment_comments for delete
  using (created_by = auth.uid() or public.current_role_name() in ('admin','director'));

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
-- GOTOWE
-- Następny krok: Supabase Dashboard → Authentication → Providers
--   → dodaj "Atlassian" jako Custom OAuth 2.0
-- ──────────────────────────────────────────────────────────────────
