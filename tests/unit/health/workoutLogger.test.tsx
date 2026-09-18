/**
 * THE FORM FOR A WORKOUT YOU ALREADY DID.
 *
 * Two things it used to get wrong, and both were invisible:
 *
 * 1. It decided for itself what a personal best was, from the 90 days it
 *    happened to have loaded. The finish summary used the last 400 workouts and
 *    the Progress list 365 days, so the same set was a record on one screen and
 *    not on another. The server answers it now, from all of your training, and
 *    this form computes nothing.
 *
 * 2. An empty weight box was `parseFloat("")` — and a set with a blank weight
 *    was quietly DROPPED from the save. Type 100 and 5 for the squat, forget
 *    the weight on the bench, press Save: the bench was simply not there, with
 *    nothing on screen saying so. A pull-up with nothing added is the one lift
 *    where a blank box is honest, and that one saves as 0.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WorkoutLogger } from "@/src/health/components/WorkoutLogger"

interface Posted {
  session_type: string
  duration_min: number
  sets?: Array<{ exercise: string; weight_kg: number; reps: number }>
}

/** The server: an empty history, and whatever records the test says it found. */
function stubServer(reply: Record<string, unknown> = {}) {
  const posts: Posted[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") {
        posts.push(JSON.parse(init.body ?? "{}") as Posted)
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: "l-new", logged_at: "2026-09-18T10:00:00Z", sets: [], ...reply }),
        } as unknown as Response
      }
      if (url.includes("/api/health/workout")) {
        return { ok: true, status: 200, json: async () => [] } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => [] } as unknown as Response
    })
  )
  return posts
}

/** Open the form and fill in a duration, which is all Save needs to enable. */
async function openForm(user: ReturnType<typeof userEvent.setup>) {
  render(<WorkoutLogger />)
  await waitFor(() => expect(screen.getByTitle(/write up a workout/i)).toBeTruthy())
  await user.click(screen.getByTitle(/write up a workout/i))
  await user.type(screen.getByLabelText(/duration/i), "60")
}

/** Fill exercise `index` with a name and one set. */
async function fillLift(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  name: string,
  weight: string,
  reps: string
) {
  const names = screen.getAllByPlaceholderText("Exercise name")
  await user.clear(names[index])
  await user.type(names[index], name)
  const kg = screen.getAllByPlaceholderText("kg")
  const repsBoxes = screen.getAllByPlaceholderText("reps")
  if (weight) await user.type(kg[index], weight)
  if (reps) await user.type(repsBoxes[index], reps)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("the past-workout form", () => {
  it("shows the record the server found, and computes none of its own", async () => {
    const user = userEvent.setup()
    stubServer({
      personalRecords: [
        { exercise: "Squat", weight_kg: 140, reps: 3, date: "2026-09-18", isNew: true },
      ],
      firstTimeLifts: ["Front Squat"],
    })
    await openForm(user)
    await fillLift(user, 0, "Squat", "140", "3")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(screen.getByText(/New PR/i)).toBeTruthy())
    expect(screen.getByText(/Squat 140kg × 3/)).toBeTruthy()
    expect(screen.getByTestId("first-time-lifts").textContent).toContain("Front Squat")
  })

  it("claims no record when the server found none, even against no history", async () => {
    // The history here is EMPTY. The old form treated that as "everything is a
    // record" and announced one for the very first set it ever saved.
    const user = userEvent.setup()
    stubServer({ personalRecords: [], firstTimeLifts: ["Squat"] })
    await openForm(user)
    await fillLift(user, 0, "Squat", "100", "5")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(screen.getByTestId("first-time-lifts")).toBeTruthy())
    expect(screen.queryByText(/New PR/i)).toBeNull()
  })

  it("keeps a pull-up set with no weight, and refuses a bench set with none", async () => {
    const user = userEvent.setup()
    const posts = stubServer()
    await openForm(user)
    // A pull-up: nothing added is the honest answer, and it saves as 0.
    await fillLift(user, 0, "Pull-up", "", "12")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(posts).toHaveLength(1))
    expect(posts[0].sets).toEqual([
      expect.objectContaining({ exercise: "Pull-up", weight_kg: 0, reps: 12 }),
    ])
  })

  it("refuses a bench set whose weight box is empty, and says which lift", async () => {
    const user = userEvent.setup()
    const posts = stubServer()
    await openForm(user)
    await fillLift(user, 0, "Bench Press", "", "5")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(screen.getByText(/Bench Press/).textContent).toMatch(/Bench Press/)
    )
    expect(posts, "nothing was saved").toHaveLength(0)
  })

  it("refuses a set with a weight and no reps", async () => {
    const user = userEvent.setup()
    const posts = stubServer()
    await openForm(user)
    await fillLift(user, 0, "Bench Press", "80", "")
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy())
    expect(posts).toHaveLength(0)
  })

  it("refuses a weights session with no sets at all", async () => {
    // An empty gym session counts towards the streak and the heatmap while
    // recording nothing that happened. It used to go through silently.
    const user = userEvent.setup()
    const posts = stubServer()
    await openForm(user)
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy())
    expect(posts).toHaveLength(0)
  })
})
