"use client"

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import {
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  SlidersHorizontal,
  CalendarDays,
  CircleHelp,
  X,
} from "lucide-react"
import { FutureDateInput } from "../FutureDateInput"
import { CATEGORY_COLORS } from "./setupConstants"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import { HabitRampEditor } from "@/src/goals/components/HabitRampEditor"
import { getCategoryLabel } from "@/src/goals/goalDisplayService"
import { GOAL_TEMPLATE_MAP } from "@/src/goals/data/goalGraph"
import type {
  GoalTemplate,
  HabitRampStep,
  LifeAreaConfig,
  MilestoneLadderConfig,
  SetupCustomGoal,
  SetupCustomCategory,
  DaygamePath,
} from "@/src/goals/types"

/* ── Target Stepper ────────────────────────────────────── */

function TargetStepper({
  value,
  period,
  onUpdate,
  curveButton,
  isTourTarget,
}: {
  value: number
  period: string
  onUpdate: (v: number) => void
  curveButton?: React.ReactNode
  isTourTarget?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const commitEdit = () => {
    const parsed = parseInt(draft, 10)
    if (!isNaN(parsed) && parsed >= 1) onUpdate(parsed)
    setEditing(false)
  }

  return (
    <div
      className="flex items-center gap-0.5 shrink-0 rounded-md px-1 py-0.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      data-tour={isTourTarget ? "target-stepper" : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {curveButton}
      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit()
            if (e.key === "Escape") setEditing(false)
          }}
          className="text-xs font-semibold text-white text-center bg-transparent outline-none"
          style={{ width: `${Math.max(2, String(value).length + 1)}ch` }}
          autoFocus
        />
      ) : (
        <button
          onClick={() => {
            setDraft(String(value))
            setEditing(true)
          }}
          className="text-xs font-semibold text-white text-center px-1 min-w-[2ch] rounded hover:bg-white/10 transition-colors"
          title="Click to edit"
        >
          {value}
        </button>
      )}
      <span className="text-[9px] text-white/30 pl-0.5 pr-1 whitespace-nowrap">
        {period}
      </span>
    </div>
  )
}

/* ── Custom Goal Stepper (no period label, has delete) ── */

function CustomGoalStepper({
  value,
  onUpdate,
  onRemove,
}: {
  value: number
  onUpdate: (v: number) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const commitEdit = () => {
    const parsed = parseInt(draft, 10)
    if (!isNaN(parsed) && parsed >= 1) onUpdate(parsed)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div
        className="flex items-center gap-0.5 rounded-md px-1 py-0.5"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {editing ? (
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit()
              if (e.key === "Escape") setEditing(false)
            }}
            className="text-xs font-semibold text-white text-center bg-transparent outline-none"
            style={{ width: `${Math.max(2, String(value).length + 1)}ch` }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setDraft(String(value))
              setEditing(true)
            }}
            className="text-xs font-semibold text-white text-center px-1 min-w-[2ch] rounded hover:bg-white/10 transition-colors"
            title="Click to edit"
          >
            {value}
          </button>
        )}
      </div>
      <button
        onClick={onRemove}
        className="size-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        title="Remove"
      >
        <X className="size-2.5 text-white/40" />
      </button>
    </div>
  )
}

/* ── Goal Date Button ─────────────────────────────────── */

