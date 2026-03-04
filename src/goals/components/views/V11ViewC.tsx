"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  TrendingUp,
  Clock,
  RotateCcw,
  Pencil,
  Trash2,
  Archive,
  Search,
  X,
  Star,
  Filter,
  Rocket,
  Sparkles,
  Sun,
  TreePine,
  Target,
  Zap,
  Layers,
  Eye,
  EyeOff,
  Trophy,
} from "lucide-react"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import { getChildren } from "../../data/goalGraph"
import type { V11ViewProps } from "./V11ViewProps"
import type {
  GoalWithProgress,
  GoalTemplate,
  GoalTreeNode,
  LifeAreaConfig,
  UserGoalInsert,
} from "../../types"

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_LABELS: Record<number, string> = {
  0: "Dream",
  1: "Major Goal",
  2: "Achievement",
  3: "Action",
}

const LEVEL_ICONS: Record<number, string> = {
  0: "star",
  1: "target",
  2: "zap",
  3: "check",
}

const PERIOD_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
}

// ============================================================================
// HELPER: Compute aggregated progress for a tree node
// ============================================================================

function computeTreeProgress(node: GoalTreeNode): number {
  if (node.children.length === 0) return node.progress_percentage
  const childProgresses = node.children.map(computeTreeProgress)
  const avg = childProgresses.reduce((s, v) => s + v, 0) / childProgresses.length
  return Math.round(avg)
}

function countDescendants(node: GoalTreeNode): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countDescendants(child)
  }
  return count
}

function countActionItems(node: GoalTreeNode): number {
  let count = 0
  if ((node.goal_level ?? 99) === 3) count = 1
  for (const child of node.children) {
    count += countActionItems(child)
  }
  return count
}

function countCompletedActions(node: GoalTreeNode): number {
  let count = 0
  if ((node.goal_level ?? 99) === 3 && node.is_complete) count = 1
  for (const child of node.children) {
    count += countCompletedActions(child)
  }
  return count
}

/** Collect all L3 leaf goals from a tree */
function collectL3Goals(nodes: GoalTreeNode[]): GoalWithProgress[] {
  const result: GoalWithProgress[] = []
  function walk(node: GoalTreeNode) {
    if ((node.goal_level ?? 99) === 3) {
      result.push(node)
    }
    for (const child of node.children) walk(child)
  }
  for (const n of nodes) walk(n)
  return result
}

