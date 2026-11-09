-- ROLLBACK: puts back the Phase 5 reminder check (one reminder per local day).
--
-- Undoes 20261109170000_plan_review_one_per_week.sql. Deletes nothing: the
-- send records written with the weekly key stay, and only stop counting for
-- the days they were not sent on. Still ask the owner before running it on the
-- live database.

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
   where r.push_on
     and extract(isodow from p_now at time zone z.tz) = r.review_day
     and extract(hour from p_now at time zone z.tz) = r.review_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'plan-review'
          and s.entry_id = 'plan-review:' || r.user_id::text || ':' || ((p_now at time zone z.tz)::date)::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.plan_reviews_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.plan_reviews_due(integer, timestamptz) to service_role;

notify pgrst, 'reload schema';
