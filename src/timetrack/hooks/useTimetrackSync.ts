"use client"

/**
 * Keeps this device and the server in step.
 *
 * HOW IT BEHAVES, in the order it matters to the person using it:
 *
 *  1. Your click is never waiting on the network. The change is applied and
 *     saved locally first, then sent. The tracker feels the same on a train as
 *     it does on wifi.
 *  2. If you are not signed in, it says so — "saved on this device only". It
 *     does not quietly pretend to sync, because the difference is your history.
 *  3. A failed send is kept and retried, and the number waiting is shown. The
 *     queue is written to this browser too, so closing the tab mid-send does
 *     not lose it.
 *  4. Nothing the server sends can overwrite a change of yours that has not
 *     been sent yet. See `syncService`.
 *  5. After opening or waking it says "Checking…" until it has heard from the
 *     account, and the tracker's Start and Stop wait for that, three seconds at
 *     most (D2). It says when it last heard, too (D6), and hears about the other
 *     device's changes within seconds (D4).
 *  6. What is queued leaves the moment the page is hidden, closed or left (D3).
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { createBrowserSupabaseClient } from "@/src/db/supabase-client"

import {
  emptyRows,
  rowKeyOf,
  TIMETRACK_TABLES,
  type PushBases,
  type TagSets,
  type TimetrackRows,
  type VersionedPushResult,
} from "@/src/db/timetrackTypes"

import { isSigningOut, ownerChangedUnderneath, startAgain, whenSigningOut } from "../browserOwner"
import { OFFLINE_BASE_KEY, OFFLINE_OWN_ROWS_KEY, PENDING_BASES_KEY, PENDING_KEY, STATE_VERSION, STORAGE_KEY } from "../config"
import { noteServerDate, serverNow, serverNowIso } from "../serverClock"
import { stateToRows, rowsToState } from "../timetrackMapperService"
import { reconcileRunningEntries } from "../timetrackService"
import {
  applyTagSets,
  canTombstone,
  countRows,
  reattachToWorkspace,
  repairPending,
  diffRows,
  keysIn,
  liveAnswerCovers,
  mergeChangeSets,
  mergeIncoming,
  rowKey,
  rowsUnknownToServer,
  safeToSend,
  sameTagSet,
  splitIntoBatches,
  stableStringify,
  withServerTagLinks,
  withoutSentRows,
} from "../syncService"
import { isBackToBase, olderThan, rebase, versionOf, type BaseRecord, type Bases, type Overruled } from "../syncVersionService"
import type { TimetrackState } from "../types"

type AnyRow = Record<string, unknown>

export type SyncStatus =
  | "starting"
  /** never signed in here: this browser is the only copy, and it says so */
  | "local-only"
  /** was signed in, and the session has since expired */
  | "signed-out"
  | "synced"
  | "saving"
  | "offline"
  | "error"

/**
 * WHAT THIS DEVICE KNOWS ABOUT THE ACCOUNT RIGHT NOW, beside what it has sent.
 *
 * "Saved" used to describe sending only, so an offline phone with nothing to
 * send said "Saved" over a timer the PC had stopped hours before (sync #4).
 */
export interface CheckState {
  /**
   * Opening or waking, and the first check since has not landed yet. The
   * tracker's Start, Stop and Continue wait while this is true — at most
   * `CHECK_WAIT_MS`, after which it turns false with `failed` set.
   */
  checking: boolean
  /** When a check last landed, on the server's clock (ms). Null: not yet. */
  lastCheckedAt: number | null
  /** The last check failed, or the wait for one ran out */
  failed: boolean
}

export interface ImportOffer {
  entries: number
  projects: number
  /** what is actually in this browser, so it can be looked at before uploading */
  items: ImportItem[]
}

/** One line of the "here is what would be uploaded" list */
export interface ImportItem {
  id: string
  description: string
  project: string | null
  day: string
  seconds: number
}

interface FlushOptions {
  /** the page is being hidden, closed or left: send now, with `keepalive` (D3) */
  keepalive?: boolean
}

interface Options {
  state: TimetrackState | null
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  replaceState: (next: TimetrackState) => void
  pushToast: (text: string, tone?: "info" | "error") => void
  /**
   * Who the server says is signed in, when the page knows (`/time`). Only that
   * account's changes are kept and sent from here, and an answer from any other
   * account stops this page and starts it again (see `browserOwner`). Absent on
   * the lab page and in tests: the first account to answer is taken, as before.
   */
  account?: string
  /**
   * What to do when another account answers. The tracker page starts again
   * (`startAgain`); the sender Log Out mounts (`SendTrackerChanges`) only
   * notes it, so signing out is not interrupted by a reload.
   */
  onAccountChanged?: () => void
  /**
   * Whether a workspace came from another tab of this browser rather than a
   * tap here (`useTimetrack`). Only this device's own edits keep a base before
   * the account answers. Absent: every change counts as this device's own.
   */
  fromAnotherTab?: (state: TimetrackState) => boolean
}

const PULL_EVERY_MS = 60_000
/**
 * A failed send retries on its own, doubling the wait up to a minute.
 *
 * It used to wait for the browser's "you are back online" event. That event is
 * not guaranteed — it does not fire when the connection was never lost but the
 * server was briefly unreachable, and some environments never dispatch it at
 * all. A queue that only drains on an event you do not control is a queue that
 * can hold somebody's afternoon forever.
 */
const RETRY_START_MS = 2_000
/** Rows per request. Keeps a big first upload well under any body-size limit. */
const MAX_ROWS_PER_REQUEST = 400
const RETRY_MAX_MS = 60_000
/**
 * A request that is never answered used to hold `flushing` forever.
 *
 * `fetch` has no deadline of its own, so a connection that accepts and then
 * says nothing — a captive portal, a dead tunnel — left every later flush
 * returning at its first line, with the badge reading "Saving 3…" and nothing
 * in flight. Only a reload recovered. With a deadline it becomes an ordinary
 * failure, and the backoff below already knows what to do with those.
 */
const REQUEST_TIMEOUT_MS = 20_000
/**
 * How long Start, Stop and Continue wait for the check after opening or
 * waking (D2). Longer is a tap that feels broken; shorter is a slow signal
 * acting on an old copy.
 */
export const CHECK_WAIT_MS = 3_000
/**
 * The most a request sent on the way out may carry. A browser refuses a
 * `keepalive` request once all of them in the air together pass 64 KiB, so
 * this leaves room for the headers.
 */
export const KEEPALIVE_BUDGET_BYTES = 60 * 1024
/** A burst of change pings — one per row of a split — becomes one check */
const PING_SETTLE_MS = 300
/** Tab switches fire `focus` and `visibilitychange` together: one check for both */
const FOCUS_CHECK_GAP_MS = 2_000

/**
 * Every request to the sync route goes through here, so each answer also tells
 * this device how far its clock is from the server's (D5, `serverClock`).
 */
async function askServer(url: string, init?: RequestInit): Promise<Response> {
  const sentAt = Date.now()
  const response = await fetch(url, init)
  const headers = (response as Partial<Response>).headers
  noteServerDate(sentAt, Date.now(), headers && typeof headers.get === "function" ? headers.get("date") : null)
  return response
}

/**
 * The largest first batch of `rows` whose request body fits `budget` bytes, or
 * null when not even one row does. What it leaves out stays queued.
 */
function firstBatchWithin(
  rows: Partial<TimetrackRows>,
  bodyOf: (batch: Partial<TimetrackRows>) => string,
  budget: number,
): Partial<TimetrackRows> | null {
  const encoder = new TextEncoder()
  for (let size = Math.min(countRows(rows), MAX_ROWS_PER_REQUEST); size >= 1; size = Math.floor(size / 2)) {
    const first = splitIntoBatches(rows, size)[0]
    if (first && encoder.encode(bodyOf(first)).length <= budget) return first
  }
  return null
}

/**
 * THE OTHER DEVICE'S CHANGES, AS THEY HAPPEN (D4).
 *
 * A "something changed, check now" ping from Supabase Realtime for this
 * account's entries; row security applies to the feed, so it carries nothing
 * this account could not read anyway, and the check reads the rows the usual
 * way. Until the table is in the `supabase_realtime` publication (migration
 * 20261104120000) no ping arrives, and the minute's check is all there is —
 * which is what there was before. Returns how to stop listening.
 */
function listenForChanges(userId: string, onChange: (payload: unknown) => void): () => void {
  try {
    const client = createBrowserSupabaseClient()
    // a fresh topic each time: React mounts effects twice in development, and a
    // channel being removed must not be handed back as the new one
    const topic = `timetrack-entries:${userId}:${Math.random().toString(36).slice(2)}`
    const channel = client
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetrack_entries", filter: `user_id=eq.${userId}` },
        (payload) => onChange(payload),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  } catch {
    // no client here (no project settings, a test): the minute's check stands
    return () => {}
  }
}

/**
 * A dead instance's upload landed: take what it sent out of the queue on disk,
 * so the next instance does not send it again. Only rows still exactly as they
 * were sent go; anything changed since stays. Not once the copy on disk is
 * somebody else's: their queue is not this instance's to rewrite.
 */
function forgetSentOnDisk(accepted: Partial<TimetrackRows>, account: string | undefined): void {
  if (ownerChangedUnderneath(account)) return
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return
    const left = withoutSentRows(JSON.parse(raw) as Partial<TimetrackRows>, accepted)
    const keys = keysIn(left)
    const stored = readPendingBases()
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(left))
    window.localStorage.setItem(
      PENDING_BASES_KEY,
      JSON.stringify({
        bases: Object.fromEntries(Object.entries(stored.bases).filter(([key]) => keys.has(key))),
        tagSets: Object.fromEntries(Object.entries(stored.tagSets).filter(([id]) => keys.has(`timetrack_entries/${id}`))),
      }),
    )
  } catch {
    // the live instance, or the next one, sends it again; the version check makes that harmless
  }
}

function readPending(): Partial<TimetrackRows> {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return {}
    return repairPending(JSON.parse(raw) as Partial<TimetrackRows>)
  } catch {
    return {}
  }
}

/** What the queue was based on, and its tag sets. Absent or unreadable: unknown. */
function readPendingBases(): { bases: Bases; tagSets: TagSets } {
  try {
    const raw = window.localStorage.getItem(PENDING_BASES_KEY)
    const parsed = raw ? (JSON.parse(raw) as { bases?: Bases; tagSets?: TagSets }) : {}
    return { bases: parsed.bases ?? {}, tagSets: parsed.tagSets ?? {} }
  } catch {
    return { bases: {}, tagSets: {} }
  }
}

/** Every row of a change set by `${table}/${key}`, the shape `keysIn` names them in */
function indexRows(rows: Partial<TimetrackRows> | null): Map<string, AnyRow> {
  const index = new Map<string, AnyRow>()
  if (!rows) return index
  for (const table of TIMETRACK_TABLES) {
    for (const row of (rows[table] ?? []) as unknown as AnyRow[]) index.set(`${table}/${rowKeyOf(table, row)}`, row)
  }
  return index
}

/** Each entry's tag ids in a set of rows */
function linksByEntry(rows: Partial<TimetrackRows> | null): Map<string, string[]> {
  const links = new Map<string, string[]>()
  for (const link of rows?.timetrack_entry_tags ?? []) {
    const tags = links.get(link.entry_id) ?? []
    if (!tags.includes(link.tag_id)) tags.push(link.tag_id)
    links.set(link.entry_id, tags)
  }
  return links
}

/**
 * For each row in a batch, the server version it was based on — `null` for a
 * row this device believes is new, and for one whose base it does not know (a
 * queue from before this). The server writes a row named `null` only if it does
 * not exist yet, so not knowing can never overwrite anything.
 */
function basesFor(batch: Partial<TimetrackRows>, recorded: Bases): PushBases {
  const out: PushBases = {}
  for (const table of TIMETRACK_TABLES) {
    if (table === "timetrack_entry_tags") continue
    const list = (batch[table] ?? []) as unknown as AnyRow[]
    if (list.length === 0) continue
    const byKey: Record<string, string | null> = {}
    for (const row of list) {
      const key = rowKeyOf(table, row)
      byKey[key] = recorded[`${table}/${key}`]?.v ?? null
    }
    out[table] = byKey
  }
  return out
}

/**
 * The queued tag sets of the entries in this batch — and of the entries whose
 * LINKS are in it. A set goes with its entry, but a big queue can be split with
 * the entry in one request and its links in the next. Named in that next one
 * too, the set stops the server adding those links outside the entry's check
 * (it skips links of any entry whose set it was given, and applies a set only
 * beside its entry), so a refused entry cannot gain links by the back door.
 */
function setsFor(batch: Partial<TimetrackRows>, sets: TagSets): TagSets {
  const out: TagSets = {}
  const ids = [...(batch.timetrack_entries ?? []).map((row) => row.id), ...(batch.timetrack_entry_tags ?? []).map((link) => link.entry_id)]
  for (const id of ids) if (Object.prototype.hasOwnProperty.call(sets, id)) out[id] = sets[id]
  return out
}

/** Only these rows of a change set, by `${table}/${key}` as `keysIn` names them */
function onlyKeys(rows: Partial<TimetrackRows>, keys: Set<string>): Partial<TimetrackRows> {
  const out: Partial<TimetrackRows> = {}
  for (const table of TIMETRACK_TABLES) {
    const list = ((rows[table] ?? []) as unknown as AnyRow[]).filter((row) => keys.has(`${table}/${rowKey(table, row)}`))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (list.length > 0) (out as any)[table] = list
  }
  return out
}

