/**
 * Is this error "the browser could not fetch a piece of the page's code"
 * (no signal, a dropped connection, a deploy that replaced the file) rather
 * than a bug in the code that did load? Only the first kind may be shown as
 * "probably no signal"; anything else must reach the normal error page.
 *
 * Webpack names its own `ChunkLoadError` / "Loading chunk N failed"; browsers
 * word a failed `import()` themselves: Chrome "Failed to fetch dynamically
 * imported module", Firefox "error loading dynamically imported module",
 * Safari "Importing a module script failed" and a bare "Load failed".
 */
export function isChunkFetchFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === "ChunkLoadError") return true
  const m = error.message
  if (/Loading (CSS )?chunk [^ ]+ failed/i.test(m)) return true
  if (/dynamically imported module|Importing a module script failed/i.test(m)) return true
  return error.name === "TypeError" && /^(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?)$/i.test(m)
}
