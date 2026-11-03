-- The phone and the PC stop undoing each other: a time-tracking write is applied
-- only if it was based on the row as it stands now.
--
-- WHAT WENT WRONG (sync defects #1 and #3, Plans/time-tracker-like-toggl.md).
-- Every push was an upsert that replaced the whole row. A phone that had been
-- offline or asleep with an edit queued sent its old copy when it woke, and that
-- copy said `stopped_at: null` and `deleted_at: null`. So a timer stopped on the
-- PC started running again, and an entry deleted on the PC came back. Separately,
-- taking a tag off an entry was never stored: a tag link has no `deleted_at`, so
-- nothing could say it was gone, and the tag came back within a minute.
--
-- THE RULE, IN ONE FUNCTION SO IT HOLDS IN ONE TRANSACTION.
--   - Each row a device sends names the server `updated_at` it was based on (its
--     "base"). The row is written only if the stored `updated_at` is exactly that
--     base, or if there is no such row yet.
--   - Otherwise the stored row is left alone and returned under `conflicts`. The
--     device then lays the fields IT changed onto that copy and sends again, with
--     the new base. A stale copy therefore cannot clear a stop or a deletion it
--     never made.
--   - Every row written comes back under `written` with its new `updated_at`, so
--     the device's next edit names the version its own write produced. Without
--     that, a device's second edit would be refused as stale.
--   - An entry's tags travel as its whole set (`p_tag_sets`). The set is applied
--     only when the entry itself was written in the same call, so it is under the
--     same check, and links not in the set are deleted. The entry's own write
--     moves its `updated_at`, which is how another device learns of the change.
--   - Not checked: `timetrack_workspaces` (the server rewrites its id to the one
--     workspace the person owns, so a device's base can name a different row) and
--     `timetrack_webhook_log` (an append-only log with no `updated_at`).
--
-- SECURITY INVOKER: the function runs as the signed-in caller, so the row level
-- security on every timetrack table (20260903120000_timetrack.sql: own rows only,
-- for select, insert, update and delete) applies to every statement in it. A row
-- of somebody else's is invisible here, exactly as it is to the old upsert.
-- `user_id` is forced to `auth.uid()` on every row as well. Table names come
-- from a fixed list, never from the caller unchecked.
--
-- `updated_at` is stamped with the database's clock: `now()` on insert, and the
-- existing `timetrack_touch_updated_at` trigger (before update) on update. It is
-- the same instant for every row of one call.
--
-- Old callers keep working: the sync route still does the unchecked upsert for a
-- request that sends no bases (an app version from before this, the e2e
-- helpers), and falls back to it if this function does not exist yet.
--
-- Way back: supabase/migrations/rollback/20261103120000_timetrack_versioned_writes.down.sql
-- drops the function. The app then falls back to the old upsert by itself.

create or replace function public.timetrack_push(p_batch jsonb, p_tag_sets jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tables constant text[] := array[
    'timetrack_workspaces', 'timetrack_clients', 'timetrack_projects', 'timetrack_project_rates',
    'timetrack_project_alerts', 'timetrack_alert_events', 'timetrack_tasks', 'timetrack_tags',
    'timetrack_entries', 'timetrack_entry_tags', 'timetrack_favorites', 'timetrack_saved_reports',
    'timetrack_approvals', 'timetrack_webhooks', 'timetrack_webhook_log',
    'timetrack_autotracker_rules', 'timetrack_timeline', 'timetrack_calendars', 'timetrack_settings'
  ];
  v_sets jsonb := coalesce(p_tag_sets, '{}'::jsonb);
  v_part jsonb;
  v_table text;
  v_bases jsonb;
  v_keycol text;
  v_checked boolean;
  v_stamped boolean;
  v_columns text[];
  v_row jsonb;
  v_key text;
  v_base text;
  v_list text;
  v_current jsonb;
  v_new jsonb;
  v_count integer;
  v_applied integer := 0;
  v_written jsonb := '{}'::jsonb;
  v_conflicts jsonb := '{}'::jsonb;
  v_conflict_tags jsonb := '{}'::jsonb;
  v_entries_written text[] := '{}';
  v_entries_refused text[] := '{}';
  v_entry text;
  v_tags jsonb;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_batch) is distinct from 'array' then
    raise exception 'p_batch must be an array of {table, rows, bases}' using errcode = '22023';
  end if;
  if jsonb_typeof(v_sets) is distinct from 'object' then
    raise exception 'p_tag_sets must map an entry id to its tag ids' using errcode = '22023';
  end if;

  -- The caller sends the tables parents first (the repo's TIMETRACK_TABLES order),
  -- so every foreign key is satisfied as it goes.
  for v_part in select value from jsonb_array_elements(p_batch) loop
    v_table := v_part->>'table';
    if v_table is null or not (v_table = any (v_tables)) then
      raise exception 'Not a time-tracking table: %', coalesce(v_table, '(none)') using errcode = '22023';
    end if;
    v_bases := coalesce(v_part->'bases', '{}'::jsonb);

    if v_table = 'timetrack_entry_tags' then
      -- Links are only ever added here. An entry whose whole set travels in
      -- p_tag_sets is handled below instead, and a refused entry's links wait for
      -- the device to send them again with the entry.
      insert into public.timetrack_entry_tags (entry_id, tag_id, user_id)
      select link->>'entry_id', link->>'tag_id', v_uid
      from jsonb_array_elements(coalesce(v_part->'rows', '[]'::jsonb)) as link
      where not ((link->>'entry_id') = any (v_entries_refused))
        and not (v_sets ? (link->>'entry_id'))
      on conflict (entry_id, tag_id) do nothing;
      get diagnostics v_count = row_count;
      v_applied := v_applied + v_count;
      continue;
    end if;

    v_keycol := case when v_table = 'timetrack_settings' then 'user_id' else 'id' end;
    v_checked := v_table not in ('timetrack_workspaces', 'timetrack_webhook_log');
    v_stamped := v_table <> 'timetrack_webhook_log';
    select array_agg(a.attname::text) into v_columns
    from pg_catalog.pg_attribute as a
    where a.attrelid = pg_catalog.to_regclass('public.' || v_table)
      and a.attnum > 0
      and not a.attisdropped;

    for v_row in select value from jsonb_array_elements(coalesce(v_part->'rows', '[]'::jsonb)) loop
      v_row := v_row || jsonb_build_object('user_id', v_uid);
      v_key := v_row->>v_keycol;
      if v_key is null then
        raise exception 'A % row without its %', v_table, v_keycol using errcode = '22023';
      end if;

      -- the columns this row names; unknown keys are ignored, `updated_at` is ours
      select string_agg(pg_catalog.quote_ident(k), ', ') into v_list
      from jsonb_object_keys(v_row) as k
      where k = any (v_columns) and k <> 'updated_at';

      execute format('select to_jsonb(t) from public.%I as t where t.%I::text = $1 for update', v_table, v_keycol)
        into v_current using v_key;

      v_new := null;
      if v_current is null then
        if v_stamped then
          execute format(
            'insert into public.%I as t (%s, updated_at) select %s, now() from pg_catalog.jsonb_populate_record(null::public.%I, $1) returning to_jsonb(t.updated_at)',
            v_table, v_list, v_list, v_table
          ) into v_new using v_row;
        else
          execute format(
            'insert into public.%I (%s) select %s from pg_catalog.jsonb_populate_record(null::public.%I, $1)',
            v_table, v_list, v_list, v_table
          ) using v_row;
        end if;
      else
        v_base := v_bases->>v_key;
        if v_checked and (v_base is null or (v_current->>'updated_at')::timestamptz <> v_base::timestamptz) then
          -- Stale, or a write of a row the device believed was new: the stored row
          -- stays as it is, and the device is told what it is.
          v_conflicts := jsonb_set(
            v_conflicts, array[v_table], coalesce(v_conflicts->v_table, '[]'::jsonb) || jsonb_build_array(v_current)
          );
          if v_table = 'timetrack_entries' then
            v_entries_refused := v_entries_refused || v_key;
            v_conflict_tags := v_conflict_tags || jsonb_build_object(
              v_key,
              coalesce(
                (select jsonb_agg(l.tag_id order by l.tag_id) from public.timetrack_entry_tags as l where l.entry_id = v_key),
                '[]'::jsonb
              )
            );
          end if;
          continue;
        end if;
        if v_stamped then
          -- the touch trigger sets updated_at to now()
          execute format(
            'update public.%I as t set (%s) = (select %s from pg_catalog.jsonb_populate_record(null::public.%I, $1)) where t.%I::text = $2 returning to_jsonb(t.updated_at)',
            v_table, v_list, v_list, v_table, v_keycol
          ) into v_new using v_row, v_key;
        else
          execute format(
            'update public.%I as t set (%s) = (select %s from pg_catalog.jsonb_populate_record(null::public.%I, $1)) where t.%I::text = $2',
            v_table, v_list, v_list, v_table, v_keycol
          ) using v_row, v_key;
        end if;
      end if;

      v_applied := v_applied + 1;
      if v_new is not null then
        v_written := jsonb_set(
          v_written, array[v_table], coalesce(v_written->v_table, '{}'::jsonb) || jsonb_build_object(v_key, v_new)
        );
      end if;
      if v_table = 'timetrack_entries' then
        v_entries_written := v_entries_written || v_key;
      end if;
    end loop;
  end loop;

  -- An entry's whole tag set: what is not in it goes, what is in it is there.
  for v_entry, v_tags in select s.key, s.value from jsonb_each(v_sets) as s loop
    if jsonb_typeof(v_tags) is distinct from 'array' then
      raise exception 'The tag set for entry % is not a list', v_entry using errcode = '22023';
    end if;
    -- a set travels with its entry, under the entry's check
    if not (v_entry = any (v_entries_written)) then
      continue;
    end if;
    delete from public.timetrack_entry_tags as l
    where l.entry_id = v_entry
      and not (l.tag_id in (select jsonb_array_elements_text(v_tags)));
    insert into public.timetrack_entry_tags (entry_id, tag_id, user_id)
    select v_entry, tag, v_uid from jsonb_array_elements_text(v_tags) as tag
    on conflict (entry_id, tag_id) do nothing;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'written', v_written,
    'conflicts', v_conflicts,
    'conflict_tags', v_conflict_tags
  );
end;
$$;

revoke all on function public.timetrack_push(jsonb, jsonb) from public;
revoke all on function public.timetrack_push(jsonb, jsonb) from anon;
grant execute on function public.timetrack_push(jsonb, jsonb) to authenticated;

-- so the API sees the new function without waiting for its next schema reload
notify pgrst, 'reload schema';
