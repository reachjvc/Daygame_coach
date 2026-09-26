import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getFieldReport, updateFieldReport, deleteFieldReport } from "@/src/tracking/trackingService"
import { UpdateFieldReportSchema } from "@/src/tracking/schemas"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const report = await getFieldReport(id)
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  if (report.user_id !== auth.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json(report)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const report = await getFieldReport(id)
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  if (report.user_id !== auth.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = UpdateFieldReportSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await updateFieldReport(id, parsed.data))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  await deleteFieldReport(id, auth.userId)
  return NextResponse.json({ success: true })
}
