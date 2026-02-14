"use client"

import { useState } from "react"
import { Loader2, Sparkles, Heart, Flame, Star } from "lucide-react"
import { getCatalogGroups } from "../data/goalGraph"
import { generateGoalTreeInserts } from "../treeGenerationService"
import type { GoalTemplate } from "../types"

interface GoalCatalogPickerProps {
  onTreeCreated: () => void
}

export function GoalCatalogPicker({ onTreeCreated }: GoalCatalogPickerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const groups = getCatalogGroups()

  const handlePick = async (template: GoalTemplate) => {
    if (isCreating) return
    setIsCreating(true)
    setError(null)

    try {
      const inserts = generateGoalTreeInserts(template.id)
      if (inserts.length === 0) {
        setError("Could not generate goal tree")
        setIsCreating(false)
        return
      }

      const response = await fetch("/api/goals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: inserts }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create goals")
      }

      onTreeCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal tree")
      setIsCreating(false)
    }
  }

  if (isCreating) {
    return (
      <div className="text-center py-16">
        <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-1">Building your goal tree...</h3>
        <p className="text-sm text-muted-foreground">
          Setting up achievements, milestones, and tracking goals
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Sparkles className="size-8 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-1">Just get me started</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Pick one goal. We&apos;ll build your full goal tree with milestones,
          achievements, and tracking — all customizable later.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* One Person goals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="size-4 text-pink-500" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Find the one
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.onePerson.map((tmpl) => (
            <GoalPickCard key={tmpl.id} template={tmpl} onPick={handlePick} />
          ))}
        </div>
      </section>

      {/* Abundance goals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="size-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dating abundance
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.abundance.map((tmpl) => (
            <GoalPickCard key={tmpl.id} template={tmpl} onPick={handlePick} />
          ))}
        </div>
      </section>

      {/* Life Dreams */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Star className="size-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Life dreams
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.lifeDreams.map((tmpl) => (
            <GoalPickCard key={tmpl.id} template={tmpl} onPick={handlePick} />
          ))}
        </div>
      </section>
    </div>
  )
}

function GoalPickCard({
  template,
  onPick,
}: {
  template: GoalTemplate
  onPick: (t: GoalTemplate) => void
}) {
  return (
    <button
      onClick={() => onPick(template)}
      className="w-full text-left rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:bg-card/80 hover:shadow-sm cursor-pointer group"
    >
      <span className="font-medium text-sm group-hover:text-primary transition-colors">
        {template.title}
      </span>
    </button>
  )
}
