export interface Product {
  id: string
  priceId: string // Stripe Price ID for subscriptions
  name: string
  description: string
  priceInCents: number
  interval: "month" | "year"
  intervalCount: number
  features: string[]
  savingsPercentage?: number // For displaying savings badge
}

export const PRODUCTS: Product[] = [
  {
    id: "monthly-subscription",
    priceId: "price_1SjGjVDSMmgdhmKw1v3oHB4m",
    name: "Monthly Plan",
    description: "Perfect for getting started",
    priceInCents: 2000, // $20.00
    interval: "month",
    intervalCount: 1,
    features: [
      "Unlimited practice sessions",
      "Realistic conversation scenarios",
      "Personalized feedback",
      "Progress tracking",
      "Available 24/7",
    ],
  },
  {
    id: "bimonthly-subscription",
    priceId: "price_1SjGjvDSMmgdhmKwGQyJIkd6",
    name: "2-Month Plan",
    description: "Best for committed learners",
    priceInCents: 3500, // $35.00 for 2 months
    interval: "month",
    intervalCount: 2,
    savingsPercentage: 12.5, // Save 12.5% vs monthly ($17.50/mo vs $20/mo)
    features: [
      "Unlimited practice sessions",
      "Realistic conversation scenarios",
      "Personalized feedback",
      "Progress tracking",
      "Available 24/7",
      "Save 12.5% vs monthly",
    ],
  },
  {
    id: "yearly-subscription",
    priceId: "price_1SjGkCDSMmgdhmKwKm3DzBNl",
    name: "Yearly Plan",
    description: "Maximum value for serious improvement",
    priceInCents: 13500, // $135.00 for 12 months
    interval: "year",
    intervalCount: 1,
    savingsPercentage: 43.75, // Save 43.75% vs monthly ($11.25/mo vs $20/mo)
    features: [
      "Unlimited practice sessions",
      "Realistic conversation scenarios",
      "Personalized feedback",
      "Progress tracking",
      "Available 24/7",
      "Save 43.75% vs monthly",
    ],
  },
]
