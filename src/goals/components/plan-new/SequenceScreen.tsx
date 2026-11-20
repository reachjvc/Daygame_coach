"use client"

import type { Screen, Sequence } from "@/src/goals/planSteps/planSequences"
import { RealShell } from "./RealShell"
import { RealStepHost } from "./RealStep"
import { RealStepView } from "./RealStepViews"

/**
 * ONE SCREEN OF THE ACTIVE SEQUENCE (Plans/plan-new-from-real.md, Phase 4.2).
 *
 * The real step part inside the real tool's own shell (`RealShell`): header, step picker, the part, "Still to fill in",
 * "Your plan, read back", and the bar between steps with the real words. A `build` screen has that bar at the bottom,
 * a `daily` screen at the top under the site's bar, as `NorthStarFlow` draws them. The bar is the only Next, so the real
 * part's own step-advance button is hidden on a build screen.
 */
export function SequenceScreen({ seq, screen }: { seq: Sequence; screen: Screen }) {
  return (
    <div data-testid={`sequence-${screen.id}`}>
      <RealStepHost stepId={screen.step} sequence={seq} screen={screen} framed={screen.kind === "build"} showRibbon={false}>
        <RealShell seq={seq}>
          <RealStepView />
        </RealShell>
      </RealStepHost>
    </div>
  )
}
