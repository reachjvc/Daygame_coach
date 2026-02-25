"use client"

import { useState } from "react"
import { Check, ChevronRight, Plus, Sparkles, Star, X } from "lucide-react"
import { getDaygamePathL1, getAreaCatalog } from "@/src/goals/data/goalGraph"
import type { DaygamePath, LifeAreaConfig } from "@/src/goals/types"

/* ── Neon wireframe palette ── */
const NEON_FTO = "#ec4899"       // hot pink
const NEON_ABUNDANCE = "#3b82f6" // electric blue
const NEON_ACTION = "#00fff2"    // cyan — skip / done

/** Focus ring class for all interactive buttons */
const FOCUS_RING = "focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-0"

/** Keep focus on the clicked button after React re-renders */
function keepFocus(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget
  btn.focus()
  requestAnimationFrame(() => {
    if (document.activeElement !== btn) btn.focus()
  })
}

interface CustomL1 {
  id: string
  text: string
  path: DaygamePath
}

interface DirectionStepProps {
  lifeAreas: LifeAreaConfig[]
  selectedPath: DaygamePath | null
  selectedAreas: Set<string>
  selectedL1s: Set<string>
  customL1s: CustomL1[]
  selectedGoals: Set<string>
  targetDates: Record<string, string>
  onSelectPath: (path: DaygamePath) => void
  onToggleL1: (id: string) => void
  onAddCustomL1: (path: DaygamePath) => void
  onUpdateCustomL1: (id: string, text: string) => void
  onRemoveCustomL1: (id: string) => void
  onToggleArea: (areaId: string) => void
  onToggleGoal: (id: string) => void
  onUpdateTargetDate: (areaId: string, date: string) => void
  onAdvance: () => void
  onSkipToGoals: () => void
}

