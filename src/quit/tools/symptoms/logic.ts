import type { QuitSymptomCourse, QuitSymptomHelp } from "../../types"

/** The label of a symptom: the data file's plain word, else a fallback, else the key. */
export function symptomLabel(key: string, words: Record<string, string>, fallback: Record<string, string>): string {
  return words[key] ?? fallback[key] ?? key
}

/** Help rows for one symptom, in data order. */
export function helpFor(symptom: string, help: QuitSymptomHelp[]): QuitSymptomHelp[] {
  return help.filter((h) => h.symptom === symptom)
}

/** Rows the guide may show: every course row with a source, never tiredness. */
export function listable(course: QuitSymptomCourse[]): QuitSymptomCourse[] {
  return course.filter((c) => c.symptom !== "tired" && c.refs.length > 0)
}
