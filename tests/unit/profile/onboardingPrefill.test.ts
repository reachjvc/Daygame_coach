/**
 * "EDIT FULL PREFERENCES" MUST NOT ERASE ANSWERS THE USER DID NOT TOUCH.
 *
 * `/preferences` used to render a five-step wizard from blank constants to
 * everyone, signing up or editing, and its submit wrote every field it held --
 * so editing one thing overwrote the rest with the form's defaults.
 *
 * Measured on a real account, 2026-09-07. Saved profile was age 20-25 with three
 * archetypes. I walked the flow changing ONLY the region and never touched the
 * age slider:
 *
 *     field                  before   after    touched by the user?
 *     age_range_start          20       22            no
 *     secondary_archetype   Ethereal   null           no
 *     tertiary_archetype    Disciplined null          no
 *
 * 22 is the hardcoded default in the component. Nothing warned the user.
 *
 * These tests assert on the ANSWERS handed to the form, not on the shape of the
 * returned object, because the defect was always in the values.
 */

import { describe, it, expect } from "vitest"

import {
  toOnboardingInitialValues,
  EMPTY_ONBOARDING_VALUES,
} from "@/src/profile/profileService"
import { hasDatingPreferences } from "@/src/profile/config"

const completedProfile = {
  age_range_start: 20,
  age_range_end: 25,
  user_is_foreign: true,
  dating_foreigners: true,
  preferred_region: "scandinavia",
  archetype: "Corporate Powerhouse",
  secondary_archetype: "Ethereal Creative",
  tertiary_archetype: "Disciplined Athlete",
  primary_goal: "find-dates",
}

describe("toOnboardingInitialValues", () => {
  it("gives back every answer a finished user saved", () => {
    const values = toOnboardingInitialValues(completedProfile)

    expect(values.ageRangeStart).toBe(20)
    expect(values.ageRangeEnd).toBe(25)
    expect(values.userIsForeign).toBe(true)
    expect(values.datingForeigners).toBe(true)
    expect(values.region).toBe("scandinavia")
    expect(values.primaryGoal).toBe("find-dates")
  })

  it("keeps all three archetypes, in the priority order they were chosen", () => {
    // The exact loss measured above: secondary and tertiary came back null.
    expect(toOnboardingInitialValues(completedProfile).archetypes).toEqual([
      "Corporate Powerhouse",
      "Ethereal Creative",
      "Disciplined Athlete",
    ])
  })

  it("does not pad or reorder when the user picked fewer than three", () => {
    const values = toOnboardingInitialValues({
      ...completedProfile,
      secondary_archetype: null,
      tertiary_archetype: null,
    })

    expect(values.archetypes).toEqual(["Corporate Powerhouse"])
  })

  it("closes the gap when a middle archetype is missing rather than keeping a hole", () => {
    const values = toOnboardingInitialValues({
      ...completedProfile,
      secondary_archetype: null,
    })

    expect(values.archetypes).toEqual(["Corporate Powerhouse", "Disciplined Athlete"])
  })

  it("prefills nothing for a user who has not answered them", () => {
    /* `user_is_foreign` DEFAULTS TO false IN THE DATABASE. On a row that was
       never filled in it is indistinguishable from a real "No, I'm local", so
       prefilling from it would pre-answer a question the user has never seen.
       `hasDatingPreferences` is what proves the answers are real. */
    const freshRow = {
      user_is_foreign: false,
      dating_foreigners: null,
      age_range_start: null,
      age_range_end: null,
      preferred_region: null,
      archetype: null,
      secondary_archetype: null,
      tertiary_archetype: null,
      primary_goal: null,
    }

    expect(toOnboardingInitialValues(freshRow)).toEqual(EMPTY_ONBOARDING_VALUES)
    expect(toOnboardingInitialValues(freshRow).userIsForeign).toBeNull()
  })

  it("prefills nothing when there is no profile row at all", () => {
    expect(toOnboardingInitialValues(null)).toEqual(EMPTY_ONBOARDING_VALUES)
    expect(toOnboardingInitialValues(undefined)).toEqual(EMPTY_ONBOARDING_VALUES)
  })

  it("treats an empty string as unanswered, not as an answer", () => {
    const values = toOnboardingInitialValues({
      ...completedProfile,
      preferred_region: "",
      primary_goal: "",
    })

    expect(values.region).toBeNull()
    expect(values.primaryGoal).toBeNull()
  })
})

describe("hasDatingPreferences", () => {
  /* THE ONE RULE THAT DECIDES WHETHER THE GATE APPEARS.
     It replaces `onboarding_completed`, a stored flag that also gated the
     dashboard, the Lair and the post-login redirect -- none of which read a
     single one of these columns. Deriving it from the columns themselves means
     there is no second copy of the fact to drift out of step with them. */

  it("is true for a profile that carries all three answers", () => {
    expect(hasDatingPreferences(completedProfile)).toBe(true)
  })

  it("is false for a brand-new row", () => {
    expect(
      hasDatingPreferences({
        preferred_region: null,
        archetype: null,
        dating_foreigners: null,
      })
    ).toBe(false)
  })

  it.each([
    ["region", { preferred_region: null }],
    ["archetype", { archetype: null }],
    ["the dating-foreigners answer", { dating_foreigners: null }],
  ])("is false when %s is missing", (_label, missing) => {
    expect(hasDatingPreferences({ ...completedProfile, ...missing })).toBe(false)
  })

  it("rejects a region id that is not a real region", () => {
    // Onboarding once stored any string that reached it, and it then rendered
    // as itself wherever a region is named.
    expect(
      hasDatingPreferences({ ...completedProfile, preferred_region: "atlantis" })
    ).toBe(false)
  })

  it("treats an empty archetype string as unanswered", () => {
    expect(hasDatingPreferences({ ...completedProfile, archetype: "" })).toBe(false)
  })

  it("accepts `false` as a real answer, not a missing one", () => {
    // The obvious way to write this check is a truthiness test, which would
    // read "No, I am not mostly dating foreigners" as never answered and put
    // the user back through the gate every single time.
    expect(
      hasDatingPreferences({ ...completedProfile, dating_foreigners: false })
    ).toBe(true)
  })

  it("ignores user_is_foreign entirely", () => {
    /* It DEFAULTS TO false in the database, so on a row nobody has filled in it
       is indistinguishable from a real "No, I'm local" -- it can never prove the
       question was asked. Including it would make the gate unskippable for
       anyone who genuinely answered No. */
    expect(
      hasDatingPreferences({ ...completedProfile, user_is_foreign: false })
    ).toBe(true)
    expect(
      hasDatingPreferences({ ...completedProfile, user_is_foreign: null })
    ).toBe(true)
  })

  it("is false for no profile at all", () => {
    expect(hasDatingPreferences(null)).toBe(false)
    expect(hasDatingPreferences(undefined)).toBe(false)
  })

  it("looks only at the three answers, not at anything else on the row", () => {
    /* It used to key off `onboarding_completed`, a stored flag that also gated
       the dashboard, the Lair and the post-login redirect -- none of which read
       these columns. That column was dropped on 2026-09-08. A row carrying the
       answers is ready regardless of whatever else it happens to hold. */
    expect(
      hasDatingPreferences({
        ...completedProfile,
        has_purchased: false,
        level: 1,
      } as Parameters<typeof hasDatingPreferences>[0])
    ).toBe(true)
  })
})
