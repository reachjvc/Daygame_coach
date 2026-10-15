import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isPublicPage, legacyRedirect } from "@/src/shared/routes"

/**
 * Next 16 renamed middleware.ts to proxy.ts. This is the edge guard: it decides
 * who may reach a route at all. It is NOT the data boundary -- RLS is.
 *
 * PRIVATE BY DEFAULT. It used to guard a hand-kept list of address prefixes, so
 * a page outside the list was unguarded here, and moving a page to a new
 * address took it out of the guard unless somebody remembered the list. Now
 * every page is private unless `isPublicPage` (src/shared/routes.ts) says
 * otherwise, and a forgotten page fails closed. Every page that reads data also
 * checks the user itself; this remains defence in depth.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // An address that moved answers with a permanent redirect before anything
  // else, signed in or not, and keeps its query string: a copied time-tracker
  // start link is all query.
  const moved = legacyRedirect(pathname)
  if (moved) return NextResponse.redirect(new URL(moved + search, request.url), 308)

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

  // The home page, sign-in and the lab need no session, and asking the
  // identity provider about one would cost a network call for nothing.
  if (isPublicPage(pathname)) return NextResponse.next()

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
   * `app/(app)/tracking/layout.tsx` went on to cite THIS function as the
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
  // "you are signed out". Defence in depth — every route also calls
  // requireAuth() itself. Only these two API prefixes reach the proxy at all
  // (see the matcher); the rest check the user in their own handlers.
  if (pathname.startsWith("/api/timetrack/") && !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (pathname.startsWith("/api/")) return response

  if (!user) {
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
    // Every page. A literal, because Next reads this list at build time and
    // cannot evaluate an import. Excluded: the API (its handlers check the
    // user themselves, and a getUser() per call would add a network call to
    // each), everything Next serves for itself (`/_next/`, and `__nextjs` in
    // development), and the files in public/ by their extension, plus /sw.js
    // and /manifest.webmanifest. By extension and not "anything with a dot":
    // that rule let `/tracking/session/a.b` past the guard, which is how
    // "private by default" quietly stops being true. A flat list, because the
    // matcher's path syntax refuses nested groups.
    "/((?!api/|_next/|__nextjs|.*\\.jpg$|.*\\.jpeg$|.*\\.png$|.*\\.gif$|.*\\.webp$|.*\\.svg$|.*\\.ico$|.*\\.mp4$|.*\\.pkl$|.*\\.json$|.*\\.js$|.*\\.css$|.*\\.map$|.*\\.txt$|.*\\.xml$|.*\\.webmanifest$).*)",
    "/api/test/:path*",
    "/api/timetrack/:path*",
  ],
}
