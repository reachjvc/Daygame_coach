"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { GoalsStep, type GoalsStepTourHandle } from "@/src/goals/components/setup/GoalsStep"
import {
  mockPath, mockSelectedGoals, mockTargets, mockCurveConfigs,
  mockRampConfigs, mockRampEnabled, mockCustomGoals, mockCustomCategories,
  mockTargetDates, mockGoalDates, lifeAreas, daygameByCategory,
  daygameL3Goals, mockSelectedAreas,
} from "./mock-data"
import "./variantd.css"

/* ── Types ─────────────────────────────────────────────── */

type Act = "Foundation" | "Customize" | "Make It Yours"

interface TourStop {
  /** CSS selector for the target element */
  selector: string
  /** Coaching headline (bold, motivational) */
  headline: string
  /** Body copy explaining WHY this matters */
  body: string
  /** Which act of the narrative arc */
  act: Act
  /** Setup function to call before showing the step */
  setup?: () => Promise<void>
  /** Teardown function to call when leaving the step */
  teardown?: () => void
}

/* ── Helper ────────────────────────────────────────────── */

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
  const buttons = document.querySelectorAll("button")
  for (const btn of buttons) {
    if (btn.textContent?.trim().toLowerCase().includes(text.toLowerCase())) {
      return btn as HTMLElement
    }
  }
  return null
}

/* ── Component ─────────────────────────────────────────── */

