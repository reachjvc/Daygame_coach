import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getLifeAnswers, addLifeAnswer, deleteLifeAnswer, LIFE_ANSWER_KEYS, type LifeAnswerKey } from "@/src/db/lifeAnswerRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { currentOneThing, pastOneThings, isSameAsCurrent, defaultDueOn } from "@/src/goals/oneThingService"

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
    const text = typeof body.body === "string" ? body.body.trim() : ""
    if (!k) return err("Unknown answer key", 400)
    if (!text || text.length > 2000) return err("Write something, and keep it under 2000 characters", 400)

    const tz = await getUserTimezone(auth.userId)
    const rows = await getLifeAnswers(auth.userId, k)
    // Saving the same words again is not a new answer; a page that saves on
    // blur would otherwise turn one afternoon into forty entries of history.
    if (isSameAsCurrent(rows, text)) return NextResponse.json({ unchanged: true })

    const dueOn = typeof body.dueOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueOn) ? body.dueOn : defaultDueOn(tz)
    return NextResponse.json(await addLifeAnswer(auth.userId, k, text, dueOn), { status: 201 })
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
