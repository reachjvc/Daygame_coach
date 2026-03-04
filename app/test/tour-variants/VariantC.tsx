"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { GoalsStep, type GoalsStepTourHandle } from "@/src/goals/components/setup/GoalsStep"
import {
  mockPath, mockSelectedGoals, mockTargets, mockCurveConfigs,
  mockRampConfigs, mockRampEnabled, mockCustomGoals, mockCustomCategories,
  mockTargetDates, mockGoalDates, lifeAreas, daygameByCategory,
  daygameL3Goals, mockSelectedAreas,
} from "./mock-data"
import "./variantc.css"

/* ── Helpers ─────────────────────────────────────────── */

function waitForElement(selector: string, maxMs = 2000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) resolve(el)
      else if (Date.now() - start > maxMs) resolve(null)
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

function findButtonByText(text: string): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll("button"))
  for (const btn of buttons) {
    if (btn.textContent?.trim().toLowerCase().includes(text.toLowerCase())) {
      return btn as HTMLElement
    }
  }
  return null
}

/* ── Tour stop definitions ───────────────────────────── */

interface TourStop {
  label: string
  body: string
  /** CSS selector, or null if element found via findButtonByText */
  selector: string | null
  /** For button-text-based lookups */
  buttonText?: string
  /** Position hint relative to target */
  position?: "above" | "below"
  /** Async setup before showing this stop */
  setup?: (handle: GoalsStepTourHandle) => Promise<void>
  /** Async teardown when leaving this stop */
  teardown?: (handle: GoalsStepTourHandle) => Promise<void>
}

const STOPS: TourStop[] = [
  {
    label: "Life Area",
    body: "Your goals are organized under life areas. Daygame is the primary area.",
    selector: '[data-tour="area-header"]',
  },
  {
    label: "Categories",
    body: "Each area has sub-categories grouping related skills.",
    selector: '[data-tour-role="category"]',
  },
  {
    label: "Selected Goal",
    body: "Goals with a checkmark are already part of your plan.",
    selector: '[data-tour="preselected-goal"], [data-tour-role="selected-goal"]',
  },
  {
    label: "Available Goal",
    body: "Tap any unchecked goal to add it to your plan.",
    selector: '[data-tour-role="unselected-goal"]',
  },
  {
    label: "Expand All",
    body: "All categories are now visible so you can browse every goal.",
    selector: '[data-tour-role="category"]',
    setup: async (h) => {
      h.expandAllSections()
      await new Promise((r) => setTimeout(r, 500))
    },
    teardown: async (h) => {
      h.collapseNonPreselected()
    },
  },
  {
    label: "Target",
    body: "Use the stepper to set how many reps you want to achieve.",
    selector: '[data-tour="target-stepper"]',
  },
  {
    label: "Curve",
    body: "This button opens the milestone curve editor for this goal.",
    selector: '[data-tour="curve-button"]',
  },
  {
    label: "Curve Editor",
    body: "Design the progression curve — how milestones ramp up over time.",
    selector: '[data-tour="curve-editor"]',
    setup: async (h) => {
      h.openCurveEditor("l3_approach_volume")
      await waitForElement('[data-tour="curve-editor"]')
    },
    teardown: async (h) => {
      h.closeCurveEditor()
    },
  },
  {
    label: "Ramp",
    body: "This button opens the habit ramp editor — for frequency-based goals.",
    selector: '[data-tour="ramp-button"]',
  },
  {
    label: "Ramp Editor",
    body: "Define weekly frequency stages and how long each lasts.",
    selector: '[data-tour="ramp-editor"]',
    setup: async (h) => {
      h.openRampEditor("l3_approach_frequency")
      await waitForElement('[data-tour="ramp-editor"]')
    },
    teardown: async (h) => {
      h.closeRampEditor()
    },
  },
  {
    label: "Date",
    body: "Set a target date for individual goals with the calendar button.",
    selector: null,
    buttonText: undefined, // Will find CalendarDays icon button
    setup: async () => {
      // Find the first CalendarDays button on a selected goal
      await waitForElement('[data-tour-role="selected-goal"]')
    },
  },
  {
    label: "Custom Goal",
    body: "Add your own goals beyond the templates we provide.",
    selector: null,
    buttonText: "Add custom goal",
  },
  {
    label: "Custom Category",
    body: "Create entirely new categories to organize your journey.",
    selector: null,
    buttonText: "Add custom category",
  },
]

