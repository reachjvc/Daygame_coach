"use client"

import Link from "next/link"
import { ArrowLeft, Beaker, BookOpen, FileText, Medal, Sparkles, User, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

const testPages = [
  {
    name: "Marcus Loop",
    href: "/test/marcus-loop",
    description: "Marcus Aurelius animation loop test",
    icon: Video,
  },
  {
    name: "Role Models",
    href: "/test/role-models",
    description: "Role models component testing",
    icon: User,
  },
  {
    name: "Achievements",
    href: "/test/achievements",
    description: "Achievement system testing",
    icon: Medal,
  },
  {
    name: "Values Curation",
    href: "/test/values-curation",
    description: "Values curation flow testing",
    icon: Sparkles,
  },
  {
    name: "Field Reports",
    href: "/test/field-reports",
    description: "Field reports component testing",
    icon: FileText,
  },
  {
    name: "Articles",
    href: "/test/articles",
    description: "Articles system testing",
    icon: BookOpen,
  },
]

export default function TestPagesIndex() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="size-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Beaker className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Test Pages</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Development testing pages for various components and features.
          </p>
        </div>

        {/* Test Pages Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {testPages.map((page) => {
            const Icon = page.icon
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-card/80"
              >
                <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {page.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{page.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
