-- Two columns the application has always written but the table never had.
--
-- Both fail today with `42703: column ... does not exist`, verified against the
-- live project. The integration tests do not catch it because they run against
-- tests/integration/schema.sql, a hand-maintained mirror in which both columns
-- are (incorrectly) declared.
--
--   sandbox_settings          -- src/db/settingsRepo.ts getSandboxSettings /
--                                updateSandboxSettings / resetSandboxSettings,
--                                wired to the settings page sandbox controls.
--   subscription_cancelled_at -- src/settings/settingsService.ts:260,284, the
--                                cancel / resume-subscription flow.
--
-- MUST BE APPLIED BEFORE 20260828_profiles_rls_hardening.sql, which names both
-- columns in its UPDATE allow-list. The filenames sort in that order on purpose.

alter table public.profiles
  add column if not exists sandbox_settings jsonb,
  add column if not exists subscription_cancelled_at timestamptz;

comment on column public.profiles.sandbox_settings is
  'Per-user scenario sandbox preferences. Merged over DEFAULT_SANDBOX_SETTINGS in src/scenarios/config.';
comment on column public.profiles.subscription_cancelled_at is
  'When the user asked to cancel. Access is still governed by has_purchased, never by this column.';
