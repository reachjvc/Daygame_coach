"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { GoalsStep, type GoalsStepTourHandle } from "@/src/goals/components/setup/GoalsStep"
import {
  mockPath, mockSelectedGoals, mockTargets, mockCurveConfigs,
  mockRampConfigs, mockRampEnabled, mockCustomGoals, mockCustomCategories,
  mockTargetDates, mockGoalDates, lifeAreas, daygameByCategory,
  daygameL3Goals, mockSelectedAreas,
} from "./mock-data"
import "./variantb.css"

/* ── Types ─────────────────────────────────────────────── */

interface TourStop {
  title: string
  body: string
  selector: string | (() => HTMLElement | null)
  setup?: () => Promise<void> | void
  teardown?: () => Promise<void> | void
}

/* ── Helpers ───────────────────────────────────────────── */

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
    if (btn.textContent?.toLowerCase().includes(text.toLowerCase())) return btn
  }
  return null
}

function getPhase(step: number, total: number): "green" | "violet" | "pink" {
  const ratio = step / (total - 1)
  if (ratio < 0.38) return "green"
  if (ratio < 0.72) return "violet"
  return "pink"
}

/** Constellation star positions — arranged in a wave pattern across the minimap */
function getStarPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const x = 16 + t * 168
    const y = 32 + Math.sin(t * Math.PI * 2.5) * 18
    positions.push({ x, y })
  }
  return positions
}

/* ── Particles ─────────────────────────────────────────── */

