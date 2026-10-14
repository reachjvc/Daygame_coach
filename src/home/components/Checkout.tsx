"use client"

import Link from "next/link"
import { ROUTES } from "@/src/shared/routes"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PRODUCTS } from "@/src/home/products"

export function Checkout({ productId }: { productId: string }) {
  const product = PRODUCTS.find((p) => p.id === productId)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{product?.name ?? "Selected plan"}</p>
            <p className="text-sm text-muted-foreground">
              Payments/Stripe are not migrated in the new project yet. Create an account and we’ll enable billing next.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/auth/sign-up">Continue</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={ROUTES.coach}>Skip to Q&A</Link>
        </Button>
      </div>
    </div>
  )
}
