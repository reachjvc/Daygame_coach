// @vitest-environment jsdom
/**
 * A NAME TYPED INTO MANAGE KEEPS ITS SPACES, AND A BLANK NAME IS NEVER STORED.
 *
 * Found by the heavy-user audit of 2026-11-04 (D5), in a real browser: renaming the tag
 * "tag-05" by typing "deep focus" saved "deepfocus". The field showed the stored name,
 * and `updateTag` trimmed on every keystroke — so the space typed after "deep" was gone
 * before the "f" arrived. Clients did not trim at all, which kept the space but let a
 * cleared field store an empty name, which the database refuses (`*_name_not_blank`).
 *
 * The field now shows what you type, the stored name is that text trimmed, and leaving
 * the field shows the stored name again.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useCallback, useState } from "react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"

import { ManageView } from "@/src/timetrack/components/ManageView"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

afterEach(cleanup)
// jsdom has no layout; the section switcher scrolls its active button into view
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

function Harness({ tab, latest }: { tab: "clients" | "tags"; latest: { current: TimetrackState } }) {
  const [state, setState] = useState(() => baseState())
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState(updater), [])
  return <ManageView state={state} setState={update} nowSec={0} pushToast={() => {}} tab={tab} setTab={() => {}} />
}

describe("renaming in Manage", () => {
  test("a tag typed as two words keeps the space between them", async () => {
    const latest = { current: null as unknown as TimetrackState }
    render(<Harness tab="tags" latest={latest} />)
    const field = screen.getByDisplayValue("deep") as HTMLInputElement

    await userEvent.clear(field)
    await userEvent.type(field, "deep focus")

    expect(field.value, "the field ate the space").toBe("deep focus")
    expect(latest.current.tags.find((t) => t.id === "50")!.name).toBe("deep focus")
  })

  test("the stored name is trimmed, and leaving the field shows it", async () => {
    const latest = { current: null as unknown as TimetrackState }
    render(<Harness tab="tags" latest={latest} />)
    const field = screen.getByDisplayValue("meeting") as HTMLInputElement

    await userEvent.clear(field)
    await userEvent.type(field, "  standup  ")
    expect(latest.current.tags.find((t) => t.id === "51")!.name).toBe("standup")

    fireEvent.blur(field)
    expect(field.value).toBe("standup")
  })

  test("a client cleared to nothing keeps its name, and gets it back on leaving", async () => {
    const latest = { current: null as unknown as TimetrackState }
    render(<Harness tab="clients" latest={latest} />)
    const field = screen.getByDisplayValue("Acme") as HTMLInputElement

    await userEvent.clear(field)
    expect(latest.current.clients[0].name, "a blank client name reached the workspace").toBe("Acme")
    await userEvent.type(field, "Acme Inc")
    expect(latest.current.clients[0].name).toBe("Acme Inc")

    await userEvent.clear(field)
    fireEvent.blur(field)
    expect(field.value).toBe("Acme Inc")
  })
})
