/**
 * A MALFORMED ID IS "NO SUCH ROW", NOT A FAULT — every read by id an API route
 * hands a URL segment to.
 *
 * Postgres refuses `abc` as a uuid with 22P02, and these reads turned that into
 * a thrown error: the route answered 500 and filed a crash report, while a
 * well-formed missing id answered 404. The junk-parameter sweep logged six of
 * them for /api/tracking/field-report/[id] on every run. One rule now,
 * `noSuchRow` in src/db/rowErrors.ts; this checks each read against the real
 * database rather than a mock of the error.
 */
import { beforeAll, describe, it, expect, vi } from "vitest"
import { actAs, newUser, type TestUser } from "@/tests/db/harness"
import {
  getApproachOwner,
  getCustomReportTemplate,
  getFieldReport,
  getFieldReportTemplate,
  getSession,
  getSessionWithApproaches,
  updateCustomReportTemplate,
} from "@/src/db/trackingRepo"
import { getGoalById } from "@/src/db/goalRepo"
import { getEnrollmentById } from "@/src/db/programRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

let user: TestUser
beforeAll(async () => {
  user = await newUser("malformed-ids")
  actAs(user)
})

// What the sweep sends, and what a truncated link looks like.
const MALFORMED = ["abc", "-1", "0", "null", "6f1c2a", "6f1c2a9e-0000-4000-8000"]

describe("a read by an id that cannot name a row says there is none", () => {
  for (const id of MALFORMED) {
    it(`"${id}"`, async () => {
      expect(await getFieldReport(id)).toBeNull()
      expect(await getSession(id)).toBeNull()
      expect(await getSessionWithApproaches(id)).toBeNull()
      expect(await getApproachOwner(id)).toBeNull()
      expect(await getFieldReportTemplate(id)).toBeNull()
      expect(await getCustomReportTemplate(id, user.id)).toBeNull()
      expect(await getGoalById(user.id, id, "UTC")).toBeNull()
      expect(await getEnrollmentById(user.id, id)).toBeNull()
    })
  }

  it("an update through one names the missing template, not a database fault", async () => {
    await expect(updateCustomReportTemplate("abc", user.id, { name: "x" })).rejects.toThrow(
      "Template not found or access denied"
    )
  })

  it("a well-formed id that matches nothing still says the same", async () => {
    // the control: the old behaviour for this case was already right
    expect(await getFieldReport(crypto.randomUUID())).toBeNull()
    expect(await getGoalById(user.id, crypto.randomUUID(), "UTC")).toBeNull()
  })
})
