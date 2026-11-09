# Notifications runbook

What to do when notifications misbehave: Time's running-timer notification and 6 h alert, and the time & energy
audit's quarter-hour pings (`Plans/energy-audit.md`, live since 2026-11-09). Thought Frequencies and its reminders were deleted on
2026-11-08 (`Plans/thought.md` is kept as history).
How it is built: `src/notifications/`, the push block at the end of `public/sw.js`.

## How a notification travels

1. **The clock.** A `pg_cron` job, `notifications-clock`, runs `public.notifications_clock_tick()` every minute.
   It does nothing unless something is due (a time tracker 6 h alert, an audit ping or an audit's end notice,
   below); then it calls
   `notifications_clock_url` from Supabase Vault with
   `Authorization: Bearer <notifications_clock_secret>` through `pg_net`.
2. **The address.** `POST /api/notifications/tick` checks the secret (constant time) and runs what is due:
   `runTimerAlertClock` and `runAuditPingClock`, each on its own, so one failing never stops the other.
3. **The send.** `src/notifications/pushService.ts`: one `notification_sends` row, then `web-push` to each
   switched-on device in `push_devices`. TTL 10 minutes, urgency high. 404/410 from the push service deletes
   the device; 20 failures in a row switch it off.
4. **The phone.** The worker shows it under one tag (a new one replaces the last); a tap opens the url in the
   payload.

## The running timer in the shade (time tracker)

Built by `Plans/time-tracker-like-toggl.md`, Phase 7: `src/timetrack/runningTimerService.ts`,
`app/api/timetrack/stop/route.ts`, the timer half of the notification block in `public/sw.js`, migration
`20261105150000_running_timer_notification.sql`.

- **Who gets it.** Devices with `push_devices.timer_running` on: "Show the running timer on this device" in the
  tracker's Settings → Automation. Separate from `enabled` (audit pings). On by default when the
  installed app registers, off for a desktop browser. A device with it off is never sent a timer push, so the
  entry's description never reaches it.
- **When.** The sync route (`/api/timetrack/sync`) reads the running entries before each write that carries
  entries and again after the answer has gone (`after`). A start, a stop, a switch or a moved start pushes; an
  edit of only the description does not. Kind `timetrack-running`, tag and topic `timer-running`, TTL 12 h,
  silent, not renotifying. A stop shows "Stopped · Gym 1:12"; a deleted running entry "Deleted · Gym".
- **Stop.** The worker posts `{entryId, at, sentAt}` to `/api/timetrack/stop` (`at` = the tap). The route runs
  as the signed-in person (row security), takes same-origin JSON only, corrects the phone's clock by
  `now - sentAt`, refuses a stop more than 2 min in the future or before the start, and writes through
  `timetrack_push` with the entry's version as base (D1), so a phone's later stale sync is refused. Offline,
  the stop waits in the worker's IndexedDB (`timer-stops`) and goes by Background Sync (`timetrack-stop`), or
  when the tracker next opens.
- **The 6 h alert.** `timetrack_alert_due()` makes the database's clock call the tick when a running entry has
  passed 6 h, has no `timetrack-alert` row in `notification_sends`, its person has a device showing the timer,
  and it is 07:00–22:59 in their zone. The tick (`runTimerAlertClock`) reads the list itself from
  `timetrack_alerts_due(200)`: those rules, applied before the limit, at most one entry per person (their
  oldest), oldest first, so no account's entries can crowd out another's. It checks again and sends once,
  with sound; the unique index `notification_sends_one_alert_per_entry` refuses a second record for the entry.

