/**
 * "UPPER BODY" WAS UNTYPEABLE.
 *
 * Three boxes rename a training day, and each pushed every keystroke through a
 * function that trims. Trim on every keystroke means the space after "Upper"
 * is deleted as you type it, so the second word can never be started — and
 * clearing the box to retype hit a `|| day.label` guard that snapped the old
 * name straight back.
 *
 * Trimming is a commit rule here, not a typing rule.
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DraftInput } from "@/components/ui/draft-input"

function box(value = "Upper", onCommit = vi.fn()) {
  const view = render(<DraftInput value={value} onCommit={onCommit} aria-label="Day name" />)
  return { onCommit, input: screen.getByLabelText("Day name") as HTMLInputElement, view }
}

describe("a box you can type a two-word name into", () => {
  it("a space typed at the end stays on screen, and 'Upper Body' is committed once, on blur", async () => {
    const user = userEvent.setup()
    const { onCommit, input } = box()

    await user.click(input)
    await user.type(input, " ")
    // THE WHOLE BUG: this used to read "Upper" again by the next render.
    expect(input.value).toBe("Upper ")

    await user.type(input, "Body")
    expect(input.value).toBe("Upper Body")
    // Nothing committed yet — not one keystroke has been pushed through.
    expect(onCommit).not.toHaveBeenCalled()

    await user.tab()
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("Upper Body")
  })

  it("Enter commits without waiting for a blur", async () => {
    const user = userEvent.setup()
    const { onCommit, input } = box()

    await user.click(input)
    await user.type(input, " Body{Enter}")
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("Upper Body")
  })

  it("commits the trimmed text, so the rule still holds", async () => {
    const user = userEvent.setup()
    const { onCommit, input } = box()

    await user.click(input)
    await user.type(input, "  Body   ")
    await user.tab()
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("Upper  Body")
  })

  it("clearing the box and leaving restores the old name and commits nothing", async () => {
    const user = userEvent.setup()
    const { onCommit, input } = box()

    await user.clear(input)
    expect(input.value).toBe("")
    await user.tab()

    expect(input.value).toBe("Upper")
    expect(onCommit).not.toHaveBeenCalled()
  })

  it("leaving without changing anything commits nothing", async () => {
    const user = userEvent.setup()
    const { onCommit, input } = box()

    await user.click(input)
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it("Escape abandons what was typed", async () => {
    const user = userEvent.setup()
    const { onCommit, input } = box()

    await user.click(input)
    await user.type(input, " Body{Escape}")
    expect(input.value).toBe("Upper")
    expect(onCommit).not.toHaveBeenCalled()
  })

  it("a value changed from outside replaces the draft while unfocused", () => {
    const onCommit = vi.fn()
    const { view } = box("Upper", onCommit)

    view.rerender(<DraftInput value="Pull" onCommit={onCommit} aria-label="Day name" />)
    expect((screen.getByLabelText("Day name") as HTMLInputElement).value).toBe("Pull")
  })

  it("but an outside change does NOT overwrite what is half-typed", async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    const { view, input } = box("Upper", onCommit)

    await user.click(input)
    await user.type(input, " Bo")
    view.rerender(<DraftInput value="Pull" onCommit={onCommit} aria-label="Day name" />)

    // A background refetch landing mid-word must not eat the word.
    expect((screen.getByLabelText("Day name") as HTMLInputElement).value).toBe("Upper Bo")
  })
})