const TOTAL_STOPS = STOPS.length

/* ── VariantC Component ──────────────────────────────── */

export default function VariantC() {
  const tourRef = useRef<GoalsStepTourHandle>(null)
  const [selectedGoals, setSelectedGoals] = useState(new Set(mockSelectedGoals))
  const [targets, setTargets] = useState({ ...mockTargets })

  const [tourActive, setTourActive] = useState(false)
  const [currentStop, setCurrentStop] = useState(-1)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [hintPosition, setHintPosition] = useState<"above" | "below">("below")
  const [finished, setFinished] = useState(false)
  const transitioning = useRef(false)

  /* ── Find target element for a stop ─────────────────── */
  const findTarget = useCallback((stop: TourStop): HTMLElement | null => {
    if (stop.selector) {
      return document.querySelector(stop.selector) as HTMLElement | null
    }
    if (stop.buttonText) {
      return findButtonByText(stop.buttonText)
    }
    // Stop 11 (Date): find calendar icon button on selected goals
    if (stop.label === "Date") {
      const selectedGoalRows = Array.from(document.querySelectorAll('[data-tour-role="selected-goal"]'))
      for (const row of selectedGoalRows) {
        const calBtn = row.querySelector('button svg.lucide-calendar-days')?.closest('button') as HTMLElement | null
        if (calBtn) return calBtn
      }
      // Fallback: find any CalendarDays button
      const allCal = Array.from(document.querySelectorAll('button'))
      for (const btn of allCal) {
        if (btn.querySelector('svg.lucide-calendar-days')) return btn as HTMLElement
      }
    }
    return null
  }, [])

  /* ── Position the hint near the target ──────────────── */
  const positionHint = useCallback((el: HTMLElement, preferAbove?: boolean) => {
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    // Decide above or below: prefer below unless target is in bottom third
    const viewH = window.innerHeight
    if (preferAbove || rect.bottom > viewH * 0.7) {
      setHintPosition("above")
    } else {
      setHintPosition("below")
    }
  }, [])

  /* ── Navigate to a stop ─────────────────────────────── */
  const goToStop = useCallback(async (index: number) => {
    if (transitioning.current) return
    if (index < 0 || index >= TOTAL_STOPS) return
    transitioning.current = true

    const handle = tourRef.current
    if (!handle) { transitioning.current = false; return }

    // Teardown previous stop
    const prevIdx = currentStop
    if (prevIdx >= 0 && prevIdx < TOTAL_STOPS) {
      const prevStop = STOPS[prevIdx]
      if (prevStop.teardown) {
        await prevStop.teardown(handle)
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    // Clear visuals briefly for transition
    setTargetRect(null)

    const stop = STOPS[index]

    // Setup
    if (stop.setup) {
      await stop.setup(handle)
      await new Promise((r) => setTimeout(r, 100))
    }

    // Find and position
    const el = findTarget(stop)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      await new Promise((r) => setTimeout(r, 300))
      positionHint(el, stop.position === "above")
    }

    setCurrentStop(index)
    transitioning.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStop, findTarget, positionHint])

  /* ── Advance / go back ──────────────────────────────── */
  const advance = useCallback(() => {
    if (currentStop >= TOTAL_STOPS - 1) {
      // Finish tour
      const handle = tourRef.current
      const stop = STOPS[currentStop]
      if (handle && stop?.teardown) stop.teardown(handle)
      setTourActive(false)
      setTargetRect(null)
      setFinished(true)
      return
    }
    goToStop(currentStop + 1)
  }, [currentStop, goToStop])

  const goBack = useCallback(() => {
    if (currentStop > 0) goToStop(currentStop - 1)
  }, [currentStop, goToStop])

  /* ── Start tour ─────────────────────────────────────── */
  const startTour = useCallback(() => {
    setTourActive(true)
    setFinished(false)
    setCurrentStop(-1)
    // Small delay so React renders, then go to first stop
    setTimeout(() => goToStop(0), 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Keyboard navigation ────────────────────────────── */
  useEffect(() => {
    if (!tourActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        advance()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goBack()
      } else if (e.key === "Escape") {
        e.preventDefault()
        const handle = tourRef.current
        const stop = currentStop >= 0 ? STOPS[currentStop] : null
        if (handle && stop?.teardown) stop.teardown(handle)
        setTourActive(false)
        setTargetRect(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [tourActive, advance, goBack, currentStop])

  /* ── Recalculate position on scroll/resize ──────────── */
  useEffect(() => {
    if (!tourActive || currentStop < 0) return
    const recalc = () => {
      const stop = STOPS[currentStop]
      if (!stop) return
      const el = findTarget(stop)
      if (el) positionHint(el, stop.position === "above")
    }
    window.addEventListener("scroll", recalc, true)
    window.addEventListener("resize", recalc)
    return () => {
      window.removeEventListener("scroll", recalc, true)
      window.removeEventListener("resize", recalc)
    }
  }, [tourActive, currentStop, findTarget, positionHint])

  /* ── Render ─────────────────────────────────────────── */
  const stop = currentStop >= 0 && currentStop < TOTAL_STOPS ? STOPS[currentStop] : null

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
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

      {/* ── Pre-tour: start pill ──────────────────────── */}
      {!tourActive && !finished && (
        <button className="vc-start-pill" onClick={startTour}>
          Take the tour <span>&rarr;</span>
        </button>
      )}

      {/* ── Finished message ──────────────────────────── */}
      {finished && (
        <div className="vc-finish">
          Tour complete &mdash;{" "}
          <button
            onClick={startTour}
            style={{
              background: "none",
              border: "none",
              color: "#007aff",
              cursor: "pointer",
              fontSize: "inherit",
              fontWeight: 600,
              padding: 0,
            }}
          >
            restart
          </button>
        </div>
      )}

      {/* ── Active tour layers ────────────────────────── */}
      {tourActive && (
        <>
          {/* Tap-anywhere zone (behind hint + glow) */}
          <div className="vc-tap-zone" onClick={advance} />

          {/* Glow ring around target */}
          {targetRect && (
            <div
              className="vc-glow"
              style={{
                top: targetRect.top + window.scrollY - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
              }}
            />
          )}

          {/* Hint bubble */}
          {stop && targetRect && (
            <div
              key={currentStop}
              className="vc-hint"
              data-position={hintPosition}
              style={{
                top: hintPosition === "below"
                  ? targetRect.top + window.scrollY + targetRect.height + 10
                  : targetRect.top + window.scrollY - 10,
                left: Math.min(
                  Math.max(targetRect.left, 12),
                  window.innerWidth - 292
                ),
                ...(hintPosition === "above"
                  ? { animation: "vc-fade-in-above 250ms ease-out forwards" }
                  : {}),
              }}
            >
              <div className="vc-hint-text">
                <span className="vc-hint-label">{stop.label}</span>
                <p className="vc-hint-body">{stop.body}</p>
              </div>
              <button
                className="vc-hint-close"
                onClick={(e) => {
                  e.stopPropagation()
                  advance()
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Progress dots */}
          <div className="vc-dots">
            {STOPS.map((_, i) => (
              <button
                key={i}
                className={`vc-dot${
                  i === currentStop
                    ? " vc-dot--active"
                    : i < currentStop
                      ? " vc-dot--completed"
                      : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  goToStop(i)
                }}
              />
            ))}
            <span className="vc-step-counter">
              {currentStop + 1}/{TOTAL_STOPS}
            </span>
          </div>

          {/* Subtle keyboard hint — only on first stop */}
          {currentStop === 0 && (
            <div className="vc-kb-hint">
              arrow keys &middot; space &middot; esc
            </div>
          )}
        </>
      )}
    </div>
  )
}
