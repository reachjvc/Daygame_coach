import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getCustomReportTemplate, updateCustomReportTemplate, deleteCustomReportTemplate } from "@/src/tracking/trackingService"

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, ctx: RouteContext) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await ctx.params
  const template = await getCustomReportTemplate(auth.userId, id)
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(template)
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await ctx.params
  const { name, description, fields } = await request.json()
  const template = await updateCustomReportTemplate(auth.userId, id, { name, description, fields })
  return NextResponse.json(template)
}

export async function DELETE(_: NextRequest, ctx: RouteContext) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await ctx.params
  await deleteCustomReportTemplate(auth.userId, id)
  return new NextResponse(null, { status: 204 })
}
