-- The time tracker's storage. Until this runs, every tracked hour lives in one
-- browser's localStorage and is one "clear site data" away from gone.
--
-- WHAT THIS COVERS: every feature the tracker has, not a subset. Entries,
-- projects (with rate history, estimates, budgets, fixed fees, alerts), tasks,
-- clients, tags, favourites, saved reports, approvals, webhooks and their log,
-- autotracker rules, the timeline recorder, and per-user settings.
--
-- ROW LEVEL SECURITY, in plain words: Postgres itself refuses to hand a row to
-- anyone who is not that row's owner. Not the application code -- the database.
-- So a bug in a query, or someone using the public key from the browser
-- directly, still cannot read another person's time. Every table below gets it,
-- with the same four policies: you may read, create, change and delete your own
-- rows and nobody else's.
--
-- SOFT DELETES: every table carries `deleted_at` instead of really deleting.
-- Two reasons. A phone that was offline when you deleted something needs to be
-- told it is gone, or it helpfully uploads it again on reconnect. And an entry
-- deleted by accident is recoverable for as long as the row is there.
--
-- WHY IDS ARE `text` AND NOT `uuid`: the app makes its own ids, so an offline
-- device can create something without asking the server. New ids are uuids, but
-- a workspace carried over from the old counter era has ids like "101", and a
-- uuid column would reject the import outright -- which is exactly the moment
-- the user finds out, with their whole history in the balance.
--
-- WHY RATE HISTORY IS ITS OWN TABLE: an hour tracked in March at 90/h is worth
-- 90, even if the project's rate is 120 today. A single `rate` column on the
-- project silently rewrites history every time the rate changes.

-- ---------------------------------------------------------------------------
-- Shared: keep updated_at honest without every writer remembering to set it
-- ---------------------------------------------------------------------------
create or replace function public.timetrack_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workspace, clients, projects
-- ---------------------------------------------------------------------------
create table if not exists public.timetrack_workspaces (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Workspace',
  currency text not null default 'EUR',
  -- rounding, required fields, the lock date, approval switch, default rates:
  -- read and written as a whole, never filtered on, so a blob is right here
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.timetrack_clients (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_clients_name_not_blank check (length(btrim(name)) > 0)
);

create table if not exists public.timetrack_projects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  client_id text references public.timetrack_clients(id) on delete set null,
  name text not null,
  color text not null default '#e57cd8',
  active boolean not null default true,
  is_private boolean not null default false,
  billable boolean not null default false,
  currency text not null default 'EUR',
  -- the CURRENT rate, kept in step with timetrack_project_rates by the app for
  -- fast reads; the history table is the source of truth for money already earned
  rate numeric(12, 2),
  estimate_type text not null default 'hours' check (estimate_type in ('hours', 'monetary')),
  estimated_seconds integer check (estimated_seconds is null or estimated_seconds >= 0),
  estimated_amount numeric(12, 2) check (estimated_amount is null or estimated_amount >= 0),
  auto_estimates boolean not null default false,
  fixed_fee numeric(12, 2) check (fixed_fee is null or fixed_fee >= 0),
  is_template boolean not null default false,
  recurring boolean not null default false,
  recurring_period text check (recurring_period in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  recurring_start date,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'archived', 'done')),
  member_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_projects_name_not_blank check (length(btrim(name)) > 0),
  constraint timetrack_projects_dates_ordered check (end_date is null or start_date is null or end_date >= start_date),
  -- a recurring project without a period or a start cannot say when its period is
  constraint timetrack_projects_recurring_complete
    check (not recurring or (recurring_period is not null and recurring_start is not null))
);

create table if not exists public.timetrack_project_rates (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.timetrack_projects(id) on delete cascade,
  rate numeric(12, 2) not null check (rate >= 0),
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, effective_from)
);

create table if not exists public.timetrack_project_alerts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.timetrack_projects(id) on delete cascade,
  basis text not null check (basis in ('time', 'amount')),
  threshold integer not null check (threshold between 1 and 500),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, basis, threshold)
);

-- an alert that has already fired for this period, so it fires once, not hourly
create table if not exists public.timetrack_alert_events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.timetrack_projects(id) on delete cascade,
  basis text not null check (basis in ('time', 'amount')),
  threshold integer not null,
  period_start date not null,
  fired_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, basis, threshold, period_start)
);

create table if not exists public.timetrack_tasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.timetrack_projects(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  estimated_seconds integer check (estimated_seconds is null or estimated_seconds >= 0),
  rate numeric(12, 2),
  assignee_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_tasks_name_not_blank check (length(btrim(name)) > 0)
);

create table if not exists public.timetrack_tags (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_tags_name_not_blank check (length(btrim(name)) > 0)
);

-- ---------------------------------------------------------------------------
-- The tracked time itself
-- ---------------------------------------------------------------------------
create table if not exists public.timetrack_entries (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  project_id text references public.timetrack_projects(id) on delete set null,
  task_id text references public.timetrack_tasks(id) on delete set null,
  description text not null default '',
  billable boolean not null default false,
  started_at timestamptz not null,
  -- null means running. A running entry has no duration yet; it is computed
  -- from started_at, so the clock cannot disagree with the stored number.
  stopped_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  duration_only boolean not null default false,
  created_with text not null default 'web',
  -- set when the entry came from an imported calendar event, so re-importing
  -- the same meeting twice cannot create two entries
  source_event_id text,
  -- which device started a running entry: a laptop must not stop a phone's timer
  running_device_id text,
  shared_with text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_entries_stop_after_start check (stopped_at is null or stopped_at >= started_at),
  constraint timetrack_entries_duration_matches_stop
    check ((stopped_at is null) or (duration_seconds is not null))
);

