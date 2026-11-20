# The platform this becomes: the ideal setup, and the road to it

Written 2026-11-18 on the owner's instruction: *"stop thinking about what we currently have … understand what
this will become … recommend the most ideal setup we can move towards … then a plan to execute on."* His rules
for it: **(1) the highest quality, most secure, best option is chosen; (2) it does not matter if that takes
longer.** Serves vision items 9–15, 36, 37, 46, 47 and 48.

**Status: awaiting the owner's yes on the bundled ask below.** Nothing in this plan is built yet. Vision item 36
changes from "open" to this plan the day he says yes.

---

## Before anything: what only the owner decides (one ask)

Answered once, at the start. Then the build does not stop for him again until Phase 8.

| # | Decision | Recommendation | Costs money? |
|---|---|---|---|
| A1 | Yes to the target setup in Part 1 | Yes | No (the decision itself) |
| A2 | Build it in a **new, private codebase**, copying over what is proven, rather than reshaping this one (Q1) | Yes | No |
| A3 | Create the accounts, his clicks only: AWS (and apply for AWS Activate Founders credits), Apple Developer, Google Play, Expo, Sentry. Vercel Pro when the public site moves (Phase 7) | Yes, in that order | **Yes.** Prices in Part 1 §5. Nothing is bought by Claude |
| A4 | Make the **current** repo private too (Q12) | Yes | No |
| A5 | Which phone he carries (iPhone or Android), so the right one is the test device (B7) | — | No |
| A6 | A company (e.g. an ApS) for the store accounts (B10) | Before Phase 9, not before building | Yes, his call |
| A7 | The live data move on cutover day, and later deleting the old Supabase and Vercel projects (Phase 8) | Asked again on that day: irreversible | No |

## Which model runs what (owner, 2026-11-18)

| Work | Model | How |
|---|---|---|
| This plan, the Phase 1 specs, every phase brief, design decisions, review gates, security review | Opus (big model) | The planning session; subagents `model: "opus"` for adversarial reviews |
| Building code, infrastructure code, porting features, writing tests, phone walks | Sonnet | `claude --model sonnet` (or `/model sonnet`); subagents `model: "sonnet"` |
| Mechanical checks: run suites, count endpoints with tests, compare screenshots to a checklist | Haiku | subagents `model: "haiku"` |

Rule for every build session: a step that needs a decision this plan does not make stops, writes the question
under "Questions from the build" at the bottom of this file, and the session goes on with the next step.

---

# PART 1 — in plain words

## 1. What this becomes

Taken from `docs/product/vision.md`, `docs/product/brand.md`, `Plans/first-1000.md` and `Plans/quit-tool.md`,
not from the code.

- **R1. A real installed app on iPhone and Android**, plus the same product in a browser (items 12, 46).
  Notifications arrive when the app is closed; a timer keeps counting with the screen dark.
- **R2. Two products under one account:** the dating coach (Scenarios, Inner Game, Ask Coach, field tracking)
  and the life half (Your plan, quit tools and the 90-day program, Training, Time Log, audit). Later a forum
  and articles (item 8).
- **R3. A free public front door that strangers find:** free quit tools, articles, the sales page. Fed by
  Instagram and search. It must load fast and rank.
- **R4. The most private data a consumer app can hold:** sex life, addiction, health, mood. Under EU law
  (GDPR Article 9) this is a special category with stricter rules. The owner is in Denmark, so EU law applies to
  every user.
- **R5. AI at the core:** practice conversations, coaching, plan help. Possibly by voice later. Each user may
  spend only the AI he paid for (item 11).
- **R6. Valuable data that must not leak:** the transcribed corpus and scenario data (item 10). Never sent to a
  phone or browser in bulk.
- **R7. Subscriptions sold on the web and inside the app stores**, one set of rights per user.
- **R8. Works offline where it matters:** a craving at 2 am on the metro, a field session, a running timer.
- **R9. "Nothing can go wrong" and "100% secure"** (items 9, 10): nobody reads another user's data, and every
  change ships through tests, staging and production (item 14).
