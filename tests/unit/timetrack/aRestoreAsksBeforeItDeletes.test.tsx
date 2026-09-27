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
import { exportStateJson, restoreIntoWorkspace } from "@/src/timetrack/importExportService"
import { diffRows, safeToSend } from "@/src/timetrack/syncService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
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
      setTab={vi.fn()}
      nowSec={Math.floor(new Date(2026, 8, 27, 12, 0, 0).getTime() / 1000)}
      requestNotificationPermission={vi.fn(async () => true)}
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

describe("a backup taken in another browser", () => {
  /**
   * The Backup card offers this journey in so many words: "Export a copy to keep
   * outside this app, or to move it to another browser." On 2026-09-27 the new
   * mass-deletion guard started refusing it, because a live workspace row the
   * server has never seen, beside deletions for everything it does have, is also
   * the signature of the bad-read incident the guard exists to stop.
   *
   * Measured before the fix: restoring a 20-entry backup into a 3-entry account
   * was refused as "a change that would delete 13 of your saved items" — a
   * restore that GREW the account. And the refusal's own advice is what finished
   * it off: the toast says to reload, a reload runs first contact, finds the
   * server's copy differs and installs it.
   *
   * So the guard is asserted here, not just the reattachment: this test's job is
   * to fail if the two ever disagree again.
   */
  test("is restored into this account's workspace, and the guard lets it through", () => {
    const here = now()
    const elsewhere = restoreIntoWorkspace(lastMonth(), "a-completely-different-workspace")
    expect(elsewhere.workspace.id, "the fixture must start from a foreign workspace or this asserts nothing").toBe(
      "a-completely-different-workspace",
    )

    const adopted = restoreIntoWorkspace(elsewhere, here.workspace.id)
    expect(adopted.workspace.id).toBe(here.workspace.id)
    expect(adopted.entries.every((e) => e.workspaceId === here.workspace.id), "children still point at the backup's workspace").toBe(true)

    const serverRows = stateToRows(here, "u1")
    const { changed } = diffRows(serverRows, stateToRows(adopted, "u1"), "2026-09-27T00:00:00.000Z")
    expect(safeToSend(changed, serverRows, true).ok, "the guard refused a restore the product offers").toBe(true)
  })

  test("keeps what the backup's workspace actually carried", () => {
    /**
     * Only the identity is this account's. Losing the settings would make a
     * restore a partial restore, silently.
     */
    const backup = {
      ...lastMonth(),
      workspace: { ...lastMonth().workspace, id: "other", name: "Kept name", rounding: { enabled: true, mode: "up" as const, minutes: 30 } },
    }
    const adopted = restoreIntoWorkspace(backup, "mine")
    expect(adopted.workspace.name).toBe("Kept name")
    expect(adopted.workspace.rounding).toEqual({ enabled: true, mode: "up", minutes: 30 })
  })

  test("and a backup from this same workspace is handed back untouched", () => {
    const backup = lastMonth()
    expect(restoreIntoWorkspace(backup, backup.workspace.id)).toBe(backup)
  })
})
