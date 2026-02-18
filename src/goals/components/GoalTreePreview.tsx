"use client"

import { useState, useMemo } from "react"
import { format, parse, isValid, startOfDay } from "date-fns"
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, ChevronUp, Milestone, Repeat, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarWidget } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { buildPreviewState, applyPreviewState } from "../goalsService"
import { MilestoneCurveEditor } from "./MilestoneCurveEditor"
import { getCurveTheme, CURVE_THEME_IDS } from "../curveThemes"
import type { BatchGoalInsert } from "../treeGenerationService"
import type { PreviewGoalState, GoalDisplayCategory, MilestoneLadderConfig, CurveThemeId } from "../types"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../config"

interface GoalTreePreviewProps {
  inserts: BatchGoalInsert[]
  existingTemplateIds?: Set<string>
  onConfirm: (filteredInserts: BatchGoalInsert[]) => void
  onBack: () => void
  curveThemeId?: CurveThemeId
  onCurveThemeChange?: (id: CurveThemeId) => void
}

export function GoalTreePreview({ inserts, existingTemplateIds, onConfirm, onBack, curveThemeId, onCurveThemeChange }: GoalTreePreviewProps) {
  const theme = getCurveTheme(curveThemeId ?? "zen")
  const isCyber = (curveThemeId ?? "zen") === "cyberpunk"
  const inputStyle = isCyber ? { background: theme.cardBg, color: theme.text, borderColor: theme.border } as const : undefined

  const [targetDate, setTargetDate] = useState<Date | null>(null)
  const [dateText, setDateText] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const [previewState, setPreviewState] = useState<Map<string, PreviewGoalState>>(
    () => {
      const state = buildPreviewState(inserts)
      // Pre-disable goals that user already has
      if (existingTemplateIds && existingTemplateIds.size > 0) {
        for (const insert of inserts) {
          if (insert.template_id && existingTemplateIds.has(insert.template_id)) {
            const current = state.get(insert._tempId)
            if (current) {
              state.set(insert._tempId, { ...current, enabled: false })
            }
          }
        }
      }
      return state
    }
  )

  const structural = useMemo(
    () => inserts.filter((i) => (i.goal_level ?? 0) < 3),
    [inserts]
  )

  const l3ByCategory = useMemo(() => {
    const grouped: Partial<Record<GoalDisplayCategory, BatchGoalInsert[]>> = {}
    for (const insert of inserts) {
      if ((insert.goal_level ?? 0) !== 3) continue
      const cat = (insert.display_category as GoalDisplayCategory) ?? "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat]!.push(insert)
    }
    return grouped
  }, [inserts])

  const enabledCount = useMemo(() => {
    let count = 0
    for (const [, s] of previewState) {
      if (s.enabled) count++
    }
    return count
  }, [previewState])

  const allL3AlreadyTracked = useMemo(() => {
    if (!existingTemplateIds || existingTemplateIds.size === 0) return false
    const l3Inserts = inserts.filter((i) => (i.goal_level ?? 0) === 3)
    return l3Inserts.length > 0 && l3Inserts.every((i) => i.template_id && existingTemplateIds.has(i.template_id))
  }, [inserts, existingTemplateIds])

  const rootGoal = structural.find((s) => !s._tempParentId)
  const l2Goals = structural.filter((s) => (s.goal_level ?? 0) === 2)

  const disabledL2Set = useMemo(() => {
    const set = new Set<string>()
    for (const g of l2Goals) {
      const s = previewState.get(g._tempId)
      if (s && !s.enabled) set.add(g._tempId)
    }
    return set
  }, [l2Goals, previewState])

  const toggleGoal = (tempId: string) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const current = next.get(tempId)
      if (current) {
        next.set(tempId, { ...current, enabled: !current.enabled })
      }
      return next
    })
  }

  const toggleL2 = (l2TempId: string) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const current = next.get(l2TempId)
      if (!current) return prev
      const newEnabled = !current.enabled
      next.set(l2TempId, { ...current, enabled: newEnabled })
      // Cascade to all L3 children of this L2
      for (const insert of inserts) {
        if (insert._tempParentId === l2TempId && (insert.goal_level ?? 0) === 3) {
          const childState = next.get(insert._tempId)
          if (childState) {
            next.set(insert._tempId, { ...childState, enabled: newEnabled })
          }
        }
      }
      return next
    })
  }

  const updateTarget = (tempId: string, value: number) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const current = next.get(tempId)
      if (current) {
        next.set(tempId, { ...current, targetValue: value })
      }
      return next
    })
  }

  const updateMilestoneConfig = (tempId: string, config: MilestoneLadderConfig) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const current = next.get(tempId)
      if (current) {
        next.set(tempId, { ...current, milestoneConfig: config })
      }
      return next
    })
  }

  const toggleCategory = (category: GoalDisplayCategory, enabled: boolean) => {
    setPreviewState((prev) => {
      const next = new Map(prev)
      const goals = l3ByCategory[category] ?? []
      for (const g of goals) {
        const current = next.get(g._tempId)
        if (current) {
          next.set(g._tempId, { ...current, enabled })
        }
      }
      return next
    })
  }

  const handleConfirm = () => {
    const filtered = applyPreviewState(inserts, previewState)
    // Apply target date to the root (L1) goal
    if (targetDate && rootGoal) {
      const idx = filtered.findIndex((i) => i._tempId === rootGoal._tempId)
      if (idx !== -1) {
        filtered[idx] = { ...filtered[idx], target_date: format(targetDate, "yyyy-MM-dd") }
      }
    }
    onConfirm(filtered)
  }

  return (
    <div
      className="space-y-6"
      style={{
        background: theme.bg,
        color: theme.text,
        borderRadius: theme.borderRadius,
        padding: 20,
        border: `1px solid ${theme.border}`,
        position: "relative",
        overflow: "hidden",
        fontFamily: isCyber ? "var(--font-mono, 'Geist Mono', monospace)" : "inherit",
        textTransform: theme.textTransform,
      }}
    >
      {/* Cyberpunk decorative overlays */}
      {theme.scanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.03) 2px, rgba(255,0,51,0.03) 4px)",
          }}
        />
      )}
      {theme.cornerBrackets && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}`, zIndex: 11 }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderTop: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}`, zIndex: 11 }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 16, height: 16, borderBottom: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}`, zIndex: 11 }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}`, zIndex: 11 }} />
        </>
      )}

      <div style={{ position: "relative", zIndex: 5 }}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm transition-colors cursor-pointer"
            style={{ color: theme.muted }}
            data-testid="catalog-back-button"
          >
            <ArrowLeft className="size-3.5" />
            Back to catalog
          </button>
          {/* Theme switcher */}
          {onCurveThemeChange && (
            <div className="flex items-center gap-1.5">
              {CURVE_THEME_IDS.map((id) => {
                const t = getCurveTheme(id)
                const isActive = id === (curveThemeId ?? "zen")
                return (
                  <button
                    key={id}
                    onClick={() => onCurveThemeChange(id)}
                    title={t.label}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: isCyber ? 2 : 8,
                      background: t.accent,
                      border: `2px solid ${isActive ? theme.text : "transparent"}`,
                      cursor: "pointer",
                      boxShadow: isActive
                        ? `0 0 0 1px ${theme.bg}, 0 0 6px ${t.accent}60`
                        : "none",
                      opacity: isActive ? 1 : 0.4,
                      transition: "all 150ms ease",
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold" style={{ color: theme.text }}>Customize Your Goals</h2>
        <p className="text-sm mt-1" style={{ color: theme.muted }}>
          Your big goal breaks into trackable sub-goals. Toggle any off or adjust targets to fit your pace.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <span className="flex items-center gap-1 text-xs" style={{ color: theme.muted }}>
            <Milestone className="size-3" />
            <span><span className="font-medium" style={{ color: theme.text }}>Milestone</span> — cumulative lifetime target</span>
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: theme.muted }}>
            <Repeat className="size-3" />
            <span><span className="font-medium" style={{ color: theme.text }}>Habit Ramp</span> — weekly target that grows over time</span>
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg p-4" style={{ border: `1px solid ${theme.border}`, background: theme.cardBg }}>
        {rootGoal && (
          <p className="font-semibold text-sm" style={{ color: theme.text }}>{rootGoal.title}</p>
        )}
        <p className="text-xs mt-1" style={{ color: theme.muted }}>
          {enabledCount} {enabledCount === 1 ? "goal" : "goals"} selected
        </p>
        {l2Goals.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {l2Goals.map((g) => {
              const state = previewState.get(g._tempId)
              const enabled = state?.enabled ?? true
              const childCount = inserts.filter(
                (i) => i._tempParentId === g._tempId && (i.goal_level ?? 0) === 3
              ).length
              return (
                <button
                  key={g._tempId}
                  onClick={() => toggleL2(g._tempId)}
                  className="text-xs rounded-full px-2.5 py-0.5 transition-colors cursor-pointer"
                  style={enabled
                    ? { background: `${theme.accent}15`, color: theme.accent }
                    : { background: `${theme.muted}20`, color: theme.muted, textDecoration: "line-through", opacity: 0.6 }
                  }
                >
                  {g.title}{childCount > 0 ? ` (${childCount})` : ""}
                </button>
              )
            })}
          </div>
        )}

        {/* Target date for the top-level goal */}
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
          <p className="text-xs font-medium flex items-center gap-1.5 mb-1.5" style={{ color: theme.muted }}>
            <Calendar className="size-3" />
            Achieve by (optional)
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="dd/mm/yyyy"
                value={dateText}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 8)
                  let masked = ""
                  for (let i = 0; i < raw.length; i++) {
                    if (i === 2 || i === 4) masked += "/"
                    masked += raw[i]
                  }
                  setDateText(masked)
                  const parsed = parse(masked, "dd/MM/yyyy", new Date())
                  if (masked.length === 10 && isValid(parsed) && parsed >= startOfDay(new Date())) {
                    setTargetDate(parsed)
                  } else {
                    setTargetDate(null)
                  }
                }}
                className="w-36"
                style={inputStyle}
              />
              {dateText.length > 0 && dateText.length < 10 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none" style={{ color: `${theme.muted}66` }}>
                  {"dd/mm/yyyy".slice(dateText.length)}
                </span>
              )}
            </div>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className="transition-colors cursor-pointer"
                  style={{ color: theme.accent }}
                  aria-label="Open calendar"
                >
                  <Calendar className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  captionLayout="dropdown"
                  selected={targetDate ?? undefined}
                  onSelect={(d) => {
                    setTargetDate(d ?? null)
                    setDateText(d ? format(d, "dd/MM/yyyy") : "")
                    setDatePickerOpen(false)
                  }}
                  defaultMonth={targetDate ?? new Date()}
                  startMonth={new Date()}
                  endMonth={new Date(new Date().getFullYear() + 5, 11)}
                  disabled={{ before: startOfDay(new Date()) }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            {targetDate && (
              <button
                onClick={() => { setTargetDate(null); setDateText("") }}
                className="transition-colors cursor-pointer"
                style={{ color: theme.muted }}
                aria-label="Clear date"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* L3 Goals by Category */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const goals = l3ByCategory[cat]
          if (!goals || goals.length === 0) return null
          return (
            <CategorySection
              key={cat}
              category={cat}
              goals={goals}
              previewState={previewState}
              existingTemplateIds={existingTemplateIds}
              defaultCollapsed={cat === "dirty_dog"}
              onToggle={toggleGoal}
              onToggleCategory={toggleCategory}
              onUpdateTarget={updateTarget}
              onUpdateMilestoneConfig={updateMilestoneConfig}
              disabledL2s={disabledL2Set}
              curveThemeId={curveThemeId}
              onCurveThemeChange={onCurveThemeChange}
            />
          )
        })}
      </div>

      {/* All-tracked notice */}
      {allL3AlreadyTracked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          All sub-goals are already active in another tree. Creating this adds a top-level goal only — you can add custom sub-goals to it afterward via &quot;New Goal&quot;.
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          className="flex-1"
          data-testid="catalog-confirm-button"
          style={isCyber ? { background: theme.accent, color: "#fff", borderColor: theme.accent } : undefined}
        >
          Create {enabledCount} {enabledCount === 1 ? "Goal" : "Goals"}
        </Button>
        <Button variant="ghost" onClick={onBack} style={{ color: theme.muted }}>
          Back
        </Button>
      </div>
      </div>{/* close z-5 wrapper */}
    </div>
  )
}

