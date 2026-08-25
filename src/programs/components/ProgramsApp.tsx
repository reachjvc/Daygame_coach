"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, Plus, ChevronRight } from "lucide-react"
import { ProgramCatalog } from "./ProgramCatalog"
import { ProgramDetail } from "./ProgramDetail"
import { TodaySessionWidget } from "./TodaySessionWidget"
import { ProgressionView } from "./ProgressionView"
import { EditActiveProgram } from "./EditActiveProgram"
import { useActiveEnrollments, useEnrollment } from "../hooks/useEnrollment"
import { getProgram, requireProgram } from "../data/catalog"
import { effectiveProgram } from "../customize"
import { computePrescription } from "../programsService"
import { LEVEL_LABELS } from "../config"

type View =
  | { mode: "home" }
  | { mode: "browse" }
  | { mode: "detail"; programId: string }
  | { mode: "active"; enrollmentId: string }

export function ProgramsApp() {
  const [view, setView] = useState<View>({ mode: "home" })
  const { enrollments, loading, refresh } = useActiveEnrollments()

  if (view.mode === "browse") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView({ mode: "home" })}>
          ← My programs
        </Button>
        <ProgramCatalog onSelect={(programId) => setView({ mode: "detail", programId })} />
      </div>
    )
  }

  if (view.mode === "detail") {
    return (
      <ProgramDetail
        programId={view.programId}
        onBack={() => setView({ mode: "browse" })}
        onEnrolled={(enrollmentId) => {
          refresh()
          setView({ mode: "active", enrollmentId })
        }}
      />
    )
  }

  if (view.mode === "active") {
    return <ActiveProgram enrollmentId={view.enrollmentId} onExit={() => { refresh(); setView({ mode: "home" }) }} />
  }

  // home
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Programs</h2>
        <Button size="sm" onClick={() => setView({ mode: "browse" })}>
          <Plus className="size-4 mr-1" /> Browse
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Dumbbell className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No active program. Browse the catalog to start one.</p>
            <Button size="sm" onClick={() => setView({ mode: "browse" })}>Browse programs</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <Card key={e.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setView({ mode: "active", enrollmentId: e.id })}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{getProgram(e.program_id)?.name ?? e.program_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {LEVEL_LABELS[e.level]} · {e.unitSystem} · Cycle {e.cursor.cycle} · Week {e.cursor.week}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ActiveProgram({ enrollmentId, onExit }: { enrollmentId: string; onExit: () => void }) {
  const { detail, loading, refresh } = useEnrollment(enrollmentId)
  /** A session the user picked instead of the one the app offered. */
  const [pickedDayId, setPickedDayId] = useState<string | null>(null)

  if (loading || !detail) return <p className="text-sm text-muted-foreground">Loading session…</p>

  /**
   * RECOMPUTED ON THE CLIENT, not fetched.
   *
   * The engine is pure and takes the program and the enrollment, both of which
   * are already here — so showing a different day's session is a function call
   * rather than a round trip. The server still owns what happens on log.
   */
  const program = effectiveProgram(
    requireProgram(detail.enrollment.program_id),
    detail.enrollment.customSchedule
  )
  const days =
    program.schedule.kind === "linear_rotation" || program.schedule.kind === "weekly_waved"
      ? program.schedule.days.map((d) => ({ id: d.id, label: d.label, weekday: d.weekday }))
      : undefined
  const pickedIndex = days?.findIndex((d) => d.id === pickedDayId) ?? -1
  const prescription =
    pickedIndex >= 0
      ? computePrescription(program, {
          ...detail.enrollment,
          cursor: { ...detail.enrollment.cursor, dayIndex: pickedIndex },
        })
      : detail.prescription

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onExit}>← My programs</Button>
      <TodaySessionWidget
        enrollmentId={enrollmentId}
        prescription={prescription}
        unit={detail.enrollment.unitSystem}
        days={days}
        onPickDay={setPickedDayId}
        onLogged={() => {
          setPickedDayId(null)
          refresh()
        }}
      />
      {/* The program is not fixed once it is running — the gym changes, the
          shoulder changes. Weights carry over across an edit. */}
      <EditActiveProgram enrollment={detail.enrollment} onSaved={refresh} />
      <ProgressionView
        enrollmentId={enrollmentId}
        logs={detail.logs}
        onChanged={refresh}
        onUnenrolled={onExit}
      />
    </div>
  )
}