- **R10. It is not rebuilt later** (item 15). The shape must hold from one user to a very large number, and from
  one owner to a team.

## 2. The setup

```
  iPhone app ─┐                                   ┌─ Public site (Next.js on Vercel, EU)
  Android app ┼─ one Expo codebase                │   sales page, free quit tools, articles
  Web app ────┘   (signed-in product)             │   holds NO user data
        │                                         │
        └──────── HTTPS, a login token ───────────┘
                         │
     ┌──────────── AWS, Frankfurt (eu-central-1) ───────────────────────────────┐
     │  CloudFront + AWS WAF (attack filtering, bot control, rate limits)       │
     │        │                                                                 │
     │  API service (TypeScript, Fastify) ── versioned /v1, every request       │
     │        │   checked: "is this yours?" in code AND in the database         │
     │        ├─ Aurora PostgreSQL (encrypted, 3 data centres, restore to any   │
     │        │   second for 35 days, immutable backup copies in a locked vault) │
     │        ├─ Cognito (login: passkeys, Sign in with Apple and Google)       │
     │        ├─ Bedrock → Claude, processed inside the EU                      │
     │        ├─ Workers + queues (AI jobs, reminders, emails, push)            │
     │        ├─ S3 (files, voice), SES (email)                                 │
     │        └─ Secrets Manager + KMS (keys never in code)                     │
     │  Separate AWS accounts: production · staging · security logs · backups   │
     │  GuardDuty, Security Hub, CloudTrail watch everything; all of it is code │
     └──────────────────────────────────────────────────────────────────────────┘
  Apple / Google push · Stripe (web) + RevenueCat (app stores) · Sentry EU (crashes)
```

## 3. Each choice, and why

