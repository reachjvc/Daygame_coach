"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Zap, Target, Brain, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type BillingCycle = "monthly" | "bimonthly" | "yearly"

interface Tier {
  name: string
  icon: React.ElementType
  tagline: string
  monthlyPrice: number
  bimonthlyPrice: number
  yearlyPrice: number
  features: string[]
  highlight?: boolean
  accentColor: string
  cta: string
}

const tiers: Tier[] = [
  {
    name: "Free",
    icon: Zap,
    tagline: "Start tracking, build the habit",
    monthlyPrice: 0,
    bimonthlyPrice: 0,
    yearlyPrice: 0,
    accentColor: "#9ca3af",
    cta: "Get Started",
    features: [
      "Unlimited session tracking",
      "Basic field reports (1 template)",
      "3 active goals",
      "Weekly review",
      "Inner game & values flow",
      "Core dashboard stats",
    ],
  },
  {
    name: "Practitioner",
    icon: Target,
    tagline: "For the committed daygamer",
    monthlyPrice: 5,
    bimonthlyPrice: 8,
    yearlyPrice: 48,
    accentColor: "#ff6b35",
    cta: "Upgrade",
    features: [
      "Everything in Free",
      "Unlimited goals & life areas",
      "Custom field report templates",
      "Heatmap & trend analytics",
      "Monthly & quarterly reviews",
      "Data export (CSV / PDF)",
      "Extended milestone badges",
    ],
  },
  {
    name: "Coached",
    icon: Brain,
    tagline: "AI-powered personal coaching",
    monthlyPrice: 13,
    bimonthlyPrice: 22,
    yearlyPrice: 108,
    highlight: true,
    accentColor: "#e63946",
    cta: "Start Coaching",
    features: [
      "Everything in Practitioner",
      "AI scenario roleplay",
      "AI chatbot coach",
      "AI-powered session debrief",
      "AI weekly review insights",
      "Personalized action plans",
      "Approach anxiety exercises",
    ],
  },
  {
    name: "Premium Plus",
    icon: Crown,
    tagline: "Unlimited AI, maximum growth",
    monthlyPrice: 22,
    bimonthlyPrice: 38,
    yearlyPrice: 192,
    accentColor: "#f59e0b",
    cta: "Go Premium",
    features: [
      "Everything in Coached",
      "Unlimited AI conversations",
      "Unlimited scenario sessions",
      "Priority AI response speed",
      "Advanced personality calibration",
      "Voice-mode debrief (coming soon)",
      "Early access to new features",
    ],
  },
]

function formatPrice(price: number) {
  if (price === 0) return "$0"
  return `$${price}`
}

function getEffectiveMonthly(tier: Tier, cycle: BillingCycle) {
  if (tier.monthlyPrice === 0) return 0
  switch (cycle) {
    case "monthly":
      return tier.monthlyPrice
    case "bimonthly":
      return tier.bimonthlyPrice / 2
    case "yearly":
      return tier.yearlyPrice / 12
  }
}

function getSavingsPercent(tier: Tier, cycle: BillingCycle) {
  if (tier.monthlyPrice === 0 || cycle === "monthly") return 0
  const monthly = tier.monthlyPrice
  const effective = getEffectiveMonthly(tier, cycle)
  return Math.round(((monthly - effective) / monthly) * 100)
}

export default function PricingTestPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold text-center">
            Choose Your Path
          </h1>
          <p className="text-muted-foreground text-center mt-2 text-lg">
            From first approach to mastery — pick the plan that fits your game.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-1 mb-10 bg-muted rounded-lg p-1 w-fit mx-auto">
          {(
            [
              { key: "monthly", label: "Monthly" },
              { key: "bimonthly", label: "2 Months" },
              { key: "yearly", label: "Yearly" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCycle(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                cycle === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {key === "yearly" && (
                <span className="ml-1.5 text-xs text-green-400 font-semibold">
                  Best value
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => {
            const Icon = tier.icon
            const effectiveMonthly = getEffectiveMonthly(tier, cycle)
            const savings = getSavingsPercent(tier, cycle)
            const billedAmount =
              cycle === "monthly"
                ? tier.monthlyPrice
                : cycle === "bimonthly"
                  ? tier.bimonthlyPrice
                  : tier.yearlyPrice

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-xl border bg-card p-5 transition-all ${
                  tier.highlight
                    ? "border-2 shadow-lg shadow-accent/10"
                    : "border-border"
                }`}
                style={
                  tier.highlight
                    ? { borderColor: tier.accentColor }
                    : undefined
                }
              >
                {/* Popular badge */}
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className="text-xs px-3 py-0.5"
                      style={{
                        backgroundColor: tier.accentColor,
                        color: "#fff",
                      }}
                    >
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-2.5 mb-3 mt-1">
                  <div
                    className="rounded-md p-1.5"
                    style={{
                      backgroundColor: `${tier.accentColor}20`,
                      color: tier.accentColor,
                    }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">{tier.name}</h2>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {tier.tagline}
                </p>

                {/* Price */}
                <div className="mb-5">
                  {tier.monthlyPrice === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">Free</span>
                      <span className="text-muted-foreground text-sm">
                        forever
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          {formatPrice(
                            Math.round(effectiveMonthly * 100) / 100
                          )}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /mo
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {cycle === "monthly" && "Billed monthly"}
                        {cycle === "bimonthly" &&
                          `${formatPrice(billedAmount)} billed every 2 months`}
                        {cycle === "yearly" &&
                          `${formatPrice(billedAmount)} billed annually`}
                      </div>
                      {savings > 0 && (
                        <div
                          className="text-sm font-medium mt-1"
                          style={{ color: "#22c55e" }}
                        >
                          Save {savings}%
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CTA */}
                <Button
                  className="w-full mb-5 font-semibold"
                  variant={tier.highlight ? "default" : "outline"}
                  style={
                    tier.highlight
                      ? {
                          backgroundColor: tier.accentColor,
                          color: "#fff",
                        }
                      : undefined
                  }
                >
                  {tier.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check
                        className="size-4 mt-0.5 shrink-0"
                        style={{ color: tier.accentColor }}
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 7-day free trial. Cancel anytime.
          <br />
          Prices shown in USD.
        </p>
      </div>
    </div>
  )
}
