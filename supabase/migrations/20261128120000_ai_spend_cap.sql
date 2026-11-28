-- PER-USER AI SPEND CAP: BOOK A CALL'S COST BEFORE IT RUNS, SETTLE IT AFTER.
--
-- Every call the site makes to Claude goes through one guard
-- (src/api_ai/aiGuard.ts). Before the call it asks `ai_spend_reserve` to book
-- the call's expected cost against the person's cap for that feature. The
-- booking and the check happen under one per-person-and-feature lock, so two
-- calls at the same moment cannot both read "room left" and both go ahead:
-- the second waits, then sees the first one's booking. After the call the
-- guard replaces the booked guess with the real price from the token counts
-- the API returned (src/db/aiSpendRepo.ts, `settleAiSpend`).
--
-- A booking whose call never reports back (the server died mid-call) keeps
-- its guess, so the person is charged the guess, never nothing.
--
-- `settled_at` is null while a booking is open. Rows from before this
-- migration were real, finished calls: they are marked settled at the time
-- they were written.

alter table public.ai_usage_logs add column if not exists settled_at timestamptz;

update public.ai_usage_logs set settled_at = created_at where settled_at is null;

-- The table is written by the server only. Row security already refuses the
-- client roles (there is no write policy); this takes the grants away too, so
-- a policy added by mistake later still could not open a door.
revoke insert, update, delete on public.ai_usage_logs from anon, authenticated;

-- Book `p_estimate_cents` for one call, or refuse (null) when the person's
-- spend on this feature, open bookings included, plus this booking would pass
-- `p_cap_cents`. Server only: the caller passes the cap, so no client may run it.
create or replace function public.ai_spend_reserve(
  p_user_id uuid,
  p_feature text,
  p_operation text,
  p_model text,
  p_scenario_id text,
  p_cap_cents numeric,
  p_estimate_cents numeric
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_spent numeric;
  v_id uuid;
begin
  if p_user_id is null or p_feature is null or p_operation is null or p_model is null then
    raise exception 'ai_spend_reserve: user, feature, operation and model are required' using errcode = '22004';
  end if;
  if p_cap_cents is null or p_cap_cents < 0 or p_estimate_cents is null or p_estimate_cents <= 0 then
    raise exception 'ai_spend_reserve: the cap must be 0 or more and the estimate above 0' using errcode = '22023';
  end if;

  -- The column keeps 4 decimals; round the booking up so it never books less than asked.
  p_estimate_cents := ceil(p_estimate_cents * 10000) / 10000;

  -- One lock per person and feature, released when this transaction ends.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ai_spend:' || p_user_id::text || ':' || p_feature, 0)
  );

  select coalesce(sum(l.total_cost_cents), 0)
    into v_spent
    from public.ai_usage_logs as l
   where l.user_id = p_user_id
     and l.feature = p_feature;

  if v_spent + p_estimate_cents > p_cap_cents then
    return null;
  end if;

  insert into public.ai_usage_logs (
    user_id, feature, scenario_id, operation, model,
    input_tokens, output_tokens,
    input_cost_cents, output_cost_cents, total_cost_cents,
    settled_at
  )
  values (
    p_user_id, p_feature, p_scenario_id, p_operation, p_model,
    0, 0,
    0, 0, p_estimate_cents,
    null
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.ai_spend_reserve(uuid, text, text, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.ai_spend_reserve(uuid, text, text, text, text, numeric, numeric) to service_role;
