"use client"

import Link from "next/link"
import { CheckCircle2, MessageCircle, TrendingUp, Zap, LayoutDashboard, Target } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AppHeader } from "@/components/AppHeader"
import { CheckoutButton } from "@/src/home/components/CheckoutButton"
import { PRODUCTS } from "@/src/home/products"

interface HomePageProps {
  isLoggedIn?: boolean
  hasPurchased?: boolean
}

export function HomePage({ isLoggedIn = false, hasPurchased = false }: HomePageProps) {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader currentPage="home" isLoggedIn={isLoggedIn} hasPurchased={hasPurchased} />

      {/* Hero Section */}
      <section className="w-full py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-8 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20" variant="outline">
            <Zap className="size-3 mr-1" />
            AI-Powered Training
          </Badge>
          <h1 className="text-balance text-5xl font-bold tracking-tight lg:text-7xl mb-6 text-foreground">
            Master Daygame From <span className="text-primary">Home</span>
          </h1>
          <p className="text-pretty text-xl text-muted-foreground mb-12 mx-auto leading-relaxed">
            Practice your approach and conversation skills with our AI coach. Get real-time feedback, build confidence,
            and improve your social interactions without the pressure.
          </p>

          {/* Hero Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Instant Access */}
            <CheckoutButton productId={PRODUCTS[2].id} className="px-6 py-3 text-base min-h-[44px]" />

            {/* View Pricing */}
            <Button
              variant="outline"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="px-6 py-3 text-base min-h-[44px] border-border text-foreground hover:bg-card bg-transparent"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-8 bg-card/30">
        <div className="mx-auto max-w-6xl px-8">
          <h2 className="text-balance text-3xl font-bold text-center mb-16 text-foreground">
            Why Practice With AI?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 bg-card border-border">
              <MessageCircle className="size-12 text-primary mb-4" />
              <h3 className="font-semibold text-xl mb-3 text-foreground">Realistic Conversations</h3>
              <p className="text-muted-foreground leading-relaxed">
                Practice with AI that responds like real people. Build your conversational skills in a safe environment.
              </p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <Target className="size-12 text-primary mb-4" />
              <h3 className="font-semibold text-xl mb-3 text-foreground">Scenario-Based Training</h3>
              <p className="text-muted-foreground leading-relaxed">
                Choose from various scenarios: coffee shops, parks, bookstores. Practice different approaches and styles.
              </p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <TrendingUp className="size-12 text-primary mb-4" />
              <h3 className="font-semibold text-xl mb-3 text-foreground">Instant Feedback</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get immediate coaching on your openers, conversation flow, and vibe. Learn what works and what doesn't.
              </p>
            </Card>
          </div>

          {/* Preview Dashboard CTA */}
          <Card className="mt-8 p-6 bg-gradient-to-r from-accent/20 via-accent/30 to-accent/20 border-accent/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-accent/30 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="size-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    Curious what's inside?
                  </h3>
                  <p className="text-muted-foreground">
                    Explore our scenarios and see how AI coaching works — no account needed.
                  </p>
                </div>
              </div>
              <Link href="/dashboard">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/80 whitespace-nowrap">
                  Preview Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full py-24">
        <div className="mx-auto max-w-6xl px-8">
          <h2 className="text-balance text-3xl font-bold text-center mb-4 text-foreground">
            Choose Your Plan
          </h2>
          <p className="text-center text-muted-foreground mb-12">All plans include unlimited access. Cancel anytime.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {PRODUCTS.map((product) => (
              <Card
                key={product.id}
                className={`p-8 bg-card border-border relative overflow-hidden flex flex-col justify-between ${
                  product.id === "yearly-subscription" ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* Savings badge */}
                {product.savingsPercentage && (
                  <div className="absolute -top-12 -right-12 w-48 h-48 rotate-45">
                    <div
                      className="bg-accent text-accent-foreground text-[11px] font-bold py-3 text-center shadow-lg"
                      style={{ transform: "translateY(48px)" }}
                    >
                      SAVE {product.savingsPercentage}%
                    </div>
                  </div>
                )}
                {product.id === "yearly-subscription" && (
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground z-10">Best Value</Badge>
                )}

                {/* Indhold */}
                <div className="flex flex-col h-full">
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold mb-2 text-foreground">{product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
                    <div className="text-5xl font-bold mb-2 text-foreground">
                      ${(product.priceInCents / 100).toFixed(0)}
                    </div>
                    <p className="text-muted-foreground">
                      {product.intervalCount > 1 ? `Every ${product.intervalCount} months` : `Per ${product.interval}`}
                    </p>
                    <p className="text-primary text-sm mt-2 font-semibold" style={{ minHeight: "1.25rem" }}>
                      {product.savingsPercentage
                        ? `$${(
                            product.priceInCents /
                            100 /
                            (product.interval === "year" ? 12 : product.intervalCount)
                          ).toFixed(2)}/mo`
                        : null}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="size-6 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Checkout knap nederst */}
                  <CheckoutButton productId={product.id} className="mt-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 bg-primary text-primary-foreground my-12 rounded-lg">
        <div className="mx-auto max-w-6xl px-8 text-center">
          <h2 className="text-balance text-3xl font-bold mb-6">Ready to Build Your Confidence?</h2>
          <p className="text-pretty text-lg mb-8 opacity-90 leading-relaxed">
            Join hundreds of men who are improving their social skills from the comfort of home.
          </p>
          <CheckoutButton productId={PRODUCTS[2].id} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex gap-6 text-sm">
              <Link href="/setup" className="text-muted-foreground hover:text-foreground transition-colors">
                Stripe Setup Guide
              </Link>
              <Link href="/dev" className="text-muted-foreground hover:text-foreground transition-colors">
                Developer Access
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 DayGame Coach - JVC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