export default function VariantD() {
  const tourRef = useRef<GoalsStepTourHandle>(null)
  const [selectedGoals, setSelectedGoals] = useState(new Set(mockSelectedGoals))
  const [targets, setTargets] = useState({ ...mockTargets })

  // Tour state
  const [phase, setPhase] = useState<"welcome" | "touring" | "finish" | "idle">("welcome")
  const [stepIdx, setStepIdx] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [animClass, setAnimClass] = useState("vd-overlay-bg--entering")

  /* ── Tour stops definition ─────────────────────────── */

  const stops: TourStop[] = [
    {
      selector: '[data-tour="area-header"]',
      headline: "Everything starts with a direction.",
      body: "This is your life area \u2014 the domain where you're choosing to grow. Every goal below serves this bigger vision.",
      act: "Foundation",
    },
    {
      selector: '[data-tour-role="category"]',
      headline: "Structure creates clarity.",
      body: "Your goals are organized into categories \u2014 like chapters in a book. Each one represents a skill area within your journey.",
      act: "Foundation",
    },
    {
      selector: '[data-tour="preselected-goal"], [data-tour-role="selected-goal"]',
      headline: "We've started you with the essentials.",
      body: "Based on your chosen path, these goals are already active. They're the foundation most guys build on.",
      act: "Foundation",
    },
    {
      selector: '[data-tour-role="unselected-goal"]',
      headline: "But this is YOUR plan.",
      body: "These are waiting for you. Toggle any on to expand what you're tracking. More isn't always better \u2014 choose what matters to you right now.",
      act: "Foundation",
    },
    {
      selector: '[data-tour-role="category"]',
      headline: "There's more to discover.",
      body: "Your plan can grow with you. These hidden categories contain advanced goals for when you're ready.",
      act: "Foundation",
      setup: async () => {
        tourRef.current?.expandAllSections()
        await new Promise((r) => setTimeout(r, 500))
      },
      teardown: () => {
        tourRef.current?.collapseNonPreselected()
      },
    },
    {
      selector: '[data-tour="target-stepper"]',
      headline: "Ambition needs a number.",
      body: "This is where vague intentions become concrete targets. Tap the number to make it yours.",
      act: "Customize",
    },
    {
      selector: '[data-tour="curve-button"]',
      headline: "Progress isn't linear.",
      body: "This opens your milestone curve \u2014 how you'll build up over time. Small wins early, bigger ones later.",
      act: "Customize",
    },
    {
      selector: '[data-tour="curve-editor"]',
      headline: "Design your momentum.",
      body: "Drag the curve to match your reality. Steep = aggressive ramp-up. Gentle = steady climb. There's no wrong answer.",
      act: "Customize",
      setup: async () => {
        tourRef.current?.openCurveEditor("l3_approach_volume")
        await waitForElement('[data-tour="curve-editor"]')
      },
      teardown: () => {
        tourRef.current?.closeCurveEditor()
      },
    },
    {
      selector: '[data-tour="ramp-button"]',
      headline: "Habits need patience.",
      body: "This opens your frequency ramp \u2014 how often you'll practice each week, building up gradually.",
      act: "Customize",
    },
    {
      selector: '[data-tour="ramp-editor"]',
      headline: "No burnout, just growth.",
      body: "Start easy, build up. This ramp ensures you're never overwhelmed. Consistency beats intensity.",
      act: "Customize",
      setup: async () => {
        tourRef.current?.openRampEditor("l3_approach_frequency")
        await waitForElement('[data-tour="ramp-editor"]')
      },
      teardown: () => {
        tourRef.current?.closeRampEditor()
      },
    },
    {
      selector: '[data-tour="date-button"]',
      headline: "Deadlines create urgency.",
      body: "Set a target date for any goal. A dream without a deadline is just a wish.",
      act: "Make It Yours",
    },
    {
      selector: '[data-tour="custom-goal-button"]',
      headline: "Your journey, your rules.",
      body: "None of our templates fit? Create your own goal. The best plan is one you'll actually follow.",
      act: "Make It Yours",
    },
    {
      selector: '[data-tour="custom-category-button"]',
      headline: "Build something new.",
      body: "Create an entirely new category \u2014 maybe something no template covers. This is YOUR system now.",
      act: "Make It Yours",
    },
  ]

  /* ── Positioning logic ─────────────────────────────── */

  const positionTooltip = useCallback((rect: DOMRect) => {
    const tooltipW = 400
    const tooltipH = 280 // approximate
    const pad = 16
    const gap = 14

    let top: number
    let left: number

    // Try below the element first
    if (rect.bottom + gap + tooltipH < window.innerHeight - pad) {
      top = rect.bottom + gap
    } else if (rect.top - gap - tooltipH > pad) {
      // Try above
      top = rect.top - gap - tooltipH
    } else {
      // Fallback: vertically center
      top = Math.max(pad, (window.innerHeight - tooltipH) / 2)
    }

    // Horizontally: try to align left edge with element, but keep on-screen
    left = Math.max(pad, Math.min(rect.left, window.innerWidth - tooltipW - pad))

    return { top, left }
  }, [])

  /* ── Navigate to a step ────────────────────────────── */

  const goToStep = useCallback(async (idx: number) => {
    // Teardown previous step
    const prevStop = stops[stepIdx]
    if (prevStop?.teardown) prevStop.teardown()

    const stop = stops[idx]
    if (!stop) return

    // Run setup if needed
    if (stop.setup) await stop.setup()

    // Find target element — try each selector in a comma-separated list
    let el: HTMLElement | null = null
    const selectors = stop.selector.split(",").map((s) => s.trim())
    for (const sel of selectors) {
      el = document.querySelector(sel) as HTMLElement | null
      if (el) break
    }

    // Fallback: for button-text selectors (steps 11-13), find by text
    if (!el && idx === 10) {
      // Date button — look for CalendarDays icon button
      el = document.querySelector('[data-tour="date-button"]') as HTMLElement
      if (!el) {
        const btns = document.querySelectorAll("button")
        for (const btn of btns) {
          if (btn.querySelector(".lucide-calendar-days, [data-lucide='calendar-days']")) {
            el = btn as HTMLElement
            break
          }
        }
      }
    }
    if (!el && idx === 11) {
      el = document.querySelector('[data-tour="custom-goal-button"]') as HTMLElement
      if (!el) el = findButtonByText("Add custom goal") || findButtonByText("custom goal")
    }
    if (!el && idx === 12) {
      el = document.querySelector('[data-tour="custom-category-button"]') as HTMLElement
      if (!el) el = findButtonByText("Add custom category") || findButtonByText("custom category")
    }

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // Wait for scroll to settle
      await new Promise((r) => setTimeout(r, 350))
      const rect = el.getBoundingClientRect()
      setSpotlightRect(rect)
      setTooltipPos(positionTooltip(rect))
    }

    setStepIdx(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, positionTooltip])

  /* ── Start tour ────────────────────────────────────── */

  const startTour = useCallback(() => {
    setPhase("touring")
    setAnimClass("vd-overlay-bg--visible")
    goToStep(0)
  }, [goToStep])

  const endTour = useCallback(() => {
    // Teardown current step
    const stop = stops[stepIdx]
    if (stop?.teardown) stop.teardown()
    setPhase("finish")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  const dismissTour = useCallback(() => {
    const stop = stops[stepIdx]
    if (stop?.teardown) stop.teardown()
    setPhase("idle")
    setAnimClass("vd-overlay-bg--exiting")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  /* ── Keyboard navigation ───────────────────────────── */

  useEffect(() => {
    if (phase !== "touring") return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault()
        if (stepIdx < stops.length - 1) goToStep(stepIdx + 1)
        else endTour()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (stepIdx > 0) goToStep(stepIdx - 1)
      } else if (e.key === "Escape") {
        e.preventDefault()
        dismissTour()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [phase, stepIdx, goToStep, endTour, dismissTour, stops.length])

  /* ── Entrance animation ────────────────────────────── */

  useEffect(() => {
    if (phase === "welcome") {
      requestAnimationFrame(() => setAnimClass("vd-overlay-bg--visible"))
    }
  }, [phase])

  /* ── Current stop info ─────────────────────────────── */

  const currentStop = phase === "touring" ? stops[stepIdx] : null

  /* ── Render ────────────────────────────────────────── */

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

      {/* ── Welcome overlay ──────────────────────────── */}
      {phase === "welcome" && (
        <div className="vd-welcome">
          <div className="vd-welcome__card">
            <div className="vd-welcome__ember">
              <span role="img" aria-label="flame">&#x1F525;</span>
            </div>
            <h2 className="vd-welcome__title">Let us walk you through your goal setup.</h2>
            <p className="vd-welcome__text">
              Every great transformation starts with a plan. In the next few moments,
              we'll show you how to shape yours &mdash; step by step, at your pace.
            </p>
            <button className="vd-welcome__start" onClick={startTour}>
              Begin the journey
            </button>
            <button className="vd-welcome__dismiss" onClick={dismissTour}>
              I'll explore on my own
            </button>
          </div>
        </div>
      )}

      {/* ── Tour overlay ─────────────────────────────── */}
      {phase === "touring" && (
        <div className="vd-overlay">
          {/* Background */}
          <div className={`vd-overlay-bg ${animClass}`} onClick={dismissTour} />

          {/* Spotlight */}
          {spotlightRect && (
            <div
              className="vd-spotlight"
              style={{
                top: spotlightRect.top - 6,
                left: spotlightRect.left - 6,
                width: spotlightRect.width + 12,
                height: spotlightRect.height + 12,
              }}
            />
          )}

          {/* Tooltip */}
          {currentStop && (
            <div
              className={`vd-tooltip ${spotlightRect ? "vd-tooltip--visible" : "vd-tooltip--entering"}`}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
            >
              {/* Act indicator */}
              <div className="vd-tooltip__act">{currentStop.act}</div>

              {/* Headline */}
              <h3 className="vd-tooltip__headline">{currentStop.headline}</h3>

              {/* Body */}
              <p className="vd-tooltip__body">{currentStop.body}</p>

              {/* Progress */}
              <div className="vd-tooltip__progress">
                <span className="vd-tooltip__step-text">
                  Step {stepIdx + 1} of {stops.length} &mdash; {currentStop.act}
                </span>
                <div className="vd-tooltip__dots">
                  {stops.map((_, i) => (
                    <div
                      key={i}
                      className={`vd-dot${i < stepIdx ? " vd-dot--completed" : ""}${i === stepIdx ? " vd-dot--active" : ""}`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="vd-tooltip__footer">
                <button className="vd-tooltip__skip" onClick={dismissTour}>
                  Skip tour
                </button>
                <div className="vd-tooltip__buttons">
                  {stepIdx > 0 && (
                    <button className="vd-btn vd-btn--back" onClick={() => goToStep(stepIdx - 1)}>
                      &larr; Go back
                    </button>
                  )}
                  {stepIdx < stops.length - 1 ? (
                    <button className="vd-btn vd-btn--next" onClick={() => goToStep(stepIdx + 1)}>
                      Continue the story &rarr;
                    </button>
                  ) : (
                    <button className="vd-btn vd-btn--next" onClick={endTour}>
                      Finish &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Finish overlay ───────────────────────────── */}
      {phase === "finish" && (
        <div className="vd-finish">
          <div className="vd-finish__card">
            <div className="vd-finish__ember">
              <span role="img" aria-label="star">&#x2B50;</span>
            </div>
            <h2 className="vd-finish__title">You're ready. Let's build something great.</h2>
            <p className="vd-finish__text">
              You've seen how every piece fits together. Now it's your turn &mdash;
              customize your goals, set your targets, and make this plan truly yours.
            </p>
            <button className="vd-finish__close" onClick={dismissTour}>
              Start building
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
