/**
 * THE ONE WAY A BADGE IS EVER AWARDED.
 *
 * `reconcileUserProgress` is the only writer of badges and counters, so what is
 * checked here is the wiring rather than the arithmetic (which
 * `achievementsService.test.ts` covers against rows):
 *
 *   - a badge already held is not re-awarded, and its original date survives
 *   - only badges earned INSIDE the session being closed are stamped with it,
 *     so a January badge does not appear on today's session card
 *   - counters are written as a whole value, never incremented
 *   - a write that lands mid-recompute is noticed and settled, which is the
 *     double-tap that lost an approach and cost the reported badge
 *
 * The repo is faked here on purpose: these are decisions the service makes, and
 * a real database would only make the failure slower to read.
 */

import { describe, test, expect, vi, beforeEach } from "vitest"
import type { ApproachRow, MilestoneSourceRows, SessionRow } from "@/src/tracking/types"

const state = {
  rows: { approaches: [], sessions: [], fieldReports: [], reviews: [] } as MilestoneSourceRows,
  /** Badges the user already holds, by type. */
  held: new Set<string>(),
  inserted: [] as Array<{ milestone_type: string; achieved_at: string; session_id: string | null }>,
  statsWrites: [] as Array<Record<string, unknown>>,
  /** Rows appear between the read and the re-count, imitating a racing write. */
  onRead: null as null | (() => void),
  onCount: null as null | (() => void),
  reads: 0,
  counts: 0,
}

vi.mock("@/src/db/trackingRepo", () => ({
  countApproaches: vi.fn(async () => {
    state.counts += 1
    state.onCount?.()
    return state.rows.approaches.length
  }),
  getMilestoneSourceRows: vi.fn(async () => {
    state.reads += 1
    state.onRead?.()
    return {
      approaches: [...state.rows.approaches],
      sessions: [...state.rows.sessions],
      fieldReports: [...state.rows.fieldReports],
      reviews: [...state.rows.reviews],
    }
  }),
  insertMilestones: vi.fn(
    async (
      _userId: string,
      milestones: Array<{ milestone_type: string; achieved_at: string; session_id: string | null }>
    ) => {
      const fresh = milestones.filter((m) => !state.held.has(m.milestone_type))
      fresh.forEach((m) => state.held.add(m.milestone_type))
      state.inserted.push(...fresh)
      return fresh.map((m, i) => ({ id: `m${i}`, user_id: _userId, value: null, created_at: m.achieved_at, ...m }))
    }
  ),
  replaceUserTrackingStats: vi.fn(async (_userId: string, stats: Record<string, unknown>) => {
    state.statsWrites.push(stats)
  }),
}))

vi.mock("@/src/db/settingsRepo", () => ({
  getUserTimezone: vi.fn(async () => "Europe/Copenhagen"),
}))

const { reconcileUserProgress } = await import("@/src/tracking/achievementsSyncService")

let seq = 0
function approach(timestamp: string, over: Partial<ApproachRow> = {}): ApproachRow {
  seq += 1
  return {
    id: `a${seq}`,
    user_id: "u1",
    session_id: null,
    timestamp,
    outcome: null,
    tags: null,
    mood: null,
    latitude: null,
    longitude: null,
    note: null,
    voice_note_url: null,
    created_at: timestamp,
    set_type: null,
    quality: null,
    ...over,
  } as ApproachRow
}

function session(id: string, startedAt: string, endedAt: string | null): SessionRow {
  return {
    id,
    user_id: "u1",
    started_at: startedAt,
    ended_at: endedAt,
    goal: null,
    goal_met: false,
    total_approaches: 0,
    duration_minutes: null,
    primary_location: null,
    location_data: null,
    is_active: endedAt === null,
    created_at: startedAt,
    updated_at: startedAt,
    session_focus: null,
    technique_focus: null,
    if_then_plan: null,
    custom_intention: null,
    pre_session_mood: null,
    with_wingman: false,
    wingman_name: null,
    end_reason: endedAt ? "completed" : null,
  } as SessionRow
}

/** Five approaches a minute apart on 28 January 2026, ending at 10:13:03. */
function fiveApproaches(): ApproachRow[] {
  return [
    approach("2026-01-28T10:10:34.000Z"),
    approach("2026-01-28T10:10:36.000Z"),
    approach("2026-01-28T10:11:11.000Z"),
    approach("2026-01-28T10:11:32.000Z"),
    approach("2026-01-28T10:13:03.000Z"),
  ]
}

beforeEach(() => {
  state.rows = { approaches: [], sessions: [], fieldReports: [], reviews: [] }
  state.held = new Set()
  state.inserted = []
  state.statsWrites = []
  state.onRead = null
  state.onCount = null
  state.reads = 0
  state.counts = 0
  seq = 0
})

