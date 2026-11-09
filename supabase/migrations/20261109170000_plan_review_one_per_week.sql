-- AT MOST ONE WEEKLY REVIEW REMINDER PER WEEK (Plans/life-plan-after-setup.md, Phase 6).
--
-- Phase 5 keyed each reminder by the local day it went out, so moving the
-- reminder day in the middle of a week could send a second one that week. From
-- here the key is the Monday of the person's local ISO week
-- ('plan-review:<user>:<monday>'), so the existing unique index
-- notification_sends_one_plan_review allows one record per user per week.
-- The due check also counts a Phase 5 record (keyed by any day of the same
-- week), so the week this ships in cannot send twice either.
--
-- Changes only plan_reviews_due's body; same arguments, same columns, same
-- grants. No table, row or index is changed or removed.
-- Undo: rollback/20261109170000_plan_review_one_per_week.down.sql (puts the
-- Phase 5 body back; deletes nothing).

create or replace function public.plan_reviews_due(p_limit integer, p_now timestamptz default now())
returns table (user_id uuid, local_day date, review_day smallint)
language sql stable security definer set search_path = ''
as $$
  select r.user_id, (p_now at time zone z.tz)::date, r.review_day
    from public.life_plan_reminders as r
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
    -- The Monday of the local ISO week (date_trunc('week') starts weeks on Monday).
    cross join lateral (
      select date_trunc('week', p_now at time zone z.tz)::date as monday
    ) as w
   where r.push_on
     and extract(isodow from p_now at time zone z.tz) = r.review_day
     and extract(hour from p_now at time zone z.tz) = r.review_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     -- Nothing sent or recorded for this person this week, whichever day it
     -- was keyed by. Keys end in a YYYY-MM-DD date, so text order is date order.
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'plan-review'
          and s.user_id = r.user_id
          and s.entry_id like 'plan-review:' || r.user_id::text || ':%'
          and right(s.entry_id, 10) between w.monday::text and (w.monday + 6)::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.plan_reviews_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.plan_reviews_due(integer, timestamptz) to service_role;

notify pgrst, 'reload schema';
