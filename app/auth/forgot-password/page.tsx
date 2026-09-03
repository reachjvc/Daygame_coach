"use client"

import type React from "react"

import { createBrowserSupabaseClient } from "@/src/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { Crosshair } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserSupabaseClient()
    setIsLoading(true)
    setError(null)

    // The recovery link goes through /auth/confirm, the same route the signup
    // confirmation uses. One place exchanges the one-time code for a session.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/reset-password`,
    })

    // Two kinds of failure, and only one of them is safe to show.
    //
    // "No such account" must never be surfaced: it would turn this form into a
    // way to test which email addresses are registered. Success and
    // not-registered therefore look identical.
    //
    // Being rate limited is different. It says nothing about whether the
    // account exists -- Supabase applies the cooldown either way -- and hiding
    // it actively misleads: the user is told an email is on its way when none
    // was sent. Verified against the live project: a second request inside the
    // cooldown returns 429 and no mail is sent.
    if (error) {
      console.error("[forgot-password]", error.message)
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
              <CardTitle className="text-2xl">Reset your password</CardTitle>
              <CardDescription>
                {sent ? "Check your email" : "We'll email you a link to set a new one"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <>
                  <p
                    className="text-sm text-muted-foreground mb-6 leading-relaxed"
                    data-testid="forgot-success-message"
                  >
                    If an account exists for that address, we&apos;ve sent it a link to
                    set a new password. The link expires in one hour.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth/login">Back to Login</Link>
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSubmit} data-testid="forgot-form">
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="forgot-email-input"
                      />
                    </div>
                    {rateLimited && (
                      <p
                        className="text-sm text-amber-600 dark:text-amber-500"
                        data-testid="forgot-rate-limited-message"
                      >
                        You already asked for a link a moment ago. Check your
                        inbox and your spam folder, or wait a minute and try again.
                      </p>
                    )}
                    {error && (
                      <p className="text-sm text-red-500" data-testid="forgot-error-message">
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="forgot-submit-button"
                    >
                      {isLoading ? "Sending..." : "Send reset link"}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    Remembered it?{" "}
                    <Link href="/auth/login" className="underline underline-offset-4">
                      Login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
