// @vitest-environment jsdom
/**
 * THE PROJECT FORM CAN MAKE ITS CLIENT, AND KEEPS THE ONE CHOSEN (Phase 8
 * findability of Plans/toggl-parity.md).
 *
 * "Make a new project 'Guitar' with a client 'Self'" took a fresh user 15
 * actions and failed: the form's Client list offered "No client" and the
 * clients that exist, with no way to make one there, so the user had to leave
 * for Manage → Clients and come back. Toggl Track's project dialog makes a
 * client from its own client picker. Now typing a name that does not exist
 * offers "Create client “Self”", and Enter (or Ctrl+Enter) makes it and picks
 * it. A client picked from the list is kept when the project is saved.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

import { ProjectsView } from "@/src/timetrack/components/ProjectsView"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

afterEach(cleanup)
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

function projectsPage() {
  const latest = { current: baseState() }
  function Harness() {
    const [state, setState] = useState(latest.current)
    latest.current = state
    return (
      <ProjectsView
        state={state}
        setState={(updater) => setState((current) => updater(current))}
        nowSec={epochSeconds(NOW_ISO)}
        pushToast={vi.fn()}
        focusProjectId={null}
        onFocusProject={vi.fn()}
      />
    )
  }
  render(<Harness />)
  fireEvent.click(screen.getByRole("button", { name: /New project/ }))
  const form = within(screen.getByRole("dialog", { name: "New project" }))
  fireEvent.change(form.getByRole("textbox", { name: "Name" }), { target: { value: "Guitar" } })
  return { latest, form }
}

const clientSearch = () => screen.getByPlaceholderText("Find or create a client")
const panel = () => clientSearch().closest("[data-dropdown-panel]") as HTMLElement

describe("the project form's client", () => {
  test("a name that does not exist is offered as a new client, and Enter makes it and picks it", () => {
    const { latest, form } = projectsPage()
    fireEvent.click(form.getByRole("button", { name: "Client" }))
    fireEvent.change(clientSearch(), { target: { value: "Self" } })
    expect(within(panel()).getByRole("button", { name: "Create client “Self”" })).toBeTruthy()
    fireEvent.keyDown(clientSearch(), { key: "Enter" })

    const self = latest.current.clients.find((c) => c.name === "Self")
    expect(self, "the client was not made").toBeTruthy()
    expect(form.getByRole("button", { name: "Client" }).textContent).toContain("Self")

    fireEvent.click(form.getByRole("button", { name: "Create project" }))
    expect(latest.current.projects.find((p) => p.name === "Guitar")?.clientId).toBe(self!.id)
  })

  test("Ctrl+Enter makes it too, and an existing name is picked, not made twice", () => {
    const { latest, form } = projectsPage()
    fireEvent.click(form.getByRole("button", { name: "Client" }))
    fireEvent.change(clientSearch(), { target: { value: "acme" } })
    expect(within(panel()).queryByRole("button", { name: /Create client/ })).toBeNull()
    fireEvent.keyDown(clientSearch(), { key: "Enter", ctrlKey: true })
    expect(latest.current.clients.filter((c) => c.name.toLowerCase() === "acme").length).toBe(1)
    expect(form.getByRole("button", { name: "Client" }).textContent).toContain("Acme")
  })

  test("a client picked from the list is kept when the project is saved", () => {
    const { latest, form } = projectsPage()
    fireEvent.click(form.getByRole("button", { name: "Client" }))
    fireEvent.click(within(panel()).getByRole("button", { name: "Acme" }))
    fireEvent.click(form.getByRole("button", { name: "Create project" }))
    expect(latest.current.projects.find((p) => p.name === "Guitar")?.clientId).toBe("20")
  })

  test("No client is still a choice", () => {
    const { latest, form } = projectsPage()
    fireEvent.click(form.getByRole("button", { name: "Client" }))
    fireEvent.click(within(panel()).getByRole("button", { name: "No client" }))
    fireEvent.click(form.getByRole("button", { name: "Create project" }))
    expect(latest.current.projects.find((p) => p.name === "Guitar")?.clientId).toBeNull()
    expect((latest.current as TimetrackState).clients.length).toBe(1)
  })
})
