import { requireAuth } from "@/src/db/auth"
import { getWorkoutLogsWithSets } from "@/src/db/healthRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { workoutsToCsv } from "@/src/health/healthService"

/**
 * THE FILE YOU HOLD — every set you have ever logged.
 *
 * It was built in the browser from whatever the Progress tab happened to have
 * loaded, which was three years while the list beside it showed one: the file
 * and the screen disagreed about how much training existed. It is the server's
 * answer now, all of it, dated in the account's own calendar.
 */
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const [logs, timezone] = await Promise.all([
      getWorkoutLogsWithSets(auth.userId, "all"),
      getUserTimezone(auth.userId),
    ])
    const today = new Date().toISOString().slice(0, 10)
    return new Response(workoutsToCsv(logs, timezone), {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="training-${today}.csv"`,
      },
    })
  } catch (e) {
    console.error("workout export:", e)
    return new Response("Your training could not be exported.", { status: 500 })
  }
}
