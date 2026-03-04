"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { driver, type DriveStep, type Driver } from "driver.js"
import "driver.js/dist/driver.css"
import type { GoalsStepTourHandle } from "./GoalsStep"
import "./goalsStepTour.css"

/* ── localStorage persistence ────────────────────────────────── */

const TOUR_STORAGE_KEY = "goals-tour-step"
const TOUR_STORAGE_VERSION = 2 // bump to invalidate stale step numbers (5a/5b split)
const TOUR_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function loadSavedStep(): number {
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!raw) return 0
    const { step, ts, v } = JSON.parse(raw)
    if ((v ?? 1) !== TOUR_STORAGE_VERSION) {
      localStorage.removeItem(TOUR_STORAGE_KEY)
      return 0
    }
    if (Date.now() - ts > TOUR_EXPIRY_MS) {
      localStorage.removeItem(TOUR_STORAGE_KEY)
      return 0
    }
    return typeof step === "number" ? step : 0
  } catch {
    return 0
  }
}

function saveTourStep(step: number) {
  try {
    if (step === 0) {
      localStorage.removeItem(TOUR_STORAGE_KEY)
    } else {
      localStorage.setItem(
        TOUR_STORAGE_KEY,
        JSON.stringify({ step, ts: Date.now(), v: TOUR_STORAGE_VERSION })
      )
    }
  } catch {
    // localStorage unavailable
  }
}

/* ── Helpers ────────────────────────────────────────────────── */

