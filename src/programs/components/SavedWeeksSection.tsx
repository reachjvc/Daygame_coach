"use client"

/**
 * THE WEEKS YOU SAVED, WHERE THE PROGRAMS ARE.
 *
 * They were listed inside Life Mastery's builder — a screen behind a mode
 * switch, on a step most people never opened. It had its own 32-px delete
 * square beside the kit's controls, no Start at all, and
 * `POST /api/programs/drafts/[id]/start` had never had a caller on any screen:
 * the one thing a saved week is FOR could not be done to one.
 *
 * A row, the same row every other list of programs uses, with the two things
 * you can do to a saved week behind its ⋮.
 */

import { useState } from "react"
import { AlertTriangle, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { ProgramRow } from "./ProgramRow"
import { TRAINING_CARD } from "./trainingStyles"
import { useProgramDrafts } from "../hooks/useProgramDrafts"
import { scheduleDaysOrNone } from "../customize"
import type { ProgramDraft } from "../types"

/** "2 days · 4 lifts", from the week itself rather than from a stored count. */
function describeDraft(draft: ProgramDraft): string {
  const days = scheduleDaysOrNone(draft.schedule)
  const lifts = days.reduce((n, d) => n + d.exercises.length, 0)
  return `${days.length} ${days.length === 1 ? "day" : "days"} · ${lifts} ${lifts === 1 ? "lift" : "lifts"} (saved)`
}

export function SavedWeeksSection({
  onOpen,
  onStarted,
}: {
  onOpen: (draftId: string) => void
  onStarted: (enrollmentId: string) => void
}) {
  const drafts = useProgramDrafts()
  const [menu, setMenu] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ProgramDraft | null>(null)
  /** Which row is mid-action, so two taps cannot start the same week twice. */
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  /**
   * A FAILED READ IS NOT "YOU HAVE SAVED NOTHING" — and it is independent of
   * the sections around it, so a drafts request that fell over does not make
   * the running programs above look broken too.
   */
  if (drafts.error) {
    return (
      <div
        role="alert"
        data-testid="saved-weeks-unavailable"
        className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"
      >
        <span className="flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {drafts.error}
        </span>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => void drafts.refresh()}>
          Try again
        </Button>
      </div>
    )
  }

  // Nothing saved is not worth a heading and an empty box.
  if (drafts.loading || drafts.drafts.length === 0) return null

  async function start(draft: ProgramDraft) {
    setBusy(draft.id)
    setFailure(null)
    const out = await drafts.startDraft(draft.id)
    setBusy(null)
    if (!out.ok) {
      // The server names the day that is still empty; saving is permissive and
      // starting is not, and that refusal is the useful half.
      setFailure(out.error)
      return
    }
    onStarted(out.value.enrollment.id)
  }

  async function remove(draft: ProgramDraft) {
    setBusy(draft.id)
    setFailure(null)
    const out = await drafts.deleteDraft(draft.id)
    setBusy(null)
    setDeleting(null)
    if (!out.ok) setFailure(out.error)
  }

  return (
    <div className="space-y-2" data-testid="saved-weeks">
      <h2 className="text-sm font-medium text-muted-foreground">Weeks you wrote</h2>

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      <Card className={TRAINING_CARD}>
        <CardContent className="divide-y p-0">
          {drafts.drafts.map((draft) => (
            <ProgramRow
              key={draft.id}
              name={draft.name}
              meta={describeDraft(draft)}
              testId={`saved-week-${draft.id}`}
              onClick={() => onOpen(draft.id)}
              right={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Options for ${draft.name}`}
                  data-testid={`saved-week-menu-${draft.id}`}
                  disabled={busy === draft.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setMenu(draft.id)
                  }}
                >
                  <MoreVertical className="size-5" />
                </Button>
              }
            />
          ))}
        </CardContent>
      </Card>

      {drafts.drafts.map((draft) => (
        <BottomSheet
          key={draft.id}
          open={menu === draft.id}
          onClose={() => setMenu(null)}
          title={draft.name}
          testId="saved-week-sheet"
        >
          <SheetRow
            testId="saved-week-start"
            onClick={() => {
              setMenu(null)
              void start(draft)
            }}
          >
            Start this week
          </SheetRow>
          <SheetRow
            testId="saved-week-open"
            onClick={() => {
              setMenu(null)
              onOpen(draft.id)
            }}
          >
            Open it in the box
          </SheetRow>
          <SheetRow
            testId="saved-week-delete"
            destructive
            onClick={() => {
              setMenu(null)
              setDeleting(draft)
            }}
          >
            Delete
          </SheetRow>
        </BottomSheet>
      ))}

      <Dialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <DialogContent data-testid="saved-week-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
          </DialogHeader>
          {/* SAY WHAT IS NOT LOST. A saved week and the sessions logged against
              a program started from it are different things, and somebody about
              to delete one has every reason to fear the other goes with it. */}
          <p className="text-sm text-muted-foreground">
            Nothing you have logged is touched.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              data-testid="saved-week-delete-confirm"
              disabled={busy !== null}
              onClick={() => deleting && void remove(deleting)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