function NeonDot({ color }: { color: string }) {
  return (
    <div
      className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${color}80` }}
    />
  )
}

export function DirectionStep({
  lifeAreas,
  selectedPath,
  selectedAreas,
  selectedL1s,
  customL1s,
  selectedGoals,
  targetDates,
  onSelectPath,
  onToggleL1,
  onAddCustomL1,
  onUpdateCustomL1,
  onRemoveCustomL1,
  onToggleArea,
  onToggleGoal,
  onUpdateTargetDate,
  onAdvance,
  onSkipToGoals,
}: DirectionStepProps) {
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)

  const otherAreas = lifeAreas.filter((a) => a.id !== "daygame" && a.id !== "custom")

  const handleAreaCardClick = (areaId: string) => {
    if (expandedAreaId === areaId) {
      // Collapsing — auto-deselect if no goals checked
      const area = lifeAreas.find((a) => a.id === areaId)
      if (area?.suggestions && selectedAreas.has(areaId)) {
        const hasAny = area.suggestions.some((_, i) =>
          selectedGoals.has(`${areaId}_s${i}`)
        )
        if (!hasAny) onToggleArea(areaId)
      }
      setExpandedAreaId(null)
    } else {
      if (!selectedAreas.has(areaId)) {
        onToggleArea(areaId)
      }
      setExpandedAreaId(areaId)
    }
  }

  const handleAreaDone = (areaId: string) => {
    const area = lifeAreas.find((a) => a.id === areaId)
    if (area?.suggestions && selectedAreas.has(areaId)) {
      const hasAny = area.suggestions.some((_, i) =>
        selectedGoals.has(`${areaId}_s${i}`)
      )
      if (!hasAny) onToggleArea(areaId)
    }
    setExpandedAreaId(null)
  }

  const countSelected = (area: LifeAreaConfig) => {
    if (!area.suggestions) return 0
    return area.suggestions.filter((_, i) =>
      selectedGoals.has(`${area.id}_s${i}`)
    ).length
  }

  const expandedArea = expandedAreaId
    ? lifeAreas.find((a) => a.id === expandedAreaId) ?? null
    : null

  return (
    <div className="min-h-screen pt-16 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        {/* ── Heading ── */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-3">
            <Sparkles className="size-8" style={{ color: NEON_ACTION, filter: `drop-shadow(0 0 8px ${NEON_ACTION})` }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shape Your Path to Mastery</h1>
          <p className="text-white/40 text-sm">
            Choose your direction and configure your goals.
          </p>
        </div>

        {/* ── Daygame section with card header + inline FTO/Abundance ── */}
        <DaygameSection
          daygame={lifeAreas.find((a) => a.id === "daygame") ?? null}
          selectedPath={selectedPath}
          selectedL1s={selectedL1s}
          customL1s={customL1s}
          targetDate={targetDates["daygame"] ?? ""}
          onSelectPath={onSelectPath}
          onToggleL1={onToggleL1}
          onAddCustomL1={onAddCustomL1}
          onUpdateCustomL1={onUpdateCustomL1}
          onRemoveCustomL1={onRemoveCustomL1}
          onUpdateTargetDate={(date) => onUpdateTargetDate("daygame", date)}
          onAdvance={onAdvance}
        />

        {/* ── Divider ── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* ── Other area cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {otherAreas.map((area, idx) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            const isExpanded = expandedAreaId === area.id
            const count = countSelected(area)
            return (
              <button
                key={area.id}
                id={`btn-area-${area.id}`}
                onMouseDown={keepFocus}
                onClick={() => handleAreaCardClick(area.id)}
                tabIndex={expandedAreaId && expandedAreaId !== area.id ? -1 : undefined}
                className={`relative flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-300 ${FOCUS_RING}`}
                style={{
                  background: isSelected ? `${area.hex}35` : `${area.hex}20`,
                  border: `${isExpanded ? 2 : isSelected ? 2 : 1}px solid ${area.hex}`,
                  boxShadow: isSelected ? `0 0 20px ${area.hex}30, inset 0 0 20px ${area.hex}10` : "none",
                }}
              >
                {isSelected && <NeonDot color={area.hex} />}
                <Icon
                  className="size-6"
                  style={{ color: area.hex, filter: `drop-shadow(0 0 6px ${area.hex})` }}
                />
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{ color: isSelected ? "white" : `${area.hex}` }}
                >
                  {area.name}
                </span>
                {isSelected && count > 0 && (
                  <span className="text-[10px] text-white/30">
                    {count} goal{count !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Expanded area panel (below grid) ── */}
        {expandedArea && (
          <div
            className="mt-4 rounded-2xl p-5 transition-all duration-300"
            style={{
              background: `${expandedArea.hex}18`,
              border: `1px solid ${expandedArea.hex}`,
            }}
          >
            <SuggestionsContent
              area={expandedArea}
              selectedGoals={selectedGoals}
              selectedL1s={selectedL1s}
              onToggleGoal={onToggleGoal}
              onToggleL1={onToggleL1}
            />

            {/* Target date */}
            {(expandedArea.suggestions ?? []).some((_, i) =>
              selectedGoals.has(`${expandedArea.id}_s${i}`)
            ) && (
              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${expandedArea.hex}30` }}>
                <label className="text-sm text-white/50 block mb-2">
                  Target date (optional)
                </label>
                <input
                  type="date"
                  value={targetDates[expandedArea.id] ?? ""}
                  onChange={(e) => onUpdateTargetDate(expandedArea.id, e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-white/25 [color-scheme:dark]"
                />
              </div>
            )}

            <button
              onMouseDown={keepFocus}
              onClick={() => handleAreaDone(expandedArea.id)}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold transition-all"
              style={{
                background: expandedArea.hex,
                color: "#fff",
                boxShadow: `0 0 16px ${expandedArea.hex}40`,
              }}
            >
              Done
            </button>
          </div>
        )}

        {/* ── Skip to goal selection ── */}
        <button
          onMouseDown={keepFocus}
          onClick={onSkipToGoals}
          className="relative w-full rounded-xl p-4 text-left transition-all duration-200 flex items-center gap-3 mt-6"
          style={{
            background: `${NEON_ACTION}18`,
            border: `1px solid ${NEON_ACTION}`,
          }}
        >
          <ChevronRight className="size-4" style={{ color: NEON_ACTION, filter: `drop-shadow(0 0 6px ${NEON_ACTION})` }} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white/70">Skip to goal selection</h3>
            <p className="text-xs text-white/30">Jump straight to picking individual goals</p>
          </div>
        </button>
      </div>

    </div>
  )
}

/* ── Daygame section: FTO/Abundance + L1 reasons inline ── */

