-- ============================================================================
-- THE BLACK BOX ACCOUNT KEEPS THE NEWER COPY OF A ROW, AND WRITES BOTH TABLES TOGETHER.
--
-- NOT APPLIED. Needs the owner's yes before it touches the live database
-- (Plans/quit-finish.md, blocker B3). Tested on the local test stack only.
--
-- Today `writeViceRows` reads the stamps of the rows it is about to write, drops the older ones and upserts the
-- rest: two requests that cross each other (two devices, two tabs, a slow phone) can still both pass the check
-- and the older one can land last. This puts the rule in the database, where it cannot be raced:
--
--   1. A trigger refuses an UPDATE whose `updated_at` is older than the stored row's (the update is skipped, not
--      an error: the device is told, and takes the newer copy). An equal stamp is let through.
--   2. The same trigger pulls a stamp that is more than 5 minutes ahead of the database clock back to that limit,
--      so one device with a wrong clock cannot make every later edit from every other device "older".
--   3. `vice_write_rows(rows jsonb)` writes the attempts and then the reports in ONE transaction (a lapse is a new
--      report plus the run it ended; they land together or not at all) and returns the ids it skipped.
--      Security invoker, so row-level security and `auth.uid()` still decide whose rows these are.
--
-- Nothing here deletes anything and no existing row changes.
-- ============================================================================

create or replace function public.vice_keep_newer_row() returns trigger
language plpgsql
as $$
declare
  limit_at timestamptz := now() + interval '5 minutes';
begin
  if new.updated_at > limit_at then
    new.updated_at := limit_at;
  end if;
  if new.deleted_at is not null and new.deleted_at > limit_at then
    new.deleted_at := limit_at;
  end if;
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- keep the stored, newer row; the caller reads it back
  end if;
  return new;
end;
$$;

drop trigger if exists vice_attempts_keep_newer on public.vice_attempts;
create trigger vice_attempts_keep_newer
  before insert or update on public.vice_attempts
  for each row execute function public.vice_keep_newer_row();

drop trigger if exists vice_reports_keep_newer on public.vice_reports;
create trigger vice_reports_keep_newer
  before insert or update on public.vice_reports
  for each row execute function public.vice_keep_newer_row();

-- One transaction for both tables. `rows` is {"attempts": [...], "reports": [...]} in the table's own column names.
-- Returns {"skipped": {"attempts": [ids], "reports": [ids]}}: rows the database held in a newer version.
create or replace function public.vice_write_rows(rows jsonb) returns jsonb
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
  skipped_attempts uuid[];
  skipped_reports uuid[];
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  with incoming as (
    select (r).* from jsonb_populate_recordset(null::public.vice_attempts, coalesce(rows -> 'attempts', '[]'::jsonb)) as r
  ), written as (
    insert into public.vice_attempts as t
    select i.id, uid, i.vice_id, i.label, i.started_on, i.started_by, i.structure, i.ended_on, i.ended_by_report_id, i.updated_at, i.deleted_at
    from incoming i
    on conflict (id) do update set
      vice_id = excluded.vice_id, label = excluded.label, started_on = excluded.started_on,
      started_by = excluded.started_by, structure = excluded.structure, ended_on = excluded.ended_on,
      ended_by_report_id = excluded.ended_by_report_id, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
    where t.user_id = uid and excluded.updated_at >= t.updated_at
    returning t.id
  )
  select coalesce(array_agg(i.id), '{}') into skipped_attempts from incoming i where i.id not in (select id from written);

  with incoming as (
    select (r).* from jsonb_populate_recordset(null::public.vice_reports, coalesce(rows -> 'reports', '[]'::jsonb)) as r
  ), written as (
    insert into public.vice_reports as t
    select i.id, uid, i.attempt_id, i.at, i.went_through, i.thought, i.ending, i.closeness, i.with_whom, i.where_at, i.factors, i.did_instead, i.updated_at, i.deleted_at
    from incoming i
    on conflict (id) do update set
      attempt_id = excluded.attempt_id, at = excluded.at, went_through = excluded.went_through, thought = excluded.thought,
      ending = excluded.ending, closeness = excluded.closeness, with_whom = excluded.with_whom, where_at = excluded.where_at,
      factors = excluded.factors, did_instead = excluded.did_instead, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
    where t.user_id = uid and excluded.updated_at >= t.updated_at
    returning t.id
  )
  select coalesce(array_agg(i.id), '{}') into skipped_reports from incoming i where i.id not in (select id from written);

  return jsonb_build_object('skipped', jsonb_build_object('attempts', to_jsonb(skipped_attempts), 'reports', to_jsonb(skipped_reports)));
end;
$$;

revoke all on function public.vice_write_rows(jsonb) from public;
grant execute on function public.vice_write_rows(jsonb) to authenticated;
