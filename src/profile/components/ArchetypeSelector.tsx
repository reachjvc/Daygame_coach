"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getArchetypes } from "@/src/profile/data/archetypes"
import { updateArchetypes } from "@/src/profile/actions"

interface ArchetypeSelectorProps {
  ageRangeStart: number
  ageRangeEnd: number
  initialArchetype?: string | null
  initialSecondaryArchetype?: string | null
  initialTertiaryArchetype?: string | null
  region?: string
}

const getArchetypePriorityLabel = (index: number) => {
  switch (index) {
    case 0:
      return "Primary"
    case 1:
      return "Secondary"
    default:
      return "Tertiary"
  }
}

const getArchetypeBadgeClasses = (index: number) => {
  if (index === 0) {
    return "bg-gradient-to-r from-primary to-orange-400 text-primary-foreground shadow-sm ring-1 ring-primary/40"
  }
  if (index === 1) {
    return "bg-primary/15 text-primary ring-1 ring-primary/30"
  }
  return "bg-primary/10 text-primary/70 ring-1 ring-primary/20"
}

export function ArchetypeSelector({
  ageRangeStart,
  ageRangeEnd,
  initialArchetype,
  initialSecondaryArchetype,
  initialTertiaryArchetype,
  region,
}: ArchetypeSelectorProps) {
  const ageRange = useMemo(() => [ageRangeStart, ageRangeEnd], [ageRangeStart, ageRangeEnd])
  const archetypes = useMemo(() => getArchetypes(ageRange, region), [ageRange, region])
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>(() =>
    [initialArchetype, initialSecondaryArchetype, initialTertiaryArchetype].filter(
      (name): name is string => Boolean(name)
    )
  )

  const handleArchetypeToggle = (archetypeName: string) => {
    setSelectedArchetypes((prev) => {
      if (prev.includes(archetypeName)) {
        return prev.filter((name) => name !== archetypeName)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, archetypeName]
    })
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <Card className="p-8 bg-card border-border">
          <div className="flex items-center gap-3 mb-4">
            <Target className="size-8 text-primary" />
            <div>
              <h2 className="text-3xl font-bold text-foreground">Choose your archetypes</h2>
              <p className="text-sm text-muted-foreground">
                Pick up to three. The order sets your priority.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{selectedArchetypes.length}/3 selected</span>
            <span>Click again to remove.</span>
            {selectedArchetypes.length === 3 && (
              <span className="text-primary">Max 3 selected.</span>
            )}
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-8 max-h-[700px] overflow-y-auto pr-2">
            {archetypes.map((archetype) => {
              const priorityIndex = selectedArchetypes.indexOf(archetype.name)
              const isSelected = priorityIndex !== -1
              const badgeLabel = isSelected ? getArchetypePriorityLabel(priorityIndex) : null
              return (
                <Card
                  key={archetype.name}
                  className={`relative p-6 cursor-pointer transition-all hover:border-primary hover:shadow-lg ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => handleArchetypeToggle(archetype.name)}
                >
                  {badgeLabel && (
                    <div className="absolute right-4 top-4">
                      <Badge className={getArchetypeBadgeClasses(priorityIndex)}>
                        {badgeLabel}
                      </Badge>
                    </div>
                  )}
                  {archetype.image && (
                    <img
                      src={archetype.image}
                      alt={archetype.name}
                      className="w-full h-80 object-cover object-top rounded-lg mb-5"
                    />
                  )}
                  <h3 className="font-bold text-xl mb-3 text-foreground">{archetype.name}</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">CORE VIBE</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {archetype.vibe}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">CONVERSATIONAL BARRIER</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {archetype.barrier}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm" className="border-border bg-transparent">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <form action={updateArchetypes} className="flex items-center gap-2">
              <input type="hidden" name="archetype" value={selectedArchetypes[0] || ""} />
              <input type="hidden" name="secondaryArchetype" value={selectedArchetypes[1] || ""} />
              <input type="hidden" name="tertiaryArchetype" value={selectedArchetypes[2] || ""} />
              <Button type="submit" size="sm" disabled={selectedArchetypes.length === 0}>
                Save archetypes
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
