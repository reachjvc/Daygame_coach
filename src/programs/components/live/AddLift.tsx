"use client"

/**
 * Adding a lift you did not plan, in the middle of a workout.
 *
 * WHY IT HAS TO EXIST. A workout screen that can only record what was
 * prescribed is a screen that punishes you for the gym being busy. The squat
 * rack is taken, you do front squats instead, and the app has nowhere to put
 * them — so either the session is logged wrong or it is not logged at all.
 *
 * It is also the whole of an unplanned workout: starting one with no program
 * attached gives you an empty screen, and this is what fills it.
 *
 * The lift is remembered on the workout itself, in `adjustments.added`, so it
 * survives the phone locking and comes back on a reload like everything else.
 */

import { useState } from "react"
import { Plus, Search, X } from "lucide-react"
import { addedLiftId } from "../../programsService"
import { searchLibrary } from "../../data/exerciseLibrary"
import type { LibraryExercise } from "../../types"

interface Props {
  /** Lifts already on this screen, so the same one is not offered twice. */
  alreadyHere: string[]
  onAdd: (entry: { exerciseId: string; name: string; libraryId?: string }) => void
  /**
   * ALREADY OPEN, for the lift menu's "Swap this lift".
   *
   * Tapping "Swap this lift" used to reveal a button reading "Add a lift" —
   * the search's own closed state, inside a sheet whose heading already said
   * what was happening. Two taps to reach a box that should have been focused
   * already, labelled as the wrong action. When the sheet IS the search, the
   * search is open.
   */
  startOpen?: boolean
  /** Where the X goes when the search is the sheet's whole content. */
  onCancel?: () => void
}


export function AddLift({ alreadyHere, onAdd, startOpen = false, onCancel }: Props) {
  const [open, setOpen] = useState(startOpen)
  const [query, setQuery] = useState("")

  const here = new Set(alreadyHere.map((n) => n.toLowerCase()))
  const results: LibraryExercise[] = query.trim()
    ? searchLibrary(query, 8).filter((e) => !here.has(e.name.toLowerCase()))
    : []

  function add(name: string, libraryId?: string) {
    /**
     * REFUSED IF IT IS ALREADY HERE.
     *
     * The search results were filtered by what is on screen, and the free-text
     * fallback then asked whether the typed name was missing FROM THOSE RESULTS
     * — so the guard was bypassed precisely when the lift was already there.
     * Typing "Squat" on a day that prescribes Squat offered "add Squat as your
     * own lift", and adding the same name twice produced two cards sharing one
     * id, where ticking set 1 on the second overwrote set 1 on the first. Sets
     * vanished as they were entered.
     */
    if (here.has(name.trim().toLowerCase())) {
      setQuery("")
      setOpen(false)
      return
    }
    onAdd({ exerciseId: addedLiftId(name), name: name.trim(), libraryId })
    setQuery("")
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        data-testid="add-lift"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-4" /> Add a lift
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Which lift?"
          aria-label="Search for a lift to add"
          data-testid="add-lift-search"
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm sm:h-9"
        />
        <button
          type="button"
          onClick={() => {
            setQuery("")
            // Back to the menu when this search IS the sheet; back to the
            // "Add a lift" button when it is the row on the screen.
            if (onCancel) onCancel()
            else setOpen(false)
          }}
          aria-label="Stop adding a lift"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent sm:size-9"
        >
          <X className="size-4" />
        </button>
      </div>

      {results.length > 0 && (
        <ul className="space-y-1" data-testid="add-lift-results">
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => add(e.name, e.id)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-border px-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="truncate">{e.name}</span>
                <span className="shrink-0 text-xs capitalize text-muted-foreground">{e.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/**
       * A LIFT THE LIBRARY HAS NEVER HEARD OF IS STILL A LIFT YOU DID. The
       * catalogue is 165 entries and somebody's gym has a machine that is not
       * in it. Refusing the name would mean the session goes unrecorded.
       *
       * It is saved under the name typed and nothing else. The builder asks
       * which body part an invented lift belongs to; at a rack, mid-set, that
       * is friction — and answering it for them would be the app inventing a
       * fact about somebody's training.
       */}
      {query.trim().length > 1 &&
        !here.has(query.trim().toLowerCase()) &&
        !results.some((e) => e.name.toLowerCase() === query.trim().toLowerCase()) && (
        <button
          type="button"
          data-testid="add-lift-own"
          onClick={() => add(query.trim())}
          className="flex min-h-11 w-full items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">Add &ldquo;{query.trim()}&rdquo; as your own lift</span>
        </button>
      )}
    </div>
  )
}
