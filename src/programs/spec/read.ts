/**
 * READING A STORED PROGRAM — the version first, then everything else.
 *
 * Every stored program carries `specVersion`. A copy written by a newer build
 * (a phone on an old tab, a rollback) is refused out loud here rather than
 * read as far as it happens to parse: half-reading a training program is how
 * it quietly prescribes the wrong thing.
 */

import { checkSpec } from "./schema"
import { SPEC_VERSION, type ProgramSpec } from "./types"

/** The stored copy is in a format this build does not read. */
export class SpecVersionError extends Error {
  constructor(readonly found: unknown) {
    super(
      found == null
        ? "This program was saved without a format version, so it cannot be read safely."
        : typeof found === "number" && found > SPEC_VERSION
          ? `This program was saved in format ${found} by a newer version of the app; this one reads format ${SPEC_VERSION}. Reload the page.`
          : `This program is in format ${JSON.stringify(found)}, which this app does not read.`
    )
    this.name = "SpecVersionError"
  }
}

/** The stored copy is in the right format and breaks its rules. */
export class SpecInvalidError extends Error {
  constructor(readonly problems: string[]) {
    super(`This program cannot be used as stored: ${problems.join(" ")}`)
    this.name = "SpecInvalidError"
  }
}

/** A stored program, checked. Throws `SpecVersionError` or `SpecInvalidError`; never guesses. */
export function readSpec(stored: unknown): ProgramSpec {
  if (stored == null || typeof stored !== "object" || Array.isArray(stored)) {
    throw new SpecInvalidError(["It is not a program at all."])
  }
  const version = (stored as { specVersion?: unknown }).specVersion
  if (version !== SPEC_VERSION) throw new SpecVersionError(version)
  const checked = checkSpec(stored)
  if (!checked.ok) throw new SpecInvalidError(checked.problems)
  return checked.spec
}
