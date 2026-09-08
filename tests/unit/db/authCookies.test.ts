/**
 * The session cookie's flags, and the guarantee that nobody writes it without them.
 *
 * A cookie written without `secure` can be sent over an unencrypted connection,
 * where anyone on the same network can copy it and be signed in as that user.
 * The flags live in one module; these tests are what stops a new Supabase client
 * from quietly being created without them.
 */

import { describe, test, expect, vi, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  authCookieOptions,
  browserAuthCookieOptions,
  requestIsHttps,
} from '../../../src/db/authCookies'

const projectRoot = path.resolve(__dirname, '../../..')
const headers = (value?: string) => ({ get: () => value ?? null })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the flags themselves', () => {
  test('an encrypted connection gets Secure, so the cookie never travels in the clear', () => {
    expect(authCookieOptions(true).secure).toBe(true)
  })

  test('a plain http connection does not, because the browser would refuse to store it', () => {
    // Safari/WebKit drops a Secure cookie set over http://localhost outright,
    // and the end-to-end suite runs a production build on exactly that.
    expect(authCookieOptions(false).secure).toBe(false)
  })

  test('httpOnly stays false on purpose - the browser client reads this cookie', () => {
    // Flipping this to true signs every user out on the client side.
    // See the comment in src/db/authCookies.ts before changing it.
    expect(authCookieOptions(true).httpOnly).toBe(false)
  })

  test('sameSite lax, path / - a cross-site form post cannot ride the session', () => {
    expect(authCookieOptions(true).sameSite).toBe('lax')
    expect(authCookieOptions(true).path).toBe('/')
  })
})

describe('deciding whether the connection is encrypted', () => {
  test('a browser reads its own address bar', () => {
    vi.stubGlobal('window', { location: { protocol: 'https:' } })
    expect(browserAuthCookieOptions().secure).toBe(true)

    vi.stubGlobal('window', { location: { protocol: 'http:' } })
    expect(browserAuthCookieOptions().secure).toBe(false)
  })

  test('a server believes the proxy in front of it', () => {
    expect(requestIsHttps(headers('https'))).toBe(true)
    expect(requestIsHttps(headers('http'))).toBe(false)
  })

  test('no header means no proof of encryption, so no Secure flag', () => {
    // A bare `next start` on http sets nothing, and http is the right answer.
    expect(requestIsHttps(headers())).toBe(false)
  })

  test('chained proxies send a list; the first hop is the user\'s own', () => {
    expect(requestIsHttps(headers('https, http'))).toBe(true)
    expect(requestIsHttps(headers('http, https'))).toBe(false)
    expect(requestIsHttps(headers(' HTTPS '))).toBe(true)
  })
})

describe('every Supabase client that writes cookies passes the flags', () => {
  function sourceFiles(dir: string): string[] {
    const out: string[] = []
    const full = path.join(projectRoot, dir)
    if (!fs.existsSync(full)) return out
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const rel = path.join(dir, entry.name)
      if (entry.isDirectory()) out.push(...sourceFiles(rel))
      else if (/\.tsx?$/.test(entry.name)) out.push(rel)
    }
    return out
  }

  /** Calls, not imports: the name has to be followed by an opening bracket. */
  const CREATES = /create(?:Supabase)?(?:Server|Browser)Client\s*\(/g

  test('finds the clients at all', () => {
    // A guard that has stopped matching anything passes silently forever.
    const found = [...sourceFiles('src'), ...sourceFiles('app'), ...sourceFiles('components')]
      .filter((rel) => {
        const c = fs.readFileSync(path.join(projectRoot, rel), 'utf8')
        return /from\s+["']@supabase\/ssr["']/.test(c) && (c.match(CREATES) ?? []).length > 0
      })

    expect(found).toContain('src/db/supabase.ts')
    expect(found).toContain('src/db/supabase-client.ts')
  })

  test('no createServerClient/createBrowserClient call site omits cookieOptions', () => {
    const offenders: string[] = []

    for (const rel of [...sourceFiles('src'), ...sourceFiles('app'), ...sourceFiles('components')]) {
      const content = fs.readFileSync(path.join(projectRoot, rel), 'utf8')
      if (!/from\s+["']@supabase\/ssr["']/.test(content)) continue

      const callCount = (content.match(CREATES) ?? []).length
      if (callCount === 0) continue

      const optionCount = (content.match(/cookieOptions:/g) ?? []).length
      const usesTheOwner = /from\s+["'][./\w@/]*authCookies["']/.test(content)

      if (optionCount < callCount || !usesTheOwner) {
        offenders.push(
          `${rel}: ${callCount} client(s) created, ${optionCount} cookieOptions, ` +
            `imports authCookies: ${usesTheOwner}`
        )
      }
    }

    expect(
      offenders,
      `These files create a Supabase client without the shared cookie flags ` +
        `(src/db/authCookies.ts). The cookie they write loses the Secure flag.\n` +
        offenders.join('\n')
    ).toEqual([])
  })
})
