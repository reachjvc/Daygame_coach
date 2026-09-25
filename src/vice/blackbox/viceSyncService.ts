/**
 * WHICH COPY OF A ROW WINS, DECIDED WITHOUT A NETWORK, A CLOCK OR A BROWSER.
 *
 * The Black Box has had exactly one copy of itself since it was written: a lump
 * of JSON in one browser. This is the moment it gets a second one, and every
 * way that goes wrong is a way somebody loses a night they cannot get back. So
 * the decision is pure functions over what both sides hold, tested against the
 * cases rather than reasoned about at a call site.
 *
 * ----------------------------------------------------------------------------
 * WHY THIS MERGES ROW BY ROW RATHER THAN REFUSING A STALE SAVE.
 *
 * `src/goals/lifePlanSync.ts` next door answers the same question a different
 * way: it refuses a save built on a stale revision and tells the person their
 * plan changed elsewhere. That is right THERE and would be wrong here, and the
 * difference is in the data, not in taste.
 *
 * A Life Mastery plan is one document a person edits as a whole — merging two
 * versions produces a third thing neither of them wrote. The Black Box is two
 * flat lists of rows that are appended, each with an id minted on the device
 * that made it and never reused. Two devices filing two different nights is not
 * a conflict at all; it is two rows. Refusing one of them would make somebody
 * choose which night to throw away, and a flight recorder may not ask that.
 *
 * So: union by id, newest `updatedAt` wins when the same id differs, and the
 * only true conflict — the same row edited on two devices — resolves to the
 * later edit. One person is not in two places at once, so that is enough.
 *
 * ----------------------------------------------------------------------------
 * THE FOUR RULES, and what each costs if it is wrong.
 *
 * 1. **A failed read never causes a write.** If the account's rows could not be
 *    fetched, the page keeps working on the local copy and sends nothing.
 *    *If wrong:* one flaky request reads "unreachable" as "empty", and the next
 *    push uploads a thin local copy over a full record.
 *
 * 2. **A deletion is a row, not an absence.** A tombstone outranks a live copy
 *    of the same row whenever it is newer.
 *    *If wrong:* the device that was offline during the deletion sees a row the
 *    server no longer has, decides the server forgot it, and puts it back —
 *    forever, on every device.
 *
 * 3. **A row this device changed and has not yet sent is never overwritten by
 *    what comes back.** Newer-wins is judged on `updatedAt`, and an unsent
 *    local edit is by construction newer than the server's copy.
 *    *If wrong:* a slow upload loses the very edit that triggered it.
 *
 * 4. **Nothing is ever dropped on the floor.** A row present on either side and
 *    absent on the other is kept, not treated as deleted. Absence means "the
 *    other side has not heard of it", which is the normal case on a first sync.
 *    *If wrong:* the first sync from a fresh browser empties the account.
 */

import type { BlackBoxRecord, ViceAttempt, ViceReport } from "../types"

/** The two sync fields every row in this record carries. */
interface Syncable {
  id: string
  updatedAt: string
  deletedAt: string | null
}

/**
 * Which of two versions of the same row is the one to keep.
 *
 * Ties go to the one already held rather than the incoming one, so a sync that
 * changes nothing really changes nothing — a re-push of identical rows must not
 * make every row look freshly edited to the next device.
 */
function newer<T extends Syncable>(held: T, incoming: T): T {
  return incoming.updatedAt > held.updatedAt ? incoming : held
}

/**
 * Two lists of the same kind of row, reconciled.
 *
 * Union by id. Rules 2 and 4 both fall out of this: a tombstone is just a row
 * and wins on being newer, and a row only one side has is kept because there is
 * nothing to compare it with.
 */
export function mergeRows<T extends Syncable>(held: T[], incoming: T[]): T[] {
  const by = new Map<string, T>()
  for (const row of held) by.set(row.id, row)
  for (const row of incoming) {
    const had = by.get(row.id)
    by.set(row.id, had ? newer(had, row) : row)
  }
  return [...by.values()]
}

