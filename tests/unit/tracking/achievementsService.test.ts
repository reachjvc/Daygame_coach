/**
 * THE FACT SHEET, AND THE COUNTERS, FROM THE ROWS ALONE.
 *
 * Everything here is a pure function of rows the user created, so all of it is
 * testable without a database — which is the point of splitting the repo (rows)
 * from the service (meaning).
 *
 * The cases that carry real weight:
 *   - a session row whose own `total_approaches` is WRONG, to prove the counts
 *     come from the approach rows and never from that denormalised column
 *   - a 23:30 UTC approach, which is tomorrow in Copenhagen, because filing a
 *     day by the server clock has already broken streaks here three times
 *   - a completed session with no `ended_at`, which must be dropped loudly
 *     rather than dated by guesswork
 */

import { readFileSync } from "fs"
import { join } from "path"
import { describe, test, expect, vi, afterEach } from "vitest"
import { buildFacts, deriveEarnedMilestones, projectTrackingStats } from "@/src/tracking/achievementsService"
import { emptyFacts } from "@/src/tracking/data/milestoneRules"
import type { ApproachRow, FieldReportRow, MilestoneSourceRows, ReviewRow, SessionRow } from "@/src/tracking/types"
import { gateStreaks } from "@/src/db/metricsRepo"
import type { UserTrackingStatsRow } from "@/src/db/trackingTypes"

/**
 * The columns `projectTrackingStats` does not set, so a projection can be spread
 * over a whole row and handed to `gateStreaks` — which reads the stored streak
 * and its period key together, the pair this whole subsystem is about.
 */
function statsRowFixture(): UserTrackingStatsRow {
  return {
    user_id: "user-1",
    total_approaches: 0, total_sessions: 0, total_numbers: 0,
    total_instadates: 0, total_field_reports: 0,
    current_streak: 0, longest_streak: 0, last_approach_date: null,
    current_week_sessions: 0, current_week_approaches: 0, current_week_numbers: 0,
    current_week_instadates: 0, current_week_field_reports: 0,
    current_week_streak: 0, longest_week_streak: 0,
    week_start_date: null, last_active_week_start: null, last_review_week_start: null,
    unique_locations: [],
    weekly_reviews_completed: 0, current_weekly_streak: 0,
    monthly_review_unlocked: false, quarterly_review_unlocked: false,
    favorite_template_ids: [], updated_at: "2026-03-05T00:00:00.000Z",
  }
}

const TZ = "Europe/Copenhagen"

let approachSeq = 0
function approach(over: Partial<ApproachRow> & { timestamp: string }): ApproachRow {
  approachSeq += 1
  return {
    id: `a${approachSeq}`,
    user_id: "u1",
    session_id: null,
    outcome: null,
    tags: null,
    mood: null,
    latitude: null,
    longitude: null,
    note: null,
    voice_note_url: null,
    created_at: over.timestamp,
    set_type: null,
    quality: null,
    ...over,
  } as ApproachRow
}

let sessionSeq = 0
function session(over: Partial<SessionRow> & { started_at: string }): SessionRow {
  sessionSeq += 1
  return {
    id: `s${sessionSeq}`,
    user_id: "u1",
    ended_at: over.started_at,
    goal: null,
    goal_met: false,
    total_approaches: 0,
    duration_minutes: 30,
    primary_location: null,
    location_data: null,
    is_active: false,
    created_at: over.started_at,
    updated_at: over.started_at,
    session_focus: null,
    technique_focus: null,
    if_then_plan: null,
    custom_intention: null,
    pre_session_mood: null,
    with_wingman: false,
    wingman_name: null,
    end_reason: "completed",
    ...over,
  } as SessionRow
}

function report(over: Partial<FieldReportRow> & { reported_at: string }): FieldReportRow {
  return {
    id: `r${over.reported_at}`,
    user_id: "u1",
    session_id: null,
    template_id: null,
    fields: {},
    approach_count: null,
    location: null,
    tags: null,
    is_draft: false,
    created_at: over.reported_at,
    updated_at: over.reported_at,
    title: null,
    system_template_slug: null,
    ...over,
  } as FieldReportRow
}

