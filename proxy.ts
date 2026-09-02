import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Next 16 renamed middleware.ts to proxy.ts. This is the edge guard: it decides
 * who may reach a route at all. It is NOT the data boundary -- RLS is.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  // Use getSession() for fast cookie-based check (no network call)
  // This is acceptable in middleware because:
  // 1. The session token is cryptographically signed
  // 2. Middleware only controls routing, not data access
  // 3. RLS still protects data in API routes
  const { data: { session } } = await supabase.auth.getSession()

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/preferences") ||
    pathname.startsWith("/programs") ||
    pathname.startsWith("/lair") ||
    pathname.startsWith("/qa")

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/auth/login", request.url)
    // Must be `next`: that is the parameter the login page reads to send the
    // user back where they were headed.
    redirectUrl.searchParams.set("next", pathname)
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
    "/api/test/:path*",
  ],
}
