-- One workspace per person, enforced by the database.
--
-- WHAT WENT WRONG WITHOUT IT: a browser with no saved data invents a workspace
-- before it has heard from the server. If it then adopts the server's, the one
-- it invented is uploaded too. Checked against the live database after a day of
-- testing: 47 workspace rows for a single account, three of them live. Which
-- one the app showed was then a matter of which came back first, and an entry
-- attached to one of the others was invisible while still being counted.
--
-- The app has exactly one workspace per person by design, so the database
-- should say so rather than leaving it to every client to be careful.

-- 1. Collapse what is already there: keep the newest live workspace per user,
--    move everything that pointed at the others onto it, and retire them.
do $$
declare
  row record;
begin
  for row in
    select user_id, (array_agg(id order by updated_at desc))[1] as keep_id,
           array_agg(id) filter (where true) as all_ids
    from public.timetrack_workspaces
    where deleted_at is null
    group by user_id
    having count(*) > 1
  loop
    update public.timetrack_entries       set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_projects      set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_clients       set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_tags          set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_favorites     set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_saved_reports set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_approvals     set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_webhooks      set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_autotracker_rules set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_timeline      set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;
    update public.timetrack_calendars     set workspace_id = row.keep_id where user_id = row.user_id and workspace_id <> row.keep_id;

    update public.timetrack_workspaces
      set deleted_at = now()
      where user_id = row.user_id and id <> row.keep_id and deleted_at is null;
  end loop;
end;
$$;

-- 2. And stop it happening again.
create unique index if not exists timetrack_workspaces_one_live_per_user
  on public.timetrack_workspaces (user_id)
  where deleted_at is null;