/** The change set without these rows, and without the links of these entries */
function withoutKeys(rows: Partial<TimetrackRows>, keys: Set<string>, entries: Set<string>): Partial<TimetrackRows> {
  const out: Partial<TimetrackRows> = {}
  for (const table of TIMETRACK_TABLES) {
    const list = ((rows[table] ?? []) as unknown as AnyRow[]).filter((row) =>
      table === "timetrack_entry_tags" ? !entries.has(String(row.entry_id)) : !keys.has(`${table}/${rowKeyOf(table, row)}`),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (list.length > 0) (out as any)[table] = list
  }
  return out
}

/**
 * A base for each changed row that has none yet: the row as it was in `from`,
 * at a version this device does not know. A change made before the account
 * answered was made on top of that copy.
 */
function basesFrom(from: TimetrackRows | null, changed: Partial<TimetrackRows>, existing: Bases): Bases {
  const out: Bases = { ...existing }
  const index = indexRows(from)
  const links = linksByEntry(from)
  for (const key of keysIn(changed)) {
    if (key in out) continue
    const record: BaseRecord = { v: null, row: index.get(key) ?? null }
    if (key.startsWith("timetrack_entries/")) record.tags = links.get(key.slice("timetrack_entries/".length)) ?? []
    out[key] = record
  }
  return out
}

/**
 * HOW MANY CHANGES IN THIS BROWSER HAVE NOT REACHED THE ACCOUNT: the rows in the
 * queue, and what changed since a base kept while the account had not
 * answered (rows the queue does not hold already). Log Out tries to send these
 * and asks before it throws any away (`LogOutButton`).
 */
export function unsentTrackerChanges(): number {
  const queued = readPending()
  let count = countRows(queued)
  const kept = readOfflineBase()
  if (!kept) return count
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const now = raw ? (JSON.parse(raw) as TimetrackState) : null
    if (!now || now.version !== STATE_VERSION || !Array.isArray(now.entries)) return count
    const inQueue = keysIn(queued)
    const since = diffRows(stateToRows(kept.state, kept.owner), stateToRows(now, kept.owner), serverNowIso())
    for (const key of keysIn(since.changed)) if (!inQueue.has(key) && (!kept.own || kept.own.has(key))) count += 1
  } catch {
    // an unreadable workspace: the queue is all that can be counted
  }
  return count
}

/** The tracker's sync instances mounted in this tab, each able to check and send now */
const liveSenders = new Set<() => void>()

/**
 * Ask the tracker mounted in this tab, if there is one, to check the account
 * and send what waits — what the badge's tap does. False: none is mounted here.
 */
export function sendTrackerChangesNow(): boolean {
  for (const send of liveSenders) send()
  return liveSenders.size > 0
}

/** See `OFFLINE_BASE_KEY`: what this browser held when it was last in step, and whose it was */
interface OfflineBase {
  owner: string
  state: TimetrackState
  /**
   * The rows this device edited itself since the base was kept (see
   * `OFFLINE_OWN_ROWS_KEY`). Null: a base from before this was recorded, when
   * everything that differs from it counts, as it always did.
   */
  own: Set<string> | null
}

/**
 * NO AGE LIMIT, ON PURPOSE. A phone can be without signal for days — travel, a
 * dead zone overnight — and an edit made then is exactly what this exists to
 * keep. What made an old base dangerous was laying changes it only HEARD from
 * other tabs over newer rows (a code review, 2026-11-04); it now lays only the
 * rows this device edited itself (`own`), so for every other row the account's
 * copy stands, however old the base is.
 */

function readOfflineBase(): OfflineBase | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_BASE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OfflineBase>
    // kept by a build with another state shape: it cannot be compared with this one's
    if (typeof parsed.owner !== "string" || !parsed.state?.workspace || !Array.isArray(parsed.state.entries)) return null
    if (parsed.state.version !== STATE_VERSION) return null
    return { owner: parsed.owner, state: parsed.state, own: readOwnRows() }
  } catch {
    return null
  }
}

/** Kept once: an earlier opening's base is older, and covers this one's changes too */
function keepOfflineBase(base: { owner: string; state: TimetrackState }): boolean {
  try {
    if (window.localStorage.getItem(OFFLINE_BASE_KEY) !== null) return true
    window.localStorage.setItem(OFFLINE_BASE_KEY, JSON.stringify({ owner: base.owner, state: base.state }))
    // a new base starts with no rows of its own
    window.localStorage.setItem(OFFLINE_OWN_ROWS_KEY, "[]")
    return true
  } catch {
    return false
  }
}

/** The rows this device edited itself since the base, or null when that was not recorded */
function readOwnRows(): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_OWN_ROWS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? new Set(parsed.filter((key): key is string => typeof key === "string")) : null
  } catch {
    return null
  }
}

/** Add rows this device just edited itself to the ones the base speaks for */
function noteOwnRows(keys: Iterable<string>): boolean {
  try {
    const own = readOwnRows() ?? new Set<string>()
    for (const key of keys) own.add(key)
    window.localStorage.setItem(OFFLINE_OWN_ROWS_KEY, JSON.stringify([...own]))
    return true
  } catch {
    return false
  }
}

function forgetOfflineBase(): void {
  try {
    window.localStorage.removeItem(OFFLINE_BASE_KEY)
    window.localStorage.removeItem(OFFLINE_OWN_ROWS_KEY)
  } catch {
    // nothing more to do: an unreadable base is never used
  }
}

/** An entry's description, as the server has it or else as this device does: for naming it in a notice */
function entryNamesIn(stored: Partial<TimetrackRows>, held: TimetrackState | null): (entryId: string) => string | null {
  return (entryId) => {
    const row = (stored.timetrack_entries ?? []).find((entry) => entry.id === entryId)
    if (row && typeof row.description === "string") return row.description
    return held?.entries.find((entry) => entry.id === entryId)?.description ?? null
  }
}

/** How each column reads in a sentence, for the notice below */
const COLUMN_WORDS: Record<string, string> = {
  started_at: "start",
  stopped_at: "end",
  description: "description",
  project_id: "project",
  task_id: "task",
  billable: "billable setting",
  name: "name",
}

/**
 * "CHANGED ON YOUR OTHER DEVICE" (D1): the other device's value was kept over
 * one this device changed — a Stop pressed on a copy that had not checked yet,
 * an edit to an entry the other device deleted. Said once per settle, naming the
 * first such entry. Null: nothing of this device's was overruled.
 */
function otherDeviceKept(overruled: Overruled[], nameOf: (entryId: string) => string | null): string | null {
  const first = overruled.find((item) => item.table === "timetrack_entries") ?? overruled[0]
  if (!first) return null
  const more = overruled.length > 1 ? ` (and ${overruled.length - 1} more)` : ""
  if (first.table !== "timetrack_entries") {
    return `Your other device changed the same thing, and its version was kept${more}.`
  }
  const name = `“${nameOf(first.key)?.trim() || "(no description)"}”`
  if (first.deleted) return `Deleted on your other device: ${name}${more}. Your change to it was not kept.`
  const words = first.columns.map((column) => COLUMN_WORDS[column])
  const kept = words.every(Boolean) ? `the ${[...new Set(words)].join(" and ")} set there` : "the change made there"
  return `Changed on your other device: ${name} keeps ${kept}${more}.`
}

