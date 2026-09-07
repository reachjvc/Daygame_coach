-- A deadline must be a day that exists, and a day that is still ahead.
--
-- WHY THIS EXISTS: `due_on` was accepted on the strength of a shape test in the
-- API — four digits, a dash, two digits, a dash, two digits. That test says yes
-- to 2026-13-45, which then failed inside Postgres and reached the person as a
-- generic "That did not save". It also says yes to last Tuesday, so a one thing
-- written this morning could announce that it had already run its course.
--
-- The app now refuses both, in the USER's timezone, which is the only place the
-- question "is that day still ahead of me" has an answer. This constraint is the
-- floor under that: the service-role key bypasses row-level security entirely,
-- so every rule enforced only in a route is advisory for backend code, and this
-- table is read and written by backend analysis.
--
-- WHY A DAY OF SLACK ON EACH SIDE: `answered_at` is a UTC instant and `due_on`
-- is a day on somebody's own calendar. Those can legitimately sit a day apart in
-- either direction — a person in Auckland writing at 09:00 local is on
-- tomorrow's date by UTC. The constraint is therefore deliberately loose. It
-- exists to catch 1970 and 9999, not to re-adjudicate the user's timezone, which
-- the database does not know.
--
-- 1831 days is five years of 366 plus that one day of slack, and five years is
-- MAX_HORIZON_YEARS in src/goals/oneThingService.ts. A one thing runs for a
-- season, not a decade.
--
-- ADDED VALID, not `not valid`: the live table was queried for rows that break
-- this rule before it was applied and there were none, so there is no legacy
-- data to grandfather in. If a future environment does hold one, this migration
-- will fail loudly on it rather than silently exempting it, which is the right
-- way round — find the bad row and fix it.

do $$ begin
  alter table public.life_answers
    add constraint life_answers_due_on_sane check (
      due_on >= (answered_at at time zone 'UTC')::date - 1
      and due_on <= (answered_at at time zone 'UTC')::date + 1831
    );
exception when duplicate_object then null; end $$;

comment on constraint life_answers_due_on_sane on public.life_answers is
  'A deadline is a real day, not behind the day it was written, and inside five years. Loose by one day because due_on is the user''s calendar and answered_at is UTC.';
