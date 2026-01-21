import "server-only"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

export function getStripe() {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables."
    )
  }
  return stripe
}
