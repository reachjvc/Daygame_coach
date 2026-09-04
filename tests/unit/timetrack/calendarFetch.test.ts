// @vitest-environment node
/**
 * The calendar fetcher, end to end, with DNS and the network stubbed.
 *
 * Case 2 below — a perfectly ordinary hostname whose DNS points at loopback —
 * is the one the old guard could not see at all, because it only ever read the
 * spelling of the hostname. Case 3 is the other one: the first address is
 * public and the redirect is not.
 */

import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (hostname: string) => {
    if (hostname === "calendar.example.com") return [{ address: "93.184.216.34", family: 4 }]
    if (hostname === "innocent.example.com") return [{ address: "127.0.0.1", family: 4 }]
    if (hostname === "mixed.example.com") {
      return [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ]
    }
    throw new Error("ENOTFOUND")
  }),
}))

const ICS = ["BEGIN:VCALENDAR", "VERSION:2.0", "END:VCALENDAR"].join("\r\n")

function stubFetch(handler: (url: string) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => handler(String(input))))
}

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } })

afterEach(() => {
  vi.unstubAllGlobals()
})

async function fetchIcs(url: string) {
  const { fetchIcsFromUrl } = await import("@/src/timetrack/calendarSyncService")
  return fetchIcsFromUrl(url)
}

describe("addresses the fetcher refuses", () => {
  test("loopback written as IPv4-mapped IPv6 — the verified bypass", async () => {
    stubFetch(() => new Response("should never be reached"))
    await expect(fetchIcs("http://[::ffff:127.0.0.1]:3000/cal.ics")).rejects.toThrow(/Refusing to fetch/)
  })

  test("an ordinary hostname whose DNS points at loopback", async () => {
    stubFetch(() => new Response("should never be reached"))
    await expect(fetchIcs("https://innocent.example.com/cal.ics")).rejects.toThrow(/Refusing to fetch/)
  })

  test("a hostname with one public and one private address is refused, not raced", async () => {
    stubFetch(() => new Response("should never be reached"))
    await expect(fetchIcs("https://mixed.example.com/cal.ics")).rejects.toThrow(/Refusing to fetch/)
  })

  test("a public address that redirects to cloud metadata", async () => {
    stubFetch((url) =>
      url.includes("calendar.example.com") ? redirect("http://169.254.169.254/latest/meta-data/") : new Response("secrets"),
    )
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).rejects.toThrow(/Refusing to fetch/)
  })

  test("a redirect loop stops instead of running forever", async () => {
    stubFetch(() => redirect("https://calendar.example.com/again.ics"))
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).rejects.toThrow(/redirected too many times/)
  })

  test("a non-2xx answer says nothing about what is behind the address", async () => {
    stubFetch(() => new Response("nope", { status: 401, statusText: "Unauthorized" }))
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).rejects.toThrow(
      /did not return a calendar/,
    )
  })
})

describe("addresses the fetcher accepts", () => {
  test("a public calendar comes back", async () => {
    stubFetch(() => new Response(ICS))
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).resolves.toContain("BEGIN:VCALENDAR")
  })

  test("webcal:// is rewritten to https", async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      return new Response(ICS)
    })
    await fetchIcs("webcal://calendar.example.com/cal.ics")
    expect(seen[0].startsWith("https://")).toBe(true)
  })

  test("one public redirect is followed", async () => {
    let hop = 0
    stubFetch(() => (hop++ === 0 ? redirect("https://calendar.example.com/real.ics") : new Response(ICS)))
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).resolves.toContain("BEGIN:VCALENDAR")
  })

  test("an answer that is not a calendar is named as such", async () => {
    stubFetch(() => new Response("<html>login page</html>"))
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).rejects.toThrow(/did not return an iCalendar/)
  })

  test("a file over 5 MB is refused", async () => {
    stubFetch(() => new Response("BEGIN:VCALENDAR" + "x".repeat(5_000_001)))
    await expect(fetchIcs("https://calendar.example.com/cal.ics")).rejects.toThrow(/larger than 5 MB/)
  })
})
