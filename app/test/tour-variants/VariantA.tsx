"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { GoalsStep, type GoalsStepTourHandle } from "@/src/goals/components/setup/GoalsStep"
import {
  mockPath,
  mockSelectedGoals,
  mockTargets,
  mockCurveConfigs,
  mockRampConfigs,
  mockRampEnabled,
  mockCustomGoals,
  mockCustomCategories,
  mockTargetDates,
  mockGoalDates,
  lifeAreas,
  daygameByCategory,
  daygameL3Goals,
  mockSelectedAreas,
} from "./mock-data"
import "./varianta.css"

/* ── Helpers ────────────────────────────────────────────────── */

function waitForElement(
  selectorOrFn: string | (() => HTMLElement | null),
  maxMs = 2000
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const el =
        typeof selectorOrFn === "string"
          ? (document.querySelector(selectorOrFn) as HTMLElement | null)
          : selectorOrFn()
      if (el) resolve(el)
      else if (Date.now() - start > maxMs) resolve(null)
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

function findButtonByText(text: string): HTMLElement | null {
  const buttons = document.querySelectorAll("button")
  for (const btn of buttons) {
    if (btn.textContent?.toLowerCase().includes(text.toLowerCase())) {
      return btn as HTMLElement
    }
  }
  return null
}

/* ── Tour step definitions ──────────────────────────────────── */

interface TourStepDef {
  title: string
  body: string
  selector: string | (() => HTMLElement | null)
  setup?: (handle: GoalsStepTourHandle) => void | Promise<void>
  teardown?: (handle: GoalsStepTourHandle) => void
  waitAfterSetup?: number
}

const TOUR_STEPS: TourStepDef[] = [
  {
    title: "Life Areas",
    body: "Your goals are organized under life areas. Each area represents a major domain you want to improve.",
    selector: '[data-tour="area-header"]',
  },
  {
    title: "Categories",
    body: "Categories group related goals together, making it easy to focus on specific skills within an area.",
    selector: '[data-tour-role="category"]',
  },
  {
    title: "Pre-selected Goals",
    body: "These goals were pre-selected based on your chosen path. They form the recommended foundation for your journey.",
    selector: '[data-tour="preselected-goal"], [data-tour-role="selected-goal"]',
  },
  {
    title: "Available Goals",
    body: "Toggle these to add them to your plan. You can always change your selection later.",
    selector: '[data-tour-role="unselected-goal"]',
  },
  {
    title: "All Categories",
    body: "Expanding all sections lets you see every category at a glance and discover goals you might have missed.",
    selector: '[data-tour-role="category"]',
    setup: (handle) => handle.expandAllSections(),
    teardown: (handle) => handle.collapseNonPreselected(),
    waitAfterSetup: 500,
  },
  {
    title: "Target Stepper",
    body: "Tap the number to set your target. This defines how much you want to achieve for this goal.",
    selector: '[data-tour="target-stepper"]',
  },
  {
    title: "Curve Editor Button",
    body: "Opens your milestone progression curve. Define how your targets ramp up over time.",
    selector: '[data-tour="curve-button"]',
  },
  {
    title: "Curve Editor",
    body: "The curve editor lets you visualize and adjust your milestone ladder. Drag the tension to make progression linear or exponential.",
    selector: '[data-tour="curve-editor"]',
    setup: (handle) => handle.openCurveEditor("l3_approach_volume"),
    teardown: (handle) => handle.closeCurveEditor(),
  },
  {
    title: "Ramp Button",
    body: "Opens your habit frequency ramp. Build habits gradually instead of going all-in from day one.",
    selector: '[data-tour="ramp-button"]',
  },
  {
    title: "Ramp Editor",
    body: "The ramp editor lets you set weekly frequency targets across phases. Start easy and build momentum.",
    selector: '[data-tour="ramp-editor"]',
    setup: (handle) => handle.openRampEditor("l3_approach_frequency"),
    teardown: (handle) => handle.closeRampEditor(),
  },
  {
    title: "Goal Date",
    body: "Set a target date for individual goals. This helps you stay accountable and track progress against deadlines.",
    selector: () => {
      const icon = document.querySelector(
        '[data-tour-role="selected-goal"] button svg.lucide-calendar-days'
      )
      return (icon?.closest("button") as HTMLElement) ?? null
    },
  },
  {
    title: "Custom Goal",
    body: "Create your own goals within any category. If the templates don't cover something you want to track, add it here.",
    selector: () => findButtonByText("Add custom goal"),
  },
  {
    title: "Custom Category",
    body: "Create entirely new categories to organize goals that don't fit existing groups.",
    selector: () => findButtonByText("Add custom category"),
  },
]

/* ── Tooltip positioning ────────────────────────────────────── */

function getTooltipPosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number
): { top: number; left: number } {
  const padding = 12
  const viewW = window.innerWidth
  const viewH = window.innerHeight

  // Try below
  const belowTop = targetRect.bottom + padding
  if (belowTop + tooltipHeight < viewH - padding) {
    return {
      top: belowTop,
      left: clampX(targetRect.left, tooltipWidth, viewW, padding),
    }
  }

  // Try above
  const aboveTop = targetRect.top - tooltipHeight - padding
  if (aboveTop > padding) {
    return {
      top: aboveTop,
      left: clampX(targetRect.left, tooltipWidth, viewW, padding),
    }
  }

  // Fallback: right side
  return {
    top: Math.max(padding, Math.min(targetRect.top, viewH - tooltipHeight - padding)),
    left: Math.min(targetRect.right + padding, viewW - tooltipWidth - padding),
  }
}