/** Collect all goals from tree into flat array */
function collectAllGoals(nodes: GoalTreeNode[]): GoalWithProgress[] {
  const result: GoalWithProgress[] = []
  function walk(node: GoalTreeNode) {
    result.push(node)
    for (const child of node.children) walk(child)
  }
  for (const n of nodes) walk(n)
  return result
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/** Small circular progress ring */
function ProgressRing({
  percent,
  size = 32,
  strokeWidth = 3,
  color,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Level indicator badge with color coding */
function LevelBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    0: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    2: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    3: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
        colors[level] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      L{level} {LEVEL_LABELS[level] ?? ""}
    </span>
  )
}

// ============================================================================
// MULTI-STEP ONBOARDING WIZARD
// ============================================================================

type WizardStep = "dream" | "plan" | "customize" | "create"

function SetupWizard({
  templates,
  lifeAreas,
  onCreate,
  onBatchCreate,
}: {
  templates: GoalTemplate[]
  lifeAreas: LifeAreaConfig[]
  onCreate: V11ViewProps["onCreate"]
  onBatchCreate: V11ViewProps["onBatchCreate"]
}) {
  const [step, setStep] = useState<WizardStep>("dream")
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedDreamId, setSelectedDreamId] = useState<string | null>(null)
  const [enabledTemplates, setEnabledTemplates] = useState<Set<string>>(new Set())
  const [targetOverrides, setTargetOverrides] = useState<Record<string, number>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [customArea, setCustomArea] = useState("daygame")
  const [customTarget, setCustomTarget] = useState(1)
  const [customPeriod, setCustomPeriod] = useState("weekly")

  const realAreas = lifeAreas.filter((a) => a.id !== "custom")

  // L0/L1 templates for dream selection
  const dreamTemplates = useMemo(() => {
    let list = templates.filter((t) => t.level <= 1)
    if (selectedArea) list = list.filter((t) => t.lifeArea === selectedArea)
    return list
  }, [templates, selectedArea])

  // Build the plan tree for the selected dream
  const planTree = useMemo(() => {
    if (!selectedDreamId) return []
    // Find direct children of this dream (L2/L3 templates)
    // For simplicity, get all L2+L3 templates in same life area
    const dream = templates.find((t) => t.id === selectedDreamId)
    if (!dream) return []
    return templates.filter(
      (t) => t.lifeArea === dream.lifeArea && t.level > dream.level
    )
  }, [templates, selectedDreamId])

  // Auto-enable core templates when plan is generated
  const handleSelectDream = (id: string) => {
    setSelectedDreamId(id)
    const dream = templates.find((t) => t.id === id)
    if (dream) {
      const related = templates.filter(
        (t) => t.lifeArea === dream.lifeArea && t.level > dream.level
      )
      const coreIds = new Set(
        related.filter((t) => t.priority === "core").map((t) => t.id)
      )
      coreIds.add(id)
      setEnabledTemplates(coreIds)
    }
    setStep("plan")
  }

  const toggleTemplate = (id: string) => {
    setEnabledTemplates((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBatchCreate = async () => {
    if (enabledTemplates.size === 0) return
    setIsCreating(true)
    try {
      const TEMP_PREFIX = "temp_"
      const dream = templates.find((t) => t.id === selectedDreamId)

      // Build a map of template ID -> tempParentId based on the graph hierarchy
      // Dream is root (null parent).
      // If dream is L0: L1 children point to dream, L3s point to their L1 parent.
      // If dream is L1: L3s point directly to dream.
      // L2s are standalone badges (null parent).
      const parentMap = new Map<string, string | null>()

      if (dream) {
        parentMap.set(dream.id, null)

        if (dream.level === 0) {
          // Find L1 children of this L0 dream in the graph
          const l1Children = getChildren(dream.id).filter((c) => c.level === 1)
          for (const l1 of l1Children) {
            if (enabledTemplates.has(l1.id)) {
              parentMap.set(l1.id, TEMP_PREFIX + dream.id)
              // L3 children of this L1
              const l3Children = getChildren(l1.id).filter((c) => c.level === 3)
              for (const l3 of l3Children) {
                if (enabledTemplates.has(l3.id)) {
                  parentMap.set(l3.id, TEMP_PREFIX + l1.id)
                }
              }
            }
          }
        } else if (dream.level === 1) {
          // L3 children point directly to this L1 dream
          const l3Children = getChildren(dream.id).filter((c) => c.level === 3)
          for (const l3 of l3Children) {
            if (enabledTemplates.has(l3.id)) {
              parentMap.set(l3.id, TEMP_PREFIX + dream.id)
            }
          }
        }
      }

      // Sort inserts: parents before children (lower level first)
      const sortedIds = Array.from(enabledTemplates).sort((a, b) => {
        const ta = templates.find((t) => t.id === a)
        const tb = templates.find((t) => t.id === b)
        return (ta?.level ?? 99) - (tb?.level ?? 99)
      })

      const inserts = sortedIds
        .map((id) => {
          const t = templates.find((tpl) => tpl.id === id)
          if (!t) return null
          return {
            _tempId: TEMP_PREFIX + t.id,
            _tempParentId: parentMap.get(t.id) ?? null,
            title: t.title,
            life_area: t.lifeArea,
            category: t.lifeArea,
            goal_type:
              t.templateType === "milestone_ladder"
                ? "milestone"
                : t.templateType === "habit_ramp"
                  ? "habit_ramp"
                  : "recurring",
            goal_nature: t.nature,
            goal_level: t.level,
            display_category: t.displayCategory,
            tracking_type: "counter" as const,
            period: "weekly" as const,
            target_value:
              targetOverrides[t.id] ??
              t.defaultMilestoneConfig?.target ??
              t.defaultRampSteps?.[0]?.frequencyPerWeek ??
              1,
            template_id: t.id,
            linked_metric: t.linkedMetric,
            milestone_config: t.defaultMilestoneConfig,
            ramp_steps: t.defaultRampSteps,
          }
        })
        .filter(Boolean) as Parameters<typeof onBatchCreate>[0]
      await onBatchCreate(inserts)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCustomCreate = async () => {
    if (!customTitle.trim()) return
    setIsCreating(true)
    try {
      await onCreate({
        title: customTitle.trim(),
        life_area: customArea,
        category: customArea,
        goal_type: "recurring",
        tracking_type: "counter",
        period: customPeriod as UserGoalInsert["period"],
        target_value: customTarget,
      })
      setCustomTitle("")
      setCustomTarget(1)
      setShowCustomForm(false)
    } finally {
      setIsCreating(false)
    }
  }

  const stepIndicator = (
    <div className="flex items-center justify-center gap-1 mb-8">
      {(["dream", "plan", "customize", "create"] as WizardStep[]).map((s, i) => {
        const labels = ["Dream", "Plan", "Customize", "Create"]
        const isActive = s === step
        const isPast =
          (["dream", "plan", "customize", "create"] as WizardStep[]).indexOf(step) > i
        return (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`w-8 h-0.5 ${
                  isPast ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isPast
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isPast ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {labels[i]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  // ----- Step 1: Pick a dream -----
  if (step === "dream") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {stepIndicator}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Star className="size-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">What's Your Dream?</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Pick a big-picture goal. We'll build a concrete action plan beneath it.
          </p>
        </div>

        {/* Area filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => setSelectedArea(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedArea === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            All Areas
          </button>
          {realAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedArea === area.id
                  ? "border-transparent text-white"
                  : "bg-card border-border text-muted-foreground hover:border-border/80"
              }`}
              style={
                selectedArea === area.id ? { backgroundColor: area.hex } : undefined
              }
            >
              {area.name}
            </button>
          ))}
        </div>

        {/* Dream cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {dreamTemplates.map((tpl) => {
            const area = getLifeAreaConfig(tpl.lifeArea)
            const isSelected = selectedDreamId === tpl.id
            return (
              <button
                key={tpl.id}
                onClick={() => handleSelectDream(tpl.id)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-border/80 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${area.hex}15` }}
                  >
                    <Star className="size-5" style={{ color: area.hex }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tpl.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{area.name}</span>
                      <LevelBadge level={tpl.level} />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {dreamTemplates.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No dreams found for this area.
          </p>
        )}

        {/* Continue button when a dream is already selected (preserves plan/customize state) */}
        {selectedDreamId && (
          <div className="mt-6 flex justify-center">
            <Button onClick={() => setStep("plan")} className="gap-1">
              Continue with Plan
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}

        {/* Custom goal fallback */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => {
              setShowCustomForm(true)
              setStep("customize")
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            Create Custom Goal Instead
          </Button>
        </div>
      </div>
    )
  }

  // ----- Step 2: Show the plan tree -----
  if (step === "plan") {
    const dream = templates.find((t) => t.id === selectedDreamId)
    const l2s = planTree.filter((t) => t.level === 2)
    const l3s = planTree.filter((t) => t.level === 3)

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {stepIndicator}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Here's Your Plan</h2>
          <p className="text-muted-foreground text-sm">
            We've built a goal tree from "{dream?.title}". Review and proceed to customize.
          </p>
        </div>

        {/* Tree preview with connecting lines */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          {/* Dream root */}
          {dream && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <Star className="size-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{dream.title}</p>
                <LevelBadge level={dream.level} />
              </div>
            </div>
          )}

          {/* L1 children (if dream is L0) */}
          {dream && dream.level === 0 && (() => {
            const l1Children = getChildren(dream.id).filter((c) => c.level === 1 && enabledTemplates.has(c.id))
            return l1Children.length > 0 && (
              <div className="relative mt-2 ml-4">
                {l1Children.map((l1, l1Idx) => (
                  <div key={l1.id} className="relative pl-6 pb-2">
                    {/* Vertical line from parent */}
                    <div
                      className="absolute left-[11px] top-0 w-px bg-border"
                      style={{ height: l1Idx === l1Children.length - 1 ? "20px" : "100%" }}
                    />
                    {/* Horizontal branch */}
                    <div className="absolute left-[11px] top-5 h-px bg-border w-[13px]" />
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <Target className="size-4 text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-medium">{l1.title}</span>
                      <LevelBadge level={1} />
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* L2 achievements */}
          {l2s.length > 0 && (
            <div className="relative mt-2 ml-4">
              <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-2 ml-6">
                Achievements to Unlock
              </p>
              {l2s.map((t, i) => (
                <div key={t.id} className="relative pl-6 pb-1.5">
                  {/* Vertical line */}
                  <div
                    className="absolute left-[11px] top-0 w-px bg-border"
                    style={{ height: i === l2s.length - 1 && l3s.length === 0 ? "14px" : "100%" }}
                  />
                  {/* Horizontal branch */}
                  <div className="absolute left-[11px] top-[11px] h-px bg-border w-[13px]" />
                  <div className="flex items-center gap-2 text-sm py-0.5">
                    <Zap className="size-3.5 text-purple-400 flex-shrink-0" />
                    <span>{t.title}</span>
                    <LevelBadge level={2} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* L3 action items */}
          {l3s.length > 0 && (
            <div className="relative mt-2 ml-4">
              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider mb-2 ml-6">
                Action Items ({l3s.length})
              </p>
              {l3s.slice(0, 8).map((t, i) => {
                const enabled = enabledTemplates.has(t.id)
                const isLastItem = i === Math.min(l3s.length, 8) - 1 && l3s.length <= 8
                return (
                  <div key={t.id} className="relative pl-6 pb-1.5">
                    {/* Vertical line */}
                    <div
                      className="absolute left-[11px] top-0 w-px bg-border"
                      style={{ height: isLastItem ? "14px" : "100%" }}
                    />
                    {/* Horizontal branch */}
                    <div className="absolute left-[11px] top-[11px] h-px bg-border w-[13px]" />
                    <div className="flex items-center gap-2 text-sm py-0.5">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          enabled
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-border"
                        }`}
                      >
                        {enabled && <Check className="size-2.5 text-white" />}
                      </div>
                      <span className={enabled ? "" : "text-muted-foreground"}>
                        {t.title}
                      </span>
                      {t.priority === "core" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 h-3.5 border-orange-500/30 text-orange-400"
                        >
                          Core
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
              {l3s.length > 8 && (
                <p className="text-xs text-muted-foreground ml-6 mt-1">
                  +{l3s.length - 8} more action items
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep("dream")}>
            Back
          </Button>
          <Button onClick={() => setStep("customize")} className="gap-1">
            Customize Plan
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  // ----- Step 3: Customize -----
  if (step === "customize") {
    const dream = templates.find((t) => t.id === selectedDreamId)
    const allRelated = dream
      ? templates.filter(
          (t) => t.lifeArea === dream.lifeArea && t.level >= 2
        )
      : []

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {stepIndicator}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">Customize Your Goals</h2>
          <p className="text-muted-foreground text-sm">
            Toggle goals on/off and adjust targets. Core goals are recommended.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {allRelated.map((tpl) => {
            const enabled = enabledTemplates.has(tpl.id)
            const defaultTarget =
              tpl.defaultMilestoneConfig?.target ??
              tpl.defaultRampSteps?.[0]?.frequencyPerWeek ??
              1
            const currentTarget = targetOverrides[tpl.id] ?? defaultTarget
            return (
              <div
                key={tpl.id}
                className={`rounded-lg border p-3 transition-all ${
                  enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTemplate(tpl.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      enabled
                        ? "bg-primary border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {enabled && <Check className="size-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {tpl.title}
                      </span>
                      <LevelBadge level={tpl.level} />
                      {tpl.priority === "core" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 h-3.5 border-orange-500/30 text-orange-400"
                        >
                          Core
                        </Badge>
                      )}
                    </div>
                  </div>
                  {enabled && tpl.level === 3 && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <label className="text-[10px] text-muted-foreground">
                        Target:
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={currentTarget}
                        onChange={(e) =>
                          setTargetOverrides((prev) => ({
                            ...prev,
                            [tpl.id]: Number(e.target.value) || 1,
                          }))
                        }
                        className="w-16 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>
                {/* Target value preview — shows what the goal commitment looks like */}
                {enabled && tpl.level === 3 && (
                  <div className="mt-1.5 ml-8 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">
                        Do {currentTarget} {tpl.title.toLowerCase()}
                      </span>{" "}
                      per week
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Custom goal form */}
        {showCustomForm && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 mb-6">
            <h3 className="text-sm font-semibold">Add Custom Goal</h3>
            <div className="space-y-2">
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Goal title..."
                onKeyDown={(e) => e.key === "Enter" && handleCustomCreate()}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  {realAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  value={customTarget}
                  onChange={(e) => setCustomTarget(Number(e.target.value) || 1)}
                  className="h-8 text-xs"
                  placeholder="Target"
                />
                <select
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCustomCreate}
                  disabled={!customTitle.trim() || isCreating}
                  className="h-7 text-xs"
                >
                  {isCreating ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <Plus className="size-3 mr-1" />
                  )}
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomForm(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {!showCustomForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomForm(true)}
            className="gap-1 mb-6"
          >
            <Plus className="size-3" />
            Add Custom Goal
          </Button>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep("plan")}>
            Back
          </Button>
          <Button
            onClick={() => setStep("create")}
            disabled={enabledTemplates.size === 0}
            className="gap-1"
          >
            Review ({enabledTemplates.size})
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  // ----- Step 4: Create / confirm -----
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {stepIndicator}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <Rocket className="size-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ready to Launch</h2>
        <p className="text-muted-foreground text-sm">
          {enabledTemplates.size} goals will be created. You can always edit them later.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 mb-8">
        {Array.from(enabledTemplates).map((id) => {
          const tpl = templates.find((t) => t.id === id)
          if (!tpl) return null
          const area = getLifeAreaConfig(tpl.lifeArea)
          return (
            <div key={id} className="flex items-center gap-2 py-1">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: area.hex }}
              />
              <span className="text-sm flex-1 truncate">{tpl.title}</span>
              <LevelBadge level={tpl.level} />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep("customize")}>
          Back
        </Button>
        <Button
          onClick={handleBatchCreate}
          disabled={isCreating || enabledTemplates.size === 0}
          size="lg"
          className="gap-2"
        >
          {isCreating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isCreating ? "Creating..." : `Create ${enabledTemplates.size} Goals`}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// TREE NODE COMPONENT — Hierarchical goal display with visual connecting lines
// ============================================================================

function TreeNode({
  node,
  depth,
  props,
  expandedNodes,
  toggleExpanded,
  onStartEdit,
  isLast,
}: {
  node: GoalTreeNode
  depth: number
  props: V11ViewProps
  expandedNodes: Set<string>
  toggleExpanded: (id: string) => void
  onStartEdit: (g: GoalWithProgress) => void
  isLast: boolean
}) {
  const [isActing, setIsActing] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [directValue, setDirectValue] = useState(String(node.current_value))
  const [showAddChild, setShowAddChild] = useState(false)
  const [childTitle, setChildTitle] = useState("")
  const [childTarget, setChildTarget] = useState(1)
  const [isCreatingChild, setIsCreatingChild] = useState(false)

  const area = getLifeAreaConfig(node.life_area)
  const level = node.goal_level ?? 3
  const isExpanded = expandedNodes.has(node.id)
  const hasChildren = node.children.length > 0
  const rollUpProgress = computeTreeProgress(node)
  const actionCount = countActionItems(node)
  const completedActions = countCompletedActions(node)
  const inputMode = props.getInputMode(node)
  const milestoneInfo = props.getNextMilestoneInfo(node)

  const handleIncrement = async (amount: number) => {
    if (isActing) return
    setIsActing(true)
    try {
      await props.onIncrement(node.id, amount)
      if (!node.is_complete && node.current_value + amount >= node.target_value) {
        const tier = props.getCelebrationTier(node)
        props.onCelebrate(tier, node.title)
      }
    } finally {
      setIsActing(false)
    }
  }

  const handleSetValue = async (value: number) => {
    if (isActing) return
    setIsActing(true)
    try {
      await props.onSetValue(node.id, value)
      if (!node.is_complete && value >= node.target_value) {
        const tier = props.getCelebrationTier(node)
        props.onCelebrate(tier, node.title)
      }
    } finally {
      setIsActing(false)
    }
  }

  const handleReset = async () => {
    setIsActing(true)
    try {
      await props.onReset(node.id)
    } finally {
      setIsActing(false)
      setShowResetConfirm(false)
    }
  }

  const handleArchive = async () => {
    setIsActing(true)
    try {
      await props.onArchive(node.id)
    } finally {
      setIsActing(false)
    }
  }

  const handleDelete = async () => {
    setIsActing(true)
    try {
      await props.onDelete(node.id)
    } finally {
      setIsActing(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleAddChild = async () => {
    if (!childTitle.trim() || isCreatingChild) return
    setIsCreatingChild(true)
    try {
      const childLevel = Math.min((level ?? 0) + 1, 3)
      await props.onCreate({
        title: childTitle.trim(),
        life_area: node.life_area,
        category: node.life_area,
        goal_type: childLevel === 3 ? "recurring" : "recurring",
        tracking_type: "counter",
        period: "weekly",
        target_value: childTarget,
        goal_level: childLevel,
        parent_goal_id: node.id,
      })
      setChildTitle("")
      setChildTarget(1)
      setShowAddChild(false)
    } finally {
      setIsCreatingChild(false)
    }
  }

  // Visual styling by level
  const levelStyles: Record<number, { container: string; title: string; ring: number }> = {
    0: {
      container: "p-4 rounded-xl border-2",
      title: "text-lg font-bold",
      ring: 40,
    },
    1: {
      container: "p-3.5 rounded-xl border-2",
      title: "text-base font-bold",
      ring: 36,
    },
    2: {
      container: "p-3 rounded-lg border",
      title: "text-sm font-semibold",
      ring: 28,
    },
    3: {
      container: "p-2.5 rounded-lg border",
      title: "text-sm font-medium",
      ring: 24,
    },
  }

  const style = levelStyles[level] ?? levelStyles[3]

  return (
    <div className="relative">
      {/* Vertical connecting line from parent — uses life area color */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 w-px"
          style={{
            left: `${(depth - 1) * 24 + 11}px`,
            height: isLast ? "20px" : "100%",
            backgroundColor: `${area.hex}40`,
          }}
        />
      )}
      {/* Horizontal branch connector — uses life area color */}
      {depth > 0 && (
        <div
          className="absolute top-5 h-px"
          style={{
            left: `${(depth - 1) * 24 + 11}px`,
            width: "13px",
            backgroundColor: `${area.hex}40`,
          }}
        />
      )}

      <div style={{ marginLeft: `${depth * 24}px` }}>
        {/* The node card */}
        <div
          className={`group/node ${style.container} bg-card transition-all hover:shadow-sm ${
            node.is_complete ? "opacity-60" : ""
          }`}
          style={{
            borderColor: level <= 1 ? `${area.hex}40` : undefined,
            backgroundColor: level <= 1 ? `${area.hex}05` : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Expand/collapse or quick action */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(node.id)}
                className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            ) : !node.is_complete && !node.linked_metric && level === 3 ? (
              <div onClick={(e) => e.stopPropagation()}>
                {inputMode === "boolean" ? (
                  <button
                    onClick={() => handleIncrement(1)}
                    disabled={isActing}
                    className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-green-500 hover:border-green-500/40 transition-colors"
                  >
                    {isActing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleIncrement(1)}
                    disabled={isActing}
                    className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {isActing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
            ) : node.is_complete ? (
              <div className="w-7 h-7 rounded-md bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <Check className="size-3.5 text-green-500" />
              </div>
            ) : (
              <div className="w-7 h-7 flex-shrink-0" />
            )}

            {/* Progress ring for parent nodes */}
            {hasChildren && (
              <ProgressRing
                percent={rollUpProgress}
                size={style.ring}
                strokeWidth={level <= 1 ? 3.5 : 3}
                color={area.hex}
              />
            )}

            {/* Goal info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${style.title} truncate`}>{node.title}</span>
                <LevelBadge level={level} />
              </div>

              {/* Progress info */}
              <div className="flex items-center gap-2 mt-1">
                {hasChildren ? (
                  <>
                    <span className="text-xs font-medium tabular-nums" style={{ color: area.hex }}>
                      {completedActions}/{actionCount} actions done
                    </span>
                    <span className="text-[10px] text-muted-foreground">|</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {rollUpProgress}% overall
                    </span>
                    {node.target_value > 0 && !node.is_complete && level === 3 && (
                      <span className="text-[10px] text-muted-foreground/60 italic">
                        (own: {node.current_value}/{node.target_value})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${node.progress_percentage}%`,
                          backgroundColor: area.hex,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                      {node.tracking_type === "boolean"
                        ? node.is_complete
                          ? "Done"
                          : "Not done"
                        : `${node.current_value}/${node.target_value}`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Meta indicators */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              {node.current_streak > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-orange-400">
                  <Flame className="size-3" />
                  {node.current_streak}
                </span>
              )}
              {milestoneInfo && (
                <span className="flex items-center gap-0.5 text-[11px] text-emerald-400">
                  <TrendingUp className="size-3" />
                  {milestoneInfo.remaining} to next
                </span>
              )}
            </div>

            {/* Add child goal — subtle on hover */}
            <button
              onClick={() => setShowAddChild(!showAddChild)}
              className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0 opacity-0 group-hover/node:opacity-100 focus:opacity-100"
              title="Add child goal"
            >
              <Plus className="size-3.5 text-muted-foreground" />
            </button>

            {/* Actions toggle */}
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Expanded actions panel */}
          {showActions && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
              {/* Meta tags */}
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border">
                  {area.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border">
                  {PERIOD_LABELS[node.period] ?? node.period}
                </span>
                {node.current_streak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-orange-500/30 text-orange-400">
                    <Flame className="size-3" />
                    {node.current_streak} streak (best {node.best_streak})
                  </span>
                )}
                {node.days_remaining !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-400">
                    <Clock className="size-3" />
                    {node.days_remaining <= 0
                      ? "Overdue"
                      : `${node.days_remaining}d left`}
                  </span>
                )}
                {node.linked_metric && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400">
                    Auto-synced
                  </span>
                )}
              </div>

              {node.motivation_note && (
                <p className="text-xs text-muted-foreground italic">
                  &ldquo;{node.motivation_note}&rdquo;
                </p>
              )}

              {/* Progress controls for L3 leaf goals */}
              {!node.is_complete && !node.linked_metric && level === 3 && (
                <div className="flex flex-wrap items-center gap-2">
                  {inputMode === "boolean" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIncrement(1)}
                      disabled={isActing}
                    >
                      {isActing ? (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      ) : (
                        <Check className="size-3 mr-1" />
                      )}
                      Mark Done
                    </Button>
                  )}
                  {inputMode === "buttons" && (
                    <>
                      {props.getButtonIncrements(node.target_value).map((amt) => (
                        <Button
                          key={amt}
                          variant="outline"
                          size="sm"
                          onClick={() => handleIncrement(amt)}
                          disabled={isActing}
                        >
                          {isActing ? (
                            <Loader2 className="size-3 animate-spin mr-1" />
                          ) : (
                            <Plus className="size-3 mr-1" />
                          )}
                          +{amt}
                        </Button>
                      ))}
                    </>
                  )}
                  {inputMode === "direct-entry" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={directValue}
                        onChange={(e) => setDirectValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = Number(directValue)
                            if (!isNaN(v) && v >= 0) handleSetValue(v)
                          }
                        }}
                        className="w-20 h-8 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const v = Number(directValue)
                          if (!isNaN(v) && v >= 0) handleSetValue(v)
                        }}
                        disabled={isActing}
                      >
                        Set
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {Math.max(0, node.target_value - node.current_value)} remaining
                      </span>
                    </div>
                  )}
                </div>
              )}

              {milestoneInfo && (
                <div className="text-xs text-muted-foreground">
                  <span className="text-emerald-400">
                    Next milestone: {milestoneInfo.nextValue}
                  </span>{" "}
                  ({milestoneInfo.remaining} more needed)
                </div>
              )}

              {/* Management row */}
              <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                {node.goal_type === "recurring" && (
                  <>
                    {showResetConfirm ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-destructive">Reset?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleReset}
                          disabled={isActing}
                          className="h-7 text-xs"
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowResetConfirm(false)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResetConfirm(true)}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        <RotateCcw className="size-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartEdit(node)}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <Pencil className="size-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isActing}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <Archive className="size-3 mr-1" />
                  Archive
                </Button>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-destructive">Delete forever?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isActing}
                      className="h-7 text-xs"
                    >
                      Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-7 text-xs text-muted-foreground ml-auto"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Inline add-child form */}
          {showAddChild && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Input
                  value={childTitle}
                  onChange={(e) => setChildTitle(e.target.value)}
                  placeholder={`New child goal under "${node.title}"...`}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
                />
                <Input
                  type="number"
                  min={1}
                  value={childTarget}
                  onChange={(e) => setChildTarget(Number(e.target.value) || 1)}
                  className="w-16 h-8 text-xs"
                  placeholder="Target"
                />
                <Button
                  size="sm"
                  onClick={handleAddChild}
                  disabled={!childTitle.trim() || isCreatingChild}
                  className="h-8 gap-1 text-xs"
                >
                  {isCreatingChild ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowAddChild(false); setChildTitle("") }}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Children (recursive) */}
        {isExpanded && hasChildren && (
          <div className="mt-1.5 space-y-1.5 relative">
            {node.children.map((child, idx) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                props={props}
                expandedNodes={expandedNodes}
                toggleExpanded={toggleExpanded}
                onStartEdit={onStartEdit}
                isLast={idx === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// L3 ACTION CARD — compact card for "Today" mode
// ============================================================================

function ActionCard({
  goal,
  props,
  onStartEdit,
}: {
  goal: GoalWithProgress
  props: V11ViewProps
  onStartEdit: (g: GoalWithProgress) => void
}) {
  const [isActing, setIsActing] = useState(false)
  const [directValue, setDirectValue] = useState(String(goal.current_value))
  const area = getLifeAreaConfig(goal.life_area)
  const inputMode = props.getInputMode(goal)

  const handleIncrement = async (amount: number) => {
    if (isActing) return
    setIsActing(true)
    try {
      await props.onIncrement(goal.id, amount)
      if (!goal.is_complete && goal.current_value + amount >= goal.target_value) {
        const tier = props.getCelebrationTier(goal)
        props.onCelebrate(tier, goal.title)
      }
    } finally {
      setIsActing(false)
    }
  }

  const handleSetValue = async (value: number) => {
    if (isActing) return
    setIsActing(true)
    try {
      await props.onSetValue(goal.id, value)
      if (!goal.is_complete && value >= goal.target_value) {
        const tier = props.getCelebrationTier(goal)
        props.onCelebrate(tier, goal.title)
      }
    } finally {
      setIsActing(false)
    }
  }

  return (
    <div
      className={`rounded-xl border border-border bg-card transition-colors hover:border-border/80 ${
        goal.is_complete ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Left: status indicator */}
        {goal.is_complete ? (
          <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <Check className="size-4 text-green-500" />
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${area.hex}15` }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: area.hex }} />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{goal.title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${goal.progress_percentage}%`,
                  backgroundColor: area.hex,
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {goal.tracking_type === "boolean"
                ? goal.is_complete
                  ? "Done"
                  : "Pending"
                : `${goal.current_value}/${goal.target_value}`}
            </span>
            {goal.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                <Flame className="size-2.5" />
                {goal.current_streak}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {PERIOD_LABELS[goal.period] ?? goal.period}
            </span>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={() => onStartEdit(goal)}
          className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center flex-shrink-0"
        >
          <Pencil className="size-3 text-muted-foreground" />
        </button>
      </div>

      {/* Prominent progress controls — right-aligned for thumb access */}
      {!goal.is_complete && !goal.linked_metric && (
        <div className="flex items-center justify-end gap-2 px-3 pb-3 pt-0">
          {inputMode === "boolean" && (
            <button
              onClick={() => handleIncrement(1)}
              disabled={isActing}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 font-medium text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              {isActing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Mark Done
            </button>
          )}
          {inputMode === "buttons" && (
            <>
              {props.getButtonIncrements(goal.target_value).map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleIncrement(amt)}
                  disabled={isActing}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary font-medium text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {isActing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  +{amt}
                </button>
              ))}
            </>
          )}
          {inputMode === "direct-entry" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {Math.max(0, goal.target_value - goal.current_value)} left
              </span>
              <Input
                type="number"
                min={0}
                value={directValue}
                onChange={(e) => setDirectValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = Number(directValue)
                    if (!isNaN(v) && v >= 0) handleSetValue(v)
                  }
                }}
                className="w-20 h-10 text-sm text-center"
              />
              <button
                onClick={() => {
                  const v = Number(directValue)
                  if (!isNaN(v) && v >= 0) handleSetValue(v)
                }}
                disabled={isActing}
                className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary font-medium text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {isActing ? <Loader2 className="size-4 animate-spin" /> : "Set"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reset button for completed recurring goals */}
      {goal.is_complete && goal.period !== "custom" && goal.goal_type === "recurring" && (
        <div className="flex items-center justify-end px-3 pb-3 pt-0">
          <button
            onClick={() => {
              setIsActing(true)
              props.onReset(goal.id).finally(() => setIsActing(false))
            }}
            disabled={isActing}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {isActing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RotateCcw className="size-3" />
            )}
            Reset for next period
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// INLINE EDIT MODAL
// ============================================================================

function InlineEditForm({
  goal,
  lifeAreas,
  onSave,
  onCancel,
}: {
  goal: GoalWithProgress
  lifeAreas: LifeAreaConfig[]
  onSave: (id: string, updates: Partial<UserGoalInsert>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(goal.title)
  const [targetValue, setTargetValue] = useState(goal.target_value)
  const [period, setPeriod] = useState(goal.period)
  const [lifeArea, setLifeArea] = useState(goal.life_area)
  const [motivation, setMotivation] = useState(goal.motivation_note ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const realAreas = lifeAreas.filter((a) => a.id !== "custom")

  const handleSave = async () => {
    if (!title.trim()) return
    setIsSaving(true)
    try {
      await onSave(goal.id, {
        title: title.trim(),
        target_value: targetValue,
        period: period as UserGoalInsert["period"],
        life_area: lifeArea,
        category: lifeArea,
        motivation_note: motivation.trim() || null,
      })
      onCancel()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-safe pb-safe">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Goal</h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Life Area
              </label>
              <select
                value={lifeArea}
                onChange={(e) => setLifeArea(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {realAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Target
              </label>
              <Input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Motivation Note (optional)
            </label>
            <Input
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Why does this goal matter to you?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TEMPLATE DISCOVERY DRAWER
// ============================================================================

function TemplateDrawer({
  templates,
  lifeAreas,
  existingGoals,
  onBatchCreate,
  onCreate,
  onClose,
}: {
  templates: GoalTemplate[]
  lifeAreas: LifeAreaConfig[]
  existingGoals: GoalWithProgress[]
  onBatchCreate: V11ViewProps["onBatchCreate"]
  onCreate: V11ViewProps["onCreate"]
  onClose: () => void
}) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [customArea, setCustomArea] = useState("daygame")
  const [customTarget, setCustomTarget] = useState(1)
  const [customPeriod, setCustomPeriod] = useState("weekly")

  const existingTemplateIds = new Set(
    existingGoals.map((g) => g.template_id).filter(Boolean)
  )

  const realAreas = lifeAreas.filter((a) => a.id !== "custom")

  const filtered = useMemo(() => {
    let list = templates.filter((t) => t.level === 3)
    if (selectedArea) list = list.filter((t) => t.lifeArea === selectedArea)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((t) => t.title.toLowerCase().includes(q))
    }
    return list
  }, [templates, selectedArea, searchQuery])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (selectedIds.size === 0) return
    setIsCreating(true)
    try {
      const inserts = Array.from(selectedIds)
        .map((id) => {
          const t = templates.find((tpl) => tpl.id === id)
          if (!t) return null
          return {
            _tempId: `temp_${t.id}`,
            _tempParentId: null,
            title: t.title,
            life_area: t.lifeArea,
            category: t.lifeArea,
            goal_type:
              t.templateType === "milestone_ladder"
                ? "milestone"
                : t.templateType === "habit_ramp"
                  ? "habit_ramp"
                  : "recurring",
            goal_nature: t.nature,
            goal_level: t.level,
            display_category: t.displayCategory,
            tracking_type: "counter" as const,
            period: "weekly" as const,
            target_value:
              t.defaultMilestoneConfig?.target ??
              t.defaultRampSteps?.[0]?.frequencyPerWeek ??
              1,
            template_id: t.id,
            linked_metric: t.linkedMetric,
            milestone_config: t.defaultMilestoneConfig,
            ramp_steps: t.defaultRampSteps,
          }
        })
        .filter(Boolean) as Parameters<typeof onBatchCreate>[0]
      await onBatchCreate(inserts)
      onClose()
    } finally {
      setIsCreating(false)
    }
  }

  const handleCustomCreate = async () => {
    if (!customTitle.trim()) return
    setIsCreating(true)
    try {
      await onCreate({
        title: customTitle.trim(),
        life_area: customArea,
        category: customArea,
        goal_type: "recurring",
        tracking_type: "counter",
        period: customPeriod as UserGoalInsert["period"],
        target_value: customTarget,
      })
      setCustomTitle("")
      setShowCustomForm(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm pt-safe pb-safe">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-t-xl sm:rounded-xl border border-border bg-card shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold">Add Goals</h3>
            <p className="text-xs text-muted-foreground">
              Browse templates or create custom
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isCreating}
                className="gap-1"
              >
                {isCreating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Plus className="size-3" />
                )}
                Add {selectedIds.size}
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="p-4 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedArea(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                !selectedArea
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              All
            </button>
            {realAreas.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedArea(a.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  selectedArea === a.id
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
                style={
                  selectedArea === a.id
                    ? { backgroundColor: a.hex }
                    : undefined
                }
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {filtered.map((tpl) => {
            const area = getLifeAreaConfig(tpl.lifeArea)
            const alreadyAdded = existingTemplateIds.has(tpl.id)
            const selected = selectedIds.has(tpl.id)
            return (
              <button
                key={tpl.id}
                onClick={() => !alreadyAdded && toggle(tpl.id)}
                disabled={alreadyAdded}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  alreadyAdded
                    ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                    : selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: area.hex }}
                  />
                  <span className="text-sm font-medium truncate flex-1">
                    {tpl.title}
                  </span>
                  {alreadyAdded && (
                    <span className="text-[10px] text-muted-foreground">
                      Already added
                    </span>
                  )}
                  {selected && (
                    <Check className="size-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No templates match your search.
            </p>
          )}
        </div>

        {/* Custom goal */}
        <div className="border-t border-border p-4">
          {!showCustomForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomForm(true)}
              className="gap-1 w-full"
            >
              <Plus className="size-3" />
              Create Custom Goal
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Goal title..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleCustomCreate()}
                />
                <select
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                >
                  {realAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">
                    Target:
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={customTarget}
                    onChange={(e) =>
                      setCustomTarget(Number(e.target.value) || 1)
                    }
                    className="w-16 h-8 text-sm"
                  />
                </div>
                <select
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleCustomCreate}
                  disabled={!customTitle.trim() || isCreating}
                  className="h-8"
                >
                  {isCreating ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomForm(false)}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN VIEW — "Polished Hub with Hierarchy"
// ============================================================================

type ViewMode = "today" | "tree"
type ActiveFilter = "all" | string

export function V11ViewC(props: V11ViewProps) {
  const {
    goals,
    tree,
    lifeAreas,
    templates,
    isLoading,
    onCreate,
    onBatchCreate,
    onUpdate,
  } = props

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("today")
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null)
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Fade transition between view modes
  const [contentOpacity, setContentOpacity] = useState(1)
  const prevViewMode = useRef(viewMode)
  useEffect(() => {
    if (prevViewMode.current !== viewMode) {
      prevViewMode.current = viewMode
      setContentOpacity(0)
      const timer = setTimeout(() => setContentOpacity(1), 30)
      return () => clearTimeout(timer)
    }
  }, [viewMode])

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Default: expand all L0 and L1 nodes
    const expanded = new Set<string>()
    function walk(nodes: GoalTreeNode[]) {
      for (const n of nodes) {
        if ((n.goal_level ?? 99) <= 1 && n.children.length > 0) {
          expanded.add(n.id)
        }
        walk(n.children)
      }
    }
    walk(tree)
    return expanded
  })

  const toggleExpanded = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Derived data
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.is_archived),
    [goals]
  )

  const realAreas = useMemo(
    () => lifeAreas.filter((a) => a.id !== "custom"),
    [lifeAreas]
  )

  // Filter tree by life area and search query
  const filteredTree = useMemo(() => {
    let result = tree

    // Filter by life area
    if (activeFilter !== "all") {
      function filterByArea(node: GoalTreeNode): GoalTreeNode | null {
        if (node.life_area === activeFilter) return node
        const filteredChildren = node.children
          .map(filterByArea)
          .filter(Boolean) as GoalTreeNode[]
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren }
        }
        if (node.life_area === activeFilter) return { ...node, children: [] }
        return null
      }
      result = result.map(filterByArea).filter(Boolean) as GoalTreeNode[]
    }

    // Filter by search query (show matching nodes + ancestors)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      function filterBySearch(node: GoalTreeNode): GoalTreeNode | null {
        const titleMatches = node.title.toLowerCase().includes(q)
        const filteredChildren = node.children
          .map(filterBySearch)
          .filter(Boolean) as GoalTreeNode[]
        // Show node if it matches or if any descendant matches
        if (titleMatches || filteredChildren.length > 0) {
          return { ...node, children: titleMatches ? node.children : filteredChildren }
        }
        return null
      }
      result = result.map(filterBySearch).filter(Boolean) as GoalTreeNode[]
    }

    return result
  }, [tree, activeFilter, searchQuery])

  // Get L3 action goals for "Today" mode
  const todayGoals = useMemo(() => {
    const filtered = activeFilter === "all"
      ? tree
      : filteredTree
    let l3s = collectL3Goals(filtered)

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      l3s = l3s.filter((g) => g.title.toLowerCase().includes(q))
    }

    // Sort: incomplete first, then by position
    return [...l3s].sort((a, b) => {
      if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1
      return a.position - b.position
    })
  }, [filteredTree, tree, activeFilter, searchQuery])

  // Life area stats
  const areaStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; completed: number; avgProgress: number; sumProgress: number }
    >()
    for (const g of activeGoals) {
      const area = g.life_area || "custom"
      const stat = map.get(area) ?? {
        total: 0,
        completed: 0,
        avgProgress: 0,
        sumProgress: 0,
      }
      stat.total++
      if (g.is_complete) stat.completed++
      stat.sumProgress += g.progress_percentage
      map.set(area, stat)
    }
    for (const [, stat] of map) {
      stat.avgProgress = stat.total > 0 ? Math.round(stat.sumProgress / stat.total) : 0
    }
    return map
  }, [activeGoals])

  // Overall stats
  const overallStats = useMemo(() => {
    const total = activeGoals.length
    const completed = activeGoals.filter((g) => g.is_complete).length
    const avgProgress =
      total > 0
        ? Math.round(
            activeGoals.reduce((s, g) => s + g.progress_percentage, 0) / total
          )
        : 0
    const totalStreaks = activeGoals.reduce(
      (s, g) => s + (g.current_streak > 0 ? 1 : 0),
      0
    )
    const actionGoals = activeGoals.filter((g) => (g.goal_level ?? 99) === 3)
    const actionsCompleted = actionGoals.filter((g) => g.is_complete).length
    return { total, completed, avgProgress, totalStreaks, actionGoals: actionGoals.length, actionsCompleted }
  }, [activeGoals])

  const handleStartEdit = useCallback((g: GoalWithProgress) => {
    setEditingGoal(g)
  }, [])

  const handleSaveEdit = useCallback(
    async (goalId: string, updates: Partial<UserGoalInsert>) => {
      await onUpdate(goalId, updates)
    },
    [onUpdate]
  )

  const expandAll = useCallback(() => {
    const all = new Set<string>()
    function walk(nodes: GoalTreeNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) all.add(n.id)
        walk(n.children)
      }
    }
    walk(tree)
    setExpandedNodes(all)
  }, [tree])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  // ----- Loading -----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ----- Empty state: multi-step wizard -----
  if (activeGoals.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <SetupWizard
          templates={templates}
          lifeAreas={lifeAreas}
          onCreate={onCreate}
          onBatchCreate={onBatchCreate}
        />
      </div>
    )
  }

  // ----- Main Hub Layout -----
  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* ======== HEADER ======== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Goals Hub</h1>
          <p className="text-xs text-muted-foreground">
            {overallStats.actionsCompleted}/{overallStats.actionGoals} actions complete
            {overallStats.totalStreaks > 0 &&
              ` \u00B7 ${overallStats.totalStreaks} active streaks`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode("today")}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === "today"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="size-3.5" />
              <span className="hidden sm:inline">Today</span>
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === "tree"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TreePine className="size-3.5" />
              <span className="hidden sm:inline">Full Tree</span>
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDrawer(true)}
            className="gap-1 h-8"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add Goal</span>
          </Button>
        </div>
      </div>

      {/* ======== SEARCH BAR ======== */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === "today" ? "Search action items..." : "Search goals..."
            }
            className="pl-9 pr-8"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* ======== LIFE AREA TABS — PRIMARY NAVIGATION ======== */}
      <div className="rounded-xl border border-border bg-card/50 p-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeFilter === "all"
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <ProgressRing
              percent={overallStats.avgProgress}
              size={28}
              strokeWidth={3}
              color={activeFilter === "all" ? "hsl(var(--primary))" : "#666"}
            />
            <div className="text-left">
              <span className="block leading-tight">All Areas</span>
              <span className="text-[10px] opacity-70 block leading-tight">
                {overallStats.completed}/{overallStats.total}
              </span>
            </div>
          </button>
          {realAreas.map((area) => {
            const stat = areaStats.get(area.id)
            if (!stat) return null
            const active = activeFilter === area.id
            const Icon = area.icon
            return (
              <button
                key={area.id}
                onClick={() => setActiveFilter(active ? "all" : area.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  active
                    ? ""
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                style={
                  active
                    ? {
                        backgroundColor: `${area.hex}20`,
                        color: area.hex,
                        boxShadow: `inset 0 0 0 1px ${area.hex}40, 0 1px 3px 0 ${area.hex}15`,
                      }
                    : undefined
                }
              >
                <ProgressRing
                  percent={stat.avgProgress}
                  size={28}
                  strokeWidth={3}
                  color={area.hex}
                />
                <div className="text-left">
                  <span className="block leading-tight">
                    <span className="hidden sm:inline">{area.name}</span>
                    <Icon className="size-4 sm:hidden" />
                  </span>
                  <span className="text-[10px] opacity-70 block leading-tight">
                    {stat.completed}/{stat.total}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ======== VIEW CONTENT (fades on mode switch) ======== */}
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{ opacity: contentOpacity }}
      >

      {/* ======== TODAY MODE ======== */}
      {viewMode === "today" && (
        <>
          {/* Summary strip */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">
                  {todayGoals.filter((g) => g.is_complete).length}/{todayGoals.length}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Actions Done
                </p>
              </div>
            </div>
            {overallStats.totalStreaks > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flame className="size-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">
                    {overallStats.totalStreaks}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Active Streaks
                  </p>
                </div>
              </div>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {todayGoals.filter((g) => !g.is_complete).length} remaining
            </div>
          </div>

          {/* Action items list */}
          {todayGoals.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <Star className="size-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "No actions match your search."
                  : activeFilter !== "all"
                    ? "No action items in this area."
                    : "No action items yet — add goals to get started."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1"
                onClick={() => setShowTemplateDrawer(true)}
              >
                <Plus className="size-3" />
                Add Goals
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* All-complete congratulatory banner */}
              {todayGoals.every((g) => g.is_complete) && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Trophy className="size-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">
                      All actions done today!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You've completed all {todayGoals.length} action items. Great work.
                    </p>
                  </div>
                </div>
              )}
              {todayGoals.map((goal) => (
                <ActionCard
                  key={goal.id}
                  goal={goal}
                  props={props}
                  onStartEdit={handleStartEdit}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ======== TREE MODE ======== */}
      {viewMode === "tree" && (
        <>
          {/* Overall progress summary bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card/60 px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Check className="size-3.5 text-emerald-400" />
              <span className="tabular-nums">
                {overallStats.completed} of {overallStats.total}
              </span>{" "}
              <span className="text-muted-foreground font-normal">goals complete</span>
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              <span className="tabular-nums font-medium">{overallStats.avgProgress}%</span>{" "}
              <span className="text-muted-foreground">avg progress</span>
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5">
              <Star className="size-3.5 text-amber-400" />
              <span className="tabular-nums font-medium">
                {filteredTree.filter((n) => (n.goal_level ?? 99) === 0).length || filteredTree.length}
              </span>{" "}
              <span className="text-muted-foreground">
                active dream{(filteredTree.filter((n) => (n.goal_level ?? 99) === 0).length || filteredTree.length) !== 1 ? "s" : ""}
              </span>
            </span>
          </div>

          {/* Tree controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="h-7 text-xs text-muted-foreground gap-1"
            >
              <Eye className="size-3" />
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="h-7 text-xs text-muted-foreground gap-1"
            >
              <EyeOff className="size-3" />
              Collapse All
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredTree.length} root{filteredTree.length !== 1 ? "s" : ""}
              {" \u00B7 "}
              {collectAllGoals(filteredTree).length} total goals
            </span>
          </div>

          {/* Tree display */}
          {filteredTree.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <TreePine className="size-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {searchQuery.trim()
                  ? "No goals match your search."
                  : activeFilter !== "all"
                    ? "No goals in this area."
                    : "No goal hierarchy yet. Add some goals to build your tree."}
              </p>
              {searchQuery.trim() ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="size-3" />
                  Clear Search
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1"
                  onClick={() => setShowTemplateDrawer(true)}
                >
                  <Plus className="size-3" />
                  Add Goals
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 relative">
              {filteredTree.map((node, idx) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  props={props}
                  expandedNodes={expandedNodes}
                  toggleExpanded={toggleExpanded}
                  onStartEdit={handleStartEdit}
                  isLast={idx === filteredTree.length - 1}
                />
              ))}
            </div>
          )}
        </>
      )}

      </div>{/* end fade wrapper */}

      {/* ======== EDIT MODAL ======== */}
      {editingGoal && (
        <InlineEditForm
          goal={editingGoal}
          lifeAreas={lifeAreas}
          onSave={handleSaveEdit}
          onCancel={() => setEditingGoal(null)}
        />
      )}

      {/* ======== TEMPLATE DRAWER ======== */}
      {showTemplateDrawer && (
        <TemplateDrawer
          templates={templates}
          lifeAreas={lifeAreas}
          existingGoals={activeGoals}
          onBatchCreate={onBatchCreate}
          onCreate={onCreate}
          onClose={() => setShowTemplateDrawer(false)}
        />
      )}
    </div>
  )
}
