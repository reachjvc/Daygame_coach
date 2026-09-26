import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserCustomReportTemplates, saveCustomReportTemplate } from "@/src/tracking/trackingService"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const templates = await getUserCustomReportTemplates(auth.userId)
  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { name, description, fields } = await request.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  if (!fields?.length) return NextResponse.json({ error: "Fields required" }, { status: 400 })

  const template = await saveCustomReportTemplate(auth.userId, { name, description, fields })
  return NextResponse.json(template, { status: 201 })
}
