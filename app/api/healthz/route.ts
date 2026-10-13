import { NextResponse } from "next/server"

import { requestIsHttps } from "@/src/db/authCookies"
import { databaseAnswers } from "@/src/db/readinessProbe"

/**
 * IS THIS SERVER UP, WHICH COMMIT IS IT, AND DOES IT REACH ITS DATABASE?
 *
 * `infra/deploy.sh` keeps a new image only when this answers 200 with the
 * image's own commit as `buildId`. The Docker HEALTHCHECK and the external
 * uptime monitor ask it too. Not the health-tracking feature, which is
 * `app/api/health/`.
 *
 * Public on purpose, so it holds nothing worth hiding: no error text, no
 * configuration, no secret. `proxy.ts`'s matcher does not cover it, so no
 * session is needed or refreshed. `proto` is what `requestIsHttps()` concludes
 * from the proxy's `x-forwarded-proto`, which is how a deploy proves Caddy is
 * really in front: through Caddy it must say "https".
 */
export async function GET(request: Request) {
  const dbAnswers = await databaseAnswers()
  return NextResponse.json(
    {
      status: dbAnswers ? "ok" : "unavailable",
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
      db: dbAnswers ? "ok" : "unreachable",
      proto: requestIsHttps(request.headers) ? "https" : "http",
    },
    { status: dbAnswers ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  )
}