create table if not exists public.timetrack_entry_tags (
  entry_id text not null references public.timetrack_entries(id) on delete cascade,
  tag_id text not null references public.timetrack_tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, tag_id)
);

create table if not exists public.timetrack_favorites (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  description text not null default '',
  project_id text references public.timetrack_projects(id) on delete cascade,
  task_id text references public.timetrack_tasks(id) on delete cascade,
  billable boolean not null default false,
  tag_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Reports, approvals, automation
-- ---------------------------------------------------------------------------
create table if not exists public.timetrack_saved_reports (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  name text not null,
  -- the filter set: dates, projects, tags, grouping, rounding. A blob is right
  -- here because it is read and written whole and never queried piecewise.
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_saved_reports_name_not_blank check (length(btrim(name)) > 0)
);

create table if not exists public.timetrack_approvals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'withdrawn')),
  note text,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_approvals_period_ordered check (period_end >= period_start),
  unique (user_id, period_start, period_end)
);

create table if not exists public.timetrack_webhooks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_webhooks_url_is_https check (url ~* '^https://')
);

create table if not exists public.timetrack_webhook_log (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  webhook_id text not null references public.timetrack_webhooks(id) on delete cascade,
  event text not null,
  status text not null check (status in ('ok', 'failed')),
  response_code integer,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.timetrack_autotracker_rules (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  match_text text not null,
  project_id text references public.timetrack_projects(id) on delete cascade,
  task_id text references public.timetrack_tasks(id) on delete cascade,
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_autotracker_match_not_blank check (length(btrim(match_text)) > 0)
);

create table if not exists public.timetrack_timeline (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_timeline_ordered check (ended_at >= started_at)
);

-- ---------------------------------------------------------------------------
-- Connected calendars. The events pulled from them are NOT stored: they are a
-- copy of somebody else's calendar and are re-fetched, so keeping them would
-- mean holding stale meeting titles for as long as the row lived.
-- ---------------------------------------------------------------------------
create table if not exists public.timetrack_calendars (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.timetrack_workspaces(id) on delete cascade,
  name text not null,
  source text not null check (source in ('ics_url', 'ics_file', 'google_api')),
  -- empty unless the user asked us to remember it. A secret iCal address is a
  -- credential: whoever holds the link can read the whole calendar, forever.
  ref text not null default '',
  enabled boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint timetrack_calendars_name_not_blank check (length(btrim(name)) > 0)
);

-- ---------------------------------------------------------------------------
-- Settings: one row per user. A blob is correct here and only here -- these are
-- preferences, read and written as a whole, never filtered or aggregated.
-- ---------------------------------------------------------------------------
create table if not exists public.timetrack_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes: the queries that actually run
-- ---------------------------------------------------------------------------
create index if not exists timetrack_entries_user_start_idx
  on public.timetrack_entries (user_id, started_at desc) where deleted_at is null;
create index if not exists timetrack_entries_project_idx
  on public.timetrack_entries (project_id) where deleted_at is null;
-- one running entry per device is found constantly: it is the timer bar
create index if not exists timetrack_entries_running_idx
  on public.timetrack_entries (user_id) where stopped_at is null and deleted_at is null;
-- re-importing a calendar must not duplicate meetings
create unique index if not exists timetrack_entries_source_event_uniq
  on public.timetrack_entries (user_id, source_event_id) where source_event_id is not null and deleted_at is null;
create index if not exists timetrack_entry_tags_tag_idx on public.timetrack_entry_tags (tag_id);
create index if not exists timetrack_projects_user_idx on public.timetrack_projects (user_id) where deleted_at is null;
create index if not exists timetrack_tasks_project_idx on public.timetrack_tasks (project_id) where deleted_at is null;
create index if not exists timetrack_tags_user_idx on public.timetrack_tags (user_id) where deleted_at is null;
create index if not exists timetrack_clients_user_idx on public.timetrack_clients (user_id) where deleted_at is null;
create index if not exists timetrack_project_rates_project_idx
  on public.timetrack_project_rates (project_id, effective_from desc);
create index if not exists timetrack_webhook_log_webhook_idx
  on public.timetrack_webhook_log (webhook_id, created_at desc);
create index if not exists timetrack_timeline_user_start_idx
  on public.timetrack_timeline (user_id, started_at desc) where deleted_at is null;
-- sync asks one question constantly: what changed since I last looked?
create index if not exists timetrack_calendars_user_idx
  on public.timetrack_calendars (user_id) where deleted_at is null;
create index if not exists timetrack_entries_updated_idx on public.timetrack_entries (user_id, updated_at desc);
create index if not exists timetrack_projects_updated_idx on public.timetrack_projects (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'timetrack_workspaces', 'timetrack_clients', 'timetrack_projects', 'timetrack_project_rates',
    'timetrack_project_alerts', 'timetrack_alert_events', 'timetrack_tasks', 'timetrack_tags',
    'timetrack_entries', 'timetrack_favorites', 'timetrack_saved_reports', 'timetrack_approvals',
    'timetrack_webhooks', 'timetrack_autotracker_rules', 'timetrack_timeline', 'timetrack_calendars',
    'timetrack_settings'
  ]
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.timetrack_touch_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: your own rows, and nobody else's, enforced by the database
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'timetrack_workspaces', 'timetrack_clients', 'timetrack_projects', 'timetrack_project_rates',
    'timetrack_project_alerts', 'timetrack_alert_events', 'timetrack_tasks', 'timetrack_tags',
    'timetrack_entries', 'timetrack_entry_tags', 'timetrack_favorites', 'timetrack_saved_reports',
    'timetrack_approvals', 'timetrack_webhooks', 'timetrack_webhook_log',
    'timetrack_autotracker_rules', 'timetrack_timeline', 'timetrack_calendars', 'timetrack_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);

    execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format(
      'create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
    execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end;
$$;
