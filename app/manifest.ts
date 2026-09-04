import type { MetadataRoute } from "next"

/**
 * What "Add to Home Screen" installs.
 *
 * Without this file the browser has nothing to install: tapping Add to Home
 * Screen makes a bookmark that opens in a browser tab, address bar and all.
 * With it, the app opens standalone, on its own, like an installed app.
 *
 * `start_url` is the tracker rather than the dashboard because the tracker is
 * the thing people install — you open it to start a timer, not to browse.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daygame Coach — Time",
    short_name: "Time",
    description: "Track your time, see where it goes, and get it back.",
    start_url: "/dashboard/time",
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
