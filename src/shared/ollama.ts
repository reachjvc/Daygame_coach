/**
 * WHERE OLLAMA ANSWERS, OR A SENTENCE SAYING IT IS NOT CONFIGURED.
 *
 * Both the Q&A slice and value inference call a local Ollama. They used to
 * default to http://localhost:11434 when OLLAMA_API_URL was unset, so a server
 * without Ollama sent the request to itself and failed with a connection error
 * that named neither Ollama nor the setting. There is no default now: unset,
 * the feature says so when it is used. scripts/check-runtime-env.mjs lists the
 * variable as optional.
 */
export function ollamaBaseUrl(): string {
  const url = process.env.OLLAMA_API_URL?.trim()
  if (!url) throw new Error("Ollama is not configured: OLLAMA_API_URL is not set.")
  return url
}
