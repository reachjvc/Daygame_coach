// @vitest-environment jsdom

/**
 * WHAT THE EMPTY BOXES SAY, IN THE AREA THEY ARE IN.
 *
 * Reported from the page, twice: "we have things like 'flat bench 100 kg' in
 * relationships — prefilled boxes that don't make sense per area." The
 * catalogue of offers already had a test holding it to the area it is shown in.
 * The EXAMPLES did not, and they are a prefill too: a placeholder is the page
 * saying "this is the kind of thing that goes here", so Relationship opening
 * with a bench press is the page answering the question it just asked, wrongly,
 * on somebody else's behalf.
 *
 * This test renders the builder rather than reading the data, because the data
 * being right is not the bug that shipped. The bug was a component reaching for
 * one hardcoded string in twelve places, and only a render can see that.
 *
 * The rule is the catalogue's rule, imported rather than restated: an area may
 * speak its neighbours' language and never a stranger's.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AreaBuilder, AreaWants } from "@/src/goals/components/north-star/AreaBuilder"
import type { GuideHandlers } from "@/src/goals/components/north-star/GuidedBuild"
import { addGoal, areaGoalExample, emptyNsPlan } from "@/src/goals/northStarService"
import { BUILDER_COPY, WANT_EXAMPLES } from "@/src/goals/data/northStarStart"
import { MILESTONE_COPY } from "@/src/goals/data/northStar"
import type { NsPlan } from "@/src/goals/types"
import { belongsElsewhere } from "./fixtures/areaLanguage"

afterEach(cleanup)

const TODAY = "2026-08-17"
const NOW = "2026-08-17T09:00:00.000Z"

/**
 * A title with no area in it, so anything this test convicts came from the page
 * rather than from the goal it was handed.
 */
const NEUTRAL_TITLE = "The one I care about here"

/** Every handler is a no-op: this test reads the screen, it does not drive it. */
const HANDLERS = new Proxy({}, { get: () => () => {} }) as GuideHandlers

const AREAS = emptyNsPlan().areas

function planWithGoal(areaId: string): NsPlan {
  return addGoal(emptyNsPlan(), areaId, NEUTRAL_TITLE, "milestone_ladder", NOW)
}

/** Every placeholder currently on the screen, with the box it belongs to. */
function placeholders(): Array<{ label: string; text: string }> {
  return Array.from(document.querySelectorAll("[placeholder]")).map((el) => ({
    label: el.getAttribute("aria-label") ?? el.tagName.toLowerCase(),
    text: el.getAttribute("placeholder") ?? "",
  }))
}

/**
 * The builder for one area, with its one goal open and the progression box
 * open under it — which is where three of the four wrong examples were.
 */
function openBuilder(areaId: string, half: "milestones" | "systems" = "milestones") {
  render(<AreaBuilder plan={planWithGoal(areaId)} today={TODAY} handlers={HANDLERS} areaId={areaId} only={half} />)
  // The row's own title is an INPUT now, not a label — clicking the words edits
  // them — so the row is opened by the control that opens it.
  const opener = screen.queryByLabelText(`Open ${NEUTRAL_TITLE}`)
  if (opener) fireEvent.click(opener)
  // The scaling tool, which is where a written progression is now typed. Its
  // button says "Turn this into a climb" or "Write the steps to this", by
  // whether the title carries a number.
  const scale = screen.queryByText(MILESTONE_COPY.offer) ?? screen.queryByText(MILESTONE_COPY.offerOwn)
  if (scale) fireEvent.click(scale)
}

describe("the examples in the builder belong to the area they are shown in", () => {
  it.each(AREAS.map((a) => [a.label, a] as const))("%s: no box asks in another area's language", (_label, area) => {
    openBuilder(area.id)
    const offenders = placeholders()
      .map((box) => ({ ...box, why: belongsElsewhere(box.text, area.id) }))
      .filter((x) => x.why)
      .map((x) => `${x.label}: "${x.text}" — ${x.why}`)
    expect(offenders).toEqual([])
  })

  it.each(AREAS.map((a) => [a.label, a] as const))("%s: the systems box asks in its own language too", (_label, area) => {
    openBuilder(area.id, "systems")
    const offenders = placeholders()
      .map((box) => ({ ...box, why: belongsElsewhere(box.text, area.id) }))
      .filter((x) => x.why)
      .map((x) => `${x.label}: "${x.text}" — ${x.why}`)
    expect(offenders).toEqual([])
  })

  /**
   * The prose around a box is a prefill as well. The note under the progression
   * box explained itself with "5 pull-ups → 10 pull-ups → muscle-up" in all
   * twelve areas, which is the same mistake one line lower down.
   */
  it.each(AREAS.map((a) => [a.label, a] as const))("%s: the copy around the boxes as well", (_label, area) => {
    openBuilder(area.id)
    const said = Array.from(document.querySelectorAll("p, span, h2, label"))
      .map((el) => (el.children.length === 0 ? (el.textContent ?? "").trim() : ""))
      .filter((t) => t.length > 0)
    const offenders = said
      .map((text) => ({ text, why: belongsElsewhere(text, area.id) }))
      .filter((x) => x.why)
      .map((x) => `"${x.text}" — ${x.why}`)
    expect(offenders).toEqual([])
  })
})

