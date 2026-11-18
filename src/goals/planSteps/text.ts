/** Fill `{name}` slots in a words-file line. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}

/** `_one` / `_other` pairs of a words block: pick by count. */
export function plural(block: object, base: string, n: number, extra: Record<string, string | number> = {}): string {
  const line = (block as Record<string, string>)[`${base}_${n === 1 ? "one" : "other"}`] ?? ""
  return fill(line, { n, ...extra })
}
