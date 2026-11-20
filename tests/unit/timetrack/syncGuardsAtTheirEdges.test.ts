/**
 * THE SYNC GUARDS AT THEIR EDGES. What stops a half-arrived answer from deleting
 * an account, how a long queue is cut into sends, and how tag links and tag sets
 * are laid together. Asserted on what is refused, sent or kept, at the exact
 * count where each rule changes its answer.
 */
import { describe, expect, test } from "vitest"

import { emptyRows } from "@/src/db/timetrackTypes"
import {
  applyTagSets,
  countRows,
  liveAnswerCovers,
  repairPending,
  safeToSend,
  sameTagSet,
  splitIntoBatches,
  stableStringify,
  withServerTagLinks,
} from "@/src/timetrack/syncService"

const GONE = "2026-09-03T12:00:00.000Z"
const entry = (id: string, extra: Record<string, unknown> = {}) => ({ id, user_id: "u1", deleted_at: null as string | null, updated_at: "v", ...extra })
const workspace = (id: string) => ({ id, user_id: "u1", deleted_at: null as string | null, updated_at: "v", name: "W" })
const rows = (over: Record<string, unknown>) => ({ ...emptyRows(), ...over }) as never as ReturnType<typeof emptyRows>
const server = (n: number, workspaces = ["w1"]) => rows({ timetrack_workspaces: workspaces.map(workspace), timetrack_entries: Array.from({ length: n }, (_, i) => entry(`e${i}`)) })
const deleting = (n: number, workspaces: string[] = []): ReturnType<typeof emptyRows> => ({
  timetrack_entries: Array.from({ length: n }, (_, i) => entry(`e${i}`, { deleted_at: GONE })),
  ...(workspaces.length ? { timetrack_workspaces: workspaces.map(workspace) } : {}),
}) as never

describe("what the sync refuses to send, and how it cuts what it sends", () => {
  test("a mass delete swapping the workspace is refused at its edges, a long queue is cut whole, a settings row is sent clean", () => {
    { // a mass delete that also swaps the workspace is refused at exactly three live rows and when it deletes them all
      const swap = ["brand-new"]
      expect(safeToSend(deleting(3, swap), server(3), true)).toEqual({ ok: false, deletes: 3 })
      expect(safeToSend(deleting(2, swap), server(2), true)).toEqual({ ok: true })
      expect(safeToSend(deleting(2, swap), server(3), true)).toEqual({ ok: true })
      expect(safeToSend(deleting(4, swap), server(3), true)).toEqual({ ok: false, deletes: 4 })
      expect(safeToSend(deleting(3), server(3), true)).toEqual({ ok: true })
      expect(safeToSend(deleting(3, ["w1"]), server(3), true)).toEqual({ ok: true })
      expect(safeToSend(deleting(3, ["w1", "brand-new"]), server(3), true)).toEqual({ ok: false, deletes: 3 })
      expect(safeToSend({ ...deleting(3), timetrack_workspaces: [{ ...workspace("brand-new"), deleted_at: GONE }] } as never, server(3), true).ok).toBe(true)
      expect(safeToSend(deleting(3, swap), null, true)).toEqual({ ok: true })
      expect(safeToSend(deleting(3, swap), server(0, []), true)).toEqual({ ok: true })
      expect(safeToSend(deleting(1), server(3), false)).toEqual({ ok: false, deletes: 1 })
      expect(safeToSend({}, server(3), false)).toEqual({ ok: true })
      const tombstoned = rows({ timetrack_workspaces: [workspace("w1")], timetrack_entries: [entry("a"), entry("b", { deleted_at: GONE }), entry("c", { deleted_at: GONE }), entry("d", { deleted_at: GONE })] })
      expect(safeToSend(deleting(3, swap), tombstoned, true)).toEqual({ ok: true })
      const links = rows({ timetrack_workspaces: [workspace("w1")], timetrack_entries: [entry("a"), entry("b")], timetrack_entry_tags: [{ entry_id: "a", tag_id: "t" }] })
      expect(safeToSend(deleting(3, swap), links, true)).toEqual({ ok: true })
    }
    { // a long queue is cut into sends of at most the limit, whole when it fits, in table order and losing no row
      const many = { timetrack_entries: Array.from({ length: 5 }, (_, i) => entry(`e${i}`)) } as never
      expect(splitIntoBatches(many, 5)).toEqual([many])
      expect(splitIntoBatches(many, 6)).toEqual([many])
      const cut = splitIntoBatches(many, 2)
      expect(cut.map(countRows)).toEqual([2, 2, 1])
      expect(cut.flatMap((b) => (b.timetrack_entries ?? []).map((r) => r.id))).toEqual(["e0", "e1", "e2", "e3", "e4"])
      const mixed = splitIntoBatches({ timetrack_workspaces: [workspace("w1")], timetrack_entries: [entry("a"), entry("b"), entry("c")] } as never, 2)
      expect(mixed.map(countRows)).toEqual([1, 2, 1])
      expect(mixed[0].timetrack_workspaces).toHaveLength(1)
      expect(mixed[1].timetrack_entries?.map((r) => r.id)).toEqual(["a", "b"])
      expect(mixed[2].timetrack_entries?.map((r) => r.id)).toEqual(["c"])
      expect(splitIntoBatches({} as never, 2)).toEqual([{}])
      expect(splitIntoBatches({ timetrack_entries: [entry("a"), entry("b"), entry("c")] } as never, 1).map(countRows)).toEqual([1, 1, 1])
    }
    { // a settings row is sent without its bookkeeping, and a deleted one is not sent at all
      const settings = { user_id: "u1", updated_at: "v", prefs: { a: 1 }, created_at: "c", deleted_at: null }
      expect(repairPending({ timetrack_settings: [settings, { ...settings, user_id: "u2", deleted_at: GONE }] } as never).timetrack_settings).toEqual([{ user_id: "u1", updated_at: "v", prefs: { a: 1 } }])
      const untouched = { timetrack_entries: [entry("a")] } as never
      expect(repairPending(untouched)).toBe(untouched)
      const empty = { timetrack_settings: [] } as never
      expect(repairPending(empty)).toBe(empty)
    }
  })


})

