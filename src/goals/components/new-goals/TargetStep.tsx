"use client"

import { useState, useMemo, useCallback } from "react"
import {
  OBJECTIVES,
  TARGETS,
  PILLARS,
  SHARED_DRIVERS,
  PRIMITIVE_META,
  getTargetsForObjective,
  getDriversForObjective,
  getMetricsForObjective,
  getSharedDriver,
  getObjectivesForSharedDriver,
} from "@/src/goals/data/newGoalFramework"
import type {
  FrameworkTarget,
  GoalPrimitive,
  SharedDriver,
} from "@/src/goals/data/newGoalFramework"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { MilestoneLadderConfig } from "@/src/goals/types"
import {
  ChevronDown,
  ChevronRight,
  Check,
  TrendingUp,
  Target as TargetIcon,
  Zap,
  Repeat,
  Milestone,
  Flag,
  SlidersHorizontal,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Icon map — keyed by PRIMITIVE_META.iconName
// ---------------------------------------------------------------------------

const PRIMITIVE_ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Zap,
  Target: TargetIcon,
  Repeat,
  Milestone,
  Flag,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TargetStepProps {
  selectedObjectives: Set<string>
  targetOverrides: Record<
    string,
    { enabled: boolean; value: number; steps: number; curveTension: number }
  >
  onUpdate: (
    targetId: string,
    updates: Partial<{
      enabled: boolean
      value: number
      steps: number
      curveTension: number
    }>
  ) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIncrement(value: number): number {
  if (value < 10) return 1
  if (value < 50) return 5
  if (value < 200) return 10
  if (value < 1000) return 50
  return 100
}

/** Build effective milestone config overlaying targetOverrides on top of the
 *  raw milestoneConfig (which may come from the target or a shared driver). */
function buildEffectiveConfig(
  milestoneConfig: NonNullable<FrameworkTarget["milestoneConfig"]>,
  override?: { value?: number; steps?: number; curveTension?: number }
) {
  return {
    start: milestoneConfig.start,
    target: override?.value ?? milestoneConfig.target,
    steps: override?.steps ?? milestoneConfig.steps,
    curveTension: override?.curveTension ?? milestoneConfig.curveTension,
  }
}

// ---------------------------------------------------------------------------
// Primitive badge — color dot + label + tiny role text
// ---------------------------------------------------------------------------

function PrimitiveBadge({
  primitive,
  role,
}: {
  primitive: GoalPrimitive
  role: "driver" | "metric"
}) {
  const meta = PRIMITIVE_META[primitive]
  const Icon = PRIMITIVE_ICON_MAP[meta.iconName]
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span
        className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
        style={{
          backgroundColor: meta.color + "33",
          color: meta.color,
        }}
      >
        {Icon && <Icon className="size-3" />}
        {meta.label}
      </span>
      <span className="text-[10px] text-zinc-500">{role}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Ramp display for habit primitives
// ---------------------------------------------------------------------------

function RampDisplay({
  rampSteps,
}: {
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[]
}) {
  return (
    <span className="text-xs text-zinc-400 shrink-0">
      {rampSteps.map((r) => `${r.frequencyPerWeek}/wk`).join(" → ")}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Stage / skill progression chain — read-only
// ---------------------------------------------------------------------------

function StageChain({ steps }: { steps: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap shrink-0">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-xs text-zinc-400">{step}</span>
          {i < steps.length - 1 && (
            <span className="text-xs text-zinc-600">{"→"}</span>
          )}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Endpoint stepper (volume / target primitives with milestoneConfig)
// ---------------------------------------------------------------------------

function EndpointStepper({
  targetId,
  config,
  unit,
  isEditing,
  setEditingValue,
  isConfigExpanded,
  toggleConfig,
  onUpdate,
}: {
  targetId: string
  config: { start: number; target: number; steps: number; curveTension: number }
  unit: string
  isEditing: boolean
  setEditingValue: (id: string | null) => void
  isConfigExpanded: boolean
  toggleConfig: (id: string) => void
  onUpdate: TargetStepProps["onUpdate"]
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => {
          const inc = getIncrement(config.target)
          const newVal = Math.max(config.start + 1, config.target - inc)
          onUpdate(targetId, { value: newVal })
        }}
        className="size-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <Minus className="size-3 text-zinc-400" />
      </button>

      {isEditing ? (
        <input
          type="number"
          autoFocus
          defaultValue={config.target}
          className="w-16 text-center text-sm bg-white/10 border border-white/20 rounded px-1 py-0.5 text-white"
          onBlur={(e) => {
            const parsed = parseInt(e.target.value, 10)
            if (!isNaN(parsed) && parsed > config.start) {
              onUpdate(targetId, { value: parsed })
            }
            setEditingValue(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
      ) : (
        <button
          onClick={() => setEditingValue(targetId)}
          className="text-sm text-white font-mono min-w-[4rem] text-center hover:bg-white/10 rounded px-1 py-0.5 transition-colors"
        >
          {config.target} {unit}
        </button>
      )}

      <button
        onClick={() => {
          const inc = getIncrement(config.target)
          onUpdate(targetId, { value: config.target + inc })
        }}
        className="size-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <Plus className="size-3 text-zinc-400" />
      </button>

      {/* Config expand button */}
      <button
        onClick={() => toggleConfig(targetId)}
        className={`size-6 rounded flex items-center justify-center transition-colors ${
          isConfigExpanded ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
        }`}
      >
        <SlidersHorizontal className="size-3 text-zinc-400" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expandable config panel — steps slider, tension presets, tension slider
// ---------------------------------------------------------------------------

function ConfigPanel({
  targetId,
  config,
  onUpdate,
}: {
  targetId: string
  config: { start: number; target: number; steps: number; curveTension: number }
  onUpdate: TargetStepProps["onUpdate"]
}) {
  return (
    <div className="bg-white/3 rounded-lg p-3 mt-2 ml-8 border border-white/5 space-y-3">
      {/* Steps slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-400">Milestones</span>
          <span className="text-xs text-white font-mono">{config.steps}</span>
        </div>
        <input
          type="range"
          min={3}
          max={15}
          value={config.steps}
          onChange={(e) =>
            onUpdate(targetId, { steps: parseInt(e.target.value, 10) })
          }
          className="w-full accent-zinc-400 h-1"
        />
      </div>

      {/* Tension presets */}
      <div>
        <span className="text-xs text-zinc-400 block mb-1.5">Curve shape</span>
        <div className="flex gap-2">
          {[
            { label: "Quick wins", tension: 1.2 },
            { label: "Balanced", tension: 0 },
            { label: "Ambitious", tension: -1.5 },
          ].map((preset) => {
            const isActive =
              Math.abs(config.curveTension - preset.tension) < 0.05
            return (
              <button
                key={preset.label}
                onClick={() =>
                  onUpdate(targetId, { curveTension: preset.tension })
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  isActive
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-zinc-500 hover:border-white/20"
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tension slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-400">Fine-tune tension</span>
          <span className="text-xs text-white font-mono">
            {config.curveTension.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={-2}
          max={2}
          step={0.1}
          value={config.curveTension}
          onChange={(e) =>
            onUpdate(targetId, { curveTension: parseFloat(e.target.value) })
          }
          className="w-full accent-zinc-400 h-1"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Milestone dot preview row
// ---------------------------------------------------------------------------

function MilestoneDots({
  milestones,
  color,
}: {
  milestones: { step: number; value: number }[]
  color: string
}) {
  if (milestones.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2 ml-8">
      {milestones.map((m, i) => (
        <div key={m.step} className="flex items-center gap-1">
          <div
            className="size-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] text-zinc-500">{m.value}</span>
          {i < milestones.length - 1 && (
            <span className="text-[10px] text-zinc-600">{"→"}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single target row — renders one FrameworkTarget with primitive-specific UI
// ---------------------------------------------------------------------------

function TargetRow({
  target,
  enabled,
  override,
  isEditing,
  isConfigExpanded,
  setEditingValue,
  toggleConfig,
  onUpdate,
  isLast,
  sharedDriver,
}: {
  target: FrameworkTarget
  enabled: boolean
  override?: { value?: number; steps?: number; curveTension?: number }
  isEditing: boolean
  isConfigExpanded: boolean
  setEditingValue: (id: string | null) => void
  toggleConfig: (id: string) => void
  onUpdate: TargetStepProps["onUpdate"]
  isLast: boolean
  /** If set, config comes from the SharedDriver, not the target itself. */
  sharedDriver?: SharedDriver | null
}) {
  const primitive = target.primitive
  const role = target.role
  const meta = PRIMITIVE_META[primitive]

  // Resolve config source — shared driver overrides the target's own config
  const rawMilestoneConfig =
    sharedDriver?.milestoneConfig ?? target.milestoneConfig
  const rampSteps = sharedDriver?.rampSteps ?? target.rampSteps
  const stageSteps = target.stageSteps

  const hasMilestoneConfig =
    (primitive === "volume" || primitive === "target") &&
    rawMilestoneConfig !== null
  const hasRamp =
    primitive === "habit" && rampSteps !== null && rampSteps.length > 0
  const hasStages =
    (primitive === "skill" || primitive === "stage") &&
    stageSteps !== null &&
    stageSteps.length > 0

  // Build effective config with overrides applied
  const config =
    hasMilestoneConfig && rawMilestoneConfig
      ? buildEffectiveConfig(rawMilestoneConfig, override)
      : null

  // Generate milestones for volume/target
  const milestones = useMemo(() => {
    if (!config || !enabled) return null
    return generateMilestoneLadder(config as MilestoneLadderConfig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.start, config?.target, config?.steps, config?.curveTension, enabled])

  return (
    <div className={`px-4 py-3 ${!isLast ? "border-b border-white/5" : ""}`}>
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onUpdate(target.id, { enabled: !enabled })}
          className="size-5 rounded border flex items-center justify-center shrink-0 transition-all duration-200"
          style={{
            borderColor: enabled ? meta.color : "rgba(255,255,255,0.2)",
            backgroundColor: enabled ? meta.color : "transparent",
          }}
        >
          {enabled && (
            <Check className="size-3 text-zinc-950" strokeWidth={3} />
          )}
        </button>

        {/* Label */}
        <span
          className={`text-sm font-medium flex-1 ${
            enabled ? "text-white" : "text-zinc-500"
          }`}
        >
          {target.label}
        </span>

        {/* Primitive badge + role */}
        <PrimitiveBadge primitive={primitive} role={role} />

        {/* Primitive-specific controls */}
        {hasRamp && <RampDisplay rampSteps={rampSteps!} />}
        {hasStages && <StageChain steps={stageSteps!} />}

        {hasMilestoneConfig && config && enabled && (
          <EndpointStepper
            targetId={target.id}
            config={config}
            unit={target.unit}
            isEditing={isEditing}
            setEditingValue={setEditingValue}
            isConfigExpanded={isConfigExpanded}
            toggleConfig={toggleConfig}
            onUpdate={onUpdate}
          />
        )}
      </div>

      {/* Milestone preview dots (volume / target only) */}
      {milestones && milestones.length > 0 && (
        <MilestoneDots milestones={milestones} color={meta.color} />
      )}

      {/* Expanded config panel (volume / target only) */}
      {isConfigExpanded && hasMilestoneConfig && config && enabled && (
        <ConfigPanel targetId={target.id} config={config} onUpdate={onUpdate} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared Foundations section
// ---------------------------------------------------------------------------

function SharedFoundationsCard({
  sharedDriverIds,
  selectedObjectives,
  targetOverrides,
  onUpdate,
  expandedConfigs,
  toggleConfig,
  editingValue,
  setEditingValue,
}: {
  sharedDriverIds: string[]
  selectedObjectives: Set<string>
  targetOverrides: TargetStepProps["targetOverrides"]
  onUpdate: TargetStepProps["onUpdate"]
  expandedConfigs: Set<string>
  toggleConfig: (id: string) => void
  editingValue: string | null
  setEditingValue: (id: string | null) => void
}) {
  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-emerald-400 mb-1">
        Shared Foundations
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        These habits power multiple objectives
      </p>

      <div className="space-y-1">
        {sharedDriverIds.map((driverId, idx) => {
          const driver = getSharedDriver(driverId)
          if (!driver) return null

          const meta = PRIMITIVE_META[driver.primitive]

          // Find which selected objectives this driver powers
          const poweredObjectives = getObjectivesForSharedDriver(
            driverId
          ).filter((obj) => selectedObjectives.has(obj.id))

          // Find the first target referencing this shared driver across
          // selected objectives (used for enabled state / override key)
          const representativeTarget = TARGETS.find(
            (t) =>
              t.sharedDriverId === driverId &&
              OBJECTIVES.some(
                (o) =>
                  o.id === t.objectiveId && selectedObjectives.has(o.id)
              )
          )
          if (!representativeTarget) return null

          const targetId = representativeTarget.id
          const override = targetOverrides[targetId]
          const enabled =
            override?.enabled ?? representativeTarget.defaultEnabled

          const hasMilestoneConfig =
            (driver.primitive === "volume" ||
              driver.primitive === "target") &&
            driver.milestoneConfig !== null
          const hasRamp =
            driver.primitive === "habit" &&
            driver.rampSteps !== null &&
            driver.rampSteps.length > 0

          // Build effective config with overrides
          const config =
            hasMilestoneConfig && driver.milestoneConfig
              ? buildEffectiveConfig(driver.milestoneConfig, override)
              : null

          const milestones =
            config && enabled
              ? generateMilestoneLadder(config as MilestoneLadderConfig)
              : null

          const isConfigExpanded = expandedConfigs.has(targetId)
          const isEditing = editingValue === targetId

          return (
            <div
              key={driverId}
              className={`px-4 py-3 ${
                idx < sharedDriverIds.length - 1
                  ? "border-b border-white/5"
                  : ""
              }`}
            >
              {/* Main row */}
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => onUpdate(targetId, { enabled: !enabled })}
                  className="size-5 rounded border flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    borderColor: enabled
                      ? meta.color
                      : "rgba(255,255,255,0.2)",
                    backgroundColor: enabled ? meta.color : "transparent",
                  }}
                >
                  {enabled && (
                    <Check
                      className="size-3 text-zinc-950"
                      strokeWidth={3}
                    />
                  )}
                </button>

                {/* Label */}
                <span
                  className={`text-sm font-medium flex-1 ${
                    enabled ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {driver.label}
                </span>

                {/* Primitive badge */}
                <PrimitiveBadge primitive={driver.primitive} role="driver" />

                {/* Ramp display */}
                {hasRamp && <RampDisplay rampSteps={driver.rampSteps!} />}

                {/* Endpoint stepper for volume/target */}
                {hasMilestoneConfig && config && enabled && (
                  <EndpointStepper
                    targetId={targetId}
                    config={config}
                    unit={driver.unit}
                    isEditing={isEditing}
                    setEditingValue={setEditingValue}
                    isConfigExpanded={isConfigExpanded}
                    toggleConfig={toggleConfig}
                    onUpdate={onUpdate}
                  />
                )}
              </div>

              {/* Milestone dots */}
              {milestones && milestones.length > 0 && (
                <MilestoneDots milestones={milestones} color={meta.color} />
              )}

              {/* "Powers: Obj A, Obj B" badge row */}
              {poweredObjectives.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 ml-8">
                  <span className="text-[10px] text-zinc-500">Powers:</span>
                  {poweredObjectives.map((obj) => (
                    <span
                      key={obj.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400"
                    >
                      {obj.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Config panel */}
              {isConfigExpanded && config && enabled && (
                <ConfigPanel
                  targetId={targetId}
                  config={config}
                  onUpdate={onUpdate}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TargetStep({
  selectedObjectives,
  targetOverrides,
  onUpdate,
}: TargetStepProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(selectedObjectives)
  )
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(
    new Set()
  )
  const [editingValue, setEditingValue] = useState<string | null>(null)

  const toggleSection = useCallback((objId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(objId)) next.delete(objId)
      else next.add(objId)
      return next
    })
  }, [])

  const toggleConfig = useCallback((targetId: string) => {
    setExpandedConfigs((prev) => {
      const next = new Set(prev)
      if (next.has(targetId)) next.delete(targetId)
      else next.add(targetId)
      return next
    })
  }, [])

  function isEnabled(target: FrameworkTarget): boolean {
    const override = targetOverrides[target.id]
    return override?.enabled ?? target.defaultEnabled
  }

  const activeObjectives = OBJECTIVES.filter((o) =>
    selectedObjectives.has(o.id)
  )

  // -------------------------------------------------------------------------
  // Shared driver deduplication
  // -------------------------------------------------------------------------

  /** Unique shared driver IDs across all selected objectives, deduped */
  const sharedDriverIds = useMemo(() => {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const obj of activeObjectives) {
      const targets = getTargetsForObjective(obj.id)
      for (const t of targets) {
        if (t.sharedDriverId && !seen.has(t.sharedDriverId)) {
          seen.add(t.sharedDriverId)
          ids.push(t.sharedDriverId)
        }
      }
    }
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectives])

  /** Set of shared driver IDs that power 2+ selected objectives — these
   *  are rendered ONLY in the Shared Foundations card, not per-objective. */
  const multiObjectiveDriverIds = useMemo(() => {
    const driverToObjCount = new Map<string, number>()
    for (const obj of activeObjectives) {
      const targets = getTargetsForObjective(obj.id)
      const seenInObj = new Set<string>()
      for (const t of targets) {
        if (t.sharedDriverId && !seenInObj.has(t.sharedDriverId)) {
          seenInObj.add(t.sharedDriverId)
          driverToObjCount.set(
            t.sharedDriverId,
            (driverToObjCount.get(t.sharedDriverId) ?? 0) + 1
          )
        }
      }
    }
    return new Set(
      [...driverToObjCount.entries()]
        .filter(([, count]) => count >= 2)
        .map(([id]) => id)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectives])

  const showSharedFoundations = multiObjectiveDriverIds.size > 0

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">
        Configure your targets
      </h2>
      <p className="text-zinc-400 text-center mb-8">
        Adjust endpoints and milestones — the system auto-generates your
        progression
      </p>

      {/* Shared Foundations card */}
      {showSharedFoundations && (
        <SharedFoundationsCard
          sharedDriverIds={[...multiObjectiveDriverIds]}
          selectedObjectives={selectedObjectives}
          targetOverrides={targetOverrides}
          onUpdate={onUpdate}
          expandedConfigs={expandedConfigs}
          toggleConfig={toggleConfig}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
        />
      )}

      {/* Per-objective collapsible sections */}
      <div className="space-y-4">
        {activeObjectives.map((obj) => {
          const allTargets = getTargetsForObjective(obj.id)
          const isExpanded = expandedSections.has(obj.id)
          const enabledCount = allTargets.filter((t) => isEnabled(t)).length

          // Split into drivers and metrics, excluding multi-objective shared
          // drivers (those are in the Shared Foundations card above)
          const drivers = getDriversForObjective(obj.id).filter(
            (t) =>
              !t.sharedDriverId ||
              !multiObjectiveDriverIds.has(t.sharedDriverId)
          )
          const metrics = getMetricsForObjective(obj.id)

          const hasDrivers = drivers.length > 0
          const hasMetrics = metrics.length > 0

          return (
            <div key={obj.id}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(obj.id)}
                className={`w-full flex items-center justify-between bg-white/5 border border-white/10 p-4 cursor-pointer transition-all duration-200 hover:bg-white/8 ${
                  isExpanded ? "rounded-t-xl" : "rounded-xl"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="size-4 text-zinc-400" />
                  )}
                  <span className="text-sm font-medium text-white">
                    {obj.label}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {enabledCount}/{allTargets.length} enabled
                </span>
              </button>

              {/* Section body */}
              {isExpanded && (
                <div className="bg-white/3 border border-t-0 border-white/10 rounded-b-xl overflow-hidden">
                  {/* Drivers sub-section — green left border */}
                  {hasDrivers && (
                    <div
                      className="border-l-2"
                      style={{ borderColor: "rgba(34, 197, 94, 0.4)" }}
                    >
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-green-500/80">
                          What you do
                        </span>
                      </div>
                      {drivers.map((target, tIdx) => {
                        const enabled = isEnabled(target)
                        const override = targetOverrides[target.id]
                        const sd = target.sharedDriverId
                          ? getSharedDriver(target.sharedDriverId)
                          : null
                        return (
                          <TargetRow
                            key={target.id}
                            target={target}
                            enabled={enabled}
                            override={override}
                            isEditing={editingValue === target.id}
                            isConfigExpanded={expandedConfigs.has(target.id)}
                            setEditingValue={setEditingValue}
                            toggleConfig={toggleConfig}
                            onUpdate={onUpdate}
                            isLast={
                              tIdx === drivers.length - 1 && !hasMetrics
                            }
                            sharedDriver={sd}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Metrics sub-section — blue left border */}
                  {hasMetrics && (
                    <div
                      className="border-l-2"
                      style={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
                    >
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500/80">
                          What you measure
                        </span>
                      </div>
                      {metrics.map((target, tIdx) => {
                        const enabled = isEnabled(target)
                        const override = targetOverrides[target.id]
                        return (
                          <TargetRow
                            key={target.id}
                            target={target}
                            enabled={enabled}
                            override={override}
                            isEditing={editingValue === target.id}
                            isConfigExpanded={expandedConfigs.has(target.id)}
                            setEditingValue={setEditingValue}
                            toggleConfig={toggleConfig}
                            onUpdate={onUpdate}
                            isLast={tIdx === metrics.length - 1}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