function DaygameSection({
  daygame,
  selectedPath,
  selectedL1s,
  customL1s,
  targetDate,
  onSelectPath,
  onToggleL1,
  onAddCustomL1,
  onUpdateCustomL1,
  onRemoveCustomL1,
  onUpdateTargetDate,
  onAdvance,
}: {
  daygame: LifeAreaConfig | null
  selectedPath: DaygamePath | null
  selectedL1s: Set<string>
  customL1s: CustomL1[]
  targetDate: string
  onSelectPath: (path: DaygamePath) => void
  onToggleL1: (id: string) => void
  onAddCustomL1: (path: DaygamePath) => void
  onUpdateCustomL1: (id: string, text: string) => void
  onRemoveCustomL1: (id: string) => void
  onUpdateTargetDate: (date: string) => void
  onAdvance: () => void
}) {
  const isFto = selectedPath === "fto"
  const isAbundance = selectedPath === "abundance"
  const isConfigured = !!selectedPath
  const l1s = selectedPath ? getDaygamePathL1(selectedPath) : []
  const pathCustomL1s = selectedPath
    ? customL1s.filter((l) => l.path === selectedPath)
    : []

  const daygameSummary = selectedPath
    ? selectedPath === "fto" ? "Find The One" : "Abundance"
    : null

  if (!daygame) return null
  const DgIcon = daygame.icon

  return (
    <div
      className="relative mb-8 rounded-r-2xl pl-4 pr-0 space-y-4 transition-all duration-300"
      style={{
        borderLeft: `3px solid ${daygame.hex}`,
        boxShadow: isConfigured ? `0 0 24px ${daygame.hex}15` : "none",
      }}
    >
      {/* Daygame section label */}
      <div className="flex items-center gap-3">
        <DgIcon
          className="size-6"
          style={{ color: daygame.hex, filter: `drop-shadow(0 0 6px ${daygame.hex})`, opacity: isConfigured ? 1 : 0.75 }}
        />
        <h2 className={`text-lg font-semibold ${isConfigured ? "text-white" : "text-white/75"}`}>
          {daygame.name}
        </h2>
        {daygameSummary && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${daygame.hex}20`, color: daygame.hex }}>
            {daygameSummary}
          </span>
        )}
      </div>

      {/* Path cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="btn-path-fto"
          onMouseDown={keepFocus}
          onClick={() => onSelectPath("fto")}
          tabIndex={isAbundance ? -1 : undefined}
          className={`relative rounded-xl p-4 text-left transition-all duration-200 ${FOCUS_RING}`}
          style={{
            background: isFto ? `${NEON_FTO}35` : `${NEON_FTO}20`,
            border: `${isFto ? 2 : 1}px solid ${NEON_FTO}`,
            boxShadow: isFto ? `0 0 20px ${NEON_FTO}30, inset 0 0 20px ${NEON_FTO}10` : "none",
          }}
        >
          {isFto && <NeonDot color={NEON_FTO} />}
          <Star
            className="size-5 mb-2"
            style={{ color: NEON_FTO, filter: `drop-shadow(0 0 6px ${NEON_FTO})` }}
          />
          <h3 className="text-sm font-semibold text-white mb-0.5">Find The One</h3>
          <p className="text-xs text-white/40">Connection & commitment</p>
        </button>

        <button
          id="btn-path-abundance"
          onMouseDown={keepFocus}
          onClick={() => onSelectPath("abundance")}
          tabIndex={isFto ? -1 : undefined}
          className={`relative rounded-xl p-4 text-left transition-all duration-200 ${FOCUS_RING}`}
          style={{
            background: isAbundance ? `${NEON_ABUNDANCE}35` : `${NEON_ABUNDANCE}20`,
            border: `${isAbundance ? 2 : 1}px solid ${NEON_ABUNDANCE}`,
            boxShadow: isAbundance ? `0 0 20px ${NEON_ABUNDANCE}30, inset 0 0 20px ${NEON_ABUNDANCE}10` : "none",
          }}
        >
          {isAbundance && <NeonDot color={NEON_ABUNDANCE} />}
          <Sparkles
            className="size-5 mb-2"
            style={{ color: NEON_ABUNDANCE, filter: `drop-shadow(0 0 6px ${NEON_ABUNDANCE})` }}
          />
          <h3 className="text-sm font-semibold text-white mb-0.5">Abundance</h3>
          <p className="text-xs text-white/40">Freedom & experience</p>
        </button>
      </div>

      {/* L1 reasons (expand when path selected) */}
      {selectedPath && (
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: `${isFto ? NEON_FTO : NEON_ABUNDANCE}18`,
            border: `1px solid ${isFto ? NEON_FTO : NEON_ABUNDANCE}`,
          }}
        >
          <div className="space-y-1">
            <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2 px-1">
              Your reasons
            </p>

            {l1s.map((l1, i) => {
              const isOn = selectedL1s.has(l1.id)
              const accentHex = isFto ? NEON_FTO : NEON_ABUNDANCE
              return (
                <GoalRow
                  key={l1.id}
                  id={`btn-l1-${l1.id}`}
                  label={l1.title}
                  isOn={isOn}
                  accentColor={accentHex}
                  onToggle={() => onToggleL1(l1.id)}
                />
              )
            })}

            {/* Custom L1s */}
            {pathCustomL1s.map((cl) => {
              const isOn = selectedL1s.has(cl.id)
              const accentColor = isFto ? "rgba(236,72,153" : "rgba(59,130,246"
              const accentHex = isFto ? NEON_FTO : NEON_ABUNDANCE
              return (
                <div
                  key={cl.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: isOn ? `${accentHex}0a` : "transparent" }}
                >
                  <button
                    onMouseDown={keepFocus}
                    onClick={() => onToggleL1(cl.id)}
                    className="size-[18px] rounded flex items-center justify-center shrink-0 transition-all duration-200"
                    style={{
                      background: isOn ? `${accentColor},0.8)` : "transparent",
                      border: isOn ? "none" : "2px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {isOn && <Check className="size-3 text-white" strokeWidth={3} />}
                  </button>
                  <input
                    type="text"
                    value={cl.text}
                    onChange={(e) => onUpdateCustomL1(cl.id, e.target.value)}
                    placeholder="Your reason..."
                    className="flex-1 min-w-0 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25"
                    autoFocus={!cl.text}
                  />
                  <button
                    onClick={() => onRemoveCustomL1(cl.id)}
                    className="size-6 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-red-500/20"
                  >
                    <X className="size-3.5 text-white/30" />
                  </button>
                </div>
              )
            })}

            <button
              onMouseDown={keepFocus}
              onClick={() => onAddCustomL1(selectedPath)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
            >
              <Plus className="size-[18px] text-white/20 shrink-0" />
              <span className="text-sm text-white/25">Add your own</span>
            </button>
          </div>

          {/* Target date */}
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${isFto ? `${NEON_FTO}20` : `${NEON_ABUNDANCE}20`}` }}>
            <label className="text-sm text-white/50 block mb-2">
              Target date (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => onUpdateTargetDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-white/25 [color-scheme:dark]"
            />
          </div>

          {/* Choose Goals button */}
          <button
            onMouseDown={keepFocus}
            onClick={onAdvance}
            className="relative mt-5 w-full rounded-lg py-3 text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #00E676, #7C4DFF)",
              color: "white",
              boxShadow: "0 0 16px rgba(0,230,118,0.3), 0 0 32px rgba(124,77,255,0.15)",
            }}
          >
            Choose Goals →
          </button>
        </div>
      )}

    </div>
  )
}

