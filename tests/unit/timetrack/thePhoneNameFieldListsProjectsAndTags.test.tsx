// @vitest-environment jsdom
/**
 * @ AND # IN THE PHONE SHEET'S NAME LIST PROJECTS AND TAGS INLINE
 * (Plans/toggl-parity.md Phase 3 item 2).
 *
 * "No Project" first, the projects grouped by client, and a row that creates
 * what you typed; # the same for tags. Picking one takes the @word out of
 * the name and sets the chip; nothing is saved until CREATE or DONE.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { NO_PROJECT, inlineChoices } from "@/src/timetrack/inlineChoicesService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const NOW = new Date(2026, 7, 10, 12, 0, 0, 0)
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState

async function openManualSheet() {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState()))
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  fireEvent.click(screen.getByRole("button", { name: "Add a past time entry" }))
  return within(screen.getByRole("dialog", { name: "New time entry" }))
}

/** what the name box holds after typing `text`, the way a keyboard leaves the caret at the end */
function type(box: HTMLInputElement, text: string) {
  fireEvent.change(box, { target: { value: text, selectionStart: text.length } })
  fireEvent.keyUp(box, { key: text.at(-1) })
}

const panel = () => document.querySelector("[data-dropdown-panel]") as HTMLElement

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the rows, as rules", () => {
  test("No Project, projects under their client as the PC picker groups them, and a create row for a name that is not there", () => {
    const rows = inlineChoices(baseState(), { kind: "project", query: "a" })
    expect(rows[0]).toMatchObject({ kind: "no-project", label: NO_PROJECT })
    const kinds = rows.map((r) => `${r.kind}:${r.label}`)
    // a project with no client first, with no heading; then each client over its projects
    expect(kinds.slice(1, 4)).toEqual(["project:Beta", "header:Acme", "project:Alpha"])
    expect(rows.at(-1)).toMatchObject({ kind: "create-project", name: "a" })
    expect(inlineChoices(baseState(), { kind: "project", query: "Alpha" }).some((r) => r.kind === "create-project")).toBe(false)
  })

  test("with only @ typed it still ends with Create a new project, which asks for a name", () => {
    expect(inlineChoices(baseState(), { kind: "project", query: "" }).at(-1)).toMatchObject({ kind: "create-project", label: "Create a new project", name: "" })
  })

  test("# lists tags and offers to create the one typed", () => {
    expect(inlineChoices(baseState(), { kind: "tag", query: "mee" }).map((r) => r.label)).toEqual(["meeting", "Create “mee”"])
    expect(inlineChoices(baseState(), { kind: "tag", query: "deep" }).map((r) => r.kind)).toEqual(["tag"])
  })
})

describe("in the sheet", () => {
  test("@ picks a project: the @word leaves the name and the chip shows it", async () => {
    const sheet = await openManualSheet()
    const box = sheet.getByPlaceholderText("I’ve worked on…") as HTMLInputElement
    type(box, "Call @Al")
    const list = within(panel())
    expect(list.getByText(NO_PROJECT)).toBeTruthy()
    expect(list.getByText("Acme")).toBeTruthy()
    fireEvent.click(list.getByRole("button", { name: /Alpha/ }))
    expect(box.value).toBe("Call")
    expect(sheet.getByRole("button", { name: /Alpha/ })).toBeTruthy()
  })

  test("Create “x” makes the project and chooses it", async () => {
    const sheet = await openManualSheet()
    const box = sheet.getByPlaceholderText("I’ve worked on…") as HTMLInputElement
    type(box, "Practice @Guitar")
    fireEvent.click(within(panel()).getByRole("button", { name: "Create “Guitar”" }))
    await waitFor(() => expect(stored().projects.some((p) => p.name === "Guitar")).toBe(true))
    expect(sheet.getByRole("button", { name: /Guitar/ })).toBeTruthy()
    await act(async () => {
      fireEvent.click(sheet.getByRole("button", { name: "Create" }))
    })
    const guitar = stored().projects.find((p) => p.name === "Guitar")!
    expect(stored().entries.find((e) => e.description === "Practice")?.projectId).toBe(guitar.id)
  })

  test("# picks a tag, or creates the one typed", async () => {
    const sheet = await openManualSheet()
    const box = sheet.getByPlaceholderText("I’ve worked on…") as HTMLInputElement
    type(box, "Review #mee")
    fireEvent.click(within(panel()).getByRole("button", { name: "meeting" }))
    expect(box.value).toBe("Review")
    type(box, "Review #focus")
    fireEvent.click(within(panel()).getByRole("button", { name: "Create “focus”" }))
    await waitFor(() => expect(stored().tags.some((t) => t.name === "focus")).toBe(true))
    expect(sheet.getByRole("button", { name: /meeting, focus/ })).toBeTruthy()
  })

  test("the \"Add a project\" chip puts @ in the name and shows the inline list, as Toggl's does (V1 0:32)", async () => {
    const sheet = await openManualSheet()
    const box = sheet.getByPlaceholderText("I’ve worked on…") as HTMLInputElement
    type(box, "Call")
    fireEvent.click(sheet.getByRole("button", { name: /Add a project/ }))
    expect(box.value).toBe("Call @")
    expect(document.activeElement).toBe(box)
    const list = within(panel())
    expect(list.getByText(NO_PROJECT)).toBeTruthy()
    // only @: Create a new project asks for the name
    fireEvent.click(list.getByRole("button", { name: "Create a new project" }))
    const name = sheet.getByRole("textbox", { name: "New project name" })
    fireEvent.change(name, { target: { value: "Guitar" } })
    fireEvent.click(sheet.getByRole("button", { name: "Create project" }))
    await waitFor(() => expect(stored().projects.some((p) => p.name === "Guitar")).toBe(true))
    expect(sheet.getByRole("button", { name: /Guitar/ })).toBeTruthy()
    expect(box.value).toBe("Call")
  })

  test("No Project clears the chosen project", async () => {
    const sheet = await openManualSheet()
    const box = sheet.getByPlaceholderText("I’ve worked on…") as HTMLInputElement
    type(box, "x @Al")
    fireEvent.click(within(panel()).getByRole("button", { name: /Alpha/ }))
    type(box, "x @")
    fireEvent.click(within(panel()).getByRole("button", { name: NO_PROJECT }))
    expect(sheet.getByRole("button", { name: /Add a project/ })).toBeTruthy()
  })
})
