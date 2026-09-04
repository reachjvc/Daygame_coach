"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { TodaySessionWidget } from "./TodaySessionWidget"
import { useActiveEnrollments, useEnrollment } from "../hooks/useEnrollment"
import { getProgram } from "../data/catalog"
import { LEVEL_LABELS } from "../config"
import type { ProgramEnrollment } from "../types"

/**
 * Compact embed of the user's active program enrollments with today's session,
 * for the goals page health section. Renders nothing when there are no active
 * enrollments — enrolling happens in the programs catalog, not here.
 */
export function ActiveProgramsPanel() {
  const { enrollments, loading, refresh } = useActiveEnrollments()

  if (loading || enrollments.length === 0) return null

  return (
    <>
      {enrollments.map((e) => (
        <EnrollmentToday key={e.id} enrollment={e} onLogged={refresh} />
      ))}
    </>
  )
}

function EnrollmentToday({ enrollment, onLogged }: { enrollment: ProgramEnrollment; onLogged: () => void }) {
  const { detail, loading, refresh } = useEnrollment(enrollment.id)
  const programName = getProgram(enrollment.program_id)?.name ?? enrollment.program_id

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {programName} · {LEVEL_LABELS[enrollment.level]}
        </span>
        <Link
          href="/programs"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage
        </Link>
      </div>
      {loading || !detail ? (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Loading session…</p>
          </CardContent>
        </Card>
      ) : (
        <TodaySessionWidget
          enrollmentId={enrollment.id}
          prescription={detail.prescription}
          unit={detail.enrollment.unitSystem}
          onLogged={() => {
            refresh()
            onLogged()
          }}
        />
      )}
    </div>
  )
}
