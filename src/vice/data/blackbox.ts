/**
 * The ending families, and the words the Black Box uses.
 *
 * The ids match `data/again.ts`, which took them from the testimonial corpus,
 * so the attempt-review tool and this one cannot disagree about what the
 * endings are.
 *
 * ONE family is accented on the chart: `fine`. That is not a ranking — it is
 * fixed to the family and never moves, because a colour that follows whichever
 * ending is currently most common would repaint the chart every time the data
 * changed, and you would lose the ability to recognise your own picture.
 */

import type { ViceEndingId } from "../types"

export const ENDING_FAMILIES: ReadonlyArray<{
  id: ViceEndingId
  /** The plain-English headline. */
  label: string
  /** The short form, used at the end of a bar. */
  short: string
  /** What it sounds like from the inside, to help someone place their own thought. */
  sounds: string
  /** Whether the chart accents it. Exactly one family does. */
  accent: boolean
}> = [
  {
    id: "fine",
    label: "I felt fine — I could handle it",
    short: "I felt fine",
    sounds: "Things are going well, so surely one would not undo it.",
    accent: true,
  },
  {
    id: "justone",
    label: "Just one won't matter",
    short: "just one",
    sounds: "A single exception, for a specific occasion, decided on the spot.",
    accent: false,
  },
  {
    id: "drink",
    label: "I'd been drinking",
    short: "drinking",
    sounds: "The decision was made by someone with less to lose than you.",
    accent: false,
  },
  {
    id: "stress",
    label: "Something went badly wrong",
    short: "something went wrong",
    sounds: "A genuinely bad day, and this was the thing that was to hand.",
    accent: false,
  },
  {
    id: "faded",
    label: "It faded — I stopped paying attention",
    short: "it faded out",
    sounds: "No single moment. It just stopped being a thing you were doing.",
    accent: false,
  },
  {
    id: "other",
    label: "Something else",
    short: "something else",
    sounds: "None of the above fits it.",
    accent: false,
  },
]

export function familyFor(id: ViceEndingId) {
  return ENDING_FAMILIES.find((f) => f.id === id) ?? ENDING_FAMILIES[ENDING_FAMILIES.length - 1]
}

/** Seeds for the contributing-factors bank. Plural on purpose — never "the reason". */
export const FACTOR_SEEDS: readonly string[] = [
  "A good stretch beforehand",
  "Slept badly",
  "Drinking",
  "On my own",
  "With people who do it",
  "Bored",
  "Stressed about work",
  "An argument",
  "It was in the house",
  "Out of my normal routine",
  "Celebrating something",
  "Nobody knew I was trying",
]

/** Seeds for what a person put in place at the start of a run. */
export const STRUCTURE_SEEDS: readonly string[] = [
  "Told a specific person",
  "Threw out everything in the house",
  "Changed the route home",
  "Stopped the second thing too",
  "Medication or a substitute",
  "Wrote down what ended the last one",
  "A rule for the first drink",
  "Nothing in particular",
]
