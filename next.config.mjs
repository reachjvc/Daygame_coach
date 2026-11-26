/* global process */
// This file runs in Node at build time, not in a browser, so `process` is real
// here. Declared explicitly because the lint config assumes a browser by default.
import { buildId } from "./scripts/build-id.mjs"

/**
 * SELF-HOSTED BUILDS ONLY, so Vercel's build stays exactly as it is while it is
 * still production. `infra/Dockerfile` sets NEXT_OUTPUT=standalone.
 *
 * - `output: "standalone"` copies only the files the server needs into
 *   `.next/standalone`, with a `server.js` to run instead of `next start`.
 * - `isrFlushToDisk: false` keeps regenerated pages in memory. The container's
 *   filesystem is read-only, and Next would otherwise try to write them into
 *   the image. Prerendered pages are still read from `.next/server` as before.
 */
const selfHosted =
  process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone", experimental: { isrFlushToDisk: false } }
    : {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...selfHosted,
  env: {
    // Which commit this is, for crash reports, the offline store and
    // /api/healthz. scripts/build-id.mjs explains the rules.
    NEXT_PUBLIC_BUILD_ID: buildId(),
  },
  // Lets a second instance run without fighting the first for .next/dev/lock —
  // e.g. a verification server on another port while `npm run dev` keeps going.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: {
    // Type checking runs in CI (npm test) — skip during build to avoid
    // test page type errors blocking production deploys
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  /**
   * THE ROOT LAYOUT'S ROUTER IMPORT MUST USE THE APP-PAGE CONTEXT (live 500).
   *
   * src/shared/HistoryBarrierContext.tsx imports AppRouterContext from
   * "next/dist/shared/lib/app-router-context.shared-runtime". Next's own
   * server-side rewrite of `.shared-runtime` imports only matches relative
   * requests ("./x.shared-runtime"), so this absolute one is left as a plain
   * external `require()`. At run time Next's require hook sends any such
   * require to the PAGES-router copy (route-modules/pages/vendored/contexts),
   * which loads pages.runtime.prod.js and, through it, root react. Vercel's
   * file trace includes neither, so every dynamic page threw "Cannot find
   * module". For the server SSR/RSC layers, require the app-page copy instead
   * (the one Next picks for its own imports there). It does not end in
   * `.shared-runtime`, so the hook leaves it alone, and the file trace finds
   * it. The browser build is untouched. The function is async because webpack
   * only reads a Promise result from an externals function; a plain return
   * value is ignored and the build silently never finishes.
   */
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime === "nodejs" && Array.isArray(config.externals)) {
      config.externals.unshift(async ({ request, contextInfo }) => {
        const layer = contextInfo?.issuerLayer
        if (
          request === "next/dist/shared/lib/app-router-context.shared-runtime" &&
          (layer === "ssr" || layer === "rsc")
        ) {
          return "commonjs next/dist/server/route-modules/app-page/vendored/contexts/app-router-context"
        }
      })
    }
    return config
  },
  /**
   * THE DEV BUBBLE SAT ON A TAB PEOPLE TAP.
   *
   * At 390px `elementFromPoint` over the time tracker's "Timer" tab returned
   * the Next.js dev-tools circle, not the button — and this machine's
   * localhost:3000 is where the product is actually used, so that tab was
   * unreachable with a thumb. Every corner collides with something at that
   * width: top-left is "← Dashboard", top-right the bell and the sync badge,
   * bottom the tab bar itself.
   *
   * Turning it off costs the route-type indicator and nothing else — compile
   * and runtime errors still surface. Set it back to `{ position: "top-right" }`
   * if that indicator is ever wanted on a wide screen.
   */
  devIndicators: false,
  /**
   * NO AGENTS.md. `next dev` otherwise writes (and re-writes) an AGENTS.md
   * holding the same "read node_modules/next/dist/docs" note that CLAUDE.md
   * already carries. Claude Code reads CLAUDE.md, so the second copy was noise.
   */
  agentRules: false,
  turbopack: {
    resolveAlias: {
      // Prevent Node.js-only ONNX runtime from being bundled (used by @huggingface/transformers)
      // The browser version (onnxruntime-web) is used instead in client components
      "onnxruntime-node": "",
      "sharp": "",
    },
  },
}

export default nextConfig
