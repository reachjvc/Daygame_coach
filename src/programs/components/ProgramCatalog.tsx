"use client"

/**
 * EVERY PROGRAM YOU COULD START.
 *
 * Thirteen cards in a two-column grid, each with an untappable title and its
 * own orange "View ›" button — 3,384px on a phone, and thirteen oranges
 * competing with each other and with the one button on the screen that
 * actually starts training.
 *
 * Rows now, under discipline tabs, with "All" first so the whole list is one
 * scroll for somebody who does not yet know what they are looking for. The
 * name is the target: the row is.
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgramRow } from "./ProgramRow"
import { TRAINING_CARD } from "./trainingStyles"
import { ALL_PROGRAMS } from "../data/catalog"
import { DISCIPLINES, LEVEL_LABELS } from "../config"
import type { Discipline, ProgramDefinition } from "../types"

interface Props {
  onSelect: (programId: string) => void
}

/** Popularity order, which is the order somebody browsing wants. */
const sorted = (programs: ProgramDefinition[]) =>
  [...programs].sort((a, b) => a.popularityRank - b.popularityRank)

export function ProgramCatalog({ onSelect }: Props) {
  const all = sorted(ALL_PROGRAMS)

  /**
   * Only the disciplines that HAVE a program.
   *
   * Derived rather than listed: `DISCIPLINES` carries every discipline the
   * app knows, and an empty tab is a promise of programs that do not exist.
   */
  const disciplines = [...new Set(all.map((p) => p.discipline))] as Discipline[]
  const [tab, setTab] = useState<string>("all")

  const list = (programs: ProgramDefinition[]) => (
    <Card className={TRAINING_CARD}>
      <CardContent className="divide-y p-0">
        {programs.map((p) => (
          <ProgramRow
            key={p.id}
            name={p.name}
            meta={p.blurb}
            right={
              <Badge variant="secondary">
                {p.levels.map((l) => LEVEL_LABELS[l.id][0]).join("/")}
              </Badge>
            }
            onClick={() => onSelect(p.id)}
            testId={`catalog-${p.id}`}
          />
        ))}
      </CardContent>
    </Card>
  )

  return (
    <Tabs value={tab} onValueChange={setTab}>
      {/* Scrollable rather than wrapped: eight disciplines on two lines push
          the programs below the fold on a phone. */}
      <TabsList className="hide-scrollbar flex h-auto w-full justify-start overflow-x-auto p-1">
        <TabsTrigger value="all" className="h-11 shrink-0 sm:h-8">
          All
        </TabsTrigger>
        {disciplines.map((d) => (
          <TabsTrigger key={d} value={d} className="h-11 shrink-0 sm:h-8">
            {DISCIPLINES[d].label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all" className="mt-3">
        {list(all)}
      </TabsContent>
      {disciplines.map((d) => (
        <TabsContent key={d} value={d} className="mt-3">
          {list(all.filter((p) => p.discipline === d))}
        </TabsContent>
      ))}
    </Tabs>
  )
}
