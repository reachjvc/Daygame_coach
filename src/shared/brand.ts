/**
 * The product's name in one place (Plans/rebrand-10kdaysclub.md, Phase 1).
 * Every page title, header, install name and share card reads it from here,
 * so a later rename is one edit.
 */
export const BRAND = {
  name: "10K Days Club",
  short: "10K Days",
  domain: "10kdaysclub.com",
  /** W1: the site description, the link-preview line and the line under the logo on sign-in. */
  description: "Plan the life you want, build the habits, quit what holds you back and get better at dating. One day at a time.",
} as const

/** Where the site lives until the real domain is set up (Plan Phase 8): the base for absolute metadata addresses. */
export const LIVE_URL_UNTIL_DOMAIN = "https://daygame-coach.vercel.app"
