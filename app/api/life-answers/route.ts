import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { LIFE_ANSWER_KEYS, type LifeAnswerKey } from "@/src/db/lifeAnswerRepo"
import { deleteChapter } from "@/src/db/lifeChapterRepo"
import { readOneThing, writeOneThing } from "@/src/goals/oneThingServer"
import type { OneThingAct } from "@/src/goals/oneThingService"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })
const isKey = (r: unknown): r is LifeAnswerKey => (LIFE_ANSWER_KEYS as readonly string[]).includes(r as string)
const isAct = (r: unknown): r is OneThingAct => r === "amend" || r === "extend" || r === "start"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json(await readOneThing(auth.userId))
  } catch (e) { console.error("Error reading life answers:", e); return err("Failed to read your answers") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const body = await request.json().catch(() => ({}))
    if (!isKey(body.key)) return err("Unknown answer key", 400)
    // Amend unless told otherwise: rewording is the common act, and the one that
    // must never move a date.
    const act: OneThingAct = isAct(body.act) ? body.act : "amend"
    if (body.key !== "one_thing" && act !== "amend") {
      return err("A support is amended, never started on its own — it belongs to the one thing", 400)
    }

    const out = await writeOneThing(auth.userId, body.key, act, body.body, body.dueOn)
    if (!out.ok) return err(out.reason, 400)
    return out.unchanged ? NextResponse.json({ unchanged: true }) : NextResponse.json(out, { status: 201 })
  } catch (e) { console.error("Error writing life answer:", e); return err("That did not save") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    // A chapter is what a person sees in their history, so a chapter is what
    // they delete. Its wordings go with it, by cascade.
    const id = new URL(request.url).searchParams.get("chapterId")
    if (!id) return err("Which one?", 400)
    await deleteChapter(auth.userId, id)
    return NextResponse.json({ deleted: true })
  } catch (e) { console.error("Error deleting chapter:", e); return err("Could not delete that") }
}
