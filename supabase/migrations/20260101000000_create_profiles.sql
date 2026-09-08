-- The `profiles` table, its row rules, and the trigger that fills it in on signup.
--
-- WHY THIS FILE IS DATED BEFORE EVERYTHING ELSE
--
-- `profiles` is the oldest table in the project and it has never had a
-- migration: it was made by hand in the Supabase dashboard, so the repository
-- could not rebuild its own core table. A fresh project, a staging environment
-- or a new machine had nothing to create it from, while later migrations
-- (20260828140000, 20260828140001, 20260907100000, 20260908160000) all assume
-- it exists. Migrations run in filename order, so this one is dated 2026-01-01
-- to sit ahead of them. It is new work about an old table, not a record of
-- something done in January.
--
-- WHAT THE COLUMN LIST IS, EXACTLY
--
-- The 31 columns below are the table as it stood BEFORE 20260907100000, which
-- adds three more (weight_unit, bar_weight_kg, smallest_plate_kg) with their
-- CHECK constraints and their column grant. On a fresh database this file runs
-- first and that one completes it, giving the 34 columns the live table has
-- today. They are deliberately not duplicated here: two files declaring the
-- same column is how the two drift apart.
--
-- Read out of the live database on 2026-09-08 through the Supabase Management
-- API, then re-verified column by column. Not reconstructed from the
-- application's TypeScript types, which describe what the code expects rather
-- than what the database has -- the two had already drifted (see
-- 20260828140000, which added two columns the code was writing to and the
-- table did not have).
--
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
--
-- It does not touch privileges. An earlier draft revoked UPDATE at table level
-- and re-granted a column allow-list, copying 20260828140001. That was wrong
-- and would have caused real damage on the live database: revoking a privilege
-- at table level ALSO wipes every per-column grant of it, and the draft's list
-- was three columns short of what live holds -- so applying it would have
-- silently removed the ability to save the gym settings, with no error, on a
-- database where 20260907100000 has already run and will not run again.
-- Privileges are owned by 20260828140001 (and extended by 20260907100000),
-- both of which sort after this file, so a from-scratch database still ends up
-- locked down. One owner per rule.
--
-- SAFE TO RUN AGAINST THE LIVE DATABASE: every statement is guarded, and the
-- only thing it could change is creating something already there.

-- TRANSACTION: left to the runner, like the other 37 migrations here.
--
-- An earlier draft wrapped this file in `begin; ... commit;` so it would not
-- depend on the runner. Checked before keeping it: NO other migration in this
-- repo does that, and `supabase db push` already runs each file in one
-- transaction together with its own bookkeeping insert. A nested `begin` only
-- warns, but the matching `commit` would close the RUNNER's transaction early
-- and leave that insert outside it. Matching the convention is safer than
-- defending against a runner that already does the right thing.
--

-- ---------------------------------------------------------------------------
-- 1. The table.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                        uuid        not null,
  email                     text        not null,
  full_name                 text,
  has_purchased             boolean     default false,
  created_at                timestamptz default now(),
  difficulty                text        default 'beginner'::text,
  age                       integer,
  archetype                 text,
  level                     integer     default 1,
  xp                        integer     default 0,
  scenarios_completed       integer     default 0,
  onboarding_completed      boolean     default false,
  age_range_start           integer,
  age_range_end             integer,
  speaks_home_language      boolean,
  dating_foreigners         boolean,
  ethnicity                 text,
  user_is_foreign           boolean     default false,
  preferred_region          text,
  experience_level          text,
  primary_goal              text,
  secondary_region          text,
  secondary_archetype       text,
  tertiary_archetype        text,
  voice_language            text        default 'en-US'::text,
  preferred_language        text,
  timezone                  text        not null default 'UTC'::text,
  week_start_day            smallint    not null default 1,
  curve_style               text        not null default 'zen'::text,
  sandbox_settings          jsonb,
  subscription_cancelled_at timestamptz,

  constraint profiles_pkey primary key (id),

  -- Deleting the auth user removes the profile. Verified 2026-09-08: no other
  -- table anywhere has a foreign key pointing at public.profiles -- every other
  -- table references auth.users directly.
  constraint profiles_id_fkey foreign key (id)
    references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security.
--
-- The browser talks to Supabase with a key anyone can read out of the page, so
-- the database itself decides who sees what. Own row only, for reads and
-- writes. There is deliberately no INSERT policy and no DELETE policy: the
-- trigger below is the only thing that creates a profile, and nothing may
-- remove one -- a user who deleted their own row could never get it back,
-- because the trigger fires on signup and never again, which bricked the
-- account.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. A profile appears the moment an account does.
--
-- SECURITY DEFINER so it bypasses row security -- there is no INSERT policy, by
-- design, and this is the only creator. ON CONFLICT DO NOTHING makes a repeated
-- signup event harmless. `search_path` is pinned, so the function cannot be
-- redirected at a different schema's `profiles`.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- CREATED ONLY IF ABSENT, AND NEVER DROPPED FIRST. This is not tidiness.
--
-- `auth.users` is owned by `supabase_auth_admin`. The role these migrations run
-- as is `postgres`, which is not a superuser and not a member of that role, so
-- `drop trigger ... on auth.users` fails with 42501 "must be owner of relation
-- users" and takes the whole migration down with it. `if exists` does not help:
-- the trigger IS there, so the statement runs and errors.
--
-- The asymmetry is the useful part, and it is measured: postgres DOES hold the
-- TRIGGER privilege on auth.users, so it may CREATE this trigger but may not
-- DROP it. That is how the trigger came to exist in the first place. So: look
-- first, and only create.
--
-- The second reason not to drop-then-create: between the two statements there
-- is a moment when a signup would produce an account with no profile row, and
-- nothing would ever create one -- exactly the bricked account described above.
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created'
      and not t.tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end
$$;
