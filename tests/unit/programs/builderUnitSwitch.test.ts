// @vitest-environment node
/**
 * THE BUILDER'S kg/lb BUTTON CHANGED THE LABEL AND KEPT THE NUMBERS.
 *
 * Type `Back Squat 5x5 @60` in kilograms, tap **lb**, tap **Start tracking
 * this**: the textarea is byte-identical, the read-back line is
 * byte-identical, only the chip's `aria-pressed` moved — and the program that
 * starts prescribes 60 lb. A 60 kg squat became a 27.2 kg squat, and nothing
 * on screen said anything had happened.
 *
 * `convertTyped` was written for this. Its own docblock says: "The builder's
 * own unit button did the opposite wrong thing: it kept the numbers and
 * changed the label, so 60 kg silently became 60 lb." It had ZERO call sites
 * — the definition and one re-export, and nothing else in `src/` or `app/`.
 * The fix existed and was never wired up, which is the one kind of bug that
 * grepping for the fix will not find, because the fix is right there.
 *
 * The catalogue's enrol screen converted correctly the whole time, so the
 * same screen family behaved two ways.
 */

import { describe, expect, test } from "vitest"
import { convertWeightsInText } from "@/src/programs/components/BuildYourWeek"

describe("switching the builder's unit", () => {
  test("converts the weights somebody typed", () => {
    // 60 kg is 132 lb, rounded to something loadable at free precision.
    const out = convertWeightsInText("Monday\nBack Squat 5x5 @60", "kg", "lb")
    expect(out).not.toContain("@60")
    expect(Number(out.match(/@([\d.]+)/)![1])).toBeGreaterThan(120)
  })

  test("and back again, without drifting far from where it started", () => {
    const there = convertWeightsInText("Back Squat 5x5 @60", "kg", "lb")
    const back = convertWeightsInText(there, "lb", "kg")
    expect(Number(back.match(/@([\d.]+)/)![1])).toBeCloseTo(60, 0)
  })

  test("leaves everything else somebody typed exactly as it is", () => {
    // Not `formatProgramText`: regenerating the week would rewrite their
    // spacing, their day names and their order along with the numbers.
    const typed = "Push day\n  Bench Press 3x8 @40\n+ Chin-up 3x8 @bw\n\nPull\nBarbell Row 3x8 @50"
    const out = convertWeightsInText(typed, "kg", "lb")
    expect(out).toContain("Push day")
    expect(out).toContain("+ Chin-up 3x8 @bw")
    expect(out.split("\n")).toHaveLength(typed.split("\n").length)
  })

  test("@bw is not a weight and is left alone", () => {
    expect(convertWeightsInText("Push-up 3x10 @bw", "kg", "lb")).toBe("Push-up 3x10 @bw")
  })

  test("the same unit twice changes nothing at all", () => {
    const typed = "Back Squat 5x5 @60"
    expect(convertWeightsInText(typed, "kg", "kg")).toBe(typed)
  })

  test("a line with no weight is untouched", () => {
    expect(convertWeightsInText("Back Squat 5x5", "kg", "lb")).toBe("Back Squat 5x5")
  })
})
