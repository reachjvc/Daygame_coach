// @vitest-environment jsdom
/**
 * Family and Friends are not offered "Get a Girlfriend" (Plans/rebrand-10kdaysclub.md, Phase 6).
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { GoalLibrary } from "@/src/goals/components/north-star/GoalLibrary"
import { AREA_OFFERS } from "@/src/goals/data/northStarBuild"
import type { NsArea, NsPlan } from "@/src/goals/types"

afterEach(cleanup)

describe("the goal list for Family and Friends", () => {
  it.each(["lm_family", "lm_friends"])("%s shows its note, not the dating objectives", (id) => {
    render(<GoalLibrary area={{ id } as NsArea} plan={{} as NsPlan} onAddTarget={() => {}} onAddTemplate={() => {}} />)
    expect(screen.getByTestId("goal-library-none")).toHaveTextContent(AREA_OFFERS[id].note!)
    expect(screen.queryByText(/Girlfriend/)).toBeNull()
    expect(screen.queryByText(/Date Abundantly/)).toBeNull()
  })

  it("Relationship still offers them", () => {
    render(<GoalLibrary area={{ id: "lm_relationship" } as NsArea} plan={{ goals: [] } as unknown as NsPlan} onAddTarget={() => {}} onAddTemplate={() => {}} />)
    expect(screen.queryByTestId("goal-library-none")).toBeNull()
  })
})
