/**
 * WHICH COPY OF THE PLAN WINS, DECIDED WITHOUT A NETWORK OR A BROWSER.
 *
 * The flow has had exactly one copy of the plan since it was written: a lump of
 * JSON in `localStorage`. This is the moment it gets a second one, and every
 * way that goes wrong is a way somebody loses work they cannot get back. So the
 * decision is a pure function over what both sides hold, tested against the
 * cases rather than reasoned about at a call site.
 *
 * ----------------------------------------------------------------------------
 * THE FOUR RULES, and what each costs if it is wrong.
 *
 * 1. **A plan WITH SOMETHING IN IT on the account always wins.** If the server
 *    holds a written plan, the browser copy is a stale cache and is not
 *    imported over it.
 *    *If wrong:* signing in on an old laptop overwrites months of work done
 *    since, with no warning and nothing to restore from.
 *
 *    "With something in it" rather than "exists", because the flow creates a
 *    plan ROW the first time it loads anywhere. Opening Life Mastery once on a
 *    phone would otherwise put an empty plan on the account, and this rule
 *    would then protect it forever — the laptop holding four years of work
 *    could never import. An untouched plan is the twelve default areas and
 *    nothing written, so importing over it loses nothing.
 *
 * 2. **The browser copy is imported whenever the account holds NOTHING WRITTEN.**
 *    Not "once" — whenever. There is no marker and no counter.
 *    *If wrong:* the account keeps an empty shell while the browser holds four
 *    years of work, and rule 1 then protects the shell forever.
 *
 *    **This used to be "once", recorded by a marker in `localStorage`, and the
 *    marker lost a plan.**
 *    The flow wrote it BEFORE the upload (deliberately: a marker lost after a
 *    half-successful save would import everything a second time). But the
 *    upload is a separate effect four seconds later, so closing the tab in
 *    between left a marker saying "done" beside an EMPTY plan row — and the
 *    next load read that empty row as the account's answer and wrote it over
 *    the real plan in the browser. Proved by running it: `decideOnLoad`
 *    returned `use-server` with `northStar: ""` against a browser holding a
 *    written plan.
 *
 *    So the marker is gone and the question is asked of the rows themselves:
 *    has anybody written anything into the account's plan? If not, this
 *    browser's copy may go in, however many times it takes to land.
 *
 *    **What that costs, stated because it is a real trade and not a free fix.**
 *    An account somebody deliberately emptied also holds nothing written, so
 *    opening an old device afterwards re-imports the plan they threw away. That
 *    is a resurrection, and the cure is to clear it again; the marker's failure
 *    was a deletion, and there was no cure. `revision` was tried as a way to
 *    tell the two apart and does not work: a phone that merely renames an area
 *    saves — `planIsUntouched` counts areas, `planHasNothingWritten` does not —
 *    so a real account can sit at revision 1 with nothing written, and keying on
 *    revision would block the very import this rule exists for. The durable fix
 *    is for "start over" to stamp the row as deliberately cleared; until then,
 *    the smaller loss wins.
 *
 * 3. **A failed read NEVER leads to a write.** If the account's plan could not
 *    be fetched, the flow stays on the browser copy and saves nothing.
 *    *If wrong:* one flaky request makes the app treat an unreachable plan as
 *    an absent one, and the next autosave replaces the real plan with whatever
 *    this browser happened to hold.
 *
 * 4. **An untouched plan is never imported.** A browser that opened the flow
 *    and left has the default twelve areas and nothing else; that is not a
 *    plan and must not become the account's.
 *    *If wrong:* opening the page on a friend's phone writes an empty plan to
 *    the account, and rule 1 then protects it.
 */

import type { NsPlan } from "./types"
import { planIsUntouched } from "./northStarService"
import type { NsPlan as Plan } from "./types"
import { mergeDayRecord } from "./lifePlanMapper"

/**
 * The key the one-time import used to be recorded under.
 *
 * Kept only so the flow can CLEAR it. Rule 2 is now answered by the rows
 * themselves, and this key is left in nobody's browser to be found and believed
 * by a later version of this file. Nothing reads it.
 */
export const LIFE_PLAN_IMPORTED_KEY = "life-plan-imported-v1"

/** What the flow should do once both copies are in hand. */
export type SyncDecision =
  /** The account has a plan. Use it; it is the truth. */
  | { kind: "use-server"; plan: NsPlan; revision: number }
  /** The account holds nothing written and this browser holds a real plan. Send it. */
  | { kind: "import-browser"; plan: NsPlan }
  /** Nothing to import and nothing to load: the account starts empty. */
  | { kind: "start-empty"; revision: number }
  /** Something is unknown, so nothing is written. The flow works offline. */
  | { kind: "stay-local"; reason: string }

export interface SyncInputs {
  /** The plan on the account, null when it has none, undefined when unknown. */
  server: { plan: NsPlan | null; revision: number } | undefined
  /** What this browser holds, if anything. */
  browser: NsPlan | null
}

