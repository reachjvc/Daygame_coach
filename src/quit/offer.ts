import offer from "./data/offer.json"
import type { QuitOffer } from "./types"

export function getOffer(): QuitOffer {
  return offer as QuitOffer
}

/** Nothing shows a buy button while the owner has not set a payment link. */
export function canBuy(): boolean {
  return getOffer().paymentLinkUrl !== null
}
