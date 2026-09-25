import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * WHAT THE SCREEN SAYS ABOUT WHERE YOUR DATA GOES HAS TO BE TRUE.
 *
 * On 2026-09-22 the report form said, under the button that files it:
 *
 *     "Filed reports are kept on this device. Nothing is sent anywhere."
 *
 * It was true that day. On 2026-09-23 the record went onto the account, and
 * every field on that form became a column in `vice_reports` — the thought in
 * the person's own words, who they were with, where they were. The sentence
 * stayed for three days, four hundred pixels below another one on the same page
 * reading "This record is on your account, so it is on your other devices too".
 *
 * NOTHING CAUGHT IT, AND THE NEAR MISS IS THE POINT. `viceComponentCopy.test.ts`
 * reads this exact file on every run. It checks the module's VOICE — banned
 * machine phrasings, cheerleading, the "not just X but Y" shape — and a false
 * statement in perfect voice passes it without a mark. A copy lint cannot be
 * asked to know where the bytes go; this test can.
 *
 * WHY IT NAMES FOUR FILES RATHER THAN SCANNING THE SLICE. A blanket ban on
 * "stays in this browser" would fail a sentence that is TRUE: the help door
 * says the country you pick "is not stored anywhere but this browser", and it
 * is not — `useHelpLocale` keeps it in its own key and no row carries it. The
 * rule is not about the words. It is about the four screens that collect what
 * becomes a synced row, and those are the four below.
 *
 * AND IT CANNOT BECOME A FREE PASS. The ban is only correct while the module
 * actually syncs, so the last case asserts that it does. The day the account is
 * taken out, this test fails and sends the next person back to the copy, rather
 * than quietly forbidding a sentence that has become true again.
 */

const ROOT = resolve(__dirname, "../../..")

/**
 * The file with its comments taken out.
 *
 * The first version of this test skipped that and failed on its own
 * explanation: the comment in `ReportForm.tsx` QUOTES the false sentence, so
 * that the next reader knows what happened. A guard that cannot tell the copy
 * from a note about the copy would push the note out of the file — which is
 * the opposite of what this whole exercise is for, and is the same mistake in
 * miniature as the guards it was written to replace: matching the shape of the
 * text rather than the claim a reader would act on.
 */
function visibleCopy(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ")
}

/** The screens that collect something which ends up on the account. */
const COLLECTORS = [
  "src/vice/components/blackbox/ReportForm.tsx",
  "src/vice/components/blackbox/AttemptStart.tsx",
  "src/vice/components/blackbox/PastRun.tsx",
  "src/vice/components/blackbox/BlackBoxPage.tsx",
]

/**
 * Claims that the record does not leave the device.
 *
 * Each one is a sentence a reasonable person would act on — they decide whether
 * to write the true version of the thought based on it.
 */
const LOCAL_ONLY_CLAIMS = [
  /nothing is sent anywhere/i,
  /not sent anywhere/i,
  /kept on this device/i,
  /stays (?:in|on) this (?:browser|device)/i,
  /never leaves this (?:browser|device)/i,
  /there is no account/i,
  /only on this device/i,
  /stored only (?:in|on) this/i,
]

describe("the module never claims a synced record stays local", () => {
  for (const file of COLLECTORS) {
    it(`${file.split("/").pop()} makes no local-only promise`, () => {
      const source = visibleCopy(readFileSync(resolve(ROOT, file), "utf8"))
      for (const claim of LOCAL_ONLY_CLAIMS) {
        const hit = source.match(claim)
        expect(
          hit,
          `${file} says "${hit?.[0]}", but everything this screen collects is ` +
            `uploaded by blackBoxRows.ts. Either the sentence is wrong or the ` +
            `sync is gone — and if the sync is gone, the last test in this file ` +
            `is the one to change first.`,
        ).toBeNull()
      }
    })
  }

  it("and the page really does sync, which is what makes that ban correct", () => {
    // Without this the whole file is a rule against saying something true.
    const page = readFileSync(resolve(ROOT, COLLECTORS[3]), "utf8")
    expect(page).toContain("useBlackBoxSync")

    // And the report's own words really are columns, not just the run's dates.
    const rows = readFileSync(resolve(ROOT, "src/vice/blackbox/blackBoxRows.ts"), "utf8")
    for (const column of ["thought", "with_whom", "where_at", "factors", "did_instead"]) {
      expect(rows, `${column} is no longer uploaded — re-read the copy`).toContain(column)
    }
  })
})
