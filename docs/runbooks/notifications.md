# Notifications runbook

What to do when reminders misbehave: Thought Frequencies' reminders today, any slice's notifications later.
How it is built: `Plans/thought.md` (Phases 5–6), `src/notifications/`, the push block at the end of
`public/sw.js`.

## How a reminder travels

1. **The schedule.** `thought_prompt_schedule.next_due_at`, one row per person, written by the server whenever
   settings are saved, a thought is logged, or a reminder is sent (`src/thoughts/promptService.ts`). Quiet
   hours, days, pause and the interval are applied there, in the person's zone (`src/thoughts/schedule.ts`).
2. **The clock.** A `pg_cron` job, `thoughts-clock`, runs `public.notifications_clock_tick()` every minute. It
   does nothing unless a row is due (or a time tracker 6 h alert is, below); then it calls
   `notifications_clock_url` from Supabase Vault with
   `Authorization: Bearer <notifications_clock_secret>` through `pg_net`.
3. **The address.** `POST /api/notifications/tick` checks the secret (constant time), claims every due row
   (`claim_due_thought_prompts`: a row is taken by one caller and leased for 5 minutes), re-checks the rules,
   and sends.
4. **The send.** `src/notifications/pushService.ts`: one `notification_sends` row, then `web-push` to each
   switched-on device in `push_devices`. TTL 10 minutes, urgency high. 404/410 from the push service deletes
   the device; 20 failures in a row switch it off.
5. **The phone.** The worker shows it under one tag (a new one replaces the last); a tap opens
   `/thoughts?log=1&prompt=<send id>`.

## The running timer in the shade (time tracker)

Built by `Plans/time-tracker-like-toggl.md`, Phase 7: `src/timetrack/runningTimerService.ts`,
`app/api/timetrack/stop/route.ts`, the timer half of the notification block in `public/sw.js`, migration
`20261105150000_running_timer_notification.sql`.

- **Who gets it.** Devices with `push_devices.timer_running` on: "Show the running timer on this device" in the
  tracker's Settings → Automation. Separate from `enabled` (Thought Frequencies). On by default when the
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

## Stop every reminder now

In the Supabase SQL editor:

```sql
select cron.unschedule('thoughts-clock');
```

Nothing is deleted. To start again, re-run the `cron.schedule(...)` line from
`supabase/migrations/20261030130000_thoughts_clock.sql`. The full way back is
`supabase/migrations/rollback/20261030130000_thoughts_clock.down.sql`.

## "I am not getting reminders"

1. Is it an iPhone in Safari? Reminders only work from the Home Screen app (iOS 16.4+). The page says so.
2. The page's top card: "blocked" means the phone's settings refused permission; "stopped on this device"
   means the permission was taken back; "nothing for a day" means sends are not arriving.
3. Read-only checks, in the SQL editor (put the person's id in):
   ```sql
   select next_due_at, last_sent_at from thought_prompt_schedule where user_id = '<id>';
   select label, enabled, failures, last_success_at from push_devices where user_id = '<id>';
   select kind, sent_at, devices, delivered, removed from notification_sends where user_id = '<id>' order by sent_at desc limit 10;
   select status, return_message, start_time from cron.job_run_details
     where jobid = (select jobid from cron.job where jobname = 'thoughts-clock') order by start_time desc limit 5;
   select status_code, created from net._http_response order by created desc limit 5;
   ```
   `delivered = 0` with `devices > 0`: the push service refused; `failures` on the device says how often.
   No rows in `notification_sends` while `next_due_at` keeps moving: no switched-on device.
   `status_code` 401 from the tick: the secret in the vault and the one the site reads differ (they are the
   same vault entry, so this means the site cannot read the vault — check `SUPABASE_SERVICE_ROLE_KEY`).
4. Battery saver, Focus and Do Not Disturb can hold reminders back. No website can get past them.

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
  its owner opens `/thoughts` and taps "Turn on". Only do this if the private key leaked.

## Never expose the `net` schema

`pg_net` comes with Supabase's own grants to `anon` and `authenticated`, which this project's `postgres` role
cannot take back (they were granted by `supabase_admin`). Its queue table briefly holds the clock's bearer
secret. What keeps clients out is that the Data API exposes only `public` and `graphql_public` (checked
2026-10-30: asking for `net` answers `PGRST106 Invalid schema: net`). **Do not add `net` (or `extensions`) to
the exposed schemas in the Supabase dashboard.**

## When the app leaves Vercel

Run a timer on the new server that does what the job does: once a minute, if anything is due, `POST` the tick
address with the secret. Then `select cron.unschedule('thoughts-clock');`. The address, the secret and the
rules stay the same (`docs/plans/own-platform-and-app.md`).
