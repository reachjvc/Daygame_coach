/**
 * WHAT profileService's WRITES LEAVE ON THE PERSON'S `profiles` ROW.
 *
 * Plans/tests-catch-what-matters.md, Phase 4 (group B). Through the service the
 * app calls, down to real PostgREST and row security: the columns each function
 * sets hold the values, every other column on the row is unchanged, and a second
 * person's row, created first, is byte-identical afterwards.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import {
  saveDatingPreferencesForUser,
  updateAgeRangeForUser,
  updateArchetypesForUser,
  updatePreferenceForUser,
  updatePreferredRegionForUser,
  updateSecondaryRegionDirectForUser,
} from "@/src/profile/profileService"
import { VALID_REGION_IDS } from "@/src/profile/config"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const [REGION_A, REGION_B] = [...VALID_REGION_IDS]

type Row = Record<string, unknown>

async function profileOf(userId: string): Promise<Row> {
  const [row] = await asOwner((q) => q("select to_jsonb(p) as j from profiles p where id = $1", [userId]))
  return row.j as Row
}

/** Run `write` as `user`; only the named columns may differ afterwards, and a bystander's row not at all. */
async function expectWrote(user: TestUser, write: () => Promise<unknown>, expected: Row) {
  const bystander = await newUser("profile-bystander")
  const bystanderBefore = await profileOf(bystander.id)
  const before = await profileOf(user.id)
  actAs(user)

  await write()

  expect(await profileOf(user.id)).toEqual({ ...before, ...expected })
  expect(await profileOf(bystander.id)).toEqual(bystanderBefore)
}

/** A person with a primary region, so the secondary-region rules have something to compare with. */
async function personInRegion(label: string, fields: Record<string, unknown> = {}): Promise<TestUser> {
  const user = await newUser(label)
  const all = { preferred_region: REGION_A, ...fields }
  const cols = Object.keys(all)
  await asOwner((q) =>
    q(`update profiles set ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")} where id = $1`, [
      user.id,
      ...Object.values(all),
    ])
  )
  return user
}

describe("saveDatingPreferencesForUser", () => {
  it("writes the region, the three archetypes, both flags, the age range and the second region, and nothing else", async () => {
    const me = await newUser("profile-dating")
    await expectWrote(
      me,
      () =>
        saveDatingPreferencesForUser(me.id, {
          region: REGION_A,
          archetypes: ["girl-next-door", "creative", "athlete"],
          userIsForeign: true,
          datingForeigners: false,
          ageRangeStart: 24,
          ageRangeEnd: 33,
          secondaryRegion: REGION_B,
        }),
      {
        preferred_region: REGION_A,
        archetype: "girl-next-door",
        secondary_archetype: "creative",
        tertiary_archetype: "athlete",
        user_is_foreign: true,
        dating_foreigners: false,
        age_range_start: 24,
        age_range_end: 33,
        secondary_region: REGION_B,
      }
    )
  })

  it("drops a repeated archetype, orders the age range and clears a second region equal to the first", async () => {
    const me = await newUser("profile-dating-clean")
    await expectWrote(
      me,
      () =>
        saveDatingPreferencesForUser(me.id, {
          region: REGION_A,
          archetypes: ["creative", "creative", "creative"],
          userIsForeign: false,
          datingForeigners: true,
          ageRangeStart: 40,
          ageRangeEnd: 20,
          secondaryRegion: REGION_A,
        }),
      {
        preferred_region: REGION_A,
        archetype: "creative",
        secondary_archetype: null,
        tertiary_archetype: null,
        user_is_foreign: false,
        dating_foreigners: true,
        age_range_start: 20,
        age_range_end: 40,
        secondary_region: null,
      }
    )
  })

  it("writes nothing when the input is refused", async () => {
    const me = await newUser("profile-dating-refused")
    const before = await profileOf(me.id)
    actAs(me)

    await expect(
      saveDatingPreferencesForUser(me.id, {
        region: REGION_A,
        archetypes: [],
        userIsForeign: false,
        datingForeigners: true,
        ageRangeStart: 20,
        ageRangeEnd: 30,
        secondaryRegion: null,
      })
    ).rejects.toThrow("Archetype is required")
    expect(await profileOf(me.id)).toEqual(before)
  })
})

describe("updateAgeRangeForUser", () => {
  it("writes both ends, clamped to 18..45 and in order, and nothing else", async () => {
    const me = await newUser("profile-age")
    await expectWrote(me, () => updateAgeRangeForUser(me.id, 60, 10), { age_range_start: 18, age_range_end: 45 })
    await expectWrote(me, () => updateAgeRangeForUser(me.id, 30, 25), { age_range_start: 25, age_range_end: 30 })
  })
})

