import { createAdminSupabaseClient } from "./supabase"

/**
 * THE AI SPEND CAP'S TWO WRITES: BOOK A CALL, THEN SETTLE IT.
 *
 * Server only (admin client): `ai_usage_logs` is system-only, and the cap is
 * passed in by the server, so no client may book or settle anything.
 * Migration: supabase/migrations/20261128120000_ai_spend_cap.sql.
 *
 * The only caller is the AI guard (src/api_ai/aiGuard.ts). Everything else
 * that calls Claude goes through that guard.
 */

export type AiSpendBooking = {
  userId: string
  feature: string
  operation: string
  model: string
  scenarioId?: string
  capCents: number
  estimateCents: number
}

/**
 * Book `estimateCents` against the person's cap for this feature. Returns the
 * booking's id, or null when the booking would pass the cap. Two bookings at
 * the same moment queue behind one lock in the database, so they cannot both
 * slip under the cap.
 * @throws Error when the database call itself fails (the guard then refuses the call)
 */
export async function reserveAiSpend(booking: AiSpendBooking): Promise<string | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.rpc("ai_spend_reserve", {
    p_user_id: booking.userId,
    p_feature: booking.feature,
    p_operation: booking.operation,
    p_model: booking.model,
    p_scenario_id: booking.scenarioId ?? null,
    p_cap_cents: booking.capCents,
    p_estimate_cents: booking.estimateCents,
  })
  if (error) throw new Error(`Failed to book AI spend: ${error.message}`)
  return (data as string | null) ?? null
}

export type AiSpendSettlement = {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  inputCostCents: number
  outputCostCents: number
  cacheCreationCostCents: number
  cacheReadCostCents: number
  totalCostCents: number
  responseTimeMs: number
  error?: string
}

/**
 * Replace a booking's guess with what the call really cost. A booking is
 * settled once: a second settle of the same id changes nothing.
 * @throws Error when the update fails (the booking then keeps its guess)
 */
export async function settleAiSpend(id: string, settlement: AiSpendSettlement): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from("ai_usage_logs")
    .update({
      input_tokens: settlement.inputTokens,
      output_tokens: settlement.outputTokens,
      cache_creation_tokens: settlement.cacheCreationTokens,
      cache_read_tokens: settlement.cacheReadTokens,
      input_cost_cents: settlement.inputCostCents,
      output_cost_cents: settlement.outputCostCents,
      cache_creation_cost_cents: settlement.cacheCreationCostCents,
      cache_read_cost_cents: settlement.cacheReadCostCents,
      total_cost_cents: settlement.totalCostCents,
      response_time_ms: settlement.responseTimeMs,
      error: settlement.error ?? null,
      settled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("settled_at", null)
  if (error) throw new Error(`Failed to settle AI spend: ${error.message}`)
}
