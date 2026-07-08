"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { ALL_PROGRAMS } from "../data/catalog"
import { DISCIPLINES, LEVEL_LABELS } from "../config"
import type { Discipline } from "../types"

interface Props {
  onSelect: (programId: string) => void
}

export function ProgramCatalog({ onSelect }: Props) {
  // Group implemented programs by discipline, popularity-sorted.
  const byDiscipline = new Map<Discipline, typeof ALL_PROGRAMS>()
  for (const p of [...ALL_PROGRAMS].sort((a, b) => a.popularityRank - b.popularityRank)) {
    const arr = byDiscipline.get(p.discipline) ?? []
    arr.push(p)
    byDiscipline.set(p.discipline, arr)
  }

  return (
    <div className="space-y-6">
      {[...byDiscipline.entries()].map(([discipline, programs]) => (
        <div key={discipline}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {DISCIPLINES[discipline].label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {programs.map((p) => {
              const levels = p.levels.map((l) => LEVEL_LABELS[l.id][0]).join("/")
              return (
                <Card key={p.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">{levels}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{p.blurb}</p>
                    <Button size="sm" className="self-start" onClick={() => onSelect(p.id)}>
                      View <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
