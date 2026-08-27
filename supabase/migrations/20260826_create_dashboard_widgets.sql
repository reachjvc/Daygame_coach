-- Per-user dashboard layout: which widgets sit on a dashboard, and in what order.
--
-- WHY A TABLE AND NOT A COLUMN: the first thing that becomes configurable is the
-- four stat tiles at the top of /dashboard/tracking, which a `tile_ids TEXT[]`
-- column on user_tracking_stats would have covered. It is a table because the
-- next things to become configurable — the rest of the tracking page, then the
-- goals page, then home — are rows here (`dashboard_key`, `widget_type`,
-- `config`) rather than another migration and another column each time.
--
-- WHAT A ROW IS: one widget in one slot. `metric_id` is a catalogue id from
-- src/tracking/data/metricCatalog.ts (e.g. 'approaches_weekly') OR a
-- goal-derived id of the form 'goal:<goal uuid>:<view>' for goals the user typed
-- themselves, which have no metric backend of their own. The catalogue lives in
-- code, not here: it is static, typed, and must stay in lockstep with the
-- resolver that reads it. Only the user's CHOICES are data.
--
-- ORDERING: `position` is 0-based and dense within (user_id, dashboard_key).
-- There is deliberately NO unique constraint on it — the layout is written as a
-- whole (delete-then-insert in one call), and a unique index would reject the
-- intermediate states of a reorder unless it were deferrable. Uniqueness is not
-- an invariant worth a constraint here: two widgets sharing a position sort by
-- id and the page still renders.
--
-- ACCESS: own-row CRUD. A row is a preference the user sets by hand, not a value
-- earned or computed from their activity, so the user owning it may read and
-- write it. Every policy is an equality against auth.uid(); there is no path to
-- another user's rows. Note that a goal-derived metric_id embeds a goal UUID:
-- the server re-checks goal ownership when resolving values, because a
-- hand-written row must not become a way to read someone else's goal titles.

create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Which dashboard this widget belongs to. 'tracking' is the only one today.
  dashboard_key text not null default 'tracking',
  -- 0-based slot within the dashboard.
  position integer not null default 0,
  -- 'metric_tile' is the only type today. Future: 'chart', 'goal_list', 'note'.
  widget_type text not null default 'metric_tile',
  -- Catalogue id or 'goal:<uuid>:<view>'. Null for widget types that carry no metric.
  metric_id text,
  -- Per-widget options: label override, tile size, target line. Shape is owned
  -- by the widget type in code.
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_widgets_position_nonneg check (position >= 0),
  constraint dashboard_widgets_dashboard_key_len check (char_length(dashboard_key) between 1 and 64),
  constraint dashboard_widgets_widget_type_len check (char_length(widget_type) between 1 and 64),
  constraint dashboard_widgets_metric_id_len check (metric_id is null or char_length(metric_id) between 1 and 128)
);

-- The only read pattern: one user's one dashboard, in order.
create index if not exists dashboard_widgets_user_dashboard_idx
  on public.dashboard_widgets (user_id, dashboard_key, position);

alter table public.dashboard_widgets enable row level security;

-- Own-row CRUD. The user authors these rows; nothing here is earned or computed.
create policy "dashboard_widgets_select_own"
  on public.dashboard_widgets for select
  using (auth.uid() = user_id);

create policy "dashboard_widgets_insert_own"
  on public.dashboard_widgets for insert
  with check (auth.uid() = user_id);

create policy "dashboard_widgets_update_own"
  on public.dashboard_widgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dashboard_widgets_delete_own"
  on public.dashboard_widgets for delete
  using (auth.uid() = user_id);

comment on table public.dashboard_widgets is
  'Per-user dashboard layout (which widgets, what order). Own-row CRUD RLS. metric_id references the code-side catalogue in src/tracking/data/metricCatalog.ts, or is goal:<uuid>:<view> for goal-derived metrics.';
