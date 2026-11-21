/**
 * QUIT PAGES, OPENED THE WAY PRODUCTION OPENS THEM WHILE A TOOL IS NOT LIVE.
 *
 * `src/quit/menu.ts` hides an addiction until `src/quit/data/live.json` lists
 * it: in a production build (what CI serves) `/quit/nicotine/*` is a 404 and
 * `/quit` shows no link to it, unless the URL carries `?preview=1`. `next dev`
 * shows unfinished files without the flag, which is why these specs once
 * passed locally and failed in CI. Every spec that wants a quit page wraps its
 * address in `quitUrl`, so the page opens the same in both.
 */
import type { Page } from "@playwright/test"
import { isLive } from "../../../src/quit/data"

/** `url` with `preview=1` added, query and hash kept; a url that has it already is returned as is. */
export function quitUrl(url: string): string {
  const hash = url.indexOf("#")
  const base = hash < 0 ? url : url.slice(0, hash)
  const tail = hash < 0 ? "" : url.slice(hash)
  const q = base.indexOf("?")
  if (q >= 0 && new URLSearchParams(base.slice(q + 1)).getAll("preview").includes("1")) return url
  return `${base}${q < 0 ? "?" : "&"}preview=1${tail}`
}

/** Is nicotine listed in live.json, so that `/quit/nicotine` opens with no flag? */
export const NICOTINE_LIVE = isLive("nicotine")

/**
 * Does the server under test hide an addiction that is not live? Only a
 * production build does (CI always serves one; locally set
 * E2E_PRODUCTION_BUILD=1 when PW_BASE_URL points at `next start`).
 */
export const NICOTINE_HIDDEN_WITHOUT_PREVIEW = !NICOTINE_LIVE && (!!process.env.CI || process.env.E2E_PRODUCTION_BUILD === "1")

/**
 * WebKit reports a link prefetch that a navigation or reload cancels as an
 * error, "Fetch API cannot load …?_rsc=… due to access control checks" (a
 * console error or an uncaught one, by version; nightly E2E 44800384257,
 * 44898862680, 44913282918, phone lane). The test's own `page.goto` / reload
 * cancels them: it is not the page's fault.
 */
export const isCancelledPrefetch = (text: string) => /[?&]_rsc=[\s\S]*due to access control checks/.test(text)

/** Everything the page says as an error, console or uncaught, minus WebKit's cancelled prefetches. Read `.errors` when checking. */
export function pageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (m) => m.type() === "error" && !isCancelledPrefetch(m.text()) && errors.push(m.text()))
  page.on("pageerror", (e) => !isCancelledPrefetch(e.message) && errors.push(e.message))
  return errors
}
