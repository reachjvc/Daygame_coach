-- The one thing, and the written answers that will follow it.
--
-- WHY THIS TABLE EXISTS: the one thing lived as a string inside a blob in one
-- browser, with no date on it and no history. The tracking page's header showed
-- a DIFFERENT field that also called itself "the one thing", so writing your
-- answer in the step named after it changed nothing on the page that displayed
-- it. This table is the source of truth: what you write goes here, and every
-- screen that shows your one thing reads the newest row rather than a copy.
--
-- APPEND ON WRITE, NEVER UPDATE. Changing your one thing adds a row; the
-- previous one keeps the moment it was written. There is deliberately no UPDATE
-- policy below, so an edit-in-place that silently rewrites history is not
-- expressible. Deleting IS allowed on any of your own rows — the history is for
-- your benefit, and you can drop anything you no longer want to look at.
--
-- ONE INSTANT FOR "WHEN IT WAS WRITTEN", ONE DATE FOR "WHEN IT RUNS OUT".
-- `answered_at` is a timestamptz because an instant is absolute and cannot be
-- wrong. `due_on` is a real date because a deadline IS a calendar day — "by the
-- first of December" — and it is supplied by the app, computed in the user's
-- timezone. It has NO DEFAULT on purpose: `default current_date` would be the
-- database's UTC guess, which is exactly the bug that made weekly goal counters
-- roll over on the wrong day.
--
-- PRIVACY: this holds sentences people write about their own lives — what they
-- are quitting, what they are afraid of, who they want to become. It is
-- readable with the service-role key for backend analysis, so it belongs in the
-- privacy policy and must never reach logs or the client bundle.

create table if not exists public.life_answers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Which question this answers. Its own namespace, deliberately NOT the same
  -- one as the field-report catalogue's session questions. Locked to one value
  -- until another written answer is deliberately moved here.
  answer_key   text not null check (answer_key in ('one_thing')),

  -- What they wrote. Never blank; capped so a paste cannot put a novel in every
  -- backup from here on.
  body         text not null check (length(btrim(body)) between 1 and 2000),

  -- When they wrote it. Server clock: an instant has no timezone.
  answered_at  timestamptz not null default now(),

  -- The day this one runs until. Supplied by the app in the user's timezone,
  -- either chosen on the form or defaulted to 90 days out. No DB default.
  due_on       date not null,

  created_at   timestamptz not null default now()
);

-- "What is my one thing" is `order by answered_at desc limit 1` for one user.
create index if not exists life_answers_current_idx
  on public.life_answers (user_id, answer_key, answered_at desc);

alter table public.life_answers enable row level security;

do $$ begin
  create policy "read own life answers" on public.life_answers
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "write own life answers" on public.life_answers
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "delete own life answers" on public.life_answers
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- No UPDATE policy, deliberately. The absence is the enforcement: an answer
-- cannot be rewritten in place, only replaced by a newer one or deleted.

comment on table public.life_answers is
  'Dated written answers from the Life Mastery flow. Current = newest row. Insert and delete only; never updated.';
