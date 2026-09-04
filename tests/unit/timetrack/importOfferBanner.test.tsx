/**
 * "This browser has 19 entries your account does not."
 *
 * The first version of this banner offered one choice on a number: Upload, or
 * Not now. The user's words: "this is not very intuitive, I would like to be
 * able to expand this so I can see the 19 entries, instead of accepting it or
 * not wholesale." Nineteen is not something you can decide about — some of it
 * may be junk, some of it may be a week's work.
 *
 * These run against the component rather than a browser because the earlier
 * end-to-end version needed three page reloads and a shared account, and spent
 * more time being flaky than being useful.
 */

import { StrictMode } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { ImportOfferBanner } from "@/src/timetrack/components/ImportOfferBanner"
import type { ImportOffer } from "@/src/timetrack/hooks/useTimetrackSync"

afterEach(cleanup)

const offer: ImportOffer = {
  entries: 4,
  projects: 2,
  items: [
    { id: "e1", description: "morning writing", project: "Book", day: "2026-09-03", seconds: 3600 },
    { id: "e2", description: "standup", project: "Ops", day: "2026-09-03", seconds: 900 },
    { id: "e3", description: "", project: null, day: "2026-09-02", seconds: 1800 },
    { id: "e4", description: "invoices", project: "Ops", day: "2026-09-01", seconds: 2700 },
  ],
}

function show(onUpload = vi.fn(), onDismiss = vi.fn()) {
  render(
    <StrictMode>
      <ImportOfferBanner offer={offer} todayKey="2026-09-03" onUpload={onUpload} onDismiss={onDismiss} />
    </StrictMode>,
  )
  return { onUpload, onDismiss }
}

describe("before it is opened", () => {
  test("says how much is at stake, in both kinds of thing", () => {
    show()
    const banner = screen.getByText(/time entries/).closest("p")!
    expect(banner.textContent).toContain("4")
    expect(banner.textContent).toContain("2")
    expect(banner.textContent).toContain("projects")
  })

  test("offers to show them rather than only to accept them", () => {
    show()
    expect(screen.getByRole("button", { name: "Show 4" })).toBeTruthy()
  })

  test("uploading everything is still one click", () => {
    const { onUpload } = show()
    fireEvent.click(screen.getByRole("button", { name: "Upload all" }))
    // no list of ids means "all of it"
    expect(onUpload).toHaveBeenCalledWith(undefined)
  })

  test("declining is a real answer", () => {
    const { onDismiss } = show()
    fireEvent.click(screen.getByRole("button", { name: "Not now" }))
    expect(onDismiss).toHaveBeenCalled()
  })
})

describe("once it is opened", () => {
  const open = () => {
    const handles = show()
    fireEvent.click(screen.getByRole("button", { name: "Show 4" }))
    return handles
  }

  test("every entry is listed, with the empty one still identifiable", () => {
    open()
    expect(screen.getByText("morning writing")).toBeTruthy()
    expect(screen.getByText("standup")).toBeTruthy()
    expect(screen.getByText("invoices")).toBeTruthy()
    expect(screen.getByText("(no description)")).toBeTruthy()
  })

  test("entries are grouped under the day they belong to", () => {
    open()
    expect(screen.getByText("Today")).toBeTruthy()
    expect(screen.getByText("Yesterday")).toBeTruthy()
  })

  test("everything starts chosen — the default is not to lose anything", () => {
    open()
    for (const box of screen.getAllByRole("checkbox")) {
      expect((box as HTMLInputElement).checked).toBe(true)
    }
    expect(screen.getByText("4 of 4 chosen")).toBeTruthy()
  })

  test("one can be left out", () => {
    const { onUpload } = open()
    fireEvent.click(screen.getByLabelText("Include standup"))
    expect(screen.getByText("3 of 4 chosen")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Upload 3" }))
    expect(onUpload).toHaveBeenCalledWith(["e1", "e3", "e4"])
  })

  test("a whole day can be taken or left in one click", () => {
    open()
    fireEvent.click(screen.getByRole("button", { name: /Today/ }))
    expect(screen.getByText("2 of 4 chosen")).toBeTruthy()
  })

  test("select none disables the upload, so nothing empty is ever sent", () => {
    open()
    fireEvent.click(screen.getByRole("button", { name: "Select none" }))
    expect(screen.getByText("0 of 4 chosen")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Upload 0" }) as HTMLButtonElement).disabled).toBe(true)
  })

  test("select all puts it back", () => {
    open()
    fireEvent.click(screen.getByRole("button", { name: "Select none" }))
    fireEvent.click(screen.getByRole("button", { name: "Select all" }))
    expect(screen.getByRole("button", { name: "Upload all" })).toBeTruthy()
  })

  test("it closes again", () => {
    open()
    fireEvent.click(screen.getByRole("button", { name: "Hide" }))
    expect(screen.queryByText("morning writing")).toBeNull()
  })

  test("each entry shows what it is: project and how long", () => {
    open()
    const row = screen.getByText("morning writing").closest("label")!
    expect(within(row).getByText("Book")).toBeTruthy()
    expect(within(row).getByText("1h 00m")).toBeTruthy()
  })
})
