"use client"

import { useMemo, useState } from "react"
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
  getAchievementTiers,
} from "@/src/goals/data/newGoalFramework"
import { makeCustomFrameworkTarget } from "@/src/goals/data/newGoalFramework"
import type { FrameworkTarget, GoalPrimitive, TargetOverride } from "@/src/goals/data/newGoalFramework"
import { classifyHorizon, HORIZON_META, HORIZONS_ORDERED } from "@/src/goals/horizonService"
import type { Horizon } from "@/src/goals/horizonService"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig, MilestonePin, CustomTarget } from "@/src/goals/types"
import { EditableTitle } from "./EditableTitle"
import {
  Star,
  Dumbbell,
  Landmark,
  Heart,
  Compass,
  Ban,
  Award,
  ChevronRight,
  Lock,
  Link2,
  type LucideIcon,
} from "lucide-react"

/** Bronze / Silver / Gold display colors for the achievement ladder. */
const TIER_COLORS: Record<string, string> = { Bronze: "#cd7f32", Silver: "#c0c0c0", Gold: "#fcd34d" }

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
  Ban,
}

interface SummaryStepProps {
  selectedPillars: Set<string>
  selectedObjectives: Set<string>
  targetOverrides: Record<string, TargetOverride>
  labels?: Record<string, string>
  customTargets?: CustomTarget[]
  onRename?: (id: string, label: string) => void
  onSave?: () => void
  saveStatus?: "idle" | "saving" | "saved" | "error"
}

