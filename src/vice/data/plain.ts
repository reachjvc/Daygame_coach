/**
 * The two lean front doors.
 *
 * Both are organised by **where a person is**, not by what kind of thing the
 * screen contains. An earlier version grouped by "is something happening now",
 * which put "My card" — a thing you made weeks ago — under the same heading as
 * an urge in progress. That is a filing system, and a filing system is not an
 * answer to "what do I do".
 *
 * The arc, from the research corpus:
 *
 *   1. Not sure there is a problem      → ~95% who met criteria and got no
 *                                          help said they did not think they
 *                                          needed any
 *   2. Thinking about it                → the internal argument, which the
 *                                          corpus says is settled *before* a
 *                                          successful attempt starts
 *   3. Right now, acute                 → an urge, or one that just happened
 *   4. It is going well                 → the hazard window, eight sources
 *   5. Been here before                 → most people who resolve have several
 *                                          attempts behind them
 *   6. Past what a page can do          → always reachable, never buried
 *
 * Things a person *made* (their card, their plans) are their own heading,
 * because they are possessions rather than moments.
 */

export const PLAIN: {
  question: string
  answers: Array<{
    id: string
    label: string
    sub?: string
    tool?: "urge" | "lapse" | "card" | "help" | "voices" | "tripwire" | "again"
    flow?: "where" | "gives" | "map" | "experiment" | "line" | "week"
  }>
  footers: Array<{ id: string; label: string; tool: "card" | "voices" }>
  helpLink: string
} = {
  question: "Where are you?",
  answers: [
    { id: "urge", label: "I want to do it right now", sub: "Ninety seconds. Nothing to set up.", tool: "urge" },
    { id: "lapse", label: "I just did it", sub: "No counter to reset. There is not one.", tool: "lapse" },
    { id: "good", label: "It is going well", sub: "The moment people describe going wrong.", tool: "tripwire" },
    { id: "again", label: "I have tried before", sub: "What was different the time it worked.", tool: "again" },
    { id: "unsure", label: "I do not know if this is a problem", sub: "Fifteen minutes. No label at the end.", flow: "where" },
  ],
  /**
   * Two quiet footers rather than answers, because neither is a reply to
   * "where are you" — but leaving the card out entirely was worse. It is the
   * one thing this module tells people to open at eleven at night, and the
   * most eleven-at-night version of the hub did not offer it.
   */
  footers: [
    { id: "card", label: "My card", tool: "card" as const },
    { id: "voices", label: "What other people did", tool: "voices" as const },
  ],
  helpLink: "If this is past what a page can do",
}

/**
 * The guided version: the same arc, grouped, with what you own kept separate
 * from what is happening to you.
 */
export const GUIDED = {
  doors: [
    {
      id: "now",
      label: "Right now",
      sub: "Minutes, not sessions.",
      items: [
        { id: "urge", label: "An urge, right now", tool: "urge" as const },
        { id: "lapse", label: "I just did it", tool: "lapse" as const },
      ],
    },
    {
      id: "where",
      label: "Where I am with it",
      sub: "Nothing here asks you to decide anything today.",
      items: [
        { id: "learn", label: "Nine things worth understanding", href: "/test/quit-vice/learn" as const },
        { id: "unsure", label: "Whether this is a problem", flow: "where" as const },
        { id: "gives", label: "What it gives me, honestly", flow: "gives" as const },
        { id: "good", label: "It is going well at the moment", tool: "tripwire" as const },
        { id: "again", label: "I have tried before", tool: "again" as const },
        { id: "change", label: "Ways to actually change it", flows: true as const },
      ],
    },
    {
      id: "mine",
      label: "Things I have written",
      sub: "Yours, and they stay on this device.",
      items: [
        { id: "card", label: "My card", tool: "card" as const },
      ],
    },
    {
      id: "others",
      label: "What other people did",
      sub: "Real accounts, and the techniques they name.",
      items: [
        { id: "voices", label: "Accounts and techniques", tool: "voices" as const },
      ],
    },
  ],
  changeIntro: "Four ways, built on positions the research genuinely disagrees about.",
  helpLink: "If this is past what a page can do",
} as const
