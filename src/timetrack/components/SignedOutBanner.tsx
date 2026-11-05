"use client"

/**
 * "You have been signed out": said above every screen of the tracker, on the
 * PC and on the phone, with the way back in. Nothing is lost while it shows.
 */

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/src/shared/routes"

export function SignedOutBanner({ pending }: { pending: number }) {
  return (
    <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4">
      <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center">
        <p className="flex-1">
          <strong>You have been signed out.</strong> Nothing is lost — everything you have done is saved in
          this browser
          {pending > 0 && <>, including {pending} change{pending === 1 ? "" : "s"} waiting to be saved to your account</>}
          . Sign in again to carry on where you left off.
        </p>
        <Button size="sm" asChild>
          <Link href={`/auth/login?next=${encodeURIComponent(typeof window === "undefined" ? ROUTES.time : window.location.pathname)}`}>
            Sign in again
          </Link>
        </Button>
      </div>
    </div>
  )
}
