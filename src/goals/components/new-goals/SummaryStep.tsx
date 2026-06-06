"use client"

import { useMemo } from "react"
import {
  IDENTITY_ASPECTS,
  PILLARS,
  OBJECTIVES,
  TARGETS,
  PRIMITIVE_META,
  SHARED_DRIVERS,
  getObjectivesForPillar,
  getTargetsForObjective,
  getDriversForObjective,
  getMetricsForObjective,
  getSharedDriver,
  getObjectivesForSharedDriver,
} from "@/src/goals/data/newGoalFramework"
import type { FrameworkTarget, GoalPrimitive, TargetOverride } from "@/src/goals/data/newGoalFramework"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig, MilestonePin } from "@/src/goals/types"
import {
  Star,
  Dumbbell,
  Landmark,
  Heart,
  Compass,
  ChevronRight,
  Lock,
  Link2,
  type LucideIcon,
} from "lucide-react"

function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-")
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  if (!m || !d) return iso
  return `${parseInt(d, 10)} ${months[parseInt(m, 10)] ?? ""}`.trim()
}

const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Landmark,
  Heart,
  Compass,
}

interface SummaryStepProps {
  selectedPillars: Set<string>
  selectedObjectives: Set<string>
  targetOverrides: Record<string, TargetOverride>
}

