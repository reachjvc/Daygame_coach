-- Plan snapshots from the Life Mastery flow (/test/life-mastery).
--
-- WHY THIS TABLE EXISTS: the flow runs entirely in localStorage, so the only
-- way to learn where real people get stuck is to look at what they actually
-- wrote. A snapshot is the whole NsPlan as JSON plus its plain-text read-back,
-- keyed by a random per-browser id.
--
-- ONE ROW PER BROWSER, UPDATED IN PLACE. Not an append-only history: the
-- interesting object is "what does this person's plan look like now", and a row
-- per keystroke would be a million rows of the same plan growing by one word.
-- `revision` counts how many times it has been written, which is the only part
-- of the history worth keeping.
--
-- ACCESS: RLS is ON and there are NO POLICIES, which in Postgres means anon and
-- authenticated can do nothing at all with this table. The only way in is the
-- service-role key, held server-side by /api/plan-snapshots (write) and
-- /api/admin/plan-snapshots (read, behind ADMIN_SECRET_KEY). That is deliberate:
-- an unauthenticated page is writing here, so the entrance is one controlled
-- route rather than a public insert grant.
--
-- PRIVACY: this holds free text people wrote about their bodies, their money,
-- their relationships and their sex lives, and it will contain the names of
-- third parties who never consented to anything. `client_id` is a random UUID
-- minted in the browser, not an account, not an email, and no IP is stored.
-- `user_id` is here unused so a future signed-in version can attach a snapshot
-- to a real account without a second migration.

create table if not exists public.plan_snapshots (
  id uuid primary key default gen_random_uuid(),
  -- Random UUID from the browser's localStorage. Not an identity; the only
  -- thing it does is keep one person's edits on one row.
  client_id text not null unique,
  -- Set only once the flow lives behind a login. Null for everything anonymous.
  user_id uuid references auth.users(id) on delete cascade,
  -- The whole NsPlan, as serialized by serializeNsPlan.
  plan jsonb not null,
  -- planAsText(), stored alongside so the plan can be read without a renderer.
  plan_text text not null default '',
  -- Denormalised so a list view does not have to parse every blob.
  goal_count integer not null default 0,
  area_count integer not null default 0,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_snapshots_updated_at_idx
  on public.plan_snapshots (updated_at desc);
create index if not exists plan_snapshots_user_id_idx
  on public.plan_snapshots (user_id) where user_id is not null;

-- On, with no policies. Nothing reaches this table except the service role.
alter table public.plan_snapshots enable row level security;

comment on table public.plan_snapshots is
  'Life Mastery plan snapshots from /test/life-mastery. Service-role access only: RLS is on with no policies. Free text, keyed by a random browser id.';
