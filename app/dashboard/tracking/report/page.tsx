import { createServerSupabaseClient } from "@/src/db/server"
import { redirect } from "next/navigation"
import { FieldReportPage } from "@/src/tracking"

interface PageProps {
  searchParams: Promise<{ session?: string }>
}

export default async function ReportPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const params = await searchParams
  const sessionId = params.session

  return <FieldReportPage userId={user.id} sessionId={sessionId} />
}
