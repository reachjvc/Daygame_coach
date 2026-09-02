"use client"

import type React from "react"

import { createBrowserSupabaseClient } from "@/src/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Crosshair } from "lucide-react"

/**
 * Reached only via /auth/confirm?next=/auth/reset-password, which has already
 * exchanged the emailed one-time code for a session. So by the time this renders
 * there is a logged-in (recovery) session; if there isn't, the link was stale.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionState, setSessionState] = useState<"checking" | "valid" | "expired">("checking")
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getUser().then(({ data, error }) => {
      setSessionState(!error && data.user ? "valid" : "expired")
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserSupabaseClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // Sign out on purpose: it makes the user prove the new password works, and
      // it kills the recovery session so a link left in browser history is inert.
      await supabase.auth.signOut()
      router.push("/auth/login?reset=1")
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
              <CardTitle className="text-2xl">Set a new password</CardTitle>
              <CardDescription>
                {sessionState === "expired"
                  ? "This link is no longer valid"
                  : "Choose a password you haven't used here before"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionState === "checking" && (
                <p className="text-sm text-muted-foreground">Checking your link...</p>
              )}

              {sessionState === "expired" && (
                <>
                  <p
                    className="text-sm text-muted-foreground mb-6 leading-relaxed"
                    data-testid="reset-expired-message"
                  >
                    Password reset links expire after one hour and can only be used
                    once. Request a new one and it&apos;ll work.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth/forgot-password">Request a new link</Link>
                  </Button>
                </>
              )}

              {sessionState === "valid" && (
                <form onSubmit={handleSubmit} data-testid="reset-form">
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="password">New password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="reset-password-input"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password">Repeat new password</Label>
                      <Input
                        id="repeat-password"
                        type="password"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        data-testid="reset-repeat-input"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-500" data-testid="reset-error-message">
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="reset-submit-button"
                    >
                      {isLoading ? "Saving..." : "Save new password"}
                    </Button>
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