export function useTimetrackSync({
  state,
  setState,
  replaceState,
  pushToast,
  account: pageAccount,
  onAccountChanged,
  fromAnotherTab,
}: Options) {
  const [status, setStatus] = useState<SyncStatus>("starting")
  const [pendingCount, setPendingCount] = useState(0)
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null)
  const [check, setCheck] = useState<CheckState>({ checking: true, lastCheckedAt: null, failed: false })
  /** The account this device is signed into, once the first read says so: what the change feed listens to */
  const [account, setAccount] = useState<string | null>(null)

  /** the rows we believe the server has, so a diff knows what is new */
  const serverRows = useRef<TimetrackRows | null>(null)
  /** changes waiting to be sent */
  const pending = useRef<Partial<TimetrackRows>>({})
  const userId = useRef<string | null>(null)
  const cursor = useRef<string | null>(null)
  const flushing = useRef(false)
  /**
   * The upload in the air: its rows as they were queued, by `${table}/${key}`, and
   * the tag sets it carries. A row put back meanwhile is sent again after it, based
   * on what was sent (see `takeBackWhatWasPutBack`).
   */
  const sendingNow = useRef<{ rows: Map<string, AnyRow>; tags: TagSets }>({ rows: new Map(), tags: {} })
  const ready = useRef(false)
  /** the latest state, for code that runs after an await and would otherwise see a stale one */
  const latestState = useRef<TimetrackState | null>(null)
  /**
   * What this browser held the moment the page opened, kept as state rather
   * than rows.
   *
   * It used to be rows, mapped with a placeholder user id because the real one
   * had not arrived yet. Every row then looked different once the real id
   * turned up, and the settings row — which is keyed by user id — looked
   * deleted, so a tombstone was sent for a table that has no `deleted_at`
   * column. The whole batch was rejected, and because a queue drains all or
   * nothing, nothing was ever saved again. Verified against the live database.
   */
  const startingState = useRef<TimetrackState | null>(null)
  /**
   * True once we have successfully read the server and built the workspace from
   * it. Until then this device does not get to tell the server that anything is
   * gone — it has not earned an opinion about what exists.
   */
  const adopted = useRef(false)
  /**
   * The state we handed to `replaceState` and are still waiting for React to
   * apply.
   *
   * WITHOUT THIS: adoption sets the server's rows as the baseline, then the
   * change-watcher runs one more time with the state from *before* adoption —
   * an empty workspace — compares it with the baseline, and concludes that
   * every row on the server was deleted. It then sends exactly that. Verified:
   * it deleted a real entry, twice, before this ref existed.
   */
  const awaitingState = useRef<TimetrackState | null>(null)
  const retryAt = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelay = useRef(RETRY_START_MS)
  /** set when a flush is asked for while one is already in the air */
  const flushAgain = useRef(false)
  /**
   * WHAT THIS DEVICE WROTE, AND WHEN — the guard against a stale answer.
   *
   * `pull` asks what changed since a cursor, and the server answers with rows
   * as they were when it read them. `mergeIncoming` takes the server's version
   * of every row except those still queued for upload, and compares nothing:
   * no timestamps, no versions. So a row that was queued, flushed and cleared
   * while the request was in the air is no longer protected, and the answer —
   * computed before the change — overwrites it.
   *
   * That is what "I had to press Stop twice" was. The timer stopped, the stop
   * went up, and the reply to a question asked a moment earlier put it back.
   * It was nearly invisible until the pull interval was repaired: pulls were
   * starved to roughly none while anybody was working, so fixing that turned a
   * dormant race into a daily one.
   *
   * Client clock only, and only ever compared with itself, so there is no skew
   * to get wrong.
   */
  const localWrites = useRef(new Map<string, number>())
  /**
   * Which pull is the current one.
   *
   * Nothing stopped two from being in flight at once — the tab-focus handler,
   * the sixty-second interval and coming back online can all ask, and a slow
   * answer outlives the next request. Two answers then applied in arrival
   * order, so the one computed FIRST could land LAST and put back what the
   * second had just replaced. Reproduced with two overlapping pulls: another
   * device's change was reverted by an answer written before it existed.
   *
   * A later request's answer is at least as fresh as an earlier one's, because
   * the cursor only moves when an answer is applied. So the newest request
   * wins and older answers are dropped unread.
   */
  const pullSeq = useRef(0)
  /** re-runs first contact after a failure; see the catch at the end of it */
  const firstContactRef = useRef<(() => Promise<void>) | null>(null)
  const firstContactDelay = useRef(RETRY_START_MS)
  const firstContactAt = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * Set when this instance goes away.
   *
   * The retry chains here re-arm themselves from their own catch, so without
   * this a tracker left while first contact was failing kept asking for the
   * life of the tab — and a dead instance still owns `flushRef` and still
   * writes the shared pending queue, which the live instance also owns.
   */
  const unmounted = useRef(false)
  /**
   * READS still in the air, so unmounting can stop them rather than let a dead
   * instance act on the answer. Uploads are not in here any more: leaving the
   * tracker used to cut off the upload of a change made a moment before, and the
   * PC then showed the timer running until the phone opened the tracker again
   * (D3). An upload that lands after its instance is gone only takes what it
   * sent out of the queue on disk — see `forgetSentOnDisk`.
   */
  const inFlight = useRef(new Set<AbortController>())
  /** The 3-second limit on the current "Checking…" (D2) */
  const checkWait = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * `check.checking`, readable the moment it changes. A tap handled in the same
   * tick as waking comes before React has drawn "Checking…", and reading the
   * state would let it act on the old copy.
   */
  const checkingRef = useRef(true)
  /** Leaving was asked for while an upload was in the air: send the rest when it lands */
  const leaveAgain = useRef(false)
  /** When a check was last asked for, so `focus` right after `visibilitychange` asks once */
  const lastAsked = useRef(0)
  /** First contact is in the air: asking again now would read the account twice */
  const firstContactBusy = useRef(false)
  /**
   * WHAT AN EARLIER OPENING HELD WHEN IT WAS LAST IN STEP, read when this one
   * opened (see `OFFLINE_BASE_KEY`).
   *
   * In a basement the tracker opens and the account never answers, so nothing
   * is queued: the account is not known yet, and a change is only on screen.
   * First contact used to find it as "what changed since opening". But close
   * the app before the signal returns — Android does that by itself — and the
   * next opening started from the screen as it was, Stop included: the change
   * was in neither the queue nor "since opening", the account's copy won, and
   * the Stop was gone (a bug audit, 2026-11-04). So the first change made
   * before the account answers keeps what this opening started from, and every
   * later opening diffs against that until the account has heard.
   */
  const offlineBaseAtOpening = useRef<OfflineBase | null>(null)
  /** This opening has made sure that base is kept */
  const offlineBaseKept = useRef(false)
  /** This opening has made an edit of its own, not only heard other tabs' */
  const ownEditSeen = useRef(false)
  /** The rows this opening edited itself before the account answered, by `${table}/${key}` */
  const ownRows = useRef(new Set<string>())
  /** The workspace the change-watcher saw last before the account answered: what an edit is measured from */
  const seenBeforeContact = useRef<TimetrackState | null>(null)
  /**
   * EVERY QUEUED ROW THIS INSTANCE HAS HELD, as it held it, by `${table}/${key}`.
   *
   * The queue on disk is shared by every tab, and each tab wrote its own memory
   * over it. A tab of the previous build, whose messages this one dropped, had
   * its queued Stop overwritten that way and lost (a code review, 2026-11-04).
   * A row on disk that this instance never held — or that another tab has
   * changed since — is another page's, and stays.
   */
  const heldRows = useRef(new Map<string, string>())
  /**
   * THE ACCOUNT CHANGED UNDERNEATH THIS PAGE: another account answered, or this
   * browser's copy was claimed by one (see `browserOwner`). From then on nothing
   * is sent, saved or taken from the server, and the page starts again.
   *
   * Before this, a tab whose session had ended kept checking every 15 s, and the
   * moment somebody else signed in on that browser it sent the previous
   * person's unsent entry into their account, and showed their entries in the
   * previous person's tracker (a privacy audit, 2026-11-04).
   */
  const accountGone = useRef(false)
  /**
   * WHAT THIS DEVICE'S COPY IS BASED ON: the server's `updated_at` for each
   * row, as last heard, by `${table}/${key}` — the version a write names.
   *
   * Learned from the full read at first contact, from the rows a check actually
   * applied (never from one it skipped because this device is changing that row:
   * the change is based on the version from BEFORE, and naming the newer one
   * would let a stale copy through — the very thing this is for), and from every
   * write's answer. That last one is not optional: each write makes a new
   * version, and a device that did not learn it would have its own next edit
   * refused as stale.
   */
  const basis = useRef(new Map<string, string>())
  /**
   * For each queued row, what it was based on (see `BaseRecord`). Recorded when
   * the row is first queued and kept until it is accepted: further edits pile
   * onto the same queued row, and all of them were made on top of that copy.
   * Saved beside the queue, so a reload or another tab still knows.
   */
  const bases = useRef<Bases>({})
  /** Whole tag sets waiting to go, by entry id. Saved beside the queue too. */
  const tagSets = useRef<TagSets>({})
  /** Pushes in a row that came back with stale rows; see the end of `flush` */
  const conflictStreak = useRef(0)

  latestState.current = state

  /**
   * THE STATUS, READABLE WITHOUT DEPENDING ON IT.
   *
   * Every flush sets `status` — "saving" on the way in, "offline"/"error"/
   * "signed-out" on the way out. Three effects below used to list `status` in
   * their dependencies, so each attempt tore them down and rebuilt them, which
   * meant the change-watcher re-armed its 800ms timer after every attempt and
   * the backoff never got to schedule anything. Measured in the product:
   * 25 POSTs in 20.0 seconds, gaps flat at ~850ms, while this file's own
   * backoff says 2s doubling to 60s.
   *
   * Assigned during render, like `latestState` above, so an effect that runs
   * later sees the current value without being re-created to get it.
   */
  const statusRef = useRef<SyncStatus>("starting")
  statusRef.current = status

  /**
   * The coarse signals effects MAY depend on: they change when the answer
   * actually changes, not on every attempt.
   */
  const syncActive = status !== "local-only" && status !== "starting" && status !== "signed-out"
  const signedOut = status === "signed-out"

  /** Forget any armed retry. `clearTimeout` alone leaves the handle truthy. */
  const clearRetry = useCallback(() => {
    if (retryAt.current) clearTimeout(retryAt.current)
    retryAt.current = null
  }, [])

  /**
   * Another account answered, or claimed this browser's copy: stop, send and
   * keep nothing more, and start the page again for whoever is signed in now.
   * What this page held for the previous account is not carried over: a
   * stranger's unsent changes cannot be sent anywhere safely.
   */
  const stopForAnotherAccount = useCallback(() => {
    if (accountGone.current) return
    accountGone.current = true
    clearRetry()
    if (firstContactAt.current) clearTimeout(firstContactAt.current)
    firstContactAt.current = null
    for (const controller of inFlight.current) controller.abort()
    inFlight.current.clear()
    pending.current = {}
    // Log Out removed the copy in this tab and is about to end the session: a reload now would
    // come back signed in. It leaves the page by itself, and the other tabs start again on their own.
    if (onAccountChanged) onAccountChanged()
    else if (!isSigningOut()) startAgain()
  }, [clearRetry, onAccountChanged])
  const stopForAnotherAccountRef = useRef(stopForAnotherAccount)
  stopForAnotherAccountRef.current = stopForAnotherAccount

  // Log Out has begun in this tab: nothing more is sent, retried or checked from here
  useEffect(
    () =>
      whenSigningOut(() => {
        accountGone.current = true
        clearRetry()
        if (firstContactAt.current) clearTimeout(firstContactAt.current)
        firstContactAt.current = null
      }),
    [clearRetry],
  )

  /**
   * "CHECKING…": FROM OPENING OR WAKING UNTIL A CHECK LANDS, THREE SECONDS AT MOST.
   *
   * For the seconds after the phone woke it showed its old copy with no sign of
   * checking, and a tap on Stop in that window stopped, at noon, a timer the PC
   * had stopped at ten — and the noon stop won (sync #2). While this is set the
   * tracker holds Start, Stop and Continue. After `CHECK_WAIT_MS` it lets them
   * go and the badge says the server could not be reached, because acting on an
   * old copy is better than a button that does nothing.
   */
  const beginChecking = useCallback(() => {
    if (unmounted.current) return
    checkingRef.current = true
    setCheck((current) => (current.checking ? current : { ...current, checking: true }))
    if (checkWait.current) clearTimeout(checkWait.current)
    checkWait.current = setTimeout(() => {
      checkWait.current = null
      checkingRef.current = false
      setCheck((current) => (current.checking ? { ...current, checking: false, failed: true } : current))
    }, CHECK_WAIT_MS)
  }, [])

  /**
   * How a check ended. `unanswered`: the server answered but there is nothing to
   * compare with — not signed in. A failed check is never silent: the badge
   * turns amber and says so (D6).
   */
  const noteCheck = useCallback((outcome: "landed" | "failed" | "unanswered") => {
    if (unmounted.current) return
    if (checkWait.current) clearTimeout(checkWait.current)
    checkWait.current = null
    checkingRef.current = false
    setCheck((current) =>
      outcome === "landed"
        ? { checking: false, lastCheckedAt: serverNow(), failed: false }
        : outcome === "failed"
          ? { ...current, checking: false, failed: true }
          : current.checking
            ? { ...current, checking: false }
            : current,
    )
  }, [])

  const savePending = useCallback(() => {
    /**
     * A DEAD INSTANCE DOES NOT GET TO WRITE THE SHARED QUEUE.
     *
     * `PENDING_KEY` is one key in one browser, and every instance of this hook
     * owns it. Navigating away from the tracker with an upload in the air and
     * coming straight back leaves the old instance's request still running: when
     * it answers, the success path empties ITS `pending` and saves — over the live
     * instance's queue, which by then holds a new edit. Measured: the badge reads
     * "1 waiting" and the key on disk reads `{}`. Close the tab before the next
     * flush and that work is gone with no trace.
     *
     * The unmount block's own comment already claimed this was handled. It was
     * not: `unmounted.current` was checked on the way into `flush` and in the
     * drain-again, and neither is on the path a request takes when it answers.
     *
     * Checked here rather than at each call site because there are five of them —
     * success, the 401, the quarantine, the change-watcher and the offer — and
     * this is the one place they all pass through.
     */
    if (unmounted.current || accountGone.current) return
    // the copy on disk is somebody else's now, or Log Out removed it: this queue is not theirs to keep
    if (ownerChangedUnderneath(pageAccount)) {
      stopForAnotherAccountRef.current()
      return
    }
    setPendingCount(countRows(pending.current))
    // what the queue was based on, for exactly the rows still in it
    const queuedKeys = keysIn(pending.current)
    bases.current = Object.fromEntries(Object.entries(bases.current).filter(([key]) => queuedKeys.has(key)))
    tagSets.current = Object.fromEntries(
      Object.entries(tagSets.current).filter(([entryId]) => queuedKeys.has(`timetrack_entries/${entryId}`)),
    )
    // what another page queued and this one never held stays in the shared queue, with its bases
    const others: Partial<TimetrackRows> = {}
    const onDisk = readPendingBases()
    for (const [key, row] of indexRows(readPending())) {
      if (queuedKeys.has(key) || heldRows.current.get(key) === stableStringify(row)) continue
      ;((others as Record<string, AnyRow[]>)[key.slice(0, key.indexOf("/"))] ??= []).push(row)
    }
    for (const [key, row] of indexRows(pending.current)) heldRows.current.set(key, stableStringify(row))
    const othersKeys = keysIn(others)
    const toWrite = othersKeys.size > 0 ? mergeChangeSets(others, pending.current) : pending.current
    const basesToWrite = {
      ...Object.fromEntries(Object.entries(onDisk.bases).filter(([key]) => othersKeys.has(key))),
      ...bases.current,
    }
    const setsToWrite = {
      ...Object.fromEntries(Object.entries(onDisk.tagSets).filter(([entryId]) => othersKeys.has(`timetrack_entries/${entryId}`))),
      ...tagSets.current,
    }
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify(toWrite))
      window.localStorage.setItem(PENDING_BASES_KEY, JSON.stringify({ bases: basesToWrite, tagSets: setsToWrite }))
    } catch {
      // the workspace itself is already saved; a lost queue re-derives from the
      // next diff, so this is worth reporting but not worth blocking on
      pushToast("Could not remember unsent changes in this browser", "error")
    }
  }, [pushToast, pageAccount])

  /** Remember the server's own copy of these rows. Never moves a row back to an older version. */
  const learn = useCallback((rows: Partial<TimetrackRows>, skip?: Set<string>) => {
    for (const [key, row] of indexRows(rows)) {
      if (skip?.has(key)) continue
      const version = versionOf(row)
      if (!version) continue
      const known = basis.current.get(key)
      if (known && olderThan(version, known)) continue
      basis.current.set(key, version)
    }
  }, [])

  /**
   * Put changes in the queue, each with what it was based on.
   *
   * The base is the copy the change was diffed against — `serverRows`, which
   * is in this app's own shape, so "which fields did I change" compares like
   * with like — and the server version of that copy, from `basis`. A row
   * already queued keeps the base it was first queued with: the edits since
   * were made on top of that same copy.
   */
  const queueChanges = useCallback((changed: Partial<TimetrackRows>, sets: TagSets = {}) => {
    // built only when a key needs a base: most edits pile onto a row already queued
    let index: Map<string, AnyRow> | null = null
    let links: Map<string, string[]> | null = null
    const believed = () => (index ??= indexRows(serverRows.current))
    const believedLinks = () => (links ??= linksByEntry(serverRows.current))
    const next: Bases = { ...bases.current }
    for (const key of keysIn(changed)) {
      if (key in next) continue
      const record: BaseRecord = { v: basis.current.get(key) ?? null, row: believed().get(key) ?? null }
      if (key.startsWith("timetrack_entries/")) {
        record.tags = believedLinks().get(key.slice("timetrack_entries/".length)) ?? []
      }
      next[key] = record
    }
    bases.current = next
    pending.current = mergeChangeSets(pending.current, changed)
    tagSets.current = { ...tagSets.current, ...sets }
  }, [])

  /**
   * THE SERVER KEPT A NEWER COPY OF THESE ROWS: lay this device's changes onto it.
   *
   * `stored` is what the server answered with for each refused row, and
   * `sentBases` what those rows were based on when they went. What this device
   * holds NOW stands for "mine" — it includes anything typed while the request
   * was in the air. The merge (see `syncVersionService`) is queued again, now
   * based on the stored copy, and shown: a timer the other device stopped shows
   * stopped here, with this device's own edit on it.
   */
  const settleConflicts = useCallback(
    (stored: Partial<TimetrackRows>, storedTags: TagSets, sentBases: Bases, sent: Partial<TimetrackRows>) => {
      const uid = userId.current
      const held = latestState.current
      if (!uid || !held) {
        // Nothing to merge against. The refused rows go back in the queue as they
        // were sent, with their bases, to be refused and settled next time —
        // never dropped: the caller has already taken them out.
        const refused = keysIn(stored)
        const back = indexRows(sent)
        const rows: Partial<TimetrackRows> = {}
        for (const key of refused) {
          const row = back.get(key)
          if (!row) continue
          ;((rows as Record<string, AnyRow[]>)[key.slice(0, key.indexOf("/"))] ??= []).push(row)
        }
        pending.current = mergeChangeSets(rows, pending.current)
        bases.current = {
          ...Object.fromEntries([...refused].filter((key) => key in sentBases).map((key) => [key, sentBases[key]])),
          ...bases.current,
        }
        return
      }
      const local = stateToRows(held, uid)
      const localIndex = indexRows(local)
      const queuedIndex = indexRows(pending.current)
      const sentIndex = indexRows(sent)
      const localLinks = linksByEntry(local)

      const refusedKeys = new Set<string>()
      const refusedEntries = new Set<string>()
      const mine: Partial<TimetrackRows> = {}
      const mineTags: TagSets = {}
      for (const [key, row] of indexRows(stored)) {
        refusedKeys.add(key)
        const table = key.slice(0, key.indexOf("/")) as keyof TimetrackRows
        if (table === "timetrack_entries") refusedEntries.add(String(row.id))
        const here = localIndex.get(key) ?? queuedIndex.get(key) ?? sentIndex.get(key)
        if (!here) continue
        ;((mine as Record<string, AnyRow[]>)[table] ??= []).push(here)
        if (table === "timetrack_entries" && localIndex.has(key)) mineTags[String(row.id)] = localLinks.get(String(row.id)) ?? []
      }

      const rebased = rebase(mine, sentBases, mineTags, stored, (entryId) => storedTags[entryId])
      const notice = otherDeviceKept(rebased.overruled, entryNamesIn(stored, held))

      learn(stored)
      pending.current = mergeChangeSets(withoutKeys(pending.current, refusedKeys, refusedEntries), rebased.send)
      bases.current = {
        ...Object.fromEntries(Object.entries(bases.current).filter(([key]) => !refusedKeys.has(key))),
        ...rebased.bases,
      }
      tagSets.current = {
        ...Object.fromEntries(Object.entries(tagSets.current).filter(([entryId]) => !refusedEntries.has(entryId))),
        ...rebased.tagSets,
      }

      // what the server has for those rows is now known exactly
      const believed = withServerTagLinks(
        mergeIncoming(serverRows.current ?? emptyRows(), stored, new Set()),
        [
          ...(serverRows.current?.timetrack_entry_tags ?? []).filter((link) => !refusedEntries.has(link.entry_id)),
          ...Object.entries(storedTags).flatMap(([entryId, tags]) => tags.map((tagId) => ({ entry_id: entryId, tag_id: tagId, user_id: uid }))),
        ],
        new Set(),
      )
      serverRows.current = stateToRows(rowsToState(believed, serverNowIso()), uid)

      // and what this device shows for them is the merge
      const shown = applyTagSets(mergeIncoming(local, rebased.hold, new Set()), rebased.holdTags)
      const settled = reconcileRunningEntries(rowsToState(shown, serverNowIso()))
      if (diffRows(local, stateToRows(settled.state, uid), serverNowIso()).count > 0) {
        replaceState(settled.state)
      }
      if (notice) pushToast(notice)
    },
    [learn, replaceState, pushToast],
  )
  /** read through a ref, so `flush` does not change identity whenever the workspace does */
  const settleConflictsRef = useRef(settleConflicts)
  settleConflictsRef.current = settleConflicts

  const flushRef = useRef<((options?: FlushOptions) => Promise<void>) | null>(null)

  const flush = useCallback(async (options: FlushOptions = {}) => {
    /**
     * ON THE WAY OUT (D3): the page is being hidden, closed or left, so this goes
     * now, with `keepalive`, which a browser finishes even if the page does not
     * live to read the answer — and it may go from an instance that is already
     * unmounting, which is the one case a dead instance still sends.
     */
    const leaving = options.keepalive === true
    if (accountGone.current) return
    if (unmounted.current && !leaving) return
    if (flushing.current) {
      // Something was queued while a request was in the air. That used to wait
      // for an unrelated edit: the request ends by setting the status it
      // already had, React bails, no effect re-runs, and the remainder sits
      // there with nothing in flight. Seen in the product: 21 rows, sixteen
      // seconds, badge reading "Saving 21…".
      flushAgain.current = true
      // and leaving now must not wait for an instance that is about to be gone (D3)
      if (leaving) leaveAgain.current = true
      return
    }
    if (!userId.current) return
    if (countRows(pending.current) === 0) {
      setStatus("synced")
      return
    }
    flushing.current = true
    /**
     * Whether this attempt actually reached the server. The drain-again in
     * `finally` keys off THIS and not off the status, because the status ref is
     * written during render and a `return` inside this function happens long
     * before that — the first version of this guard read a stale "not signed
     * out" after a 401 and re-entered immediately, 19,201 times in a
     * twenty-second test. Caught by the test in the same commit.
     */
    let sent = false
    setStatus("saving")
    // Everything goes to the one workspace the app is showing, whatever id the
    // row was created under before the server's copy arrived. `queued` is kept
    // separately: the queue is cleared by comparing against the object that was
    // queued, not against this rewritten copy, which is never the same object.
    const queued = pending.current
    // what each queued row was based on, as it was when it went: an edit during
    // the request records nothing new for a row already queued, but a settle
    // must read the bases these rows were SENT with
    const queuedBases = bases.current
    const queuedSets = tagSets.current
    const workspaceId = latestState.current?.workspace.id
    const sending = workspaceId ? reattachToWorkspace(queued, workspaceId) : queued
    const answers: VersionedPushResult = { applied: 0, written: {}, conflicts: {}, conflictTags: {} }
    const setsSent: TagSets = {}
    // each row names the server version it was based on; see `basesFor`
    // and the account they are for: the server refuses them for any other (a browser shared by two people)
    const forAccount = userId.current !== "self" ? userId.current : undefined
    const bodyOf = (batch: Partial<TimetrackRows>) =>
      JSON.stringify({
        rows: batch,
        bases: basesFor(batch, queuedBases),
        tagSets: setsFor(batch, queuedSets),
        account: forAccount,
      })
    // Sent in batches: a year of tracked time is megabytes, and a single
    // request that large is one the server may simply refuse — leaving the
    // person with nothing uploaded and no idea why.
    let batches = splitIntoBatches(sending, MAX_ROWS_PER_REQUEST)
    /**
     * On the way out, only what one keepalive request may carry: the browser
     * refuses one over 64 KiB, and the page may not live to send a second. The
     * rest stays queued; if the page is still there when this one lands, the
     * drain-again below sends the next part the same way.
     */
    let keepalive = false
    if (leaving) {
      const fits = firstBatchWithin(sending, bodyOf, KEEPALIVE_BUDGET_BYTES)
      if (fits) {
        batches = [fits]
        keepalive = true
      } else {
        // not even one row fits a keepalive request: send it the ordinary way and hope
        batches = batches.slice(0, 1)
      }
    }
    /** What actually went, which on the way out may be only part of the queue */
    const went: Partial<TimetrackRows> = batches.length === 1 ? batches[0] : sending
    sendingNow.current = { rows: indexRows(onlyKeys(queued, keysIn(went))), tags: setsFor(went, queuedSets) }
    try {
      for (const batch of batches) {
        // NOT registered in `inFlight`: an upload outlives the screen that started it (D3)
        const abort = new AbortController()
        const deadline = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
        const batchSets = setsFor(batch, queuedSets)
        Object.assign(setsSent, batchSets)
        let response: Response
        try {
          response = await askServer("/api/timetrack/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: bodyOf(batch),
            signal: abort.signal,
            keepalive,
          })
        } finally {
          clearTimeout(deadline)
        }
        if (response.status === 401) {
          // The session ended while the tab was open. Retrying is pointless,
          // and the first version did it forever — sitting on "Saving 43…"
          // while the work went nowhere. Stop, say so, and keep every change
          // queued for after the next sign-in.
          setStatus("signed-out")
          clearRetry()
          return
        }
        if (!response.ok) {
          const failure = (await response.json().catch(() => ({}))) as {
            error?: string
            /** which table the refused rows are in, so they can be taken out of the queue */
            table?: string
            ids?: string[]
            /** somebody else is signed in now: these rows are not theirs (see the route) */
            accountChanged?: boolean
          }
          if (response.status === 409 && failure.accountChanged) {
            stopForAnotherAccountRef.current()
            return
          }
          const message = failure.error ?? response.statusText
          if (response.status >= 400 && response.status < 500) {
            /**
             * THE SERVER SAID THE ROWS ARE WRONG, NOT "TRY AGAIN LATER".
             *
             * Retrying those forever is what turned one mistyped end time into
             * an account that never saved again: the row was refused by a check
             * constraint, the queue drains all or nothing, and everything
             * behind it stayed in the browser while the badge promised it would
             * be sent. This file's neighbour records the same shape from a bad
             * workspace id, fixed only for that one cause.
             *
             * So: stop, keep the queue, and say what the server said — a
             * refusal the person can act on beats a spinner that never ends.
             */
            clearRetry()
            setStatus("error")
            /**
             * Name the entry, not the constraint. The server isolates which
             * rows it refused, so "Could not save “morning pages”" beats a
             * sentence about `timetrack_entries_stop_after_start` that nobody
             * can act on.
             */
            const named = (failure.table === "timetrack_entries" ? (failure.ids ?? []) : [])
              .map((key) => latestState.current?.entries.find((e) => e.id === key))
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
              .map((entry) => `“${entry.description.trim() || "(no description)"}”`)
            pushToast(
              named.length > 0
                ? `Your account refused ${named.join(", ")} and it has not been saved. Open it and check its times — an end before its start is the usual reason.`
                : `Your account refused a change and it has not been saved: ${message}. Nothing is lost — it is still in this browser. Reload to resync.`,
              "error",
            )

            /**
             * AND TAKE IT OUT OF THE QUEUE, WHICH IS THE HALF THAT MATTERS.
             *
             * Stopping the automatic retry only moved the retry to the user's
             * keystrokes: the refused row stayed queued, so every later edit
             * re-sent it, got the same 400, raised another toast, and did not
             * reach the server either. And a key stuck in `pending` is marked
             * dirty on every pull while the cursor moves past it — so the other
             * device's correction for that same row is discarded and never
             * asked for again. One mistyped time, two devices permanently
             * disagreeing.
             *
             * The row is not lost: the workspace still holds it, the message
             * names it, and fixing it makes a fresh change that will be sent.
             * Recording it in `serverRows` is what stops the change-watcher
             * queueing it again until it does change.
             */
            const refusedTable = failure.table as keyof TimetrackRows | undefined
            const refusedKeys = new Set(failure.ids ?? [])
            if (refusedTable && refusedKeys.size > 0) {
              /**
               * MATCHED ON A ROW KEY, WHICH IS WHAT THE SERVER NOW REPORTS.
               *
               * This matched `String(row.id)`, and three tables have no `id`
               * column — the tag links are keyed by their pair, settings by the
               * person. So a refusal in any of them matched nothing: the filter
               * removed nothing, the row stayed queued, and the immediate
               * re-flush below fired anyway into the same refusal. Measured at
               * 4,201 POSTs in five simulated seconds.
               */
              const queuedHere = (pending.current[refusedTable] ?? []) as unknown as Record<string, unknown>[]
              const isRefused = (row: Record<string, unknown>) => refusedKeys.has(rowKey(refusedTable, row))
              const refusedRows = queuedHere.filter(isRefused)
              const keptRows = queuedHere.filter((row) => !isRefused(row))

              if (refusedRows.length > 0) {
                pending.current = { ...pending.current, [refusedTable]: keptRows } as Partial<TimetrackRows>
                savePending()
                serverRows.current = mergeIncoming(
                  serverRows.current ?? emptyRows(),
                  { [refusedTable]: refusedRows } as Partial<TimetrackRows>,
                  new Set(),
                )
                // and send what is left NOW rather than at the next edit — the
                // rest of the queue did nothing wrong
                if (countRows(pending.current) > 0) setTimeout(() => void flushRef.current?.(), 0)
                return
              }
            }

            /**
             * NOTHING WAS IDENTIFIED, SO NOTHING IS RE-SENT IMMEDIATELY.
             *
             * The old code re-armed the flush whenever the server named anything
             * at all, whether or not a row was actually dropped — so a name the
             * browser could not match became a request per round trip, for ever,
             * with an error toast each time. The queue is unchanged here, so
             * sending it again this instant can only produce the same refusal.
             *
             * The work is not lost: it stays in `pending`, on disk, and goes up on
             * the next edit, on `online`, or when the tab is looked at again. The
             * badge and the toast above say what happened. Not retrying is the
             * whole point of a 4xx.
             */
            return
          }
          throw new Error(message)
        }
        // what was written, at which version, and what the server kept because it was newer.
        // A server from before versions (or one without the database function yet) says none of it.
        const answer = (await response.json().catch(() => ({}))) as Partial<VersionedPushResult>
        for (const [table, byKey] of Object.entries(answer.written ?? {})) {
          Object.assign((answers.written[table as keyof TimetrackRows] ??= {}), byKey)
        }
        for (const [table, stored] of Object.entries(answer.conflicts ?? {})) {
          ;((answers.conflicts as Record<string, unknown[]>)[table] ??= []).push(...((stored ?? []) as unknown[]))
        }
        Object.assign(answers.conflictTags, answer.conflictTags ?? {})
      }

      /**
       * ROWS THE SERVER REFUSED AS STALE ARE NOT WHAT IT HAS. Everything else is.
       * A refused entry's tag set and links were refused with it.
       */
      const refusedKeys = keysIn(answers.conflicts)
      const refusedEntries = new Set([
        ...Object.keys(answers.conflictTags),
        ...(answers.conflicts.timetrack_entries ?? []).map((row) => row.id),
      ])
      const accepted = withoutKeys(went, refusedKeys, refusedEntries)
      /**
       * A TIMER THAT WAS NOT RUNNING IS RUNNING ON THE ACCOUNT NOW. Another device
       * may have started one meanwhile — a Walk queued offline at noon, sent from
       * a pocket after the PC started Read at ten past — and nothing looked again
       * until somebody opened the app, so both ran (a code review, 2026-11-04).
       * Checking at once lets the usual reconciliation stop the older one.
       */
      const startedHere = ((accepted.timetrack_entries ?? []) as unknown as AnyRow[]).some((row) => {
        if (row.stopped_at != null || row.deleted_at) return false
        const before = queuedBases[`timetrack_entries/${String(row.id)}`]?.row
        return !before || before.stopped_at != null
      })
      const acceptedSets = Object.fromEntries(Object.entries(setsSent).filter(([entryId]) => !refusedEntries.has(entryId)))

      // what we just sent is now what the server has
      serverRows.current = applyTagSets(mergeIncoming(serverRows.current ?? emptyRows(), accepted, new Set()), acceptedSets)

      /**
       * AND EACH WRITE'S NEW VERSION IS WHAT THE NEXT EDIT OF THAT ROW IS BASED ON.
       *
       * Every write makes a new version. Forgetting it would leave this device
       * naming the version before its own write, and its next edit would be
       * refused as stale — by itself. `aDevicesOwnSecondEditIsNotRefused`.
       */
      const sentIndex = indexRows(accepted)
      const writtenVersions = new Map<string, string>()
      for (const [table, byKey] of Object.entries(answers.written)) {
        for (const [key, version] of Object.entries(byKey ?? {})) writtenVersions.set(`${table}/${key}`, version)
      }
      for (const [key, version] of writtenVersions) {
        if (sentIndex.has(key)) basis.current.set(key, version)
      }
      /**
       * TAKE OUT WHAT WAS SENT, NOT "EVERYTHING OR NOTHING".
       *
       * This compared object identity: if `pending.current` was still the very
       * object that went up, clear it, otherwise keep all of it. Any edit made
       * during the request replaces that object, so the whole queue was kept —
       * including every row the server had just accepted — and the drain-again
       * sent them all a second time. Upserts, so wasteful rather than lossy, but
       * it is one extra full upload per interleaved edit, and on a phone the
       * queue is largest exactly when someone is typing.
       *
       * Removing the sent keys is the same rule stated properly, and it keeps what
       * arrived while the request was in the air.
       */
      /**
       * Compared as they were QUEUED, not as they were sent: `sending` carries the
       * workspace id rewritten to the account's, and a row queued before the
       * account's workspace was known would never match it and go up again.
       */
      const acceptedAsQueued = onlyKeys(queued, keysIn(accepted))
      pending.current = pending.current === queued && went === sending ? {} : withoutSentRows(pending.current, acceptedAsQueued)
      // gone from the screen already: this instance's queue is no longer the one on disk
      if (unmounted.current) forgetSentOnDisk(acceptedAsQueued, pageAccount)

      /**
       * A row edited while its upload was in the air is still queued — and that
       * edit was made on top of what just landed, so that is now its base.
       */
      const nextBases: Bases = {}
      for (const key of keysIn(pending.current)) {
        const version = writtenVersions.get(key)
        const sentRow = sentIndex.get(key)
        if (version && sentRow) {
          const record: BaseRecord = { v: version, row: sentRow }
          if (key.startsWith("timetrack_entries/")) {
            const entryId = key.slice("timetrack_entries/".length)
            const tags = acceptedSets[entryId] ?? bases.current[key]?.tags
            if (tags) record.tags = tags
          }
          nextBases[key] = record
        } else if (bases.current[key]) {
          nextBases[key] = bases.current[key]
        }
      }
      bases.current = nextBases
      tagSets.current = Object.fromEntries(
        Object.entries(tagSets.current).filter(
          ([entryId, tags]) => !(entryId in acceptedSets && sameTagSet(tags, acceptedSets[entryId])),
        ),
      )

      const stale = countRows(answers.conflicts) > 0
      if (stale && !unmounted.current) settleConflictsRef.current?.(answers.conflicts, answers.conflictTags, queuedBases, went)

      savePending()
      retryDelay.current = RETRY_START_MS
      clearRetry()
      sent = true
      /**
       * THE SAME ROWS COMING BACK NEWER, PUSH AFTER PUSH, IS NOT A REASON TO SPIN.
       *
       * One refusal is ordinary — the other device was here first — and the merge
       * goes straight back up. Three in a row means something is writing those
       * rows as fast as this device can answer, or that this device cannot name a
       * version the server accepts. Either way the next try waits for the backoff
       * rather than following immediately, which is the loop this file has
       * measured three times over in other shapes.
       */
      conflictStreak.current = stale ? conflictStreak.current + 1 : 0
      if (conflictStreak.current >= 3) {
        retryAt.current = setTimeout(() => void flushRef.current?.(), retryDelay.current)
        retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS)
      }
      setStatus(countRows(pending.current) > 0 ? "saving" : "synced")
      if (startedHere && !unmounted.current) setTimeout(() => checkRef.current(), 0)
    } catch (error) {
      // a send from an instance that has gone stays in the queue on disk for the next one
      if (unmounted.current) return
      // try again by ourselves, sooner at first and then less often
      if (retryAt.current) clearTimeout(retryAt.current)
      retryAt.current = setTimeout(() => void flushRef.current?.(), retryDelay.current)
      retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS)
      setStatus(navigator.onLine ? "error" : "offline")
      if (navigator.onLine) {
        pushToast(
          `Could not save to your account: ${error instanceof Error ? error.message : "unknown error"}. Your work is safe in this browser and will be sent again.`,
          "error",
        )
      }
    } finally {
      flushing.current = false
      sendingNow.current = { rows: new Map(), tags: {} }
      /**
       * Whatever was queued while that request was in the air goes now, rather
       * than waiting for a status change that may never come. This is the work
       * the old 800ms re-arming loop was accidentally doing; it is done on
       * purpose here, once, instead of every 800ms forever.
       */
      const more = flushAgain.current || countRows(pending.current) > 0
      flushAgain.current = false
      if (sent && more && retryAt.current === null && !unmounted.current) {
        // still hidden: the next part goes the way this one did
        const stillAway = leaving && document.visibilityState === "hidden"
        setTimeout(() => void flushRef.current?.({ keepalive: stillAway }), 0)
      } else if (unmounted.current && leaveAgain.current && countRows(pending.current) > 0) {
        // the tracker was left while this was in the air: what was queued behind it goes now, once
        leaveAgain.current = false
        void flushRef.current?.({ keepalive: true })
      }
    }
  }, [clearRetry, pushToast, savePending, pageAccount])

  flushRef.current = flush

  useEffect(() => {
    /**
     * SET ON MOUNT, NOT ONLY ON UNMOUNT.
     *
     * React runs every effect twice in development — mount, clean up, mount —
     * so a flag that is only ever set true in the cleanup is true for the whole
     * life of the page after the very first render. Every `fetch` and every
     * flush then returned at its first line: no first contact, no badge,
     * nothing queued, nothing uploaded, and a workspace that quietly existed in
     * one browser only. 767 rows here, 764 on the account.
     *
     * The owner's product IS the dev server, so this was not a development-only
     * inconvenience; it was the whole feature, off, silently, for an hour.
     */
    unmounted.current = false
    // "Checking…" from the moment the tracker opens (D2)
    beginChecking()
    return () => {
      unmounted.current = true
      if (retryAt.current) clearTimeout(retryAt.current)
      retryAt.current = null
      if (firstContactAt.current) clearTimeout(firstContactAt.current)
      firstContactAt.current = null
      if (checkWait.current) clearTimeout(checkWait.current)
      checkWait.current = null
      /**
       * LEAVING THE TRACKER SENDS WHAT IS QUEUED, AND LETS AN UPLOAD IN THE AIR LAND.
       *
       * Leaving used to cancel the 800 ms wait and abort the upload in the air, so
       * a Stop pressed just before going back to the Dashboard waited until the
       * tracker was opened again, and the PC showed the timer running all that
       * time (sync #5, getting-around #1). The send goes from this instance,
       * which is already marked gone: whatever its answer says is applied only to
       * the queue on disk (`forgetSentOnDisk`), never over the next instance's.
       *
       * Reads in the air are still stopped: their answers belong to a screen
       * that no longer exists.
       */
      sendOnLeaveRef.current?.()
      for (const controller of inFlight.current) controller.abort()
      inFlight.current.clear()
    }
  }, [beginChecking])

  // --- first contact: who are we, and what does the server already have? ----
  useEffect(() => {
    if (!state || ready.current) return
    ready.current = true
    pending.current = readPending()
    for (const [key, row] of indexRows(pending.current)) heldRows.current.set(key, stableStringify(row))
    const stored = readPendingBases()
    bases.current = stored.bases
    tagSets.current = stored.tagSets
    setPendingCount(countRows(pending.current))
    // remember what was here before the server said anything
    startingState.current = state
    // and what an earlier opening that never reached the account started from — unless it is too
    // old to speak for this device any more, when this opening's own edits get a base of their own
    offlineBaseAtOpening.current = readOfflineBase()

    /**
     * What this device's own changes are found against: the base an earlier
     * opening kept, when it was kept for the account that answered, else what
     * this opening started from. A base kept for anybody else is dropped, so
     * nothing of theirs is sent.
     */
    const startFor = (signedIn: string | null): { start: TimetrackState | null; own: Set<string> | null } => {
      const kept = offlineBaseAtOpening.current
      /**
       * Used even when another tab has taken it from disk meanwhile, and however
       * old: what it lays over the account is only the rows this device edited
       * itself, so sending one again is harmless, and dropping one would lose it.
       */
      if (kept && signedIn && kept.owner === signedIn) {
        return { start: kept.state, own: kept.own ? new Set([...kept.own, ...ownRows.current]) : null }
      }
      if (kept) {
        offlineBaseAtOpening.current = null
        forgetOfflineBase()
      }
      return { start: startingState.current, own: ownEditSeen.current ? new Set(ownRows.current) : null }
    }
    /** The queue now holds this device's changes: the kept base is no longer needed */
    const claimed = () => {
      offlineBaseAtOpening.current = null
      forgetOfflineBase()
    }

    const attempt = async () => {
      if (unmounted.current || firstContactBusy.current || accountGone.current) return
      firstContactBusy.current = true
      try {
        const read = async (path: string): Promise<Response> => {
          const abort = new AbortController()
          inFlight.current.add(abort)
          const deadline = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
          try {
            // never an answer from a cache: its `Date` would set the clock wrong (D5)
            return await askServer(path, { signal: abort.signal, cache: "no-store" })
          } finally {
            clearTimeout(deadline)
            inFlight.current.delete(abort)
          }
        }
        // the account without its deleted history, unless this device holds a row it lacks: see below
        const response = await read("/api/timetrack/sync?live=1")
        if (response.status === 401) {
          setStatus("local-only")
          noteCheck("unanswered")
          return
        }
        if (!response.ok) throw new Error(response.statusText)
        type Answer = { rows: TimetrackRows; cursor: string; empty: boolean; userId?: string; live?: boolean }
        let body = (await response.json()) as Answer
        /**
         * THE PAGE WAS OPENED FOR ONE ACCOUNT, AND ANOTHER ANSWERED: somebody
         * signed in as someone else in another tab since. Nothing of this page is
         * that account's — not its copy, not its queue — so none of it is laid
         * on top or sent, and the page starts again for whoever it is.
         */
        if (pageAccount && body.userId && body.userId !== pageAccount) {
          stopForAnotherAccount()
          return
        }
        cursor.current = body.cursor
        userId.current = body.userId ?? "self"
        // the change feed listens for this account, once it is known (D4)
        setAccount(body.userId ?? null)
        const { start, own } = startFor(body.userId ?? null)

        /**
         * A LIVE ANSWER LEAVES OUT WHAT WAS DELETED, AND THIS DEVICE MAY NOT HAVE HEARD.
         *
         * Every opening read the whole account, deleted entries and their tag links
         * included: 1.5 MB for 1,791 entries became 7.7 MB once about 7,000 had been
         * deleted, and a phone on a slow link said "Saved" after 37–45 s instead of 6
         * (heavy-history audit, Phase 8 of Plans/toggl-parity.md). The deleted part
         * matters only for a row this device holds: everything below takes a row
         * missing from the answer as one the account never had, keeps it and sends
         * it, which for an entry deleted elsewhere would bring it back. So a live
         * answer that lacks any row this device holds — shown, started from, or
         * queued — is put aside, and the whole account is read as before
         * (`liveAnswerCovers`, `anOpeningDoesNotDownloadWhatWasDeleted`). A server
         * from before this ignores `live` and answers whole, without saying `live`.
         */
        if (body.live && !body.empty) {
          const held = [
            stateToRows(latestState.current ?? state, userId.current),
            start ? stateToRows(start, userId.current) : null,
            pending.current,
          ]
          if (!liveAnswerCovers(body.rows, held)) {
            const whole = await read("/api/timetrack/sync")
            if (!whole.ok) throw new Error(whole.statusText)
            body = (await whole.json()) as Answer
            if (pageAccount && body.userId && body.userId !== pageAccount) {
              stopForAnotherAccount()
              return
            }
            cursor.current = body.cursor
          }
        }

        if (body.empty) {
          // nothing stored yet. Offer to upload what this browser holds rather
          // than doing it behind their back. `latestState` rather than the
          // captured `state`, because this can run again after a failure and
          // the workspace may have moved on since the first try.
          const held = latestState.current ?? state
          const localRows = stateToRows(held, userId.current)
          /**
           * THE OFFER IS NOT AN OFFER IF THE UPLOAD HAS ALREADY HAPPENED.
           *
           * This set the baseline to `null`, and `diffRows` reads `null` as "the
           * server has nothing, so everything is new". Setting the status a few
           * lines down then flips `syncActive`, which is in the change-watcher's
           * dependency array — so the watcher re-ran, queued the entire workspace
           * and flushed it 800ms later. Measured with no user action of any kind:
           * the banner still on screen reading "This browser has 2 time entries
           * that your account does not — Show / Upload all / Not now", and both
           * entries already on the server.
           *
           * Two things followed from it. Ticking one entry of three uploaded all
           * three, so the per-entry chooser and its "Select none" link were inert.
           * And "Not now" could not win: `declineImport` sets this baseline for
           * exactly this reason, but by then the rows were already up. Its comment
           * names the hazard — the fix it describes closed the next EDIT, and
           * missed the automatic status change that fires first.
           *
           * The banner is inline and not a modal, so there is no other gate. What
           * this browser holds is the baseline until the person says otherwise;
           * `acceptImport` and `uploadEverything` build their own change set from
           * `null`, so both still send everything they are asked to.
           */
          serverRows.current = localRows
          adopted.current = true
          if (held.entries.length > 0 || held.projects.length > 0) {
            setImportOffer({
              entries: held.entries.length,
              projects: held.projects.length,
              items: held.entries
                .slice()
                .sort((a, b) => b.start.localeCompare(a.start))
                .map((entry) => ({
                  id: entry.id,
                  description: entry.description,
                  project: held.projects.find((p) => p.id === entry.projectId)?.name ?? null,
                  day: entry.start.slice(0, 10),
                  seconds: entry.duration < 0 ? 0 : entry.duration,
                })),
            })
          } else {
            const everything = diffRows(null, localRows, serverNowIso())
            queueChanges(everything.changed, everything.tagSets)
            savePending()
            void flush()
          }
          savePending()
          claimed()
          setStatus("synced")
          noteCheck("landed")
          return
        }

        /**
         * Anything done between opening the page and the server answering must
         * survive. It used to be thrown away: press Start within the first two
         * seconds and the running timer simply vanished when the server's copy
         * arrived. Reproduced reliably before this existed.
         *
         * So the server's rows are the base, and whatever changed here since
         * the page opened is laid back on top — and queued for upload, because
         * the server has not heard about it either.
         */
        const startingRows = start ? stateToRows(start, userId.current) : null
        const latestRows = stateToRows(latestState.current ?? state, userId.current)
        const everythingSince = diffRows(startingRows, latestRows, serverNowIso())
        // only what this device edited itself; the rest was heard from a tab that has the account
        const sinceOpening = own
          ? {
              changed: onlyKeys(everythingSince.changed, own),
              tagSets: Object.fromEntries(
                Object.entries(everythingSince.tagSets).filter(([entryId]) => own.has(`timetrack_entries/${entryId}`)),
              ),
            }
          : everythingSince

        // the server's own copy of everything: the versions this device's writes will name
        basis.current = new Map()
        learn(body.rows)
        /**
         * THE SERVER WINS EVERY ROW IT KNOWS ABOUT. IT DOES NOT WIN ONE IT HAS
         * NEVER SEEN.
         *
         * `body.rows` is a FULL read — the whole account, tombstones included — so
         * a key missing from it was never stored. Taking it as the base and handing
         * the result to `replaceState` therefore DELETED anything this browser held
         * and the account did not, from the only copy that had it. Measured: a
         * browser with three entries, two projects, two tags, two tasks, a client
         * and a workspace named "Test WS", against an account holding one entry,
         * came back from a reload with one entry, no projects, no tags and a
         * workspace called "My Workspace".
         *
         * It needed no unusual sequence. An empty account shows the import offer;
         * make any edit before answering it — rename an entry, press Start — and
         * that one row goes up, `resolveWorkspaceId` invents a workspace to hang it
         * on, and the next reload is no longer a first-time account. "Not now"
         * reaches it by the same route, which makes its promise — "this browser's
         * time stays here until you ask again" — false at the next reload.
         *
         * `sinceOpening` was only ever the changes made since the page opened,
         * which is a much smaller set than "everything the server has not got".
         */
        /**
         * AND IT DOES NOT WIN A ROW THIS BROWSER HAS CHANGED AND NOT YET SENT.
         *
         * `pending` was read from `PENDING_KEY`, which every tab of this
         * browser shares, before the server was asked. A row in it is a change
         * the server has not heard about, so the server's copy of that row is
         * older by definition. Without this, a second tab opened while the
         * first still held an unsent stop (it waits out the upload debounce)
         * rebuilt itself from the account's copy — timer running — and handed
         * that to the first tab: a stopped timer counting again in both.
         * Found by the nightly WebKit lane, reproduced in both engines by
         * holding back one upload, and pinned by
         * tests/unit/timetrack/queuedStopSurvivesFirstContact.test.tsx.
         */
        /**
         * ...BUT ONLY THE PART OF IT THAT IS THIS BROWSER'S OWN CHANGE.
         *
         * Between two tabs the queue is newer than the server. On a phone that
         * slept through the PC's Stop it is OLDER: laying it on top whole put the
         * phone's `stopped_at: null` back and started the timer again, and an
         * entry the PC deleted came back the same way (sync defect #1). So the
         * queue — what was queued before this page opened, plus what changed
         * since — is rebased: each row keeps the fields this browser changed
         * since the copy it was based on, and takes everything else from the
         * server's current row. For two tabs the server has not moved, so that is
         * the whole queued row, as before. See `syncVersionService.rebase`.
         *
         * A change made since opening was based on what this browser held when
         * it opened, unless the row was already queued with a base of its own.
         */
        const queuedBases = basesFrom(startingRows, sinceOpening.changed, bases.current)
        const serverLinks = linksByEntry(body.rows)
        const rebased = rebase(
          mergeChangeSets(pending.current, sinceOpening.changed),
          queuedBases,
          { ...tagSets.current, ...sinceOpening.tagSets },
          body.rows,
          (entryId) => serverLinks.get(entryId) ?? [],
        )
        pending.current = rebased.send
        bases.current = rebased.bases
        tagSets.current = rebased.tagSets
        const notice = otherDeviceKept(rebased.overruled, entryNamesIn(body.rows, latestState.current))
        if (notice) pushToast(notice)

        const base = applyTagSets(
          mergeIncoming(
            mergeIncoming(body.rows, rowsUnknownToServer(body.rows, latestRows), new Set()),
            rebased.hold,
            new Set(),
          ),
          rebased.holdTags,
        )

        serverRows.current = body.rows
        const arrived = rowsToState(base, serverNowIso())
        const settled = reconcileRunningEntries(arrived)
        if (settled.stopped.length > 0) {
          pushToast(
            `Another device had a timer running too. The older one was stopped where this one started, so the same hour is not counted twice.`,
          )
          /**
           * AND THE STOP IS SENT.
           *
           * The result is handed over below with `awaitingState`, which makes it
           * the change-watcher's picture of the account — so a stop made here was
           * never queued, and the account kept both timers running: the other
           * device's for hours once it was shut (a bug audit, 2026-11-04). The
           * check after waking stopped doing that for this reason. Queued here,
           * on top of the server's copy just read, it goes with the rest.
           */
          const stops = diffRows(stateToRows(arrived, userId.current), stateToRows(settled.state, userId.current), serverNowIso())
          queueChanges(stops.changed, stops.tagSets)
        }
        const adoptedState = settled.state

        /**
         * IF THE SERVER HAS NOTHING YOU DO NOT ALREADY HAVE, DO NOT REDRAW.
         *
         * This used to replace the whole workspace unconditionally, which is the
         * common case done the expensive way: the usual outcome of opening the
         * tracker is that this device is already up to date. The replacement
         * swapped every object in the state, so every screen re-rendered and the
         * entry list was rebuilt from scratch — after first paint, so what you
         * were looking at flickered and settled a beat later. On a phone over
         * mobile data that beat is long enough to see, and it is the plainest
         * reading of "something weird with how it opens".
         *
         * Compared with `diffRows`, which is this slice's own definition of
         * whether two workspaces differ, rather than a new one invented here.
         * When there IS a difference the old path runs untouched: the server
         * wins, because that is the rule the rest of this file is built on.
         */
        const localRows = stateToRows(latestState.current ?? state, userId.current)
        const adoptedRows = stateToRows(adoptedState, userId.current)
        const nothingNew =
          diffRows(localRows, adoptedRows, serverNowIso()).count === 0

        if (nothingNew) {
          // The baseline is the round-tripped rows, not `body.rows`, for the same
          // reason the change-watcher below uses them: a mapping quirk must not
          // read as a local change on the very next tick.
          serverRows.current = adoptedRows
        } else {
          awaitingState.current = adoptedState
          replaceState(adoptedState)
        }
        adopted.current = true

        // the rebased queue, which may be smaller than what was read: a row the
        // server already has as this browser would send it is not sent again
        savePending()
        claimed()
        setStatus("synced")
        noteCheck("landed")
        void flush()
      } catch {
        /**
         * A SESSION THAT CANNOT SAY HELLO MUST KEEP TRYING.
         *
         * `ready` stops this effect running twice, and on failure nothing put
         * it back — so `userId` and `cursor` stayed unset, and with those unset
         * neither an upload nor a pull can even start. One flaky moment at open
         * left the tracker working locally and silently never syncing, with a
         * reload as the only way out. The badge says something is wrong; it
         * does not say it will stay wrong for ever.
         */
        if (unmounted.current) return
        setStatus(navigator.onLine ? "error" : "offline")
        noteCheck("failed")
        const delay = firstContactDelay.current
        firstContactDelay.current = Math.min(delay * 2, RETRY_MAX_MS)
        if (firstContactAt.current) clearTimeout(firstContactAt.current)
        firstContactAt.current = setTimeout(() => void firstContactRef.current?.(), delay)
      } finally {
        firstContactBusy.current = false
      }
    }

    firstContactRef.current = attempt
    void attempt()
  }, [state, replaceState, savePending, flush, learn, queueChanges, noteCheck, pushToast, pageAccount, stopForAnotherAccount])

  /**
   * A ROW PUT BACK LEAVES THE QUEUE — OR, IF ITS SEND IS IN THE AIR, GOES AGAIN AS IT IS NOW.
   *
   * Each change below is compared with the account's copy and MERGED into the
   * queue. An Undo puts a row back exactly as the account has it, so there was
   * nothing left to compare and the row already queued stayed: a swipe-delete
   * undone with no signal was sent when the signal came back, and the phone
   * showed the entry, said "Saved", while the account had it deleted. A Continue
   * undone sent its stop and its new entry; "Typo" renamed back to "Original"
   * sent "Typo" (offline audit 2026-11-05,
   * `anUndoWithNoSignalIsWhatTheAccountGets`).
   *
   * So a queued row this device now holds as it was before it was queued
   * (`isBackToBase`) is taken out. If that row is in the upload in the air, what
   * lands is no longer what the device shows: the row as it is now — or a
   * tombstone, for one that is gone — is queued behind it, and goes when the
   * upload answers, based on the version it wrote.
   *
   * AND BASED ON WHAT WAS SENT, IN CASE THE ANSWER NEVER COMES. The row put back
   * kept the base from before the send. When the send was saved and its answer
   * lost — a request that timed out after the server wrote it — the retry was
   * refused as stale, and the merge, finding this device's copy equal to that old
   * base, took the account's: the delete, or "Typo", came back (a code review,
   * 2026-11-05). Based on the row as sent, the put-back is this device's change
   * whichever happened; `sent` says the account may hold that row now, so a new
   * row taken back is no longer taken for one the account never had.
   *
   * Rows still being changed are left to the merge, and a row whose base was not
   * kept is left queued as before. Returns whether the queue changed.
   */
  const takeBackWhatWasPutBack = useCallback((rows: TimetrackRows, changed: Partial<TimetrackRows>): boolean => {
    const changing = keysIn(changed)
    const here = indexRows(rows)
    const tagsHere = linksByEntry(rows)
    const drop = new Set<string>()
    const again: Partial<TimetrackRows> = {}
    const againTags: TagSets = {}
    const againBases: Bases = {}
    for (const [key, queuedRow] of indexRows(pending.current)) {
      const record = bases.current[key]
      if (changing.has(key) || !record) continue
      const table = key.slice(0, key.indexOf("/")) as keyof TimetrackRows
      const id = key.slice(table.length + 1)
      const now = here.get(key)
      if (!isBackToBase(table, now, record, table === "timetrack_entries" ? (tagsHere.get(id) ?? []) : undefined)) continue
      const sent = sendingNow.current.rows.get(key)
      const resend = sent ? (now ?? (canTombstone(table) ? { ...queuedRow, deleted_at: serverNowIso() } : null)) : null
      if (!resend) {
        drop.add(key)
        continue
      }
      ;((again as Record<string, AnyRow[]>)[table] ??= []).push(resend)
      if (table === "timetrack_entries" && now && !now.deleted_at) againTags[id] = tagsHere.get(id) ?? []
      againBases[key] = {
        ...record,
        row: sent!,
        sent: true,
        ...(table === "timetrack_entries" ? { tags: sendingNow.current.tags[id] ?? record.tags } : {}),
      }
    }
    if (drop.size === 0 && countRows(again) === 0) return false
    const kept = new Set([...keysIn(pending.current)].filter((key) => !drop.has(key)))
    pending.current = mergeChangeSets(onlyKeys(pending.current, kept), again)
    tagSets.current = { ...tagSets.current, ...againTags }
    bases.current = { ...bases.current, ...againBases }
    return true
  }, [])

  // --- every local change becomes something to send -------------------------
  useEffect(() => {
    if (!state) return
    if (!userId.current) {
      /**
       * Not heard from the account in this opening, so there is nothing to diff
       * against and nothing is queued. The change is kept by keeping what this
       * opening started from (see `offlineBaseAtOpening`), once, with whose it is.
       */
      if (accountGone.current) return
      // the copy is somebody else's now: nothing of this page's is kept in it
      if (ownerChangedUnderneath(pageAccount)) {
        stopForAnotherAccount()
        return
      }
      if (!ready.current || !startingState.current || state === startingState.current) return
      /**
       * A CHANGE HEARD FROM ANOTHER TAB IS NOT THIS DEVICE'S EDIT. That tab has the
       * account, or will; laying its change over the account later as if made here
       * is how a slow tab's base carried yesterday's values over a newer edit (a
       * code review, 2026-11-04). Until this opening edits something itself, what
       * it started from moves with what it hears.
       */
      const before = seenBeforeContact.current ?? startingState.current
      seenBeforeContact.current = state
      if (fromAnotherTab?.(state)) {
        if (!ownEditSeen.current) startingState.current = state
        return
      }
      ownEditSeen.current = true
      // which rows this edit touched: the ones the base speaks for (any id maps both sides alike)
      const mapAs = pageAccount ?? "self"
      const touched = keysIn(diffRows(stateToRows(before, mapAs), stateToRows(state, mapAs), serverNowIso()).changed)
      for (const key of touched) ownRows.current.add(key)
      // whose it is is known only on a page that knows who is signed in; elsewhere nothing is kept
      const base = offlineBaseAtOpening.current ?? (pageAccount ? { owner: pageAccount, state: startingState.current } : null)
      if (!base) return
      if (!offlineBaseKept.current) {
        offlineBaseKept.current = true
        if (!keepOfflineBase(base)) {
          pushToast("This browser's storage is full: a change made before the account answered is kept only while this page stays open.", "error")
          return
        }
      }
      // a base kept before own rows were recorded speaks for everything since it, as it always did:
      // starting a list now would leave out the edits it already holds
      if (offlineBaseAtOpening.current && offlineBaseAtOpening.current.own === null) return
      noteOwnRows(ownRows.current)
      return
    }
    if (statusRef.current === "local-only" || accountGone.current) return

    /**
     * A BASE ANOTHER TAB KEPT IS NO LONGER NEEDED once a tab that has heard from
     * the account is running: that tab's edits reached this one as they were
     * made, and are queued here (just below, or already). Left behind, a base
     * outlived both tabs and spoke for a day-old copy the next time (a code
     * review, 2026-11-04).
     */
    const strayBase = readOfflineBase()
    if (strayBase && (!pageAccount || strayBase.owner === pageAccount)) forgetOfflineBase()

    /**
     * Nothing may be compared until the state we adopted has actually arrived —
     * BUT NOT WAITING FOR EVER IF IT NEVER DOES.
     *
     * `if (state !== awaitingState.current) return` stranded the uploader: once
     * the workspace moved past the state a pull had handed over, every later
     * change hit that line and returned, so nothing was ever queued again. The
     * badge said "Saved", the queue was empty, and no request was even
     * attempted. Caught by a smoke test that started a timer and then looked
     * for it on the server: 765 rows here, 764 there.
     *
     * At startup the window was narrow, which is why it survived there. Setting
     * it on every pull made it wide, and I did that this afternoon.
     *
     * So: take the baseline from the state we handed over — which is the point
     * of the mechanism — and then carry on. If the workspace has already moved,
     * the diff below queues what changed, which is exactly what should happen.
     */
    if (awaitingState.current) {
      const awaited = awaitingState.current
      awaitingState.current = null
      // round-tripped, so mapping quirks do not read as changes on the next tick
      serverRows.current = stateToRows(awaited, userId.current)
      if (state === awaited) return
    }

    const rows = stateToRows(state, userId.current)
    const { changed, count, tagSets: setsChanged } = diffRows(serverRows.current, rows, serverNowIso())
    if (takeBackWhatWasPutBack(rows, changed)) savePending()
    if (count === 0) return

    const guard = safeToSend(changed, serverRows.current, adopted.current)
    if (!guard.ok) {
      // Refusing loudly. A change set that empties the account is either a bug
      // here or a half-read response, and either way the answer is not to do it
      // and hope. Reloading re-reads the server and starts from the truth.
      setStatus("error")
      pushToast(
        `Not sending a change that would delete ${guard.deletes} of your saved items. Nothing has been lost — reload the page to resync.`,
        "error",
      )
      return
    }

    queueChanges(changed, setsChanged)
    savePending()

    const writtenAt = Date.now()
    for (const key of keysIn(changed)) localWrites.current.set(key, writtenAt)
    if (localWrites.current.size > 2_000) {
      // a bounded memory: anything older than a few minutes cannot still be
      // racing a request that is in flight now
      const cutoff = writtenAt - 5 * 60_000
      for (const [key, at] of localWrites.current) if (at < cutoff) localWrites.current.delete(key)
    }

    /**
     * QUEUE AND RETURN WHEN SENDING IS POINTLESS.
     *
     * Two cases, both measured in the product before this existed:
     *
     *   - a retry is already armed, so the backoff owns the next attempt.
     *     Without this, typing while offline fires a request per word and each
     *     failure re-arms the next one 800ms later, which is how the flat
     *     ~850ms cadence outlived a backoff that says 2s → 60s.
     *   - the session has ended. The 401 branch above stops the retry and says
     *     so; this stops the schedule from starting it again. 23 POSTs in 20
     *     seconds, every one refused, in a file whose comment says it stopped
     *     doing exactly that.
     *
     * The work is not lost either way: it is in `pending`, on disk, and goes up
     * on the next success, on `online`, or when the tab is looked at again.
     */
    if (retryAt.current !== null || statusRef.current === "signed-out") return

    const timer = setTimeout(() => void flush(), 800)
    return () => clearTimeout(timer)
  }, [state, syncActive, savePending, flush, queueChanges, takeBackWhatWasPutBack, pageAccount, stopForAnotherAccount, fromAnotherTab])

  // --- ask for other devices' changes ---------------------------------------
  const pull = useCallback(async () => {
    if (!userId.current || !cursor.current || accountGone.current) return
    /**
     * WHAT THIS ANSWER MAY NOT OVERWRITE, decided before it is asked for.
     *
     * Two sets, because one of them was not enough. `localWrites` covers rows
     * written after the request goes out. It does NOT cover a row written just
     * before it that is still only queued — because by the time the answer
     * arrives the queue has flushed and cleared, so neither `pending` nor the
     * timestamp protects it. That is the ordering the first version of this
     * guard missed, and it is the ordinary one:
     *
     *   press Stop → queued → pull goes out → queue flushes and clears →
     *   the pull answers with the copy from before the press.
     *
     * A pull is not quick here — `pullTimetrackRows` issues one read per table,
     * nineteen of them — so answering after an upload that started later is
     * normal rather than freakish.
     */
    const askedAt = Date.now()
    const queuedWhenAsked = keysIn(pending.current)
    const mine = ++pullSeq.current
    try {
      /**
       * A DEADLINE HERE TOO. THIS FILE'S OWN RULE APPLIED TO TWO OF FOUR
       * REQUESTS.
       *
       * `REQUEST_TIMEOUT_MS` exists because `fetch` has no deadline of its own
       * and "a connection that accepts and then says nothing — a captive portal,
       * a dead tunnel" never settles. The POST and first contact both carried
       * one; the pull and the signed-out recheck, which run on timers for as long
       * as the tab is open, did not. `pullSeq` means a hung pull cannot corrupt
       * anything, so what accumulates is requests that never finish, on the loop
       * that fires most often.
       */
      const abort = new AbortController()
      inFlight.current.add(abort)
      const deadline = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
      let response: Response
      try {
        response = await askServer(`/api/timetrack/sync?since=${encodeURIComponent(cursor.current)}`, {
          signal: abort.signal,
          cache: "no-store",
        })
      } finally {
        clearTimeout(deadline)
        inFlight.current.delete(abort)
      }
      if (response.status === 401) {
        setStatus("signed-out")
        noteCheck("unanswered")
        return
      }
      if (!response.ok) {
        // A FAILED CHECK IS NOT SILENT. This returned without a word, and the
        // badge went on saying "Saved" over whatever the other device had done.
        if (mine === pullSeq.current) noteCheck("failed")
        return
      }
      const body = (await response.json()) as { rows: TimetrackRows; cursor: string; userId?: string }
      // another account answered: this page's session ended and somebody else signed in.
      // Their rows are not shown here, and nothing of this page is sent to them.
      if (body.userId && userId.current && userId.current !== "self" && body.userId !== userId.current) {
        stopForAnotherAccountRef.current()
        return
      }
      // A newer request has gone out while this one was in the air. Its answer
      // covers everything this one would have said, and applying this one
      // afterwards would undo it.
      if (mine !== pullSeq.current) return
      // and the cursor only ever moves forward, so a late answer cannot rewind
      // what the next request will ask for
      if (!cursor.current || body.cursor > cursor.current) cursor.current = body.cursor
      // heard from the account; whatever is applied below lands in the same render
      noteCheck("landed")
      if (countRows(body.rows) === 0) return

      const dirty = keysIn(pending.current)
      for (const key of queuedWhenAsked) dirty.add(key)
      for (const [key, at] of localWrites.current) if (at >= askedAt) dirty.add(key)
      /**
       * AND ANYTHING THIS DEVICE HOLDS THAT THE SERVER HAS NOT ACKNOWLEDGED.
       *
       * The three sets above are all records of a change having been NOTICED —
       * queued, or timestamped by the change-watcher. The watcher runs after
       * React commits, so a change made in the same tick as this answer is in
       * none of them, and the answer overwrote it. Pressing Stop as a pull
       * landed lost the stop exactly that way.
       *
       * This is the rule the others were approximating: whatever differs right
       * now between what we hold and what we believe the server has is ours,
       * and an answer computed before it cannot speak for it.
       */
      let unsent: Partial<TimetrackRows> = {}
      let unsentTags: TagSets = {}
      if (latestState.current) {
        const diff = diffRows(serverRows.current, stateToRows(latestState.current, userId.current), serverNowIso())
        unsent = diff.changed
        unsentTags = diff.tagSets
        for (const key of keysIn(unsent)) dirty.add(key)
      }
      /**
       * AND ANY ROW OLDER THAN ONE THIS DEVICE ALREADY HEARD OF.
       *
       * Every write's answer says the version it produced, and a check reads
       * whatever was stored when it ran — which, for a check that went out before
       * that write landed, is the version before. The sets above catch most of
       * those; the version settles it: an older copy never replaces a newer one.
       */
      for (const [key, row] of indexRows(body.rows)) {
        const incoming = versionOf(row)
        const known = basis.current.get(key)
        if (incoming && known && olderThan(incoming, known)) dirty.add(key)
      }

      /**
       * KEEPING THE SERVER'S ROW OUT IS NOT THE SAME AS KEEPING YOURS IN.
       *
       * THE STOP THAT HAD TO BE PRESSED TWICE, third and last variant, and this
       * one needs nothing slow and nothing offline. Press Stop; 400ms later the
       * once-a-minute pull answers, still inside the 800ms upload debounce; the
       * timer starts running again about twenty seconds later and the queue reads
       * empty. Reproduced with fake timers against this hook and the real
       * `stopTimer`, with an answer carrying only rows both sides already agree
       * about.
       *
       * The `dirty` set above stops the SERVER's copy of a locally-changed row
       * from entering `merged`. But `merged` is seeded from `serverRows` — "the
       * rows we believe the server has" — and an edit that has not been sent
       * lives in `state` and in `pending`, never in `serverRows`. So skipping the
       * incoming row leaves the PRE-EDIT row in place, `rowsToState` rebuilds the
       * workspace as it was before the stop, and the `replaceState` below writes
       * that over what the person is looking at.
       *
       * Then it was recorded as the truth: `awaitingState` made the change-watcher
       * set the baseline to the state it had just adopted, so the stop was gone
       * from the queue as well as from the screen. `pending` read 0.
       *
       * The pattern was already in this file, 200 lines up: adoption lays the
       * local unsent diff back on top with `mergeIncoming(body.rows,
       * sinceOpening.changed, new Set())`. `unsent` is that same diff, and it was
       * being computed here and used only as a set of keys.
       *
       * TWO BASELINES, AND THAT IS THE POINT. What we believe the server has is
       * the merge WITHOUT our unsent rows; what the person sees is the merge WITH
       * them. Recording the second as the first is how a change becomes invisible
       * rather than late — the change-watcher then finds nothing to send, for ever.
       */
      let merged = mergeIncoming(serverRows.current ?? emptyRows(), body.rows, dirty)
      /**
       * THE ANSWER'S LINKS ARE THE ACCOUNT'S WHOLE LINK TABLE, so a link missing
       * from them is a link that is gone — a tag the other device took off. Merging
       * only ever added links, so a removal never arrived (sync defect #3). Entries
       * this device is still changing keep what it believes; their tags travel as
       * a set of their own.
       */
      if (Array.isArray(body.rows.timetrack_entry_tags)) {
        const keep = new Set<string>(Object.keys(tagSets.current))
        for (const key of dirty) {
          if (key.startsWith("timetrack_entries/")) keep.add(key.slice("timetrack_entries/".length))
          else if (key.startsWith("timetrack_entry_tags/")) keep.add(key.slice("timetrack_entry_tags/".length).split(":")[0])
        }
        merged = withServerTagLinks(merged, body.rows.timetrack_entry_tags, keep)
      }
      // what was taken from the answer is the server's copy this device is now based on
      learn(body.rows, dirty)
      // round-tripped, for the reason the baseline below is: a row as the server
      // stores it carries columns the mapper never emits, and those must not read
      // as local changes on the next tick
      serverRows.current = stateToRows(rowsToState(merged, serverNowIso()), userId.current)
      const withLocal = applyTagSets(mergeIncoming(merged, unsent, new Set()), unsentTags)
      const settled = reconcileRunningEntries(rowsToState(withLocal, serverNowIso()))

      /**
       * DO NOT REDRAW FOR AN ECHO OF YOUR OWN WRITES.
       *
       * A pull asks what changed since the cursor, and after this device
       * uploads anything, the answer contains that very row — so this used to
       * replace the whole workspace every time, swapping every object and
       * rebuilding the entry list for no change at all. Adoption already
       * refuses to do that; this is the same check, using the same definition
       * of "differs" rather than a new one.
       *
       * It is not only waste: a full redraw at the moment of a tap is a tap
       * that lands on a node that no longer exists.
       */
      const held = latestState.current
      const nothingNew =
        held !== null &&
        diffRows(stateToRows(held, userId.current), stateToRows(settled.state, userId.current), serverNowIso())
          .count === 0

      /**
       * THE BASELINE IS THE ROUND TRIP, NOT WHAT THE SERVER SENT.
       *
       * Adoption is careful about this and says why: a row as the server stores
       * it carries columns the mapper never emits — `created_at` on the tag
       * links, `running_device_id` on an entry — so keeping the server's shape
       * as "what we believe the server has" makes every one of those read as a
       * local change on the very next tick. The effects were real: every tag
       * link in the account re-uploaded about once a minute, another device's
       * running timer rewritten to this device and back for as long as it ran,
       * and orphaned project-rate history tombstoned by a diff that could not
       * see it.
       *
       * `pull` was setting the raw rows. It now does what adoption does: hand
       * the state over and let the change-watcher establish the baseline from
       * the state it actually adopted.
       */
      if (nothingNew && settled.stopped.length === 0) {
        // the baseline is already the round-tripped server belief, set above
        return
      }

      if (settled.stopped.length > 0) {
        pushToast("Another device had a timer running too. The older one was stopped where this one started.")
      }

      /**
       * NO `awaitingState` HERE, AND THE BASELINE IS WHY.
       *
       * It existed to stop the change-watcher re-uploading the very rows the
       * server had just sent, by setting the baseline to the state that was
       * adopted. That is correct only when the adopted state is entirely the
       * server's — and it is not: `settled.state` now carries this device's
       * unsent edits, and `reconcileRunningEntries` may have stopped a timer that
       * another device left running, which is a change of ours too.
       *
       * The baseline above already holds the server's version and nothing else,
       * so the watcher's next diff is exactly "what is ours and not yet sent" —
       * which is the thing that should be queued. The echo of the server's own
       * rows is not in that diff, so nothing is re-uploaded either way.
       *
       * That also closes a quieter one: a reconciliation stop was previously
       * written into the baseline and so was never uploaded at all, leaving the
       * other device's timer running on the server for ever.
       */
      replaceState(settled.state)
    } catch {
      // Not worth a toast — the next check will run — but worth the badge: a
      // phone that cannot reach the account must not look as if it had (D6).
      if (mine === pullSeq.current) noteCheck("failed")
    }
  }, [replaceState, learn, noteCheck])

  /**
   * Signing in again usually happens in this tab, which reloads and starts over.
   * But it can happen in another tab, and then this one would sit on "signed
   * out" forever with work queued behind it. So while signed out, quietly ask
   * every time the tab is looked at whether the session is back.
   */
  useEffect(() => {
    /**
     * `local-only` needs this as much as `signed-out` does, and used to have no
     * way out at all: it is set when the very first request is refused, which
     * means `userId` and `cursor` were never learned, so neither an upload nor
     * a pull can start. Sign in in another tab and this one stayed local for
     * the life of the page, silently.
     *
     * The two recover differently. A signed-out session already knows who it
     * is, so it flushes. A local-only one knows nothing yet, so it has to go
     * back and say hello properly.
     */
    const localOnly = statusRef.current === "local-only"
    if (!signedOut && !localOnly) return
    const recheck = async () => {
      if (document.visibilityState !== "visible") return
      try {
        // a deadline, for the reason given at the pull: this runs on a timer for
        // as long as the tab is open, and a request that never settles never frees
        const abort = new AbortController()
        inFlight.current.add(abort)
        const deadline = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
        let response: Response
        try {
          response = await askServer(
            "/api/timetrack/sync?since=" + encodeURIComponent(cursor.current ?? serverNowIso()),
            { signal: abort.signal, cache: "no-store" },
          )
        } finally {
          clearTimeout(deadline)
          inFlight.current.delete(abort)
        }
        if (response.status === 401 || accountGone.current) return
        if (localOnly) {
          firstContactDelay.current = RETRY_START_MS
          void firstContactRef.current?.()
          return
        }
        /**
         * SIGNED IN AGAIN — BUT AS WHOM? This flushed for whoever answered, so the
         * moment somebody else signed in on this browser, the previous person's
         * unsent entry went into their account. Only the same account gets it.
         */
        const answer = (await response.json().catch(() => ({}))) as { userId?: string }
        if (answer.userId && userId.current && userId.current !== "self" && answer.userId !== userId.current) {
          stopForAnotherAccountRef.current()
          return
        }
        setStatus("saving")
        void flush()
      } catch {
        // offline as well as signed out: nothing to do but wait for the next tick
      }
    }
    // A NAMED handler, because `removeEventListener` with a fresh arrow removes
    // nothing — this used to add one listener per run and never take one away.
    const onVisible = () => void recheck()
    document.addEventListener("visibilitychange", onVisible)
    const timer = setInterval(() => void recheck(), 15_000)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [signedOut, status, flush])

  /**
   * THE 60-SECOND PULL HAD TWO REASONS TO NEVER FIRE, AND ONLY ONE WAS `status`.
   *
   * `pull` is rebuilt whenever `replaceState` is — and `replaceState` comes
   * from a `useMemo` in `useTimetrack` whose dependencies include `state`. So
   * the interval below was torn down and recreated on every committed change,
   * and never reached sixty seconds while anybody was working. Measured in the
   * product: **1 pull in 75 seconds sitting still, 0 pulls in 80 seconds with
   * one real change every 5 seconds** — which is to say another device's
   * changes stopped arriving exactly when they mattered.
   *
   * The ref is the pattern `flushRef` above already uses: the effect depends on
   * whether syncing is on at all, and reads the current function when it fires.
   */
  const pullRef = useRef(pull)
  pullRef.current = pull

  /**
   * ONE CHECK: ask the account what changed. Before the first read has landed
   * that means the first read itself, now — coming back online used to send the
   * queue (which needs the first read, so sent nothing) and leave the first read
   * waiting out a backoff grown to a minute.
   */
  const checkAccount = useCallback(() => {
    if (unmounted.current || accountGone.current) return
    lastAsked.current = Date.now()
    if (userId.current && cursor.current) {
      void pullRef.current()
      return
    }
    if (statusRef.current === "local-only") {
      // nothing to compare with until somebody signs in; see the recheck above
      noteCheck("unanswered")
      return
    }
    // the workspace has not loaded yet: first contact starts by itself when it does
    if (!ready.current || !firstContactRef.current) return
    if (firstContactAt.current) clearTimeout(firstContactAt.current)
    firstContactAt.current = null
    firstContactDelay.current = RETRY_START_MS
    void firstContactRef.current()
  }, [noteCheck])
  const checkRef = useRef(checkAccount)
  checkRef.current = checkAccount

  /**
   * Coming back is not a moment to wait out a backoff: the queue may be
   * sitting on a sixty-second timer from the last failure, and the person is
   * looking at the screen now.
   */
  const resume = useCallback(() => {
    clearRetry()
    retryDelay.current = RETRY_START_MS
    void flushRef.current?.()
  }, [clearRetry])
  const resumeRef = useRef(resume)
  resumeRef.current = resume

  /** On the way out: what is queued goes now, with `keepalive` (D3) */
  const sendOnLeave = useCallback(() => {
    if (!userId.current || accountGone.current) return
    if (statusRef.current === "local-only" || statusRef.current === "signed-out") return
    if (countRows(pending.current) === 0) return
    clearRetry()
    void flushRef.current?.({ keepalive: true })
  }, [clearRetry])
  const sendOnLeaveRef = useRef<(() => void) | null>(sendOnLeave)
  sendOnLeaveRef.current = sendOnLeave

  const isChecking = useCallback(() => checkingRef.current, [])

  // Log Out asks this instance to send before anything is thrown away
  useEffect(() => {
    const send = () => {
      if (statusRef.current !== "local-only") beginChecking()
      checkRef.current()
      resumeRef.current()
    }
    liveSenders.add(send)
    return () => {
      liveSenders.delete(send)
    }
  }, [beginChecking])

  /** The badge, tapped: check now, and send whatever is waiting (D6) */
  const checkNow = useCallback(() => {
    if (statusRef.current !== "local-only") beginChecking()
    checkRef.current()
    resumeRef.current()
  }, [beginChecking])

  // --- the minute's check, the fallback when no change ping arrives ----------
  useEffect(() => {
    if (!syncActive) return
    const timer = setInterval(() => checkRef.current(), PULL_EVERY_MS)
    return () => clearInterval(timer)
  }, [syncActive])

  /**
   * --- the page's comings and goings --------------------------------------
   *
   * WAKING is the page becoming visible after it was hidden — the phone taken
   * out of the pocket, the tab switched back to — or coming back from the
   * browser's back-forward cache. Its copy may be hours old, so it says
   * "Checking…" and holds Start and Stop until it has heard (D2). Visible again
   * without having been hidden checks too, as it always did, without the hold.
   *
   * LEAVING is the page being hidden or closed: what is queued goes now (D3).
   *
   * `online` and `focus` check as well (D4); `focus` comes with
   * `visibilitychange` on a tab switch, so it asks only if nothing else just did.
   */
  useEffect(() => {
    let hidden = document.visibilityState === "hidden"
    const wake = () => {
      if (statusRef.current !== "local-only" && statusRef.current !== "signed-out") beginChecking()
      checkRef.current()
      resumeRef.current()
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hidden = true
        sendOnLeaveRef.current?.()
        return
      }
      if (document.visibilityState !== "visible") return
      if (hidden) {
        hidden = false
        wake()
        return
      }
      checkRef.current()
      resumeRef.current()
    }
    const onPageHide = () => sendOnLeaveRef.current?.()
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) wake()
    }
    const onOnline = () => {
      checkRef.current()
      resumeRef.current()
    }
    const onFocus = () => {
      if (Date.now() - lastAsked.current < FOCUS_CHECK_GAP_MS) return
      checkRef.current()
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("online", onOnline)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("focus", onFocus)
    }
  }, [beginChecking])

  /**
   * --- the other device's changes, within seconds (D4) ----------------------
   *
   * While the tracker is open, a ping from the account's change feed means
   * "check now". A burst of them — a split, a bulk edit — is one check, a
   * moment after the last.
   */
  useEffect(() => {
    if (!account) return
    let settle: ReturnType<typeof setTimeout> | null = null
    const stop = listenForChanges(account, (payload) => {
      /**
       * NOT FOR THE ECHO OF THIS DEVICE'S OWN WRITE. Every upload comes back as a
       * ping, and a full check per save is twenty reads for nothing. A row at a
       * version this device already holds is that echo; anything else checks.
       */
      const row = (payload as { new?: Record<string, unknown> } | null)?.new
      if (row && typeof row.id === "string" && typeof row.updated_at === "string") {
        const known = basis.current.get(`timetrack_entries/${row.id}`)
        if (known && Date.parse(known) === Date.parse(row.updated_at)) return
      }
      if (settle) clearTimeout(settle)
      settle = setTimeout(() => {
        settle = null
        checkRef.current()
      }, PING_SETTLE_MS)
    })
    return () => {
      if (settle) clearTimeout(settle)
      stop()
    }
  }, [account])

  /**
   * Upload what this browser holds. `only` narrows it to chosen entries — the
   * projects, tags and settings they depend on go with them, because an entry
   * that arrives without its project is not the entry the user had.
   */
  const acceptImport = useCallback(
    (only?: string[]) => {
      if (!state || !userId.current) return
      const chosen =
        only && only.length < state.entries.length
          ? { ...state, entries: state.entries.filter((entry) => only.includes(entry.id)) }
          : state
      const rows = stateToRows(chosen, userId.current)
      const everything = diffRows(null, rows, serverNowIso())
      queueChanges(everything.changed, everything.tagSets)
      savePending()
      setImportOffer(null)
      const count = chosen.entries.length
      pushToast(`Uploading ${count} ${count === 1 ? "entry" : "entries"} to your account…`)
      void flush()
    },
    [state, savePending, flush, pushToast, queueChanges],
  )

  /**
   * Send this browser's whole workspace up, whatever the server already has.
   * The way back from "Not now", and the repair for a device that has drifted.
   */
  const uploadEverything = useCallback(() => {
    if (!state || !userId.current) return
    const rows = stateToRows(state, userId.current)
    const everything = diffRows(null, rows, serverNowIso())
    queueChanges(everything.changed, everything.tagSets)
    savePending()
    pushToast("Uploading this browser's copy to your account…")
    void flush()
  }, [state, savePending, flush, pushToast, queueChanges])

  const declineImport = useCallback(() => {
    /**
     * "LEFT ALONE" HAS TO MEAN LEFT ALONE.
     *
     * Declining only cleared the offer. The baseline stayed `null`, which
     * `diffRows` reads as "the server has nothing, so everything is new" — so
     * the very next edit queued and uploaded the entire workspace, which is
     * precisely what the person had just declined. It also left `safeToSend`'s
     * mass-delete guard with nothing to compare against.
     *
     * Treating what is here as the baseline keeps the promise: this copy stays
     * put, and only what changes from now on goes up.
     */
    if (latestState.current && userId.current) {
      serverRows.current = stateToRows(latestState.current, userId.current)
    }
    setImportOffer(null)
    pushToast("Left alone. This browser's time stays here until you ask again.")
  }, [pushToast])

  return {
    status,
    pendingCount,
    /** what this device knows about the account right now (D2, D6) */
    check,
    /** check the account now, and send what is waiting: the badge's tap */
    checkNow,
    /** whether Start and Stop should wait, as of this moment rather than the last render (D2) */
    isChecking,
    importOffer,
    acceptImport,
    declineImport,
    uploadEverything,
    syncNow: flush,
    setState,
  }
}

