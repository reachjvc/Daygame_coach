"use client"

import type React from "react"

import { createBrowserSupabaseClient } from "@/src/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { Crosshair } from "lucide-react"

/**
 * "Check your email" -- and a way out when the email never arrives.
 *
 * Without the resend button this page is a dead end: the only other route is to
 * sign up again, which now correctly answers "you already have an account".
 * Mail goes missing often enough (spam folders, delays, typos) that this is the
 * single most likely place for a new user to get stuck.
 *
 * The address arrives as ?email= from the signup form. When it is missing --
 * someone bookmarked the page, or came back later -- ask for it rather than
 * calling resend with an empty string.
 */
export default function SignUpSuccessClient() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [sent, setSent] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserSupabaseClient()
    setIsLoading(true)
    setError(null)
    setSent(false)

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/redirect`,
      },
    })

    // Same split as /auth/forgot-password, deliberately: a 429 is safe to show
    // because Supabase applies the cooldown whether or not the account exists,
    // and hiding it would tell the user mail is coming when none was sent.
    // Anything else stays generic, so this cannot be used to test which
    // addresses are registered.
    if (error) {
      console.error("[sign-up-success] resend", error.message)
      if (error.status === 429) {
        setRateLimited(true)
        setIsLoading(false)
        return
      }
    }

    setRateLimited(false)
    setSent(true)
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 font-semibold text-xl mb-4">
            <Crosshair className="size-6 text-primary" />
            <span>DayGame Coach</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>We&apos;ve sent you a confirmation link</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Click the link in the email to activate your account. It can take a
                minute or two to arrive — <strong>check your spam folder</strong> if
                you don&apos;t see it.
              </p>

              <form onSubmit={handleResend} data-testid="resend-form">
                <div className="flex flex-col gap-4">
                  {!searchParams.get("email") && (
                    <div className="grid gap-2">
                      <Label htmlFor="resend-email">Your email</Label>
                      <Input
                        id="resend-email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="resend-email-input"
                      />
                    </div>
                  )}

                  {sent && (
                    <p className="text-sm text-muted-foreground" data-testid="resend-sent-message">
                      Sent again. If an account is waiting to be confirmed, the link
                      is on its way.
                    </p>
                  )}

                  {rateLimited && (
                    <p
                      className="text-sm text-amber-600 dark:text-amber-500"
                      data-testid="resend-rate-limited-message"
                    >
                      You already asked for a link a moment ago. Check your inbox and
                      your spam folder, or wait a minute and try again.
                    </p>
                  )}

                  {error && (
                    <p className="text-sm text-red-500" data-testid="resend-error-message">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="resend-submit-button"
                  >
                    {isLoading ? "Sending..." : "Didn't get it? Send it again"}
                  </Button>
                </div>
              </form>

              <Button asChild className="w-full mt-3">
                <Link href="/auth/login">Back to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
