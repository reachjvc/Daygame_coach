/**
 * Fill the test account with a year of training.
 *
 * WHY THIS EXISTS. The History and Progress screens draw charts, streaks,
 * weekly totals and personal bests. On an account with three workouts in it,
 * every one of those looks fine and proves nothing — an empty chart and a
 * correct chart are the same picture. You cannot see that a weekly total is
 * double-counting warm-ups, or that a streak breaks a week early, until there
 * is a year of data under it.
 *
 * WHAT IT WRITES. Roughly 150 sessions over twelve months of a plausible
 * training year: linear progress, a three-week layoff in the middle, a deload
 * after it, two personal bests, and a switch from a squat-heavy split to a
 * press-heavy one. Not random noise — noise makes a chart that is busy rather
 * than a chart that is right.
 *
 * IT GOES THROUGH THE APP, NOT THE DATABASE. Every row is written by POSTing to
 * the same route the logging form uses, signed in as the test account. Writing
 * straight to Postgres with the service key would skip the validation, the
 * timezone handling and the row rules — which is exactly where the bugs this
 * data exists to find would be hiding.
 *
 *     npx tsx scripts/dev/seed-training-year.ts            # write the year
 *     npx tsx scripts/dev/seed-training-year.ts --wipe     # remove only its own
 *     npx tsx scripts/dev/seed-training-year.ts --count=40 # a smaller year
 *
 * IT ONLY EVER REMOVES ITS OWN ROWS. Every set it writes carries a tag in its
 * exercise note, and `--wipe` deletes workouts carrying that tag and nothing
 * else. Running it twice does not double the year: the second run wipes the
 * first. The tag is not shown anywhere in the app.
 */

import fs from "fs"
import path from "path"
import { createServerClient } from "@supabase/ssr"

/** The mark that says "this row came from this script". */
const SEED_TAG = "[seed:training-year]"
const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000"

// ---------------------------------------------------------------------------
// Environment and sign-in
// ---------------------------------------------------------------------------

