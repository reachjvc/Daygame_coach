/**
 * Three versions of the same module, and the rule that keeps them honest.
 *
 * The problem this solves: the module accumulated six flows, five tools, 381
 * accounts and 196 techniques, and the front door tried to show all of it. The
 * copy alone runs to about 9,700 words — roughly forty-four minutes of reading
 * — aimed at somebody who is ambivalent by definition and may have arrived at
 * eleven at night. Volume became the product's main feature, which is a
 * failure whatever the quality of the individual pieces.
 *
 * So there are three front doors over one shared state. They are not
 * themes or layouts; they are different answers to "how much should a person
 * see at once", and each is defensible for a different person:
 *
 *  - `plain`  — one question, one answer, nothing else on screen. For the
 *               eleven-at-night arrival, and for anybody who finds a menu of
 *               methodologies actively repellent.
 *  - `guided` — two doors, acute and considered, everything else one level
 *               down. The default.
 *  - `full`   — the whole surface, nothing hidden. For somebody who has been
 *               here a while and wants the library and the flows.
 *
 * **Switching never costs anything.** All three read and write the same
 * `quit-vice-v1` state, so the log, the plans, the card, the tripwire and the
 * voice work follow you across. A version is a view, never a container. If a
 * later change makes one version hold data another cannot see, that is the bug
 * — `tests/unit/vice/versions.test.ts` guards it.
 */

export type ViceVersionId = "plain" | "guided" | "full"

export interface ViceVersion {
  id: ViceVersionId
  label: string
  /** One line, shown in the switcher. Says who it is for, not what it has. */
  forWho: string
  /** Rough ceiling on words visible without scrolling or opening anything. */
  wordBudget: number
}

export const VICE_VERSIONS: ViceVersion[] = [
  {
    id: "plain",
    label: "Plain",
    forWho: "One question at a time. Nothing to choose between.",
    wordBudget: 60,
  },
  {
    id: "guided",
    label: "Guided",
    forWho: "Two doors: something is happening, or you want to work it out.",
    wordBudget: 140,
  },
  {
    id: "full",
    label: "Everything",
    forWho: "All the flows, the accounts and the techniques, nothing hidden.",
    wordBudget: 400,
  },
]

export const DEFAULT_VERSION: ViceVersionId = "guided"

/** Where the choice is kept. Separate key so it survives "start over". */
export const VERSION_KEY = "quit-vice-version"

export function isVersionId(value: unknown): value is ViceVersionId {
  return value === "plain" || value === "guided" || value === "full"
}

export const SWITCHER = {
  label: "How much to show",
  /** Said once, on the switcher, so nobody fears losing work by trying one. */
  note: "Same notes, same log, same plans in all three. Switching only changes how much is on screen.",
}