/**
 * The whole record, reconciled with what the account holds.
 *
 * Order is not preserved and does not matter: every read in `blackboxService`
 * sorts what it needs, because the record is a set of rows and never a
 * sequence. Sorting here would be a second opinion about display order living
 * in the wrong file.
 */
export function mergeRecords(held: BlackBoxRecord, incoming: BlackBoxRecord): BlackBoxRecord {
  return {
    version: 1,
    attempts: mergeRows<ViceAttempt>(held.attempts, incoming.attempts),
    reports: mergeRows<ViceReport>(held.reports, incoming.reports),
  }
}

/** What changed on this device since the last thing the server acknowledged. */
export interface Pending {
  attempts: ViceAttempt[]
  reports: ViceReport[]
  count: number
}

/**
 * The rows worth sending.
 *
 * `sentUpTo` is the newest `updatedAt` the server has acknowledged, so anything
 * stamped later is unsent. Null means nothing has ever been sent and everything
 * counts — the first push.
 *
 * COMPARED WITH `>`, NOT `>=`, and the boundary matters: a row stamped exactly
 * at the watermark has already been acknowledged, and resending it every sync
 * forever is how a quiet page turns into a request every few seconds.
 */
export function pendingSince(record: BlackBoxRecord, sentUpTo: string | null): Pending {
  const after = <T extends Syncable>(rows: T[]) =>
    sentUpTo === null ? [...rows] : rows.filter((r) => r.updatedAt > sentUpTo)
  const attempts = after(record.attempts)
  const reports = after(record.reports)
  return { attempts, reports, count: attempts.length + reports.length }
}

/** The newest stamp anywhere in a set of rows, or the one already held. */
export function watermark(pending: Pending, current: string | null): string | null {
  const all = [...pending.attempts, ...pending.reports].map((r) => r.updatedAt)
  return all.reduce<string | null>((max, at) => (max === null || at > max ? at : max), current)
}

/**
 * What the page should do once both copies are in hand.
 *
 * `server === undefined` is NOT `null`, and the difference is the whole of rule
 * 1: `null` means "the account holds no rows", `undefined` means "nobody
 * knows". Collapsing the two is how a flaky request becomes an overwrite.
 */
export type SyncDecision =
  /** Merge and carry on. The only outcome when the account could be read. */
  | {
      kind: "merge"
      record: BlackBoxRecord
      /** Nothing on the account yet, so this load is also the first upload. */
      accountWasEmpty: boolean
    }
  /** Nothing is known, so nothing is written. The page works offline. */
  | { kind: "offline"; reason: string }

export interface SyncInputs {
  /** The account's rows, null when it has none, undefined when unknown. */
  server: BlackBoxRecord | null | undefined
  /** What this browser holds. */
  browser: BlackBoxRecord
}

/** Has anything at all been written into this record? */
export function recordIsEmpty(record: BlackBoxRecord): boolean {
  return record.attempts.length === 0 && record.reports.length === 0
}

export function decideOnLoad({ server, browser }: SyncInputs): SyncDecision {
  // Rule 1, first, because every other rule assumes the read succeeded.
  if (server === undefined) {
    return {
      kind: "offline",
      reason: "Your record could not be reached. You can keep working; nothing is being saved.",
    }
  }

  // ALWAYS THE UNION. There is no marker and no "import once" branch, and the
  // absence of one is the whole safety design.
  //
  // THIS USED TO HAVE A MARKER, AND THE MARKER LOST RECORDS. The branch read:
  // if the account is empty and the import has already run, take the account's
  // answer — which is `{ attempts: [], reports: [] }`. So a marker written
  // before the upload landed, and any interruption in between, left a browser
  // holding four years of nights being told the truth was nothing. A test in
  // this file asserted that behaviour as if it were intended. The same bug,
  // with the same cause, cost the Life Mastery flow a plan on this same day;
  // see `src/goals/lifePlanSync.ts`.
  //
  // The union cannot do that: a row on either side survives, so an empty
  // account merges to exactly what the browser already had.
  //
  // WHAT A MARKER WAS FOR, AND WHY THIS RECORD DOES NOT NEED ONE. It stopped a
  // re-import resurrecting rows somebody deliberately cleared on the account.
  // Here a deletion IS a row — `deletedAt` — so a cleared account holds
  // tombstones, the union takes the tombstones, and nothing comes back. The
  // thing the marker was protecting is protected by the data instead, which is
  // the only place it can be protected reliably.
  const account = server ?? { version: 1, attempts: [], reports: [] }
  return {
    kind: "merge",
    record: mergeRecords(browser, account),
    accountWasEmpty: recordIsEmpty(account),
  }
}

