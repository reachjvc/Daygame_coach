"use client"

/**
 * WHAT YOU TRAIN WITH — the settings the app assumed and never asked for.
 *
 * All three columns have existed since 2026-09-07, with their CHECK constraints
 * and a column GRANT, and nothing ever wrote one. The consequences were all
 * over the training screens:
 *
 *   - `weight_unit` was read in exactly one place and always came back the
 *     column default, so "Start a workout now" was in kilograms for everybody.
 *     A lifter who trains in pounds and is not currently on a pounds program had
 *     no way to say so.
 *   - `bar_weight_kg` and `smallest_plate_kg` were read NOWHERE. The engine
 *     snapped every prescription to a 20 kg bar and 1.25 kg plates, and when a
 *     deload hit the floor it printed "this is already the lightest your bar can
 *     be — use a lighter bar", naming a fix the app had no way to accept.
 *
 * The two numbers show what is actually stored rather than sitting empty. Both
 * columns are NOT NULL with defaults of 20 and 1.25, so there is no "unset" to
 * represent — the first version of this card tried to write null for an empty
 * box and got a 500 the screen reported as "Saved.".
 */

import { useState } from "react"
import { Dumbbell, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { DEFAULT_BAR_KG, DEFAULT_PLATE_KG, type TrainingSettings } from "@/src/programs/trainingSettings"

export function TrainingSettingsCard({
  initial,
  onSave,
}: {
  initial: TrainingSettings
  onSave: (settings: TrainingSettings) => Promise<void>
}) {
  const [unit, setUnit] = useState(initial.unit)
  const [bar, setBar] = useState(String(initial.barWeightKg))
  const [plate, setPlate] = useState(String(initial.smallestPlateKg))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * An empty box means "the usual", and the usual is the column default — these
   * columns are NOT NULL, so there is no third state to store. Anything that is
   * not a number falls back the same way rather than being sent for the database
   * to reject.
   */
  const num = (text: string, fallback: number): number => {
    const t = text.trim()
    if (t === "") return fallback
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }

  async function save() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await onSave({
        unit,
        barWeightKg: num(bar, DEFAULT_BAR_KG),
        smallestPlateKg: num(plate, DEFAULT_PLATE_KG),
      })
      setSaved(true)
    } catch (e) {
      /**
       * NEVER A SILENT SUCCESS. The first version of this card said "Saved."
       * over a 500 that wrote nothing — it sent null to two NOT NULL columns —
       * which is the exact failure the rest of this work exists to remove, built
       * fresh. The server's own message is shown, because "could not be saved"
       * does not tell you that your bar has to be under 50 kg.
       */
      setError(e instanceof Error ? e.message : "Those settings could not be saved.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Training
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-muted-foreground">Weights are shown in</Label>
          <div className="mt-1.5 inline-flex overflow-hidden rounded-md border border-border">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                data-testid={`training-unit-${u}`}
                className={`min-h-11 px-4 text-sm transition-colors ${
                  unit === u ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {u === "kg" ? "Kilograms" : "Pounds"}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Everything you have already logged stays as it was — this changes how it is shown.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bar-weight" className="text-muted-foreground">
              Your bar weighs
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="bar-weight"
                data-testid="training-bar-weight"
                inputMode="decimal"
                value={bar}
                onChange={(e) => setBar(e.target.value)}
                placeholder={unit === "kg" ? "20" : "45"}
                className="h-11 w-24 rounded-md border border-border bg-background px-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </div>

          <div>
            <Label htmlFor="smallest-plate" className="text-muted-foreground">
              Smallest plate you own
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="smallest-plate"
                data-testid="training-smallest-plate"
                inputMode="decimal"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder={unit === "kg" ? "1.25" : "2.5"}
                className="h-11 w-24 rounded-md border border-border bg-background px-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Both in kilograms, whichever unit you read — a bar is 0–50 kg and a plate
          0.25–25 kg. Programs round every weight to something you can actually
          load with them.
        </p>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => void save()} disabled={busy} data-testid="training-settings-save">
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
          {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved.</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
