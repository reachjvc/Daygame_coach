/**
 * Charles Poliquin's 3-2-1 wave loading, as his own article writes it:
 * "Wave-like Loading: A Great Method to Achieve Maximal Strength",
 * strengthsensei.com, 19 January 2015 (read through the Wayback Machine copy
 * of 24 June 2017 on 2026-10-22).
 *
 * The article's sample is "a 300 front squat": 3 reps at 270, 2 at 285, 1 at
 * 300 — 90%, 95% and 100% of the 300 — with 4 minutes between sets. Each new
 * wave is the same three sets 2.5 lb heavier (the text says "starts over with
 * 0.5 to 1 kg"); wave 3 and wave 4 are done only if the wave before was made.
 * The 300 is the working weight here, so every set is a percentage of it plus
 * the wave's step.
 *
 * Two readings are this file's, and say so: the kg step is 1 kg a wave (the
 * article's 0.5–1 kg, at its 2.5 lb ≈ 1 kg sample), and the session-to-session
 * rule is "hold", because the article describes one workout and never says
 * how the next one starts. The same article's 7-5-3 scheme (for combat
 * athletes, 2 waves) is a different prescription and is not encoded here.
 */

import type { ProgramFixture } from "../fixture"
import type { SetGroup } from "@/src/programs/spec/types"

/** One wave: 3 reps at 90%, 2 at 95%, 1 at 100% of the working weight. */
const WAVE = [
  { reps: 3, pct: 0.9 },
  { reps: 2, pct: 0.95 },
  { reps: 1, pct: 1 },
]

/** Wave n is wave 1 plus (n − 1) steps of 2.5 lb (1 kg). */
const wave = (n: number, note?: string): SetGroup => ({
  id: `wave${n}`,
  kind: "working",
  count: 3,
  reps: 3,
  load: n === 1 ? { from: "working" } : { from: "working", plus: { kg: n - 1, lb: 2.5 * (n - 1) } },
  perSet: WAVE,
  restSec: 240,
  ...(note ? { note } : {}),
})

export const poliquinWaveLoading: ProgramFixture = {
  id: "poliquin-wave-loading",
  title: "Charles Poliquin: 3-2-1 wave loading",
  source: {
    url: "https://www.strengthsensei.com/wave-like-loading-maximal-strength/",
    author: "Charles R. Poliquin",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "A public article on Poliquin's own site (no paywall). Read via https://web.archive.org/web/20170624134826/http://www.strengthsensei.com/wave-like-loading-maximal-strength/ — the live page now redirects. Numbers are the article's 'Sample for a 300 front squat', waves 1-4.",
  },
  coverage: "close",
  gaps: [
    "Waves 3 and 4 are done only if the single of the wave before was made (\"if successful, proceed to wave no. 3\"), and most people stop after 2 waves; a set group cannot be conditional on the previous group being made, so all four waves are listed with a note.",
    "The article describes one workout and gives no rule for where the next session starts; the progression is 'hold' and the lifter moves the working weight.",
    "The wave step is \"0.5 to 1 kg, depending on strength level\" (2.5 lb in the sample); a fixed step is one number, so this file uses 2.5 lb / 1 kg.",
  ],
  spec: {
    specVersion: 2,
    name: "Poliquin 3-2-1 wave loading",
    blurb:
      "One lift, in waves of three sets: 3 reps at 90%, 2 at 95% and a single at 100% of your working weight, 4 minutes' rest between sets. Each new wave is 2.5 lb (about 1 kg) heavier; start the next wave only if you made the single. Most people do 2 waves, a third on a great day; the strongest reach 4.",
    credit: "by Charles Poliquin",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 0.5, stepLb: 2.5, mode: "nearest" },
    days: [
      {
        id: "waves",
        label: "3-2-1 waves",
        slots: [
          {
            id: "front_squat",
            lift: { lib: "lib_front_squat" },
            note: "Lift every rep as explosively as you can.",
            sets: [
              wave(1),
              wave(2),
              wave(3, "Only if you made the single of wave 2."),
              wave(4, "Only if you made the single of wave 3."),
            ],
            progression: { kind: "hold" },
          },
        ],
      },
    ],
  },
  start: { working: { front_squat: 300 } },
  expect: [
    {
      session: 1,
      slot: "front_squat",
      sets: "1x3@270, 1x2@285, 1x1@300, 1x3@272.5, 1x2@287.5, 1x1@302.5, 1x3@275, 1x2@290, 1x1@305, 1x3@277.5, 1x2@292.5, 1x1@307.5",
      source:
        "'Sample for a 300 front squat': wave 1 = 3@270, 2@285, 1@300; wave 2 = 3@272.5, 2@287.5, 1@302.5; wave 3 = 3@275, 2@290, 1@305; wave 4 = 3@277.5, 2@292.5, 1@307.5",
    },
    {
      session: 2,
      slot: "front_squat",
      sets: "1x3@270, 1x2@285, 1x1@300, 1x3@272.5, 1x2@287.5, 1x1@302.5, 1x3@275, 1x2@290, 1x1@305, 1x3@277.5, 1x2@292.5, 1x1@307.5",
      source:
        "The same sample: the article gives no rule for the next workout, so the next session starts from the same 300 (this file's 'hold')",
    },
  ],
}
