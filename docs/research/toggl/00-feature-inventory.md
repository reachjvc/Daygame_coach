# Toggl — Feature Inventory (primary sources, Aug 2026)

Sources: toggl.com/track/features, support.toggl.com KB articles, engineering.toggl.com API docs, toggl_api_docs repo.
Everything below is from Toggl's own docs, not review sites.

## Products under the "Toggl" brand
| Product | What it is | In scope for clone |
|---|---|---|
| Toggl Track | Time tracking + reporting + project budgets | YES — the clone |
| Toggl Plan | Timeline/Kanban planning, milestones, capacity | Partial (timeline/board out of scope, task+estimate model in) |
| Toggl Hire | Skills-assessment hiring funnel | NO (unrelated product) |

## Toggl Track — feature surface

### Time tracking
- **One-click timer** — start/stop from anywhere; running entry visible everywhere.
- **Timer mode vs Manual mode** — live timer, or type start/stop/duration by hand.
- **Description field autocomplete** — `@` opens project dropdown, `#` opens tags dropdown, inline in the description.
- **Offline tracking**, sync later.
- **Favorites** — pin an entry (desc+project+task+tags+billable); click or press `1..9` to start it prefilled.
- **Calendar view** — day/week grid; split layout: time entries left column, external calendar events right column.
- **Timeline** — desktop-app-only auto-record of app/browser activity for later conversion into entries.
- **Shared time entries** — add teammates to one entry.
- **Split entry** — 3-dot → Split; only entries **> 10 minutes**.
- **Duplicate / Continue / Copy start link / Delete**.
- **Bulk edit + bulk delete** — checkboxes per entry, up to one day at a time.
- **Grouped entries** — entries with identical (date, description, task, project, client, tags) collapse to one row; edits apply to all.
- **Pomodoro timer** — work interval + break interval, notification at each boundary; "Continue" after break restarts last entry, after work continues running entry.
- **Idle detection** — prompts keep/discard idle time.
- **AutoTracker** — app/keyword → project rules, fires a notification suggesting the project.
- **Tracking reminders** — days + time-of-day window; fire when nothing is running.

### Keyboard shortcuts (webapp, Timer page only, not while editing a field)
`Shift+?` all shortcuts · `S` stop · `N` new + start (timer mode) · `M` manual mode · `C` continue last · `1,2,3…` start favorite N · `@` project dropdown · `#` tag dropdown.

### Organising work
- **Workspaces** (inside Organizations) → **Clients** → **Projects** → **Tasks** (sub-projects) → **Time entries**; **Tags** cross-cut.
- Project: color, private/public, billable default, currency, hourly rate, **estimate** (hours *or* monetary), **auto-estimates** (sum of task estimates), **fixed fee**, **recurring estimate period** (weekly / biweekly / monthly / quarterly / yearly), start+end date, **template**, active/archived.
- **Project alerts** — on time-estimate (paid) or fixed-fee (premium) at **50/75/80/90/100/150 %**; recurrence-aware.
- **Project dashboard** — tracked vs estimate, dotted **forecast line** + dynamic projected end date, spend vs fixed fee, breakdown, period selector.
- **Historical billable rates** — rates valid from a date; past entries keep old rate.
- **Billable rates hierarchy** — workspace → member → project → task.

### Reports (tabs: Summary · Detailed · Workload · Profitability · My Reports)
- **Summary** — summary bar with up to 4 metrics chosen from: total hours, billable hours + %, revenue (billable h × rate), average daily hours, cost (hours × cost rate), profit (revenue − cost), fixed fee. Bar chart over periods (display Time / Billable % / Revenue / Cost / Profit, stackable by billable status, member, client, project, task, tag), pie chart by same dimensions, grouping + subgrouping table with expandable rows, sortable, addable columns.
- **Detailed** — one row per time entry, for review + export.
- **Workload** (formerly Weekly) — 7-day aggregates grouped by user and project, durations **or** earnings.
- **Profitability** — revenue/cost/profit per project/client/member.
- **My Reports / Saved reports** — save, reload, share via link (viewable without an account), schedule email delivery.
- **Rounding** — toggle; round entries to a chosen interval.
- **Filters** — date range, client, project, task, tag, member, billable, description.
- **Export** — PDF (portrait/landscape), CSV, XLSX.

### Team & data governance
Teams/groups · access levels basic/manager/admin · team member audit (filter by tracked-time level) · email tracking reminders · SSO · **required fields** (block save until filled) · **locked time entries** before a date · **timesheet approvals** (submit → approve → lock).

### Profile/workspace settings
Duration display format (Classic `1:30:00` / Improved `1:30` / Decimal `1.50`) · time format 12/24 h · date format · first day of week · timezone (default UTC) · default currency.

### Integrations
100+ · browser extensions (Chrome/Firefox/Edge) · **Google & Outlook Calendar** · Toggl Plan · Jira, Salesforce · QuickBooks invoicing · Zapier/Make · **API + webhooks**.

## Google/Outlook Calendar integration — exact behavior
1. Profile page → Native Integrations / External Calendars → **Connect** → Google OAuth consent (view calendars) → pick which calendars → app reloads.
2. Calendar view splits: **left = Toggl time entries, right = external events**.
3. Click an event → start a time entry from it · copy it as a time entry · open the event · see which calendar it came from.
4. New entry copies **only the event description** — project/tags must be set manually.
5. Limits: **all-day events are never imported** (needs start+end time); window is **60 days back / 30 days forward**; events are private to the calendar owner; **entries are never updated/deleted when the event later changes**; auto-track skips creation when locked time / approved timesheets / required fields block it.

## Toggl Plan (reference only)
Timeline + Kanban board views, color-coded plans, **milestones** and holidays across timelines, **recurring tasks** (Starter), capacity plan adds flexible hours, availability overview, task estimates, time-off, archive.
