"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { TAB_LABELS } from "@/src/goals/data/northStar"
import { bottomBarCopy } from "@/src/goals/planSteps/copy/common"
import { nextScreen, prevScreen, screenRoute, type Screen, type Sequence } from "@/src/goals/planSteps/planSequences"
import { ROUTES } from "@/src/shared/routes"
import { RealStepHost } from "./RealStep"
import { RealStepView } from "./RealStepViews"
import { SaveIndicator, btnPrimary, btnQuiet } from "./ui"

/**
 * ONE SCREEN OF THE ACTIVE SEQUENCE (Plans/plan-new-from-real.md, Phase 4.2).
 *
 * A `build` screen is the real step part inside a Frame: Back, the save state, Next. The bar is the first rebuild's
 * (`SaveIndicator`, its buttons and labels); the real part draws everything above it, and its own step-advance button
 * is hidden so there is one Next. A `daily` screen is the real part full width with no Frame.
 */
export function SequenceScreen({ seq, screen }: { seq: Sequence; screen: Screen }) {
  const framed = screen.kind === "build"
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6" data-testid={`sequence-${screen.id}`}>
      <RealStepHost stepId={screen.step} sequence={seq} framed={framed}>
        <RealStepView />
      </RealStepHost>
      {framed && <FrameBar seq={seq} screen={screen} />}
    </div>
  )
}

function FrameBar({ seq, screen }: { seq: Sequence; screen: Screen }) {
  const router = useRouter()
  const prev = prevScreen(seq, screen)
  const next = nextScreen(seq, screen)
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label={TAB_LABELS[screen.step]}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="w-[88px] shrink-0">
          <Link href={prev ? screenRoute(seq, prev) : ROUTES.planNew} className={`${btnQuiet} w-full`} data-testid="back">
            <span aria-hidden>‹</span> {bottomBarCopy.back}
          </Link>
        </div>
        <div className="flex min-w-0 flex-1 justify-center">
          <SaveIndicator />
        </div>
        <div className="shrink-0">
          {next && (
            <button type="button" className={`${btnPrimary} min-w-[88px]`} onClick={() => router.push(screenRoute(seq, next))} data-testid="next">
              {bottomBarCopy.next} <span aria-hidden>›</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
