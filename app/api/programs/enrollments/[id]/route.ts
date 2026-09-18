import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import {
  getEnrollmentDetail,
  unenroll,
  deleteEnrollmentPermanently,
} from "@/src/db/programRepo"
import { statusFor } from "@/src/programs/errors"

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const { id } = await params
    const detail = await getEnrollmentDetail(auth.userId, id)
    if (!detail) return err("Enrollment not found", 404)
    return NextResponse.json(detail)
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
  } catch (e) {
    console.error("end program:", e)
    // 409, not 400: nothing about the request was wrong — the program is busy,
    // and the answer changes the moment the open workout is finished.
    return err((e as Error).message, statusFor(e))
  }
}
