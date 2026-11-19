import type React from "react"
import { BrandMark, PartBadge } from "@/components/BrandMark"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BRAND } from "@/src/shared/brand"

/**
 * The frame of the five sign-in pages (Plans/rebrand-10kdaysclub.md, Phase 4b):
 * a glow in the umbrella colour behind a large mark, the name in heavy type, and
 * the form on a card with a colour bar on top. Built only from the app's own
 * parts (card, input, button), rule R5 of docs/product/look.md. The pages pass
 * their own title, line and form, so their words and fields stay theirs.
 * `tagline` is W60, shown on sign up and log in only.
 */
export function AuthShell({
  title,
  description,
  tagline = false,
  children,
}: {
  title: React.ReactNode
  description: React.ReactNode
  tagline?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col items-center justify-start overflow-hidden bg-background px-5 pb-10 pt-10 sm:justify-center sm:px-10 sm:py-12">
      {/* the glow: one soft pool of the umbrella colour behind the mark */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[26rem] w-[40rem] max-w-[160vw] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/10 to-transparent" />

      <div className="flex w-full max-w-sm flex-col gap-7">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-[23%] shadow-[0_14px_44px_-6px] shadow-primary/60 ring-1 ring-primary/40">
            <BrandMark size={84} className="block" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground" data-testid="auth-brand-name">
              {BRAND.name}
            </span>
            {tagline && (
              <p className="max-w-[32ch] text-balance text-sm leading-relaxed text-muted-foreground" data-testid="auth-tagline">
                {BRAND.description}
              </p>
            )}
          </div>
          <div aria-hidden="true" className="flex items-center gap-2">
            <PartBadge part="life" size={18} />
            <PartBadge part="quit" size={18} />
            <PartBadge part="dating" size={18} />
          </div>
        </div>

        <Card className="gap-5 overflow-hidden border-primary/30 bg-card/90 pt-0 shadow-xl shadow-primary/10 backdrop-blur sm:gap-6 sm:pt-0 [&_[data-slot=button]]:h-12 [&_[data-slot=button]]:text-base [&_[data-slot=button]]:font-semibold [&_[data-slot=input]]:h-12 [&_[data-slot=input]]:bg-background/60">
          <div aria-hidden="true" className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-primary" />
          <CardHeader className="pt-1">
            <CardTitle className="text-3xl font-bold tracking-tight">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
