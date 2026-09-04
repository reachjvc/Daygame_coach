/**
 * Is this address safe for the server to fetch on a user's behalf?
 *
 * WHY THIS FILE EXISTS: the calendar importer takes a URL from the browser and
 * fetches it server-side. Without a guard that is a hole called SSRF — the
 * server will happily fetch `http://169.254.169.254/`, the address cloud hosts
 * use to hand out their own credentials, or scan the private network it sits in.
 *
 * THE GUARD THIS REPLACES CHECKED THE SPELLING OF THE HOSTNAME. It refused
 * "127.0.0.1" and "localhost" and passed everything else, so all of these went
 * straight through (the first one verified against the running dev server):
 *
 *   http://[::ffff:127.0.0.1]   loopback written the IPv6 way
 *   http://[fd00::1]            a private network, IPv6
 *   http://[fe80::1]            link-local, IPv6
 *   http://anything.example     any public name whose DNS points somewhere private
 *
 * So this file does not look at names at all. It parses an address down to its
 * bytes and asks whether those bytes are in a range that is not on the public
 * internet. Every textual form of the same address parses to the same bytes,
 * which is the whole point — there is no spelling to sneak past.
 */

/** 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.168/16, 198.18/15, 224/4, 240/4 */
function isBlockedV4(b: number[]): boolean {
  const [a, c, d] = b
  if (a === 0) return true // "this network"
  if (a === 10) return true // private
  if (a === 100 && c >= 64 && c <= 127) return true // carrier-grade NAT
  if (a === 127) return true // loopback
  if (a === 169 && c === 254) return true // link-local, incl. 169.254.169.254 cloud metadata
  if (a === 172 && c >= 16 && c <= 31) return true // private
  if (a === 192 && c === 0 && d === 0) return true // IETF protocol assignments
  if (a === 192 && c === 168) return true // private
  if (a === 198 && (c === 18 || c === 19)) return true // benchmarking
  if (a >= 224) return true // multicast (224/4) and reserved (240/4), incl. 255.255.255.255
  return false
}

function isBlockedV6(b: number[]): boolean {
  const allZero = b.every((x) => x === 0)
  if (allZero) return true // ::
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true // ::1 loopback

  // IPv4 carried inside IPv6, in each of the forms that exist. Each one is a
  // different way of writing an IPv4 address, so each is checked as IPv4.
  const tail = b.slice(12)
  const firstTwelveZero = b.slice(0, 12).every((x) => x === 0)
  if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) return isBlockedV4(tail) // ::ffff:a.b.c.d
  if (firstTwelveZero) return isBlockedV4(tail) // ::a.b.c.d (deprecated IPv4-compatible)
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) return isBlockedV4(tail) // 64:ff9b::/96 NAT64
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedV4(b.slice(2, 6)) // 2002::/16 6to4

  if ((b[0] & 0xfe) === 0xfc) return true // fc00::/7 unique-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true // fe80::/10 link-local
  if (b[0] === 0xff) return true // ff00::/8 multicast
  return false
}

export function parseIpBytes(raw: string): { family: 4 | 6; bytes: number[] } | null {
  const text = raw.trim().replace(/^\[/, "").replace(/\]$/, "")
  if (!text) return null

  if (!text.includes(":")) {
    const parts = text.split(".")
    if (parts.length !== 4) return null
    const bytes = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
    if (bytes.some((n) => Number.isNaN(n) || n > 255)) return null
    return { family: 4, bytes }
  }

  // IPv6, including a trailing dotted-quad ("::ffff:127.0.0.1")
  let head = text
  let tailBytes: number[] = []
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text)
  if (dotted) {
    const v4 = parseIpBytes(dotted[1])
    if (!v4) return null
    tailBytes = v4.bytes
    head = text.slice(0, dotted.index).replace(/:$/, "") + ":"
  }

  const [left, right, ...extra] = head.split("::")
  if (extra.length > 0) return null
  const toGroups = (s: string) => (s ? s.split(":").filter((g) => g !== "") : [])
  const leftGroups = toGroups(left)
  const rightGroups = right === undefined ? [] : toGroups(right)
  if ([...leftGroups, ...rightGroups].some((g) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return null

  const groupBytes = (g: string) => {
    const n = parseInt(g, 16)
    return [(n >> 8) & 0xff, n & 0xff]
  }
  const leftBytes = leftGroups.flatMap(groupBytes)
  const rightBytes = rightGroups.flatMap(groupBytes)
  const known = leftBytes.length + rightBytes.length + tailBytes.length

  if (right === undefined) {
    if (known !== 16) return null
    return { family: 6, bytes: [...leftBytes, ...tailBytes] }
  }
  if (known > 16) return null
  const gap = new Array(16 - known).fill(0)
  return { family: 6, bytes: [...leftBytes, ...gap, ...rightBytes, ...tailBytes] }
}

/**
 * True when this address is not somewhere on the public internet — loopback,
 * a private network, link-local (cloud metadata lives there), carrier NAT,
 * multicast or reserved. Unparseable input is blocked: if we cannot tell what
 * an address is, we do not fetch it.
 */
export function isBlockedAddress(raw: string): boolean {
  const parsed = parseIpBytes(raw)
  if (!parsed) return true
  return parsed.family === 4 ? isBlockedV4(parsed.bytes) : isBlockedV6(parsed.bytes)
}
