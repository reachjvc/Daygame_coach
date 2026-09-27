/**
 * RESTORING A BACKUP IS A DELETION, AND IT ASKS FIRST.
 *
 * Found on 2026-09-27: "Restore from a backup" took one gesture. The file dialog
 * opened, a file was chosen, and `replaceState` ran — no confirm step, no undo,
 * no statement of what was about to go. Pick last month's file by mistake and a
 * month of work is gone, and not only from this browser: the replacement is
 * diffed and uploaded, so every entry recorded since that backup was taken
 * becomes a tombstone on every device signed into the account.
 *
 * "Clear this workspace" sits three inches below it on the same page, is strictly
 * less destructive, and has always asked twice.
 *
 * The confirmation states the counts rather than a warning adjective, because
 * "this will overwrite your data" is equally true of a backup taken a minute ago
 * and one taken in March, and the numbers are the only thing that tells them
 * apart.
 */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { SettingsView } from "@/src/timetrack/components/SettingsView"
import { exportStateJson } from "@/src/timetrack/importExportService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

// jsdom has no layout, so the tab strip's scroll-into-view needs a stand-in
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

afterEach(cleanup)

/** The workspace as it is now: four entries the person has recorded. */
function now(): TimetrackState {
  return baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "one" }),
      entry(2, "2026-08-11", "09:00", "10:00", { description: "two" }),
      entry(3, "2026-08-12", "09:00", "10:00", { description: "three" }),
      entry(4, "2026-08-13", "09:00", "10:00", { description: "four" }),
    ],
  })
}

/** A backup from before three of them existed. */
function lastMonth(): TimetrackState {
  return baseState({ entries: [entry(1, "2026-07-10", "09:00", "10:00", { description: "one" })] })
}

function settings() {
  const replaceState = vi.fn()
  const view = render(
    <SettingsView
      state={now()}
      setState={vi.fn()}
      pushToast={vi.fn()}
      resetWorkspace={vi.fn()}
      replaceState={replaceState}
      syncStatus="idle"
      onUploadEverything={vi.fn()}
      tab="data"
      onTabChange={vi.fn()}
    />,
  )
  return { view, replaceState }
}

/** Choose a backup file, the way the file input receives one. */
async function choose(view: ReturnType<typeof render>, state: TimetrackState) {
  const input = view.container.querySelector('input[type="file"][accept*="json"]') as HTMLInputElement
  expect(input, "the backup file input was not found, so this test asserts nothing").toBeTruthy()
  const json = exportStateJson(state)
  const file = new File([json], "toggl-workspace-2026-08-01.json", { type: "application/json" })
  // jsdom's File has no `text()`; the component reads the file with it
  Object.defineProperty(file, "text", { value: async () => json, configurable: true })
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  fireEvent.change(input)
}

describe("choosing a backup file", () => {
  test("does not replace anything on its own", async () => {
    const { view, replaceState } = settings()
    await choose(view, lastMonth())

    await waitFor(() => expect(view.queryByTestId("tt-restore-confirm")).toBeTruthy())
    expect(replaceState, "the workspace was replaced without being asked").not.toHaveBeenCalled()
  })

  test("says how much smaller the backup is", async () => {
    const { view } = settings()
    await choose(view, lastMonth())

    const panel = await waitFor(() => {
      const found = view.queryByTestId("tt-restore-confirm")
      expect(found).toBeTruthy()
      return found!
    })
    expect(panel.textContent).toContain("4 now")
    expect(panel.textContent, "the person is never told what the backup holds").toContain("1 in the backup")
    expect(panel.textContent).toContain("3 time entries fewer")
  })

  test("can be cancelled, and then nothing has happened", async () => {
    const { view, replaceState } = settings()
    await choose(view, lastMonth())
    await waitFor(() => expect(view.queryByTestId("tt-restore-confirm")).toBeTruthy())

    fireEvent.click(view.getByText("Cancel"))

    expect(view.queryByTestId("tt-restore-confirm")).toBeNull()
    expect(replaceState).not.toHaveBeenCalled()
  })

  test("restores once the person has confirmed twice", async () => {
    const { view, replaceState } = settings()
    await choose(view, lastMonth())
    await waitFor(() => expect(view.queryByTestId("tt-restore-confirm")).toBeTruthy())

    fireEvent.click(view.getByText("Restore this backup"))
    fireEvent.click(view.getByText("Yes, replace everything"))

    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(replaceState.mock.calls[0][0].entries).toHaveLength(1)
  })
})
