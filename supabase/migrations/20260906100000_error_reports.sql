-- Somewhere for crashes to go.
--
-- WHAT HAPPENS TODAY: nothing. There is not one error boundary in the app, so a
-- page that throws shows the browser's error screen and no record of it exists
-- anywhere. You find out when somebody tells you, or you never find out.
--
-- WHO CAN TOUCH THIS TABLE: only code holding the server's secret key. Row
-- Level Security is on and there are NO policies, which is the tightest
-- setting: the public key that anybody can read out of the browser cannot see
-- a single row, or write one. The same pattern already protects
-- `waitlist_emails`, `plan_snapshots` and `beta_invites` -- verified in the
-- live database before writing this.
--
-- WHY NOT LET THE BROWSER WRITE DIRECTLY: it would need a policy permitting
-- anyone to insert. Anyone who read the public key could then fill this table
-- with junk, or with a million rows. Reports go through /api/errors instead,
-- which is rate limited and strips anything private.
--
-- WHAT IS DELIBERATELY NOT IN HERE: anything a person typed. A crash report
-- should tell you the shape of a fault, not the contents of somebody's
-- afternoon. The stripping happens in `errorScrubService` on the way in.

create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  -- null when the crash happened before sign-in. Those are the ones nobody
  -- ever reports by hand, so they matter most.
  user_id uuid references auth.users(id) on delete set null,

  -- what makes two reports "the same fault": the message plus the first line of
  -- the stack, hashed. Repeats bump a counter instead of adding rows, so one
  -- broken render loop cannot write ten thousand of them.
  fingerprint text not null,
  message text not null,
  stack text,
  component_stack text,

  -- the path only, never the query string: that is where reset tokens live
  route text not null default '',
  user_agent text not null default '',
  -- which build it happened on, so a fixed fault stops counting
  release text not null default '',
  severity text not null default 'error' check (severity in ('error', 'warning')),

  seen_count integer not null default 1 check (seen_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  constraint error_reports_message_not_blank check (length(btrim(message)) > 0),
  -- a stack is capped rather than refused: a truncated trace still names the file
  constraint error_reports_stack_bounded check (stack is null or length(stack) <= 8000)
);

-- one row per fault per build, which is what makes `seen_count` meaningful
create unique index if not exists error_reports_fingerprint_release_uniq
  on public.error_reports (fingerprint, release);

-- the two questions ever asked of this table: what broke recently, and what
-- broke most
create index if not exists error_reports_recent_idx on public.error_reports (last_seen_at desc);
create index if not exists error_reports_frequent_idx on public.error_reports (seen_count desc);

alter table public.error_reports enable row level security;
-- deliberately no policies: server-only, as above.

comment on table public.error_reports is
  'Crash reports. RLS on with NO policies: written and read only by the service role via /api/errors and the admin page. Never contains user-entered text.';

-- ---------------------------------------------------------------------------
-- Not growing forever
--
-- A crash table is the kind that quietly becomes the biggest thing in the
-- database. Two limits, because either one alone has a hole: age handles the
-- normal case, and the row cap handles a bad night that produces more reports
-- in a day than the age limit would clear in a month.
-- ---------------------------------------------------------------------------
create or replace function public.prune_error_reports()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  batch integer;
begin
  delete from public.error_reports where last_seen_at < now() - interval '30 days';
  get diagnostics removed = row_count;

  -- and a hard ceiling, oldest first
  with excess as (
    select id from public.error_reports
    order by last_seen_at desc
    offset 10000
  )
  delete from public.error_reports where id in (select id from excess);
  get diagnostics batch = row_count;

  return removed + batch;
end;
$$;

comment on function public.prune_error_reports is
  'Deletes crash reports older than 30 days, then trims to the newest 10,000. Scheduled nightly by pg_cron.';