/**
 * Whether a push may be sent at all.
 *
 * Rule 1 seen from the other end: while the page is on the local copy, this
 * browser does not know what it would be writing over.
 */
export function canPush(decision: SyncDecision | null): boolean {
  return decision !== null && decision.kind !== "offline"
}

/**
 * `unreachable` IS NOT `offline`, AND SAYING "OFFLINE" FOR BOTH SENT PEOPLE TO
 * CHECK THEIR WIFI WHILE THEIR SESSION HAD EXPIRED.
 *
 * Driven on 2026-09-25: a stubbed 500 and a stubbed 401, with
 * `navigator.onLine === true` in both, produced "Offline. 13 changes are
 * waiting on this device and nothing has been lost." The push path had this
 * right all along — `navigator.onLine ? "failed" : "offline"` — and the load
 * path was hardcoded. An expired session is the ordinary case, and "offline" is
 * the one diagnosis that makes somebody wait instead of signing in again.
 */
/**
 * ONE LIST, AND THE TYPE IS DERIVED FROM IT.
 *
 * `syncNotice`'s test walks every state asserting none of them ever tells
 * somebody their work is gone. It walked a hand-written array, so adding a
 * state left the new one unchecked while the test stayed green — a guard
 * quietly covering less than its name, which is the fault this whole module
 * spent 2026-09-25 cataloguing. Iterating this makes that impossible.
 */
export const SYNC_STATES = [
  "unknown",
  "synced",
  "syncing",
  "failed",
  "offline",
  "unreachable",
  "local",
] as const

export type SyncState = (typeof SYNC_STATES)[number]

/**
 * WHETHER THE SYNC HAS FINISHED DOING ANYTHING, for the tests that must wait.
 *
 * Four e2e helpers used to wait on `[data-sync="synced"], [data-sync="offline"],
 * [data-sync="failed"]` — a hand-written list of terminal states, in four
 * files. Adding `unreachable` on 2026-09-25 would have made every one of them
 * hang for forty seconds on a failed read and report a timeout instead of the
 * thing they were testing. One owner, and `SYNC_STATES` below is walked by a
 * test so a state added later cannot be left unclassified.
 *
 * `unknown` is the state before anything has happened and `syncing` is a
 * request in flight. Everything else is somewhere to stop.
 */
export function isSettled(state: SyncState): boolean {
  return state !== "unknown" && state !== "syncing"
}

/** What the person is told, in the app's own words. Empty when all is well. */
export function syncNotice(state: SyncState, pending: number): string {
  switch (state) {
    case "synced":
      return "Saved to your account."
    case "syncing":
      return "Saving…"
    case "offline":
      return pending > 0
        ? `Offline. ${pending} ${pending === 1 ? "change is" : "changes are"} waiting on this device and nothing has been lost.`
        : "Offline. This is still your record; it will save when you are back."
    case "failed":
      return "That could not be saved to your account. It is still here on this device, and saving will be tried again."
    // READ, not write, and the difference decides what somebody does next. The
    // record on screen is whatever this browser holds, which may be nothing at
    // all on a device that has never seen it — so this must never read as
    // "you have no runs".
    case "unreachable":
      return "Your account could not be reached, so this may not be your whole record. Nothing here has been changed or sent, and signing in again is usually what fixes it."
    case "local":
      return "Working on this device only."
    default:
      return ""
  }
}
