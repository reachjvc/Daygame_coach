"use client"

import type React from "react"

import { createBrowserSupabaseClient } from "@/src/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { checkPassword, isWeakPasswordError } from "@/src/shared/passwordRules"
import { Crosshair } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [existingAccount, setExistingAccount] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createBrowserSupabaseClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    // Same rules the server enforces, checked here so the user is not told
    // after a round-trip. src/shared/passwordRules.ts owns the wording.
    const weak = checkPassword(password)
    if (weak) {
      setError(weak)
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Must land on /auth/confirm: the link carries a one-time code that has
          // to be exchanged for a session before any protected page will load.
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/redirect`,
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) throw error
      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email)}`)
    } catch (error: unknown) {
      // Supabase says "User already registered", which reads like a failure
      // rather than a next step. It is the single most likely thing to happen
      // to someone who signed up months ago and forgot -- so say what to do
      // about it, and let the buttons below do it.
      const message = error instanceof Error ? error.message : "An error occurred"
      if (isWeakPasswordError(message)) {
        // Never show Supabase's version of this: it prints the alphabet.
        setError(checkPassword(password) ?? "Choose a longer password with a capital letter and a number.")
        setIsLoading(false)
        return
      }
      if (/already\s*registered|already\s*exists/i.test(message)) {
        setExistingAccount(true)
        setError(null)
      } else {
        setError(message)
      }
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
              <CardTitle className="text-2xl">Sign up</CardTitle>
              <CardDescription>Create a new account to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} data-testid="signup-form">
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      data-testid="signup-fullname-input"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setExistingAccount(false)
                      }}
                      data-testid="signup-email-input"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="signup-password-input"
                    />
                    {password.length > 0 && checkPassword(password) && (
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid="signup-password-hint"
                      >
                        {checkPassword(password)}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Repeat Password</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      data-testid="signup-repeat-password-input"
                    />
                  </div>
                  {existingAccount && (
                    <div
                      className="rounded-md bg-muted p-3 text-sm"
                      data-testid="signup-existing-account"
                    >
                      <p className="mb-3 leading-relaxed">
                        You already have an account with that email.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/auth/login?email=${encodeURIComponent(email)}`}
                          className="underline underline-offset-4 font-medium"
                          data-testid="signup-existing-login-link"
                        >
                          Log in instead
                        </Link>
                        <Link
                          href="/auth/forgot-password"
                          className="underline underline-offset-4 text-muted-foreground"
                          data-testid="signup-existing-reset-link"
                        >
                          Forgot your password?
                        </Link>
                      </div>
                    </div>
                  )}
                  {error && <p className="text-sm text-red-500" data-testid="signup-error-message">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="signup-submit-button">
                    {isLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Login
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
