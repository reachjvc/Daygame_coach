-- Chapters: what you committed to, separate from how you worded it.
--
-- WHY THIS EXISTS: `life_answers` could not tell a correction from a new
-- commitment. Every row carried its own deadline and no row knew what came
-- before it, so fixing a typo in "quit weed for 100 days" started the clock
-- again — and the request was the opposite: "when I change something, I would
-- still want it to be the tracking from the initial first date."
--
-- A CHAPTER owns the dates. A VERSION owns the words.
--   * Amending your wording adds a version to the open chapter. The dates do not
--     move, so no countdown, streak or "since" date is disturbed.
--   * Starting a new one opens a new chapter, with its own start and deadline.
--
-- NO "IS THIS THE CURRENT ONE" COLUMN, deliberately, and no `closed_at`. The
-- open chapter is the newest one, worked out on read. A stored flag is a second
-- fact that can disagree with the first, which is the bug this whole area exists
-- to stop repeating — and it would need an UPDATE policy, so the absence of the
-- flag is also the absence of a way to rewrite history in place.
--
-- ONE INSTANT FOR ORDERING, ONE DATE FOR THE CALENDAR. `opened_at` is a
-- timestamptz because an instant is absolute and orders two chapters started on
-- the same day. `started_on` and `due_on` are real dates because "when does this
-- run from and until" is a question about the user's own calendar; both are
-- supplied by the app, computed in the user's timezone. No database defaults on
-- either: `current_date` is the server's UTC guess, which is the bug that rolled
-- weekly counters over on the wrong day.

create table if not exists public.life_chapters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Which statement this is a chapter of. 'one_thing' today; the same table
  -- holds the north star and the rest when they move.
  statement_key text not null check (statement_key in ('one_thing')),

  -- The day tracking runs from. NEVER changes once set — that is the point.
  started_on   date not null,
  -- The day it runs until.
  due_on       date not null,

  -- Ordering. Two chapters can share a calendar day; they cannot share an instant.
  opened_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),

  -- MOVING A DEADLINE IS NOT STARTING OVER.
  --
  -- "Quit weed for 100 days" that becomes 120 days is the same commitment with a
  -- later end, and the clock must still run from the day it began. There is no
  -- UPDATE policy here on purpose, so the deadline cannot be edited in place;
  -- instead a new chapter is opened that CONTINUES the old one and carries its
  -- `started_on` across. Null means a genuinely fresh commitment.
  --
  -- An explicit column rather than "the start dates match": two separate
  -- commitments begun on the same day would be indistinguishable from a
  -- continuation, and a history that quietly merges two seasons into one is
  -- worse than an extra column.
  --
  -- DELIBERATELY NOT A FOREIGN KEY. `references … on delete set null` reads
  -- better and does not work: nulling the column is an UPDATE, the append-only
  -- trigger below refuses every UPDATE including that one, and so deleting any
  -- chapter that a later one continued would fail forever. `on delete cascade`
  -- is worse — deleting one old chapter out of your history would silently take
  -- the current one with it.
  --
  -- So: a plain id. A dangling one means "the chapter this continued has been
  -- deleted", which is true and reads correctly — this chapter was still an
  -- extension. Nothing dereferences it; `extended` is `continues_id is not null`.
  continues_id uuid,

  -- Same rule as life_answers, measured from the chapter's own start rather
  -- than from a UTC instant, so no day of slack is needed here.
  constraint life_chapters_dates_sane check (
    due_on >= started_on and due_on <= started_on + 1830
  )
);

-- "What am I on now" is: newest chapter for one user and one statement.
create index if not exists life_chapters_current_idx
  on public.life_chapters (user_id, statement_key, opened_at desc);

alter table public.life_chapters enable row level security;

do $$ begin
  create policy "read own chapters" on public.life_chapters
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "open own chapters" on public.life_chapters
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "delete own chapters" on public.life_chapters
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- No UPDATE policy, deliberately, exactly as on life_answers.
--
-- AND A TRIGGER, because a policy is not the guarantee. Learned here on
-- 2026-08-27: RLS constrains the app's authenticated client and nothing else, so
-- the service-role key and the SQL editor walk straight past it — an `update`
-- run as a probe destroyed a real answer a real person had written ninety
-- seconds earlier, and the text was not recoverable. A chapter's dates are what
-- every countdown, streak and "running since" is measured against, so the same
-- binding applies here: correcting a chapter is deleting it and opening another.
create or replace function public.life_chapters_reject_update()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'life_chapters is append-only: delete the chapter and open a new one (attempted update on %)', old.id
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists life_chapters_no_update on public.life_chapters;