/* ── Goal row (checkbox + label) ── */

function GoalRow({
  id,
  label,
  isOn,
  accentColor,
  onToggle,
  featured,
}: {
  id?: string
  label: string
  isOn: boolean
  accentColor: string
  onToggle: () => void
  featured?: boolean
}) {
  return (
    <button
      id={id}
      onMouseDown={keepFocus}
      onClick={onToggle}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${FOCUS_RING}`}
      style={{
        background: isOn ? `${accentColor}0a` : "transparent",
      }}
    >
      <div
        className="size-[18px] rounded flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          background: isOn ? accentColor : "transparent",
          border: isOn ? "none" : "2px solid rgba(255,255,255,0.2)",
        }}
      >
        {isOn && <Check className="size-3 text-white" strokeWidth={3} />}
      </div>

      <span
        className="flex-1 text-sm"
        style={{ color: isOn ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)" }}
      >
        {label}
      </span>

      {featured && !isOn && (
        <Star className="size-3.5 shrink-0" style={{ color: `${accentColor}50` }} />
      )}
    </button>
  )
}

/* ── Non-daygame: L1 aspirations + suggestions checklist ── */

function SuggestionsContent({
  area,
  selectedGoals,
  selectedL1s,
  onToggleGoal,
  onToggleL1,
}: {
  area: LifeAreaConfig
  selectedGoals: Set<string>
  selectedL1s: Set<string>
  onToggleGoal: (id: string) => void
  onToggleL1: (id: string) => void
}) {
  const suggestions = area.suggestions ?? []
  const catalog = getAreaCatalog(area.id)
  const l1Goals = catalog?.l1Goals ?? []

  return (
    <div className="space-y-5">
      {l1Goals.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2 px-1">
            Your aspirations
          </p>
          {l1Goals.map((l1) => (
            <GoalRow
              key={l1.id}

              label={l1.title}
              isOn={selectedL1s.has(l1.id)}
              accentColor={area.hex}
              onToggle={() => onToggleL1(l1.id)}
            />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-1">
          {l1Goals.length > 0 && (
            <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2 px-1">
              Goals to track
            </p>
          )}
          {suggestions.map((s, i) => {
            const goalId = `${area.id}_s${i}`
            const isOn = selectedGoals.has(goalId)
            return (
              <GoalRow
                key={goalId}

                label={s.title}
                isOn={isOn}
                accentColor={area.hex}
                onToggle={() => onToggleGoal(goalId)}
                featured={s.featured}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
