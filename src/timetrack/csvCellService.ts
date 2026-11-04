/**
 * Time-tracking slice — how an entry's tags travel in one CSV cell, written and read in
 * one place.
 *
 * The exports (`reportsService`) and the import (`importExportService`) each need the
 * other half of this rule, and a rule with two homes drifts: the Detailed CSV joined
 * tags with ", " while the import split on commas, so the tag "deep, focus" left as one
 * tag and came back as two (heavy-user audit of 2026-11-04, D2). What any cell may
 * hold — no spreadsheet formula — is `@/src/shared/csvCell`.
 */

/**
 * TAG NAMES IN ONE CELL, EACH ONE WHOLE.
 *
 * Toggl's own export joins an entry's tags with ", ", and the import reads that, so a
 * comma has to stay the separator. A comma or semicolon INSIDE a name is written with a
 * backslash before it, and a backslash as two, so "deep, focus" leaves as
 * `deep\, focus` and comes back as one tag. A file from Toggl, or from this app before
 * the change, has no such backslashes and reads exactly as it did.
 */
export function joinTagNames(names: string[]): string {
  return names.map((name) => name.replace(/[\\,;]/g, (char) => `\\${char}`)).join(", ")
}

export function splitTagNames(cell: string): string[] {
  const names: string[] = []
  let current = ""
  for (let i = 0; i < cell.length; i++) {
    const char = cell[i]
    const next = cell[i + 1]
    if (char === "\\" && (next === "\\" || next === "," || next === ";")) {
      current += next
      i++
    } else if (char === "," || char === ";") {
      names.push(current)
      current = ""
    } else {
      current += char
    }
  }
  names.push(current)
  return names.map((name) => name.trim()).filter(Boolean)
}