describe("the name of a goal is editable where the name is", () => {
  /**
   * Reported from the page: "if i change a name of a goal, i cant actually edit
   * the name." The row printed the title as a button and kept the editable copy
   * a line below, visible only once the row was open — so the obvious move did
   * nothing and the field that worked read as a duplicate.
   */
  it("puts the title in a field at rest, and saves what is typed into it", () => {
    const saved: Array<{ id: string; title: string }> = []
    const handlers = new Proxy(
      { onUpdateGoal: (id: string, patch: { title: string }) => saved.push({ id, title: patch.title }) },
      { get: (target, prop) => (prop in target ? (target as never)[prop] : () => {}) },
    ) as unknown as GuideHandlers

    render(<AreaBuilder plan={planWithGoal("lm_money")} today={TODAY} handlers={handlers} areaId="lm_money" only="milestones" />)
    const field = screen.getByLabelText(BUILDER_COPY.editTitle) as HTMLInputElement
    expect(field.value).toBe(NEUTRAL_TITLE)

    fireEvent.change(field, { target: { value: "Twelve k a month, before tax" } })
    fireEvent.blur(field)
    expect(saved).toEqual([{ id: expect.any(String), title: "Twelve k a month, before tax" }])

    // And exactly one field for it: the second copy under the open row is gone.
    fireEvent.click(screen.getByLabelText(`Open ${NEUTRAL_TITLE}`))
    expect(screen.getAllByLabelText(BUILDER_COPY.editTitle)).toHaveLength(1)
  })

  it("shows an area its own prompts and nobody else's", () => {
    // "if i click money, the suggestions should only be around money that i see"
    const plan = emptyNsPlan()
    render(<AreaWants plan={plan} area={plan.areas.find((a) => a.id === "lm_money")!} handlers={HANDLERS} />)
    const offered = WANT_EXAMPLES.filter((w) => screen.queryByText(w.title))
    expect(offered.length).toBeGreaterThan(0)
    expect(offered.every((w) => w.areaId === "lm_money")).toBe(true)
  })
})

describe("the examples come from the area, not from one string", () => {
  it("shows Relationship its own goal example, which is the one that was reported", () => {
    openBuilder("lm_relationship")
    const goalBox = screen.getByLabelText(BUILDER_COPY.title("Relationship")) as HTMLInputElement
    expect(goalBox.placeholder).toContain(areaGoalExample("lm_relationship").want)
    expect(goalBox.placeholder.toLowerCase()).not.toContain("bench")
  })

  it("gives the twelve areas twelve different goal boxes", () => {
    const seen = new Set<string>()
    for (const area of AREAS) {
      openBuilder(area.id)
      seen.add((screen.getByLabelText(BUILDER_COPY.title(area.label)) as HTMLInputElement).placeholder)
      cleanup()
    }
    expect(seen.size).toBe(AREAS.length)
  })

  it("asks Family for a call and Fitness for a lift, in the action box under a goal", () => {
    openBuilder("lm_family")
    expect(screen.getByLabelText(`${BUILDER_COPY.actionAsk} ${NEUTRAL_TITLE}`).getAttribute("placeholder"))
      .toContain(areaGoalExample("lm_family").action)
    cleanup()
    openBuilder("lm_fitness")
    expect(screen.getByLabelText(`${BUILDER_COPY.actionAsk} ${NEUTRAL_TITLE}`).getAttribute("placeholder"))
      .toContain(areaGoalExample("lm_fitness").action)
  })

  it("offers the area's own progression in the scaling tool's own-rungs box", () => {
    openBuilder("lm_money")
    const rungs = screen.getByLabelText(MILESTONE_COPY.ownAsk) as HTMLTextAreaElement
    expect(rungs.placeholder).toBe(areaGoalExample("lm_money").rungs.join("\n"))
    expect(rungs.placeholder.toLowerCase()).not.toContain("pull-up")
  })

  /**
   * An area somebody invented has no catalogue and no keywords, so there is
   * nothing true to illustrate it with. It describes the shape of the box
   * instead of borrowing a life from the twelve.
   */
  it("gives an invented area a neutral box rather than Fitness's", () => {
    const plan = emptyNsPlan()
    const invented = { ...plan.areas[0], id: "custom-surfing", label: "Surfing", custom: true }
    const withArea: NsPlan = { ...plan, areas: [...plan.areas, invented] }
    render(<AreaBuilder plan={withArea} today={TODAY} handlers={HANDLERS} areaId="custom-surfing" only="milestones" />)
    const box = screen.getByLabelText(BUILDER_COPY.title("Surfing")) as HTMLInputElement
    expect(box.placeholder.toLowerCase()).not.toMatch(/bench|squat|gym|girlfriend|mother/)
    expect(box.placeholder).toContain(areaGoalExample("custom-surfing").want)
  })
})
