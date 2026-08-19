// @vitest-environment jsdom

/**
 * Enter has to do something.
 *
 * Reported from the page: "i cannot click enter on the one thing." It was true
 * of nine boxes, not one — every short answer in the north-star flow was a bare
 * two-row textarea, so Enter pushed the text out of a two-line window and
 * nothing acknowledged the key. The answer was being saved on every keystroke,
 * which is exactly why it looked broken: no button, no confirmation, and the
 * one gesture everybody tries did nothing you could see.
 *
 * Two tests, on purpose. The first says what Enter does. The second says every
 * short box in the folder has to go through the thing that does it — because a
 * fix that lives in one component is one component away from being reintroduced
 * by the next short box somebody adds.
 */

import fs from "node:fs"
import path from "node:path"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SENTENCE_HINT, SENTENCE_KEPT, SentenceBox } from "@/src/goals/components/north-star/SentenceBox"

afterEach(cleanup)

describe("Enter, in a box that holds one sentence", () => {
  it("keeps the sentence instead of adding a blank line", () => {
    const onChange = vi.fn()
    const onCommit = vi.fn()
    render(<SentenceBox value="Quit weed" onChange={onChange} onCommit={onCommit} label="The one thing" />)
    const box = screen.getByLabelText("The one thing")
    const event = fireEvent.keyDown(box, { key: "Enter" })

    // Returning false from fireEvent means the handler called preventDefault,
    // which is what stops the newline from ever reaching the value.
    expect(event).toBe(false)
    expect(onCommit).toHaveBeenCalledWith("Quit weed")
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining("\n"))
  })

  it("says it kept it, because saving silently is what looked broken", () => {
    render(<SentenceBox value="Quit weed" onChange={vi.fn()} label="The one thing" />)
    const box = screen.getByLabelText("The one thing")
    fireEvent.focus(box)
    expect(screen.getByText(SENTENCE_HINT)).toBeTruthy()
    fireEvent.keyDown(box, { key: "Enter" })
    fireEvent.blur(box)
    expect(screen.getByText(SENTENCE_KEPT)).toBeTruthy()
  })

  it("leaves Shift+Enter alone, for the answer that wants two lines", () => {
    const onCommit = vi.fn()
    render(<SentenceBox value="Quit weed" onChange={vi.fn()} onCommit={onCommit} label="The one thing" />)
    const event = fireEvent.keyDown(screen.getByLabelText("The one thing"), { key: "Enter", shiftKey: true })
    expect(event).toBe(true)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it("trims on the way out, so Enter also tidies", () => {
    const onChange = vi.fn()
    render(<SentenceBox value="Quit weed  " onChange={onChange} label="The one thing" />)
    fireEvent.keyDown(screen.getByLabelText("The one thing"), { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith("Quit weed")
  })

  it("does nothing loud on an empty box", () => {
    const onCommit = vi.fn()
    render(<SentenceBox value="   " onChange={vi.fn()} onCommit={onCommit} label="The one thing" />)
    fireEvent.keyDown(screen.getByLabelText("The one thing"), { key: "Enter" })
    expect(onCommit).toHaveBeenCalledWith("")
    expect(screen.queryByText(SENTENCE_KEPT)).toBeNull()
  })
})

/**
 * The class guard.
 *
 * A one- or two-row textarea IS a sentence box: that is what the row count
 * means. Prose boxes — a north star, an ideal day, a list of experiences — keep
 * the plain textarea, because there Enter really is a new line.
 */
describe("every short box in the north-star flow handles Enter", () => {
  const DIR = path.join(process.cwd(), "src/goals/components/north-star")

  it("has no bare one- or two-row textarea", () => {
    const offenders: string[] = []
    for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".tsx"))) {
      const src = fs.readFileSync(path.join(DIR, file), "utf8")
      for (const match of src.matchAll(/<textarea\b[\s\S]{0,1600}?\/>/g)) {
        const tag = match[0]
        const rows = /rows=\{(\d+)\}/.exec(tag)
        if (!rows || Number(rows[1]) > 2) continue
        if (tag.includes("onKeyDown")) continue
        offenders.push(`${file}:${src.slice(0, match.index).split("\n").length} rows=${rows[1]}`)
      }
    }
    // Use SentenceBox, or handle Enter where it stands and say why.
    expect(offenders).toEqual([])
  })
})
