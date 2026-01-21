/**
 * Settings slice configuration
 */

export const SETTINGS_CONFIG = {
  // Paths for revalidation
  paths: {
    settings: "/dashboard/settings",
    dashboard: "/dashboard",
  },

  // Stripe billing portal return URL
  billingPortalReturnUrl: () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return `${baseUrl}/dashboard/settings`
  },
}
