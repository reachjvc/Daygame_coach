/**
 * NOTIFICATION PLUMBING'S PURE RULES — src/notifications/*.
 *
 * The allow-list is a security rule (the server POSTs to whatever address a
 * device row holds), so its refusals are tested as carefully as its passes.
 */
import { describe, expect, it } from "vitest"
import { deviceLabel, isAllowedPushEndpoint, readSubscription, timerOnByDefault } from "@/src/notifications/endpoints"
import { bearerMatches } from "@/src/notifications/clockAuth"
import { outcomeOf } from "@/src/notifications/pushService"

describe("which addresses the server will send to", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc:def",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
    "https://web.push.apple.com/QGZ",
    "https://wns2-par02p.notify.windows.com/w/?token=x",
  ])("accepts %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true)
  })

  it.each([
    ["plain http", "http://fcm.googleapis.com/fcm/send/x"],
    ["another site", "https://evil.example/fcm.googleapis.com"],
    ["a lookalike suffix", "https://fcm.googleapis.com.evil.example/x"],
    ["a bare suffix", "https://notify.windows.com/x"],
    ["the server's own network", "https://127.0.0.1/x"],
    ["credentials in the URL", "https://user:pw@fcm.googleapis.com/x"],
    ["a port", "https://fcm.googleapis.com:8443/x"],
    ["not a URL", "fcm.googleapis.com"],
    ["too long", `https://fcm.googleapis.com/${"x".repeat(1000)}`],
    // Read by WHATWG URL as an allowed host, connected to elsewhere by web-push's url.parse.
    ["a semicolon in the host", "https://169.254.169.254;.notify.windows.com/latest"],
    ["an escaped dot in the host", "https://localhost%E3%80%82notify.windows.com/x"],
    ["a quote in the host", "https://127.0.0.1'.notify.windows.com/x"],
    ["a brace in the host", "https://127.0.0.1{.notify.windows.com/x"],
    ["a backtick in the host", "https://127.0.0.1`.notify.windows.com/x"],
    ["upper case in the host", "https://FCM.googleapis.com/fcm/send/x"],
  ])("refuses %s", (_why, url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false)
  })

  it("reads a browser's subscription, and refuses one with odd keys", () => {
    const good = { endpoint: "https://fcm.googleapis.com/fcm/send/a", keys: { p256dh: "BNcR_abc-1", auth: "tBHI_x" } }
    expect(readSubscription(good)).toEqual({ endpoint: good.endpoint, p256dh: "BNcR_abc-1", auth: "tBHI_x" })
    expect(readSubscription({ ...good, keys: { p256dh: "has spaces", auth: "x" } })).toBeNull()
    expect(readSubscription({ ...good, endpoint: "https://evil.example/" })).toBeNull()
    expect(readSubscription(null)).toBeNull()
  })

  it("names a device the way a person would", () => {
    const pixel = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
    const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0"
    expect(deviceLabel(pixel, false)).toBe("Android phone · Chrome")
    expect(deviceLabel(iphone, true)).toBe("iPhone · installed app")
    expect(deviceLabel(win, false)).toBe("Windows PC · Edge")
  })

  it("starts the running timer on only for the installed app on a phone", () => {
    expect(timerOnByDefault("Android phone · installed app")).toBe(true)
    expect(timerOnByDefault("iPhone · installed app")).toBe(true)
    expect(timerOnByDefault("Android phone · Chrome")).toBe(false)
    expect(timerOnByDefault("Windows PC · installed app")).toBe(false)
    expect(timerOnByDefault("")).toBe(false)
  })
})

describe("what a push service's answer means", () => {
  it("is ok for 2xx, gone for 404 and 410, failed for anything else", () => {
    expect(outcomeOf(201)).toBe("ok")
    expect(outcomeOf(404)).toBe("gone")
    expect(outcomeOf(410)).toBe("gone")
    expect(outcomeOf(429)).toBe("failed")
    expect(outcomeOf(undefined)).toBe("failed")
  })
})

describe("the clock's secret", () => {
  it("lets in only the exact bearer token", () => {
    expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true)
    expect(bearerMatches("Bearer s3cre", "s3cret")).toBe(false)
    expect(bearerMatches("Bearer s3cretX", "s3cret")).toBe(false)
    expect(bearerMatches("s3cret", "s3cret")).toBe(false)
    expect(bearerMatches(null, "s3cret")).toBe(false)
  })

  it("never lets anything in when no secret is stored", () => {
    expect(bearerMatches("Bearer ", "")).toBe(false)
  })
})