export function SummaryStep({
  selectedPillars,
  selectedObjectives,
  targetOverrides,
  labels = {},
  customTargets = [],
  onRename,
  onSave,
  saveStatus = "idle",
}: SummaryStepProps) {
  const [view, setView] = useState<"area" | "time">("area")
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

  /** Enabled metrics that unlock a Bronze/Silver/Gold ladder from template levels. */
  const achievements = useMemo(() => {
    const out: { id: string; label: string; unit: string; color: string; tiers: NonNullable<ReturnType<typeof getAchievementTiers>> }[] = []
    const seen = new Set<string>()
    for (const objId of selectedObjectives) {
      const obj = OBJECTIVES.find((o) => o.id === objId)
      const pillar = obj ? PILLARS.find((p) => p.id === obj.pillarId) : undefined
      for (const t of getTargetsForObjective(objId)) {
        if (seen.has(t.id)) continue
        const enabled = targetOverrides[t.id] ? targetOverrides[t.id].enabled : t.defaultEnabled
        if (!enabled) continue
        const tiers = getAchievementTiers(t.id)
        if (!tiers) continue
        seen.add(t.id)
        out.push({ id: t.id, label: labels[t.id] ?? t.label, unit: t.unit, color: pillar?.color ?? "#a1a1aa", tiers })
      }
    }
    return out
  }, [selectedObjectives, targetOverrides, labels])

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

  /** Render one target row (framework or custom) with editable title + milestone chain. */
  function renderTargetRow(target: FrameworkTarget) {
    const primMeta = PRIMITIVE_META[target.primitive]
    const detail = renderTargetDetail(target)
    const isShared = !!target.sharedDriverId
    const roleLabel = target.role === "driver" ? "driver" : "metric"
    const roleColor = target.role === "driver" ? "#22c55e" : "#3b82f6"
    const milestones = buildMilestones(target)
    const edits = targetOverrides[target.id]?.milestoneEdits
    const targetDate = targetOverrides[target.id]?.targetDate
    const lastStep = milestones ? milestones[milestones.length - 1].step : -1
    const label = labels[target.id] ?? target.label

    return (
      <div key={target.id}>
        <div className="flex items-center gap-2 pl-8 py-1 border-l-2 border-white/5 ml-4 flex-wrap">
          <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: primMeta.color }} />
          {onRename ? (
            <EditableTitle
              value={label}
              onCommit={(v) => onRename(target.id, v)}
              className="text-xs text-zinc-300"
              inputClassName="text-xs w-40"
              ariaLabel={`Rename ${label}`}
            />
          ) : (
            <span className="text-xs text-zinc-300">{label}</span>
          )}
          <span className="text-[10px] px-1 py-0.5 rounded shrink-0" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
            {roleLabel}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: primMeta.color + "33", color: primMeta.color }}>
            {primMeta.label}
          </span>
          {isShared && <span className="text-[10px] text-zinc-500 italic shrink-0">(shared)</span>}
          {detail && !milestones && <span className="text-[10px] text-zinc-500">&rarr; {detail}</span>}
          {targetDate && <span className="text-[10px] text-zinc-500">&rarr; by {fmtDate(targetDate)}</span>}
        </div>

        {milestones && milestones.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pl-12 ml-4 mt-0.5 mb-1">
            {milestones.map((m, i) => {
              const pinned = edits?.[m.step]?.value != null
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
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">Your Goal Map</h2>
      <p className="text-zinc-400 text-center mb-6">
        Here&apos;s what you&apos;re building toward
      </p>

      {onSave && (
        <div className="flex flex-col items-center gap-2 mb-8">
          <button
            onClick={onSave}
            disabled={saveStatus === "saving" || saveStatus === "saved"}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-default ${
              saveStatus === "saved"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : saveStatus === "error"
                ? "bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25"
                : "bg-white text-zinc-950 hover:bg-zinc-200"
            }`}
          >
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
              ? "✓ Saved to your goals"
              : saveStatus === "error"
              ? "Save failed — retry"
              : "Save my plan"}
          </button>
          <span className="text-[11px] text-zinc-500">
            Saves these as real goals you can track. Re-saving replaces your previous plan.
          </span>
        </div>
      )}

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

      {/* Achievements section — Bronze/Silver/Gold ladders from template levels */}
      {achievements.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="size-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Achievements You&apos;ll Unlock</span>
          </div>
          <div className="space-y-2.5">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-300" style={{ minWidth: 120 }}>{a.label}</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {a.tiers.map((t, i) => (
                    <span key={t.tier} className="flex items-center gap-1">
                      {i > 0 && <span className="text-[10px] text-zinc-700">&rarr;</span>}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: TIER_COLORS[t.tier] + "22", color: TIER_COLORS[t.tier] }}
                        title={t.tier}
                      >
                        <Award className="size-2.5" />
                        {t.value}{a.unit ? ` ${a.unit}` : ""}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-3 italic">
            Reach these milestones to earn Bronze, Silver, and Gold.
          </p>
        </div>
      )}

      {/* View toggle — by area (the abstract→concrete hierarchy) or by time horizon */}
      <div className="flex items-center justify-center gap-1 mb-4">
        {(["area", "time"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${view === v ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300"}`}
          >
            {v === "area" ? "By area" : "By time"}
          </button>
        ))}
      </div>

      {/* By-time view — group every goal by its horizon so the cascade is visible */}
      {view === "time" && (
        <div className="space-y-4">
          {(() => {
            const now = new Date()
            const groups: Record<Horizon, FrameworkTarget[]> = { vision: [], year: [], quarter: [], now: [] }
            for (const objId of selectedObjectives) {
              for (const t of getTargetsForObjective(objId)) {
                if (!isTargetEnabled(t)) continue
                groups[classifyHorizon({ primitive: t.primitive, role: t.role, targetDate: targetOverrides[t.id]?.targetDate || undefined }, now)].push(t)
              }
            }
            for (const c of customTargets) {
              if (!(targetOverrides[c.id]?.enabled ?? true)) continue
              const ct = makeCustomFrameworkTarget(c.id, c.pillarId, c.unit, labels[c.id] ?? "New goal")
              groups[classifyHorizon({ primitive: ct.primitive, role: ct.role, targetDate: targetOverrides[c.id]?.targetDate || undefined }, now)].push(ct)
            }
            return HORIZONS_ORDERED.filter((h) => groups[h].length > 0).map((h) => {
              const meta = HORIZON_META[h]
              return (
                <div key={h} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: `linear-gradient(90deg, ${meta.color}15, transparent)` }}>
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-[10px] text-zinc-500">{meta.sublabel}</span>
                    <span className="text-[10px] text-zinc-600 ml-auto">{groups[h].length}</span>
                  </div>
                  <div className="px-4 py-2">
                    {groups[h].map((t) => renderTargetRow(t))}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* By-area view (default) */}
      {view === "area" && (
      <div className="space-y-4">
        {activePillars.map((pillar) => {
          const PillarIcon = ICON_MAP[pillar.icon]
          const pillarObjectives = getObjectivesForPillar(pillar.id).filter(
            (o) => selectedObjectives.has(o.id)
          )
          const pillarCustoms = customTargets
            .filter((c) => c.pillarId === pillar.id && (targetOverrides[c.id]?.enabled ?? true))
            .map((c) => makeCustomFrameworkTarget(c.id, c.pillarId, c.unit, labels[c.id] ?? "New goal"))

          if (pillarObjectives.length === 0 && pillarCustoms.length === 0) return null

          return (
            <div
              key={pillar.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Pillar header (editable) */}
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
                {onRename ? (
                  <EditableTitle
                    value={labels[pillar.id] ?? pillar.label}
                    onCommit={(v) => onRename(pillar.id, v)}
                    className="text-sm font-bold"
                    inputClassName="text-sm w-48"
                    style={{ color: pillar.color }}
                    ariaLabel={`Rename ${pillar.label}`}
                  />
                ) : (
                  <span className="text-sm font-bold" style={{ color: pillar.color }}>{pillar.label}</span>
                )}
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
                      {/* Objective row (editable) */}
                      <div className="flex items-center gap-2 pl-4 py-1.5 border-l-2 border-white/10">
                        <ChevronRight className="size-3 text-zinc-500" />
                        {onRename ? (
                          <EditableTitle
                            value={labels[obj.id] ?? obj.label}
                            onCommit={(v) => onRename(obj.id, v)}
                            className="text-sm font-medium text-zinc-200"
                            inputClassName="text-sm w-48"
                            ariaLabel={`Rename ${obj.label}`}
                          />
                        ) : (
                          <span className="text-sm font-medium text-zinc-200">{labels[obj.id] ?? obj.label}</span>
                        )}
                      </div>

                      {/* Target rows */}
                      {targets.map((target) => renderTargetRow(target))}
                    </div>
                  )
                })}

                {/* User-added custom goals */}
                {pillarCustoms.length > 0 && (
                  <div className={pillarObjectives.length > 0 ? "mt-3" : ""}>
                    <div className="flex items-center gap-2 pl-4 py-1.5 border-l-2 border-white/10">
                      <ChevronRight className="size-3 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-200">Your own goals</span>
                    </div>
                    {pillarCustoms.map((target) => renderTargetRow(target))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
