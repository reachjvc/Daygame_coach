/**
 * WORK THAT MUST NOT HOLD UP THE ANSWER: run it once the response has gone.
 *
 * Next's `after` keeps the function alive for it on Vercel and runs it even
 * when the handler failed (node_modules/next/dist/docs/01-app/03-api-reference/
 * 04-functions/after.md). It works only inside a request; called outside one
 * (a script, a test calling a handler directly) it throws, and then the task
 * runs straight away instead, so the work is never silently dropped.
 *
 * The task must catch its own errors: nobody is left to hear them.
 */

import { after } from "next/server"

export function afterResponse(task: () => Promise<unknown>): void {
  try {
    after(task)
  } catch {
    void task().catch(() => undefined)
  }
}
