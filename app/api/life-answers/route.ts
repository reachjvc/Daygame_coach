import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getLifeAnswers, addLifeAnswer, deleteLifeAnswer, LIFE_ANSWER_KEYS, type LifeAnswerKey } from "@/src/db/lifeAnswerRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { currentOneThing, pastOneThings, planOneThingWrite } from "@/src/goals/oneThingService"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })
const key = (raw: string | null): LifeAnswerKey | null =>
  (LIFE_ANSWER_KEYS as readonly string[]).includes(raw ?? "") ? (raw as LifeAnswerKey) : null

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const k = key(new URL(request.url).searchParams.get("key"))
    if (!k) return err("Unknown answer key", 400)
    const [rows, tz] = await Promise.all([getLifeAnswers(auth.userId, k), getUserTimezone(auth.userId)])
    return NextResponse.json({ current: currentOneThing(rows, tz), past: pastOneThings(rows, tz) })
  } catch (e) { console.error("Error reading life answers:", e); return err("Failed to read your answers") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const body = await request.json().catch(() => ({}))
    const k = key(body.key)
    if (!k) return err("Unknown answer key", 400)

    const [rows, tz] = await Promise.all([getLifeAnswers(auth.userId, k), getUserTimezone(auth.userId)])
    // Refuse it, do nothing, or append: one rule, in the service, because the
    // three answers depend on each other. See `planOneThingWrite`.
    const write = planOneThingWrite(rows, body.body, body.dueOn, tz)
    if (write.kind === "reject") return err(write.reason, 400)
    if (write.kind === "unchanged") return NextResponse.json({ unchanged: true })

    const saved = await addLifeAnswer(auth.userId, k, String(body.body).trim(), write.dueOn)
    return NextResponse.json(saved, { status: 201 })
  } catch (e) { console.error("Error writing life answer:", e); return err("That did not save") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Which one?", 400)
    await deleteLifeAnswer(auth.userId, id)
    return NextResponse.json({ deleted: true })
  } catch (e) { console.error("Error deleting life answer:", e); return err("Could not delete that") }
}
