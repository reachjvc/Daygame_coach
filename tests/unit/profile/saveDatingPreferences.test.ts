/**
 * SAVING THE DATING PREFERENCES WRITES WHAT IT ASKED FOR AND NOTHING ELSE.
 *
 * The failure this prevents, measured on a real account 2026-09-07. The
 * five-step wizard this function replaces held every signup answer in one form
 * and wrote all of them on submit. Coming back to change one thing therefore
 * rewrote the rest from the form's hardcoded defaults:
 *
 *     field                  before      after   did the user touch it?
 *     age_range_start          20          22           no
 *     secondary_archetype   Ethereal      null          no
 *     tertiary_archetype    Disciplined   null          no
 *
 * The fix is not "be careful" -- it is that a field the screen does not ask
 * about is not in the update statement at all, so no future edit can
 * reintroduce the loss. These tests assert on the PAYLOAD HANDED TO THE
 * DATABASE, which is where the defect was.
 *
 * UPDATED 2026-09-09, and the rule is unchanged -- what the screen asks changed.
 * The gate now asks for the age range and an optional second region, because
 * both were being USED and never asked: the age range decides which archetype
 * photographs the screen shows (so a new account always saw the default set),
 * and scenariosService reads secondary_region when it builds a scenario. A
 * field you are shown and can change is not a field being silently reset, so
 * age_range moves from the forbidden list to the written list.
 *
 * The forbidden list keeps its job: primary_goal, timezone, level, xp and
 * scenarios_completed are still not asked about here, so they must still never
 * appear in the payload.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

import {
  saveDatingPreferencesForUser,
  ProfileServiceError,
} from "@/src/profile/profileService"

const updateProfile = vi.fn()
vi.mock("@/src/db/server", () => ({
  updateProfile: (...args: unknown[]) => updateProfile(...args),
  getProfile: vi.fn(),
}))

const ANSWERS = {
  region: "western-europe",
  archetypes: ["Corporate Powerhouse", "Ethereal Creative"],
  userIsForeign: true,
  datingForeigners: false,
  ageRangeStart: 22,
  ageRangeEnd: 25,
  secondaryRegion: null,
}

const written = () => updateProfile.mock.calls[0][1] as Record<string, unknown>

describe("saving the dating preferences", () => {
  beforeEach(() => {
    updateProfile.mockReset()
    updateProfile.mockResolvedValue({})
  })

  it("writes exactly the columns the answers cover, and no others", async () => {
    await saveDatingPreferencesForUser("user-1", ANSWERS)

    expect(Object.keys(written()).sort()).toEqual(
      [
        "age_range_end",
        "age_range_start",
        "archetype",
        "dating_foreigners",
        "preferred_region",
        "secondary_archetype",
        "secondary_region",
        "tertiary_archetype",
        "user_is_foreign",
      ].sort()
    )
  })

  it.each([
    "primary_goal",
    "timezone",
    "level",
    "xp",
    "scenarios_completed",
  ])("never writes %s", async (column) => {
    // Each of these was in the wizard's single update statement and none is
    // asked about on this screen. `level` is derived from xp, so no form may
    // set it at all.
    await saveDatingPreferencesForUser("user-1", ANSWERS)

    expect(Object.keys(written())).not.toContain(column)
  })

  it("saves the archetypes in the priority order they were picked", async () => {
    await saveDatingPreferencesForUser("user-1", ANSWERS)

    expect(written().archetype).toBe("Corporate Powerhouse")
    expect(written().secondary_archetype).toBe("Ethereal Creative")
    expect(written().tertiary_archetype).toBeNull()
  })

  it("clears the lower slots rather than leaving a stale one behind", async () => {
    // Going from three archetypes to one must not leave the old second and
    // third in place; they are explicitly nulled, not omitted.
    await saveDatingPreferencesForUser("user-1", {
      ...ANSWERS,
      archetypes: ["Corporate Powerhouse"],
    })

    expect(written().secondary_archetype).toBeNull()
    expect(written().tertiary_archetype).toBeNull()
  })

  it("drops a duplicate archetype instead of storing it twice", async () => {
    await saveDatingPreferencesForUser("user-1", {
      ...ANSWERS,
      archetypes: ["Corporate Powerhouse", "Corporate Powerhouse"],
    })

    expect(written().archetype).toBe("Corporate Powerhouse")
    expect(written().secondary_archetype).toBeNull()
  })

  it("stores `false` for the foreigner answers rather than dropping them", async () => {
    // `dating_foreigners: false` is a real answer. If it were omitted the column
    // would stay null and the gate would reappear on every visit.
    await saveDatingPreferencesForUser("user-1", ANSWERS)

    expect(written().dating_foreigners).toBe(false)
    expect(written().user_is_foreign).toBe(true)
  })

  it("refuses a region that is not a real region, and writes nothing", async () => {
    // Onboarding once stored any string that reached it, which then rendered as
    // itself wherever a region is named.
    await expect(
      saveDatingPreferencesForUser("user-1", { ...ANSWERS, region: "atlantis" })
    ).rejects.toBeInstanceOf(ProfileServiceError)

    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("refuses an empty region, and writes nothing", async () => {
    await expect(
      saveDatingPreferencesForUser("user-1", { ...ANSWERS, region: "" })
    ).rejects.toBeInstanceOf(ProfileServiceError)

    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("refuses to save with no archetype, and writes nothing", async () => {
    await expect(
      saveDatingPreferencesForUser("user-1", { ...ANSWERS, archetypes: [] })
    ).rejects.toBeInstanceOf(ProfileServiceError)

    expect(updateProfile).not.toHaveBeenCalled()
  })
})
