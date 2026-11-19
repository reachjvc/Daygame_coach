import { CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { CheckoutButton } from "@/src/home/components/CheckoutButton"
import { PublicShell } from "@/src/home/components/PublicShell"
import { PRODUCTS } from "@/src/home/products"
import { facetFor } from "@/src/shared/facets"
import { ROUTES } from "@/src/shared/routes"

/**
 * PRICES (`/pricing`, Plans/rebrand-10kdaysclub.md, Phase 5; words W40–W43).
 * The plan cards are what the front page used to show at `#pricing`. A
 * subscription unlocks the dating tools, so the cards wear Dating's colour
 * (rule R2: the address the subscription opens); the page itself is the umbrella's.
 */
export function PricingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <PublicShell isLoggedIn={isLoggedIn}>
      <section className="w-full py-16 sm:py-24" data-testid="pricing-page">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h1 className="mb-4 text-balance text-center text-4xl font-bold text-foreground">Prices</h1>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Your plan, Time Log, Training, the audit and the Black Box are free with an account. A subscription unlocks
            the dating tools.
          </p>
          <div className="grid gap-8 md:grid-cols-3" data-facet={facetFor(ROUTES.dating)}>
            {PRODUCTS.map((product) => (
              <Card
                key={product.id}
                data-testid="pricing-plan"
                className={`relative flex flex-col justify-between overflow-hidden border-border bg-card p-8 ${
                  product.id === "yearly-subscription" ? "ring-2 ring-primary" : ""
                }`}
              >
                {product.savingsPercentage && (
                  <div className="absolute -right-12 -top-12 h-48 w-48 rotate-45">
                    <div
                      className="bg-accent py-3 text-center text-[11px] font-bold text-accent-foreground shadow-lg"
                      style={{ transform: "translateY(48px)" }}
                    >
                      SAVE {product.savingsPercentage}%
                    </div>
                  </div>
                )}
                {product.id === "yearly-subscription" && (
                  <Badge className="absolute left-4 top-4 z-10 bg-primary text-primary-foreground">Best Value</Badge>
                )}
                <div className="flex h-full flex-col">
                  <div className="mb-4 text-center">
                    <h2 className="mb-2 text-2xl font-bold text-foreground">{product.name}</h2>
                    <p className="mb-4 text-sm text-muted-foreground">{product.description}</p>
                    <div className="mb-2 text-5xl font-bold text-foreground">${(product.priceInCents / 100).toFixed(0)}</div>
                    <p className="text-muted-foreground">
                      {product.intervalCount > 1 ? `Every ${product.intervalCount} months` : `Per ${product.interval}`}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-primary" style={{ minHeight: "1.25rem" }}>
                      {product.savingsPercentage
                        ? `$${(product.priceInCents / 100 / (product.interval === "year" ? 12 : product.intervalCount)).toFixed(2)}/mo`
                        : null}
                    </p>
                  </div>
                  <ul className="mb-8 space-y-4">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
                        <span className="leading-relaxed text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <CheckoutButton productId={product.id} className="mt-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
