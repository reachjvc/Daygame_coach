# Rebrand: DayGame Coach becomes 10K Days Club (10kdaysclub.com)

Written 2026-11-18 on the owner's instruction: *"The name of the website must change to 10kdaysclub.com, so all
branding should reflect this broader market now. The landing page should not say AI daygame coaching … make sure
to find everything … I need to be able to chronoshift back in time, and see what I used to have … and make sure I
don't lose any data."*

**Status: written, nothing built. Waits for the owner's one ask below.** Phases 0–2 need only his "go";
Phase 3 needs his Vercel login, Phase 4 needs the domain he buys.

---

## Before anything: what only the owner decides (one ask)

| # | Decision | Recommendation | Costs money? |
|---|---|---|---|
| O1 | Go for this plan, including the new words in Phase 1 (each line can be vetoed later; nothing deletes his data) | Yes | No |
| O2 | Let Claude into the Vercel account that owns the live site (`jonas879-8953s-projects`): approve one device-login link Claude posts in chat. Or rename it himself (Phase 3 lists the clicks) | Approve the link | No |
| O3 | Buy **10kdaysclub.com**, auto-renew on. In the same Vercel account: Domains → Buy, so the address and its settings land in one place | Buy it there, today if possible (it was free on 2026-11-18) | **Yes**, about USD 10–20 a year; he checks the price page and clicks himself |
| O4 | Claim the free handles on his phone: Instagram @10kdaysclub, YouTube @10kdaysclub | Yes, same day as the domain | No |
| O5 | Rename the GitHub repo `Daygame_coach` → `10kdaysclub` (Q5) and make it private (Q6) | Rename yes; private yes | No |
| O6 | Tell Claude every place he has used the site: which phone and browser, whether it is installed on the home screen, which PC browsers | — | No |

## Which model runs what (owner, 2026-11-18)

| Work | Model | How |
|---|---|---|
| This plan, the words in Phase 1, the logo brief (Phase 7), the final review gate (Phase 9) | Opus | the planning session |
| Code changes, settings changes, the move page, screenshots, the device walk | Sonnet | `claude --model sonnet`; subagents `model: "sonnet"` |
| Grep gates, comparing screenshots to the checklist | Haiku | subagents `model: "haiku"` |

---

# PART 1 — in plain words

## Can Claude rename it himself?

Yes, once he is let into the right Vercel account (O2). The live site lives in a second Vercel account
(`jonas879…`); Claude's login (`reachjvc-1930`) only sees an old, unused project. The rename itself is free and
can be undone. Renaming the project does **not** take the old address away: `daygame-coach.vercel.app` keeps
working, and `10kdaysclub.vercel.app` (free on 2026-11-18) is added beside it. When the real domain arrives,
it becomes the main address.

## Can he always go back in time?

**For the code and every word on the site: yes.** Every saved version since the first one on 2026-01-20 (1,618 of
them) can be reopened at any time, on GitHub and on this PC. Phase 0 adds a bookmark named
`before-10kdays-rebrand`, so "what I had before" is one name, not a search. Phase 0 also takes phone and desktop
screenshots of every page as it looks today, so he can *see* the old site without anyone starting it up.

**Not covered by saved versions, so Phase 0 backs them up separately:**
- His data in the database (98 tables, 323 MB, 8 accounts). The rebrand does not change any of it, but a full
  copy is taken first anyway.
- The settings in the Vercel and Supabase dashboards (login email texts, sender name, allowed addresses, the
  notification clock's address). Their old values are written down so each can be put back.
- Things kept only in his browser (next section).

One warning: an old version cannot simply be put back online and used. The database has moved on since, and old
code writing to today's data could damage it. Old versions are for looking at (screenshots, or run on this PC
against the empty test database), not for running against his real data.

## Will he lose data?

**Not if the move happens in the order below.** The risk is not the name. It is the **new address**: a browser
keeps some things per address, so on 10kdaysclub.com the phone starts with an empty memory. Found:

- **Kept only in the browser, no copy anywhere:** the answers in the quit tools (`/quit`, private by design), and
  the old vice module's data from Aug–Sep.
- **Waiting to be sent:** workout sets, audit answers and time-tracker changes made without signal, a timer Stop
  tapped on a notification without signal, Black Box entries and Life plan edits not yet saved.
- **Tied to the old address:** the home-screen app icon, notifications (the server's clock calls the old address
  every minute), and the links in sign-up and password emails.

