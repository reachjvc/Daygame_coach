// @vitest-environment jsdom
/**
 * THE PROJECT AND TAG PICKERS IN TOGGL TRACK'S WORDS AND ORDER (D-PICKERS,
 * Phase 6 of Plans/toggl-parity.md; W25 11:07 and 11:28).
 *
 * Projects: "Search by project, task or client", "No Project", the projects
 * grouped under their client, and "+ Create a new project" pinned at the
 * bottom. Tags: "Add/filter tags", a checkbox per tag, "Create ‹x›", and the
 * empty list says how to make one. Ctrl+Enter creates, in both. One picker
 * for both sizes, so the phone gets the same words.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { ProjectPicker, TagPicker } from "@/src/timetrack/components/pickers"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

afterEach(cleanup)

function workspace(): TimetrackState {
  const base = baseState()
  const project = (id: string, name: string, clientId: string | null) => ({ ...base.projects[0], id, name, clientId })
  return baseState({
    clients: [
      { id: "c-b", workspaceId: "1", name: "Bravo Ltd", archived: false, at: NOW_ISO },
      { id: "c-a", workspaceId: "1", name: "Acme", archived: false, at: NOW_ISO },
    ],
    projects: [project("p1", "Gym", null), project("p2", "Website", "c-b"), project("p3", "Launch", "c-a"), project("p4", "Docs", "c-a")],
    tasks: [],
    tags: [],
  })
}

const panel = () => screen.getByPlaceholderText(/^Search by project, task or client$|^Add\/filter tags$/).closest("[data-dropdown-panel]") as HTMLElement

describe("the project picker", () => {
  test("searches by project, task or client, and lists No Project, then the projects under their client", async () => {
    render(<ProjectPicker state={workspace()} projectId={null} taskId={null} onChange={() => {}} onCreateProject={() => {}} autoOpen />)
    await screen.findByPlaceholderText("Search by project, task or client")
    const lines = [...panel().querySelectorAll("[data-picker-line]")].map((line) => line.textContent?.trim())
    // a project with no client needs no heading; each client is a heading over its own projects, A to Z
    // (a heading is drawn in capitals; its text is the client's name)
    expect(lines).toEqual(["No Project", "Gym", "Acme", "Docs", "Launch", "Bravo Ltd", "Website"])
  })

  test("a search still groups what it finds", async () => {
    render(<ProjectPicker state={workspace()} projectId={null} taskId={null} onChange={() => {}} onCreateProject={() => {}} autoOpen />)
    fireEvent.change(await screen.findByPlaceholderText("Search by project, task or client"), { target: { value: "acme" } })
    const lines = [...panel().querySelectorAll("[data-picker-line]")].map((line) => line.textContent?.trim())
    expect(lines).toEqual(["No Project", "Acme", "Docs", "Launch"])
  })

  test("+ Create a new project is pinned at the bottom, even before anything is typed", async () => {
    render(<ProjectPicker state={workspace()} projectId={null} taskId={null} onChange={() => {}} onCreateProject={() => {}} autoOpen />)
    const search = await screen.findByPlaceholderText("Search by project, task or client")
    const create = within(panel()).getByRole("button", { name: /Create a new project/ })
    // below the list, not in it
    expect(create.closest("[data-picker-pinned]")).toBeTruthy()
    // with nothing typed it asks for the name where it is typed
    fireEvent.click(create)
    expect(document.activeElement).toBe(search)
  })

  test("Ctrl+Enter creates the project typed", async () => {
    const created = vi.fn()
    render(<ProjectPicker state={workspace()} projectId={null} taskId={null} onChange={() => {}} onCreateProject={created} autoOpen />)
    const search = await screen.findByPlaceholderText("Search by project, task or client")
    fireEvent.change(search, { target: { value: "Podcast" } })
    expect(within(panel()).getByRole("button", { name: "Create “Podcast”" })).toBeTruthy()
    fireEvent.keyDown(search, { key: "Enter", ctrlKey: true })
    expect(created).toHaveBeenCalledWith("Podcast")
  })

  test("a workspace with no clients stays one plain list, with no heading", async () => {
    const plain = { ...workspace(), clients: [], projects: workspace().projects.map((p) => ({ ...p, clientId: null })) }
    render(<ProjectPicker state={plain} projectId={null} taskId={null} onChange={() => {}} autoOpen />)
    await screen.findByPlaceholderText("Search by project, task or client")
    expect(panel().querySelectorAll("[data-picker-heading]").length).toBe(0)
  })
})

describe("the tag picker", () => {
  test("adds or filters, with Toggl's words when there are none yet", async () => {
    render(<TagPicker state={workspace()} tagIds={[]} onChange={() => {}} onCreateTag={() => {}} autoOpen />)
    await screen.findByPlaceholderText("Add/filter tags")
    expect(within(panel()).getByText("There are no tags yet")).toBeTruthy()
    expect(within(panel()).getByText("Start typing and press Ctrl+Enter to create a new tag.")).toBeTruthy()
    expect(within(panel()).getByRole("button", { name: /Create tag/ }).closest("[data-picker-pinned]")).toBeTruthy()
  })

  test("a checkbox per tag, and Ctrl+Enter creates the one typed", async () => {
    const created = vi.fn()
    const state = { ...workspace(), tags: [{ id: "t1", workspaceId: "1", name: "deep", at: NOW_ISO }] } as TimetrackState
    render(<TagPicker state={state} tagIds={["t1"]} onChange={() => {}} onCreateTag={created} autoOpen />)
    const search = await screen.findByPlaceholderText("Add/filter tags")
    expect(within(panel()).getByRole("checkbox", { name: "deep" }).getAttribute("aria-checked")).toBe("true")
    fireEvent.change(search, { target: { value: "admin" } })
    expect(within(panel()).getByRole("button", { name: "Create “admin”" })).toBeTruthy()
    fireEvent.keyDown(search, { key: "Enter", ctrlKey: true })
    expect(created).toHaveBeenCalledWith("admin")
  })
})
