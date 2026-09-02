"use client"

import type React from "react"

import { createBrowserSupabaseClient } from "@/src/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { safeNextPath } from "@/src/shared/safeRedirect"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Crosshair } from "lucide-react"

/** Messages for the ?error= codes set by /auth/confirm. */
const NOTICES: Record<string, string> = {
  missing_code:
    "That confirmation link was incomplete. Try opening it again from your email, or request a new one.",
  confirm_failed:
    "That link has expired or was already used. Confirmation links work once, within an hour.",
}

export default function LoginPageClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const notice = NOTICES[searchParams.get("error") ?? ""]
  const justReset = searchParams.get("reset") === "1"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserSupabaseClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const next = searchParams.get("next")
      const redirectUrl = next
        ? `/redirect?next=${encodeURIComponent(safeNextPath(next))}`
        : "/redirect"
      router.push(redirectUrl)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
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
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>Enter your email below to login to your account</CardDescription>
            </CardHeader>
            <CardContent>
              {justReset && (
                <p
                  className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary"
                  data-testid="login-reset-success"
                >
                  Your password has been changed. Log in with the new one.
                </p>
              )}
              {notice && (
                <p
                  className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  data-testid="login-notice-message"
                >
                  {notice}
                </p>
              )}
              <form onSubmit={handleLogin}>
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
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm underline underline-offset-4 text-muted-foreground"
                        data-testid="login-forgot-link"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="login-password-input"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500" data-testid="login-error-message">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="login-submit-button"
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
