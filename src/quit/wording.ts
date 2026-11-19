/** Wording that fits cigarettes, vapes and pouches. One place, driven by the data file's unit id. */

export interface UnitLike {
  id: string
}

const VERB: Record<string, string> = {
  cigarettes: "smoke",
  vape: "vape",
  pouches: "use a pouch",
}

/** The verb phrase: "smoke", "vape", "use a pouch". Unknown unit: "use". */
function verbOf(unit: UnitLike | null | undefined): string {
  return (unit && VERB[unit.id]) || "use"
}

export function useVerb(unit: UnitLike | null | undefined): string {
  return verbOf(unit)
}

/** "Did you smoke?" / "Did you vape?" / "Did you use a pouch?" */
export function didYouUse(unit: UnitLike | null | undefined): string {
  const phrase = useVerb(unit)
  return `Did you ${phrase}?`
}
