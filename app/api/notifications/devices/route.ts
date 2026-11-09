/**
 * This person's devices: list them (GET), or register this browser (POST).
 *
 * POST `intent`:
 *   "enable"  — the person tapped "Turn on": register it, switched on. If the
 *               browser was someone else's device, it becomes theirs.
 *   "refresh" — the page opened with notifications already allowed: update the
 *               keys of a device already registered to this person, without
 *               touching whether it is on (they may have switched it off). If
 *               it was someone else's, it moves here SWITCHED OFF, so a new
 *               person on a shared browser is not sent reminders they never
 *               asked for and the previous person stops getting theirs here.
 *               A browser with no row is not registered: they removed it.
 *               With `oldEndpoint` (the worker, after the browser replaced the
 *               address; a page, after replacing a subscription made with an
 *               earlier server key), the row with the old address moves to the
 *               new one. "enable" and "timer" take `oldEndpoint` the same way.
 *   "timer"   — the person switched "Show the running timer on this device" on
 *               in the time tracker: register it with the timer on, leaving
 *               reminders as they were (off, for a browser new to this person).
 *
 * Each answer says both switches: `enabled` (reminders) and `timerRunning`.
 * On "enable", a device new to this person starts with the timer on only if
 * its label says it is the installed app on a phone (`timerOnByDefault`).
 *
 * The address is checked against the known push services first
 * (src/notifications/endpoints.ts): the server will POST to it.
 *
 * ANOTHER ACCOUNT'S DEVICE MOVES ONLY FOR A BROWSER HOLDING ITS KEYS. Each intent
 * moved somebody else's row to whoever posted its address, with any keys — so an
 * address learned anywhere took that person's device, and their pushes went out
 * to keys the taker chose (security review, 2026-11-05, low). The shared browser
 * the move is for posts the keys stored with the row: they are that browser's.
 * Anything else changes nothing, and is answered as an address nobody registered
 * ("refresh") or one we cannot use ("enable", "timer") — never "it is someone
 * else's" (`aDeviceMovesOnlyWithItsOwnKeys`).
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deviceByEndpoint, listDevices, moveDevice, registerDevice } from "@/src/db/notificationsRepo"
import { readSubscription, timerOnByDefault } from "@/src/notifications/endpoints"
import { afterResponse } from "@/src/shared/afterResponse"
import { announceCurrentTimer } from "@/src/timetrack/runningTimerService"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json({ devices: await listDevices(auth.userId) })
  } catch (error) {
    console.error("[notifications] devices read failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not read your devices" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  const sub = readSubscription(body?.subscription)
  const unusable = () => NextResponse.json({ error: "This browser's notification address is not one we can send to" }, { status: 400 })
  if (!sub) return unusable()
  /** This person's own, new, or another account's posted with the very keys stored for it: see the header */
  const mayTake = (existing: Awaited<ReturnType<typeof deviceByEndpoint>>) =>
    !existing || existing.userId === auth.userId || (existing.p256dh === sub.p256dh && existing.auth === sub.auth)
  const label = typeof body?.label === "string" ? body.label.slice(0, 80) : ""

  try {
    /**
     * A SUBSCRIPTION REPLACED FOR A NEW SERVER KEY ("Turn on" or the timer
     * switch, prove-slow-01): the person's own row at the old address moves to
     * the new one first, so its switches and label carry over rather than a new
     * row starting with defaults. Only to an address no device has yet.
     */
    if (body?.intent !== "refresh" && typeof body?.oldEndpoint === "string" && body.oldEndpoint !== sub.endpoint && !(await deviceByEndpoint(sub.endpoint))) {
      await moveDevice(auth.userId, body.oldEndpoint, sub)
    }
    if (body?.intent === "timer") {
      // "Show the running timer on this device", from the tracker's Settings:
      // the timer on, reminders left as they were (off for a browser new here).
      const existing = await deviceByEndpoint(sub.endpoint)
      if (!mayTake(existing)) return unusable()
      const enabled = existing?.userId === auth.userId ? existing.enabled : false
      const id = await registerDevice(auth.userId, { ...sub, label }, enabled, true)
      // whatever runs now appears at once, rather than at the next start
      afterResponse(() => announceCurrentTimer(auth.userId))
      return NextResponse.json({ id, enabled, timerRunning: true })
    }
    if (body?.intent !== "refresh") {
      // A device new to this person starts with the running timer on only if
      // it is the installed app on a phone (Q4 scenario 9); one of theirs keeps its setting.
      const existing = await deviceByEndpoint(sub.endpoint)
      if (!mayTake(existing)) return unusable()
      const timerRunning = existing?.userId === auth.userId ? existing.timerRunning : timerOnByDefault(label)
      const id = await registerDevice(auth.userId, { ...sub, label }, true, timerRunning)
      return NextResponse.json({ id, enabled: true, timerRunning })
    }
    // The worker reports a replaced address with the old one, so the row can follow it.
    if (typeof body?.oldEndpoint === "string" && body.oldEndpoint !== sub.endpoint) {
      if (await moveDevice(auth.userId, body.oldEndpoint, sub)) {
        const moved = await deviceByEndpoint(sub.endpoint)
        return NextResponse.json({ id: moved?.id ?? null, enabled: moved?.enabled ?? false, timerRunning: moved?.timerRunning ?? false })
      }
    }
    const existing = await deviceByEndpoint(sub.endpoint)
    if (!existing || !mayTake(existing)) return NextResponse.json({ id: null, enabled: false, timerRunning: false })
    // someone else's browser moves here with both switches off
    const mine = existing.userId === auth.userId
    const enabled = mine ? existing.enabled : false
    const timerRunning = mine ? existing.timerRunning : false
    return NextResponse.json({ id: await registerDevice(auth.userId, { ...sub, label }, enabled, timerRunning), enabled, timerRunning })
  } catch (error) {
    console.error("[notifications] register failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not register this device" }, { status: 500 })
  }
}
