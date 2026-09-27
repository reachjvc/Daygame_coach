/* global process */
// This file runs in Node at build time, not in a browser, so `process` is real
// here. Declared explicitly because the lint config assumes a browser by default.
import { execSync } from "node:child_process"

/**
 * Which build this is, so a crash report can say which version it came from.
 *
 * Without it every build calls itself "dev", and a fault you fixed three
 * deploys ago goes on incrementing the same row forever — which makes the
 * "how often does this happen" number meaningless, and it is the number you
 * would use to decide what to fix first.
 *
 * Vercel provides the commit; locally we ask git. If neither answers we say
 * "unknown" rather than pretending, because a wrong version label is worse
 * than an absent one.
 */
function buildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
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
