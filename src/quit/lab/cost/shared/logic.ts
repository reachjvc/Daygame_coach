/** Maths shared by the Cost and savings copies. */

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Keep a typed number inside [min, max]; no maximum when `max` is undefined. */
export function clampTo(n: number, min: number, max?: number): number {
  if (n < min) return min
  if (max !== undefined && n > max) return max
  return n
}

/** Parse typed text; NaN for anything that is not a plain number. */
export function parseTyped(text: string): number {
  const t = text.trim()
  if (t === "" || !/^-?\d*\.?\d*$/.test(t) || t === "-" || t === "." || t === "-.") return NaN
  return Number(t)
}

/** Money as the calculator prints it: two decimals under 100, whole numbers (with thousands) from 100 up. */
export function fmtMoneyShort(n: number, symbol = "$"): string {
  const a = Math.abs(n)
  const v = a < 100 ? a.toFixed(2) : Math.round(a).toLocaleString("en-US")
  return `${n < 0 && Number(v.replace(/,/g, "")) !== 0 ? "-" : ""}${symbol}${v}`
}

/** Two decimals always, with thousands separators. */
export function fmtMoney2(n: number, symbol = "$"): string {
  const v = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n < 0 && Number(v.replace(/,/g, "")) !== 0 ? "-" : ""}${symbol}${v}`
}

/** `YYYY-MM-DDTHH:mm` in local time, the value format of a datetime-local input. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fromLocalInput(v: string): number {
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : NaN
}

/** A goal's share of the money: the money pours into goal 1 first, then 2, then 3. */
export function cascade(money: number, prices: number[]): { funded: number; pct: number | null }[] {
  let left = Math.max(0, money)
  return prices.map((price) => {
    if (!(price > 0)) return { funded: 0, pct: null }
    const funded = Math.min(price, left)
    left -= funded
    return { funded: round2(funded), pct: Math.floor((funded / price) * 100 + 1e-9) }
  })
}
