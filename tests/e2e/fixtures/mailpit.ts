/**
 * THE TEST BACKEND'S INBOX.
 *
 * The local stack hands every email its auth service sends — signup
 * confirmations, password resets — to Mailpit instead of the internet
 * (tests/db/supabase/config.toml, `[local_smtp]`). Reading it is what lets a
 * signup or a reset be tested end to end: the spec clicks the link a person
 * would click, not a link it built itself.
 *
 * Each test addresses its own fresh account, so a search by recipient finds
 * that test's mail and nobody else's; nothing here ever empties the inbox.
 */
import { expect } from '@playwright/test'
import { testStackEnv } from './stack'

export interface Email {
  id: string
  subject: string
  text: string
  html: string
}

interface Summary {
  ID: string
  Subject: string
}

async function mailpit<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(new URL(pathAndQuery, testStackEnv().MAILPIT_URL))
  if (!res.ok) throw new Error(`Mailpit ${pathAndQuery} answered ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

/**
 * The newest email to `to` (whose subject matches, if given), waiting for it
 * to arrive. Fails naming the address when nothing comes.
 */
export async function waitForEmail(
  to: string,
  options: { subject?: RegExp; timeout?: number } = {},
): Promise<Email> {
  let found: Summary | undefined
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}"`)
        const { messages } = await mailpit<{ messages: Summary[] }>(`/api/v1/search?query=${query}`)
        // newest first
        found = messages.find((m) => !options.subject || options.subject.test(m.Subject))
        return Boolean(found)
      },
      { timeout: options.timeout ?? 15000, message: `no email to ${to} arrived in the test backend's inbox` },
    )
    .toBe(true)
  const full = await mailpit<{ ID: string; Subject: string; Text: string; HTML: string }>(
    `/api/v1/message/${found!.ID}`,
  )
  return { id: full.ID, subject: full.Subject, text: full.Text, html: full.HTML }
}

/** The first link in an email whose address matches `pattern`, with HTML entities decoded. */
export function linkIn(email: Email, pattern: RegExp = /./): string {
  const links = [...email.html.matchAll(/href="([^"]+)"/g), ...email.text.matchAll(/(https?:\/\/\S+)/g)]
    .map((m) => m[1].replace(/&amp;/g, '&'))
    .filter((href) => pattern.test(href))
  if (!links.length) throw new Error(`"${email.subject}" holds no link matching ${pattern}`)
  return links[0]
}
