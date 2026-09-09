import type { MetadataRoute } from "next"

/**
 * What "Add to Home Screen" installs.
 *
 * Without this file the browser has nothing to install: tapping Add to Home
 * Screen makes a bookmark that opens in a browser tab, address bar and all.
 * With it, the app opens standalone, on its own, like an installed app.
 *
 * ONE APP, NOT A TIME APP.
 *
 * This used to install as "Time": name "Daygame Coach — Time", short_name
 * "Time", a description about tracking hours, opening straight to
 * /dashboard/time. The reasoning was that the tracker is the thing people
 * install -- you open it to start a timer, not to browse.
 *
 * In practice that made the install read as a SEPARATE product. A phone
 * browser offers the install by itself once a site has a manifest and icons
 * (no code asks it to), so a visitor to the home page was being offered "Time"
 * -- an app named after one feature, opening on that feature, with the rest of
 * the product apparently somewhere else. `scope` was already the whole site, so
 * everything worked once you were in; it just did not look like one thing.
 *
 * Now it installs as the app: opens on the dashboard, named for the product.
 *
 * KNOWN COST, ACCEPTED. The offline shell in public/sw.js stores exactly one
 * page -- the tracker -- and answers it only at its own address (rule 2 there,
 * written after cached pages started appearing under each other's URLs). So
 * launching the installed app with no connection now lands on /dashboard, which
 * is not stored, and shows the browser's offline page. The tracker still works
 * offline once opened, as before. Making a cold offline launch work would mean
 * warming the dashboard too, which is a change to sw.js and its own job.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daygame Coach",
    // Home screens truncate at roughly 12 characters.
    short_name: "Daygame",
    description: "Practice approaching, track your sessions, and build the habits behind them.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1120",
    theme_color: "#0b1120",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