Read-only checks (put the person's id in):

```sql
select label, enabled, timer_running, failures, last_success_at from push_devices where user_id = '<id>';
select kind, entry_id, sent_at, devices, delivered from notification_sends
  where user_id = '<id>' and kind like 'timetrack-%' order by sent_at desc limit 10;
select public.timetrack_alert_due('<id>');
```

Switch the timer off for every device of one person: `update push_devices set timer_running = false where
user_id = '<id>';`. The whole way back: `supabase/migrations/rollback/20261105150000_running_timer_notification.down.sql`
(deploy the app from before Phase 7 first; it deletes the timer rows from the send log).

## The time & energy audit's pings

Built by `Plans/energy-audit.md`, Phase 5: `src/audit/pingService.ts`, `app/api/audit/ping/route.ts`, the audit
half of the notification block in `public/sw.js`, migration `20261109110000_energy_audit.sql`.

- **Who gets them.** Devices with `push_devices.enabled` on ("Turn on pings for this device" on `/audit`, and the
  device list in the audit's Settings). Only while the person has an open audit (`audit_runs.ended_at is null and
  now() < ends_at`).
- **When.** At :00, :15, :30 and :45, about the quarter that just ended ("What did you do from 10:00 to 10:15?"),
  only in the first 5 minutes after it ended, never for a quarter whose start is in the person's quiet hours
  (default 22:00–08:00), never while muted, never for an answered quarter. `audit_pings_due(limit, now)` decides;
  the send log holds one `audit-ping` row per quarter (`entry_id` `audit:<run>:<epoch>`, unique index
  `notification_sends_one_ping_per_quarter`), so a quarter is never pinged twice. After the 14 days, one
  `audit-end` notice ("Your two weeks are done"), never after End now.
- **What the lock screen shows.** Only times. Nothing the person wrote is ever in a payload or a log line.
- **The buttons.** "Same as before" copies the previous quarter's answer (never its why); "Mute 1 h" mutes. The
  worker posts `{action, slotAt, sendId}` to `/api/audit/ping`; the route acts only on this person's own ping
  for exactly that quarter, from a same-origin JSON request. On any failure the ping comes back as "Not saved.
  Tap to answer."

**How to stop them**, from least to most:
1. The person: Mute (30 min to until morning) or quiet hours in the audit's Settings, or switch the device off.
2. One person's audit: `update public.audit_runs set ended_at = now() where ended_at is null and user_id = '<id>';`
3. Every audit: `update public.audit_runs set ended_at = now() where ended_at is null`. Time's alert keeps working.

Read-only checks (put the person's id in):

```sql
select id, started_at, ends_at, ended_at, quiet_start, quiet_end, muted_until from audit_runs where user_id = '<id>';
select kind, entry_id, sent_at, devices, delivered from notification_sends
  where user_id = '<id>' and kind like 'audit-%' order by sent_at desc limit 10;
```

`audit_pings_due` and `audit_ends_due` may only be called by the service role, so the read-only role gets
"permission denied" for them; read `audit_runs` instead.

## Stop every notification now

In the Supabase SQL editor:

```sql
select cron.unschedule('notifications-clock');
```

**This stops Time's 6 h alert and the audit's pings too**, because the same clock rings them. Nothing is deleted. To start again, run
`select cron.schedule('notifications-clock', '* * * * *', 'select public.notifications_clock_tick()');`.
The way back from Thoughts' removal is `supabase/migrations/rollback/20261109100000_thoughts_out.down.sql`
(the data does not come back). **Never run** `rollback/20261030120000_thought_frequencies.down.sql` or
`rollback/20261030130000_thoughts_clock.down.sql`: they drop `push_devices`, `notification_sends`,
`notification_secret()` and the clock, which Time needs.

## "I am not getting notifications"

1. Is it an iPhone in Safari? Notifications only work from the Home Screen app (iOS 16.4+). The page says so.
2. The device card: "blocked" means the phone's settings refused permission; "stopped on this device" means the
   permission was taken back; "nothing for a day" means sends are not arriving.
3. Read-only checks, in the SQL editor (put the person's id in):
   ```sql
   select label, enabled, timer_running, failures, last_success_at from push_devices where user_id = '<id>';
   select kind, sent_at, devices, delivered, removed from notification_sends where user_id = '<id>' order by sent_at desc limit 10;
   select status, return_message, start_time from cron.job_run_details
     where jobid = (select jobid from cron.job where jobname = 'notifications-clock') order by start_time desc limit 5;
   select status_code, created from net._http_response order by created desc limit 5;
   ```
   `delivered = 0` with `devices > 0`: the push service refused; `failures` on the device says how often.
   `status_code` 401 from the tick: the secret in the vault and the one the site reads differ (they are the
   same vault entry, so this means the site cannot read the vault — check `SUPABASE_SERVICE_ROLE_KEY`).
4. Battery saver, Focus and Do Not Disturb can hold notifications back. No website can get past them.

## Rotate the keys or the secret

The values live only in Supabase Vault (`push_vapid_public`, `push_vapid_private`,
`notifications_clock_secret`, `notifications_clock_url`), read through `public.notification_secret` by the
service role. A copy of the generated values is in `~/dg-secrets/thoughts-push.env` (mode 600) on the owner's
machine; never commit or paste them.

- **The clock's secret:** `select vault.update_secret((select id from vault.secrets where name =
  'notifications_clock_secret'), '<new value>');` Each server instance reads it once; a deploy (or waiting for
  instances to recycle) picks up the new one. Until then ticks may answer 401 and are simply retried next minute.
- **The push keys:** changing them orphans every registered device — a subscription is bound to the public key.
  Rotate both keys together, then delete the rows in `push_devices`; each device registers again the next time
  its owner turns notifications on again on that device. Only do this if the private key leaked.

## Never expose the `net` schema

`pg_net` comes with Supabase's own grants to `anon` and `authenticated`, which this project's `postgres` role
cannot take back (they were granted by `supabase_admin`). Its queue table briefly holds the clock's bearer
secret. What keeps clients out is that the Data API exposes only `public` and `graphql_public` (checked
2026-10-30: asking for `net` answers `PGRST106 Invalid schema: net`). **Do not add `net` (or `extensions`) to
the exposed schemas in the Supabase dashboard.**

## When the app leaves Vercel

Run a timer on the new server that does what the job does: once a minute, if anything is due, `POST` the tick
address with the secret. Then `select cron.unschedule('notifications-clock');`. The address, the secret and the
rules stay the same (`docs/plans/own-platform-and-app.md`).
