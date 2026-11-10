-- YOUR COUNCIL: the role models you picked (Plans/role-models.md, Phase 7, O3 = yes).
--
-- Adds only: one table holding a person's one to five picks and the values they
-- take from each, a trigger refusing a sixth, and row security keeping every row
-- to its owner. Nothing existing changes. The catalogue itself is files in the
-- repo (D1); `role_model_id` names a file, so it is checked for shape only.
-- Undo: rollback/20261110090000_user_role_models.down.sql (it DELETES the picks;
-- ask the owner first).

create table if not exists public.user_role_models (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_model_id text not null check (role_model_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(role_model_id) <= 80),
  position smallint not null check (position between 0 and 4),
  taken_values text[] not null check (cardinality(taken_values) between 1 and 5),
  added_at timestamptz not null default now(),
  primary key (user_id, role_model_id)
);

-- At most five per person. The lock makes two adds at the same moment queue
-- instead of both seeing four and both getting in.
create or replace function public.user_role_models_at_most_five()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('user_role_models:' || new.user_id::text, 0));
  if (select count(*) from public.user_role_models where user_id = new.user_id) >= 5 then
    raise exception 'council_full' using errcode = 'P0001', hint = 'A council holds at most five people.';
  end if;
  return new;
end;
$$;

drop trigger if exists user_role_models_at_most_five on public.user_role_models;
create trigger user_role_models_at_most_five
  before insert on public.user_role_models
  for each row execute function public.user_role_models_at_most_five();

alter table public.user_role_models enable row level security;
drop policy if exists "read own council" on public.user_role_models;
create policy "read own council" on public.user_role_models
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "add to own council" on public.user_role_models;
create policy "add to own council" on public.user_role_models
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "change own council" on public.user_role_models;
create policy "change own council" on public.user_role_models
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "remove from own council" on public.user_role_models;
create policy "remove from own council" on public.user_role_models
  for delete to authenticated using (user_id = auth.uid());
revoke all on public.user_role_models from anon;
revoke truncate on public.user_role_models from authenticated;
