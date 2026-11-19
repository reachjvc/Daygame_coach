/** Dates as the quit tools show them: "Thu, Nov 12", never ISO. A day not in this year shows the year: "Mon, Oct 4, 2027". */
export const fmtDay = (day: string, today: string) => {
  const d = new Date(`${day}T12:00:00`)
  const year = d.getFullYear() !== Number(today.slice(0, 4))
  return d.toLocaleDateString("en-US", year ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { weekday: "short", month: "short", day: "numeric" })
}
/** "Oct 20", with the year when it is not `thisYear`. */
export const fmtShort = (day: string, thisYear: number) => {
  const d = new Date(`${day}T12:00:00`)
  return d.toLocaleDateString("en-US", d.getFullYear() === thisYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" })
}
export const fmtMonth = (year: number, month0: number) => new Date(year, month0, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
export const fmtLongDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
