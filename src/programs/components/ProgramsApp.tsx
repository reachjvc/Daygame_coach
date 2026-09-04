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
import { RunningPrograms } from "./RunningPrograms"
import { PastPrograms } from "./PastPrograms"
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

  /**
   * ONE PROGRAM MEANS NO CHOICE TO MAKE, so do not ask for one.
   *
   * The page opened on a list headed "My Programs" containing a single card you
   * had to click to reach today's session — a menu of one, in front of the only
   * thing you came for. With two or more the list is the point and it stays.
   */
  if (view.mode === "home" && !loading && enrollments.length === 1) {
    return <ActiveProgram enrollmentId={enrollments[0].id} onExit={() => { refresh(); setView({ mode: "browse" }) }} />
  }

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
      {/* Every program the account is on, with when it started and a way to end
          it. Enrollments only deactivate within a discipline, so one from
          months ago keeps prescribing sessions until somebody stops it — and
          until now nothing on any screen said it was there. */}
      <RunningPrograms tone="app" onEnded={refresh} />

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
      {/* NAME THE PROGRAM. The header said "Today — Upper · Cycle 1 · Week 1"
          and never once said which program that was, which is how somebody
          ends up staring at a session they do not recognise with no way to
          find out where it came from. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onExit}>← My programs</Button>
        <span className="text-xs text-muted-foreground" data-testid="active-program-name">
          {getProgram(detail.enrollment.program_id)?.name ?? detail.enrollment.program_id}
          {" · "}
          {LEVEL_LABELS[detail.enrollment.level]}
          {" · started "}
          {new Date(detail.enrollment.started_at).toLocaleDateString()}
        </span>
      </div>
      <TodaySessionWidget
        enrollmentId={enrollmentId}
        prescription={prescription}
        unit={detail.enrollment.unitSystem}
        logs={detail.logs}
        /* Both paths reuse controls that already exist — `unenroll` archives and
           keeps the sessions, `reset` rewinds the cursor and keeps the weights.
           Neither is a new concept invented for finishing. */
        onFinish={async (choice) => {
          if (choice === "archive") {
            await fetch(`/api/programs/enrollments/${enrollmentId}`, { method: "DELETE" })
            onExit()
            return
          }
          await fetch(`/api/programs/enrollments/${enrollmentId}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          })
          refresh()
        }}
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
        enrollment={detail.enrollment}
        onChanged={refresh}
        onUnenrolled={onExit}
      />
      <PastPrograms />
    </div>
  )
}
