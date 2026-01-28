import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Middleware for session refresh and route protection.
 *
 * This middleware:
 * 1. Refreshes the Supabase session on every request
 * 2. Allows preview mode for dashboard routes (non-authenticated users can browse)
 * 3. Protects sensitive routes like settings and QA
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Legacy route alias
  if (pathname === "/QA" || pathname.startsWith("/QA/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard/qa"
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Routes that require authentication (no preview mode)
  const protectedRoutes = ["/dashboard/settings", "/dashboard/qa"]
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Only protect specific routes - allow preview mode for main dashboard and training modules
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