/** `.env` then `.env.local`, later files winning, the way Next loads them. */
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const file of [".env", ".env.local"]) {
    const full = path.join(process.cwd(), file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      if (!line.includes("=") || line.trimStart().startsWith("#")) continue
      const key = line.slice(0, line.indexOf("=")).trim()
      out[key] = line
        .slice(line.indexOf("=") + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  }
  return out
}

/**
 * Sign in as the test account and return the cookie header the app expects.
 *
 * The app authenticates from cookies, so the script keeps its own cookie jar,
 * lets the Supabase client write the session into it, and then sends that jar
 * with every request. Replaying the browser tests' saved session does not work:
 * it expires, and a script that fails with 401 an hour after somebody last ran
 * Playwright is a script nobody trusts.
 */
async function signIn(env: Record<string, string>): Promise<string> {
  const email = env.TEST_USER_EMAIL
  const password = env.TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD are needed to sign in. They live in .env."
    )
  }

  const jar = new Map<string, string>()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`)
  if (jar.size === 0) throw new Error("Signed in, but no session cookie was written.")

  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ")
}

// ---------------------------------------------------------------------------
// A plausible year
// ---------------------------------------------------------------------------

interface SeedSet {
  exercise: string
  weight_kg: number
  reps: number
  set_number: number
  set_kind: "warmup" | "working"
  exercise_notes: string
}

/** Two splits, so the year contains a change of program rather than one line. */
const EARLY = [
  { name: "Squat", start: 60, step: 2.5, sets: 5 },
  { name: "Bench Press", start: 45, step: 1.25, sets: 5 },
  { name: "Barbell Row", start: 50, step: 1.25, sets: 5 },
]
const LATE = [
  { name: "Overhead Press", start: 35, step: 1, sets: 5 },
  { name: "Bench Press", start: 70, step: 1.25, sets: 5 },
  { name: "Deadlift", start: 100, step: 2.5, sets: 3 },
]

const round = (n: number) => Math.round(n * 4) / 4

/**
 * What the lifter did on session `n`.
 *
 * The shape of a real year rather than a straight line: it climbs, stops for
 * three weeks in the middle, comes back ten per cent lighter and climbs again,
 * and changes program two thirds of the way through. Two sessions are marked as
 * a genuine best so the "your bests" list has something dated to show.
 */
function sessionFor(n: number, total: number): SeedSet[] {
  const switchedAt = Math.floor(total * 0.65)
  const layoffFrom = Math.floor(total * 0.42)
  /**
   * About three weeks off, in proportion. A fixed nine sessions is three weeks
   * of a full year and most of a short one: `--count=12` came back with seven
   * of the twelve skipped, which is not a training year, it is a holiday.
   */
  const layoffLength = Math.max(1, Math.round(total * 0.06))
  const layoffTo = layoffFrom + layoffLength

  if (n >= layoffFrom && n < layoffTo) return []

  const lifts = n >= switchedAt ? LATE : EARLY
  // Sessions actually done, which is what the weight is a function of.
  const done = n < layoffFrom ? n : n - layoffLength
  const deloading = n >= layoffTo && n < layoffTo + Math.max(2, Math.round(total * 0.04))

  return lifts.flatMap((lift) => {
    /**
     * Linear progress, then a crawl. A straight line for a whole year gives a
     * 450 kg deadlift, and a chart nobody believes is no better than an empty
     * one for finding out whether the chart is right. Full rate for the first
     * thirty sessions, fifteen per cent of it after that.
     */
    const fast = Math.min(done, 30)
    const slow = Math.max(0, done - 30)
    const climbed = lift.start + lift.step * fast + lift.step * 0.15 * slow
    const working = round(deloading ? climbed * 0.9 : climbed)
    // A best on two chosen sessions: one heavy single late in each split.
    const isBest = n === switchedAt - 2 || n === total - 3
    const sets: SeedSet[] = [
      {
        exercise: lift.name,
        weight_kg: round(working * 0.5),
        reps: 5,
        set_number: 1,
        set_kind: "warmup",
        exercise_notes: SEED_TAG,
      },
    ]
    for (let i = 0; i < lift.sets; i++) {
      sets.push({
        exercise: lift.name,
        weight_kg: working,
        // A missed rep now and then, so "hit all reps" is not the only state
        // the screens have ever rendered.
        reps: n % 17 === 0 && i === lift.sets - 1 ? 3 : 5,
        set_number: i + 2,
        set_kind: "working",
        exercise_notes: SEED_TAG,
      })
    }
    if (isBest) {
      sets.push({
        exercise: lift.name,
        weight_kg: round(working * 1.1),
        reps: 1,
        set_number: lift.sets + 2,
        set_kind: "working",
        exercise_notes: SEED_TAG,
      })
    }
    return sets
  })
}

/**
 * The day this session happened, counting back from today.
 *
 * Spread evenly across the year rather than pinned to Monday, Wednesday and
 * Friday: 150 sessions over 364 days lands about 2.4 days apart, which is what
 * three-a-week actually looks like once life gets in the way.
 */
function dateFor(n: number, total: number): string {
  const daysAgo = Math.round(((total - n) / total) * 364)
  const day = new Date()
  day.setDate(day.getDate() - daysAgo)
  const pad = (x: number) => String(x).padStart(2, "0")
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}

// ---------------------------------------------------------------------------
// Talking to the app
// ---------------------------------------------------------------------------

interface Workout {
  id: string
  sets?: { exercise_notes?: string | null }[]
}

async function api(cookie: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...(init.headers ?? {}) },
  })
}

/**
 * Every workout this script wrote, read in windows.
 *
 * WHY NOT ONE REQUEST. A year is about 140 sessions of eighteen sets, which is
 * 2,500 set rows — well past the row cap the server applies to a single read.
 * Asking for the lot returns some workouts with their sets missing, and a
 * workout whose sets did not arrive looks untagged: the wipe would leave it
 * behind and the check at the end would report a number that is simply wrong.
 *
 * Ninety days at a time keeps each request under the cap. This is the same
 * limit that makes the CSV export incomplete (see docs/plans/silent-failures.md);
 * here it is worked around rather than fixed, because the fix belongs in the
 * export, not in a seeding script.
 */
async function seededWorkouts(cookie: string): Promise<Workout[]> {
  const byId = new Map<string, Workout>()
  for (let window = 90; window <= 450; window += 90) {
    const res = await api(cookie, `/api/health/workout?days=${window}&include=sets`)
    if (!res.ok) throw new Error(`Could not read the account's workouts (${res.status}).`)
    for (const w of (await res.json()) as Workout[]) {
      if ((w.sets ?? []).some((s) => s.exercise_notes === SEED_TAG)) byId.set(w.id, w)
    }
  }
  return [...byId.values()]
}

