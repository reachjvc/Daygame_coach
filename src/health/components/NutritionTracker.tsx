"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import type { NutritionLogRow, NutritionQuality, NutritionStats } from "../types"
import { computeNutritionStats } from "../healthService"

export function NutritionTracker() {
  const [logs, setLogs] = useState<NutritionLogRow[]>([])
  const [stats, setStats] = useState<NutritionStats | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [qualityScore, setQualityScore] = useState<NutritionQuality>(3)
  const [note, setNote] = useState("")
  const [proteinG, setProteinG] = useState("")
  const [calories, setCalories] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/health/nutrition?days=30")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: NutritionLogRow[] = await res.json()
      setLogs(data)
      setStats(computeNutritionStats(data, 150))
    } catch (e) {
      console.error("Error fetching nutrition logs:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSubmit = async () => {
    if (!note.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/health/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quality_score: qualityScore,
          note: note.trim(),
          protein_g: proteinG ? parseFloat(proteinG) : null,
          calories: calories ? parseInt(calories) : null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setQualityScore(3)
      setNote("")
      setProteinG("")
      setCalories("")
      setIsAdding(false)
      await fetchLogs()
    } catch (e) {
      console.error("Error saving nutrition:", e)
    } finally {
      setIsSaving(false)
    }
  }

  const qualityLabels: Record<NutritionQuality, string> = {
    1: "Terrible", 2: "Poor", 3: "OK", 4: "Good", 5: "Excellent",
  }

  const qualityColors: Record<NutritionQuality, string> = {
    1: "bg-red-500", 2: "bg-orange-500", 3: "bg-amber-500", 4: "bg-green-400", 5: "bg-green-500",
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Nutrition</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nutrition</span>
          <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        {stats?.weeklyQualityAvg !== null && stats && (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.weeklyQualityAvg!.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Weekly avg quality</div>
            </div>
            {stats.proteinHitRate !== null && (
              <div>
                <div className="text-2xl font-bold">{stats.proteinHitRate}%</div>
                <div className="text-xs text-muted-foreground">Protein target hit</div>
              </div>
            )}
          </div>
        )}

        {logs.length === 0 && !isAdding && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No nutrition data yet</p>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log your eating
            </Button>
          </div>
        )}

        {/* Input form */}
        {isAdding && (
          <div className="space-y-3 border rounded-lg p-3">
            <div>
              <Label>Eating quality today</Label>
              <div className="flex gap-1 mt-1">
                {([1, 2, 3, 4, 5] as NutritionQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQualityScore(q)}
                    className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                      qualityScore === q
                        ? "bg-green-500/20 border-green-500/40 text-green-400"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">{qualityLabels[qualityScore]}</p>
            </div>
            <div>
              <Label htmlFor="note">What did you eat? (required)</Label>
              <Input
                id="note"
                placeholder="e.g. Chicken, rice, veggies. Protein shake post-gym."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Context matters — &quot;pizza after rejection spiral&quot; ≠ &quot;pizza at planned date&quot;
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  placeholder="150"
                  value={proteinG}
                  onChange={(e) => setProteinG(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  placeholder="2000"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isSaving || !note.trim()}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Quality trend chart */}
        {stats && stats.entries.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Quality trend (30 days)</div>
            <div className="h-20 flex items-end gap-0.5">
              {stats.entries.slice(-30).map((entry, i) => {
                const height = (entry.quality / 5) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${entry.date}: ${entry.quality}/5 — ${entry.note}`}
                  >
                    <div
                      className={`w-full rounded-t ${qualityColors[entry.quality]} opacity-70`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent entries */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase">Recent</div>
            {logs.slice(-5).reverse().map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-sm py-1">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-xs text-white font-medium mt-0.5 ${qualityColors[log.quality_score as NutritionQuality]}`}>
                  {log.quality_score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-muted-foreground truncate">{log.note}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.logged_at).toLocaleDateString()}
                    {log.protein_g !== null && ` · ${log.protein_g}g protein`}
                    {log.calories !== null && ` · ${log.calories} kcal`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
