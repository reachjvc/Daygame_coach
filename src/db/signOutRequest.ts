/**
 * Ask the server to end this session (POST /api/auth/sign-out). A plain
 * fetch, not a server action: see the route for why. Rejects when the server
 * cannot be reached; callers decide what that means.
 */
export async function signOut(): Promise<{ ok: boolean }> {
  const response = await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" })
  if (!response.ok) return { ok: false }
  return (await response.json().catch(() => ({ ok: false }))) as { ok: boolean }
}
