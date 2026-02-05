/** @type {import('next').NextConfig} */
const nextConfig = {
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