function GoalDateButton({
  goalId,
  effectiveDate,
  accentColor,
  onUpdate,
}: {
  goalId: string
  effectiveDate: string
  accentColor: string
  onUpdate: (goalId: string, date: string) => void
}) {
  const [open, setOpen] = useState(false)
  const hasDate = !!effectiveDate

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10 relative"
        style={{
          border: open
            ? `1px solid ${accentColor}66`
            : "1px solid rgba(255,255,255,0.1)",
          background: open ? `${accentColor}1a` : "transparent",
        }}
        title={hasDate ? `Target: ${effectiveDate}` : "Set target date"}
      >
        <CalendarDays
          className="size-2.5"
          style={{ color: open || hasDate ? accentColor : "rgba(255,255,255,0.5)" }}
        />
        {hasDate && (
          <div
            className="absolute -top-0.5 -right-0.5 size-2 rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 4px ${accentColor}` }}
          />
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-50 rounded-lg p-3 space-y-2 min-w-[200px]"
          style={{
            background: "rgba(10, 14, 28, 0.95)",
            border: `1px solid ${accentColor}30`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 12px ${accentColor}10`,
          }}
        >
          <label className="text-[10px] text-white/40 uppercase tracking-wider block">
            Target date
          </label>
          <FutureDateInput
            value={effectiveDate}
            onChange={(date) => onUpdate(goalId, date)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
              }
            }}
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-white/25 [color-scheme:dark]"
          />
          {hasDate && (
            <button
              onClick={() => {
                onUpdate(goalId, "")
                setOpen(false)
              }}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Path Banner ──────────────────────────────────────── */

function PathBanner({ path, targetDate }: { path: DaygamePath | null; targetDate?: string }) {
  if (!path) return null
  const label = path === "fto" ? "Find The One" : "Abundance"
  const color = path === "fto" ? "#f97068" : "#FF4081"
  return (
    <div
      className="mb-4 rounded-lg px-4 py-2.5 flex items-center gap-3"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <span className="text-sm font-medium" style={{ color: `${color}cc` }}>
        {label}
      </span>
      {targetDate && (
        <span className="text-xs text-white/40 ml-auto">
          Target: {new Date(targetDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      )}
    </div>
  )
}

/* ── Area ID resolution ───────────────────────────────── */

function getAreaIdForGoal(goalId: string, customGoals: SetupCustomGoal[]): string {
  if (GOAL_TEMPLATE_MAP[goalId]) return "daygame"
  const match = goalId.match(/^(.+)_s\d+$/)
  if (match) return match[1]
  const cg = customGoals.find((g) => g.id === goalId)
  if (cg) return cg.categoryId
  return "custom"
}

/* ── Tour handle ──────────────────────────────────────── */

export interface GoalsStepTourHandle {
  expandSection(sectionId: string): void
  expandAllSections(): void
  collapseNonPreselected(): void
  openCurveEditor(goalId: string): void
  closeCurveEditor(): void
  openRampEditor(goalId: string): void
  closeRampEditor(): void
}

/* ── GoalsStep ─────────────────────────────────────────── */

interface GoalsStepProps {
  daygameByCategory: { category: string; goals: GoalTemplate[] }[]
  daygameL3Goals: GoalTemplate[]
  lifeAreas: LifeAreaConfig[]
  selectedAreas: Set<string>
  selectedGoals: Set<string>
  targets: Record<string, number>
  curveConfigs: Record<string, MilestoneLadderConfig>
  rampConfigs: Record<string, HabitRampStep[]>
  rampEnabled: Set<string>
  customGoals: SetupCustomGoal[]
  customCategories: SetupCustomCategory[]
  path: DaygamePath | null
  targetDates: Record<string, string>
  goalDates: Record<string, string>
  onToggle: (id: string) => void
  onUpdateTarget: (id: string, value: number) => void
  onUpdateCurve: (id: string, config: MilestoneLadderConfig) => void
  onUpdateRamp: (id: string, steps: HabitRampStep[]) => void
  onToggleRamp: (id: string) => void
  onAddCustomGoal: (categoryId: string) => void
  onRemoveCustomGoal: (goalId: string) => void
  onUpdateCustomGoalTitle: (goalId: string, title: string) => void
  onAddCustomCategory: () => void
  onRenameCustomCategory: (catId: string, name: string) => void
  onRemoveCustomCategory: (catId: string) => void
  onUpdateGoalDate: (goalId: string, date: string) => void
  onTourStart?: () => void
}

export const GoalsStep = forwardRef<GoalsStepTourHandle, GoalsStepProps>(function GoalsStep({
  daygameByCategory,
  daygameL3Goals,
  lifeAreas,
  selectedAreas,
  selectedGoals,
  targets,
  curveConfigs,
  rampConfigs,
  rampEnabled,
  customGoals,
  customCategories,
  path,
  targetDates,
  goalDates,
  onToggle,
  onUpdateTarget,
  onUpdateCurve,
  onUpdateRamp,
  onToggleRamp,
  onAddCustomGoal,
  onRemoveCustomGoal,
  onUpdateCustomGoalTitle,
  onAddCustomCategory,
  onRenameCustomCategory,
  onRemoveCustomCategory,
  onUpdateGoalDate,
  onTourStart,
}, ref) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const [expandedCurve, setExpandedCurve] = useState<string | null>(null)
  const [expandedRamp, setExpandedRamp] = useState<string | null>(null)
  const prevCustomCatCount = useRef(customCategories.length)

  useImperativeHandle(ref, () => ({
    expandSection: (sectionId: string) => {
      setExpandedSections((prev) => new Set([...prev, sectionId]))
    },
    expandAllSections: () => {
      setExpandedSections((prev) => {
        const next = new Set(prev)
        for (const { category } of daygameByCategory) next.add(`dg_${category}`)
        return next
      })
    },
    collapseNonPreselected: () => {
      // Collapse back to only categories that have preselected goals
      setExpandedSections((prev) => {
        const next = new Set<string>()
        for (const id of prev) {
          const cat = id.replace(/^dg_/, "")
          const group = daygameByCategory.find((c) => c.category === cat)
          if (group && group.goals.some((g) => selectedGoals.has(g.id))) next.add(id)
          if (!id.startsWith("dg_")) next.add(id) // keep non-daygame sections
        }
        return next
      })
    },
    openCurveEditor: (goalId: string) => setExpandedCurve(goalId),
    closeCurveEditor: () => setExpandedCurve(null),
    openRampEditor: (goalId: string) => setExpandedRamp(goalId),
    closeRampEditor: () => setExpandedRamp(null),
  }))

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Auto-expand any category that has preselected goals
  useEffect(() => {
    if (daygameByCategory.length === 0) return
    setExpandedSections((prev) => {
      const next = new Set(prev)
      for (const { category, goals } of daygameByCategory) {
        if (goals.some((g) => selectedGoals.has(g.id))) {
          next.add(`dg_${category}`)
        }
      }
      // Also auto-expand life area sections with selected suggestions
      for (const area of lifeAreas) {
        if (!selectedAreas.has(area.id) || area.id === "daygame" || area.id === "custom") continue
        const suggestions = area.suggestions
        if (!suggestions) continue
        if (suggestions.some((_, i) => selectedGoals.has(`${area.id}_s${i}`))) {
          next.add(area.id)
        }
      }
      // If nothing was preselected, expand first category as fallback
      if (next.size === 0) {
        const firstCat = daygameByCategory[0]?.goals[0]?.displayCategory ?? "field_work"
        next.add(`dg_${firstCat}`)
      }
      return next
    })
  // Only run on mount — we don't want toggling a goal to re-expand collapsed sections
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daygameByCategory])

  useEffect(() => {
    if (customCategories.length > prevCustomCatCount.current) {
      const newest = customCategories[customCategories.length - 1]
      setExpandedSections((prev) => new Set([...prev, `custom_${newest.id}`]))
    }
    prevCustomCatCount.current = customCategories.length
  }, [customCategories])

  const customGoalsForCategory = useCallback(
    (catId: string) => customGoals.filter((g) => g.categoryId === catId),
    [customGoals]
  )

  const daygameSelected = daygameL3Goals.filter((g) => selectedGoals.has(g.id)).length

  // Tour: find first preselected goal dynamically (for tour annotation)
  const firstPreselectedGoalId = daygameByCategory
    .flatMap(({ goals }) => goals)
    .find((g) => selectedGoals.has(g.id))?.id ?? null

  // Tour: find first selected curve/ramp goal dynamically
  const firstCurveGoalId = daygameL3Goals.find(
    (g) => selectedGoals.has(g.id) && g.templateType === "milestone_ladder" && g.defaultMilestoneConfig != null
  )?.id ?? null
  const firstRampGoalId = daygameL3Goals.find(
    (g) => selectedGoals.has(g.id) && g.templateType === "habit_ramp" && rampEnabled.has(g.id) && g.defaultRampSteps != null && g.defaultRampSteps.length > 1
  )?.id ?? null

  const getGoalMeta = (g: GoalTemplate) => {
    const isRampActive = g.templateType === "habit_ramp" && rampEnabled.has(g.id)
    const canAddRamp = g.templateType === "habit_ramp" && !rampEnabled.has(g.id)
    const defaultTarget =
      g.defaultMilestoneConfig?.target ?? g.defaultRampSteps?.[0]?.frequencyPerWeek ?? 5
    return {
      type: (isRampActive ? "habit" : g.templateType === "milestone_ladder" ? "milestone" : "habit") as "habit" | "milestone",
      target: targets[g.id] ?? defaultTarget,
      period: g.templateType === "habit_ramp" ? "per week" : "total",
      hasCurve:
        g.templateType === "milestone_ladder" && g.defaultMilestoneConfig != null,
      defaultCurve: g.defaultMilestoneConfig,
      hasRamp:
        isRampActive && g.defaultRampSteps != null && g.defaultRampSteps.length > 1,
      canAddRamp,
      defaultRampSteps: g.defaultRampSteps,
    }
  }

  return (
    <div className="min-h-screen pt-12 pb-36 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Your Goals</h2>
            <p className="text-white/40 text-sm">
              Toggle goals on or off and adjust targets. These are starting points — you can change
              them later.
            </p>
          </div>
          {onTourStart && (
            <button
              onClick={onTourStart}
              className="size-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              title="Show guided tour"
            >
              <CircleHelp className="size-4 text-white/40" />
            </button>
          )}
        </div>

        <PathBanner path={path} targetDate={targetDates["daygame"]} />

        {daygameByCategory.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3" data-tour="area-header">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Dating & Daygame
              </span>
              <span className="text-xs text-white/30">{daygameSelected} selected</span>
            </div>

            {daygameByCategory.map(({ category, goals }, catIdx) => {
              const sectionId = `dg_${category}`
              const isExpanded = expandedSections.has(sectionId)
              const selectedCount = goals.filter((g) => selectedGoals.has(g.id)).length
              const catColor = CATEGORY_COLORS[category] ?? "#00E676"
              // Rank among expanded categories (0 = first, 1 = second, etc.)
              let expandedRank = -1
              if (isExpanded) {
                let r = 0
                for (let i = 0; i < catIdx; i++) {
                  if (expandedSections.has(`dg_${daygameByCategory[i].category}`)) r++
                }
                expandedRank = r
              }

              return (
                <div key={category} className="mb-3">
                  <button
                    onClick={() => toggleSection(sectionId)}
                    data-tour={expandedRank === 0 ? "category-1" : expandedRank === 1 ? "category-2" : undefined}
                    data-tour-role="category"
                    data-expanded={isExpanded ? "" : undefined}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200"
                    style={{
                      background:
                        selectedCount > 0
                          ? `${catColor}0f`
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        selectedCount > 0
                          ? `1px solid ${catColor}25`
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5" style={{ color: `${catColor}99` }} />
                    ) : (
                      <ChevronRight className="size-3.5" style={{ color: `${catColor}99` }} />
                    )}
                    <span className="text-sm text-white/80 flex-1 text-left">
                      {getCategoryLabel(category)}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {selectedCount}/{goals.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9c-slideDown 0.25s ease-out" }}>
                      {goals.map((l3) => {
                        const isOn = selectedGoals.has(l3.id)
                        const meta = getGoalMeta(l3)
                        return (
                          <div key={l3.id}>
                            <div
                              onClick={() => onToggle(l3.id)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 cursor-pointer"
                              data-tour={isOn && l3.id === firstPreselectedGoalId ? "preselected-goal" : undefined}
                              data-tour-role={isOn ? "selected-goal" : "unselected-goal"}
                              style={{
                                background: isOn ? `${catColor}0f` : "transparent",
                                border: isOn
                                  ? `1px solid ${catColor}25`
                                  : "1px solid transparent",
                              }}
                            >
                              <div
                                className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  background: isOn ? catColor : "rgba(255,255,255,0.1)",
                                  border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                                  boxShadow: isOn ? `0 0 8px ${catColor}4d` : "none",
                                }}
                              >
                                {isOn && <Check className="size-2.5 text-white" />}
                              </div>
                              <span
                                className={`flex-1 min-w-0 ${isOn ? "text-white" : "text-white/50"}`}
                              >
                                <span className="text-sm">{l3.title}</span>
                                {rampEnabled.has(l3.id) && l3.templateType === "habit_ramp" && (
                                  <span className="block text-[11px] text-orange-400 italic">habit ramp</span>
                                )}
                                {isOn && meta.canAddRamp && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onToggleRamp(l3.id)
                                    }}
                                    className="block text-[11px] text-orange-400/50 hover:text-orange-400 italic transition-colors"
                                  >
                                    + add habit ramp
                                  </button>
                                )}
                              </span>
                              {category === "dirty_dog" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded text-orange-400/60 bg-orange-400/10 shrink-0">
                                  advanced
                                </span>
                              )}
                              {isOn && (
                                <TargetStepper
                                  value={meta.target}
                                  period={meta.period}
                                  onUpdate={(v) => onUpdateTarget(l3.id, v)}
                                  isTourTarget={l3.id === firstCurveGoalId}
                                  curveButton={
                                    <>
                                    <GoalDateButton
                                      goalId={l3.id}
                                      effectiveDate={goalDates[l3.id] || targetDates["daygame"] || ""}
                                      accentColor={catColor}
                                      onUpdate={onUpdateGoalDate}
                                    />
                                    {meta.hasCurve ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setExpandedCurve(
                                            expandedCurve === l3.id ? null : l3.id
                                          )
                                        }}
                                        className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                        style={{
                                          border:
                                            expandedCurve === l3.id
                                              ? `1px solid ${catColor}66`
                                              : "1px solid rgba(255,255,255,0.1)",
                                          background:
                                            expandedCurve === l3.id
                                              ? `${catColor}1a`
                                              : "transparent",
                                        }}
                                        title="Customize milestone curve"
                                        data-tour={l3.id === firstCurveGoalId ? "curve-button" : undefined}
                                      >
                                        <SlidersHorizontal
                                          className="size-2.5"
                                          style={{
                                            color:
                                              expandedCurve === l3.id
                                                ? catColor
                                                : "rgba(255,255,255,0.5)",
                                          }}
                                        />
                                      </button>
                                    ) : meta.hasRamp ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setExpandedRamp(
                                            expandedRamp === l3.id ? null : l3.id
                                          )
                                        }}
                                        className="size-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                                        style={{
                                          border:
                                            expandedRamp === l3.id
                                              ? `1px solid ${catColor}66`
                                              : "1px solid rgba(255,255,255,0.1)",
                                          background:
                                            expandedRamp === l3.id
                                              ? `${catColor}1a`
                                              : "transparent",
                                        }}
                                        title="Customize ramp schedule"
                                        data-tour={l3.id === firstRampGoalId ? "ramp-button" : undefined}
                                      >
                                        <SlidersHorizontal
                                          className="size-2.5"
                                          style={{
                                            color:
                                              expandedRamp === l3.id
                                                ? catColor
                                                : "rgba(255,255,255,0.5)",
                                          }}
                                        />
                                      </button>
                                    ) : undefined}
                                    </>
                                  }
                                />
                              )}
                            </div>
                            {isOn &&
                              meta.hasCurve &&
                              expandedCurve === l3.id &&
                              meta.defaultCurve && (
                                <div className="mt-1 ml-7 mr-2 mb-2" data-tour="curve-editor">
                                  <MilestoneCurveEditor
                                    config={curveConfigs[l3.id] ?? meta.defaultCurve}
                                    onChange={(config) => onUpdateCurve(l3.id, config)}
                                    allowDirectEdit
                                    themeId="orrery"
                                    targetDate={goalDates[l3.id] || targetDates["daygame"] || undefined}
                                  />
                                  <button
                                    onClick={() => setExpandedCurve(null)}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
                                    style={{
                                      background: `${catColor}14`,
                                      border: `1px solid ${catColor}40`,
                                      color: catColor,
                                    }}
                                  >
                                    <Check className="size-3" />
                                    Accept Curve
                                  </button>
                                </div>
                              )}
                            {isOn &&
                              meta.hasRamp &&
                              expandedRamp === l3.id &&
                              meta.defaultRampSteps && (
                                <div className="mt-1 ml-7 mr-2 mb-2" data-tour="ramp-editor">
                                  <div
                                    className="rounded-xl p-4"
                                    style={{
                                      background: "rgba(0, 0, 0, 0.5)",
                                      backdropFilter: "blur(12px)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <HabitRampEditor
                                      steps={rampConfigs[l3.id] ?? meta.defaultRampSteps}
                                      onChange={(steps) => onUpdateRamp(l3.id, steps)}
                                      accentColor={catColor}
                                      targetDate={goalDates[l3.id] || targetDates["daygame"] || undefined}
                                    />
                                  </div>
                                  <button
                                    onClick={() => setExpandedRamp(null)}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors"
                                    style={{
                                      background: `${catColor}14`,
                                      border: `1px solid ${catColor}40`,
                                      color: catColor,
                                    }}
                                  >
                                    <Check className="size-3" />
                                    Accept Ramp
                                  </button>
                                </div>
                              )}
                          </div>
                        )
                      })}

                      {customGoalsForCategory(category).map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: `${catColor}0f`,
                            border: `1px solid ${catColor}25`,
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: catColor }}
                          >
                            <Check className="size-2.5 text-white" />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/25"
                            autoFocus={!cg.title}
                          />
                          <CustomGoalStepper
                            value={targets[cg.id] ?? cg.target}
                            onUpdate={(v) => onUpdateTarget(cg.id, v)}
                            onRemove={() => onRemoveCustomGoal(cg.id)}
                          />
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(category)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                      >
                        <Plus className="size-3.5 text-white/25" />
                        <span className="text-sm text-white/25">Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {customCategories.map((cat) => {
              const sectionId = `custom_${cat.id}`
              const isExpanded = expandedSections.has(sectionId)
              const catGoals = customGoalsForCategory(cat.id)

              return (
                <div key={cat.id} className="mb-3">
                  <div
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{
                      background:
                        catGoals.length > 0
                          ? "rgba(0,230,118,0.04)"
                          : "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(8px)",
                      border:
                        catGoals.length > 0
                          ? "1px solid rgba(0,230,118,0.12)"
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5 text-emerald-400/60" />
                      ) : (
                        <ChevronRight className="size-3.5 text-emerald-400/60" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => onRenameCustomCategory(cat.id, e.target.value)}
                      placeholder="Category name..."
                      className="text-sm text-white/80 flex-1 bg-transparent outline-none placeholder:text-white/25"
                      onClick={() => {
                        if (!isExpanded) toggleSection(sectionId)
                      }}
                      autoFocus={!cat.name}
                    />
                    <span className="text-[10px] text-white/30 shrink-0">{catGoals.length}</span>
                    <button
                      onClick={() => onRemoveCustomCategory(cat.id)}
                      className="size-5 rounded flex items-center justify-center transition-colors hover:bg-red-500/20 shrink-0"
                      title="Remove category"
                    >
                      <X className="size-3 text-white/30" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9c-slideDown 0.25s ease-out" }}>
                      {catGoals.map((cg) => (
                        <div
                          key={cg.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{
                            background: "rgba(0,230,118,0.04)",
                            border: "1px solid rgba(0,230,118,0.12)",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0"
                            style={{ background: "#00E676" }}
                          >
                            <Check className="size-2.5 text-white" />
                          </div>
                          <input
                            type="text"
                            value={cg.title}
                            onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                            placeholder="Goal name..."
                            className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/25"
                            autoFocus={!cg.title}
                          />
                          <CustomGoalStepper
                            value={targets[cg.id] ?? cg.target}
                            onUpdate={(v) => onUpdateTarget(cg.id, v)}
                            onRemove={() => onRemoveCustomGoal(cg.id)}
                          />
                        </div>
                      ))}

                      <button
                        onClick={() => onAddCustomGoal(cat.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                      >
                        <Plus className="size-3.5 text-white/25" />
                        <span className="text-sm text-white/25">Add custom goal</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <button
              onClick={onAddCustomCategory}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-white/5 mb-3"
              style={{ border: "1px dashed rgba(0,230,118,0.15)" }}
            >
              <Plus className="size-3.5 text-emerald-400/40" />
              <span className="text-sm text-emerald-400/40">Add custom category</span>
            </button>
          </div>
        )}

        {lifeAreas
          .filter((a) => selectedAreas.has(a.id) && a.id !== "daygame" && a.id !== "custom")
          .map((area) => {
            const Icon = area.icon
            const suggestions = area.suggestions
            if (!suggestions || suggestions.length === 0) return null
            const isExpanded = expandedSections.has(area.id)
            const areaSelected = suggestions.filter((_, i) =>
              selectedGoals.has(`${area.id}_s${i}`)
            ).length

            return (
              <div key={area.id} className="mb-4">
                <button
                  onClick={() => toggleSection(area.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200"
                  style={{
                    background: `${area.hex}06`,
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${area.hex}15`,
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5" style={{ color: `${area.hex}80` }} />
                  ) : (
                    <ChevronRight className="size-3.5" style={{ color: `${area.hex}80` }} />
                  )}
                  <Icon className="size-3.5" style={{ color: area.hex }} />
                  <span className="text-sm text-white/80 flex-1 text-left">{area.name}</span>
                  <span className="text-[10px] text-white/30">
                    {areaSelected}/{suggestions.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1.5 space-y-1" style={{ animation: "v9c-slideDown 0.25s ease-out" }}>
                    {suggestions.map((s, i) => {
                      const id = `${area.id}_s${i}`
                      const isOn = selectedGoals.has(id)
                      const target = targets[id] ?? s.defaultTarget
                      return (
                        <div
                          key={id}
                          onClick={() => onToggle(id)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 cursor-pointer"
                          style={{
                            background: isOn ? `${area.hex}06` : "transparent",
                            border: isOn
                              ? `1px solid ${area.hex}15`
                              : "1px solid transparent",
                          }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                            style={{
                              background: isOn ? area.hex : "rgba(255,255,255,0.1)",
                              border: isOn ? "none" : "1px solid rgba(255,255,255,0.2)",
                              boxShadow: isOn ? `0 0 8px ${area.hex}30` : "none",
                            }}
                          >
                            {isOn && <Check className="size-2.5 text-white" />}
                          </div>
                          <span
                            className={`text-sm flex-1 ${isOn ? "text-white" : "text-white/50"}`}
                          >
                            {s.title}
                          </span>

                          {isOn && (
                            <TargetStepper
                              value={target}
                              period={s.defaultPeriod}
                              onUpdate={(v) => onUpdateTarget(id, v)}
                              curveButton={
                                <GoalDateButton
                                  goalId={id}
                                  effectiveDate={goalDates[id] || targetDates[area.id] || ""}
                                  accentColor={area.hex}
                                  onUpdate={onUpdateGoalDate}
                                />
                              }
                            />
                          )}
                        </div>
                      )
                    })}

                    {customGoalsForCategory(area.id).map((cg) => (
                      <div
                        key={cg.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                        style={{
                          background: `${area.hex}06`,
                          border: `1px solid ${area.hex}15`,
                        }}
                      >
                        <div
                          className="size-4 rounded flex items-center justify-center shrink-0"
                          style={{ background: area.hex }}
                        >
                          <Check className="size-2.5 text-white" />
                        </div>
                        <input
                          type="text"
                          value={cg.title}
                          onChange={(e) => onUpdateCustomGoalTitle(cg.id, e.target.value)}
                          placeholder="Goal name..."
                          className="text-sm flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/25"
                          autoFocus={!cg.title}
                        />
                        <CustomGoalStepper
                          value={targets[cg.id] ?? cg.target}
                          onUpdate={(v) => onUpdateTarget(cg.id, v)}
                          onRemove={() => onRemoveCustomGoal(cg.id)}
                        />
                      </div>
                    ))}

                    <button
                      onClick={() => onAddCustomGoal(area.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                      style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                    >
                      <Plus className="size-3.5 text-white/25" />
                      <span className="text-sm text-white/25">Add custom goal</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      <style>{`
        @keyframes v9c-slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
})
