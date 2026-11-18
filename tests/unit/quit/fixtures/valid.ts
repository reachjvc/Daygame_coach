import { NEED_IDS } from "@/src/quit/types"
import type { QuitAddictionFull, QuitRef } from "@/src/quit/types"

const ref: QuitRef = {
  cite: "Test Author (2020). A test study. Test Journal 1:1.",
  url: "https://example.org/study",
  quote: "a short quote from the study",
}

const number = (kind: string) => ({
  kind,
  big: "19 in 100",
  headline: "19 in 100 people ever hooked on tea were free when asked.",
  mirror: "You think nobody gets free.",
  severity: "dependent" as const,
  counted: "people ever hooked on tea",
  basis: { design: "a survey", who: "adults hooked on tea", n: "100 of 500", where: "US", when: "2001", measured: "who was free" },
  caveat: "A snapshot, not a lifetime share.",
  ref,
})

/** A complete small addiction that passes every rule with live: true. Fresh copy per call. */
export function makeValid(): QuitAddictionFull {
  return {
    id: "nicotine",
    name: "Tea",
    units: [
      { id: "cup", one: "cup", many: "cups", defaultPriceUsd: 2, defaultMinutesPerUnit: 10, priceRefs: [ref] },
    ],
    costKind: "money+time",
    danger: { level: "none", line: null, refs: [] },
    footerNote: null,
    hope: number("hope-free-now"),
    numbers: [number("how-tries")],
    keyFacts: ["Most people who try again get free."],
    beliefs: Array.from({ length: 12 }, (_, i) => ({
      id: `b${i + 1}`,
      kind: "stuck" as const,
      scene: "Third cup of the morning, hands shaking, reaching again.",
      short: "I need it",
      need: NEED_IDS[i % NEED_IDS.length],
      limiting: "I have drunk tea for years. I am stuck.",
      counterpart: "Most people hooked on tea get free in the end.",
      whenThought: "Write the thought down and read the proof under it.",
      test: "This week, skip one cup and notice what happens.",
      proof: "Most people who were hooked on tea got free in the end.",
      severity: "dependent" as const,
      counted: null,
      refs: [ref],
    })),
    facts: Array.from({ length: 3 }, (_, i) => ({
      id: `f${i + 1}`,
      statement: "Tea is a plant.",
      answer: true,
      explain: "It is a plant leaf.",
      severity: "dependent" as const,
      counted: null,
      refs: [ref],
    })),
    needs: NEED_IDS.map((id) => ({
      id,
      name: id,
      swaps: [{ id: `${id}-1`, text: "Walk for ten minutes", evidence: "moderate" as const, refs: [ref] }],
    })),
    endings: [{ id: "e1", label: "I felt fine", blackBoxEnding: "fine" }],
    helped: [{ id: "h1", label: "A walk" }],
    riskyMoments: [{ id: "r1", label: "After lunch" }],
    responses: [{ id: "p1", text: "I go for a walk." }],
    clearOut: [{ id: "c1", text: "Throw out the tea bags", removes: "tea bags" }],
    symptomWords: { craving: "Cravings" },
    symptomHelp: [{ symptom: "craving", text: "Walk or drink water.", evidence: "moderate", refs: [ref] }],
    symptomCourse: [{ symptom: "irritable", peak: "first week", lasts: "2 to 4 weeks", text: "Irritability peaks in week one.", evidence: "moderate", refs: [ref] }],
    symptomCourseNote: "These studies are almost all of cigarette smokers.",
    tapeForward: ["Week one", "Week two", "Month one", "Month three"],
    costSwaps: [{ usd: 5, text: "A cinema ticket." }],
    besides: [{ id: "s1", text: "Talk to a friend." }],
    felt: null,
    lessons: [{ day: 1, beliefId: "b1", title: "Why you drink it", body: "Tea gives a small lift.", exercise: "Write down when.", refs: [ref] }],
    bands: [
      { id: "free", min: 0, max: 2, label: "Mostly free", text: "Few of these hold you." },
      { id: "some", min: 3, max: 7, label: "Some hold", text: "A handful of these hold you." },
      { id: "hooked", min: 8, max: 12, label: "Hooked", text: "Most of these hold you." },
    ],
    catch: "Nothing else to say.",
    planSteps: Array.from({ length: 5 }, (_, i) => ({ title: `Step ${i + 1}`, text: "Do the step.", do: ["Do one thing."] })),
  }
}
