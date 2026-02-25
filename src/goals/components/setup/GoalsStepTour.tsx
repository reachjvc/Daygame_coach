"use client"

import { useEffect, useRef, useReducer, useCallback, useState } from "react"
import type { GoalsStepTourHandle } from "./GoalsStep"

/* ── Helpers ─────────────────────────────────────────── */

function waitForElement(selector: string, maxMs = 2000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) {
        resolve(el)
      } else if (Date.now() - start > maxMs) {
        resolve(null)
      } else {
        requestAnimationFrame(check)
      }
    }
    requestAnimationFrame(check)
  })
}

function addRing(el: HTMLElement | null) {
  el?.classList.add("tour-ring")
}

function removeRing(el: HTMLElement | null) {
  el?.classList.remove("tour-ring")
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/* ── Step config ─────────────────────────────────────── */

interface TourAnnotation {
  selector: string
  label: string
}

interface TourPhase {
  caption: string
  /** querySelectorAll pattern to find all elements for this phase */
  selector: string
  /** Label function: given 0-based index and total count */
  label: (index: number, total: number) => string
  /** Max number of annotation labels to show (rest get ring only). Default: all */
  maxLabels?: number
  /** Called when this phase activates (phases 1+). Return promise to wait before applying. */
  onEnter?: (handle: GoalsStepTourHandle) => Promise<void>
  /** If true, don't scroll when this phase activates */
  skipScroll?: boolean
  /** Override auto-advance duration for this phase (ms). Default: PHASE_DURATION_MS */
  durationMs?: number
}

interface TourStep {
  id: string
  target: string
  caption: string
  /** Override which element to scroll into view (defaults to target) */
  scrollTo?: string
  /** Red arrow annotations pointing at multiple elements */
  annotations?: TourAnnotation[]
  /** Rolling phase animation within a single step */
  phases?: TourPhase[]
  setup?: (handle: GoalsStepTourHandle) => Promise<void>
  teardown?: (handle: GoalsStepTourHandle) => void
}

interface BuildStepsOpts {
  firstCurveGoalId: string | null
  firstRampGoalId: string | null
  firstCurveSectionId: string | null
}

const PHASE_DURATION_MS = 3000

function buildSteps(opts: BuildStepsOpts): TourStep[] {
  const { firstCurveGoalId, firstRampGoalId } = opts

  const steps: TourStep[] = [
    {
      id: "life-area",
      target: '[data-tour="area-header"]',
      caption: "Your goals are organized under this life area.",
      phases: [{
        caption: "Your goals are organized under this life area.",
        selector: '[data-tour="area-header"]',
        label: () => "Chosen life area",
      }],
    },
    {
      id: "sub-categories",
      target: '[data-tour-role="category"]',
      caption: "Each area has sub-categories to organize your goals.",
      phases: [{
        caption: "Each area has sub-categories to organize your goals.",
        selector: '[data-tour-role="category"]',
        label: (i) => `${ordinal(i + 1)} sub-category`,
      }],
    },
    {
      id: "preselected",
      target: '[data-tour-role="selected-goal"]',
      caption: "These are pre-selected based on your path — toggle any off.",
      phases: [{
        caption: "These are pre-selected based on your path — toggle any off.",
        selector: '[data-tour-role="selected-goal"]',
        label: (_, total) => `Pre-selected (${total})`,
        maxLabels: 1,
      }],
    },
    {
      id: "available",
      target: '[data-tour-role="unselected-goal"]',
      caption: "Toggle these on to expand your plan.",
      phases: [{
        caption: "Toggle these on to expand your plan.",
        selector: '[data-tour-role="unselected-goal"]',
        label: (_, total) => `${total} more available`,
        maxLabels: 1,
      }],
    },
    {
      id: "expand-all",
      // Safe target — always exists; scrollTo directs to collapsed area
      target: '[data-tour-role="category"]',
      scrollTo: '[data-tour-expand-scroll]',
      caption: "More sub-categories to discover below.",
      setup: async () => {
        // Tag a collapsed category for scroll — reveals hidden sections
        const collapsed = document.querySelectorAll(
          '[data-tour-role="category"]:not([data-expanded])',
        )
        if (collapsed.length > 0) {
          // Pick 2nd collapsed (or 1st if only one) so user sees context above
          const target = collapsed[Math.min(1, collapsed.length - 1)] as HTMLElement
          target.setAttribute("data-tour-expand-scroll", "")
        } else {
          // All already expanded — fall back to middle category
          const cats = document.querySelectorAll('[data-tour-role="category"]')
          const mid = cats[Math.floor(cats.length / 2)] as HTMLElement | null
          mid?.setAttribute("data-tour-expand-scroll", "")
        }
      },
      teardown: (handle) => {
        handle.collapseNonPreselected()
        document
          .querySelector("[data-tour-expand-scroll]")
          ?.removeAttribute("data-tour-expand-scroll")
      },
      phases: [
        {
          // Phase 0: Show collapsed categories (scroll brought them into view)
          caption: "More sub-categories to discover below.",
          selector: '[data-tour-role="category"]:not([data-expanded])',
          label: (i) => {
            const expandedCount = document.querySelectorAll(
              '[data-tour-role="category"][data-expanded]',
            ).length
            return `${ordinal(expandedCount + i + 1)} sub-category`
          },
          // Longer pause so user absorbs the closed categories before they open
          durationMs: 3500,
        },
        {
          // Phase 1: Expand all — CSS slide-down animation plays
          caption: "Each category has its own goals — explore them all.",
          selector: '[data-tour-role="category"]',
          label: (i) => `${ordinal(i + 1)} sub-category`,
          skipScroll: true,
          onEnter: async (handle) => {
            handle.expandAllSections()
            await new Promise<void>((r) => setTimeout(r, 600))
          },
          // Pause to let user see the newly expanded sections
          durationMs: 3500,
        },
        {
          // Phase 2: Highlight newly visible unselected goals
          caption: "Toggle any of these on to add them to your plan.",
          selector: '[data-tour-role="unselected-goal"]',
          label: (_, total) => `${total} more available`,
          maxLabels: 1,
          skipScroll: true,
        },
      ],
    },
  ]

  if (firstCurveGoalId) {
    steps.push(
      {
        id: "target-stepper",
        target: '[data-tour="target-stepper"]',
        caption: "Tap the number to edit your target directly.",
      },
      {
        id: "curve-button",
        target: '[data-tour="curve-button"]',
        caption: "Tap this to open the milestone curve — your progression plan over time.",
      },
      {
        id: "curve-editor",
        target: '[data-tour="curve-editor"]',
        caption: "Pick a preset shape or drag the slider to customize how your milestones ramp up.",
        setup: async (handle) => {
          handle.openCurveEditor(firstCurveGoalId)
          await waitForElement('[data-tour="curve-editor"]')
        },
        teardown: (handle) => {
          handle.closeCurveEditor()
        },
      },
    )
  }

  if (firstRampGoalId) {
    steps.push(
      {
        id: "ramp-button",
        target: '[data-tour="ramp-button"]',
        caption: "This opens the habit ramp — your weekly frequency builds up gradually.",
      },
      {
        id: "ramp-editor",
        target: '[data-tour="ramp-editor"]',
        caption: "Your weekly frequency ramps up over time — no burnout, steady progress.",
        setup: async (handle) => {
          handle.openRampEditor(firstRampGoalId)
          await waitForElement('[data-tour="ramp-editor"]')
        },
        teardown: (handle) => {
          handle.closeRampEditor()
        },
      },
    )
  }

  return steps
}

/* ── Tooltip positioning ─────────────────────────────── */

interface TooltipPos {
  top: number
  left: number
  placement: "below" | "above"
}

const TOOLTIP_GAP = 12
const TOOLTIP_WIDTH = 340
const TOOLTIP_HEIGHT_ESTIMATE = 120

function calcTooltipPos(targetEl: HTMLElement): TooltipPos {
  const rect = targetEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
  left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12))

  let top = rect.bottom + TOOLTIP_GAP + window.scrollY
  let placement: "below" | "above" = "below"

  if (rect.bottom + TOOLTIP_GAP + TOOLTIP_HEIGHT_ESTIMATE > vh) {
    top = rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT_ESTIMATE + window.scrollY
    placement = "above"
  }

  return { top, left, placement }
}

