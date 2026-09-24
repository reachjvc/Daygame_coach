import { describe, it, expect, vi, afterEach } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HelpDoor } from "@/src/vice/components/HelpDoor"
import { SERVICES } from "@/src/vice/data/help"

/**
 * THE WAY OUT HAS TO BE REACHABLE FROM THE PAGE PEOPLE ACTUALLY LAND ON.
 *
 * This component was one tap from nine screens at `/life-mastery/quit-vice/old`
 * — screens nothing links to — and NO taps from `/life-mastery/quit-vice`, the
 * front door since 2026-09-20 and the one screen the whole module is designed
 * to be opened on. The crisis numbers were in the codebase and out of reach.
 *
 * The cause was a prop signature, not a missing button: the door took the old
 * module's whole `ViceState` and `ViceHandlers` and reached into four fields,
 * so it could not be mounted anywhere that has no `ViceState` — which the Black
 * Box does not and never will. These tests pin the four inputs it does need, so
 * the next surface that has to show a helpline can.
 *
 * WHAT IS DELIBERATELY NOT TESTED HERE: how it looks, and whether the tap
 * target is big enough. That is the browser's answer, not jsdom's.
 */

afterEach(cleanup)

const props = {
  viceId: "alcohol",
  locale: "uk" as const,
  onLocale: vi.fn(),
  onClose: vi.fn(),
}

