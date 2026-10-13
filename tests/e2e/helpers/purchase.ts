/**
 * A FRESH ACCOUNT HAS NOT PAID, AND NOTHING IN THE APP CAN MAKE IT HAVE PAID.
 *
 * Ask Coach (`/dashboard/qa`) sends anyone without `profiles.has_purchased`
 * back to the dashboard, and no route writes that flag: there is no Stripe
 * webhook yet. So a spec that opens Ask Coach grants it here, as the database
 * owner of the LOCAL test backend, on the account it is signed in as. When a
 * real purchase flow exists, a spec should buy through it instead.
 */
import { stackAdmin } from '../fixtures/stack'

export async function grantPurchase(accountId: string): Promise<void> {
  const { data, error } = await stackAdmin()
    .from('profiles')
    .update({ has_purchased: true })
    .eq('id', accountId)
    .select('id')
  if (error) throw new Error(`could not mark account ${accountId} as purchased: ${error.message}`)
  if (!data?.length) throw new Error(`account ${accountId} has no profile row to mark as purchased`)
}
