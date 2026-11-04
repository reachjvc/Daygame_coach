// @vitest-environment jsdom
/**
 * TWO PROJECTS WITH ONE NAME ARE TOLD APART IN THE REPORTS PROJECT FILTER.
 *
 * Found by the heavy-user audit of 2026-11-04 (D11): a "Website" for Client A and a
 * "Website" for Client B — which Toggl allows — were listed in Reports → Projects as two
 * identical "Website" lines, so filtering to one client's site was a guess. The project
 * pickers on the Timer already show the client beside the name; the filter now says it
 * too, wherever two names collide, and leaves every other name as it was.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"

import { ReportsView } from "@/src/timetrack/components/ReportsView"
import { defaultReportConfig } from "@/src/timetrack/reportsService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

afterEach(cleanup)
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

function twoWebsites(): TimetrackState {
  const base = baseState()
  const website = (id: string, clientId: string | null) => ({ ...base.projects[1], id, clientId, name: "Website" })
  return baseState({
    clients: [
      { id: "21", workspaceId: "1", name: "Client A", archived: false, at: NOW_ISO },
      { id: "22", workspaceId: "1", name: "Client B", archived: false, at: NOW_ISO },
    ],
    projects: [...base.projects, website("61", "21"), website("62", "22"), { ...website("63", null), name: "website" }],
  })
}

describe("the Reports project filter", () => {
  test("names the client wherever two projects share a name, and nowhere else", () => {
    const state = twoWebsites()
    render(
      <ReportsView
        state={state}
        setState={() => {}}
        nowSec={epochSeconds(NOW_ISO)}
        config={defaultReportConfig("2026-08-10", 1, state.workspace.rounding)}
        setConfig={() => {}}
        pushToast={() => {}}
      />,
    )

    fireEvent.click(screen.getAllByRole("button", { name: /^Projects/ })[0])
    const panel = screen.getByPlaceholderText("Search projects…").closest("[data-dropdown-panel]") as HTMLElement
    const labels = [...panel.querySelectorAll("button span.truncate")].map((el) => el.textContent)

    expect(labels).toEqual(["Alpha", "Beta", "Website · Client A", "Website · Client B", "website · No client"])
  })
})
