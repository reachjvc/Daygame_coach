/**
 * Where the starting price of one unit comes from, per unit id. One wording for every tool that shows it
 * (the quit date tool, What it costs you and Your record). Each line says what the number is, who it covers,
 * what it leaves out and where it was published; amounts are in USD.
 */
export const priceBasisOne: Record<string, string> = {
  cigarettes:
    "Starts at $0.52 a cigarette: the plain average of US state prices for a mainstream pack of 20, $10.34, where each state counts the same, divided by 20 (Tobacco Insider, posted 26 Aug 2026; the page does not date its prices). State and federal tax are included; city taxes (for example New York City or Chicago) are not. Counted by how many packs each state sells, the average is $9.95 ($0.50 each). Packs run from $7.95 (North Carolina) to $14.85 (New York).",
  vape: "Starts at $14.07 a disposable vape: the average price paid for one in US shops and gas stations in the 4 weeks to 3 Sep 2022, counted by sales, from store scanner data for the 48 mainland states, which an industry estimate says captures about 61% of the US market (Diaz and others, Tobacco Control, 2025). Vape shops and online sales are left out, and prices may have changed since.",
  pouches:
    "Starts at $5.69 a can: the price ZYN's maker suggests for one can in the US (Tobacco Insider, posted 12 Sep 2025, September 2025 update; the page's older figure was $5.64). The same page lists single cans online from $3.49.",
}

/** The line for the quit date and cost tools: the basis, then what typing does. */
export const typeOwnPrice = "Type your own price to replace it."