// ============================================================================
// Category Section
// ============================================================================

interface CategorySectionProps {
  category: GoalDisplayCategory
  goals: BatchGoalInsert[]
  previewState: Map<string, PreviewGoalState>
  existingTemplateIds?: Set<string>
  defaultCollapsed: boolean
  onToggle: (tempId: string) => void
  onToggleCategory: (category: GoalDisplayCategory, enabled: boolean) => void
  onUpdateTarget: (tempId: string, value: number) => void
  onUpdateMilestoneConfig: (tempId: string, config: MilestoneLadderConfig) => void
  disabledL2s: Set<string>
  curveThemeId?: CurveThemeId
  onCurveThemeChange?: (id: CurveThemeId) => void
}

function CategorySection({
  category,
  goals,
  previewState,
  existingTemplateIds,
  defaultCollapsed,
  onToggle,
  onToggleCategory,
  onUpdateTarget,
  onUpdateMilestoneConfig,
  disabledL2s,
  curveThemeId,
  onCurveThemeChange,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const label = CATEGORY_LABELS[category]
  const theme = getCurveTheme(curveThemeId ?? "zen")

  const enabledInCategory = goals.filter(
    (g) => previewState.get(g._tempId)?.enabled
  ).length
  const allEnabled = enabledInCategory === goals.length
  const noneEnabled = enabledInCategory === 0

  const isDirtyDog = category === "dirty_dog"

  if (isDirtyDog) {
    return (
      <div className="relative">
        <div className="rounded-xl p-4" style={{ border: `1px solid ${theme.border}`, background: theme.cardBg }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm" style={{ color: theme.text }}>{label}</h3>
            <span className="text-xs" style={{ color: theme.muted }}>
              {enabledInCategory}/{goals.length} selected
            </span>
          </div>
          <p className="text-xs" style={{ color: `${theme.muted}b3` }}>
            These track intimate outcomes. Opt in if relevant.
          </p>

          {!collapsed && (
            <div className="space-y-1.5 mt-3">
              {goals.map((goal) => {
                const state = previewState.get(goal._tempId)
                if (!state) return null
                const parentOff = !!(goal._tempParentId && disabledL2s.has(goal._tempParentId))
                return (
                  <GoalPreviewRow
                    key={goal._tempId}
                    goal={goal}
                    state={state}
                    isExisting={!!(goal.template_id && existingTemplateIds?.has(goal.template_id))}
                    parentDisabled={parentOff}
                    onToggle={() => onToggle(goal._tempId)}
                    onUpdateTarget={(val) => onUpdateTarget(goal._tempId, val)}
                    onUpdateMilestoneConfig={(config) => onUpdateMilestoneConfig(goal._tempId, config)}
                    curveThemeId={curveThemeId}
                    onCurveThemeChange={onCurveThemeChange}
                  />
                )
              })}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onToggleCategory(category, noneEnabled || !allEnabled)}
                  className="text-xs transition-colors cursor-pointer"
                  style={{ color: theme.muted }}
                >
                  {allEnabled ? "Deselect all" : "Select all"}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-center -mt-4 relative z-10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="group flex items-center gap-2 pl-4 pr-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
          >
            <span className="text-xs font-medium">
              {collapsed ? `Show ${goals.length} goals` : "Hide"}
            </span>
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          style={{ color: theme.muted }}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          <span>{label}</span>
          <span style={{ color: `${theme.muted}80` }}>
            {enabledInCategory}/{goals.length}
          </span>
        </button>
        <div className="flex-1 ml-2" style={{ borderTop: `1px solid ${theme.border}` }} />
        <button
          onClick={() => onToggleCategory(category, noneEnabled || !allEnabled)}
          className="text-xs transition-colors cursor-pointer"
          style={{ color: theme.muted }}
        >
          {allEnabled ? "Deselect all" : "Select all"}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-1.5">
          {goals.map((goal) => {
            const state = previewState.get(goal._tempId)
            if (!state) return null
            const parentOff = !!(goal._tempParentId && disabledL2s.has(goal._tempParentId))
            return (
              <GoalPreviewRow
                key={goal._tempId}
                goal={goal}
                state={state}
                isExisting={!!(goal.template_id && existingTemplateIds?.has(goal.template_id))}
                parentDisabled={parentOff}
                onToggle={() => onToggle(goal._tempId)}
                onUpdateTarget={(val) => onUpdateTarget(goal._tempId, val)}
                onUpdateMilestoneConfig={(config) => onUpdateMilestoneConfig(goal._tempId, config)}
                curveThemeId={curveThemeId}
                onCurveThemeChange={onCurveThemeChange}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Goal Preview Row
// ============================================================================

interface GoalPreviewRowProps {
  goal: BatchGoalInsert
  state: PreviewGoalState
  isExisting?: boolean
  parentDisabled?: boolean
  onToggle: () => void
  onUpdateTarget: (value: number) => void
  onUpdateMilestoneConfig: (config: MilestoneLadderConfig) => void
  curveThemeId?: CurveThemeId
  onCurveThemeChange?: (id: CurveThemeId) => void
}

function GoalPreviewRow({ goal, state, isExisting = false, parentDisabled = false, onToggle, onUpdateTarget, onUpdateMilestoneConfig, curveThemeId, onCurveThemeChange }: GoalPreviewRowProps) {
  const [showCurve, setShowCurve] = useState(false)
  const isRamp = goal.goal_type === "habit_ramp"
  const isMilestone = !isRamp && !!state.milestoneConfig
  const effectivelyOff = parentDisabled || !state.enabled
  const theme = getCurveTheme(curveThemeId ?? "zen")

  return (
    <div
      className="rounded-lg p-3 transition-colors"
      style={effectivelyOff
        ? { border: `1px solid ${theme.border}80`, background: `${theme.cardBg}80`, opacity: 0.6 }
        : { border: `1px solid ${theme.border}`, background: theme.cardBg }
      }
    >
      <div className="flex items-center gap-3">
      {/* Toggle */}
      <button
        onClick={parentDisabled ? undefined : onToggle}
        disabled={parentDisabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
          parentDisabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{ background: state.enabled && !parentDisabled ? theme.accent : `${theme.muted}40` }}
        role="switch"
        aria-checked={state.enabled && !parentDisabled}
      >
        <span
          className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${
            state.enabled && !parentDisabled ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${parentDisabled ? "line-through" : ""}`} style={{ color: theme.text }}>{goal.title}</p>
        <div className="flex items-center gap-2 text-xs" style={{ color: theme.muted }}>
          {isRamp ? (
            <span className="flex items-center gap-1">
              <Repeat className="size-3" />
              Habit Ramp
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Milestone className="size-3" />
              Milestone Ladder
            </span>
          )}
          {goal.linked_metric && (
            <span className="text-blue-400">Auto-synced</span>
          )}
          {isExisting && (
            <span className="text-amber-400">Already tracking</span>
          )}
          {parentDisabled && (
            <span style={{ color: `${theme.muted}b3` }} className="italic">Parent goal disabled</span>
          )}
        </div>
      </div>

      {/* Target editor */}
      {state.enabled && !parentDisabled && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: theme.muted }}>Target:</span>
          <input
            type="number"
            value={state.targetValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v > 0) onUpdateTarget(v)
            }}
            className="w-16 text-right text-sm font-medium rounded px-1.5 py-0.5 focus:outline-none"
            style={{ background: `${theme.muted}15`, border: `1px solid ${theme.border}`, color: theme.text }}
            min={1}
          />
          {isRamp && <span className="text-xs" style={{ color: theme.muted }}>/wk</span>}
        </div>
      )}
      </div>

      {/* Milestone curve editor */}
      {isMilestone && state.enabled && !parentDisabled && (
        <div className="mt-2">
          <button
            onClick={() => setShowCurve(!showCurve)}
            className="text-xs transition-colors cursor-pointer"
            style={{ color: theme.muted }}
          >
            {showCurve ? "Hide curve" : "Customize curve"}
          </button>
          {showCurve && state.milestoneConfig && (
            <div className="mt-2">
              <MilestoneCurveEditor
                config={{ ...state.milestoneConfig, target: state.targetValue }}
                onChange={onUpdateMilestoneConfig}
                themeId={curveThemeId}
                onThemeChange={onCurveThemeChange}
                allowDirectEdit
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
