import Link from "next/link"
import { ArrowLeft, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createServerSupabaseClient } from "@/src/db/server"
import { InnerGamePage } from "@/src/inner-game"

export default async function DashboardInnerGamePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Preview mode for non-logged-in users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Brain className="size-6 text-primary" />
              <span>Inner Game</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12">
          <InnerGamePage isPreviewMode={true} />
        </main>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed")
    .eq("id", user.id)
    .single()

  // Preview mode for users without subscription
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Brain className="size-6 text-primary" />
              <span>Inner Game</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12">
          <InnerGamePage isPreviewMode={true} />
        </main>
      </div>
    )
  }

  return <InnerGamePage isPreviewMode={false} />
}
