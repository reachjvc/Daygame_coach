"use client"

/**
 * WRITE YOUR WEEK. One box, in words.
 *
 * WHAT THIS REPLACES: 1,221 lines of tap-to-build — a 21-button lift palette
 * inside every day, 28-px segmented controls, a syntax legend at 11-px grey on
 * grey, and inputs small enough that an iPhone zoomed the page and did not zoom
 * back. It could also be pressed twice: Start stayed enabled forever, and the
 * second press silently PAUSED the copy it had just started, because starting a
 * program of the same discipline ends the one already running.
 *
 * Writing it out is faster than tapping it out for anybody who already knows
 * what their week is, and everybody building their own week does. The parser
 * behind the box has its own suite and is untouched by this screen.
 *
 * THREE THINGS IT REFUSES TO DO QUIETLY:
 *
 *   1. A line it cannot read is named by its LINE NUMBER and Start is off until
 *      it is fixed. Silently dropping a line would lose a lift out of somebody's
 *      week without saying so.
 *   2. A week that matches one already running offers today's session instead of
 *      a second start. Matched on STRUCTURE — day labels and lift names in order
 *      — because the engine moves the weights from the first session on, so a
 *      comparison including them would never match again.
 *   3. Starting asks for a name. Without one every self-built week is "Your own
 *      program", the shared catalogue shell's title, in the live header, in
 *      History and on the card — three weeks in and all of them read the same.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProgramDrafts } from "../hooks/useProgramDrafts"
import { BUILDER_STORAGE_KEY, formatProgramText, parseProgramText } from "../programText"
import { numericWeights } from "../builder"
import { sameWeek } from "../customize"
import { CUSTOM_PROGRAM_ID } from "../data/customProgram"
import { CHIP_ON } from "./trainingStyles"
import type { LoadExercise, ProgramEnrollment, UnitSystem } from "../types"

/** The one line of syntax anybody needs, and it is a caption, not a legend. */
const HELP =
  "3x8 is sets by reps · 3x8-12 is a range · @60 is the starting weight · @bw is bodyweight · a line starting with + pairs it with the one above"

interface Props {
  /** What is running, so a second copy of one of them is not offered. */
  enrollments: readonly ProgramEnrollment[]
  /** A saved week to load, from `?draft=`. */
  draftId?: string | null
  /** Where to send somebody once their week is running. */
  onStarted: (enrollmentId: string) => void
}

/** What the box holds between visits: the text and the unit, nothing else. */
interface Autosave {
  text: string
  unit: UnitSystem
}

/**
 * READ THE AUTOSAVE, INCLUDING THE SHAPE IT USED TO HAVE.
 *
 * The old builder stored `{schedule, unit, weights}` — a whole structured
 * design. Dropping it silently would lose a week somebody left half-written, so
 * it is converted once, through the same formatter the load path uses, and
 * written back as text.
 */
