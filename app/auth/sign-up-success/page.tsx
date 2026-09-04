import { Suspense } from "react"

import SignUpSuccessClient from "./SignUpSuccessClient"

export default function SignUpSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-6 text-muted-foreground">
          Loading...
        </div>
      }
    >
      <SignUpSuccessClient />
    </Suspense>
  )
}
