/**
 * Everything the plain version says. All of it fits on one screen.
 *
 * The word budget is the design. The full hub runs to several hundred words
 * before a person can do anything; this is under sixty, because the research
 * on unplanned quit attempts says roughly half of the attempts that work were
 * not planned, and a page that requires reading is shut to those people.
 */
export const PLAIN: {
  question: string
  answers: Array<{
    id: string
    label: string
    sub?: string
    tool?: "urge" | "lapse" | "card" | "help" | "voices" | "tripwire"
    flow?: "where" | "gives" | "map" | "experiment" | "line" | "week"
  }>
  helpLink: string
} = {
  question: "What is going on?",
  answers: [
    { id: "urge", label: "I want to do it right now", sub: "Ninety seconds, nothing to set up.", tool: "urge" as const },
    { id: "lapse", label: "I already did", sub: "No counter to reset. There is not one.", tool: "lapse" as const },
    { id: "good", label: "It is going well, actually", sub: "The moment people describe going wrong.", tool: "tripwire" as const },
    { id: "unsure", label: "I do not know if this is a problem", sub: "Fifteen minutes. No label at the end.", flow: "where" as const },
    { id: "others", label: "I want to read what other people did", sub: "Real accounts and what they tried. Nothing to set up.", tool: "voices" as const },
  ],
  helpLink: "If this is past what a page can do",
}

/**
 * The guided version: two doors, and what is behind each.
 *
 * The organising question is not "which methodology" but "is something
 * happening now, or are you working something out" — which is the only
 * distinction that actually changes what a person needs. Methodology choice
 * sits one level down, where somebody who wants it will find it and everybody
 * else will not have to read it.
 */
export const GUIDED = {
  doors: [
    {
      id: "now",
      label: "Something is happening now",
      sub: "Or it just did.",
      items: [
        { id: "urge", label: "An urge, right now", tool: "urge" as const },
        { id: "lapse", label: "It already happened", tool: "lapse" as const },
        { id: "card", label: "My card", tool: "card" as const },
        { id: "voices", label: "What other people said", tool: "voices" as const },
      ],
    },
    {
      id: "work",
      label: "I want to work something out",
      sub: "Nothing here asks you to decide anything today.",
      items: [
        { id: "where", label: "Whether this is actually a problem", flow: "where" as const },
        { id: "gives", label: "What it gives me, honestly", flow: "gives" as const },
        { id: "change", label: "How to change it", flows: true as const },
        { id: "tripwire", label: "A rule for when it goes well", tool: "tripwire" as const },
      ],
    },
  ],
  changeIntro: "Four ways, built on positions the research genuinely disagrees about.",
  helpLink: "If this is past what a page can do",
}
