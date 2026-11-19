import type { QuitRef, QuitSymptomCourse } from "../../types"

export type StretchId = "hard" | "fade" | "cue"

export interface Stretch {
  id: StretchId
  from: number
  to: number
  title: string
  line: string
  basis: { who: string; n: string; design: string; when: string; caveat: string }
  refs: QuitRef[]
}

function refOf(course: QuitSymptomCourse[], symptom: string, pmid: string): QuitRef[] {
  const row = course.find((c) => c.symptom === symptom)
  return (row?.refs ?? []).filter((r) => r.pmid === pmid)
}

/**
 * The three marked stretches of the six-week calendar. Every number is a day count taken from the words
 * of the data file's `symptomCourse` rows and their quotes (Hughes 2007 and Shiffman 2006 on the "irritable"
 * row, Bedi 2011 on the "cue-craving" row). Day 1 is the quit date.
 *  - hard: "peak within the first week" -> days 1 to 7.
 *  - fade: "within 10 days of quitting" -> days 8 to 10 (the days after the first week up to day 10).
 *  - cue: tested at days 7, 14 and 35 only; stronger at 35 than at 7 -> day 35 to the end of the calendar, marked as untested after 35.
 */
export function stretches(course: QuitSymptomCourse[], note: string): Stretch[] {
  return [
    {
      id: "hard",
      from: 1,
      to: 7,
      title: "Days 1 to 7: the hardest days for most",
      line: "Anger, anxiety, low mood, trouble concentrating, restlessness and poor sleep peak in the first week.",
      basis: {
        who: "Adults who stopped smoking, as gathered by one author",
        n: "A review of earlier studies; the number of people is not in the line we quote",
        design: "Single-author review: one researcher read the earlier studies and summed them up. It says these symptoms peak within the first week and last 2 to 4 weeks.",
        when: "Published 2007",
        caveat: note,
      },
      refs: refOf(course, "irritable", "17365764"),
    },
    {
      id: "fade",
      from: 8,
      to: 10,
      title: "Days 8 to 10: most of it back to normal",
      line: "In a diary study, withdrawal symptoms were back to their usual level within about 10 days.",
      basis: {
        who: "Smokers who quit and logged their symptoms in a diary",
        n: "214",
        design: "Diary study: symptoms rated day by day, before and after quitting.",
        when: "Published 2006",
        caveat: `The review above puts the end at 2 to 4 weeks, so the two do not agree. ${note}`,
      },
      refs: refOf(course, "irritable", "17156182"),
    },
    {
      id: "cue",
      from: 35,
      to: 42,
      title: "Around day 35: cravings set off by cues can still be strong",
      line: "In a lab test, cue cravings were stronger at day 35 than at day 7. It says nothing about days 1 to 6.",
      basis: {
        who: "Smokers paid to stay off cigarettes",
        n: "86",
        design: "Lab study with three groups tested at day 7, day 14 or day 35 of staying off. Nobody was tested at other days or after day 35.",
        when: "Published 2011",
        caveat: "Only days 7, 14 and 35 were tested, so nothing is claimed about days 1 to 6 or after day 35. Paid volunteers in a lab, not people quitting in daily life.",
      },
      refs: refOf(course, "cue-craving", "20817135"),
    },
  ]
}

export function stretchAt(list: readonly Stretch[], dayNo: number): Stretch | null {
  return list.find((s) => dayNo >= s.from && dayNo <= s.to) ?? null
}
