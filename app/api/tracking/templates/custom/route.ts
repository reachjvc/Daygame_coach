import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/src/db/server"
import { getUserCustomReportTemplates, saveCustomReportTemplate } from "@/src/tracking/trackingService"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const templates = await getUserCustomReportTemplates(user.id)
  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, fields } = await request.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })
  if (!fields?.length) return NextResponse.json({ error: "Fields required" }, { status: 400 })

  const template = await saveCustomReportTemplate(user.id, { name, description, fields })
  return NextResponse.json(template, { status: 201 })
}
