import type { Metadata } from "next"
import { Suspense } from "react"

import LoginPageClient from "./LoginPageClient"

export const metadata: Metadata = { title: "Log in" }

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-6 text-muted-foreground">
          Loading...
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  )
}