/* ── Annotation positioning ──────────────────────────── */

interface AnnotationPos {
  label: string
  top: number
  left: number
  placement: "left" | "above"
}

const ARROW_GAP = 4
const ARROW_MIN_SPACE = 80 // min px to the left to fit the callout

function calcAnnotationPos(targetEl: HTMLElement, label: string): AnnotationPos {
  const rect = targetEl.getBoundingClientRect()

  if (rect.left >= ARROW_MIN_SPACE) {
    // Position to the left, vertically centered
    return {
      label,
      top: rect.top + rect.height / 2 + window.scrollY,
      left: rect.left - ARROW_GAP,
      placement: "left",
    }
  }

  // Fallback: above the element
  return {
    label,
    top: rect.top - 4 + window.scrollY,
    left: rect.left + 8,
    placement: "above",
  }
}

/* ── Phase helpers ───────────────────────────────────── */

function applyPhase(
  phase: TourPhase,
  annotationRingsRef: React.MutableRefObject<HTMLElement[]>,
): { positions: AnnotationPos[]; tooltipPos: TooltipPos | null } {
  const elements = Array.from(document.querySelectorAll(phase.selector)) as HTMLElement[]
  const maxLabels = phase.maxLabels ?? elements.length
  const rings: HTMLElement[] = []
  const positions: AnnotationPos[] = []

  elements.forEach((el, i) => {
    addRing(el)
    rings.push(el)
    if (i < maxLabels) {
      positions.push(calcAnnotationPos(el, phase.label(i, elements.length)))
    }
  })

  annotationRingsRef.current = rings
  const tooltipPos = elements[0] ? calcTooltipPos(elements[0]) : null
  return { positions, tooltipPos }
}

