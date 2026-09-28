import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

/**
 * Next 16 renamed middleware.ts to proxy.ts. This is the edge guard: it decides
 * who may reach a route at all. It is NOT the data boundary -- RLS is.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // The /api/test/* routes are unauthenticated sandbox endpoints for the /test
  // pages. They read and write real data, so they must never answer in
  // production. Gated here, in one place, rather than in ten route files.
  if (pathname.startsWith("/api/test/")) {
    const allowed =
      process.env.NODE_ENV !== "production" || process.env.ENABLE_TEST_ROUTES === "true"
    if (!allowed) {
      return new NextResponse(null, { status: 404 })
    }
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  /**
   * `getUser()`, NOT `getSession()`.
   *
   * This read `getSession()` and defended it as "the session token is
   * cryptographically signed". Nothing here checked that signature:
   * `getSession()` decodes the cookie and returns what it says. Supabase logs
   * a warning on every request for exactly that reason, and
   * `app/dashboard/tracking/layout.tsx` went on to cite THIS function as the
   * place the verification had happened.
   *
   * `getUser()` asks the identity provider, so a tampered or expired cookie is
   * refused here rather than downstream, and the refreshed tokens land on
   * `response` through `setAll` above. The cost is one network call per
   * matched request; the routes below still call `requireAuth()` themselves,
   * so this remains defence in depth rather than the only check.
   */
  const { data: { user } } = await supabase.auth.getUser()

  // API routes answer with 401, never a redirect to a login page: a fetch()
  // that receives an HTML login page reports a confusing parse error instead of
  // "you are signed out". Defence in depth — every route below also calls
  // requireAuth() itself.
  // The admin pages are reachable by URL and were never behind the guard. The
  // data they show is protected by an admin key, so nothing leaked — but the
  // pages themselves loaded for anyone who guessed the address.
  if (pathname.startsWith("/admin") && !user) {
    const redirectUrl = new URL("/auth/login", request.url)
    // Same as below: the query string is part of where they were going.
    redirectUrl.searchParams.set("next", pathname + search)
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname.startsWith("/api/timetrack/") && !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/preferences") ||
    pathname.startsWith("/programs") ||
    pathname.startsWith("/lair") ||
    pathname.startsWith("/qa") ||
    // Life Mastery has its own layout gate as well. It is here too because the
    // layout cannot be told WHICH page was asked for, so on its own it sends
    // everybody to the flow's front page; and because a route outside this list
    // never has its sign-in refreshed on the way past.
    pathname.startsWith(LIFE_MASTERY)

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/auth/login", request.url)
    /**
     * Must be `next`: that is the parameter the login page reads to send the
     * user back where they were headed.
     *
     * WITH THE QUERY STRING. This was `pathname` alone, so every route in the
     * app lost it: "?step=today" on the plan, "?tab=week" on tracking. You were
     * returned to the right page and the wrong place in it, having been sent
     * away from a link somebody deliberately sent you. `search` is "" when
     * there is none, so an ordinary path is unchanged.
     */
    redirectUrl.searchParams.set("next", pathname + search)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/preferences/:path*",
    "/programs/:path*",
    "/lair/:path*",
    "/qa/:path*",
    // A literal because Next reads this list at build time and cannot evaluate
    // an import. `tests/unit/navigation/lifeMasteryRoutes.test.ts` asserts it
    // still agrees with LIFE_MASTERY, so a move cannot leave this behind.
    "/life-mastery/:path*",
    "/api/test/:path*",
    "/api/timetrack/:path*",
    "/admin/:path*",
  ],
}
