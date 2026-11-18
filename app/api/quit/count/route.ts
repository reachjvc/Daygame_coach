import { COUNT_MAX_BYTES, parseCount } from "@/src/quit/countValidate"

/**
 * Counts a step of a quit tool. Until Phase 8 adds the table this validates and
 * stores nothing. No cookies, no IP, no logging of the body.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0")
  if (declared > COUNT_MAX_BYTES) return new Response(null, { status: 413 })

  const text = await request.text()
  if (new TextEncoder().encode(text).length > COUNT_MAX_BYTES) return new Response(null, { status: 413 })

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!parseCount(body)) return new Response(null, { status: 400 })
  return new Response(null, { status: 204 })
}
