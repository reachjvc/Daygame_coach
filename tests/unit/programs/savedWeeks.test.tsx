/**
 * LOADING A SAVED WEEK, AND SAVING BACK TO IT.
 *
 * Three faults, all the same shape: the screen did not know which week it was
 * showing.
 *
 * Loading a week replaced the design and left the name box empty, so Save was
 * disabled on a week you had just opened. Typing the name back in by hand was
 * the only way to save an edit — and then Save matched on the TYPED NAME, so
 * correcting "Monday Push" to "Monday push" made a SECOND week under the
 * near-duplicate rather than updating the one on screen. Nothing said which of
 * the two you were looking at.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SavedWeeks } from "@/src/programs/components/SavedWeeks"
import type { ProgramSchedule } from "@/src/programs/types"

const WEEK: ProgramSchedule = {
  kind: "linear_rotation",
  days: [
    {
      id: "d1",
      label: "Monday Push",
      exercises: [
        {
          id: "lib_bench_press",
          name: "Bench Press",
          metricType: "load",
          scheme: { kind: "linear", sets: 5, reps: 5 },
          progression: {
            kind: "linear_load",
            incrementKg: 2.5,
            incrementLb: 5,
            deloadAfterFails: 3,
            deloadPct: 0.1,
          },
        },
      ],
    },
  ],
}

const DRAFT = {
  id: "draft-1",
  name: "Monday Push",
  schedule: WEEK,
  unitSystem: "kg" as const,
  workingWeights: { lib_bench_press: 60 },
}

/** Serves the drafts list and records every write. */
function server() {
  const writes: { url: string; method: string; body: Record<string, unknown> }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method && init.method !== "GET") {
        writes.push({ url: String(url), method: init.method, body: JSON.parse(String(init.body ?? "{}")) })
        return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => [DRAFT] } as unknown as Response
    })
  )
  return writes
}

function saved(over: { loadedId?: string | null; loadedName?: string; weights?: Record<string, string> } = {}) {
  const onLoad = vi.fn()
  render(
    <SavedWeeks
      schedule={WEEK}
      unit="kg"
      weights={over.weights ?? { lib_bench_press: "60" }}
      onLoad={onLoad}
      loadedId={over.loadedId ?? null}
      loadedName={over.loadedName ?? ""}
    />
  )
  return { onLoad }
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe("loading a saved week", () => {
  it("hands back which week it is, not just its contents", async () => {
    const user = userEvent.setup()
    server()
    const { onLoad } = saved()

    // Its accessible name comes from its contents (the week's name and its
    // counts), not from the title attribute.
    const row = await screen.findByTestId("saved-weeks-list")
    await user.click(row.querySelector("button")!)

    // The id is the half that was missing: without it, Save had to guess from
    // the typed name.
    expect(onLoad).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: "draft-1", name: "Monday Push" })
    )
  })

  it("fills the name box, so Save is not disabled on a week you just opened", async () => {
    server()
    saved({ loadedId: "draft-1", loadedName: "Monday Push" })

    const box = (await screen.findByLabelText(/name for the week/i)) as HTMLInputElement
    await waitFor(() => expect(box.value).toBe("Monday Push"))
    expect(screen.getByRole("button", { name: /save this week/i })).not.toBeDisabled()
  })
})

describe("saving an edit to the week that is open", () => {
  it("says which week is being edited", async () => {
    server()
    saved({ loadedId: "draft-1", loadedName: "Monday Push" })

    const line = await screen.findByTestId("saved-weeks-editing")
    expect(line.textContent).toContain("Monday Push")
    // Nothing has changed yet.
    expect(line.textContent).not.toMatch(/unsaved changes/i)
  })

  it("says so when the design no longer matches the saved week", async () => {
    server()
    saved({ loadedId: "draft-1", loadedName: "Monday Push", weights: { lib_bench_press: "65" } })

    const line = await screen.findByTestId("saved-weeks-editing")
    expect(line.textContent).toMatch(/unsaved changes/i)
  })

  it("updates that week by id even when it is renamed to something else entirely", async () => {
    const user = userEvent.setup()
    const writes = server()
    saved({ loadedId: "draft-1", loadedName: "Monday Push" })

    const box = await screen.findByLabelText(/name for the week/i)
    await waitFor(() => expect((box as HTMLInputElement).value).toBe("Monday Push"))
    await user.clear(box)
    // A name that matches NO saved week. The old by-name match would find
    // nothing here and POST a second week, leaving the one on screen behind.
    await user.type(box, "Winter block")
    await user.click(screen.getByRole("button", { name: /save this week/i }))

    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0].method).toBe("PATCH")
    expect(writes[0].url).toContain("draft-1")
    expect(writes[0].body.name).toBe("Winter block")
  })

  it("Save as new makes a second week, and is offered only while one is open", async () => {
    const user = userEvent.setup()
    const writes = server()
    saved({ loadedId: "draft-1", loadedName: "Monday Push" })

    await user.click(await screen.findByRole("button", { name: /save as new/i }))

    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0].method).toBe("POST")
  })

  it("offers no Save as new when nothing is open", async () => {
    server()
    saved()
    await screen.findByRole("button", { name: /save this week/i })
    expect(screen.queryByRole("button", { name: /save as new/i })).toBeNull()
    expect(screen.queryByTestId("saved-weeks-editing")).toBeNull()
  })
})
