-- ---------------------------------------------------------------------------
-- DOES THE APP KNOW WHAT DAY IT IS FOR YOU, OR IS IT GUESSING?
--
-- `profiles.timezone` is NOT NULL DEFAULT 'UTC'. That default is not a
-- timezone anybody lives in: it is the app saying "nobody has told me". But
-- the column cannot say which of the two it is holding, so every screen that
-- files a workout by date treats a brand-new account as though it had chosen
-- to live on UTC.
--
-- What that costs, in plain language: somebody signs up in Copenhagen at
-- half past eleven at night, logs the session they just did, and the app
-- files it as tomorrow's — and the week strip says they have trained on a day
-- they have not reached yet. Nothing on screen explains it, and the fix
-- (Settings › timezone) is somewhere they have no reason to go.
--
-- This migration adds the missing fact. `timezone_source` says where the
-- value came from:
--
--   signup_default  nobody has said — treat "today" as unknown and say so
--   detected        the browser told us, once, without being asked
--   chosen          a person typed it into Settings
--
-- Backfill: a stored zone that is not UTC can only have got there by somebody
-- choosing it (onboarding writes the detected zone, and Settings writes a
-- typed one — both are deliberate), so those become 'chosen'. A UTC value is
-- treated as never set. That is deliberately conservative in one direction:
-- an account that genuinely chose UTC gets asked once more, which costs one
-- no-op write. The other direction would be worse — an account that never set
-- one would be marked as having chosen, and stay silently wrong forever.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists timezone_source text not null default 'signup_default'
  check (timezone_source in ('signup_default', 'detected', 'chosen'));

update public.profiles
set timezone_source = 'chosen'
where timezone is not null and timezone <> 'UTC' and timezone_source = 'signup_default';

-- ---------------------------------------------------------------------------
-- The column allow-list from 20260828140001_profiles_rls_hardening.sql.
--
-- A table-level UPDATE grant was replaced there by an explicit list, so a new
-- column is NOT writable until it is named. This is the only addition, and it
-- is the same trust level as `timezone` beside it: which zone you are in is
-- yours to set. Row-level security is unchanged — the existing own-row policy
-- is still what decides whose row you may touch, and this grant does not widen
-- it to anybody else's.
-- ---------------------------------------------------------------------------
grant update (timezone_source) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- THE SIGNUP TRIGGER LEARNS THE ZONE THE BROWSER ALREADY KNEW.
--
-- The sign-up form can read the browser's zone for free. It was throwing it
-- away, so every account started on UTC and stayed there until somebody found
-- Settings.
--
-- VALIDATED AGAINST pg_timezone_names, AND THIS IS NOT OPTIONAL. The value
-- arrives in `raw_user_meta_data`, which is whatever the client sent — a
-- tampered or simply malformed signup would otherwise write any string into
-- `profiles.timezone`. `toZonedDate` in the app falls back to UTC for an
-- unrecognised zone, silently, on every call — so a bad value would produce
-- exactly the fault this migration exists to remove, while the column claimed
-- the zone was known. An unknown name leaves both defaults in place.
--
-- Still `security definer` with a pinned `search_path`, still ON CONFLICT DO
-- NOTHING, so a repeated signup event stays harmless. The trigger itself is
-- not touched — `auth.users` is owned by `supabase_auth_admin` and cannot be
-- re-triggered from here.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  claimed text := new.raw_user_meta_data->>'timezone';
  known boolean := claimed is not null
    and exists (select 1 from pg_timezone_names where name = claimed);
begin
  insert into public.profiles (id, email, full_name, timezone, timezone_source)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case when known then claimed else 'UTC' end,
    case when known then 'detected' else 'signup_default' end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

comment on column public.profiles.timezone_source is
  'Where profiles.timezone came from: signup_default (nobody has said — "today" is a guess and screens say so), detected (the browser, unasked), chosen (typed into Settings). Written only by settingsRepo.updateTimezone and by handle_new_user.';
