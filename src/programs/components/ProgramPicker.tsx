"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { programsByDiscipline, requireProgram, resolveProgramForLevel } from "../data/catalog"
import { fromKg, roundToLoadable } from "../programsService"
import { DISCIPLINES, LEVEL_LABELS } from "../config"
import type { Discipline, LevelId, ProgramSelection, UnitSystem } from "../types"

interface Props {
  discipline: Discipline
  value: ProgramSelection | null
  onChange: (selection: ProgramSelection | null) => void
}

// Unique exercises of the program a (programId, level) resolves to + whether it's a 1RM program.
// Non-load programs (endurance) have no per-exercise inputs.
function resolvedExercises(programId: string, level: LevelId) {
  const { program } = resolveProgramForLevel(programId, level)
  if (program.schedule.kind !== "linear_rotation" && program.schedule.kind !== "weekly_waved") {
    return { program, list: [], requires1RM: false }
  }
  const seen = new Map<string, { id: string; name: string; percentage: boolean }>()
  for (const d of program.schedule.days)
    for (const ex of d.exercises)
      if (!seen.has(ex.id)) seen.set(ex.id, { id: ex.id, name: ex.name, percentage: ex.progression.kind === "percentage_tm" })
  const list = [...seen.values()]
  return { program, list, requires1RM: list.some((e) => e.percentage) }
}

function defaultLevel(programId: string): LevelId {
  const p = requireProgram(programId)
  return (p.levels.find((l) => !l.structuralVariantOf)?.id ?? p.levels[0].id)
}

// Build an enrollable selection, or null if it isn't complete enough to enroll.
function buildSelection(programId: string, level: LevelId, unit: UnitSystem, raw: Record<string, string>): ProgramSelection | null {
  const { program, list, requires1RM } = resolvedExercises(programId, level)
  if (program.metricType !== "load") return { programId, level, unitSystem: unit } // endurance: program + level is enough
  if (requires1RM) {
    const oneRepMaxes: Record<string, number> = {}
    for (const ex of list) {
      const n = Number(raw[ex.id])
      if (!raw[ex.id] || !Number.isFinite(n) || n <= 0) return null // need every 1RM before we enroll
      oneRepMaxes[ex.id] = n
    }
    return { programId, level, unitSystem: unit, oneRepMaxes }
  }
  const workingWeights: Record<string, number> = {}
  for (const ex of list) {
    const n = Number(raw[ex.id])
    if (raw[ex.id] && Number.isFinite(n) && n > 0) workingWeights[ex.id] = n
  }
  return { programId, level, unitSystem: unit, ...(Object.keys(workingWeights).length ? { workingWeights } : {}) }
}

export function ProgramPicker({ discipline, value, onChange }: Props) {
  const programs = programsByDiscipline(discipline)
  const [programId, setProgramId] = useState<string | null>(value?.programId ?? null)
  const [level, setLevel] = useState<LevelId>(value?.level ?? "intermediate")
  const [unit, setUnit] = useState<UnitSystem>(value?.unitSystem ?? "kg")
  const [raw, setRaw] = useState<Record<string, string>>({})

  function emit(pId: string | null, lvl: LevelId, u: UnitSystem, r: Record<string, string>) {
    onChange(pId ? buildSelection(pId, lvl, u, r) : null)
  }

  function pickProgram(id: string) {
    if (programId === id) { setProgramId(null); emit(null, level, unit, raw); return }
    const lvl = defaultLevel(id)
    setProgramId(id); setLevel(lvl); setRaw({})
    emit(id, lvl, unit, {})
  }

  const resolved = programId ? resolvedExercises(programId, level) : null
  const routed = resolved && resolved.program.id !== programId

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04] p-3.5">
      <p className="text-[11px] uppercase tracking-wider text-emerald-300/80 mb-0.5">{DISCIPLINES[discipline].label} · Training program</p>
      <p className="text-[13px] text-zinc-400 mb-3">Attach a trackable program — it drives your goals and logs straight to your tracked metrics.</p>

      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        {programs.map((p) => {
          const active = programId === p.id
          return (
            <button
              key={p.id}
              onClick={() => pickProgram(p.id)}
              className={`text-left rounded-lg border px-3 py-2 transition-all ${active ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"}`}
            >
              <span className="flex items-center gap-1.5">
                {active && <Check className="size-3.5 text-emerald-300" />}
                <span className="text-[13px] font-medium text-white">{p.name}</span>
              </span>
              <span className="block text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{p.blurb}</span>
            </button>
          )
        })}
      </div>

      {programId && resolved && (
        <div className="space-y-3 border-t border-white/5 pt-3">
          {/* Level + units */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              {requireProgram(programId).levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLevel(l.id); setRaw({}); emit(programId, l.id, unit, {}) }}
                  className={`text-[12px] px-2.5 py-1 rounded-md transition-all ${level === l.id ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40" : "text-zinc-400 border border-white/10 hover:bg-white/5"}`}
                >
                  {LEVEL_LABELS[l.id]}
                </button>
              ))}
            </div>
            {resolved.program.metricType === "load" && (
              <div className="flex items-center gap-1.5">
                {(["kg", "lb"] as UnitSystem[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => { setUnit(u); setRaw({}); emit(programId, level, u, {}) }}
                    className={`text-[12px] px-2.5 py-1 rounded-md transition-all ${unit === u ? "bg-white/15 text-white" : "text-zinc-400 border border-white/10 hover:bg-white/5"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {routed && (
            <p className="text-[11px] text-amber-400/90">{LEVEL_LABELS[level]} routes to <strong>{resolved.program.name}</strong> — a better fit for this level.</p>
          )}

          {/* Per-lift numbers (load programs only) */}
          {resolved.program.metricType === "load" && (
          <div>
            <p className="text-[12px] text-zinc-400 mb-1.5">
              {resolved.requires1RM ? `Your 1-rep max per lift (${unit}) — required to attach` : `Starting working weight per lift (${unit}) — optional, defaults to ${LEVEL_LABELS[level]}`}
            </p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {resolved.list.map((ex) => {
                const seedKg = resolved.program.levels.find((l) => l.id === level)?.seedWorkingWeightKg?.[ex.id]
                const placeholder = resolved.requires1RM
                  ? "1RM"
                  : seedKg != null ? String(roundToLoadable(fromKg(seedKg, unit), unit)) : "weight"
                return (
                  <label key={ex.id} className="flex items-center gap-2">
                    <span className="w-28 text-[12px] text-zinc-300">{ex.name}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={placeholder}
                      value={raw[ex.id] ?? ""}
                      onChange={(e) => { const r = { ...raw, [ex.id]: e.target.value }; setRaw(r); emit(programId, level, unit, r) }}
                      className="w-20 bg-white/5 border border-white/15 rounded-md px-2 py-1 text-[12px] text-white focus:outline-none focus:border-white/30"
                    />
                  </label>
                )
              })}
            </div>
            {resolved.requires1RM && !value && (
              <p className="text-[11px] text-zinc-500 mt-1.5">Enter all {resolved.list.length} maxes to attach this program.</p>
            )}
          </div>
          )}

          {value && (
            <p className="text-[11px] text-emerald-300/90 flex items-center gap-1"><Check className="size-3" /> Will enroll you on save.</p>
          )}
        </div>
      )}
    </div>
  )
}
