/** @type {import('next').NextConfig} */
const nextConfig = {
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
