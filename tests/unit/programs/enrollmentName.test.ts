/**
 * A WEEK YOU WROTE HAS YOUR NAME FOR IT.
 *
 * Nine places named a program by looking up its catalogue entry. A self-built
 * week's catalogue entry is a shared shell called "Your own program", so three
 * different weeks you had written all appeared under one title and nothing on
 * any screen could tell them apart. The name has been stored on the enrollment
 * since the saved-weeks work; nothing read it.
 */

import { describe, it, expect } from "vitest"
import { enrollmentName } from "@/src/programs/data/catalog"

describe("enrollmentName", () => {
  it("uses the name you gave the week", () => {
    expect(enrollmentName({ program_id: "custom", label: "Push Pull Legs" })).toBe("Push Pull Legs")
  })

  it("falls back to the catalogue name when there is no label", () => {
    expect(enrollmentName({ program_id: "stronglifts-5x5", label: null })).toBe("StrongLifts 5×5")
  })

  it("treats a blank label as no label, rather than showing an empty title", () => {
    expect(enrollmentName({ program_id: "stronglifts-5x5", label: "   " })).toBe("StrongLifts 5×5")
  })

  it("still renders something for a program this build no longer has", () => {
    expect(enrollmentName({ program_id: "retired-program" })).toBe("retired-program")
  })

  it("does not call a self-built week 'Your own program' once it has a name", () => {
    expect(enrollmentName({ program_id: "custom", label: "My Week" })).not.toMatch(/your own/i)
  })
})
