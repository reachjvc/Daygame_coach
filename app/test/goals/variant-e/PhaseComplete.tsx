"use client"

import { useEffect, useState } from "react"
import { Check, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GOAL_TEMPLATES } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"

interface PhaseCompleteProps {
  selectedTemplateIds: Set<string>
  selectedLifeAreas: string[]
  onStartOver: () => void
}

export function PhaseComplete({
  selectedTemplateIds,
  selectedLifeAreas,
  onStartOver,
}: PhaseCompleteProps) {
  const [showCheck, setShowCheck] = useState(false)
  const [showGoals, setShowGoals] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowCheck(true), 300)
    const t2 = setTimeout(() => setShowGoals(true), 800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const selectedTemplates = GOAL_TEMPLATES.filter(t => selectedTemplateIds.has(t.id))
  const l1Goals = selectedTemplates.filter(t => t.level === 1)
  const l2Goals = selectedTemplates.filter(t => t.level === 2)
  const l3Goals = selectedTemplates.filter(t => t.level === 3)

  return (
    <div className="max-w-2xl mx-auto px-4 text-center">
      {/* Success animation */}
      <div
        className="mb-8 transition-all duration-700"
        style={{
          opacity: showCheck ? 1 : 0,
          transform: `scale(${showCheck ? 1 : 0.5})`,
        }}
      >
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
          <div className="relative rounded-full bg-green-500/10 border border-green-500/20 p-6">
            <Check className="size-12 text-green-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Your journey is mapped
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {selectedTemplateIds.size} goals created based on your unique situation.
          In a production app, these would be saved and ready to track.
        </p>
      </div>

      {/* Goal summary */}
      <div
        className="text-left space-y-4 transition-all duration-700"
        style={{
          opacity: showGoals ? 1 : 0,
          transform: `translateY(${showGoals ? 0 : 20}px)`,
        }}
      >
        {l1Goals.length > 0 && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">North Star</p>
            {l1Goals.map(g => (
              <p key={g.id} className="text-sm font-medium">{g.title}</p>
            ))}
          </div>
        )}

        {l2Goals.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
              Transformations ({l2Goals.length})
            </p>
            <div className="space-y-1">
              {l2Goals.map(g => (
                <p key={g.id} className="text-sm text-muted-foreground">{g.title}</p>
              ))}
            </div>
          </div>
        )}

        {l3Goals.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">
              Daily Actions ({l3Goals.length})
            </p>
            <div className="grid grid-cols-2 gap-1">
              {l3Goals.map(g => (
                <p key={g.id} className="text-sm text-muted-foreground">{g.title}</p>
              ))}
            </div>
          </div>
        )}

        {selectedLifeAreas.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-white/2 p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Additional Life Areas
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedLifeAreas.map(areaId => {
                const area = LIFE_AREAS.find(a => a.id === areaId)
                if (!area) return null
                return (
                  <span
                    key={areaId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${area.hex}15`,
                      color: area.hex,
                    }}
                  >
                    <area.icon className="size-3" />
                    {area.name}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-xs text-muted-foreground/50">
          This is a prototype. In production, goals would save to your account.
        </p>
        <Button
          onClick={onStartOver}
          variant="outline"
          className="rounded-xl"
          data-testid="journey-restart"
        >
          <Rocket className="size-4 mr-2" />
          Try a different path
        </Button>
      </div>
    </div>
  )
}
