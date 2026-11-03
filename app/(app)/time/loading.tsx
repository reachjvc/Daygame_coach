import { ROUTES } from "@/src/shared/routes"
import { TrackerLoading } from "@/src/timetrack/components/TrackerLoading"

/**
 * What tapping Time shows while the page asks the auth server who you are.
 *
 * Without this file nothing was drawn until that answer came back — the old
 * page stayed on screen and the tap looked ignored (getting-around #6 in
 * Plans/time-tracker-like-toggl.md). It is the same header the tracker draws
 * while it reads this browser's copy, so the two loading moments look like one.
 * The back control says Dashboard here: where you came from is only known once
 * the tracker itself runs in the browser.
 */
export default function TimeLoading() {
  return <TrackerLoading backHref={ROUTES.dashboard} backLabel="Dashboard" underAppHeader />
}