function review(over: Partial<ReviewRow> & { created_at: string; period_start: string }): ReviewRow {
  return {
    id: `v${over.created_at}`,
    user_id: "u1",
    review_type: "weekly",
    template_id: null,
    fields: {},
    period_end: over.period_start,
    previous_commitment: null,
    commitment_fulfilled: null,
    new_commitment: null,
    is_draft: false,
    updated_at: over.created_at,
    ...over,
  } as ReviewRow
}

function rows(over: Partial<MilestoneSourceRows> = {}): MilestoneSourceRows {
  return { approaches: [], sessions: [], fieldReports: [], reviews: [], ...over }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("the columns the reader asks for are the columns the rules read", () => {
  /**
   * THE SAME SHAPE AS THE WORST BUG IN THIS AREA.
   *
   * `getMilestoneSourceRows` names its columns explicitly — `select("*")` was
   * dragging the whole JSONB body of every report and review across the wire on
   * every tap. The cost of naming them is that a column left off the list
   * arrives as `undefined`, and a rule reading it silently never fires. No test
   * would notice: the fixtures here are complete objects, and the select string
   * is a string.
   *
   * That is exactly how all six week-streak badges shipped unearnable — two
   * halves of one system disagreeing about a shape, with tests on only one half.
   * This reads the real select strings and the real field accesses and checks
   * they agree.
   */
  const repoSource = readFileSync(join(process.cwd(), "src/db/trackingRepo.ts"), "utf-8")
  const serviceSource = readFileSync(
    join(process.cwd(), "src/tracking/achievementsService.ts"),
    "utf-8"
  )

  /** The `readAll<Row>("table", "col, col, col")` calls, as {table: columns}. */
  function selectedColumns(): Record<string, string[]> {
    const out: Record<string, string[]> = {}
    for (const m of repoSource.matchAll(/readAll<\w+>\(\s*"(\w+)",\s*\n?\s*"([^"]+)"/g)) {
      out[m[1]] = m[2].split(",").map((c) => c.trim())
    }
    return out
  }

  /**
   * Which columns of each table the rules can legitimately want.
   *
   * This universe deliberately does NOT come from the select strings. The first
   * version of this test filtered the fields it read through the select list,
   * so deleting a column from the select deleted the assertion about it too —
   * it passed happily with `tags` removed. Deriving the yardstick from the thing
   * under test is how a check quietly stops checking.
   */
  const COLUMNS_BY_TABLE: Record<string, string[]> = {
    approaches: ["timestamp", "outcome", "set_type", "tags", "session_id"],
    sessions: [
      "started_at",
      "ended_at",
      "end_reason",
      "is_active",
      "goal_met",
      "duration_minutes",
      "primary_location",
      "with_wingman",
    ],
    field_reports: ["is_draft", "reported_at"],
    reviews: ["review_type", "is_draft", "created_at", "period_start"],
  }

  /** Every `<alias>.<field>` the indexer reads that is a column of this table. */
  function fieldsReadFrom(alias: string, table: string): string[] {
    const read = new Set<string>()
    for (const m of serviceSource.matchAll(new RegExp(`\\b${alias}\\.([a-z_]+)`, "g"))) {
      if (COLUMNS_BY_TABLE[table].includes(m[1])) read.add(m[1])
    }
    return [...read]
  }

  test("the select strings are found at all", () => {
    // If the regex stops matching, every assertion below passes vacuously.
    expect(Object.keys(selectedColumns()).sort()).toEqual([
      "approaches",
      "field_reports",
      "reviews",
      "sessions",
    ])
  })

  test.each([
    ["approaches", "a"],
    ["sessions", "s"],
    ["field_reports", "r"],
    ["reviews", "r"],
  ])("every %s column the indexer reads is selected", (table, alias) => {
    // Arrange
    const selected = selectedColumns()[table]
    const read = fieldsReadFrom(alias, table)

    // Assert: the test must be looking at something...
    expect(read.length).toBeGreaterThan(1)
    // ...and a column read but never selected arrives as undefined at runtime,
    // so the badge that depends on it silently never fires.
    expect(read.filter((field) => !selected.includes(field))).toEqual([])
  })
})

describe("the fact sheet tests are written against is the one production builds", () => {
  test("emptyFacts() matches buildFacts() on a user who has done nothing", () => {
    // Every test in milestoneRules.test.ts starts from `emptyFacts()`, a
    // hand-maintained literal. If it drifts from what buildFacts actually
    // produces — a new set type, a renamed field — those tests keep passing
    // against a shape no caller ever emits. That is exactly how all six
    // week-streak badges stayed unearnable through a green suite.
    expect(emptyFacts()).toEqual(buildFacts(rows(), TZ))
  })
})

describe("buildFacts — approaches", () => {
  test("orders approaches by when they happened, not by how they arrived", () => {
    // Arrange
    const source = rows({
      approaches: [
        approach({ timestamp: "2026-03-02T10:00:00.000Z" }),
        approach({ timestamp: "2026-03-01T10:00:00.000Z" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.approaches).toEqual([
      "2026-03-01T10:00:00.000Z",
      "2026-03-02T10:00:00.000Z",
    ])
  })

  test("splits outcomes the way the badges mean them", () => {
    // Arrange: 'good' is a good conversation with no close — not a rejection.
    const source = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T10:00:00.000Z", outcome: "number" }),
        approach({ timestamp: "2026-03-01T11:00:00.000Z", outcome: "instadate" }),
        approach({ timestamp: "2026-03-01T12:00:00.000Z", outcome: "short" }),
        approach({ timestamp: "2026-03-01T13:00:00.000Z", outcome: "blowout" }),
        approach({ timestamp: "2026-03-01T14:00:00.000Z", outcome: "good" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.numbers).toHaveLength(1)
    expect(facts.instadates).toHaveLength(1)
    expect(facts.rejections).toEqual([
      "2026-03-01T12:00:00.000Z",
      "2026-03-01T13:00:00.000Z",
    ])
    expect(facts.blowouts).toEqual(["2026-03-01T13:00:00.000Z"])
  })

  test("files a day by the user's clock, not the server's", () => {
    // Arrange: 23:30 UTC on 1 March is 00:30 on 2 March in Copenhagen.
    const source = rows({
      approaches: [approach({ timestamp: "2026-03-01T23:30:00.000Z" })],
    })

    // Act
    const copenhagen = buildFacts(source, TZ)
    const utc = buildFacts(source, "UTC")

    // Assert
    expect(copenhagen.approachDays).toEqual(["2026-03-02"])
    expect(utc.approachDays).toEqual(["2026-03-01"])
  })

  test("groups tags and tagged numbers separately", () => {
    // Arrange
    const source = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T10:00:00.000Z", tags: ["street"], outcome: "short" }),
        approach({ timestamp: "2026-03-01T11:00:00.000Z", tags: ["cafe"], outcome: "number" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.tags.street).toEqual(["2026-03-01T10:00:00.000Z"])
    expect(facts.numbersByTag.cafe).toEqual(["2026-03-01T11:00:00.000Z"])
    expect(facts.numbersByTag.street).toBeUndefined()
  })
})

describe("buildFacts — sessions", () => {
  test("counts only completed sessions", () => {
    // Arrange
    const source = rows({
      sessions: [
        session({ started_at: "2026-03-01T10:00:00.000Z", ended_at: "2026-03-01T11:00:00.000Z" }),
        session({ started_at: "2026-03-02T10:00:00.000Z", ended_at: null, end_reason: null as never, is_active: true }),
        session({ started_at: "2026-03-03T10:00:00.000Z", ended_at: "2026-03-03T11:00:00.000Z", end_reason: "abandoned" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.sessions).toEqual(["2026-03-01T11:00:00.000Z"])
  })

  test("drops a completed session with no end time, loudly", () => {
    // Arrange
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const source = rows({
      sessions: [session({ started_at: "2026-03-01T10:00:00.000Z", ended_at: null })],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert: excluded, and the reason is on the record rather than swallowed.
    expect(facts.sessions).toEqual([])
    expect(error).toHaveBeenCalledWith(expect.stringContaining("no ended_at"))
  })

  test("counts a session's approaches from the approach rows, never from the session's own column", () => {
    // Arrange: an earlier session that claims 99 approaches and holds 3, then a
    // later one that holds 5. Reading the column would date the badge to the
    // first session — and would award the 10-approach badge as well.
    const source = rows({
      sessions: [
        session({
          id: "sLiar",
          started_at: "2026-03-01T10:00:00.000Z",
          ended_at: "2026-03-01T12:00:00.000Z",
          total_approaches: 99,
        }),
        session({
          id: "sReal",
          started_at: "2026-03-02T10:00:00.000Z",
          ended_at: "2026-03-02T12:00:00.000Z",
          total_approaches: 0,
        }),
      ],
      approaches: [
        ...Array.from({ length: 3 }, (_, i) =>
          approach({ timestamp: `2026-03-01T10:0${i}:00.000Z`, session_id: "sLiar" })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          approach({ timestamp: `2026-03-02T10:0${i}:00.000Z`, session_id: "sReal" })
        ),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.firstSession5Approaches).toBe("2026-03-02T12:00:00.000Z")
    expect(facts.firstSession10Approaches).toBeNull()
  })

  test("an approach belonging to no session counts towards no session's total", () => {
    // Arrange: four in the session, one loose. The session is not a 5-approach
    // session — the loose one was logged outside it.
    const source = rows({
      sessions: [
        session({ id: "sY", started_at: "2026-03-01T10:00:00.000Z", ended_at: "2026-03-01T12:00:00.000Z" }),
      ],
      approaches: [
        ...Array.from({ length: 4 }, (_, i) =>
          approach({ timestamp: `2026-03-01T10:0${i}:00.000Z`, session_id: "sY" })
        ),
        approach({ timestamp: "2026-03-01T15:00:00.000Z" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert: five approaches in total, but no five-approach session.
    expect(facts.approaches).toHaveLength(5)
    expect(facts.firstSession5Approaches).toBeNull()
  })

  test("dates a per-session badge to the session that first qualified", () => {
    // Arrange
    const source = rows({
      sessions: [
        session({ id: "s1", started_at: "2026-03-01T10:00:00.000Z", ended_at: "2026-03-01T11:00:00.000Z", goal_met: false }),
        session({ id: "s2", started_at: "2026-03-02T10:00:00.000Z", ended_at: "2026-03-02T11:00:00.000Z", goal_met: true }),
        session({ id: "s3", started_at: "2026-03-03T10:00:00.000Z", ended_at: "2026-03-03T11:00:00.000Z", goal_met: true }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.firstSessionGoalMet).toBe("2026-03-02T11:00:00.000Z")
  })

  test("Never Give Up needs a sixth approach after five rejections in a row", () => {
    // Arrange
    const fiveThenStop = rows({
      sessions: [session({ id: "sA", started_at: "2026-03-01T10:00:00.000Z", ended_at: "2026-03-01T12:00:00.000Z" })],
      approaches: Array.from({ length: 5 }, (_, i) =>
        approach({ timestamp: `2026-03-01T10:0${i}:00.000Z`, session_id: "sA", outcome: "blowout" })
      ),
    })
    const fiveThenMore = rows({
      sessions: [session({ id: "sB", started_at: "2026-03-01T10:00:00.000Z", ended_at: "2026-03-01T12:00:00.000Z" })],
      approaches: [
        ...Array.from({ length: 5 }, (_, i) =>
          approach({ timestamp: `2026-03-01T10:0${i}:00.000Z`, session_id: "sB", outcome: "short" })
        ),
        approach({ timestamp: "2026-03-01T10:06:00.000Z", session_id: "sB", outcome: "good" }),
      ],
    })

    // Act & Assert
    expect(buildFacts(fiveThenStop, TZ).firstSessionAfter5ConsecutiveRejections).toBeNull()
    expect(buildFacts(fiveThenMore, TZ).firstSessionAfter5ConsecutiveRejections).toBe(
      "2026-03-01T12:00:00.000Z"
    )
  })

  test("reads the session start hour in the user's zone for Night Owl and Early Bird", () => {
    // Arrange: 20:30 UTC is 21:30 in Copenhagen — a night owl there, not in UTC.
    const source = rows({
      sessions: [
        session({ started_at: "2026-03-01T20:30:00.000Z", ended_at: "2026-03-01T22:00:00.000Z" }),
      ],
    })

    // Act
    const copenhagen = buildFacts(source, TZ)
    const utc = buildFacts(source, "UTC")

    // Assert
    expect(copenhagen.firstSessionStartedAfter9pm).toBe("2026-03-01T22:00:00.000Z")
    expect(utc.firstSessionStartedAfter9pm).toBeNull()
  })
})

describe("buildFacts — moments that are not simple counts", () => {
  test("three approaches inside ten minutes", () => {
    // Arrange
    const tight = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T10:00:00.000Z" }),
        approach({ timestamp: "2026-03-01T10:04:00.000Z" }),
        approach({ timestamp: "2026-03-01T10:09:00.000Z" }),
      ],
    })
    const spread = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T10:00:00.000Z" }),
        approach({ timestamp: "2026-03-01T10:04:00.000Z" }),
        approach({ timestamp: "2026-03-01T10:11:00.000Z" }),
      ],
    })

    // Act & Assert
    expect(buildFacts(tight, TZ).first3ApproachesIn10Min).toBe("2026-03-01T10:09:00.000Z")
    expect(buildFacts(spread, TZ).first3ApproachesIn10Min).toBeNull()
  })

  test("Sniper is a number on the first approach of a day, not any first number", () => {
    // Arrange: day one opens with a rejection, day two opens with a number.
    const source = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T09:00:00.000Z", outcome: "short" }),
        approach({ timestamp: "2026-03-01T10:00:00.000Z", outcome: "number" }),
        approach({ timestamp: "2026-03-02T09:00:00.000Z", outcome: "number" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.firstNumberOnFirstApproachOfDay).toBe("2026-03-02T09:00:00.000Z")
  })

  test("Instant Connection is an instadate on the first approach of a session", () => {
    // Arrange
    const source = rows({
      sessions: [session({ id: "sQ", started_at: "2026-03-01T09:00:00.000Z", ended_at: "2026-03-01T12:00:00.000Z" })],
      approaches: [
        approach({ timestamp: "2026-03-01T09:30:00.000Z", session_id: "sQ", outcome: "instadate" }),
        approach({ timestamp: "2026-03-01T10:30:00.000Z", session_id: "sQ", outcome: "instadate" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.firstInstadateOnFirstApproachOfSession).toBe("2026-03-01T09:30:00.000Z")
    expect(facts.firstSession2Instadates).toBe("2026-03-01T12:00:00.000Z")
  })

  test("Comeback Kid needs a gap of two full weeks", () => {
    // Arrange
    const thirteenDays = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T10:00:00.000Z" }),
        approach({ timestamp: "2026-03-14T09:00:00.000Z" }),
      ],
    })
    const fourteenDays = rows({
      approaches: [
        approach({ timestamp: "2026-03-01T10:00:00.000Z" }),
        approach({ timestamp: "2026-03-15T10:00:00.000Z" }),
      ],
    })

    // Act & Assert
    expect(buildFacts(thirteenDays, TZ).firstComeback).toBeNull()
    expect(buildFacts(fourteenDays, TZ).firstComeback).toBe("2026-03-15T10:00:00.000Z")
  })

  test("Globetrotter is dated to the session that introduced the fifth place", () => {
    // Arrange
    const places = ["strøget", "nørreport", "kongens have", "amager", "vesterbro"]
    const source = rows({
      sessions: places.map((place, i) =>
        session({
          started_at: `2026-03-0${i + 1}T10:00:00.000Z`,
          ended_at: `2026-03-0${i + 1}T11:00:00.000Z`,
          primary_location: place,
        })
      ),
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.uniqueLocations.map((l) => l.location)).toEqual(places)
    expect(facts.fifthUniqueLocation).toBe("2026-03-05T11:00:00.000Z")
  })

  test("a week goes active at the fifth approach, and that is when the streak is dated", () => {
    // Arrange: five approaches in the week of Monday 2 March 2026.
    const source = rows({
      approaches: Array.from({ length: 5 }, (_, i) =>
        approach({ timestamp: `2026-03-0${i + 2}T10:00:00.000Z` })
      ),
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.activeWeeks).toEqual([
      { week: "2026-03-02", qualifiedAt: "2026-03-06T10:00:00.000Z" },
    ])
  })

  test("a week also goes active on two sessions", () => {
    // Arrange
    const source = rows({
      sessions: [
        session({ started_at: "2026-03-02T10:00:00.000Z", ended_at: "2026-03-02T11:00:00.000Z" }),
        session({ started_at: "2026-03-04T10:00:00.000Z", ended_at: "2026-03-04T11:00:00.000Z" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.activeWeeks).toEqual([
      { week: "2026-03-02", qualifiedAt: "2026-03-04T11:00:00.000Z" },
    ])
  })
})

describe("buildFacts — reports and reviews", () => {
  test("drafts do not count", () => {
    // Arrange
    const source = rows({
      fieldReports: [
        report({ reported_at: "2026-03-01T10:00:00.000Z" }),
        report({ reported_at: "2026-03-02T10:00:00.000Z", is_draft: true }),
      ],
      reviews: [
        review({ created_at: "2026-03-01T10:00:00.000Z", period_start: "2026-02-23" }),
        review({ created_at: "2026-03-02T10:00:00.000Z", period_start: "2026-03-02", is_draft: true }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.fieldReports).toEqual(["2026-03-01T10:00:00.000Z"])
    expect(facts.weeklyReviews).toEqual(["2026-03-01T10:00:00.000Z"])
  })

  test("keeps weekly and monthly reviews apart", () => {
    // Arrange
    const source = rows({
      reviews: [
        review({ created_at: "2026-03-01T10:00:00.000Z", period_start: "2026-02-23" }),
        review({ created_at: "2026-03-02T10:00:00.000Z", period_start: "2026-02-01", review_type: "monthly" }),
      ],
    })

    // Act
    const facts = buildFacts(source, TZ)

    // Assert
    expect(facts.weeklyReviews).toHaveLength(1)
    expect(facts.monthlyReviews).toEqual(["2026-03-02T10:00:00.000Z"])
  })
})

describe("deriveEarnedMilestones", () => {
  test("returns every badge the rows earn, oldest first", () => {
    // Arrange
    const source = rows({
      approaches: Array.from({ length: 5 }, (_, i) =>
        approach({ timestamp: `2026-03-0${i + 2}T10:00:00.000Z`, outcome: i === 0 ? "number" : null })
      ),
    })

    // Act
    const earned = deriveEarnedMilestones(buildFacts(source, TZ))
    const types = earned.map((e) => e.type)

    // Assert
    expect(types).toContain("first_approach")
    expect(types).toContain("5_approaches")
    expect(types).toContain("first_number")
    expect(types).not.toContain("10_approaches")
    expect(earned.map((e) => e.achievedAt)).toEqual(
      [...earned.map((e) => e.achievedAt)].sort()
    )
  })

  test("running it twice on the same rows gives the same answer", () => {
    // Arrange
    const source = rows({
      approaches: Array.from({ length: 12 }, (_, i) =>
        approach({ timestamp: new Date(Date.UTC(2026, 2, 1, 10, i)).toISOString() })
      ),
    })
    const facts = buildFacts(source, TZ)

    // Act & Assert
    expect(deriveEarnedMilestones(facts)).toEqual(deriveEarnedMilestones(facts))
  })
})

describe("badges that depend on weeks, end to end from rows", () => {
  /**
   * THE TEST THAT WAS MISSING.
   *
   * The week-streak rules shipped with a private ISO-week parser ("2026-W07")
   * while buildFacts produced Monday dates ("2026-03-02"), so every comparison
   * was NaN and all six week-streak badges were unearnable. Every unit test
   * passed, because they handed the rule ISO labels that buildFacts never
   * emits. Only going through the real pipeline — rows in, badges out — can
   * catch a mismatch between two halves of the same system.
   */
  function weeklyApproaches(mondays: string[]) {
    return mondays.flatMap((monday) =>
      Array.from({ length: 5 }, (_, i) => {
        const day = new Date(`${monday}T10:00:00.000Z`)
        day.setUTCDate(day.getUTCDate() + i)
        return approach({ timestamp: day.toISOString() })
      })
    )
  }

  test("five approaches a week for two weeks running earns Getting Momentum", () => {
    // Arrange: the weeks of Monday 5 and Monday 12 January 2026.
    const source = rows({ approaches: weeklyApproaches(["2026-01-05", "2026-01-12"]) })

    // Act
    const earned = deriveEarnedMilestones(buildFacts(source, TZ))

    // Assert
    const streak = earned.find((e) => e.type === "2_week_streak")
    expect(streak).toBeDefined()
    // Dated to the approach that made the second week active — its fifth.
    expect(streak?.achievedAt).toBe("2026-01-16T10:00:00.000Z")
  })

  test("a missed week means no streak badge", () => {
    // Arrange: weeks of 5 January and 19 January, nothing in between.
    const source = rows({ approaches: weeklyApproaches(["2026-01-05", "2026-01-19"]) })

    // Act
    const earned = deriveEarnedMilestones(buildFacts(source, TZ))

    // Assert
    expect(earned.map((e) => e.type)).not.toContain("2_week_streak")
  })

  test("four weeks running earns both the two-week and the four-week badge", () => {
    // Arrange
    const source = rows({
      approaches: weeklyApproaches(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]),
    })

    // Act
    const types = deriveEarnedMilestones(buildFacts(source, TZ)).map((e) => e.type)

    // Assert
    expect(types).toContain("2_week_streak")
    expect(types).toContain("4_week_streak")
    expect(types).not.toContain("8_week_streak")
  })

  test("the badge and the counter agree about the streak", () => {
    // Arrange: the two projections of the same rows must never disagree — that
    // is the promise the whole module is built on, and it was broken.
    const mondays = ["2026-01-05", "2026-01-12", "2026-01-19"]
    const source = rows({ approaches: weeklyApproaches(mondays) })

    // Act
    const types = deriveEarnedMilestones(buildFacts(source, TZ)).map((e) => e.type)
    const stats = projectTrackingStats(source, TZ, new Date("2026-01-21T12:00:00.000Z"))

    // Assert
    expect(stats.longest_week_streak).toBe(3)
    expect(types).toContain("2_week_streak")
  })

  test("seven days in a row earns the day-streak badges", () => {
    // Arrange
    const source = rows({
      approaches: Array.from({ length: 7 }, (_, i) => {
        const day = new Date("2026-03-02T10:00:00.000Z")
        day.setUTCDate(day.getUTCDate() + i)
        return approach({ timestamp: day.toISOString() })
      }),
    })

    // Act
    const types = deriveEarnedMilestones(buildFacts(source, TZ)).map((e) => e.type)

    // Assert
    expect(types).toContain("7_day_streak")
    expect(types).toContain("consistent")
    expect(types).not.toContain("30_day_streak")
  })
})

describe("projectTrackingStats", () => {
  const now = new Date("2026-03-06T12:00:00.000Z") // Friday of the week of Mon 2 March

  test("totals are counts of rows, nothing incremented", () => {
    // Arrange
    const source = rows({
      approaches: [
        approach({ timestamp: "2026-03-02T10:00:00.000Z", outcome: "number" }),
        approach({ timestamp: "2026-03-03T10:00:00.000Z", outcome: "instadate" }),
        approach({ timestamp: "2026-03-04T10:00:00.000Z" }),
      ],
      sessions: [session({ started_at: "2026-03-02T09:00:00.000Z", ended_at: "2026-03-02T11:00:00.000Z" })],
      fieldReports: [report({ reported_at: "2026-03-02T12:00:00.000Z" })],
    })

    // Act
    const stats = projectTrackingStats(source, TZ, now)

    // Assert
    expect(stats.total_approaches).toBe(3)
    expect(stats.total_numbers).toBe(1)
    expect(stats.total_instadates).toBe(1)
    expect(stats.total_sessions).toBe(1)
    expect(stats.total_field_reports).toBe(1)
  })

  test("counters for this week are only this week's rows", () => {
    // Arrange
    const source = rows({
      approaches: [
        approach({ timestamp: "2026-02-24T10:00:00.000Z" }), // last-but-one week
        approach({ timestamp: "2026-03-03T10:00:00.000Z" }), // this week
        approach({ timestamp: "2026-03-04T10:00:00.000Z" }), // this week
      ],
    })

    // Act
    const stats = projectTrackingStats(source, TZ, now)

    // Assert
    expect(stats.week_start_date).toBe("2026-03-02")
    expect(stats.current_week_approaches).toBe(2)
    expect(stats.total_approaches).toBe(3)
  })

  test("the daily streak counts back from today and survives yesterday", () => {
    // Arrange
    const source = rows({
      approaches: ["2026-03-04", "2026-03-05"].map((d) =>
        approach({ timestamp: `${d}T10:00:00.000Z` })
      ),
    })

    // Act
    const stats = projectTrackingStats(source, TZ, now)

    // Assert: yesterday was the 5th, so the run is still alive today.
    expect(stats.current_streak).toBe(2)
    expect(stats.longest_streak).toBe(2)
    expect(stats.last_approach_date).toBe("2026-03-05")
  })

  test("an old run is stored as what was achieved, and hidden when shown", () => {
    // COUNTING AND HIDING ARE DIFFERENT JOBS. The row records the run the user
    // actually put together; `gateStreaks` decides whether it is still live at
    // the moment it is drawn. This test asserted the gate on the stored value,
    // which meant two gates for one rule and a comment that said there was one.
    // It now asserts both halves, each at its own layer.

    // Arrange: three days in a row, in January. It is March.
    const source = rows({
      approaches: ["2026-01-01", "2026-01-02", "2026-01-03"].map((d) =>
        approach({ timestamp: `${d}T10:00:00.000Z` })
      ),
    })

    // Act
    const stats = projectTrackingStats(source, TZ, now)

    // Assert: the row remembers three, and remembers which day it ended on.
    expect(stats.current_streak).toBe(3)
    expect(stats.longest_streak).toBe(3)
    expect(stats.last_approach_date).toBe("2026-01-03")

    // ...and the screen shows nothing, because that run is long over.
    const shown = gateStreaks(
      { ...statsRowFixture(), ...stats } as UserTrackingStatsRow,
      TZ
    )
    expect(shown.current_streak).toBe(0)
    expect(shown.longest_streak).toBe(3)
  })

  test("the week streak is the run of active weeks, with its key", () => {
    // Arrange: two sessions in each of the weeks of 23 Feb and 2 March.
    const weeks = ["2026-02-23", "2026-02-25", "2026-03-02", "2026-03-04"]
    const source = rows({
      sessions: weeks.map((d) =>
        session({ started_at: `${d}T09:00:00.000Z`, ended_at: `${d}T11:00:00.000Z` })
      ),
    })

    // Act
    const stats = projectTrackingStats(source, TZ, now)

    // Assert
    expect(stats.current_week_streak).toBe(2)
    expect(stats.longest_week_streak).toBe(2)
    expect(stats.last_active_week_start).toBe("2026-03-02")
  })

  test("review counters come from the reviews, and unlock at the documented count", () => {
    // Arrange: four weekly reviews in consecutive weeks.
    const source = rows({
      reviews: ["2026-02-09", "2026-02-16", "2026-02-23", "2026-03-02"].map((monday) =>
        review({ created_at: `${monday}T18:00:00.000Z`, period_start: monday })
      ),
    })

    // Act
    const stats = projectTrackingStats(source, TZ, now)

    // Assert
    expect(stats.weekly_reviews_completed).toBe(4)
    expect(stats.current_weekly_streak).toBe(4)
    expect(stats.last_review_week_start).toBe("2026-03-02")
    expect(stats.monthly_review_unlocked).toBe(true)
    expect(stats.quarterly_review_unlocked).toBe(false)
  })

  test("never writes the field the user chose", () => {
    // Arrange & Act
    const stats = projectTrackingStats(rows(), TZ, now)

    // Assert: favourites are user input; a projection that included them would
    // wipe them on every write.
    expect("favorite_template_ids" in stats).toBe(false)
  })

  test("a user with nothing gets zeroes, not nulls that crash a tile", () => {
    // Arrange & Act
    const stats = projectTrackingStats(rows(), TZ, now)

    // Assert
    expect(stats.total_approaches).toBe(0)
    expect(stats.current_streak).toBe(0)
    expect(stats.current_week_streak).toBe(0)
    expect(stats.last_approach_date).toBeNull()
    expect(stats.last_active_week_start).toBeNull()
    expect(stats.unique_locations).toEqual([])
  })

  test("deleting rows lowers the counters — they follow the data down", () => {
    // Arrange
    const before = rows({
      approaches: Array.from({ length: 6 }, (_, i) =>
        approach({ timestamp: `2026-03-0${i + 1}T10:00:00.000Z` })
      ),
    })
    const after = rows({ approaches: before.approaches.slice(0, 2) })

    // Act
    const statsBefore = projectTrackingStats(before, TZ, now)
    const statsAfter = projectTrackingStats(after, TZ, now)

    // Assert
    expect(statsBefore.total_approaches).toBe(6)
    expect(statsAfter.total_approaches).toBe(2)
  })
})
