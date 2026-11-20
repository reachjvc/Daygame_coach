/**
 * WHERE EACH CHECKLIST ROW OF THE SPLIT PARTS LIVES (Plans/plan-new-from-real.md, Phase 6.2; ids only, no text).
 *
 * A row id is a letter and a number (`A12`); a range is `A7-A10`. A bucket is a section id (a screen, or a part of the
 * area sheet or goal card) or one of the buckets that is not a screen of its own:
 * frame (drawn by the shell on every screen), sheet-wide / card-row (header, footer or row shown in every section),
 * rule (a service rule with no block), outside (not on `/plan`), new-only (only in the first rebuild at
 * `/plan/new/first`), n/a (real code that is never drawn).
 */
export const SCOPE = ["A1-A58", "A89-A131", "B151-B203", "C1-C90", "C94-C99", "C103-C198", "D121-D157"] as const

export const ROW_BUCKETS: Record<string, string[]> = {
  "star.vision": ["A7-A10", "A12-A28", "A44-A50"],
  "star.self": ["A30-A41", "A43"],
  "everything.driving-force": ["A11", "C148-C160", "C180"],
  frame: ["A1-A4", "A54-A57", "B194", "B195", "C182"],
  rule: ["A5", "A6", "A42", "A58", "A108", "B156", "B196", "B198", "C183-C185", "D139", "D148", "D149"],
  "new-only": ["A29", "A51-A53", "A111", "A112", "B199-B203", "C186-C198", "D150"],
  "sheet-wide": ["A89-A94", "A130", "A131"],
  "area.ten": ["A95-A107", "A109", "A110", "A126-A129"],
  "area.why": ["A113-A125"],
  "season.one-thing": ["B151-B155", "B157-B169"],
  "season.why": ["B170", "B171"],
  "season.who": ["B172-B174"],
  "season.areas": ["B175-B182"],
  "season.order": ["B183-B193"],
  outside: ["B197", "D126"],
  "card-row": ["C1-C19", "C99"],
  "goal.shape": ["C20-C44", "C63-C71", "C94-C98"],
  "goal.why": ["C45-C53", "C55", "C58", "C60", "C61", "C87-C90"],
  "goal.do": ["C54", "C59", "C62", "C82-C86"],
  "goal.stops": ["C56", "C57", "C72-C81"],
  "values.so-far": ["C112-C121"],
  "values.lists": ["C122-C137"],
  "values.order": ["C138-C147"],
  "everything.plan": ["C103-C111", "C161-C167"],
  "everything.links": ["C168"],
  "everything.check": ["C169-C174", "D151-D156"],
  "everything.commit": ["C175-C179", "D157"],
  "n/a": ["C181"],
  "review.open": ["D121-D125", "D127-D130", "D146", "D147"],
  "review.goals": ["D131-D137"],
  "review.write": ["D138", "D140-D145"],
}

/** `A7-A10` or `A43` as the list of ids it names. */
export function expandRows(spec: string): string[] {
  const m = /^([A-Z])(\d+)(?:-\1(\d+))?$/.exec(spec)
  if (!m) throw new Error(`bad row spec ${spec}`)
  const from = Number(m[2])
  const to = m[3] ? Number(m[3]) : from
  return Array.from({ length: to - from + 1 }, (_, i) => `${m[1]}${from + i}`)
}
