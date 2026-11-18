import tooltextJson from "./data/tooltext.json"

/** Reader labels of the tools (`src/quit/data/tooltext.json`). */
export const tooltext = tooltextJson

/** Fills `{slot}` placeholders; a missing slot is left as written. */
export function fill(template: string, slots: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in slots ? String(slots[k]) : m))
}
