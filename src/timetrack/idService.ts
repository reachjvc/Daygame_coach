/**
 * Where a new id comes from.
 *
 * Every id is made on the device that creates the thing, never handed out by a
 * central counter. That is what makes an offline edit safe: two phones with no
 * signal can both create an entry and neither one has to lose when they
 * reconnect, because the two ids cannot be the same.
 */
export function newId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    // Deliberately loud. Every browser this app supports (Safari 16.4+,
    // Chrome 111+, Firefox 115+) has this. If it is missing we are running
    // somewhere unsupported, and quietly inventing a weaker id would hide that.
    throw new Error("This browser cannot generate ids (crypto.randomUUID is missing). Please update it.")
  }
  return crypto.randomUUID()
}
