/**
 * THE EMAIL HALF OF SIGNING UP AND RESETTING A PASSWORD, ON THE TEST BACKEND.
 *
 * The local auth service mails every link to Mailpit (fixtures/mailpit.ts), so
 * a spec can sign up, wait for the email a person would get and open the link
 * in it — the whole flow, with nothing stubbed. Every address here is new, so
 * the inbox search finds this test's mail and nobody else's.
 */
import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { linkIn, waitForEmail } from '../fixtures/mailpit'
import { stackAdmin } from '../fixtures/stack'
import type { Credentials } from '../fixtures/test'

/** An address no other test, worker or run uses. Safe to print. */
export function freshAddress(label: string): string {
  return `e2e-${label}-${randomUUID()}@test.local`
}

/**
 * A password the app's own rules accept (src/shared/passwordRules.ts: eight
 * characters, a lowercase letter, a capital, a number). Type it with
 * `fillSecret`, never `fill`, and never print it.
 */
export function strongPassword(): string {
  return `Aa1-${randomUUID()}`
}

/**
 * An account that signed up and never clicked its link: it exists, and the
 * auth service refuses to sign it in ("Email not confirmed"). Made through the
 * admin API, which sends no email, so its first email is the one the test asks
 * for.
 */
export async function createUnconfirmedAccount(label: string): Promise<Credentials> {
  const email = freshAddress(label)
  const password = strongPassword()
  const { data, error } = await stackAdmin().auth.admin.createUser({ email, password, email_confirm: false })
  if (error || !data.user) throw new Error(`could not create the unconfirmed account ${email}: ${error?.message}`)
  return { id: data.user.id, email, password }
}

export interface EmailedLink {
  /** The link as it is in the email: the auth service's verify address. */
  href: string
  /** Where the auth service will send the browser once the link is opened. */
  redirectTo: string
}

/**
 * The newest auth link mailed to `to` of this kind, waiting for it to arrive.
 * `signup` is a confirmation (first send or a resend), `recovery` a password
 * reset.
 */
export async function emailedAuthLink(to: string, type: 'signup' | 'recovery'): Promise<EmailedLink> {
  const email = await waitForEmail(to)
  const href = linkIn(email, new RegExp(`/auth/v1/verify\\?.*type=${type}`))
  return { href, redirectTo: new URL(href).searchParams.get('redirect_to') ?? '' }
}

/**
 * Opens an emailed link the way a person does, and says where the browser
 * ended up — path and query, so a failure reads `/auth/login?error=…`. Every
 * hop (the auth service's verify, /auth/confirm, /redirect) is a server
 * redirect, so the address is settled once the navigation is.
 */
export async function openEmailedLink(page: Page, link: EmailedLink): Promise<string> {
  await page.goto(link.href, { timeout: 15000 })
  const landed = new URL(page.url())
  return `${landed.pathname}${landed.search}`
}
