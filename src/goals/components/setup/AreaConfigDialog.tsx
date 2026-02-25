"use client"

import { Check, Plus, Sparkles, Star, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getDaygamePathL1, getAreaCatalog } from "@/src/goals/data/goalGraph"
import type { DaygamePath, LifeAreaConfig } from "@/src/goals/types"

interface CustomL1 {
  id: string
  text: string
  path: DaygamePath
}

interface AreaConfigDialogProps {
  area: LifeAreaConfig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPath: DaygamePath | null
  selectedL1s: Set<string>
  customL1s: CustomL1[]
  onSelectPath: (path: DaygamePath) => void
  onToggleL1: (id: string) => void
  onAddCustomL1: (path: DaygamePath) => void
  onUpdateCustomL1: (id: string, text: string) => void
  onRemoveCustomL1: (id: string) => void
  selectedGoals: Set<string>
  onToggleGoal: (id: string) => void
  targetDates: Record<string, string>
  onUpdateTargetDate: (goalId: string, date: string) => void
}

export function AreaConfigDialog({
  area,
  open,
  onOpenChange,
  selectedPath,
  selectedL1s,
  customL1s,
  onSelectPath,
  onToggleL1,
  onAddCustomL1,
  onUpdateCustomL1,
  onRemoveCustomL1,
  selectedGoals,
  onToggleGoal,
  targetDates,
  onUpdateTargetDate,
}: AreaConfigDialogProps) {
  if (!area) return null

  const Icon = area.icon
  const isDaygame = area.id === "daygame"

  // Show target date once user has made at least one selection
  const hasSelections = isDaygame
    ? !!selectedPath
    : (area.suggestions ?? []).some((_, i) => selectedGoals.has(`${area.id}_s${i}`))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #111128 0%, #0d0d1f 100%)",
          borderColor: `${area.hex}25`,
        }}
      >
        {/* Header with colored accent bar */}
        <div
          className="px-6 pt-6 pb-4"
          style={{
            borderBottom: `1px solid ${area.hex}15`,
            background: `linear-gradient(180deg, ${area.hex}08 0%, transparent 100%)`,
          }}
        >
          <DialogHeader className="gap-1">
            <DialogTitle className="flex items-center gap-3 text-white text-lg">
              <div
                className="size-9 rounded-lg flex items-center justify-center"
                style={{ background: `${area.hex}20` }}
              >
                <Icon className="size-5" style={{ color: area.hex }} />
              </div>
              {area.name}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-sm pl-12">
              {isDaygame
                ? "Choose your direction and reasons"
                : "Select the goals you want to track"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isDaygame ? (
            <DaygameContent
              selectedPath={selectedPath}
              selectedL1s={selectedL1s}
              customL1s={customL1s}
              onSelectPath={onSelectPath}
              onToggleL1={onToggleL1}
              onAddCustomL1={onAddCustomL1}
              onUpdateCustomL1={onUpdateCustomL1}
              onRemoveCustomL1={onRemoveCustomL1}
            />
          ) : (
            <SuggestionsContent
              area={area}
              selectedGoals={selectedGoals}
              selectedL1s={selectedL1s}
              onToggleGoal={onToggleGoal}
              onToggleL1={onToggleL1}
            />
          )}

          {/* Target date — visible once something is selected */}
          {hasSelections && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${area.hex}15` }}>
              <label className="text-sm text-white/50 block mb-2">
                Target date (optional)
              </label>
              <input
                type="date"
                value={targetDates[area.id] ?? ""}
                onChange={(e) => onUpdateTargetDate(area.id, e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-white/25 [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-white/5">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            style={{ background: `${area.hex}cc`, color: "white" }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Goal row ── */

function GoalRow({
  label,
  isOn,
  accentColor,
  onToggle,
  featured,
}: {
  label: string
  isOn: boolean
  accentColor: string
  onToggle: () => void
  featured?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
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

/* ── Daygame content: FTO/Abundance + L1s ── */

function DaygameContent({
  selectedPath,
  selectedL1s,
  customL1s,
  onSelectPath,
  onToggleL1,
  onAddCustomL1,
  onUpdateCustomL1,
  onRemoveCustomL1,
}: {
  selectedPath: DaygamePath | null
  selectedL1s: Set<string>
  customL1s: CustomL1[]
  onSelectPath: (path: DaygamePath) => void
  onToggleL1: (id: string) => void
  onAddCustomL1: (path: DaygamePath) => void
  onUpdateCustomL1: (id: string, text: string) => void
  onRemoveCustomL1: (id: string) => void
}) {
  const isFto = selectedPath === "fto"
  const isAbundance = selectedPath === "abundance"
  const l1s = selectedPath ? getDaygamePathL1(selectedPath) : []
  const pathCustomL1s = selectedPath
    ? customL1s.filter((l) => l.path === selectedPath)
    : []

  return (
    <div className="space-y-5">
      {/* Path cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelectPath("fto")}
          className="rounded-xl p-4 text-left transition-all duration-200"
          style={{
            background: isFto ? "rgba(0,230,118,0.12)" : "rgba(0,230,118,0.03)",
            border: isFto
              ? "2px solid rgba(0,230,118,0.4)"
              : "1px solid rgba(0,230,118,0.12)",
            boxShadow: isFto ? "0 0 24px rgba(0,230,118,0.1)" : "none",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,230,118,0.15)" }}>
              <Star className="size-4 text-emerald-400" />
            </div>
            {isFto && <Check className="size-4 text-emerald-400 ml-auto" />}
          </div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Find The One</h3>
          <p className="text-xs text-white/40">Connection & commitment</p>
        </button>

        <button
          onClick={() => onSelectPath("abundance")}
          className="rounded-xl p-4 text-left transition-all duration-200"
          style={{
            background: isAbundance ? "rgba(255,64,129,0.12)" : "rgba(255,64,129,0.03)",
            border: isAbundance
              ? "2px solid rgba(255,64,129,0.4)"
              : "1px solid rgba(255,64,129,0.12)",
            boxShadow: isAbundance ? "0 0 24px rgba(255,64,129,0.1)" : "none",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,64,129,0.15)" }}>
              <Sparkles className="size-4 text-pink-400" />
            </div>
            {isAbundance && <Check className="size-4 text-pink-400 ml-auto" />}
          </div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Abundance</h3>
          <p className="text-xs text-white/40">Freedom & experience</p>
        </button>
      </div>

      {/* L1 reasons */}
      {selectedPath && (
        <div className="space-y-1">
          <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2 px-1">
            Your reasons
          </p>

          {l1s.map((l1) => {
            const isOn = selectedL1s.has(l1.id)
            const accentHex = isFto ? "#00e676" : "#ff4081"
            return (
              <GoalRow
                key={l1.id}
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
            const accentColor = isFto ? "rgba(0,230,118" : "rgba(255,64,129"
            const accentHex = isFto ? "#00e676" : "#ff4081"
            return (
              <div
                key={cl.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ background: isOn ? `${accentHex}0a` : "transparent" }}
              >
                <button
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
            onClick={() => onAddCustomL1(selectedPath)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
          >
            <Plus className="size-[18px] text-white/20 shrink-0" />
            <span className="text-sm text-white/25">Add your own</span>
          </button>
        </div>
      )}
    </div>
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
