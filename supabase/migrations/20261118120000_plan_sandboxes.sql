-- THE COPY SPACE (Plans/plan-in-steps.md, Phase 2).
--
-- One row per account that may open a hidden second account ("the copy
-- space") to click through the life plan on a COPY of its own data. The
-- hidden account is created by the server on first use; nobody signs in to
-- it, and the server acts as it with a session minted on the server.
--
-- Adds only this table. No real account id is written here: the row for an
-- owner is inserted by hand, after this runs, with sandbox_user_id left null.
--
-- Row security: an account may READ its own row and nothing else. There is no
-- insert, update or delete policy, so a browser session can never make itself
-- an owner or point its row at another account. The server writes the row's
-- sandbox_user_id once, with the service role, when it creates the hidden
-- account.
--
-- Undo: rollback/20261118120000_plan_sandboxes.down.sql (drops the table and trigger; the
-- hidden accounts themselves are deleted by hand, see that file).

create table if not exists public.plan_sandboxes (
  owner_id        uuid primary key references auth.users(id) on delete cascade,
  -- Deleting the hidden account only empties the pointer: the server makes a new one on next use.
  sandbox_user_id uuid unique references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  -- Set while a copy or reset runs, so two tabs cannot interleave them. A claim older than two minutes is a crashed run's.
  busy_since      timestamptz,
  constraint plan_sandboxes_not_itself check (sandbox_user_id is distinct from owner_id)
);

-- A hidden account is never anybody's owner, and an owner is never anybody's hidden account.
-- (A check constraint cannot look at other rows, so a trigger does.) The server only ever
-- writes a hidden account it has just made, but the pointer must not be able to name a real one.
create or replace function public.plan_sandboxes_keep_apart() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.sandbox_user_id is not null and exists (
    select 1 from public.plan_sandboxes p where p.owner_id = new.sandbox_user_id
  ) then
    raise exception 'a copy space account cannot be an owner' using errcode = '23514';
  end if;
  if exists (select 1 from public.plan_sandboxes p where p.sandbox_user_id = new.owner_id) then
    raise exception 'an owner cannot be a copy space account' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.plan_sandboxes_keep_apart() from public, anon, authenticated;

drop trigger if exists plan_sandboxes_keep_apart on public.plan_sandboxes;
create trigger plan_sandboxes_keep_apart before insert or update of owner_id, sandbox_user_id on public.plan_sandboxes
  for each row execute function public.plan_sandboxes_keep_apart();

alter table public.plan_sandboxes enable row level security;

drop policy if exists "owner reads own sandbox row" on public.plan_sandboxes;
create policy "owner reads own sandbox row" on public.plan_sandboxes
  for select to authenticated using (owner_id = auth.uid());

revoke all on public.plan_sandboxes from anon, authenticated;
grant select on public.plan_sandboxes to authenticated;
grant all on public.plan_sandboxes to service_role;
