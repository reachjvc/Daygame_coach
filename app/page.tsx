import { createServerSupabaseClient } from "@/src/db/server"
import { HomePage } from "@/src/home"

export default async function Page() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <HomePage isLoggedIn={!!user} />
}
