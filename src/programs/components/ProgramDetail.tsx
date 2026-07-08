"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { requireProgram, resolveProgramForLevel } from "../data/catalog"
import { fromKg, roundToLoadable } from "../programsService"
import { LEVEL_LABELS } from "../config"
import type { LevelId, UnitSystem } from "../types"

interface Props {
  programId: string
  onBack: () => void
  onEnrolled: (enrollmentId: string) => void
}

export function ProgramDetail({ programId, onBack, onEnrolled }: Props) {
  const program = requireProgram(programId)
  const [level, setLevel] = useState<LevelId>(program.levels[0].id)
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolve routing (Layer-1): which program a (program, level) actually delivers.
  const resolved = useMemo(() => resolveProgramForLevel(programId, level), [programId, level])
  const routed = resolved.program.id !== programId

  // Unique exercises of the delivered program + whether it's a 1RM (percentage) program.
  const { exercises, requires1RM } = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; percentage: boolean }>()
    const sk = resolved.program.schedule.kind
    if (sk !== "linear_rotation" && sk !== "weekly_waved") return { exercises: [], requires1RM: false }
    for (const d of resolved.program.schedule.days)
      for (const ex of d.exercises)
        if (!seen.has(ex.id))
          seen.set(ex.id, { id: ex.id, name: ex.name, percentage: ex.progression.kind === "percentage_tm" })
    const list = [...seen.values()]
    return { exercises: list, requires1RM: list.some((e) => e.percentage) }
  }, [resolved])

  const levelSeed = resolved.program.levels.find((l) => l.id === resolved.level)

  function defaultFor(id: string): string {
    if (requires1RM) return ""
    const kg = levelSeed?.seedWorkingWeightKg?.[id]
    if (kg == null) return ""
    return String(roundToLoadable(fromKg(kg, unit), unit))
  }

  async function enroll() {
    setSaving(true)
    setError(null)
    try {
      const nums: Record<string, number> = {}
      for (const ex of exercises) {
        const raw = overrides[ex.id] ?? defaultFor(ex.id)
        const n = Number(raw)
        if (!raw || !Number.isFinite(n) || n <= 0) {
          throw new Error(`Enter a ${requires1RM ? "1RM" : "starting weight"} for ${ex.name}`)
        }
        nums[ex.id] = n
      }
      const body = {
        programId,
        level,
        unitSystem: unit,
        ...(requires1RM ? { oneRepMaxes: nums } : { workingWeights: nums }),
      }
      const res = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Enroll failed")
      const { enrollment } = await res.json()
      onEnrolled(enrollment.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4 mr-2" /> All programs
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{program.blurb}</p>
          <p className="text-xs text-muted-foreground">Source: {program.sourceCitation}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level */}
          <div>
            <Label className="mb-1.5 block">Starting level</Label>
            <div className="flex gap-2">
              {program.levels.map((l) => (
                <Button key={l.id} size="sm" variant={level === l.id ? "default" : "outline"} onClick={() => setLevel(l.id)}>
                  {LEVEL_LABELS[l.id]}
                </Button>
              ))}
            </div>
            {routed && (
              <p className="mt-2 text-xs text-amber-600">
                {LEVEL_LABELS[level]} routes to <strong>{resolved.program.name}</strong> — a better fit for this level.
              </p>
            )}
          </div>

          {/* Unit */}
          <div>
            <Label className="mb-1.5 block">Units</Label>
            <div className="flex gap-2">
              {(["kg", "lb"] as UnitSystem[]).map((u) => (
                <Button key={u} size="sm" variant={unit === u ? "default" : "outline"} onClick={() => setUnit(u)}>
                  {u}
                </Button>
              ))}
            </div>
          </div>

          {/* Per-exercise overrides (load programs only) */}
          {exercises.length > 0 && (
          <div>
            <Label className="mb-1.5 block">
              {requires1RM ? `Your 1-rep max per lift (${unit})` : `Starting working weight per lift (${unit})`}
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2">
                  <span className="w-32 text-sm">{ex.name}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={defaultFor(ex.id) || (requires1RM ? "1RM" : "weight")}
                    value={overrides[ex.id] ?? defaultFor(ex.id)}
                    onChange={(e) => setOverrides((o) => ({ ...o, [ex.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={enroll} disabled={saving}>
            {saving ? "Starting…" : `Start ${resolved.program.name}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