describe("reconcileUserProgress", () => {
  test("awards the badges the rows earn, dated to when they were earned", async () => {
    // Arrange
    state.rows.approaches = fiveApproaches()

    // Act
    await reconcileUserProgress("u1")

    // Assert
    const gettingStarted = state.inserted.find((m) => m.milestone_type === "5_approaches")
    expect(gettingStarted?.achieved_at).toBe("2026-01-28T10:13:03.000Z")
    expect(state.inserted.map((m) => m.milestone_type)).toContain("first_approach")
  })

  test("running it again awards nothing and changes no date", async () => {
    // Arrange
    state.rows.approaches = fiveApproaches()
    await reconcileUserProgress("u1")
    const firstRun = [...state.inserted]
    state.inserted = []

    // Act
    const second = await reconcileUserProgress("u1")

    // Assert
    expect(second).toEqual([])
    expect(state.inserted).toEqual([])
    expect(firstRun.length).toBeGreaterThan(0)
  })

  test("a badge earned before a session is not stamped onto it", async () => {
    // Arrange: the approaches were in January; the only session is today's.
    state.rows.approaches = fiveApproaches()
    state.rows.sessions = [session("today", "2026-08-27T10:00:00.000Z", "2026-08-27T12:00:00.000Z")]

    // Act
    await reconcileUserProgress("u1")

    // Assert: a January badge on today's session card would be a lie. The
    // session's own badge (first_session, earned when it ended) does belong to it.
    const january = state.inserted.filter((m) => m.achieved_at.startsWith("2026-01"))
    expect(january.length).toBeGreaterThan(0)
    expect(january.every((m) => m.session_id === null)).toBe(true)
    expect(state.inserted.find((m) => m.milestone_type === "first_session")?.session_id).toBe("today")
  })

  test("a badge earned inside a session is stamped onto it", async () => {
    // Arrange
    state.rows.sessions = [session("today", "2026-08-27T10:00:00.000Z", "2026-08-27T12:00:00.000Z")]
    state.rows.approaches = [
      approach("2026-08-27T10:30:00.000Z", { session_id: "today" }),
      approach("2026-08-27T10:45:00.000Z", { session_id: "today" }),
    ]

    // Act
    await reconcileUserProgress("u1")

    // Assert
    const first = state.inserted.find((m) => m.milestone_type === "first_approach")
    expect(first?.session_id).toBe("today")
  })

  test("a badge earned in a session still running is stamped onto it too", async () => {
    // Arrange: this is the ordinary case — badges are won mid-session, and the
    // stamping used to be missed entirely because only endSession supplied one.
    state.rows.sessions = [session("live", "2026-08-27T10:00:00.000Z", null)]
    state.rows.approaches = [approach("2026-08-27T10:30:00.000Z", { session_id: "live" })]

    // Act
    await reconcileUserProgress("u1")

    // Assert
    expect(state.inserted.find((m) => m.milestone_type === "first_approach")?.session_id).toBe("live")
  })

  test("counters are written whole, never incremented", async () => {
    // Arrange
    state.rows.approaches = fiveApproaches()

    // Act
    await reconcileUserProgress("u1")

    // Assert
    expect(state.statsWrites).toHaveLength(1)
    expect(state.statsWrites[0].total_approaches).toBe(5)
  })

  test("an approach that lands mid-recompute is picked up, not lost", async () => {
    // Arrange: the classic double tap — a sixth approach is written while the
    // first pass is reading. Under the old `+1` counter this increment was lost
    // for good; here the re-check catches it.
    state.rows.approaches = fiveApproaches()
    state.onCount = () => {
      if (state.counts === 1) {
        state.rows.approaches.push(approach("2026-01-28T10:13:05.000Z"))
      }
    }

    // Act
    await reconcileUserProgress("u1")

    // Assert
    expect(state.statsWrites.at(-1)?.total_approaches).toBe(6)
  })

  test("a quiet reconcile reads the history once and only counts to confirm", async () => {
    // Arrange
    state.rows.approaches = fiveApproaches()

    // Act
    await reconcileUserProgress("u1")

    // Assert: this runs on every tap during a session. One read of the history,
    // one cheap count to check nothing raced, one write. No second full read.
    expect(state.reads).toBe(1)
    expect(state.counts).toBe(1)
    expect(state.statsWrites).toHaveLength(1)
  })

  test("setting the outcome later is what finally awards the Numbers badge", async () => {
    // Arrange: the tracker saves an approach with no outcome, then patches it.
    state.rows.approaches = [approach("2026-08-27T10:30:00.000Z")]
    await reconcileUserProgress("u1")
    expect(state.inserted.map((m) => m.milestone_type)).not.toContain("first_number")
    state.inserted = []

    // Act
    state.rows.approaches[0] = { ...state.rows.approaches[0], outcome: "number" }
    await reconcileUserProgress("u1")

    // Assert
    expect(state.inserted.map((m) => m.milestone_type)).toContain("first_number")
  })

  test("deleting rows lowers the counters and takes no badge away", async () => {
    // Arrange
    state.rows.approaches = fiveApproaches()
    await reconcileUserProgress("u1")
    const badgesAfterFive = new Set(state.held)

    // Act: the session and its approaches are deleted.
    state.rows.approaches = []
    await reconcileUserProgress("u1")

    // Assert
    expect(state.statsWrites.at(-1)?.total_approaches).toBe(0)
    expect(state.held).toEqual(badgesAfterFive)
  })
})
