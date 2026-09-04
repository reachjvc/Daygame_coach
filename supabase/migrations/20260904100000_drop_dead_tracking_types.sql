-- Two tracking types, because two is all anything ever wrote.
--
-- `percentage` and `streak` have been allowed by this CHECK since the column
-- was created and no code has ever written either. Every assignment to
-- `tracking_type` across src/ and app/ is 'counter' (25 sites) or 'boolean' (2).
-- The one apparent exception was `setTrackingType("count")` in
-- GoalFormVariant1.tsx — an orphan prototype no file imported, using its own
-- local vocabulary that never reached the database. It and its five siblings
-- were deleted in the same change as this migration.
--
-- WHY NARROW IT RATHER THAN LEAVE IT. A value a constraint permits and nothing
-- produces reads as a supported feature. It was planned around twice: once when
-- deciding how streaks are stored, and once when writing the goal-shape reading
-- in src/goals/data/goalShapes.ts, where "what does a `percentage` goal look
-- like" had no answer because there has never been one.
--
-- SAFE BY INSPECTION, and checked rather than assumed: the live table was
-- queried for rows holding either value before this was written and there were
-- none. Added VALID, so if a future environment does hold one this migration
-- fails loudly on it instead of silently exempting it — which is the right way
-- round: find the row and fix it.

do $$
declare
  bad_rows bigint;
begin
  select count(*) into bad_rows
  from public.user_goals
  where tracking_type not in ('counter', 'boolean');

  if bad_rows > 0 then
    raise exception
      'Refusing to narrow tracking_type: % row(s) still hold percentage or streak. Fix them first.', bad_rows;
  end if;
end $$;

alter table public.user_goals
  drop constraint if exists user_goals_tracking_type_check;

alter table public.user_goals
  add constraint user_goals_tracking_type_check
  check (tracking_type in ('counter', 'boolean'));

comment on column public.user_goals.tracking_type is
  'How the number is kept: a counter, or done/not-done. Mirrors GOAL_TRACKING_TYPES in src/db/goalEnums.ts.';
