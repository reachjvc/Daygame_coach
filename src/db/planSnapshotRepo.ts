/**
 * Plan snapshots: the Life Mastery flow's localStorage plan, mirrored server
 * side so the people building it can see what real people write.
 *
 * Everything here uses the ADMIN client on purpose. `plan_snapshots` has RLS on
 * and no policies, so anon and authenticated cannot touch it at all; the only
 * way in is the service role, from the two routes that own it. That is the
 * point rather than an oversight — an unauthenticated page writes here, so the
 * entrance is one controlled route instead of a public insert grant.
 */

import { createAdminSupabaseClient } from "./supabase"

export interface PlanSnapshotRow {
  id: string
  client_id: string
  user_id: string | null
  plan: unknown
  plan_text: string
  goal_count: number
  area_count: number
  revision: number
  created_at: string
  updated_at: string
}

export interface PlanSnapshotInsert {
  client_id: string
  user_id?: string | null
  plan: unknown
  plan_text: string
  goal_count: number
  area_count: number
}

/**
 * Write one browser's plan, replacing whatever it wrote before.
 *
 * Upsert on `client_id` rather than insert, so a person editing their plan for
 * an hour is one row that gets better rather than four hundred rows of the same
 * plan. `revision` is bumped by reading the existing row first: it is the only
 * part of the history worth keeping, and it is what tells a plan somebody came
 * back to three times from one they abandoned on first contact.
 */
export async function savePlanSnapshot(snapshot: PlanSnapshotInsert): Promise<PlanSnapshotRow> {
  const supabase = createAdminSupabaseClient()

  const { data: existing } = await supabase
    .from("plan_snapshots")
    .select("revision")
    .eq("client_id", snapshot.client_id)
    .maybeSingle()

  const { data, error } = await supabase
    .from("plan_snapshots")
    .upsert(
      {
        ...snapshot,
        revision: ((existing?.revision as number | undefined) ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save plan snapshot: ${error.message}`)
  return data as PlanSnapshotRow
}

/**
 * The most recently edited plans.
 *
 * `plan` itself is left out: a list view that ships every blob is megabytes of
 * JSON to render a table of counts. `plan_text` is the readable form and is
 * what you actually want to skim.
 */
export async function listPlanSnapshots(limit = 50): Promise<Omit<PlanSnapshotRow, "plan">[]> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from("plan_snapshots")
    .select("id, client_id, user_id, plan_text, goal_count, area_count, revision, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200))

  if (error) throw new Error(`Failed to list plan snapshots: ${error.message}`)
  return (data ?? []) as Omit<PlanSnapshotRow, "plan">[]
}

/** One plan in full, including the JSON, for loading it back into the flow. */
export async function getPlanSnapshot(clientId: string): Promise<PlanSnapshotRow | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from("plan_snapshots")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle()

  if (error) throw new Error(`Failed to read plan snapshot: ${error.message}`)
  return (data as PlanSnapshotRow | null) ?? null
}

/** Wipe one browser's snapshot, for the page's own "delete mine" button. */
export async function deletePlanSnapshot(clientId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from("plan_snapshots").delete().eq("client_id", clientId)
  if (error) throw new Error(`Failed to delete plan snapshot: ${error.message}`)
}
