# Toggl Track data model (API v9) + clone parity matrix

## Entity fields (from engineering.toggl.com / toggl_api_docs)

### TimeEntry
`id` · `workspace_id`(`wid`) · `user_id`(`uid`) · `description` · `project_id`(`pid`) · `task_id`(`tid`) ·
`tags` (names) · `tag_ids` · `billable` · `start` (ISO 8601) · `stop` (ISO 8601 | null) ·
`duration` (seconds — **if running, it is negative and equals −start_epoch, so real duration = now_epoch + duration**) ·
`duronly` (hide start/stop, show duration only) · `at` (last-updated) · `created_with` (required, client app name) ·
`server_deleted_at` · `shared_with`.

### Project
`id` · `workspace_id` · `client_id` · `name` · `color` (hex) · `active` · `is_private` · `billable` · `currency` ·
`rate` · `rate_last_updated` · `estimated_hours` / `estimated_seconds` · `auto_estimates` · `fixed_fee` ·
`recurring` + `recurring_parameters` · `current_period` · `start_date` · `end_date` · `template` ·
`actual_hours`/`actual_seconds` · `status` · `at` · `created_at` · `server_deleted_at`.

### Others
- **Client**: `id`, `wid`, `name`, `archived`, `at`.
- **Task**: `id`, `project_id`, `wid`, `name`, `estimated_seconds`, `active`, `user_id` (assignee), `tracked_seconds`, `at`.
- **Tag**: `id`, `wid`, `name`, `at`.
- **Workspace**: `id`, `name`, `default_currency`, `default_hourly_rate`, `rounding`, `rounding_minutes`, `only_admins_see_billable_rates`, `projects_billable_by_default`, `at`.
- **User/member**: `id`, `name`, `email`, `role` (basic|manager|admin), `hourly_rate`, `labour_cost`, `timezone`, `beginning_of_week`, `duration_format`, `time_format`, `date_format`.
- **Reports API**: `POST /reports/api/v3/workspace/{wid}/{summary|search}/time_entries` with `start_date`, `end_date`, `grouping`, `sub_grouping`, `project_ids`, `client_ids`, `tag_ids`, `user_ids`, `billable`, `description`, `rounding`, `rounding_minutes`.

Negative-duration encoding, the 4-level rate hierarchy, and the grouping/sub-grouping report shape are reproduced verbatim in the clone.

## Parity matrix — `/test/toggl`

| Toggl capability | Clone | Notes |
|---|---|---|
| One-click timer, running entry, live elapsed | ✅ | tab title shows elapsed like Toggl |
| Timer / Manual mode | ✅ | |
| `@project` / `#tag` inline autocomplete | ✅ | |
| Edit running duration → shifts start | ✅ | |
| Favorites + `1..9` hotkeys | ✅ | |
| Shortcuts `S N M C 1-9 Shift+?` | ✅ | overlay included |
| Day groups, day + week totals, grouped identical entries | ✅ | |
| Continue / duplicate / split(>10 min) / delete / copy start link | ✅ | |
| Bulk edit + bulk delete | ✅ | |
| Undo delete | ✅ | |
| Calendar view: day/week, drag-create, move, resize, now-line, overlap layout | ✅ | |
| External calendar column + click-to-track | ✅ | |
| Google Calendar import | ✅ (ICS secret address, .ics upload, service-account API) | OAuth "Connect" button needs a Google OAuth client — see §Limits |
| All-day events skipped, 60d back/30d forward window | ✅ | matches Toggl's rules |
| Clients / Projects / Tasks / Tags CRUD + archive | ✅ | |
| Project colors (Toggl palette) | ✅ | 15 official hexes |
| Estimates (hours or monetary), auto-estimates, fixed fee | ✅ | |
| Recurring estimate periods | ✅ | weekly→yearly |
| Project alerts at 50/75/80/90/100/150 % | ✅ | in-app alert centre |
| Project dashboard w/ forecast + projected end date | ✅ | linear forecast from tracked pace |
| Rate hierarchy workspace→member→project→task + historical rates | ✅ | |
| Reports: Summary (bar+pie+group/subgroup), Detailed, Workload, Profitability | ✅ | |
| Summary-bar metric picker (7 metrics, pick 4) | ✅ | |
| Rounding (up/down/nearest × 1–60 min) | ✅ | |
| Saved reports + share link | ✅ | config encoded in URL |
| Export CSV / XLSX / PDF | CSV + JSON + print-to-PDF | XLSX needs a new dependency |
| Filters (date presets, client, project, task, tag, member, billable, text) | ✅ | |
| Team members, access levels, groups, member audit, reminders | ✅ (simulated members) | single real user; members are local records |
| Required fields, locked entries before date, timesheet approvals | ✅ | enforced on save |
| Duration/time/date format, first day of week, currency | ✅ | |
| Pomodoro (work+break intervals, notifications, continue) | ✅ | Web Notification API |
| Idle detection → keep/discard | ✅ | inactivity listener |
| AutoTracker keyword → project | ✅ | keyword rules on description |
| Timeline (auto app/browser recording) | ⚠️ partial | browser sandbox: records only this tab's visibility+route, not OS apps |
| CSV import of time entries / full JSON backup | ✅ | |
| Webhooks | ✅ simulated | outgoing calls logged in-app |
| Offline tracking + sync | n/a-by-design | storage is local-only, so it is always "offline" |
| Native desktop/mobile apps, browser extension | ❌ | out of scope for a web page |
| SSO, billing/subscription plans, QuickBooks invoicing, Jira/Salesforce/Zapier | ❌ | third-party accounts required |
| Real multi-user teams, email delivery of reports/reminders | ❌ | no auth/mail wiring on a test page |

## Limits worth knowing
- **Storage is `localStorage` only** (namespace `toggl-clone:v1`). No Supabase table, no migration, no RLS — deliberate, since this is a `/test` sandbox.
- **Google Calendar**: three import paths ship. The two zero-config ones (secret `.ics` address, `.ics` file upload) work today. Full OAuth "Connect" (multi-calendar picker + live refresh) needs a Google Cloud OAuth client ID/secret in env; the service-account path works if the calendar is shared with `GOOGLE_SERVICE_ACCOUNT_JSON`'s client email.
- Toggl's "Timeline" needs OS-level process access; a browser page cannot see other apps. Partial analog implemented and labelled as such in the UI.
