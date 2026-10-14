/**
 * Settings slice configuration
 *
 * Page addresses live in `src/shared/routes.ts`. This held a second copy of
 * two of them for `revalidatePath`, which is how one of its neighbours came to
 * refresh `/scenarios`, an address that never existed.
 */
import { ROUTES } from "@/src/shared/routes"

export const SETTINGS_CONFIG = {
  // Stripe billing portal return URL
  billingPortalReturnUrl: () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return `${baseUrl}${ROUTES.settings}`
  },
}