describe("updateArchetypesForUser", () => {
  it("writes the three archetypes with repeats dropped, and nothing else", async () => {
    const me = await newUser("profile-arch")
    await expectWrote(
      me,
      () => updateArchetypesForUser(me.id, { archetype: "creative", secondaryArchetype: "creative", tertiaryArchetype: "athlete" }),
      { archetype: "creative", secondary_archetype: null, tertiary_archetype: "athlete" }
    )
  })
})

describe("updatePreferenceForUser", () => {
  it("writes a yes/no preference as a real boolean, only that column", async () => {
    const me = await newUser("profile-pref-bool")
    await expectWrote(me, () => updatePreferenceForUser(me.id, { key: "dating_foreigners", value: "true" }), { dating_foreigners: true })
    await expectWrote(me, () => updatePreferenceForUser(me.id, { key: "user_is_foreign", value: "true" }), { user_is_foreign: true })
    await expectWrote(me, () => updatePreferenceForUser(me.id, { key: "dating_foreigners", value: "false" }), { dating_foreigners: false })
  })

  it("writes the experience level and the main goal, only that column", async () => {
    const me = await newUser("profile-pref-text")
    await expectWrote(me, () => updatePreferenceForUser(me.id, { key: "experience_level", value: "advanced" }), { experience_level: "advanced" })
    await expectWrote(me, () => updatePreferenceForUser(me.id, { key: "primary_goal", value: "find-dates" }), { primary_goal: "find-dates" })
  })

  it("writes nothing for a key or value it does not know", async () => {
    const me = await newUser("profile-pref-bad")
    const before = await profileOf(me.id)
    actAs(me)
    await expect(updatePreferenceForUser(me.id, { key: "xp", value: "999" })).rejects.toThrow("Invalid preference key")
    await expect(updatePreferenceForUser(me.id, { key: "experience_level", value: "god" })).rejects.toThrow("Invalid experience level")
    expect(await profileOf(me.id)).toEqual(before)
  })
})

describe("updatePreferredRegionForUser", () => {
  it("writes the region and keeps a different second region", async () => {
    const me = await personInRegion("profile-region", { secondary_region: REGION_B })
    await expectWrote(me, () => updatePreferredRegionForUser(me.id, REGION_A), { preferred_region: REGION_A })
  })

  it("clears the second region when the new primary is that same region", async () => {
    const me = await personInRegion("profile-region-same", { secondary_region: REGION_B })
    await expectWrote(me, () => updatePreferredRegionForUser(me.id, REGION_B), { preferred_region: REGION_B, secondary_region: null })
  })
})

describe("updateSecondaryRegionDirectForUser", () => {
  it("writes the second region, and only that column", async () => {
    const me = await personInRegion("profile-second")
    await expectWrote(me, () => updateSecondaryRegionDirectForUser(me.id, REGION_B), { secondary_region: REGION_B })
  })

  it("writes null for null, and for the same region as the primary", async () => {
    const me = await personInRegion("profile-second-clear", { secondary_region: REGION_B })
    await expectWrote(me, () => updateSecondaryRegionDirectForUser(me.id, null), { secondary_region: null })
    await expectWrote(me, () => updateSecondaryRegionDirectForUser(me.id, REGION_A), { secondary_region: null })
  })
})

describe("every profile writer, for somebody else's id", () => {
  it("changes nothing on their row", async () => {
    const owner = await personInRegion("profile-owner", { secondary_region: REGION_B })
    const intruder = await newUser("profile-intruder")
    const before = await profileOf(owner.id)
    actAs(intruder)

    const attempts = [
      () => updateAgeRangeForUser(owner.id, 20, 30),
      () => updateArchetypesForUser(owner.id, { archetype: "creative", secondaryArchetype: null, tertiaryArchetype: null }),
      () => updatePreferenceForUser(owner.id, { key: "dating_foreigners", value: "true" }),
      () => updatePreferredRegionForUser(owner.id, REGION_B),
      () => updateSecondaryRegionDirectForUser(owner.id, null),
      () =>
        saveDatingPreferencesForUser(owner.id, {
          region: REGION_B,
          archetypes: ["creative"],
          userIsForeign: true,
          datingForeigners: true,
          ageRangeStart: 20,
          ageRangeEnd: 30,
          secondaryRegion: null,
        }),
    ]
    for (const attempt of attempts) await attempt().catch(() => undefined)

    expect(await profileOf(owner.id)).toEqual(before)
  })
})