function Particles({ x, y }: { x: number; y: number }) {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const dist = 30 + Math.random() * 40
    return {
      key: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      delay: Math.random() * 0.3,
    }
  })

  return (
    <div className="vb-particles">
      {particles.map((p) => (
        <div
          key={p.key}
          className="vb-particle"
          style={{
            left: x,
            top: y,
            "--vb-dx": `${p.dx}px`,
            "--vb-dy": `${p.dy}px`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/* ── Constellation minimap ─────────────────────────────── */

function Constellation({
  current,
  total,
  visited,
  onJump,
}: {
  current: number
  total: number
  visited: Set<number>
  onJump: (step: number) => void
}) {
  const stars = getStarPositions(total)

  return (
    <div className="vb-constellation">
      <svg className="vb-constellation-svg" viewBox="0 0 200 64">
        {/* Connection lines */}
        {stars.map((star, i) => {
          if (i === 0) return null
          const prev = stars[i - 1]
          const isActive = i <= current
          return (
            <line
              key={`line-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={star.x}
              y2={star.y}
              className={`vb-constellation-line ${isActive ? "vb-constellation-line--active" : ""}`}
            />
          )
        })}
        {/* Stars */}
        {stars.map((star, i) => {
          let cls = "vb-constellation-star"
          if (i === current) cls += " vb-constellation-star--current"
          else if (visited.has(i)) cls += " vb-constellation-star--visited"
          return (
            <circle
              key={`star-${i}`}
              cx={star.x}
              cy={star.y}
              r={i === current ? 5 : 3.5}
              className={cls}
              onClick={() => onJump(i)}
            />
          )
        })}
      </svg>
    </div>
  )
}

/* ── Main component ────────────────────────────────────── */

export default function VariantB() {
  const tourRef = useRef<GoalsStepTourHandle>(null)
  const [selectedGoals] = useState(new Set(mockSelectedGoals))
  const [targets] = useState({ ...mockTargets })

  const [tourActive, setTourActive] = useState(false)
  const [showStart, setShowStart] = useState(true)
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [visited, setVisited] = useState<Set<number>>(new Set())
  const [particleBurst, setParticleBurst] = useState<{ x: number; y: number; id: number } | null>(null)
  const particleIdRef = useRef(0)

  /* ── Tour stop definitions ───────────────────────────── */

  const stops: TourStop[] = [
    {
      title: "Life Areas",
      body: "Your goals are organized by life area. Each area represents a dimension of personal growth.",
      selector: '[data-tour="area-header"]',
    },
    {
      title: "Categories",
      body: "Within each area, goals are grouped into categories that help you focus on specific skills.",
      selector: '[data-tour-role="category"]',
    },
    {
      title: "Pre-selected Goals",
      body: "These goals come pre-selected based on your chosen path. They form the core of your development plan.",
      selector: () =>
        (document.querySelector('[data-tour="preselected-goal"]') as HTMLElement) ||
        (document.querySelector('[data-tour-role="selected-goal"]') as HTMLElement),
    },
    {
      title: "Available Goals",
      body: "Toggle additional goals on or off. Add ones that resonate, skip ones that don't fit yet.",
      selector: '[data-tour-role="unselected-goal"]',
    },
    {
      title: "Explore Everything",
      body: "All sections are now expanded so you can see the full goal catalog at a glance.",
      selector: '[data-tour="area-header"]',
      setup: async () => {
        tourRef.current?.expandAllSections()
        await new Promise((r) => setTimeout(r, 500))
      },
      teardown: () => {
        tourRef.current?.collapseNonPreselected()
      },
    },
    {
      title: "Set Your Targets",
      body: "Adjust the number for each milestone goal. The stepper lets you dial in exactly what you're aiming for.",
      selector: '[data-tour="target-stepper"]',
    },
    {
      title: "Curve Editor Button",
      body: "Open the curve editor to control how your milestones ramp up over time.",
      selector: '[data-tour="curve-button"]',
    },
    {
      title: "Milestone Curve",
      body: "Shape your progression curve. Adjust tension to front-load or back-load your milestone targets.",
      selector: '[data-tour="curve-editor"]',
      setup: async () => {
        tourRef.current?.openCurveEditor("l3_approach_volume")
        await waitForElement('[data-tour="curve-editor"]')
      },
      teardown: () => {
        tourRef.current?.closeCurveEditor()
      },
    },
    {
      title: "Ramp Editor Button",
      body: "For habit-based goals, open the ramp editor to define progressive frequency increases.",
      selector: '[data-tour="ramp-button"]',
    },
    {
      title: "Habit Ramp Plan",
      body: "Define phases with increasing frequency. Each step pushes you a bit further as you build the habit.",
      selector: '[data-tour="ramp-editor"]',
      setup: async () => {
        tourRef.current?.openRampEditor("l3_approach_frequency")
        await waitForElement('[data-tour="ramp-editor"]')
      },
      teardown: () => {
        tourRef.current?.closeRampEditor()
      },
    },
    {
      title: "Goal Dates",
      body: "Set a target date for individual goals. This anchors your curve and ramp timelines.",
      selector: () => {
        // Find a calendar icon button on a selected goal
        const calBtns = Array.from(document.querySelectorAll("button"))
        for (const btn of calBtns) {
          if (btn.querySelector("svg") && btn.closest("[data-tour-role='selected-goal'], [data-tour='preselected-goal']")) {
            const svg = btn.querySelector("svg")
            if (svg && btn.textContent?.trim() === "" || btn.querySelector('[class*="calendar"], [class*="Calendar"]')) {
              return btn
            }
          }
        }
        // Fallback: find any button near a date element
        const dateEl = document.querySelector("[data-tour='goal-date-button']") as HTMLElement
        return dateEl
      },
    },
    {
      title: "Custom Goals",
      body: "Add your own goals that don't fit the templates. Make this plan truly yours.",
      selector: () => findButtonByText("Add custom goal"),
    },
    {
      title: "Custom Categories",
      body: "Create entirely new categories to organize goals your way. The framework adapts to you.",
      selector: () => findButtonByText("Add custom category"),
    },
  ]

  const totalStops = stops.length

  /* ── Resolve element for current stop ────────────────── */

  const resolveElement = useCallback((stop: TourStop): HTMLElement | null => {
    if (typeof stop.selector === "function") return stop.selector()
    return document.querySelector(stop.selector) as HTMLElement | null
  }, [])

  /* ── Navigate to a step ──────────────────────────────── */

  const goToStep = useCallback(async (newStep: number) => {
    const currentStop = stops[step]
    if (currentStop?.teardown) {
      await currentStop.teardown()
    }

    const nextStop = stops[newStep]
    if (nextStop?.setup) {
      await nextStop.setup()
    }

    setStep(newStep)
    setVisited((prev) => new Set(prev).add(newStep))

    // Particle burst at transition
    particleIdRef.current++
    const el = resolveElement(nextStop)
    if (el) {
      const rect = el.getBoundingClientRect()
      setParticleBurst({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        id: particleIdRef.current,
      })
      setTimeout(() => setParticleBurst(null), 1600)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, resolveElement])

  /* ── Track target element rect ───────────────────────── */

  useEffect(() => {
    if (!tourActive) return

    const update = () => {
      const currentStop = stops[step]
      if (!currentStop) return
      const el = resolveElement(currentStop)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
        // Scroll into view if needed
        const viewH = window.innerHeight
        if (rect.top < 80 || rect.bottom > viewH - 100) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      } else {
        setTargetRect(null)
      }
    }

    update()
    const interval = setInterval(update, 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, step, resolveElement])

  /* ── Keyboard navigation ─────────────────────────────── */

  useEffect(() => {
    if (!tourActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault()
        if (step < totalStops - 1) goToStep(step + 1)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (step > 0) goToStep(step - 1)
      } else if (e.key === "Escape") {
        e.preventDefault()
        endTour()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, step])

  /* ── Tour lifecycle ──────────────────────────────────── */

  const startTour = async () => {
    setShowStart(false)
    setTourActive(true)
    setStep(0)
    setVisited(new Set([0]))

    const firstStop = stops[0]
    if (firstStop?.setup) await firstStop.setup()
  }

  const endTour = async () => {
    const currentStop = stops[step]
    if (currentStop?.teardown) await currentStop.teardown()
    setTourActive(false)
  }

  /* ── Tooltip positioning ─────────────────────────────── */

  const getTooltipPos = (): React.CSSProperties => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }

    const pad = 16
    const tooltipW = 340
    const tooltipH = 200 // estimated
    const viewW = window.innerWidth
    const viewH = window.innerHeight

    // Prefer below
    let top = targetRect.bottom + pad
    let left = targetRect.left + targetRect.width / 2 - tooltipW / 2

    // If too far down, go above
    if (top + tooltipH > viewH - 80) {
      top = targetRect.top - tooltipH - pad
    }

    // Clamp horizontal
    if (left < 12) left = 12
    if (left + tooltipW > viewW - 12) left = viewW - tooltipW - 12

    // If still off screen vertically, center
    if (top < 12) top = targetRect.bottom + pad

    return { top, left }
  }

  /* ── Orb position (near the target, top-right corner) ── */

  const getOrbPos = (): React.CSSProperties => {
    if (!targetRect) return { display: "none" }
    return {
      top: targetRect.top - 10,
      left: targetRect.right + 6,
    }
  }

  /* ── Phase class ─────────────────────────────────────── */

  const phase = getPhase(step, totalStops)

  /* ── Render ──────────────────────────────────────────── */

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

      {/* ── Start screen ──────────────────────────────── */}
      {showStart && (
        <div className="vb-start-screen">
          <div className="vb-start-card">
            <div className="vb-start-title">Aurora Guide</div>
            <div className="vb-start-subtitle">
              Navigate 13 constellations of goal-setting features.
              Each star reveals a new capability.
            </div>
            <button className="vb-start-btn" onClick={startTour}>
              Begin the Journey
            </button>
          </div>
        </div>
      )}

      {/* ── Active tour overlay ────────────────────────── */}
      {tourActive && (
        <div className={`vb-phase-${phase}`}>
          {/* Backdrop */}
          <div className="vb-overlay">
            <div className="vb-overlay-bg" />
          </div>

          {/* Highlight cutout + click window */}
          {targetRect && (
            <>
              <div
                className="vb-highlight"
                style={{
                  top: targetRect.top - 4,
                  left: targetRect.left - 4,
                  width: targetRect.width + 8,
                  height: targetRect.height + 8,
                }}
              />
              <div
                className="vb-click-window"
                style={{
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height,
                }}
              />
            </>
          )}

          {/* Floating orb */}
          <div className="vb-orb" style={getOrbPos()} />

          {/* Particle burst */}
          {particleBurst && (
            <Particles key={particleBurst.id} x={particleBurst.x} y={particleBurst.y} />
          )}

          {/* Tooltip */}
          <div className="vb-tooltip" style={getTooltipPos()}>
            <div className="vb-tooltip-card">
              <div className="vb-tooltip-step">
                <span className="vb-tooltip-step-number">
                  Star {step + 1} of {totalStops}
                </span>
              </div>
              <div className="vb-tooltip-title">{stops[step].title}</div>
              <div className="vb-tooltip-body">{stops[step].body}</div>
              <div className="vb-tooltip-nav">
                <div style={{ display: "flex", gap: 6 }}>
                  {step > 0 && (
                    <button
                      className="vb-tooltip-btn vb-tooltip-btn--back"
                      onClick={() => goToStep(step - 1)}
                    >
                      Back
                    </button>
                  )}
                  {step === 0 && (
                    <button
                      className="vb-tooltip-btn vb-tooltip-btn--skip"
                      onClick={endTour}
                    >
                      Skip tour
                    </button>
                  )}
                </div>
                {step < totalStops - 1 ? (
                  <button
                    className="vb-tooltip-btn vb-tooltip-btn--next"
                    onClick={() => goToStep(step + 1)}
                  >
                    Next star
                  </button>
                ) : (
                  <button
                    className="vb-tooltip-btn vb-tooltip-btn--finish"
                    onClick={endTour}
                  >
                    Complete
                  </button>
                )}
              </div>
              <div className="vb-keyhint">
                <kbd>&larr;</kbd><kbd>&rarr;</kbd> navigate
                &nbsp;&middot;&nbsp;
                <kbd>Esc</kbd> exit
              </div>
            </div>
          </div>

          {/* Constellation minimap */}
          <Constellation
            current={step}
            total={totalStops}
            visited={visited}
            onJump={(s) => goToStep(s)}
          />
        </div>
      )}

      {/* ── Restart button (when tour is ended) ────────── */}
      {!showStart && !tourActive && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
          <button
            className="vb-start-btn"
            style={{ fontSize: 14, padding: "8px 20px" }}
            onClick={() => {
              setShowStart(true)
            }}
          >
            Restart Tour
          </button>
        </div>
      )}
    </div>
  )
}
