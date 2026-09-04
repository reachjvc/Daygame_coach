-- Aligning the timetrack tables with the shapes the application actually uses.
--
-- WHY THIS EXISTS AS A SECOND MIGRATION: 20260903120000 was written from the
-- feature list and then checked, field by field, against the TypeScript types
-- in src/timetrack/types.ts. Six things disagreed. Every one of them would have
-- surfaced as a failed insert the first time a real workspace was uploaded --
-- which is the worst possible moment to find out.
--
--   1. A budget alert's basis is 'estimate' or 'fixed_fee' in the app. The
--      check constraint said 'time' or 'amount'. Every alert would be rejected.
--   2. An approval belongs to a member and a week (`weekStart`), and can sit in
--      an 'open' state before it is submitted. The table wanted a start and end
--      date and had no 'open'.
--   3. A connected calendar has a colour, so its events are distinguishable.
--   4. An autotracker rule applies tags as well as a project.
--   5. A webhook log row is 'queued', 'sent' or 'skipped' -- not 'ok'/'failed'
--      -- and carries the payload that was sent.
--   6. A timeline block has a label and a "already turned into an entry" flag.
--
-- All tables are empty at this point, so nothing needs backfilling.

-- 1. Alert basis --------------------------------------------------------------
alter table public.timetrack_project_alerts drop constraint if exists timetrack_project_alerts_basis_check;
alter table public.timetrack_project_alerts
  add constraint timetrack_project_alerts_basis_check check (basis in ('estimate', 'fixed_fee'));

alter table public.timetrack_alert_events drop constraint if exists timetrack_alert_events_basis_check;
alter table public.timetrack_alert_events
  add constraint timetrack_alert_events_basis_check check (basis in ('estimate', 'fixed_fee'));
-- an alert the user has already seen should not shout a second time
alter table public.timetrack_alert_events add column if not exists read boolean not null default false;

-- 2. Approvals are per member, per week --------------------------------------
alter table public.timetrack_approvals add column if not exists member_id text;
alter table public.timetrack_approvals add column if not exists week_start date;
alter table public.timetrack_approvals add column if not exists decided_at timestamptz;
alter table public.timetrack_approvals alter column period_start drop not null;
alter table public.timetrack_approvals alter column period_end drop not null;
alter table public.timetrack_approvals alter column submitted_at drop not null;
alter table public.timetrack_approvals alter column submitted_at drop default;
alter table public.timetrack_approvals drop constraint if exists timetrack_approvals_status_check;
alter table public.timetrack_approvals
  add constraint timetrack_approvals_status_check
  check (status in ('open', 'submitted', 'approved', 'rejected'));
alter table public.timetrack_approvals drop constraint if exists timetrack_approvals_user_id_period_start_period_end_key;
create unique index if not exists timetrack_approvals_member_week_uniq
  on public.timetrack_approvals (user_id, member_id, week_start) where deleted_at is null;

-- 3. Calendar colour ----------------------------------------------------------
alter table public.timetrack_calendars add column if not exists color text not null default '#6b7280';

-- 4. Autotracker rules apply tags too ----------------------------------------
alter table public.timetrack_autotracker_rules add column if not exists tag_ids text[] not null default '{}';

-- 5. Webhook log --------------------------------------------------------------
alter table public.timetrack_webhook_log drop constraint if exists timetrack_webhook_log_status_check;
alter table public.timetrack_webhook_log
  add constraint timetrack_webhook_log_status_check check (status in ('queued', 'sent', 'skipped'));
alter table public.timetrack_webhook_log add column if not exists payload text not null default '';
alter table public.timetrack_webhook_log add column if not exists url text not null default '';

-- 6. Timeline blocks ----------------------------------------------------------
alter table public.timetrack_timeline add column if not exists label text not null default '';
alter table public.timetrack_timeline add column if not exists converted boolean not null default false;
alter table public.timetrack_timeline alter column title drop not null;
