// @vitest-environment jsdom
/**
 * THE IDLE QUESTION SAYS HOW LONG YOU HAVE BEEN AWAY — NOW, NOT WHEN IT FIRST ASKED.
 *
 * It was written once, the moment the threshold passed, and never again. Away
 * for three hours with a ten-minute threshold, you came back to "No activity
 * for 10 minutes … What should happen to those 10 minutes?", while "Drop them"
 * dropped all three hours and then said "Dropped 10 minutes". And "has been
 * running since 14:21" named the moment you went idle, not when the timer
 * started. Found by the edits audit on 2026-11-04.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { IdleQuestion } from "@/src/timetrack/components/IdleQuestion"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"

const at = (h: number, m = 0, s = 0) => new Date(2026, 10, 4, h, m, s, 0).toISOString()

afterEach(cleanup)

const prompt = { entryId: "1", description: "Deep work", idleSinceIso: at(14, 21) }

function ask(nowIso: string) {
  return render(
    <IdleQuestion
      prompt={prompt}
      entryStartIso={at(9, 5)}
      nowSec={epochSeconds(nowIso)}
      timeFormat="h24"
      onResolve={vi.fn()}
    />,
  )
}

describe("the idle question", () => {
  test("counts the time away up to now", () => {
    const view = ask(at(14, 21, 28))
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("No activity for 28 seconds")

    view.rerender(
      <IdleQuestion prompt={prompt} entryStartIso={at(9, 5)} nowSec={epochSeconds(at(17, 21))} timeFormat="h24" onResolve={vi.fn()} />,
    )
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("No activity for 3 hours")
    expect(screen.getByRole("dialog").textContent).toContain("What should happen to those 3 hours?")
  })

  test("says when the timer started, and separately when the page went quiet", () => {
    ask(at(14, 51))
    const text = screen.getByRole("dialog").textContent ?? ""
    expect(text).toContain("Deep work has been running since 09:05")
    expect(text).toContain("nothing has happened on this page since 14:21")
    expect(text).not.toMatch(/running since 14:21/)
  })
})