function clampX(preferredLeft: number, width: number, viewW: number, padding: number): number {
  return Math.max(padding, Math.min(preferredLeft, viewW - width - padding))
}

/* ── Main Component ─────────────────────────────────────────── */

type TourPhase = "welcome" | "touring" | "finished" | "idle"

export default function VariantA() {
  const tourRef = useRef<GoalsStepTourHandle>(null)
  const [selectedGoals] = useState(new Set(mockSelectedGoals))
  const [targets] = useState({ ...mockTargets })

  const [phase, setPhase] = useState<TourPhase>("welcome")
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  // Run setup/teardown and find the target element
  const activateStep = useCallback(
    async (stepIndex: number) => {
      if (!tourRef.current) return
      setTooltipVisible(false)

      const step = TOUR_STEPS[stepIndex]

      // Run setup if needed
      if (step.setup) {
        step.setup(tourRef.current)
      }

      // Wait for animations or setup
      if (step.waitAfterSetup) {
        await new Promise((r) => setTimeout(r, step.waitAfterSetup))
      }

      // Find the target element
      const el = await waitForElement(step.selector)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        // Small delay for scroll to settle
        await new Promise((r) => setTimeout(r, 200))
        setTargetRect(el.getBoundingClientRect())
      } else {
        // Element not found, use center-screen fallback
        setTargetRect(new DOMRect(window.innerWidth / 2 - 100, window.innerHeight / 2 - 20, 200, 40))
      }

      // Slight delay before showing tooltip for smooth entrance
      requestAnimationFrame(() => {
        setTooltipVisible(true)
      })
    },
    []
  )

  // Navigate steps
  const goTo = useCallback(
    (stepIndex: number) => {
      if (!tourRef.current) return
      // Teardown current step
      const prevStep = TOUR_STEPS[currentStep]
      if (prevStep.teardown) {
        prevStep.teardown(tourRef.current)
      }
      setCurrentStep(stepIndex)
    },
    [currentStep]
  )

  const goNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      goTo(currentStep + 1)
    } else {
      // Teardown last step
      if (tourRef.current) {
        const lastStep = TOUR_STEPS[currentStep]
        if (lastStep.teardown) lastStep.teardown(tourRef.current)
      }
      setPhase("finished")
    }
  }, [currentStep, goTo])

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      goTo(currentStep - 1)
    }
  }, [currentStep, goTo])

  const skipTour = useCallback(() => {
    if (tourRef.current) {
      const step = TOUR_STEPS[currentStep]
      if (step.teardown) step.teardown(tourRef.current)
    }
    setPhase("idle")
  }, [currentStep])

  const startTour = useCallback(() => {
    setCurrentStep(0)
    setPhase("touring")
  }, [])

  // Activate step when it changes
  useEffect(() => {
    if (phase === "touring") {
      activateStep(currentStep)
    }
  }, [currentStep, phase, activateStep])

  // Keyboard navigation
  useEffect(() => {
    if (phase !== "touring") return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault()
        goNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goBack()
      } else if (e.key === "Escape") {
        e.preventDefault()
        skipTour()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [phase, goNext, goBack, skipTour])

  // Update rect on scroll/resize during touring
  useEffect(() => {
    if (phase !== "touring") return
    let raf = 0
    const update = () => {
      const step = TOUR_STEPS[currentStep]
      const el =
        typeof step.selector === "string"
          ? (document.querySelector(step.selector) as HTMLElement | null)
          : step.selector()
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      }
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [phase, currentStep])

  const step = TOUR_STEPS[currentStep]
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100

  // Calculate tooltip position
  const tooltipPos = targetRect
    ? getTooltipPosition(targetRect, 360, 220)
    : { top: 100, left: 100 }

  return (
    <div style={{ position: "relative" }}>
      <GoalsStep
        ref={tourRef}
        daygameByCategory={daygameByCategory}
        daygameL3Goals={daygameL3Goals}
        lifeAreas={lifeAreas}
        selectedAreas={mockSelectedAreas}
        selectedGoals={selectedGoals}
        targets={targets}
        curveConfigs={mockCurveConfigs}
        rampConfigs={mockRampConfigs}
        rampEnabled={mockRampEnabled}
        customGoals={mockCustomGoals}
        customCategories={mockCustomCategories}
        path={mockPath}
        targetDates={mockTargetDates}
        goalDates={mockGoalDates}
        onToggle={() => {}}
        onUpdateTarget={() => {}}
        onUpdateCurve={() => {}}
        onUpdateRamp={() => {}}
        onToggleRamp={() => {}}
        onAddCustomGoal={() => {}}
        onRemoveCustomGoal={() => {}}
        onUpdateCustomGoalTitle={() => {}}
        onAddCustomCategory={() => {}}
        onRenameCustomCategory={() => {}}
        onRemoveCustomCategory={() => {}}
        onUpdateGoalDate={() => {}}
      />

      {/* ── Welcome screen ─────────────────────────────── */}
      {phase === "welcome" && (
        <div className="va-welcome">
          <div className="va-welcome__card">
            <div className="va-welcome__icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <h2 className="va-welcome__title">Goals Setup Tour</h2>
            <p className="va-welcome__text">
              Take a quick 13-step walkthrough of the goals configuration screen.
              Learn how life areas, categories, targets, and curves work together.
            </p>
            <div className="va-welcome__actions">
              <button className="va-welcome__start" onClick={startTour}>
                Start Tour
              </button>
              <button className="va-welcome__dismiss" onClick={() => setPhase("idle")}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active tour overlay ────────────────────────── */}
      {phase === "touring" && targetRect && (
        <>
          {/* Spotlight */}
          <div
            className="va-spotlight"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
          />

          {/* Tooltip */}
          <div
            className={`va-tooltip ${tooltipVisible ? "va-tooltip--visible" : "va-tooltip--entering"}`}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
          >
            <div className="va-tooltip__header">
              <span className="va-tooltip__step-label">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <button className="va-tooltip__skip" onClick={skipTour}>
                Skip tour
              </button>
            </div>

            <div className="va-progress">
              <div className="va-progress__bar" style={{ width: `${progress}%` }} />
            </div>

            <h3 className="va-tooltip__title">{step.title}</h3>
            <p className="va-tooltip__body">{step.body}</p>

            <div className="va-tooltip__footer">
              <div className="va-tooltip__hotkeys">
                <span className="va-hotkey">Esc</span>
                <span className="va-hotkey">&larr;</span>
                <span className="va-hotkey">&rarr;</span>
              </div>
              <div className="va-tooltip__buttons">
                {currentStep > 0 && (
                  <button className="va-btn va-btn--secondary" onClick={goBack}>
                    Back
                  </button>
                )}
                <button className="va-btn va-btn--primary" onClick={goNext}>
                  {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Finish screen ──────────────────────────────── */}
      {phase === "finished" && (
        <div className="va-finish">
          <div className="va-finish__card">
            <div className="va-finish__check">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="va-finish__title">Tour Complete</h2>
            <p className="va-finish__text">
              You now know how the goals setup works. Go ahead and customize
              your goals, targets, and progression curves.
            </p>
            <button className="va-finish__close" onClick={() => setPhase("idle")}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Restart tour button (idle state) ───────────── */}
      {phase === "idle" && (
        <button
          onClick={() => setPhase("welcome")}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 500,
            color: "#a0a4b8",
            background: "rgba(24, 24, 32, 0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Restart Tour
        </button>
      )}
    </div>
  )
}