function waitForElement(
  selector: string,
  maxMs = 2000
): Promise<HTMLElement | null> {
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/* ── Mutable ref holder for driver instance ─────────────────── */
// Allows step-level callbacks to access the driver instance
// after it's been created (breaks the circular dependency).
interface DriverHolder {
  d: Driver | null
  handle: GoalsStepTourHandle | null
  steps: DriveStep[]
}

/* ── Tour step builder ──────────────────────────────────────── */

interface BuildStepsOpts {
  firstCurveGoalId: string | null
  firstRampGoalId: string | null
}

function buildDriverSteps(
  opts: BuildStepsOpts,
  handle: GoalsStepTourHandle,
  skipTour: () => void,
  holder: DriverHolder
): DriveStep[] {
  const steps: DriveStep[] = [
    // 0: Life Areas
    {
      element: '[data-tour="area-header"]',
      popover: {
        title: "Life Areas",
        description:
          "Your goals are organized under life areas. Each area represents a major domain you want to improve.",
      },
    },
    // 1: Categories
    {
      element: '[data-tour-role="category"]',
      popover: {
        title: "Categories",
        description:
          "Categories group related goals together, making it easy to focus on specific skills within an area.",
      },
    },
    // 2: Pre-selected Goals
    {
      element: '[data-tour="preselected-goal"], [data-tour-role="selected-goal"]',
      popover: {
        title: "Pre-selected Goals",
        description:
          "These goals were pre-selected based on your chosen path. They form the recommended foundation for your journey.",
      },
    },
    // 3: Available Goals
    {
      element: '[data-tour-role="unselected-goal"]',
      popover: {
        title: "Available Goals",
        description:
          "Toggle these to add them to your plan. You can always change your selection later.",
      },
    },
    // 4: All Categories — choreography handled by handleNext/handleBack
    {
      element: '[data-tour-role="category"]',
      popover: {
        title: "All Categories",
        description:
          "Expanding all sections lets you see every category at a glance and discover goals you might have missed.",
      },
      onDeselected: () => {
        handle.collapseNonPreselected()
      },
    },
  ]

  if (opts.firstCurveGoalId) {
    steps.push({
      element: '[data-tour="target-stepper"]',
      popover: {
        title: "Target Stepper",
        description:
          "Tap the number to set your target. This defines how much you want to achieve for this goal.",
      },
    })
    steps.push({
      element: '[data-tour="curve-button"]',
      popover: {
        title: "Curve Editor Button",
        description:
          "Opens your milestone progression curve. Define how your targets ramp up over time.",
      },
    })
    steps.push({
      element: '[data-tour="curve-editor"]',
      popover: {
        title: "Curve Editor",
        description:
          "The curve editor lets you visualize and adjust your milestone ladder. Drag the tension to make progression linear or exponential.",
      },
      onHighlightStarted: () => {
        handle.openCurveEditor(opts.firstCurveGoalId!)
      },
      onDeselected: () => {
        handle.closeCurveEditor()
      },
    })
  }

  if (opts.firstRampGoalId) {
    steps.push({
      element: '[data-tour="ramp-button"]',
      popover: {
        title: "Ramp Button",
        description:
          "Opens your habit frequency ramp. Build habits gradually instead of going all-in from day one.",
      },
    })
    steps.push({
      element: '[data-tour="ramp-editor"]',
      popover: {
        title: "Ramp Editor",
        description:
          "The ramp editor lets you set weekly frequency targets across phases. Start easy and build momentum.",
      },
      onHighlightStarted: () => {
        handle.openRampEditor(opts.firstRampGoalId!)
      },
      onDeselected: () => {
        handle.closeRampEditor()
      },
    })
  }

  steps.push({
    element: '[data-tour="goal-date-button"]',
    popover: {
      title: "Goal Date",
      description:
        "Set a target date for individual goals. This helps you stay accountable and track progress against deadlines.",
    },
  })

  steps.push({
    element: '[data-tour="add-custom-goal"]',
    popover: {
      title: "Custom Goal",
      description:
        "Create your own goals within any category. If the templates don't cover something you want to track, add it here.",
    },
  })

  steps.push({
    element: '[data-tour="add-custom-category"]',
    popover: {
      title: "Custom Category",
      description:
        "Create entirely new categories to organize goals that don't fit existing groups.",
    },
  })

  // Inject onPopoverRender for custom UI into every step
  return steps.map((s, i) => ({
    ...s,
    popover: {
      ...s.popover,
      popoverClass: "gt-popover",
      onPopoverRender: (popover: { wrapper: HTMLElement }) => {
        renderCustomPopoverUI(
          popover.wrapper,
          i,
          steps.length,
          skipTour,
          holder
        )
      },
    },
  }))
}

/* ── Custom popover UI (header, progress, buttons) ──────────── */

function renderCustomPopoverUI(
  wrapper: HTMLElement,
  stepIndex: number,
  totalSteps: number,
  skipTour: () => void,
  holder: DriverHolder
) {
  const titleEl = wrapper.querySelector(".driver-popover-title")
  const descEl = wrapper.querySelector(".driver-popover-description")
  if (!titleEl) return

  // Remove any previous custom elements (driver.js reuses the popover)
  wrapper
    .querySelectorAll(".gt-custom-header, .gt-progress, .gt-custom-footer")
    .forEach((el) => el.remove())

  // Header: step label + skip link
  const header = document.createElement("div")
  header.className = "gt-custom-header"
  header.innerHTML = `
    <span class="gt-step-label">Step ${stepIndex + 1} of ${totalSteps}</span>
    <button class="gt-skip-link">Skip tour</button>
  `
  header.querySelector(".gt-skip-link")!.addEventListener("click", skipTour)
  titleEl.parentNode!.insertBefore(header, titleEl)

  // Progress bar
  const progress = document.createElement("div")
  progress.className = "gt-progress"
  const bar = document.createElement("div")
  bar.className = "gt-progress__bar"
  bar.style.width = `${((stepIndex + 1) / totalSteps) * 100}%`
  progress.appendChild(bar)
  titleEl.parentNode!.insertBefore(progress, titleEl)

  // Footer: hotkeys (step 0) + back/next buttons
  const footer = document.createElement("div")
  footer.className = "gt-custom-footer"

  const nav = document.createElement("div")
  nav.className = "gt-nav-buttons"

  if (stepIndex === 0) {
    nav.innerHTML = `
      <div class="gt-hotkeys">
        <span class="gt-hotkey">Esc</span>
        <span class="gt-hotkey">&larr;</span>
        <span class="gt-hotkey">&rarr;</span>
      </div>
    `
  } else {
    nav.innerHTML = `<div></div>`
  }

  const btnGroup = document.createElement("div")
  btnGroup.className = "gt-btn-group"

  if (stepIndex > 0) {
    const backBtn = document.createElement("button")
    backBtn.className = "gt-btn gt-btn--secondary"
    backBtn.textContent = "Back"
    backBtn.addEventListener("click", () => {
      if (holder.d && holder.handle) {
        handleBack(holder.d, holder.handle, holder.steps)
      }
    })
    btnGroup.appendChild(backBtn)
  }

  const nextBtn = document.createElement("button")
  nextBtn.className = "gt-btn gt-btn--primary"
  nextBtn.textContent = stepIndex === totalSteps - 1 ? "Finish" : "Next"
  nextBtn.addEventListener("click", () => {
    if (holder.d && holder.handle) {
      handleNext(holder.d, holder.handle, holder.steps)
    }
  })
  btnGroup.appendChild(nextBtn)

  nav.appendChild(btnGroup)
  footer.appendChild(nav)

  // Insert after description or at end
  if (descEl?.nextSibling) {
    descEl.parentNode!.insertBefore(footer, descEl.nextSibling)
  } else {
    ;(descEl?.parentNode ?? wrapper).appendChild(footer)
  }

  // Auto-focus Next button
  requestAnimationFrame(() => nextBtn.focus())
}

/* ── Main Component ─────────────────────────────────────────── */

type TourPhase = "welcome" | "touring" | "finished" | "idle"

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
  firstCurveGoalId,
  firstRampGoalId,
  firstCurveSectionId,
}: GoalsStepTourProps) {
  const [phase, setPhase] = useState<TourPhase>("welcome")
  const onTourEndRef = useRef(onTourEnd)
  onTourEndRef.current = onTourEnd
  const lastStepRef = useRef(loadSavedStep())
  const driverRef = useRef<Driver | null>(null)
  const holderRef = useRef<DriverHolder>({ d: null, handle: null, steps: [] })

  // Re-trigger welcome when help button pressed
  useEffect(() => {
    if (triggerStart && phase === "idle") {
      setPhase("welcome")
    }
  }, [triggerStart, phase])

  const cleanupTour = useCallback(() => {
    if (tourRef.current) {
      tourRef.current.collapseNonPreselected()
      tourRef.current.closeCurveEditor()
      tourRef.current.closeRampEditor()
    }
  }, [tourRef])

  const skipTour = useCallback(() => {
    const d = driverRef.current
    if (d?.isActive()) {
      const activeIndex = d.getActiveIndex() ?? 0
      lastStepRef.current = activeIndex
      saveTourStep(activeIndex)
    }
    driverRef.current?.destroy()
    driverRef.current = null
    holderRef.current.d = null
    cleanupTour()
    setPhase("idle")
    onTourEndRef.current()
  }, [cleanupTour])

  const startTour = useCallback(
    (fromBeginning = false) => {
      const handle = tourRef.current
      if (!handle) return

      if (firstCurveSectionId) {
        handle.expandSection(firstCurveSectionId)
      }
      handle.closeCurveEditor()
      handle.closeRampEditor()

      const holder = holderRef.current
      holder.handle = handle

      const skipFromPopover = () => {
        // Save position before destroying
        const activeIndex = driverRef.current?.getActiveIndex() ?? 0
        lastStepRef.current = activeIndex
        saveTourStep(activeIndex)
        driverRef.current?.destroy()
        driverRef.current = null
        holder.d = null
        cleanupTour()
        setPhase("idle")
        onTourEndRef.current()
      }

      const steps = buildDriverSteps(
        { firstCurveGoalId, firstRampGoalId },
        handle,
        skipFromPopover,
        holder
      )
      holder.steps = steps

      const resumeStep = fromBeginning
        ? 0
        : Math.min(lastStepRef.current, steps.length - 1)

      const d = driver({
        steps,
        showProgress: false,
        showButtons: false,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.55)",
        stagePadding: 4,
        stageRadius: 8,
        popoverOffset: 12,
        smoothScroll: true,
        animate: false,
        allowKeyboardControl: false,
        onCloseClick: () => {
          const activeIndex = d.getActiveIndex() ?? 0
          lastStepRef.current = activeIndex
          saveTourStep(activeIndex)
          d.destroy()
          driverRef.current = null
          holder.d = null
          cleanupTour()
          setPhase("idle")
          onTourEndRef.current()
        },
        onDestroyStarted: () => {
          d.destroy()
        },
        onDestroyed: () => {
          driverRef.current = null
          holder.d = null
          cleanupTour()
          setPhase("finished")
        },
      })

      driverRef.current = d
      holder.d = d
      setPhase("touring")

      // For async setup steps (curve/ramp editors), wait for elements
      const startAtStep = async (index: number) => {
        const step = steps[index]

        // Resume onto "All Categories": expand first so step makes sense
        if (isAllCategoriesStep(steps, index)) {
          handle.expandAllSections()
          await sleep(350)
        }

        if (step.element && typeof step.element === "string") {
          const el = document.querySelector(step.element)
          if (!el && step.onHighlightStarted) {
            step.onHighlightStarted(undefined as unknown as Element, step, {
              config: step,
              state: "this" as unknown as never,
            })
            await waitForElement(step.element)
          }
        }
        d.drive(index)
      }

      startAtStep(resumeStep)
    },
    [tourRef, firstCurveGoalId, firstRampGoalId, firstCurveSectionId, cleanupTour]
  )

  const dismissFinish = useCallback(() => {
    lastStepRef.current = 0
    saveTourStep(0)
    setPhase("idle")
    onTourEndRef.current()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (phase === "idle") return

    const handler = (e: KeyboardEvent) => {
      if (phase === "welcome") {
        if (e.key === "Enter") {
          e.preventDefault()
          e.stopPropagation()
          startTour(lastStepRef.current === 0)
        } else if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          skipTour()
        }
        return
      }

      if (phase === "touring") {
        const d = driverRef.current
        if (!d?.isActive()) return
        const handle = tourRef.current
        if (!handle) return
        const holder = holderRef.current

        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault()
          e.stopPropagation()
          handleNext(d, handle, holder.steps)
        } else if (e.key === "ArrowLeft") {
          e.preventDefault()
          e.stopPropagation()
          handleBack(d, handle, holder.steps)
        } else if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          skipTour()
        }
        return
      }

      if (phase === "finished") {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          dismissFinish()
        }
      }
    }

    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  }, [phase, startTour, skipTour, dismissFinish, tourRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy()
      driverRef.current = null
    }
  }, [])

  if (phase === "idle") return null

  return (
    <>
      {/* ── Welcome screen ─────────────────────────────── */}
      {phase === "welcome" &&
        (() => {
          const canResume = lastStepRef.current > 0
          return (
            <div
              className="gt-welcome"
              role="dialog"
              aria-label={canResume ? "Resume tour" : "Goals setup tour"}
            >
              <div className="gt-welcome__card">
                <div className="gt-welcome__icon">
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                <h2 className="gt-welcome__title">
                  {canResume ? "Resume Tour?" : "Goals Setup Tour"}
                </h2>
                <p className="gt-welcome__text">
                  {canResume
                    ? `You left off at step ${lastStepRef.current + 1}. Pick up where you were or start fresh.`
                    : "Take a quick walkthrough of the goals configuration screen. Learn how life areas, categories, targets, and curves work together."}
                </p>
                <div className="gt-welcome__actions">
                  <button
                    className="gt-welcome__start"
                    onClick={() => startTour(canResume ? false : true)}
                  >
                    {canResume ? "Resume Tour" : "Start Tour"}
                  </button>
                  {canResume && (
                    <button
                      className="gt-welcome__dismiss"
                      onClick={() => startTour(true)}
                      style={{ color: "#a0a4b8" }}
                    >
                      Start from beginning
                    </button>
                  )}
                  <button className="gt-welcome__dismiss" onClick={skipTour}>
                    Skip for now
                  </button>
                </div>
                <span className="gt-welcome__hint">
                  Press <kbd>Enter</kbd> to begin
                </span>
              </div>
            </div>
          )
        })()}

      {/* ── Finish screen ──────────────────────────────── */}
      {phase === "finished" && (
        <div className="gt-finish" role="dialog" aria-label="Tour complete">
          <div className="gt-finish__card">
            <div className="gt-finish__check">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="gt-finish__title">Tour Complete</h2>
            <p className="gt-finish__text">
              You now know how the goals setup works. Go ahead and customize
              your goals, targets, and progression curves.
            </p>
            <button className="gt-finish__close" onClick={dismissFinish}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Step transition helpers ────────────────────────────────── */

async function handleNext(
  d: Driver,
  handle: GoalsStepTourHandle,
  steps: DriveStep[]
) {
  const currentIndex = d.getActiveIndex() ?? 0
  const nextIndex = currentIndex + 1

  if (nextIndex >= steps.length) {
    d.destroy()
    return
  }

  const nextStep = steps[nextIndex]

  // "All Categories" step: expand all, then move so spotlight fits
  if (isAllCategoriesStep(steps, nextIndex)) {
    // 1. Expand all sections first so driver.js sees correct geometry
    handle.expandAllSections()
    // 2. Wait for React to re-render and DOM to settle
    await sleep(350)
    // 3. Move to the step — spotlight now wraps the full expanded list
    d.moveNext()
    // 4. Refresh positions after any layout shift
    await sleep(100)
    d.refresh()
    return
  }

  // Async setup: if the next step's element needs to be created
  if (nextStep.element && typeof nextStep.element === "string") {
    const el = document.querySelector(nextStep.element)
    if (!el && nextStep.onHighlightStarted) {
      nextStep.onHighlightStarted(undefined as unknown as Element, nextStep, {
        config: nextStep,
        state: "this" as unknown as never,
      })
      await waitForElement(nextStep.element)
    }
  }

  d.moveNext()
}

async function handleBack(
  d: Driver,
  handle: GoalsStepTourHandle,
  steps: DriveStep[]
) {
  const currentIndex = d.getActiveIndex() ?? 0
  if (currentIndex <= 0) return

  // Back from "All Categories": re-collapse, then go back
  if (isAllCategoriesStep(steps, currentIndex)) {
    handle.collapseNonPreselected()
    await sleep(350)
    d.movePrevious()
    await sleep(100)
    d.refresh()
    return
  }

  // Back from curve/ramp editor: close it first
  const currentStep = steps[currentIndex]
  if (currentStep.onDeselected) {
    currentStep.onDeselected(undefined as unknown as Element, currentStep, {
      config: currentStep,
      state: "this" as unknown as never,
    })
    await sleep(300)
  }

  d.movePrevious()
}

function isAllCategoriesStep(steps: DriveStep[], index: number): boolean {
  const step = steps[index]
  return step?.popover?.title === "All Categories"
}
