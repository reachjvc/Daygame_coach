/**
 * THE VALUE OF THE WEEK'S MARKS (Plans/role-models.md, Phase 12; Franklin's book).
 *
 *   GET  `?from=YYYY-MM-DD&to=YYYY-MM-DD` (at most 31 days): `{ marks: [{ day, value, lived }] }`.
 *   PUT  `{ day, lived: true | false | null }`: today or an earlier day of this
 *        week, for this week's value; `null` takes the mark back. A same-origin
 *        JSON request only.
 */

import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { readCouncilSettings, readWeekMarks, writeWeekMark } from "@/src/db/roleModelsRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { weekOf, weekValueFor } from "@/src/role-models/councilReminderService"
import { getTodayInTimezone } from "@/src/shared/dateUtils"

const NO_STORE = { "Cache-Control": "no-store" }
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE })
const DAY = /^\d{4}-\d{2}-\d{2}$/
const isDay = (s: unknown): s is string => typeof s === "string" && DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))

function fromAnotherSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site")
  return site !== null && site !== "same-origin" && site !== "none"
}

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const q = new URL(req.url).searchParams
  const from = q.get("from")
  const to = q.get("to")
  if (!isDay(from) || !isDay(to) || from > to || Date.parse(to) - Date.parse(from) > 31 * 86_400_000) {
    return fail(400, "Give from and to as YYYY-MM-DD, at most 31 days apart")
  }
  try {
    return NextResponse.json({ marks: await readWeekMarks(auth.userId, from, to) }, { headers: NO_STORE })
  } catch {
    return fail(500, "Could not read your marks")
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return fail(403, "Not from this site")
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail(415, "Send JSON")
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== "object" || Object.keys(body).some((k) => k !== "day" && k !== "lived")) return fail(400, "Send { day, lived }")
  const { day, lived } = body
  if (!isDay(day) || !(lived === true || lived === false || lived === null)) return fail(400, "Send { day: YYYY-MM-DD, lived: true | false | null }")
  try {
    const tz = await getUserTimezone(auth.userId).catch(() => "UTC")
    const today = getTodayInTimezone(tz)
    if (day > today || weekOf(day) !== weekOf(today)) return fail(400, "Only this week's days, up to today")
    const value = weekValueFor(await readCouncilSettings(auth.userId), today)
    if (!value) return fail(409, "Choose a value of the week first")
    await writeWeekMark(auth.userId, day, value, lived as boolean | null)
    const week = weekOf(today)
    return NextResponse.json({ marks: await readWeekMarks(auth.userId, week, today) }, { headers: NO_STORE })
  } catch {
    return fail(500, "Could not save your mark")
  }
}
