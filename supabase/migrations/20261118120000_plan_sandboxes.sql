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
-- Undo: rollback/20261118120000_plan_sandboxes.down.sql (drops the table; the
-- hidden accounts themselves are deleted by hand, see that file).

create table if not exists public.plan_sandboxes (
  owner_id        uuid primary key references auth.users(id) on delete cascade,
  sandbox_user_id uuid unique references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  constraint plan_sandboxes_not_itself check (sandbox_user_id is distinct from owner_id)
);

alter table public.plan_sandboxes enable row level security;

drop policy if exists "owner reads own sandbox row" on public.plan_sandboxes;
create policy "owner reads own sandbox row" on public.plan_sandboxes
  for select to authenticated using (owner_id = auth.uid());

revoke all on public.plan_sandboxes from anon, authenticated;
grant select on public.plan_sandboxes to authenticated;
grant all on public.plan_sandboxes to service_role;