/**
 * Delete them, and keep asking until there are none left.
 *
 * Looping rather than deleting one page: if a read ever comes back short for
 * any reason, a single pass would leave rows behind and the next run would add
 * a second year on top of half of the first.
 */
async function wipe(cookie: string): Promise<number> {
  let removed = 0
  for (let pass = 0; pass < 10; pass++) {
    const mine = await seededWorkouts(cookie)
    if (mine.length === 0) return removed
    for (const w of mine) {
      const res = await api(cookie, `/api/health/workout?id=${w.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Could not delete workout ${w.id} (${res.status}).`)
      removed++
    }
  }
  throw new Error("Still finding seeded workouts after ten passes. Something is not deleting.")
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const wipeOnly = args.includes("--wipe")
  const countArg = args.find((a) => a.startsWith("--count="))
  const total = countArg ? Number(countArg.split("=")[1]) : 150
  if (!Number.isFinite(total) || total < 1 || total > 400) {
    throw new Error("--count must be between 1 and 400.")
  }

  const env = loadEnv()
  const cookie = await signIn(env)
  console.log(`Signed in as ${env.TEST_USER_EMAIL} against ${BASE_URL}.`)

  const removed = await wipe(cookie)
  if (removed > 0) console.log(`Removed ${removed} workout(s) from a previous run.`)
  if (wipeOnly) {
    console.log("Nothing else to do.")
    return
  }

  let written = 0
  let restDays = 0
  for (let n = 0; n < total; n++) {
    const sets = sessionFor(n, total)
    if (sets.length === 0) {
      restDays++
      continue
    }
    const res = await api(cookie, "/api/health/workout", {
      method: "POST",
      body: JSON.stringify({
        session_type: "weights",
        duration_min: 50 + (n % 4) * 5,
        intensity: 3 + (n % 3 === 0 ? 1 : 0),
        entry_date: dateFor(n, total),
        entry_time: n % 2 === 0 ? "07:30" : "18:15",
        sets,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Workout ${n + 1} was refused (${res.status}): ${body.slice(0, 300)}`)
    }
    written++
    if (written % 25 === 0) console.log(`  ${written} written…`)
  }

  /**
   * READ IT BACK. The count the script kept is what it THINKS it wrote; the only
   * thing worth reporting is what the account actually holds, asked for the same
   * way any screen asks.
   */
  const stored = await seededWorkouts(cookie)
  console.log(
    `\nWrote ${written} workouts (${restDays} skipped as the layoff), and the account reports ${stored.length}.`
  )
  if (stored.length !== written) {
    throw new Error(
      `Wrote ${written} but the account holds ${stored.length}. Something was refused silently.`
    )
  }
  console.log("Remove them again with --wipe.")
}

main().catch((e) => {
  console.error(`\n${(e as Error).message}`)
  process.exit(1)
})
