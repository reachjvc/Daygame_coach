/**
 * The if-then check the help door runs on a plan before it keeps it.
 *
 * `planProblem` is the one export of `viceService` that product code imports:
 * `HelpDoor` (mounted by /life-mastery/quit-vice) checks its call-plan form with it.
 * Everything else in that service serves only the archived lab, so its tests were
 * retired with the lab's; these five came out of `viceService.test.ts` to stay.
 *
 * Worth knowing: the call-plan form renders only when a caller passes `onPlan`, and
 * the live page's mount does not — today only the archive's call sites do. So this
 * guards a branch of a live component that one prop would switch on.
 */

import { describe, it, expect } from "vitest"
import { planProblem } from "@/src/vice/viceService"

describe("if-then plans — negations are refused, not discouraged", () => {
  it("rejects a plan that names what you will not do", () => {
    // A plan phrased as an omission measurably backfires, worst in the people
    // whose habit is strongest, so this has to be a refusal rather than a hint.
    expect(planProblem({ when: "someone offers me one", then: "not take it" })).toBe("negation")
    expect(planProblem({ when: "it gets to six", then: "avoid the kitchen" })).toBe("negation")
    expect(planProblem({ when: "friday", then: "resist it" })).toBe("negation")
    expect(planProblem({ when: "friday", then: "I won't go" })).toBe("negation")
  })

  it("accepts a plan that names an action", () => {
    expect(planProblem({ when: "it gets to six", then: "put the kettle on before I take my coat off" })).toBeNull()
  })

  it("does not fire on words that merely contain a negation", () => {
    // "notice" contains "not", "stopping" is a real action. A validator that
    // cries wolf gets ignored, which costs more than the rule earns.
    expect(planProblem({ when: "I get in", then: "notice where my hands are and start cooking" })).toBeNull()
    expect(planProblem({ when: "the walk home", then: "stop at the shop for something to drink" })).toBeNull()
  })

  it("rejects a cue you could not photograph", () => {
    expect(planProblem({ when: "when I feel like it", then: "go for a walk" })).toBe("vague")
  })

  it("names the empty field rather than failing silently", () => {
    expect(planProblem({ when: "", then: "walk" })).toContain("when")
    expect(planProblem({ when: "six o'clock", then: "" })).toContain("then")
  })
})