/**
 * Has anybody WRITTEN anything into this plan?
 *
 * Deliberately not `planIsUntouched`, which is a different question asked for a
 * different reason — it decides whether to greet a first-time visitor with our
 * template under the heading "Your plan", and it counts the seeded areas and
 * routines as evidence. A plan read back from the database can legitimately
 * differ in routine count from the seed, and `planIsUntouched` then calls it
 * touched; using it here let an empty account shell masquerade as real work and
 * block the import of a browser holding years of it. Found by driving it.
 *
 * So this asks only about things a PERSON put there, and ignores the seeded
 * scaffolding entirely.
 */
export function planHasNothingWritten(plan: Plan): boolean {
  return (
    !plan.northStar.trim() &&
    plan.goals.length === 0 &&
    plan.experiences.length === 0 &&
    plan.values.length === 0 &&
    plan.currentValues.length === 0 &&
    plan.seasonFocusId == null &&
    plan.seasonAreaIds.length === 0 &&
    Object.keys(plan.review).length === 0 &&
    Object.values(plan.answers).every((v) => !v.trim()) &&
    Object.values(plan.rungs).every((v) => !v.trim())
  )
}

/**
 * THE FIELDS THE WHOLE-PLAN SAVE ACTUALLY SENDS.
 *
 * `NsPlan` minus the five the mapper never emits: the four day maps, which have
 * their own tables and their own route, and `updatedAt`, which the server
 * stamps. Listed rather than derived by omission so that a new field on `NsPlan`
 * has to be put in one list or the other deliberately — the last test in
 * `tests/unit/goals/lifePlanSync.test.ts` fails when one is in neither.
 */
export const SENT_PLAN_FIELDS = [
  "version", "horizonYears", "northStar", "rungs", "areas", "routines", "goals",
  "review", "answers", "currentValues", "values", "priorityIds", "seasonFocusId",
  "seasonAreaIds", "experiences", "fields", "subSteps", "seq",
] as const

/** The four day maps plus the server's own stamp: present on the plan, never sent. */
export const UNSENT_PLAN_FIELDS = ["daily", "logged", "notes", "journal", "updatedAt"] as const

/**
 * What the save would send, as text, so a caller can tell "nothing changed".
 *
 * A fixed field order rather than `JSON.stringify(plan)`, because every mutator
 * builds its result by spreading — `{ ...plan, logged }` moves `logged` to the
 * end — so key order shifts on edits that change nothing the server sees.
 *
 * WHY THIS EXISTS AT ALL: ticking a routine step changes `plan.logged`, which is
 * not sent, but it does produce a new plan object. The save effect fired on that
 * and PUT a body identical to the last one, and `save_life_plan` bumps the
 * revision unconditionally — so ticking a morning routine made every other
 * device's next save fail as stale.
 */
export function sendableFingerprint(plan: Plan): string {
  return JSON.stringify(SENT_PLAN_FIELDS.map((key) => plan[key]))
}

export function decideOnLoad({ server, browser }: SyncInputs): SyncDecision {
  // Rule 3, first, because every other rule assumes the read succeeded.
  if (server === undefined) {
    return { kind: "stay-local", reason: "Your plan could not be reached, so nothing has been saved." }
  }

  // Rule 1. The day half is not on the server until Phase 2, so it comes from
  // this browser — otherwise the server's four empty maps would be written over
  // a year of ticks, notes and journal on the first load.
  if (server.plan && !planHasNothingWritten(server.plan)) {
    return { kind: "use-server", plan: mergeDayRecord(server.plan, browser), revision: server.revision }
  }

  // Rules 2 and 4. Rule 1 did not fire, so the account holds nothing written —
  // a new account, a shell somebody opened once, or an import that was cut off
  // between creating the row and filling it. A real browser copy may go in, and
  // may go in again if it does not land.
  if (browser && !planIsUntouched(browser)) {
    return { kind: "import-browser", plan: browser }
  }

  // Nothing to import, but the account may still hold its untouched shell —
  // keep it rather than replacing it with another identical one.
  if (server.plan) {
    return { kind: "use-server", plan: mergeDayRecord(server.plan, browser), revision: server.revision }
  }

  return { kind: "start-empty", revision: server.revision }
}

/**
 * Whether a save may be sent at all.
 *
 * Saving is refused while the flow is on the local copy, which is rule 3 seen
 * from the other end: the read failed, so this browser does not know what it
 * would be overwriting.
 */
export function canSave(decision: SyncDecision | null, loaded: boolean): boolean {
  if (!loaded || !decision) return false
  return decision.kind !== "stay-local"
}

/** What the person is told, in the app's own words. Empty when all is well. */
export function syncNotice(state: SyncState): string {
  switch (state) {
    case "stale":
      return "This plan changed on another device. Reload to see it — nothing here has been saved."
    case "offline":
      return "Your plan could not be reached. You can keep working; nothing is being saved."
    case "failed":
      return "The last change could not be saved. Your work is still here on this device."
    default:
      return ""
  }
}

export type SyncState = "unknown" | "saved" | "saving" | "failed" | "stale" | "offline"
