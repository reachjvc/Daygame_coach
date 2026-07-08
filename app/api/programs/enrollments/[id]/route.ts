import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getEnrollmentById, getTodaySession, getSessionLogs, unenroll } from "@/src/db/programRepo"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const enrollment = await getEnrollmentById(auth.userId, id)
    if (!enrollment) return err("Enrollment not found", 404)
    const [prescription, logs] = await Promise.all([
      getTodaySession(auth.userId, id),
      getSessionLogs(auth.userId, id),
    ])
    return NextResponse.json({ enrollment, prescription, logs })
  } catch (e) { console.error("get enrollment:", e); return err((e as Error).message) }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    await unenroll(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (e) { console.error("unenroll:", e); return err("Failed to unenroll") }
}
