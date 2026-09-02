-- Profiles hardening: closes a paywall bypass and an account-bricking path.
--
-- Verified against the live project on 2026-08-28:
--
--  1. PAYWALL BYPASS. Role `authenticated` held table-level UPDATE on profiles,
--     which covers every column including has_purchased. Postgres row policies
--     cannot restrict *which column* changed -- profiles_update_own only checks
--     `id = auth.uid()`. So any signed-in user could PATCH their own row with
--     {"has_purchased": true} and grant themselves premium. Five API routes
--     (requirePremium) and six pages gate on that column.
--     Proof: has_column_privilege('authenticated','profiles','has_purchased','UPDATE') = true.
--
--  2. ACCOUNT BRICKING. profiles_delete_own let a user delete their own profile
--     row. No foreign key references profiles (verified: 0 FKs), so nothing
--     cascades, and on_auth_user_created only fires on INSERT into auth.users --
--     it never re-fires. The account is then stuck forever: /redirect finds no
--     profile and sends them to /preferences, whose UPDATE matches zero rows.
--
--  3. DUPLICATE POLICIES. Seven policies where four suffice; three were exact
--     duplicates under older prose names.
--
-- Safe because: no application code writes has_purchased (it is read-only in all
-- of src/ and app/), and nothing inserts into profiles -- the SECURITY DEFINER
-- trigger handle_new_user() is the only creator and bypasses RLS entirely.
--
-- NOTE ON THE REVOKE PATTERN: a table-level grant covers all columns, and
-- `revoke update (col)` cannot carve a hole in it. The table-level privilege must
-- be dropped and an explicit column allow-list re-granted.

-- ---------------------------------------------------------------------------
-- 1. Replace blanket UPDATE with a column allow-list.
--    Excluded: has_purchased (money), id (identity), email (identity,
--    auth.users is authoritative), created_at (audit).
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (
  full_name, difficulty, age, archetype, level, xp, scenarios_completed,
  onboarding_completed, age_range_start, age_range_end, speaks_home_language,
  dating_foreigners, ethnicity, user_is_foreign, preferred_region,
  experience_level, primary_goal, secondary_region, secondary_archetype,
  tertiary_archetype, voice_language, preferred_language, timezone,
  week_start_day, curve_style,
  -- Added by 20260828_add_profiles_missing_columns.sql, which must run first.
  sandbox_settings, subscription_cancelled_at
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. anon is already blocked by RLS (auth.uid() is null), but it should never
--    have held write grants at all.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- 3. Nobody deletes a profile. See (2) above.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_delete_own" on public.profiles;
revoke delete on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Nobody inserts one either -- the trigger is the only creator. Leaving
--    INSERT open would reopen bypass (1) by another route: delete-then-insert,
--    or an insert carrying has_purchased => true.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
revoke insert on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- 5. Deduplicate. Keep the *_own names, drop the older prose-named twins.
--    Both pairs express the identical rule (auth.uid() = id).
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