create trigger life_chapters_no_update
  before update on public.life_chapters
  for each row execute function public.life_chapters_reject_update();

comment on function public.life_chapters_reject_update() is
  'Append-only enforcement for life_chapters. Binds the service role too, unlike an RLS policy.';

comment on table public.life_chapters is
  'What you committed to, and the dates it runs between. The words live in life_answers, one or more versions per chapter. Current = newest chapter; never a stored flag.';


-- ---------------------------------------------------------------------------
-- life_answers becomes the versions.
-- ---------------------------------------------------------------------------

-- The one thing's supports move onto the account with it. They are not separate
-- statements: the why, the cost, the identity and the values are ABOUT the
-- current one thing, so they share its chapter and start again when it does.
alter table public.life_answers drop constraint if exists life_answers_answer_key_check;
alter table public.life_answers add constraint life_answers_answer_key_check
  check (answer_key in ('one_thing', 'one_why', 'one_cost', 'one_identity', 'one_values'));

alter table public.life_answers
  add column if not exists chapter_id uuid references public.life_chapters(id) on delete cascade;

-- BACKFILL: one chapter per existing row.
--
-- Honest about what cannot be known: before chapters existed, every save wrote a
-- row with its own deadline, so a correction and a new commitment are
-- indistinguishable in the data that is already there. One chapter per row is
-- the reading that loses nothing — it keeps every deadline exactly as it was
-- recorded. It may split what was really one commitment into two chapters for
-- somebody who fixed a typo, and there is no way to tell from here.
-- THE ONE TIME THE APPEND-ONLY GUARD IS STOOD DOWN, and it is put back inside
-- the same block whatever happens. `life_answers` carries a trigger that refuses
-- every UPDATE — including from the service role, which is the point of it —
-- and giving an existing row its chapter is an update. The exception handler
-- re-arms the trigger and re-raises, so a backfill that dies halfway cannot
-- leave the table writable behind it.
do $$
declare r record; new_id uuid;
begin
  alter table public.life_answers disable trigger life_answers_no_update;

  for r in select * from public.life_answers where chapter_id is null order by answered_at loop
    -- continues_id stays null: whether an old row was a correction, an extension
    -- or a fresh start is not recorded anywhere in the data that already exists,
    -- and inventing the answer would be worse than admitting it.
    -- CLAMPED, because the old rule and the new one are not the same rule.
    -- life_answers allowed a deadline one day BEFORE the instant it was written
    -- (a UTC instant and a user's calendar day can legitimately sit a day
    -- apart), and up to 1831 days after. A chapter measures from its own
    -- start, so it allows neither. Without the clamp a single legacy row at
    -- either edge aborts the whole migration, and the honest reading of "due
    -- the day before it was written" is "due that day".
    insert into public.life_chapters (user_id, statement_key, started_on, due_on, opened_at)
    values (
      r.user_id,
      r.answer_key,
      (r.answered_at at time zone 'UTC')::date,
      least(
        greatest(r.due_on, (r.answered_at at time zone 'UTC')::date),
        (r.answered_at at time zone 'UTC')::date + 1830
      ),
      r.answered_at
    )
    returning id into new_id;
    update public.life_answers set chapter_id = new_id where id = r.id;
  end loop;

  alter table public.life_answers enable trigger life_answers_no_update;
exception when others then
  alter table public.life_answers enable trigger life_answers_no_update;
  raise;
end $$;

alter table public.life_answers alter column chapter_id set not null;

create index if not exists life_answers_chapter_idx
  on public.life_answers (chapter_id, answer_key, answered_at desc);

-- THE DEADLINE NOW LIVES ON THE CHAPTER, AND ONLY THERE.
--
-- Renamed rather than dropped: the data is kept and the rename is reversible,
-- while the old name is gone so nothing can read it by accident. Leaving it
-- readable would be the "two facts that must agree, stored apart" failure —
-- a row's deadline and its chapter's deadline, free to disagree the first time
-- somebody amends a wording.
alter table public.life_answers rename column due_on to legacy_due_on;
alter table public.life_answers alter column legacy_due_on drop not null;

-- The old sanity check named a column that no longer exists under that name;
-- the chapter's own constraint replaces it.
alter table public.life_answers drop constraint if exists life_answers_due_on_sane;

comment on column public.life_answers.legacy_due_on is
  'FROZEN. The per-row deadline from before chapters existed, kept for reference. Never read, never written. The live deadline is life_chapters.due_on.';
