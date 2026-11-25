// @vitest-environment jsdom
/**
 * THE PHONE'S REPORTS GROUP BY WHAT WAS TYPED, TOO.
 *
 * The short Reports screen grouped by Projects or Clients only, so time typed
 * as "business" with no project showed as one "No project" slice (owner,
 * 2026-11-25). Descriptions and Tags are choices of their own now.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import { PhoneReports } from "@/src/timetrack/components/phone/PhoneReports"
import { defaultReportConfig } from "@/src/timetrack/reportsService"

import { baseState, entry } from "./helpers"

afterEach(cleanup)

test("Descriptions groups the week by what was typed, without a project", () => {
  const state = baseState({
    entries: [
      entry(1, "2026-11-23", "09:00", "11:00", { description: "business" }),
      entry(2, "2026-11-24", "09:00", "10:00", { description: "Business" }),
      entry(3, "2026-11-24", "14:00", "15:00", { description: "daygame" }),
    ],
  })
  const nowSec = Math.floor(new Date(2026, 10, 25, 12, 0).getTime() / 1000)
  render(
    <PhoneReports
      state={state}
      nowSec={nowSec}
      config={defaultReportConfig("2026-11-25", state.user.weekStart, state.workspace.rounding)}
      onDetails={() => {}}
      downloadRef={{ current: null }}
    />,
  )
  const group = screen.getByRole("region", { name: "Group by" })
  expect(group.textContent).not.toContain("daygame")

  fireEvent.click(screen.getByRole("radio", { name: "Descriptions" }))
  expect(screen.getByRole("radio", { name: "Descriptions" }).getAttribute("aria-checked")).toBe("true")
  // "business" and "Business" are one slice of three hours, beside "daygame"
  expect(group.textContent?.toLowerCase()).toContain("business3:00")
  expect(group.textContent).toContain("daygame1:00")
})
