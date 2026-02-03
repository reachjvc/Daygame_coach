import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getCustomReportTemplate, updateCustomReportTemplate, deleteCustomReportTemplate } from "@/src/tracking/trackingService"

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, ctx: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const template = await getCustomReportTemplate(user.id, id)
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(template)
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const { name, description, fields } = await request.json()
  const template = await updateCustomReportTemplate(user.id, id, { name, description, fields })
  return NextResponse.json(template)
}

export async function DELETE(_: NextRequest, ctx: RouteContext) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  await deleteCustomReportTemplate(user.id, id)
  return new NextResponse(null, { status: 204 })
}