describe("the help door, mounted with no vice state at all", () => {
  it("renders from four inputs, which is what lets the Black Box mount it", () => {
    // If this ever needs `state` or `on` again, the front door loses its only
    // route to a crisis number and nothing else will say so.
    render(<HelpDoor {...props} />)
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("leads with a crisis service, unconditionally", () => {
    render(<HelpDoor {...props} />)
    const crisis = SERVICES.uk.items.filter((s) => s.crisis)
    expect(crisis.length, "no crisis service to assert against").toBeGreaterThan(0)
    const dialog = screen.getByRole("dialog")
    for (const service of crisis) {
      expect(dialog.textContent, `${service.name} is not on the screen`).toContain(service.name)
    }
  })

  it("shows the emergency number, which is the answer that never rots", () => {
    render(<HelpDoor {...props} />)
    expect(screen.getByRole("dialog").textContent).toContain(SERVICES.uk.emergency)
  })

  it("asks which country before showing any number", () => {
    // A number for the wrong country, presented as this country's, is worse
    // than no number. So nothing below the locale question renders until it is
    // answered — and `useHelpLocale` deliberately does not guess from the
    // browser's locale or timezone.
    render(<HelpDoor {...props} locale={null} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog.textContent).not.toContain(SERVICES.uk.emergency)
    for (const service of SERVICES.uk.items) {
      expect(dialog.textContent).not.toContain(service.name)
    }
  })

  it("reports the country back so it can be remembered", async () => {
    const onLocale = vi.fn()
    render(<HelpDoor {...props} locale={null} onLocale={onLocale} />)
    const buttons = screen.getByRole("dialog").querySelectorAll("button[aria-pressed]")
    expect(buttons.length, "the locale choices are gone").toBeGreaterThan(0)
    await userEvent.click(buttons[0] as HTMLElement)
    expect(onLocale).toHaveBeenCalled()
  })

  it("offers a service specific to one vice only for that vice", () => {
    const specific = SERVICES.uk.items.find((s) => s.forVice && s.forVice.length > 0)
    if (!specific) return // nothing region-specific to check in this data
    const { unmount } = render(<HelpDoor {...props} viceId={specific.forVice![0]} />)
    expect(screen.getByRole("dialog").textContent).toContain(specific.name)
    unmount()

    render(<HelpDoor {...props} viceId="something-else-entirely" />)
    expect(screen.getByRole("dialog").textContent).not.toContain(specific.name)
  })
})

describe("the call plan is drawn only where there is somewhere to keep it", () => {
  /**
   * The bottom of this door asks for a "when X, I will call Y" commitment. The
   * old flows have a plan list; the Black Box's record is runs and reports and
   * must not be bent to hold something else. A form whose submit throws the
   * answer away is worse than no form — and `deadControls.spec.ts` clicks every
   * enabled control and fails anything that changes neither DOM nor storage,
   * so it would be right to fail it.
   */
  it("is absent when no handler is given", () => {
    render(<HelpDoor {...props} />)
    expect(screen.queryByRole("button", { name: /add it to my plans/i })).toBeNull()
  })

  it("is present, and reports what was written, when a handler is given", async () => {
    const onPlan = vi.fn()
    render(<HelpDoor {...props} onPlan={onPlan} />)

    const inputs = screen.getByRole("dialog").querySelectorAll("input")
    expect(inputs.length, "the plan fields are gone").toBeGreaterThanOrEqual(2)
    // A cue and an action. The module refuses a plan phrased as what you will
    // NOT do, so this has to be a real action or the button stays disabled.
    await userEvent.type(inputs[0] as HTMLElement, "it gets to nine at night")
    await userEvent.type(inputs[1] as HTMLElement, "ring the number above")

    const add = screen.getByRole("button", { name: /add it to my plans/i })
    expect(add.hasAttribute("disabled"), "the button is disabled on a valid plan").toBe(false)
    await userEvent.click(add)
    expect(onPlan).toHaveBeenCalledWith("it gets to nine at night", "ring the number above")
  })
})

/**
 * AN OPTIONAL PROP IS ONLY AS GOOD AS THE CALLERS THAT REMEMBER IT, AND EVERY
 * TEST ABOVE RENDERS PAST THEM.
 *
 * The tests above hand `HelpDoor` its props directly. That is the right way to
 * test the component and the wrong way to find out whether the five places
 * that mount it pass the right things — so on its own it leaves exactly the
 * hole another session hit the same afternoon in `src/goals`: a derived-ticks
 * prop was optional, `TrackTab` passed it on its "checking" and signed-OUT
 * branches and forgot it on the signed-IN one, so the feature worked only for
 * people who were not logged in. The test named after that component rendered
 * its child directly with a hand-built value, so it could never have seen it.
 * An optional prop plus a test that renders past the real caller is the whole
 * failure, and this file had both until this block existed.
 *
 * So this reads the call sites themselves. `onPlan` is not a detail here: with
 * it, the door offers a "when X, I will call Y" commitment, and the module's
 * own research is that an intention with no when is not a plan. Dropping it
 * from a flow by accident deletes that quietly, on a screen nobody opens often
 * enough to notice.
 */
const ROOT = path.resolve(__dirname, "../../..")

/** Every surface that mounts the door, and whether it must offer a call plan. */
const CALL_SITES: Array<{ file: string; needsPlan: boolean; why: string }> = [
  { file: "src/vice/components/ViceHub.tsx", needsPlan: true, why: "the old hub has a plan list" },
  { file: "src/vice/components/ViceFlow.tsx", needsPlan: true, why: "every flow has a plan list" },
  { file: "src/vice/components/LearnPage.tsx", needsPlan: true, why: "shares the old module's state" },
  { file: "src/vice/components/ShortlistPage.tsx", needsPlan: true, why: "shares the old module's state" },
  {
    file: "src/vice/components/blackbox/BlackBoxPage.tsx",
    needsPlan: false,
    why: "its record is runs and reports; a plan would have nowhere to live and would be discarded",
  },
]

describe("every surface that mounts the help door passes the right things", () => {
  it("knows about every call site, so a new one cannot be added unnoticed", () => {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx$/.test(entry.name) && fs.readFileSync(full, "utf-8").includes("<HelpDoor")) {
          found.push(path.relative(ROOT, full))
        }
      }
    }
    walk(path.join(ROOT, "src"))
    expect(found.sort(), "a surface mounts HelpDoor and is not listed in CALL_SITES").toEqual(
      CALL_SITES.map((c) => c.file).sort(),
    )
  })

  for (const { file, needsPlan, why } of CALL_SITES) {
    it(`${file} ${needsPlan ? "offers" : "does not offer"} a call plan — ${why}`, () => {
      const src = fs.readFileSync(path.join(ROOT, file), "utf-8")
      const mount = src.slice(src.indexOf("<HelpDoor"))
      const tag = mount.slice(0, mount.indexOf("/>") + 2)

      // The three that are never optional, whoever mounts it.
      for (const required of ["viceId", "locale", "onLocale", "onClose"]) {
        expect(tag, `${file} mounts HelpDoor without ${required}`).toContain(required)
      }
      expect(tag.includes("onPlan"), `${file}: onPlan should be ${needsPlan}. ${why}`).toBe(needsPlan)
    })
  }
})
