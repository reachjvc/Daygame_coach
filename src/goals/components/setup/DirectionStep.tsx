"use client"

import { useState } from "react"
import { Check, ChevronRight, Sparkles } from "lucide-react"
import { AreaConfigDialog } from "./AreaConfigDialog"
import type { DaygamePath, LifeAreaConfig } from "@/src/goals/types"

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
}: DirectionStepProps) {
  const [dialogAreaId, setDialogAreaId] = useState<string | null>(null)

  const daygame = lifeAreas.find((a) => a.id === "daygame")
  const otherAreas = lifeAreas.filter((a) => a.id !== "daygame" && a.id !== "custom")
  const dialogArea = dialogAreaId
    ? lifeAreas.find((a) => a.id === dialogAreaId) ?? null
    : null

  const handleCardClick = (areaId: string) => {
    if (areaId !== "daygame" && !selectedAreas.has(areaId)) {
      onToggleArea(areaId)
    }
    setDialogAreaId(areaId)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && dialogAreaId && dialogAreaId !== "daygame") {
      // Auto-deselect area if user unchecked all suggestions
      const area = lifeAreas.find((a) => a.id === dialogAreaId)
      if (area?.suggestions && selectedAreas.has(dialogAreaId)) {
        const hasAny = area.suggestions.some((_, i) =>
          selectedGoals.has(`${dialogAreaId}_s${i}`)
        )
        if (!hasAny) onToggleArea(dialogAreaId)
      }
    }
    if (!open) setDialogAreaId(null)
  }

  // Summary text for daygame card
  const daygameSummary = selectedPath
    ? selectedPath === "fto" ? "Find The One" : "Abundance"
    : null

  // Count selected suggestions for an area
  const countSelected = (area: LifeAreaConfig) => {
    if (!area.suggestions) return 0
    return area.suggestions.filter((_, i) =>
      selectedGoals.has(`${area.id}_s${i}`)
    ).length
  }

  return (
    <div className="min-h-screen pt-16 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="relative inline-block mb-3">
            <Sparkles className="size-8 text-emerald-400 opacity-60" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(0,230,118,0.2) 0%, transparent 70%)",
                animation: "v9c-iconGlow 3s ease-in-out infinite",
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shape Your Path to Mastery</h1>
          <p className="text-white/40 text-sm">
            Tap a life area to configure your goals.
          </p>
        </div>

        {/* ── Daygame card (large, prominent) ── */}
        {daygame && (() => {
          const DgIcon = daygame.icon
          const isConfigured = !!selectedPath
          return (
            <button
              onClick={() => handleCardClick("daygame")}
              className="w-full rounded-2xl p-6 text-left transition-all duration-300 mb-8"
              style={{
                background: isConfigured ? `${daygame.hex}10` : `${daygame.hex}06`,
                backdropFilter: "blur(8px)",
                border: isConfigured
                  ? `1px solid ${daygame.hex}40`
                  : `1px solid ${daygame.hex}15`,
                boxShadow: isConfigured ? `0 0 30px ${daygame.hex}10` : "none",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="size-14 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: `${daygame.hex}${isConfigured ? "20" : "12"}`,
                    boxShadow: isConfigured ? `0 0 16px ${daygame.hex}20` : "none",
                  }}
                >
                  <DgIcon
                    className="size-7"
                    style={{ color: daygame.hex, opacity: isConfigured ? 1 : 0.6 }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-xl font-semibold ${isConfigured ? "text-white" : "text-white/60"}`}>
                    {daygame.name}
                  </h2>
                  <p className="text-sm text-white/40 mt-0.5">
                    {daygameSummary
                      ? `${daygameSummary} · Tap to edit`
                      : "Tap to choose your path"}
                  </p>
                </div>
                {isConfigured ? (
                  <Check className="size-5 shrink-0" style={{ color: daygame.hex }} />
                ) : (
                  <ChevronRight className="size-5 text-white/20 shrink-0" />
                )}
              </div>
            </button>
          )
        })()}

        {/* ── Divider ── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(0,255,127,0.06)" }} />
          <span className="text-xs uppercase tracking-wider text-emerald-300/25">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0,255,127,0.06)" }} />
        </div>

        {/* ── Other area cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAreas.map((area) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            const count = countSelected(area)
            return (
              <button
                key={area.id}
                onClick={() => handleCardClick(area.id)}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-300"
                style={{
                  background: isSelected ? `${area.hex}10` : `${area.hex}06`,
                  backdropFilter: "blur(8px)",
                  border: isSelected
                    ? `1px solid ${area.hex}40`
                    : `1px solid ${area.hex}15`,
                  boxShadow: isSelected ? `0 0 20px ${area.hex}10` : "none",
                }}
              >
                <div
                  className="size-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: `${area.hex}${isSelected ? "20" : "12"}`,
                    boxShadow: isSelected ? `0 0 12px ${area.hex}20` : "none",
                  }}
                >
                  <Icon
                    className="size-5"
                    style={{ color: area.hex, opacity: isSelected ? 1 : 0.5 }}
                  />
                </div>
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{ color: isSelected ? "white" : `${area.hex}90` }}
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
      </div>

      {/* ── Config dialog ── */}
      <AreaConfigDialog
        area={dialogArea}
        open={dialogAreaId !== null}
        onOpenChange={handleDialogClose}
        selectedPath={selectedPath}
        selectedL1s={selectedL1s}
        customL1s={customL1s}
        onSelectPath={onSelectPath}
        onToggleL1={onToggleL1}
        onAddCustomL1={onAddCustomL1}
        onUpdateCustomL1={onUpdateCustomL1}
        onRemoveCustomL1={onRemoveCustomL1}
        selectedGoals={selectedGoals}
        onToggleGoal={onToggleGoal}
        targetDates={targetDates}
        onUpdateTargetDate={onUpdateTargetDate}
      />

      <style>{`
        @keyframes v9c-iconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