| Piece | Choice | Why it wins on rule (1) | Rejected, and why | Its real downside |
|---|---|---|---|---|
| Phone apps | **Expo (React Native)**, with native Swift/Kotlin modules where a phone feature needs them | Truly native screens, one TypeScript codebase for iPhone, Android and web; Live Activities and lock-screen widgets are supported (`expo-widgets`); over-the-air fixes | Separate Swift + Kotlin apps: highest ceiling, but two codebases halve the quality per feature for a small team. Flutter: a second language. Capacitor: a website in a wrapper, which item 46 rules out | iPhone builds need Apple's tools: on this Linux machine they run in Expo's cloud (B7) |
| Signed-in web | **The same Expo app, built for the browser** | One set of screens on every device; Bluesky ships its iPhone, Android and web apps this way | A separate Next.js web app: every screen built twice | Desktop polish needs deliberate work |
| Public site | **Next.js on Vercel (Frankfurt)** | Vercel makes Next.js; best speed and search ranking for R3 | AWS-hosted Next.js: works, second-class | One more vendor, but it holds no user data and no database key |
| Backend | **One API service in TypeScript (Fastify), versioned, contract-first** (the contract is written first and the app's client code is generated from it) | Phone apps cannot be forced to update, so the contract must be fixed and versioned; every security check lives in one place; R6 data never leaves it | Clients talking straight to the database (the Supabase pattern): the pattern behind the 2025 leak of 170+ apps (CVE-2025-48757) | We own the API code, so tests must prove every rule |
| Cloud | **AWS, Frankfurt, several accounts, everything written as code (AWS CDK in TypeScript)** | The deepest security tooling and certifications, every service health-grade (HIPAA-eligible), EU data residency, and every setting reviewable in git and checked by machines (cdk-nag). Vercel and Supabase themselves run on AWS | Staying on Supabase + Vercel: good managed services, but the app's security would rest on database rules alone, and the backend is a website. Google Cloud: excellent, smaller ecosystem. Own server (Hetzner): we patch and watch it ourselves | More pieces to set up; misconfiguration is the classic cloud failure, so nothing is clicked in a console, ever |
| Database | **Aurora PostgreSQL** | Same Postgres you have; data kept in 3 data centres; restore to any second; scales without moving | Plain RDS Postgres: fine, less resilient storage | — |
| Security layers | **Two checks on every row**: the API checks ownership, and the database's row rules check again | One bug cannot leak data; the second layer catches it | One layer only (what exists today in places) | Rules written twice, tested twice |
| Login | **Amazon Cognito**, passkeys first, Sign in with Apple and Google, compromised-password detection (Plus tier at launch) | Inside the same EU AWS account and agreement as the data; no second US company holding the user list (which itself reveals who uses a quit app); cheap per user at large scale | Auth0 (EU region): richer features, priced per active user far above Cognito at scale. Clerk: best Expo kit, but user data in the US. Our own login code: control, but no dedicated attack detection | Password hashes cannot be exported from Cognito, so leaving later means password resets. Passkeys and Apple/Google sign-in make that mostly moot |
| AI | **Claude through Amazon Bedrock, EU inference profile** | Conversations about sex and addiction are processed inside the EU, under the same AWS agreement; spend per user is enforced in the API | Anthropic's API directly: processed in the US | New Claude models sometimes reach Bedrock's EU profile later; checked per model |
| Offline | **A small local database on the phone (SQLite) with an outbox that syncs** for the features that need it (R8) | Works in the metro; the server stays the truth | A sync product (PowerSync): another vendor for three features | Conflict rules designed per feature |
| Timer with screen off | **Start time stored + a Live Activity (iPhone) / ongoing notification (Android) + scheduled local alerts** | This is how phones allow it; no app may run freely in the background | — | — |
| Push | **Direct to Apple and Google** from our workers | No third party sees what a notification says | Expo's push relay: easier, one more party seeing content | — |
| Payments | **Stripe on the web, RevenueCat for App Store and Google Play**, both feeding one "rights" table | Apple and Google require their own billing for subscriptions sold inside an app; RevenueCat is the standard bridge | Stripe only: blocks selling in the app | RevenueCat takes a cut above a free monthly allowance |
| Crashes | **Sentry, EU data region** | Sees phone, web and API crashes in one place | — | — |
| Code | **A new private monorepo**: `apps/app` (Expo), `apps/web` (public site), `apps/api`, `packages/contracts`, `packages/domain`, `infra/` | One language, one set of types from database to screen; private protects R6 and the originality work | Reshaping this repo in place: 280,000 lines carrying every abandoned generation | A move: features are copied over with their tests, not reused blindly |

## 4. What this does NOT solve by itself

The same work on any platform, and already in the phases below: account export and deletion, consent, privacy
policy and terms (item 48); the per-user AI cap (item 11); a data protection impact assessment (required by
GDPR for this kind of data); tests worth their keep (item 13).

## 5. What it costs (estimates; each is checked on the price page before he buys)

| Item | About, USD |
|---|---|
| AWS production + staging before users (database, API containers, firewall, security monitoring, backups, network) | 300–450 / month |
| Apple Developer | 99 / year |
| Google Play | 25 once |
| Vercel Pro (public site) | 20 / month |
| Sentry Team | 26 / month |
| Expo EAS Starter (cloud builds incl. iPhone) | 19 / month |
| Cognito | free up to 10,000 monthly users (Essentials); Plus adds per-user cost at launch |
| AWS Activate Founders credits, if granted | –1,000 once (self-funded startups; AWS decides) |

Nothing paid is needed before Phase 4. Phases 1–3 cost nothing.

## 6. Honest notes

- **My bias.** I wrote the current code, so I am the biased party on "rebuild or reshape". Jacob advised
  rebuilding from scratch (2026-11-04). This plan follows his advice for the structure and copies proven pieces
  (content files, tested rules) into it.
- **This is months of work, not weeks.** The live surface is far smaller than the code (`docs/product/map.md`),
  so only what is live gets ported. The quit tool and Time Log reach phones first (Phase 6a–b).
- **The current site keeps running** until Phase 8. The quit tool deadline in `Plans/first-1000.md`
  (20 Dec 2026) ships on the current site; its content files move over unchanged later.

---

## BLOCKERS (each attempted once, 2026-11-18)

| ID | What | Attempted, and result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | AWS account | `which aws` → not installed; no AWS account known | Phases 4–9 | Owner creates it (A3), with MFA on the root user and a hardware key; then I install the CLI and log in through IAM Identity Center, never root keys |
| B2 | Apple Developer account | Cannot be checked from this machine | Phase 6 phone builds on iPhone, Phase 9 | Owner (A3), 99 USD/year |
| B3 | Google Play developer account | Cannot be checked from this machine | Phase 9 | Owner (A3), 25 USD once |
| B4 | Brand name | `docs/product/brand.md` §"The name: where it stands (2026-10-16)": not chosen | Store listing, domain (Phase 9) | Build under a working name; the app's internal bundle ID is permanent, so it uses a neutral company-style ID decided in Phase 2, not the brand |
| B5 | Repo visibility | `gh repo view` → `"visibility":"PUBLIC"` | A4 only; the new repo is created private | Owner yes (A4) |
| B6 | Expo tooling | `npx --no-install eas` → "could not determine executable"; not installed | Phase 2 | Installed inside the new repo (free); Expo account by owner (A3) |
| B7 | iPhone testing on Linux | No Xcode or iPhone simulator on Linux | iPhone checks in Phase 6 | Expo cloud builds + his own iPhone (if A5 = iPhone); the Android emulator rig (`phone.sh`) for automated walks |
| B8 | Machine capacity | 31 GB RAM, 16 cores, Docker 29.1.3 present | Nothing | Local Postgres + API + Android emulator fit; check `tools/load.sh` before parallel agents |
| B9 | Live database is the truth, not the migration files | Known from the 2026-09 export work (some tables were made by clicks); export method recorded and used in Nov 2026 | Phase 1 data model, Phase 8 | Phase 1 step 1 is a read-only schema export of the live database |
| B10 | Company for store accounts | Unknown | Phase 9 | Owner (A6). Apple asks apps in regulated fields (such as health) to be published by an organisation, so a company is the safe road |

## OPEN QUESTIONS (each already has a recommendation; the build follows it unless he vetoes)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | New codebase or reshape this one? | New private monorepo, copy proven parts with tests | Reshape in place | Reshaping drags every old shape along (item 15) |
| Q2 | Which cloud? | AWS Frankfurt | Google Cloud; Supabase + Vercel | Moving clouds later is a second rebuild |
| Q3 | Login provider? | Cognito, passkeys first | Auth0 EU; own login code | Password resets if we ever leave |
| Q4 | Phone app technology? | Expo + native modules | Swift + Kotlin; Flutter | A second app rewrite |
| Q5 | Signed-in web: same app or separate? | Same Expo app | Separate Next.js app | Every screen built twice |
| Q6 | Public site host? | Vercel, no user data on it | AWS | Small: the site is static-heavy and portable |
| Q7 | API framework? | Fastify + zod contracts → OpenAPI | NestJS; Hono | Small: the contract survives a framework change |
| Q8 | Infrastructure as code tool? | AWS CDK (TypeScript) + cdk-nag | Terraform/OpenTofu | Moderate; both work |
| Q9 | Offline sync? | Own outbox for the features that need it | PowerSync | Moderate |
| Q10 | Store billing? | RevenueCat once the app sells in stores | Direct store APIs | Small |
| Q11 | Product analytics? | PostHog EU cloud, only after consent | None until needed | Small |
| Q12 | Repo private? | Yes, both repos | Keep public | Corpus and originality work exposed |
| Q13 | Push route? | Direct to Apple/Google | Expo push relay | Small |
| Q14 | Which Claude model per feature on Bedrock? | Decided in Phase 1 from the EU profile list | Anthropic API direct | Data leaves the EU |

---

## PHASES

Each phase lists what it depends on and how it is proven done. Every phase ends with an adversarial review by
fresh Opus agents before it counts as done.

### Phase 0 — The ask and the accounts (owner, ~1 hour of his time)
Depends on: nothing. Model: Opus writes the message.
1. One message with A1–A7 and the price list.
2. He creates the accounts (A3) in this order: AWS (+ Activate application), Expo, Sentry, Apple, Google.
3. Every account gets a passkey or hardware key; email account first.
**Done when:** A1–A5 answered; AWS account exists with root MFA.

### Phase 1 — The specs (free)
Depends on: A1, A2. Model: Opus.
1. Read-only export of the live database schema (B9); list every live table, rule and function.
2. Inventory of the live surface from `docs/product/map.md` and `src/shared/routes.ts`: what gets ported,
   what is dropped (dropping = "proposed to remove", owner sees the list as exceptions only).
3. `docs/platform/data-model.md`: the new schema, every table with its owner column and row rule.
4. `docs/platform/api-v1.md` + `packages/contracts`: every endpoint, its request/response, who may call it.
5. `docs/platform/security.md`: threat model, the authorization matrix (user × resource × action), the
   two-layer rule, secrets, logging of admin access.
6. `docs/platform/sync.md` (Q9) and `docs/platform/privacy.md` (DPIA draft, consent, export, deletion,
   retention, the vendor agreement list).
**Done when:** every live screen maps to endpoints; every endpoint maps to a matrix row; two Opus reviewers
find no unmapped screen or rule.

### Phase 2 — The new monorepo (free)
Depends on: Phase 1, A2. Model: Sonnet.
1. `gh repo create <working-name> --private`; local folder `~/projects/<working-name>` (not this tree).
2. pnpm + Turborepo; `apps/app`, `apps/web`, `apps/api`, `packages/contracts`, `packages/domain`, `infra/`.
3. CI from the first commit: lint, types, unit tests, API tests against Postgres in Docker, gitleaks (secret
   scan), CodeQL, `pnpm audit`, cdk-nag. Branch protection: nothing reaches `main` red.
4. The rule test: a test that fails if any endpoint lacks a "user A cannot touch user B's data" test.
**Done when:** a red check blocks a merge (proved with a deliberate failing branch).

### Phase 3 — Walking skeleton, local (free)
Depends on: Phase 2. Model: Sonnet.
One small feature end to end: the quit "craving now" log. Postgres in Docker, the API, the app on the Android
emulator and in the browser, offline outbox included, generated client from the contract. Login stubbed
locally behind the same token interface Cognito will fill.
**Done when:** a craving logged offline on the emulator appears in the browser after reconnecting; the
cross-user test passes and fails when the rule is removed.

### Phase 4 — AWS foundation (paid starts here)
Depends on: B1. Model: Sonnet builds, Opus reviews.
1. CDK: AWS Organizations with accounts `security`, `backup`, `staging`, `production`; IAM Identity Center
   with MFA; no long-lived keys anywhere.
2. Organisation-wide CloudTrail, GuardDuty, Security Hub, Config, IAM Access Analyzer; budget alarms at 50 %,
   80 %, 100 % of the monthly estimate to his phone and email.
3. Backup vault with vault lock in the `backup` account.
4. GitHub → AWS through OIDC (no stored keys).
**Done when:** Security Hub's foundational checks pass; cdk-nag clean; a test alarm reaches his phone.

### Phase 5 — Staging, live in AWS
Depends on: Phases 3, 4. Model: Sonnet builds, Opus reviews.
VPC with private subnets; Aurora; the API and workers on Fargate; CloudFront + WAF; Cognito with passkeys and
Apple/Google; SES; S3; Bedrock EU access confirmed with `aws bedrock list-inference-profiles --region
eu-central-1`; Sentry. Pipeline: merge → tests → migrate (backward-compatible) → deploy → smoke test →
automatic rollback on failure.
**Done when:** the Phase 3 skeleton runs on staging from his phone; a restore-to-a-second drill succeeds; an
OWASP ZAP baseline scan has no high findings.

### Phase 6 — Port the product, one area at a time
Depends on: Phase 5. Model: Opus writes each area's brief; Sonnet builds; Haiku runs the checks.
Order (business first): **6a** quit tools + 90-day program · **6b** Time Log (Live Activity, ongoing
notification) · **6c** notifications (Apple/Google push) · **6d** tracking and field sessions · **6e** Your plan
(Life Mastery), role models, weekly review · **6f** Training · **6g** Scenarios, Inner Game, Ask Coach on
Bedrock, with the per-user AI cap enforced in the API · **6h** audit · **6i** settings, account export and
deletion · **6j** payments: Stripe + RevenueCat → one rights table.
Each area: endpoints + cross-user tests + screens on phone and web + e2e + a phone walk of everyday tasks
(the "feel, look, bugs" rule).
**Done when (per area):** every endpoint has its cross-user test; the phone walk passes on both phones.

### Phase 7 — Production and the public site
Depends on: 6a–6c at least. Model: Sonnet builds, Opus security review.
Production account mirrors staging with higher limits; the public site (sales page, free quit tools, articles)
in `apps/web` on Vercel; privacy policy, terms, consent screens; the DPIA finalised; every vendor agreement
signed (AWS, Vercel, Sentry, Stripe, RevenueCat, Apple, Google). An external penetration test is offered to the
owner here (paid, his choice).
**Done when:** a fresh Opus security panel finds no high-severity issue; every vendor agreement is on file.

### Phase 8 — Moving the data, and cutover
Depends on: Phase 7, A7 on the day. Model: Opus runs it; nothing is delegated.
Export the live Supabase data (method in the live-db backup notes), transform, import into production, check
row counts and his own walk through his data. Switch the domain. The old site goes read-only for 30 days.
Deleting the old Supabase and Vercel projects is asked separately; it cannot be undone.
**Done when:** he signs in on the new app and finds his own data complete.

### Phase 9 — The stores
Depends on: B2, B3, B4, B10. Model: Sonnet prepares, Opus reviews.
TestFlight and Google internal testing first; store listings under the chosen name; privacy labels; review.
**Done when:** the app installs from both stores.

---

# PART 2 — Ground rules for every build session

1. Work happens in the new repo, never in this tree. This repo stays the live site until Phase 8.
2. Nothing is clicked in a cloud console. Every setting is code in `infra/`, reviewed and checked by cdk-nag.
3. Nothing costs money from a Claude session. Show the dry run and the price; the owner clicks.
4. No secret in git, ever. Secrets live in AWS Secrets Manager; gitleaks blocks the commit.
5. Every endpoint ships with its cross-user test; the rule test fails the build otherwise.
6. Database changes are backward-compatible (add first, remove in a later release), so a phone on an older
   app version keeps working.
7. Contract changes go in a new version (`/v2`) or are additive; never break `/v1` for installed apps.
8. Private research, corpus and anything personal stay in `~/.cache/daygame-research`, never in either repo.
9. "Done" means checked on the real thing (the phone, the staging URL, the data), and an adversarial review
   found nothing.

## Execution prompts

- Phase 1: `/goal Plans/platform.md Phase 1: write the specs in docs/platform/. Opus. Start with the read-only live schema export (B9). Done when both reviewers find no unmapped screen or rule.`
- Phase 2–3: `/goal Plans/platform.md Phases 2–3 in the new private repo. Sonnet. Done when the offline craving round-trip and the cross-user test pass as written.`
- Phase 4–5: `/goal Plans/platform.md Phases 4–5. Sonnet builds, Opus reviews. Never buy anything; stop at any price.`
- Phase 6x: `/goal Plans/platform.md Phase 6<x>. Read the area brief first. Sonnet builds, Haiku checks.`

## Questions from the build

(none yet)
