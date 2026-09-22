/**
 * "1 day", not "1 days".
 *
 * One place, because the count appears on the stat tiles, on every bar label
 * and in the cost list, and three copies of a plural rule is how two of them
 * end up saying "1 days" on the one screen somebody is reading closely.
 */
export function days(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`
}
