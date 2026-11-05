/**
 * WHOSE PAGE THIS IS (Plans/life-plan-rebuild.md, the account leak).
 *
 * Every tab of a browser shares one sign-in cookie. A `/plan` tab opened for
 * one account and left open while somebody signed in as another in a second
 * tab went on saving with the new cookie: its ticks and ratings landed on the
 * other account's days (the day route finds a part by its local id, and
 * `lm_health` is in every plan), and a first save could start the other
 * account's plan and put this page's whole plan into it.
 *
 * So the page names the account it loaded for on every request, and the
 * server refuses a request whose sign-in is now somebody else's, saying so in
 * a header the page can read without parsing the body.
 *
 * Both sides import these names, so this file holds nothing that runs on only
 * one of them.
 */

/** Sent by the page: the account id it was opened for. */
export const PAGE_ACCOUNT_HEADER = "x-page-account"

/** Sent back with the refusal, so the page can tell it from a stale save (also 409). */
export const ACCOUNT_CHANGED_HEADER = "x-account-changed"
