import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getEnrollmentById, getTodaySession, getSessionLogs, unenroll, deleteEnrollmentPermanently } from "@/src/db/programRepo"

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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    // Default is ARCHIVE. Erasing has to be asked for by name, and the repo
    // refuses it on a program that is still running.
    if (new URL(req.url).searchParams.get("permanent") === "1") {
      await deleteEnrollmentPermanently(auth.userId, id)
    } else {
      await unenroll(auth.userId, id)
    }
    return NextResponse.json({ success: true })
  } catch (e) { console.error("end program:", e); return err((e as Error).message, 400) }
}
