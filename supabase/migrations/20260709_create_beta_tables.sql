-- Beta tester invite flow: invites (with cap), memberships, waitlist emails.
-- Security model (CLAUDE.md rule 5): beta membership is EARNED/system-granted.
-- No user INSERT/UPDATE/DELETE policies on any of these tables.
-- The only grant path is the SECURITY DEFINER function claim_beta_slot().

create table beta_invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  max_uses int not null default 60,
  use_count int not null default 0 check (use_count >= 0 and use_count <= max_uses),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table beta_invites enable row level security;
-- NO policies: read/write via service role or definer function only.

create table beta_testers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invite_id uuid not null references beta_invites(id),
  granted_at timestamptz not null default now()
);
alter table beta_testers enable row level security;
create policy "beta_testers_select_own" on beta_testers
  for select using (auth.uid() = user_id);
-- NO insert/update/delete policies (system-granted).

create table waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null check (source in ('beta_full', 'premium_teaser')),
  created_at timestamptz not null default now(),
  unique (email, source)
);
alter table waitlist_emails enable row level security;
-- NO policies: inserted server-side via service role only.

-- Atomically claim a beta slot for the calling (authenticated) user.
-- FOR UPDATE on the invite row serializes concurrent claims, so the cap
-- cannot be exceeded by simultaneous signups.
-- Returns: 'granted' | 'already_member' | 'full' | 'invalid'
create or replace function claim_beta_slot(p_code text)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_invite beta_invites%rowtype;
begin
  if auth.uid() is null then return 'invalid'; end if;
  select * into v_invite from beta_invites
    where code = p_code and active
    for update;
  if not found then return 'invalid'; end if;
  if exists (select 1 from beta_testers where user_id = auth.uid())
    then return 'already_member'; end if;
  if v_invite.use_count >= v_invite.max_uses then return 'full'; end if;
  update beta_invites set use_count = use_count + 1 where id = v_invite.id;
  insert into beta_testers (user_id, invite_id) values (auth.uid(), v_invite.id);
  return 'granted';
end $$;

revoke execute on function claim_beta_slot(text) from public, anon;
grant execute on function claim_beta_slot(text) to authenticated;

-- Owner seeds the live invite manually (keeps the real code out of git):
-- insert into beta_invites (code, max_uses) values ('<chosen-code>', 60);