function readAutosave(): Autosave | null {
  try {
    const raw = window.localStorage.getItem(BUILDER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Autosave> & {
      schedule?: Parameters<typeof formatProgramText>[0]
      weights?: Record<string, string>
    }
    const unit: UnitSystem = parsed.unit === "lb" ? "lb" : "kg"
    if (typeof parsed.text === "string") return { text: parsed.text, unit }
    if (parsed.schedule) {
      return { text: formatProgramText(parsed.schedule, parsed.weights ?? {}), unit }
    }
    return null
  } catch {
    // Storage refused or holds something that is not a week. Either way the
    // box starts empty rather than the screen failing to render.
    return null
  }
}

export function BuildYourWeek({ enrollments, draftId = null, onStarted }: Props) {
  const drafts = useProgramDrafts()
  const [text, setText] = useState("")
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  /** The name dialog: what it will do, what is typed, and why it cannot save. */
  const [naming, setNaming] = useState<
    { action: "start" | "save" | "saveAsNew"; value: string; problem: string | null } | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [started, setStarted] = useState<{ id: string; name: string; displaced: string[] } | null>(null)

  // The box reopens on whatever was being written, which is the whole reason
  // the old builder's design was stored at all.
  useEffect(() => {
    const saved = readAutosave()
    if (saved) {
      setText(saved.text)
      setUnit(saved.unit)
    }
    setReady(true)
  }, [])

  /** A saved week asked for by address, loaded back into the box as text. */
  useEffect(() => {
    if (!draftId) return
    const draft = drafts.drafts.find((d) => d.id === draftId)
    if (!draft) return
    setText(
      formatProgramText(
        draft.schedule,
        Object.fromEntries(Object.entries(draft.workingWeights ?? {}).map(([k, v]) => [k, String(v)]))
      )
    )
    setUnit(draft.unitSystem)
    setLoadedId(draft.id)
    setNaming(null)
  }, [draftId, drafts.drafts])

  useEffect(() => {
    // NOT AFTER IT HAS STARTED. Emptying the box to disarm Start is itself a
    // change, so this effect ran once more and wrote `{"text":""}` back over
    // the key the start had just removed — leaving a cleared autosave that was
    // not actually cleared.
    if (!ready || started) return
    try {
      window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify({ text, unit }))
    } catch {
      // Nothing to do and nothing worth saying: the week is on screen, and the
      // account is where it goes when it is saved.
    }
  }, [text, unit, ready, started])

  const parsed = useMemo(() => parseProgramText(text), [text])
  const days = parsed.schedule.kind === "endurance_weeks" ? [] : parsed.schedule.days
  const written = days.length > 0
  const blocked = parsed.problems.length > 0

  /**
   * ALREADY RUNNING, decided by structure. See the header: a text comparison
   * stops matching the moment the engine moves a weight.
   */
  const already = useMemo(
    () =>
      enrollments.find(
        (e) =>
          e.program_id === CUSTOM_PROGRAM_ID &&
          e.customSchedule != null &&
          sameWeek(parsed.schedule, e.customSchedule)
      ) ?? null,
    [enrollments, parsed.schedule]
  )

  const loadedDraft = loadedId ? drafts.drafts.find((d) => d.id === loadedId) : undefined

  function ask(action: "start" | "save" | "saveAsNew") {
    setFailure(null)
    setNaming({
      action,
      value: action === "saveAsNew" ? "" : loadedDraft?.name ?? "",
      problem: null,
    })
  }

  async function confirmName() {
    if (!naming) return
    const name = naming.value.trim()
    // The refusal is READ. `enrollInProgram` falls back to the catalogue
    // shell's name when there is none, which is how three different weeks came
    // to be called "Your own program".
    if (!name) {
      setNaming({ ...naming, problem: "Give this week a name" })
      return
    }
    const { action } = naming
    setBusy(true)
    setFailure(null)

    const body = {
      name,
      unitSystem: unit,
      schedule: parsed.schedule,
      workingWeights: numericWeights(parsed.weights),
    }

    const out =
      action === "start"
        ? await drafts.startCustomWeek({
            programId: CUSTOM_PROGRAM_ID,
            level: "intermediate",
            unitSystem: unit,
            workingWeights: numericWeights(parsed.weights),
            customSchedule: parsed.schedule,
            label: name,
          })
        : action === "save" && loadedId
          ? await drafts.updateDraft(loadedId, body)
          : await drafts.saveDraft(body)

    setBusy(false)
    if (!out.ok) {
      setNaming(null)
      setFailure(out.error)
      return
    }
    setNaming(null)

    if (action === "start") {
      const value = out.value as { enrollment: { id: string }; displaced?: { label?: string | null }[] }
      // The box is emptied, so Start cannot fire twice — the second press used
      // to pause the copy it had just started.
      setText("")
      try {
        window.localStorage.removeItem(BUILDER_STORAGE_KEY)
      } catch {
        /* Storage refused; the box is empty either way. */
      }
      setStarted({
        id: value.enrollment.id,
        name,
        displaced: (value.displaced ?? []).map((d) => d.label ?? "a program").filter(Boolean),
      })
      return
    }
    setLoadedId((out.value as { id: string }).id)
  }

  if (started) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-base font-semibold">
          {started.name} is running.
        </p>
        {started.displaced.map((name) => (
          <p key={name} className="text-sm text-muted-foreground">
            {name} moved to your finished programs — everything it logged is kept.
          </p>
        ))}
        <Button onClick={() => onStarted(started.id)}>Go to today&apos;s session</Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Build your own week</h1>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Weights in</span>
        {(["kg", "lb"] as UnitSystem[]).map((u) => (
          <Button
            key={u}
            size="sm"
            variant="outline"
            aria-pressed={unit === u}
            className={unit === u ? CHIP_ON : undefined}
            onClick={() => setUnit(u)}
          >
            {u}
          </Button>
        ))}
      </div>

      <Textarea
        className="min-h-[240px] font-mono text-base"
        aria-label="Write your week"
        data-testid="week-text"
        placeholder={"Push\nBench Press 3x8 @60\nOverhead Press 3x8 @35\n\nPull\nBarbell Row 3x8 @50"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{HELP}</p>

      {parsed.problems.length > 0 && (
        <ul className="space-y-1" data-testid="week-problems">
          {parsed.problems.map((problem) => (
            <li key={`${problem.line}-${problem.reason}`} className="text-sm text-destructive">
              Line {problem.line} — {problem.reason}
            </li>
          ))}
        </ul>
      )}

      {written && (
        <ul className="space-y-1" data-testid="week-readback">
          {days.map((day) => (
            <li key={day.id} className="text-sm">
              <span className="font-medium">{day.label}</span>
              {" — "}
              <span className="text-muted-foreground">
                {day.exercises
                  .map((ex) => {
                    const e = ex as LoadExercise
                    const scheme = e.scheme
                    const reps =
                      scheme.kind === "rep_range"
                        ? `${scheme.sets}×${scheme.repMin}–${scheme.repMax}`
                        : scheme.kind === "percentage_tm"
                          ? "the program's wave"
                          : `${scheme.sets}×${scheme.reps}`
                    /**
                     * "@0" is true and reads as zero kilos, so a bodyweight
                     * lift reads back in the word it was written in.
                     *
                     * COMPARED AS TEXT, not through `Number()`. `Number("")` is
                     * 0 and 0 means bodyweight here, so a blank would have read
                     * back as "@bw" — the app answering a question nobody
                     * answered. Only an explicit zero is bodyweight.
                     */
                    const weight = (parsed.weights[e.id] ?? "").trim()
                    const load = weight === "" ? "" : weight === "0" ? " @bw" : ` @${weight}`
                    return `${e.name} ${reps}${load}`
                  })
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {failure && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {failure}
        </p>
      )}

      {already ? (
        /* Not a second Start. Starting a program of the same discipline ends
           the one already running, so the old screen's enabled Start silently
           paused the very week it had just started. */
        <Button asChild size="lg" className="w-full" data-testid="week-already-running">
          <Link href={`/programs?program=${already.id}`}>Already running — go to today&apos;s session</Link>
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          data-testid="week-start"
          disabled={!written || blocked || busy}
          onClick={() => ask("start")}
        >
          Start tracking this
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="week-save"
          disabled={!written || busy}
          onClick={() => ask("save")}
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-40"
        >
          {loadedId ? "Save changes" : "Save for later"}
        </button>
        {loadedId && (
          <button
            type="button"
            data-testid="week-save-as-new"
            disabled={busy}
            onClick={() => ask("saveAsNew")}
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
          >
            Save as new
          </button>
        )}
      </div>

      <Dialog open={naming !== null} onOpenChange={(next) => !next && setNaming(null)}>
        <DialogContent data-testid="week-name-dialog">
          <DialogHeader>
            <DialogTitle>Name this week</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="week-name">Name</Label>
            <Input
              id="week-name"
              autoFocus
              value={naming?.value ?? ""}
              placeholder="Winter block, Push/Pull, 5 days…"
              onChange={(e) =>
                setNaming((was) => (was ? { ...was, value: e.target.value, problem: null } : was))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void confirmName()
                }
              }}
            />
            {naming?.problem && (
              <p role="alert" className="text-sm text-destructive">
                {naming.problem}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNaming(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmName()} disabled={busy} data-testid="week-name-save">
              {naming?.action === "start" ? "Start tracking this" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
