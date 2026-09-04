/**
 * The guard that decides whether the server may fetch an address.
 *
 * Every case below was reachable before this existed. `[::ffff:127.0.0.1]` is
 * not hypothetical: it was verified against the running dev server, which
 * fetched its own localhost and returned the page.
 */

import { describe, expect, test } from "vitest"

import { isBlockedAddress, parseIpBytes } from "@/src/timetrack/networkGuardService"

describe("addresses the server must refuse", () => {
  test("loopback, in every spelling", () => {
    for (const address of [
      "127.0.0.1",
      "127.1.2.3",
      "::1",
      "0:0:0:0:0:0:0:1",
      "[::1]",
      "::ffff:127.0.0.1", // IPv4-mapped, dotted tail
      "::ffff:7f00:1", // the same address as the URL parser rewrites it
      "::127.0.0.1", // deprecated IPv4-compatible
    ]) {
      expect(isBlockedAddress(address), `${address} was allowed`).toBe(true)
    }
  })

  test("private networks and cloud metadata", () => {
    for (const address of [
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.1.1",
      "169.254.169.254", // AWS/GCP/Azure credentials endpoint
      "100.64.0.1", // carrier-grade NAT
      "fd00::1", // unique-local
      "fe80::1", // link-local
      "::ffff:169.254.169.254",
      "64:ff9b::169.254.169.254", // NAT64
      "2002:a9fe:a9fe::1", // 6to4 wrapping 169.254.169.254
    ]) {
      expect(isBlockedAddress(address), `${address} was allowed`).toBe(true)
    }
  })

  test("unspecified, multicast and reserved", () => {
    for (const address of ["0.0.0.0", "::", "224.0.0.1", "255.255.255.255", "ff02::1", "240.0.0.1"]) {
      expect(isBlockedAddress(address), `${address} was allowed`).toBe(true)
    }
  })

  test("anything unparseable is refused rather than guessed at", () => {
    for (const address of ["", "not-an-address", "999.1.1.1", "1.2.3", "::gggg", "1:2:3::4::5"]) {
      expect(isBlockedAddress(address), `${address} was allowed`).toBe(true)
    }
  })
})

describe("addresses the server may fetch", () => {
  test("ordinary public addresses", () => {
    for (const address of [
      "142.250.74.110", // google.com
      "1.1.1.1",
      "8.8.8.8",
      "2a00:1450:4001:800::200e",
      "2606:4700:4700::1111",
      "172.32.0.1", // just outside 172.16/12
      "100.128.0.1", // just outside 100.64/10
      "192.169.0.1", // just outside 192.168/16
    ]) {
      expect(isBlockedAddress(address), `${address} was blocked`).toBe(false)
    }
  })
})

describe("the parser the guard rests on", () => {
  test("expands :: to the right place", () => {
    expect(parseIpBytes("::1")!.bytes).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    expect(parseIpBytes("2001:db8::1")!.bytes.slice(0, 4)).toEqual([0x20, 0x01, 0x0d, 0xb8])
  })

  test("a mapped address ends in the four IPv4 bytes", () => {
    expect(parseIpBytes("::ffff:127.0.0.1")!.bytes.slice(10)).toEqual([0xff, 0xff, 127, 0, 0, 1])
  })

  test("a full IPv6 address with no :: still parses", () => {
    expect(parseIpBytes("2001:0db8:0000:0000:0000:0000:0000:0001")!.bytes[15]).toBe(1)
  })

  test("brackets are accepted, since URLs carry them", () => {
    expect(parseIpBytes("[fd00::1]")!.family).toBe(6)
  })
})
