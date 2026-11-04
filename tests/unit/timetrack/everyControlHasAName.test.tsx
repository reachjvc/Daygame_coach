// @vitest-environment jsdom
/**
 * EVERY BUTTON, BOX AND DROPDOWN ON PROJECTS, MANAGE AND REPORTS HAS A NAME A SCREEN
 * READER CAN SAY.
 *
 * Found by the heavy-user audit of 2026-11-04 (D13), walking every section with 40
 * projects: each project's delete button was an icon and nothing else, so a screen
 * reader announced forty times "button"; each client and tag row's name box and delete
 * button were the same; and on a phone three of Reports' dropdowns had no name.
 *
 * The check is the accessible name as assistive tech computes it — `aria-label`, a
 * wrapping `<label>`, a button's own words — and deliberately NOT a `<select>`'s option
 * text, which is the list's contents, not its name.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"

import { ManageView } from "@/src/timetrack/components/ManageView"
import { ProjectsView } from "@/src/timetrack/components/ProjectsView"
import { ReportsView } from "@/src/timetrack/components/ReportsView"
import { defaultReportConfig } from "@/src/timetrack/reportsService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

afterEach(cleanup)
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const NOW_SEC = epochSeconds(NOW_ISO)
const state = (): TimetrackState => baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00")] })

function accessibleName(el: Element): string {
  const own = el.getAttribute("aria-label") ?? el.getAttribute("title") ?? ""
  const labelledBy = el.getAttribute("aria-labelledby")
  const byId = labelledBy ? (document.getElementById(labelledBy)?.textContent ?? "") : ""
  const wrapped = el.closest("label") ? (el.closest("label")!.textContent ?? "") : ""
  const forLabel = el.id ? (document.querySelector(`label[for="${el.id}"]`)?.textContent ?? "") : ""
  const words = el.tagName === "BUTTON" ? (el.textContent ?? "") : ""
  const placeholder = el.getAttribute("placeholder") ?? ""
  return (own + byId + (el.tagName === "SELECT" ? "" : wrapped) + forLabel + words + placeholder).trim()
}

function unnamed(container: HTMLElement): string[] {
  return [...container.querySelectorAll("button, input, select")]
    .filter((el) => (el as HTMLInputElement).type !== "hidden" && !accessibleName(el))
    .map((el) => `${el.tagName.toLowerCase()} near "${(el.closest("li,tr,section,header")?.textContent ?? "").slice(0, 40)}"`)
}

const noop = () => {}

describe("a name for every control", () => {
  test("on Projects", () => {
    const { container } = render(
      <ProjectsView state={state()} setState={noop} nowSec={NOW_SEC} pushToast={noop} focusProjectId={null} onFocusProject={noop} />,
    )
    expect(unnamed(container)).toEqual([])
  })

  test("on Manage → Clients and Manage → Tags", () => {
    for (const tab of ["clients", "tags"] as const) {
      const { container, unmount } = render(
        <ManageView state={state()} setState={noop} nowSec={NOW_SEC} pushToast={noop} tab={tab} setTab={noop} />,
      )
      expect(unnamed(container), `on the ${tab} tab`).toEqual([])
      unmount()
    }
  })

  test("on Reports", () => {
    const s = state()
    const { container } = render(
      <ReportsView
        state={s}
        setState={noop}
        nowSec={NOW_SEC}
        config={defaultReportConfig("2026-08-10", 1, s.workspace.rounding)}
        setConfig={noop}
        pushToast={noop}
      />,
    )
    expect(unnamed(container)).toEqual([])
  })
})