So: the old address keeps working until he has opened a small **move page** on each of his devices (Phase 5). It
sends everything that is waiting, carries the browser-only data across to the new address, and says "all moved".
Only after he confirms each device does the old address start forwarding to the new one (Phase 6). The old
address is never deleted.

## What changes, and what does not

- **Changes:** everything a visitor or user reads as the brand: the name in the header and on all five login
  pages, page titles, the home page, the app name on the phone, the quit tools' header and share image, the
  sign-up and reset emails and their sender name, the notification help texts, the footer.
- **The home page** stops being "Master Daygame From Home". It leads with his campaign line ("Ten years from now,
  you might be able to say… I DID IT.") and shows the whole product, with Dating as one part of it.
- **Stays:** the dating features themselves (Scenarios, Ask Coach, field tracking, life area "Dating & Daygame")
  keep their dating words, because there they describe the feature, not the brand. The internal names inside the
  code and database also stay: renaming them would risk exactly the data loss above and no visitor sees them.
- **Dating examples inside non-dating screens** (an audit placeholder "Email, gym, daygame…") become neutral.
- **Removed claim:** "Join hundreds of men who are improving…" is not true yet (he is the only user), so it goes.

---

## BLOCKERS (each attempted once on 2026-11-18)

| ID | What | Attempted, and what came back | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Vercel account that owns the live site | `vercel whoami` → `reachjvc-1930`; `vercel project ls` → only `v0-ai-daygame-coach`. GitHub's latest Production deployment URL is `daygame-coach-l63u08jgq-jonas879-8953s-projects.vercel.app`, so the owner is team `jonas879-8953s-projects` | Phases 3, 4, 6 (names, domain, env var), reading the `/` crash log (B3) | O2: Phase 3 starts `npx vercel@latest login` from a scratch folder and posts the link once |
| B2 | The domain | RDAP `rdap.verisign.com/com/v1/domain/10kdaysclub.com` → 404 (not registered); `10kdaysclub.vercel.app` → 404 (free) | Phase 4 | O3 |
| B3 | The live home page crashes | `curl https://daygame-coach.vercel.app/` → **500** (build 709d800f); `/api/healthz` → ok. Same as `quit-copy.md` B1: Vercel only, local production builds give 200 | Checking the new home page live (Phase 1) | Read the function log once B1 is cleared; fix in Phase 1. If another session fixed it first, skip |
| B4 | Supabase settings outside the repo | **Read** through the management API (only these fields): `site_url` and `uri_allow_list` name only `daygame-coach.vercel.app` (plus localhost); sender name `DayGame Coach`, sent through his Gmail; the confirmation and reset email texts say "DayGame Coach" twice each; Vault `notifications_clock_url` → `daygame-coach.vercel.app/api/notifications/tick` | Nothing (access works) | Phases 2 and 4 change them; Phase 0 records the old values |
| B5 | How long Vercel keeps old deployments | Not readable without B1 | Only "go back in time" via Vercel (git and screenshots cover it anyway) | Phase 3 reads the project's retention setting and writes it here |

## OPEN QUESTIONS (each has a recommendation; the build follows it unless he vetoes)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Keep the orange crosshair logo? (it is a target sight, the old brand's mark; it has no letters) | Keep it for now; replace it in Phase 7 with a small, separate logo round | New logo before launch | Small: one component, six icon files |
| Q2 | Home page headline | His line: "Ten years from now, you might be able to say… I DID IT." | A plain promise ("Plan the life you want…") as the headline, his line lower | One line |
| Q3 | Sign-up emails keep coming from his Gmail, under the name "10K Days Club"? | Yes, until there is a real address. `hello@10kdaysclub.com` comes with the platform plan | Set up domain email now (free forwarding, but sending from it needs setup) | Small |
| Q4 | Pricing cards: prices and tier names untouched (his to set), feature lines broadened | Yes | Hide pricing until he sets prices | Small |
| Q5 | Rename the GitHub repo | Yes, to `10kdaysclub`. GitHub forwards the old address; pushes keep working. Phase 8 checks Vercel still deploys after it | Keep `Daygame_coach` | Small |
| Q6 | Make the repo private (also asked in `Plans/platform.md` A4) | Yes: a public repo shows "daygame" in 1,618 saved versions to anyone who finds the brand | Keep public | Medium: history stays public |
| Q7 | Rename internal names (code, database, browser keys, test fixtures, `package.json`, the project folder on this PC) | **No.** Browser keys hold his data; the folder name ties Claude's memory; nobody sees the rest | Rename them | High: data loss for no visible gain |
| Q8 | Old documents and plans that say "daygame" | Leave them: they are the record of what happened | Rewrite history | None |

---

## PHASES

### Phase 0 — Safety net (Sonnet; nothing visible changes)

1. `git tag before-10kdays-rebrand <main sha at start>` and `git push origin before-10kdays-rebrand`.
2. Full database backup: one `json_agg` query per public table for **all** rows (method in memory note
   `live-db-backup-method`), gzip, to `~/dg-backups/rebrand-2026-MM-DD/`. Check: file count = 98 tables, each
   row count matches `select count(*)`.
3. Write the old settings to `~/dg-backups/rebrand-2026-MM-DD/settings-before.md`: Supabase `site_url`,
   `uri_allow_list`, `smtp_sender_name`, the full confirmation and recovery email templates, the Vault
   `notifications_clock_url` host (never print other Vault values).
4. Screenshots, phone width (390×844) and desktop (1440×900), signed out: `/`, `/auth/login`, `/auth/sign-up`,
   `/auth/sign-up-success`, `/auth/forgot-password`, `/auth/reset-password`, `/privacy`, `/quit` (local build if
   live 500s); signed in with a test-stack account: `/dashboard`, `/plan`, `/time`, `/training`, `/scenarios`,
   `/settings`, `/tools`. Save to `~/.cache/daygame-research/rebrand/before/`. Use a local server on the test stack
   (memory `worktree-e2e-servers`), never the live database.

**Done when:** tag on GitHub, backup counts match, settings file and screenshots exist.

### Phase 1 — The words (Sonnet builds; every text below is decided, the builder decides none)

Work in a worktree, ship by fast-forward (memory `shared-checkout-tool-quirks`).

1. New file `src/shared/brand.ts`: `export const BRAND = { name: "10K Days Club", short: "10K Days",
   domain: "10kdaysclub.com", url: "https://10kdaysclub.com" } as const`. Every change below reads from it.
2. Brand name:
   - `components/AppLogo.tsx:19` → `BRAND.name`.
   - The five auth pages (`app/auth/login/LoginPageClient.tsx:119`, `app/auth/sign-up/page.tsx:105`,
     `app/auth/sign-up-success/SignUpSuccessClient.tsx:75`, `app/auth/forgot-password/page.tsx:64`,
     `app/auth/reset-password/page.tsx:86`) → `BRAND.name`.
   - `app/layout.tsx`: `title: { default: "10K Days Club", template: "%s · 10K Days Club" }`; description
     "Plan the life you want, quit what holds you back, and track the days that get you there.";
     `appleWebApp.title` → `BRAND.short`.
   - `app/manifest.ts`: name `BRAND.name`, short_name `BRAND.short`, description "Plan the life you want and
     track the days that get you there." Do **not** add or change `id`, `start_url` or `scope`.
   - `src/quit/data/frame.json` `siteName` → "10K Days Club" (header and share image follow).
   - `src/notifications/components/PushDeviceCard.tsx:68` "Find 10K Days and switch Allow Notifications on.";
     `:127` "Open <b>10K Days</b> from its icon and come back here".
   - `src/timetrack/config.ts:105` `CREATED_WITH` → "10kdaysclub". **Leave `SEED_CREATED_WITH` (line 111)
     unchanged**: demo detection matches it against saved rows. Saved entries keep "daygame-coach".
   - `src/notifications/pushService.ts:116` fallback → `BRAND.url`.
   - `public/icon.svg:2` comment → "Brand mark - 10K Days Club".
3. Home page (`src/home/components/HomePage.tsx`), signed-out view:
   - Badge (line 50): "10,000 days ≈ 27 years".
   - H1 (line 53): "Ten years from now, you might be able to say… I DID IT."
   - Line (56–57): "Plan the life you want, build the habits, quit what holds you back, and get better at dating.
     One day at a time."
   - "Why Practice With AI?" (81) → "What's inside", four cards, each only if its page exists on `main`
     (check the route list; drop a card whose page is missing and note it in the commit):
     "Your plan: Decide what you want in each part of your life, then take the next step." ·
     "Your days: Time Log, training and a weekly time & energy audit show where the days really go." ·
     "Quitting: A private Black Box for the habit you are leaving behind." ·
     "Dating: Practice conversations with an AI that answers like a real person, and log what happens out there."
   - CTA (185, 187): "Day one is today." / "Every day you count is one of the 10,000." Button text "Start today".
   - Footer (203): "© 2026 10K Days Club".
4. Pricing (`src/home/products.ts`): names, descriptions and prices untouched. Feature lines for every tier:
   "Your plan, Time Log and Training", "Dating practice with AI conversations", "Progress tracking",
   "Available 24/7"; the 2-month plan keeps "Save 12.5% vs monthly".
5. Dating examples on non-dating screens: `src/audit/components/ActivityField.tsx:49` "Email, gym, reading…";
   `src/audit/components/PerfectWeek.tsx:175` "Write the book, Gym, Dating…";
   `src/health/components/CorrelationPanel.tsx:74,83,98` "Health × Dating", `:86` "daygame sessions" →
   "field sessions". Everything inside Scenarios, Ask Coach, Tracking, Inner Game and the dating life area stays.
6. B3: with B1 cleared, read the Vercel function log for `/`, fix the crash, prove 200 live.
7. Tests: update the three `tests/unit/navigation/*` hosts only if a test asserts the brand; run vitest and
   `node scripts/typecheck-ratchet.mjs`; add one unit test that `app/manifest.ts` and `app/layout.tsx` metadata
   contain no "daygame" (case-insensitive).

**Done when:** the Phase 9 grep gate passes for these files, phone screenshots of every Phase 0 page show the new
name, pushed, healthz shows the commit. The site still runs on the old address.

### Phase 2 — Make every outside setting accept both addresses (Sonnet; additive only)

1. Supabase auth (management API PATCH, fields only): `smtp_sender_name` "10K Days Club"; in the confirmation and
   recovery templates replace "DayGame Coach" with "10K Days Club" (4 places, nothing else); `uri_allow_list` adds
   `https://10kdaysclub.vercel.app/**` and `https://10kdaysclub.com/**`, keeping every old entry.
2. The **move page** `app/move/page.tsx` (public, no sign-in needed to open; same code on every address):
   - Step 1 "Send what's waiting": runs the existing sync for the time tracker, workout queue, audit queue,
     Black Box and Life plan; asks the service worker to flush IndexedDB `timer-stops`; shows each as
     "sent" / "nothing waiting" / "could not send: sign in and retry".
   - Step 2 "Carry the rest": collects `quit-v1`, `quit-vice-v1`, `custom-program-v1`, `plan-due-hidden:*`
     from this browser and opens `https://<new address>/move#carry=<base64url JSON>`. The `#` part never reaches
     any server, so the quit tools' "not sent to us" promise holds. On arrival the page writes each key only if
     it is empty there, otherwise keeps both (`quit-v1` → `quit-v1-from-old` and says so). Plus a "Download as
     file" / "Load from file" fallback for data too long for a link (over 1.5 MB).
   - Step 3 "Done": shows what moved, with counts.
   - Unit tests for pack/unpack and for "never overwrite"; an e2e test on two local ports (two origins).
3. A switch in `proxy.ts`: when env `OLD_HOST_REDIRECT=on` and the host is `daygame-coach.vercel.app`, answer
   308 to the same path on `BRAND.url`, except `/move`, `/sw.js` and `/api/*`. Off by default. Unit test.

**Done when:** pushed; login emails still work on the old address (Phase 9 check 4), the move page works between
two local ports.

### Phase 3 — Vercel names (Sonnet, after O2)

1. `npx vercel@latest login` from `scratchpad/vc`, post the link once; then `vercel whoami` shows the owning
   account.
2. Rename the project to `10kdaysclub`; add domain `10kdaysclub.vercel.app`. Keep `daygame-coach.vercel.app`.
3. Read the deployment-retention setting; write it into B5.

If he prefers clicking: Vercel → project `daygame-coach` → Settings → General → Project Name; then Settings →
Domains → Add → `10kdaysclub.vercel.app`.

**Done when:** both addresses answer 200 on `/api/healthz` with the same buildId.

### Phase 4 — The real domain (Sonnet, after O3)

1. Add `10kdaysclub.com` and `www.10kdaysclub.com` (www forwards to the bare domain) to the project; wait for the
   certificate.
2. Vercel env `NEXT_PUBLIC_APP_URL` = `https://10kdaysclub.com`; redeploy.
3. Supabase `site_url` → `https://10kdaysclub.com` (old entries stay in the allow list).
4. Vault `notifications_clock_url` → `https://10kdaysclub.com/api/notifications/tick` (the one database write in
   this plan; old value is in the Phase 0 settings file). Then check `cron.job_run_details` shows the next runs
   succeeding.
5. GitHub repo vars `NEXT_PUBLIC_APP_URL` / `SITE_DOMAIN` only if they exist (self-host path; not live).

**Done when:** `https://10kdaysclub.com/api/healthz` = main; a notification tick succeeds; old address still
serves the app.

### Phase 5 — Move his devices (Sonnet, with him; about 5 minutes per device)

For each place in O6, in this order:
1. Open `https://daygame-coach.vercel.app/move` there (inside the installed app if it is installed), signed in,
   with signal. Wait for "all sent", then tap "Carry to 10kdaysclub.com".
2. On the new address: sign in, check his Time Log, plan and Black Box look right.
3. Install the app from `10kdaysclub.com` (Add to Home Screen), turn notifications on there.
4. Old address → Settings → Notifications → remove this device; then delete the old home-screen icon.
Claude then checks: `push_devices` holds only new-address rows; no queue rows stuck.

**Done when:** he says every device is moved.

### Phase 6 — The old address forwards (Sonnet, after Phase 5)

Set `OLD_HOST_REDIRECT=on` in Vercel, redeploy. Check: `curl -I https://daygame-coach.vercel.app/plan` → 308 to
`https://10kdaysclub.com/plan`; `/move` still 200. The old address stays attached to the project for good, so old
links keep landing.

### Phase 7 — New logo (Opus brief, after he answers Q1; creative, so ask first)

Ask him 3 short questions (feel, letters or symbol, colours), then one board with up to 6 marks, each with 👍 and
a note box (memory `review-boards-note-log`). Built: the chosen mark into `public/` icons (all sizes, maskable),
`AppLogo.tsx`, `app/favicon.ico`.

### Phase 8 — Housekeeping names (Sonnet, after O5)

1. Rename the repo (`gh repo rename 10kdaysclub`), `git remote set-url origin git@github.com:reachjvc/10kdaysclub.git`
   (other sessions keep working: GitHub forwards). Push one commit; confirm Vercel deploys it (healthz). If it does
   not: he reconnects the repo in Vercel → Settings → Git.
2. Private: `gh repo edit --visibility private --accept-visibility-change-consequences`, then push once more and
   confirm the deploy.
3. Living docs only: `CLAUDE.md` first line and opening sentence, `docs/product/map.md` title. Update the old
   address in memory notes that name it (healthz checks) to the new one.

### Phase 9 — Prove it (Haiku runs, Opus judges)

1. Grep gate: `git grep -n -i -E "daygame|day game|AI coach"` over `app/layout.tsx app/manifest.ts app/auth
   components/AppLogo.tsx src/home src/quit/data src/notifications/components app/move` → empty.
2. The live HTML of `/`, every `/auth/*` page, `/quit`, `/privacy`: `<title>` and visible text contain no
   "daygame"; `/manifest.webmanifest` names "10K Days Club".
3. Phone-width screenshots (Android emulator rig, memory `android-emulator-rig`) of the Phase 0 list on
   `10kdaysclub.com`, beside the before shots in one page for him; home page has no sideways scroll.
4. Emails: with the service key, `auth.admin.generateLink` for a test account (type `signup` and `recovery`);
   the link host is `10kdaysclub.com`, the template text says "10K Days Club". No real email sent.
5. Notifications: one tick in `cron.job_run_details` after Phase 4 succeeded; his phone gets one notification,
   not two.
6. Data: row counts for his tables equal the Phase 0 backup (plus anything he added since).
7. An Opus review agent, given only the live URLs and this list, hunts for any remaining old brand.

---

# PART 2 — rules for the build session

- Never rename a browser key, database table, column or `SEED_CREATED_WITH`.
- Never delete the old address, old push rows (he removes them in Phase 5), or any data.
- Every outside setting change: write the old value to the Phase 0 settings file first.
- Words not in Phase 1 are not written by the builder: a missing text goes under "Questions from the build"
  below, and the session moves on.
- Commit with `git commit --only <paths>`; run the type-check ratchet before pushing; check healthz after push.

## Execution prompt (Phases 0–2, then 3–6 as his items arrive)

```
/model sonnet
Read Plans/rebrand-10kdaysclub.md. Execute Phase 0, then Phase 1, then Phase 2, following Part 2. Stop before
Phase 3 unless `npx vercel@latest whoami` (run in a scratch folder) shows the account that owns the live site.
After each phase, mark it done in this file with the commit sha.
```

## Questions from the build

(none yet)