describe("tags and equality", () => {
  test("tag sets and server links lay together, and values compare by content", () => {
    { // a tag set replaces an entry's links, filed under the entry's owner, falling back to its old links' owner
      const base = rows({ timetrack_entries: [entry("a", { user_id: "u9" }), entry("b", { user_id: "u1" })], timetrack_entry_tags: [{ entry_id: "a", tag_id: "old", user_id: "u9" }, { entry_id: "b", tag_id: "keep", user_id: "u1" }, { entry_id: "ghost", tag_id: "x", user_id: "u7" }] })
      const out = applyTagSets(base, { a: ["t1", "t2"], ghost: ["t3"], nobody: ["t4"] })
      expect(out.timetrack_entry_tags).toEqual([
        { entry_id: "b", tag_id: "keep", user_id: "u1" },
        { entry_id: "a", tag_id: "t1", user_id: "u9" },
        { entry_id: "a", tag_id: "t2", user_id: "u9" },
        { entry_id: "ghost", tag_id: "t3", user_id: "u7" },
        { entry_id: "nobody", tag_id: "t4", user_id: "" },
      ])
      expect(applyTagSets(base, {})).toBe(base)
      expect(applyTagSets(base, { a: [] }).timetrack_entry_tags.map((l) => l.entry_id)).toEqual(["b", "ghost"])
    }
    { // the server's links are taken for entries we hold nothing waiting for, ours for the rest, each link once
      const mine = rows({ timetrack_entry_tags: [{ entry_id: "a", tag_id: "t1" }, { entry_id: "a", tag_id: "t1" }, { entry_id: "b", tag_id: "t9" }] })
      const theirs = [{ entry_id: "a", tag_id: "t2" }, { entry_id: "b", tag_id: "t3" }, { entry_id: "b", tag_id: "t3" }, { entry_id: "c", tag_id: "t4" }] as never
      const out = withServerTagLinks(mine, theirs, new Set(["a"]))
      expect(out.timetrack_entry_tags).toEqual([{ entry_id: "a", tag_id: "t1" }, { entry_id: "b", tag_id: "t3" }, { entry_id: "c", tag_id: "t4" }])
      expect(withServerTagLinks(mine, [] as never, new Set()).timetrack_entry_tags).toEqual([])
    }
    { // tag sets and values compare by content, not order; a quarter of the account the answer lacks is not covered
      expect(sameTagSet(["a", "b"], ["b", "a"])).toBe(true)
      expect(sameTagSet(["a"], ["a", "b"])).toBe(false)
      expect(sameTagSet(["a", "b"], ["a", "c"])).toBe(false)
      expect(sameTagSet([], [])).toBe(true)
      const a = ["b", "a"]
      sameTagSet(a, ["a", "b"])
      expect(a).toEqual(["b", "a"])
      expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }))
      expect(stableStringify({ a: [1, 2] })).not.toBe(stableStringify({ a: [2, 1] }))
      expect(stableStringify([1, "x", null])).toBe('[1,"x",null]')
      expect(stableStringify({ b: 1, a: 2, "": 0 })).toBe('{"":0,"a":2,"b":1}')
      expect(stableStringify(undefined)).toBe("null")
      expect(stableStringify(null)).toBe("null")
      expect(stableStringify("é")).toBe('"é"')

      const answer = rows({ timetrack_entries: [entry("a")] })
      expect(liveAnswerCovers(answer, [{ timetrack_entries: [entry("a")] } as never, null])).toBe(true)
      expect(liveAnswerCovers(answer, [{ timetrack_entries: [entry("a"), entry("b")] } as never])).toBe(false)
      expect(liveAnswerCovers(answer, [{ timetrack_settings: [{ user_id: "other" }] } as never, { timetrack_entry_tags: [{ entry_id: "z", tag_id: "z" }] } as never])).toBe(true)
    }
  })


})
