/**
 * Every coverage fixture under `corpus/`, found by file rather than listed by
 * hand, so a new fixture cannot be written and then forgotten by the tests.
 */

import type { ProgramFixture } from "./fixture"

const modules = import.meta.glob("./corpus/*.ts", { eager: true }) as Record<string, Record<string, unknown>>

export const FIXTURES: ProgramFixture[] = Object.values(modules).flatMap((m) =>
  Object.values(m).filter((v): v is ProgramFixture => v != null && typeof v === "object" && "spec" in v && "expect" in v)
)