/* ── Reducer ─────────────────────────────────────────── */

type TourStatus = "idle" | "settling" | "waiting" | "finished"

interface TourState {
  status: TourStatus
  stepIndex: number
}

type TourAction =
  | { type: "START" }
  | { type: "SETTLE"; index: number }
  | { type: "READY" }
  | { type: "FINISH" }

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "START":
      return { status: "settling", stepIndex: 0 }
    case "SETTLE":
      return { status: "settling", stepIndex: action.index }
    case "READY":
      return { ...state, status: "waiting" }
    case "FINISH":
      return { status: "finished", stepIndex: state.stepIndex }
    default:
      return state
  }
}

/* ── Component ───────────────────────────────────────── */

interface GoalsStepTourProps {
  tourRef: React.RefObject<GoalsStepTourHandle | null>
  triggerStart: boolean
  onTourEnd: () => void
  selectedGoals: Set<string>
  firstCurveGoalId: string | null
  firstRampGoalId: string | null
  firstCurveSectionId: string | null
}

export function GoalsStepTour({
  tourRef,
  triggerStart,
  onTourEnd,
  selectedGoals,
  firstCurveGoalId,
  firstRampGoalId,
  firstCurveSectionId,
}: GoalsStepTourProps) {
  const [state, dispatch] = useReducer(tourReducer, { status: "idle", stepIndex: 0 })
  const stepsRef = useRef<TourStep[]>([])
  const cssLoadedRef = useRef(false)
  const onTourEndRef = useRef(onTourEnd)
  onTourEndRef.current = onTourEnd

  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null)
  const [annotationPositions, setAnnotationPositions] = useState<AnnotationPos[]>([])
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseCaption, setPhaseCaption] = useState<string | null>(null)
  const currentRingRef = useRef<HTMLElement | null>(null)
  const annotationRingsRef = useRef<HTMLElement[]>([])

  // Load CSS once
  useEffect(() => {
    if (!cssLoadedRef.current) {
      import("./goalsStepTour.css")
      cssLoadedRef.current = true
    }
  }, [])

  // Cleanup — stable ref
  const cleanupRef = useRef(() => {})
  cleanupRef.current = () => {
    document.querySelectorAll(".tour-ring").forEach((el) => el.classList.remove("tour-ring"))
    currentRingRef.current = null
    annotationRingsRef.current = []
    const handle = tourRef.current
    if (handle) {
      handle.closeCurveEditor()
      handle.closeRampEditor()
    }
    setTooltipPos(null)
    setAnnotationPositions([])
    setPhaseIndex(0)
    setPhaseCaption(null)
    dispatch({ type: "FINISH" })
    onTourEndRef.current()
  }
  const cleanup = useCallback(() => cleanupRef.current(), [])

  // Clear annotations + rings for current step (used in next/prev)
  const clearCurrentStep = useCallback(() => {
    removeRing(currentRingRef.current)
    currentRingRef.current = null
    annotationRingsRef.current.forEach((el) => removeRing(el))
    annotationRingsRef.current = []
    setTooltipPos(null)
    setAnnotationPositions([])
    setPhaseIndex(0)
    setPhaseCaption(null)
  }, [])

  // Start tour
  const startTour = useCallback(() => {
    if (state.status === "settling" || state.status === "waiting") return
    const handle = tourRef.current
    if (!handle) return

    const steps = buildSteps({ firstCurveGoalId, firstRampGoalId, firstCurveSectionId })
    if (steps.length === 0) return
    stepsRef.current = steps

    if (firstCurveSectionId) {
      handle.expandSection(firstCurveSectionId)
    }
    handle.closeCurveEditor()
    handle.closeRampEditor()

    dispatch({ type: "START" })
  }, [state.status, tourRef, firstCurveGoalId, firstRampGoalId, firstCurveSectionId])

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => startTour(), 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Manual re-trigger
  useEffect(() => {
    if (triggerStart) startTour()
  }, [triggerStart, startTour])

  // Navigation handlers
  const nextStep = useCallback(() => {
    if (state.status !== "waiting") return
    const steps = stepsRef.current
    const nextIdx = state.stepIndex + 1

    const currentStep = steps[state.stepIndex]
    if (currentStep?.teardown) {
      const handle = tourRef.current
      if (handle) currentStep.teardown(handle)
    }

    clearCurrentStep()

    if (nextIdx >= steps.length) {
      cleanup()
    } else {
      dispatch({ type: "SETTLE", index: nextIdx })
    }
  }, [state.status, state.stepIndex, tourRef, cleanup, clearCurrentStep])

  const prevStep = useCallback(() => {
    if (state.status !== "waiting" || state.stepIndex === 0) return
    const steps = stepsRef.current

    const currentStep = steps[state.stepIndex]
    if (currentStep?.teardown) {
      const handle = tourRef.current
      if (handle) currentStep.teardown(handle)
    }

    clearCurrentStep()
    dispatch({ type: "SETTLE", index: state.stepIndex - 1 })
  }, [state.status, state.stepIndex, tourRef, clearCurrentStep])

  // Keyboard
  useEffect(() => {
    if (state.status !== "waiting") return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cleanup(); return }
      if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); nextStep(); return }
      if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); prevStep(); return }
    }
    window.addEventListener("keydown", handleKey, true)
    return () => window.removeEventListener("keydown", handleKey, true)
  }, [state.status, cleanup, nextStep, prevStep])

  // Step settling
  useEffect(() => {
    if (state.status !== "settling") return
    const steps = stepsRef.current
    const step = steps[state.stepIndex]
    if (!step) { cleanup(); return }

    let cancelled = false

    const settle = async () => {
      const handle = tourRef.current
      if (!handle || cancelled) return

      if (step.setup) {
        await step.setup(handle)
        if (cancelled) return
      }

      // Find primary target
      const el = await waitForElement(step.target)
      if (cancelled) return
      if (!el) { cleanup(); return }

      // Scroll into view (use scrollTo override if provided)
      const scrollEl = step.scrollTo
        ? (document.querySelector(step.scrollTo) as HTMLElement | null) ?? el
        : el
      scrollEl.scrollIntoView({ behavior: "smooth", block: "center" })
      await new Promise<void>((r) => setTimeout(r, 350))
      if (cancelled) return

      // Phase-based step: apply phase 0
      if (step.phases && step.phases.length > 0) {
        const phase = step.phases[0]
        const { positions, tooltipPos: tp } = applyPhase(phase, annotationRingsRef)
        setAnnotationPositions(positions)
        setTooltipPos(tp)
        setPhaseCaption(phase.caption)
        setPhaseIndex(0)
      } else if (step.annotations && step.annotations.length > 0) {
        // Static annotations
        const rings: HTMLElement[] = []
        const positions: AnnotationPos[] = []

        for (const ann of step.annotations) {
          const annEl = document.querySelector(ann.selector) as HTMLElement | null
          if (annEl) {
            addRing(annEl)
            rings.push(annEl)
            positions.push(calcAnnotationPos(annEl, ann.label))
          }
        }

        annotationRingsRef.current = rings
        setAnnotationPositions(positions)
      } else {
        // Normal step: ring on primary target
        addRing(el)
        currentRingRef.current = el
      }

      if (!step.phases) {
        setTooltipPos(calcTooltipPos(el))
      }
      dispatch({ type: "READY" })
    }

    settle()
    return () => { cancelled = true }
  }, [state.status, state.stepIndex, tourRef, cleanup])

  // Phase auto-advance cycling
  useEffect(() => {
    if (state.status !== "waiting") return
    const step = stepsRef.current[state.stepIndex]
    if (!step?.phases) return
    if (phaseIndex >= step.phases.length - 1) return // stay on last phase

    const duration = step.phases[phaseIndex].durationMs ?? PHASE_DURATION_MS
    const timer = setTimeout(() => {
      setPhaseIndex((p) => p + 1)
    }, duration)

    return () => clearTimeout(timer)
  }, [state.status, state.stepIndex, phaseIndex])

  // Apply phase when phaseIndex changes (after initial settle)
  useEffect(() => {
    if (state.status !== "waiting") return
    const step = stepsRef.current[state.stepIndex]
    if (!step?.phases || phaseIndex === 0) return // phase 0 handled by settling

    const phase = step.phases[phaseIndex]
    if (!phase) return
    let cancelled = false

    // Clear previous phase rings
    annotationRingsRef.current.forEach((el) => removeRing(el))
    annotationRingsRef.current = []
    setAnnotationPositions([])

    const apply = async () => {
      // Run onEnter if provided (e.g. expand sections)
      if (phase.onEnter) {
        const handle = tourRef.current
        if (handle) await phase.onEnter(handle)
        if (cancelled) return
      }

      // Find elements for this phase
      const elements = Array.from(document.querySelectorAll(phase.selector)) as HTMLElement[]

      // Skip empty phases
      if (elements.length === 0) {
        setPhaseCaption(phase.caption)
        if (phaseIndex < step.phases!.length - 1) {
          setPhaseIndex((p) => p + 1)
        }
        return
      }

      // Scroll first element into view (unless skipScroll)
      if (!phase.skipScroll) {
        elements[0].scrollIntoView({ behavior: "smooth", block: "nearest" })
        await new Promise<void>((r) => setTimeout(r, 350))
        if (cancelled) return
      }

      const { positions, tooltipPos: tp } = applyPhase(phase, annotationRingsRef)
      setAnnotationPositions(positions)
      if (tp) setTooltipPos(tp)
      setPhaseCaption(phase.caption)
    }

    apply()
    return () => { cancelled = true }
  }, [state.status, state.stepIndex, phaseIndex, tourRef])

  // Recalculate positions on scroll/resize
  useEffect(() => {
    if (state.status !== "waiting") return

    const recalc = () => {
      // Recalc tooltip
      const mainEl = currentRingRef.current
        ?? annotationRingsRef.current[0]
        ?? null
      if (mainEl) setTooltipPos(calcTooltipPos(mainEl))

      // Recalc annotations
      const step = stepsRef.current[state.stepIndex]
      if (annotationRingsRef.current.length > 0) {
        if (step?.phases) {
          const phase = step.phases[phaseIndex]
          if (phase) {
            const maxLabels = phase.maxLabels ?? annotationRingsRef.current.length
            const positions: AnnotationPos[] = []
            annotationRingsRef.current.forEach((el, i) => {
              if (i < maxLabels) {
                positions.push(calcAnnotationPos(el, phase.label(i, annotationRingsRef.current.length)))
              }
            })
            setAnnotationPositions(positions)
          }
        } else if (step?.annotations) {
          const positions: AnnotationPos[] = []
          annotationRingsRef.current.forEach((el, i) => {
            const ann = step.annotations![i]
            if (ann && el) {
              positions.push(calcAnnotationPos(el, ann.label))
            }
          })
          setAnnotationPositions(positions)
        }
      }
    }

    window.addEventListener("scroll", recalc, { passive: true })
    window.addEventListener("resize", recalc, { passive: true })
    return () => {
      window.removeEventListener("scroll", recalc)
      window.removeEventListener("resize", recalc)
    }
  }, [state.status, state.stepIndex, phaseIndex])

  // Don't render unless active
  if (state.status === "idle" || state.status === "finished") return null

  const steps = stepsRef.current
  const currentStep = steps[state.stepIndex]
  const isLastStep = state.stepIndex === steps.length - 1
  const effectiveCaption = phaseCaption ?? currentStep?.caption

  return (
    <>
      {/* Overlay */}
      <div className="tour-overlay" onClick={cleanup} />

      {/* Red annotation arrows */}
      {state.status === "waiting" && annotationPositions.map((ann, i) => (
        <div
          className={`tour-arrow tour-arrow--${ann.placement}`}
          style={{ top: ann.top, left: ann.left }}
          key={`arrow-${phaseIndex}-${i}`}
        >
          <span className="tour-arrow-label">{ann.label}</span>
        </div>
      ))}

      {/* Tooltip */}
      {state.status === "waiting" && tooltipPos && currentStep && (
        <div
          className={`tour-tooltip tour-tooltip--${tooltipPos.placement}`}
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          key={currentStep.id}
        >
          <div className="tour-tooltip-arrow" />
          <p className="tour-tooltip-text">{effectiveCaption}</p>

          {/* Phase dots */}
          {currentStep.phases && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4, marginBottom: 2 }}>
              {currentStep.phases.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: i === phaseIndex ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
          )}

          <div className="tour-tooltip-footer">
            {state.stepIndex > 0 && (
              <button className="tour-tooltip-back" onClick={prevStep}>
                ← Back
              </button>
            )}
            <span className="tour-tooltip-progress">
              {state.stepIndex + 1} of {steps.length}
            </span>
            <button className="tour-tooltip-next" onClick={nextStep}>
              {isLastStep ? "Done ✓" : "Next →"}
            </button>
          </div>
          <button className="tour-tooltip-skip" onClick={cleanup}>
            Skip tour
          </button>
        </div>
      )}
    </>
  )
}