export function SummaryStep({
  selectedPillars,
  selectedObjectives,
  targetOverrides,
}: SummaryStepProps) {
  const enabledTargetCount = useMemo(() => {
    let count = 0
    for (const objId of selectedObjectives) {
      const targets = getTargetsForObjective(objId)
      for (const t of targets) {
        const override = targetOverrides[t.id]
        if (override ? override.enabled : t.defaultEnabled) count++
      }
    }
    return count
  }, [selectedObjectives, targetOverrides])

  const selectedAspects = IDENTITY_ASPECTS.filter((a) =>
    a.pillarIds.some(pid => selectedPillars.has(pid))
  )

  const valuesCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const objId of selectedObjectives) {
      const obj = OBJECTIVES.find(o => o.id === objId)
      if (obj) {
        for (const v of obj.values) {
          counts.set(v, (counts.get(v) ?? 0) + 1)
        }
      }
    }
    // Also add pillar-level values
    for (const p of PILLARS) {
      if (selectedPillars.has(p.id)) {
        for (const v of p.values) {
          counts.set(v, (counts.get(v) ?? 0) + 1)
        }
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [selectedObjectives, selectedPillars])

  /** Collect unique shared drivers referenced by selected objectives */
  const activeSharedDrivers = useMemo(() => {
    const seenIds = new Set<string>()
    const result: { id: string; label: string; primitive: GoalPrimitive; unit: string; objectiveLabels: string[] }[] = []

    for (const objId of selectedObjectives) {
      const targets = getTargetsForObjective(objId)
      for (const t of targets) {
        if (t.sharedDriverId && !seenIds.has(t.sharedDriverId)) {
          seenIds.add(t.sharedDriverId)
          const shared = getSharedDriver(t.sharedDriverId)
          if (shared) {
            const poweredObjectives = getObjectivesForSharedDriver(t.sharedDriverId)
              .filter(o => selectedObjectives.has(o.id))
              .map(o => o.label)
            result.push({
              id: shared.id,
              label: shared.label,
              primitive: shared.primitive,
              unit: shared.unit,
              objectiveLabels: poweredObjectives,
            })
          }
        }
      }
    }
    return result
  }, [selectedObjectives])

  const activePillars = PILLARS.filter((p) => selectedPillars.has(p.id))

  function isTargetEnabled(target: FrameworkTarget): boolean {
    const override = targetOverrides[target.id]
    return override ? override.enabled : target.defaultEnabled
  }

  function getEffectiveTarget(target: FrameworkTarget): number {
    if (!target.milestoneConfig) return 0
    return targetOverrides[target.id]?.value ?? target.milestoneConfig.target
  }

  function getEffectiveStart(target: FrameworkTarget): number {
    if (!target.milestoneConfig) return 0
    return targetOverrides[target.id]?.startValue ?? target.milestoneConfig.start
  }

  function getEffectiveSteps(target: FrameworkTarget): number {
    if (!target.milestoneConfig) return 0
    // `|| default`: 0 means "unset" (see GoalsConfigStep.buildEffectiveConfig).
    return targetOverrides[target.id]?.steps || target.milestoneConfig.steps
  }

  /**
   * Build the milestone ladder for a value-based target, honouring the user's
   * pinned values. Returns null for non-milestone primitives (stage/skill/habit).
   */
  function buildMilestones(target: FrameworkTarget) {
    if (!target.milestoneConfig) return null
    if (target.primitive !== "volume" && target.primitive !== "target") return null
    const edits = targetOverrides[target.id]?.milestoneEdits
    const pins: MilestonePin[] = edits
      ? Object.entries(edits)
          .filter(([, e]) => e.value != null)
          .map(([s, e]) => ({ step: Number(s), value: e.value! }))
      : []
    const config: MilestoneLadderConfig = {
      start: getEffectiveStart(target),
      target: getEffectiveTarget(target),
      steps: getEffectiveSteps(target),
      curveTension: getEffectiveTension(target),
      pins,
    }
    return generateMilestoneLadder(config)
  }

  function getEffectiveTension(target: FrameworkTarget): number {
    if (!target.milestoneConfig) return 0
    return (
      targetOverrides[target.id]?.curveTension ??
      target.milestoneConfig.curveTension
    )
  }

  function renderTargetDetail(target: FrameworkTarget): string {
    const isStageOrSkill = target.primitive === "stage" || target.primitive === "skill"

    // Stage/skill: show steps chain
    if (isStageOrSkill && target.stageSteps && target.stageSteps.length > 0) {
      return target.stageSteps.join(" → ")
    }

    // Shared driver targets: use shared driver config for display
    if (target.sharedDriverId) {
      const shared = getSharedDriver(target.sharedDriverId)
      if (shared) {
        if (shared.rampSteps && shared.rampSteps.length > 0) {
          const first = shared.rampSteps[0]
          const last = shared.rampSteps[shared.rampSteps.length - 1]
          const totalWeeks = shared.rampSteps.reduce((sum, r) => sum + r.durationWeeks, 0)
          return `ramp: ${first.frequencyPerWeek}/wk → ${last.frequencyPerWeek}/wk over ${totalWeeks} weeks`
        }
        if (shared.milestoneConfig) {
          const effectiveSteps = target.milestoneConfig
            ? getEffectiveSteps(target)
            : shared.milestoneConfig.steps
          return `${effectiveSteps} milestones, ${shared.milestoneConfig.start} to ${shared.milestoneConfig.target} ${target.unit}`
        }
      }
    }

    // Habit with rampSteps
    if (target.rampSteps && target.rampSteps.length > 0) {
      const first = target.rampSteps[0]
      const last = target.rampSteps[target.rampSteps.length - 1]
      const totalWeeks = target.rampSteps.reduce((sum, r) => sum + r.durationWeeks, 0)
      return `ramp: ${first.frequencyPerWeek}/wk → ${last.frequencyPerWeek}/wk over ${totalWeeks} weeks`
    }

    // Volume/target with milestoneConfig
    if (target.milestoneConfig) {
      const effectiveTarget = getEffectiveTarget(target)
      const effectiveSteps = getEffectiveSteps(target)
      return `${effectiveSteps} milestones, ${target.milestoneConfig.start} to ${effectiveTarget} ${target.unit}`
    }

    return ""
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Your Goal Map</h2>
      <p className="text-zinc-400 text-center mb-8">
        Here&apos;s what you&apos;re building toward
      </p>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Pillars", value: selectedPillars.size },
          { label: "Objectives", value: selectedObjectives.size },
          { label: "Targets", value: enabledTargetCount },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Identity section */}
      {selectedAspects.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="size-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Identity</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAspects.map((aspect) => {
              const firstPillar = PILLARS.find((p) =>
                aspect.pillarIds.includes(p.id)
              )
              return (
                <span
                  key={aspect.id}
                  className="text-xs px-3 py-1.5 rounded-full border"
                  style={{
                    borderColor: firstPillar
                      ? firstPillar.color + "40"
                      : "rgba(255,255,255,0.1)",
                    color: firstPillar?.color ?? "#a1a1aa",
                    backgroundColor: firstPillar
                      ? firstPillar.color + "15"
                      : "rgba(255,255,255,0.05)",
                  }}
                >
                  {aspect.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Values section */}
      {valuesCounts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="size-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Values You&apos;re Building</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {valuesCounts.map(([value, count]) => (
              <span
                key={value}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-zinc-300"
              >
                {value} <span className="text-zinc-500 ml-1">&times;{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Shared Foundations section */}
      {activeSharedDrivers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="size-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Shared Foundations</span>
          </div>
          <div className="space-y-2">
            {activeSharedDrivers.map((sd) => {
              const primMeta = PRIMITIVE_META[sd.primitive]
              return (
                <div key={sd.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-zinc-200">{sd.label}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${primMeta.color}20`,
                      color: primMeta.color,
                    }}
                  >
                    {primMeta.label}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Powers: {sd.objectiveLabels.join(", ")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tree view */}
      <div className="space-y-4">
        {activePillars.map((pillar) => {
          const PillarIcon = ICON_MAP[pillar.icon]
          const pillarObjectives = getObjectivesForPillar(pillar.id).filter(
            (o) => selectedObjectives.has(o.id)
          )

          if (pillarObjectives.length === 0) return null

          return (
            <div
              key={pillar.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Pillar header */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: `linear-gradient(90deg, ${pillar.color}15, transparent)`,
                }}
              >
                {PillarIcon && (
                  <PillarIcon
                    className="size-5"
                    style={{ color: pillar.color }}
                  />
                )}
                <span
                  className="text-sm font-bold"
                  style={{ color: pillar.color }}
                >
                  {pillar.label}
                </span>
              </div>

              <div className="px-4 py-2">
                {pillarObjectives.map((obj, objIdx) => {
                  const targets = getTargetsForObjective(obj.id).filter(
                    isTargetEnabled
                  )

                  return (
                    <div
                      key={obj.id}
                      className={
                        objIdx < pillarObjectives.length - 1
                          ? "mb-3"
                          : ""
                      }
                    >
                      {/* Objective row */}
                      <div className="flex items-center gap-2 pl-4 py-1.5 border-l-2 border-white/10">
                        <ChevronRight className="size-3 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-200">
                          {obj.label}
                        </span>
                      </div>

                      {/* Target rows */}
                      {targets.map((target) => {
                        const primMeta = PRIMITIVE_META[target.primitive]
                        const detail = renderTargetDetail(target)
                        const isShared = !!target.sharedDriverId
                        const roleLabel = target.role === "driver" ? "driver" : "metric"
                        const roleColor = target.role === "driver" ? "#22c55e" : "#3b82f6"
                        const milestones = buildMilestones(target)
                        const edits = targetOverrides[target.id]?.milestoneEdits
                        const targetDate = targetOverrides[target.id]?.targetDate
                        const lastStep = milestones ? milestones[milestones.length - 1].step : -1

                        return (
                          <div key={target.id}>
                            <div className="flex items-center gap-2 pl-8 py-1 border-l-2 border-white/5 ml-4 flex-wrap">
                              <div
                                className="size-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: primMeta.color }}
                              />
                              <span className="text-xs text-zinc-300">
                                {target.label}
                              </span>
                              {/* Role label */}
                              <span
                                className="text-[10px] px-1 py-0.5 rounded shrink-0"
                                style={{
                                  backgroundColor: `${roleColor}20`,
                                  color: roleColor,
                                }}
                              >
                                {roleLabel}
                              </span>
                              {/* Primitive badge */}
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: primMeta.color + "33",
                                  color: primMeta.color,
                                }}
                              >
                                {primMeta.label}
                              </span>
                              {/* Shared indicator */}
                              {isShared && (
                                <span className="text-[10px] text-zinc-500 italic shrink-0">
                                  (shared)
                                </span>
                              )}
                              {detail && !milestones && (
                                <span className="text-[10px] text-zinc-500">
                                  &rarr; {detail}
                                </span>
                              )}
                              {targetDate && (
                                <span className="text-[10px] text-zinc-500">
                                  &rarr; by {fmtDate(targetDate)}
                                </span>
                              )}
                            </div>

                            {/* Milestone ladder with pinned values + checkpoint dates */}
                            {milestones && milestones.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pl-12 ml-4 mt-0.5 mb-1">
                                {milestones.map((m, i) => {
                                  const pinned = edits?.[m.step]?.value != null
                                  // Interior checkpoint dates live in milestoneEdits;
                                  // the final milestone's date is the target's targetDate.
                                  const date = m.step === lastStep ? targetDate : edits?.[m.step]?.date
                                  return (
                                    <div key={m.step} className="flex items-center gap-1">
                                      <span
                                        className={`text-[10px] ${pinned ? "text-zinc-200 font-medium" : "text-zinc-500"}`}
                                        style={pinned ? { color: primMeta.color } : undefined}
                                      >
                                        {m.value}
                                      </span>
                                      {pinned && <Lock className="size-2.5" style={{ color: primMeta.color }} />}
                                      {date && <span className="text-[9px] text-zinc-600">({fmtDate(date)})</span>}
                                      {i < milestones.length - 1 && <span className="text-[10px] text-zinc-700">{"→"}</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
