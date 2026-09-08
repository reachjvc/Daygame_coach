/**
 * Saved training weeks.
 *
 * WHAT THIS IS FOR. A week you build in the program builder used to exist only
 * while you were looking at it. Close the tab before pressing Start and it was
 * gone; there was nowhere it could be, so it could not follow you to another
 * device and the Life Mastery flow could not hand one over. Meanwhile
 * `workout_templates` held a flat list of sets that prefilled a different
 * screen and could not be started as a program at all. Two things called "a
 * workout you saved", neither able to see the other.
 *
 * A DRAFT IS ALLOWED TO BE UNFINISHED. Saving takes `DraftScheduleSchema`,
 * which permits a day with nothing in it yet. Starting takes
 * `CustomScheduleSchema`, which does not — so a half-built week is kept and a
 * half-built week is refused, and the refusal says which day is empty rather
 * than failing somewhere inside the engine.
 */

import { createServerSupabaseClient } from "./supabase"
import { enrollInProgram } from "./programRepo"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import { CUSTOM_PROGRAM_ID } from "@/src/programs/data/customProgram"
import type { Discipline, ProgramSchedule, UnitSystem } from "@/src/programs/types"

export interface ProgramDraft {
  id: string
  name: string
  discipline: Discipline
  unitSystem: UnitSystem
  schedule: ProgramSchedule
  workingWeights: Record<string, number>
  source: "built" | "catalog" | "saved_workout"
  sourceProgramId: string | null
  createdAt: string
  updatedAt: string
}

interface DraftRow {
  id: string
  name: string
  discipline: Discipline
  unit_system: UnitSystem
  schedule: ProgramSchedule
  working_weights: Record<string, number> | null
  source: ProgramDraft["source"]
  source_program_id: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, name, discipline, unit_system, schedule, working_weights, source, source_program_id, created_at, updated_at"

function toDraft(row: DraftRow): ProgramDraft {
  return {
    id: row.id,
    name: row.name,
    discipline: row.discipline,
    unitSystem: row.unit_system,
    schedule: row.schedule,
    // The column is NOT NULL with a default, but a row read through a view or
    // written before that default would arrive as null and take the page down.
    workingWeights: row.working_weights ?? {},
    source: row.source,
    sourceProgramId: row.source_program_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Most recently touched first, which is the order people look for them in. */
export async function listDrafts(userId: string): Promise<ProgramDraft[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_drafts")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as DraftRow[]).map(toDraft)
}

export async function getDraft(userId: string, id: string): Promise<ProgramDraft | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_drafts")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toDraft(data as DraftRow) : null
}

export interface DraftInput {
  name: string
  discipline?: Discipline
  unitSystem?: UnitSystem
  schedule: ProgramSchedule
  workingWeights?: Record<string, number>
  source?: ProgramDraft["source"]
  sourceProgramId?: string | null
}

/**
 * A name already in use is reported as such, not as a database error.
 *
 * The unique index is the thing that actually enforces it — checking first and
 * then inserting is a race two tabs can lose — so this reads the code Postgres
 * gives back rather than asking beforehand.
 */
const DUPLICATE_NAME = "23505"

export async function createDraft(userId: string, input: DraftInput): Promise<ProgramDraft> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("program_drafts")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      discipline: input.discipline ?? "strength",
      unit_system: input.unitSystem ?? "kg",
      schedule: input.schedule,
      working_weights: input.workingWeights ?? {},
      source: input.source ?? "built",
      source_program_id: input.sourceProgramId ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) {
    if (error.code === DUPLICATE_NAME) throw new Error("You already have a week saved under that name.")
    throw new Error(error.message)
  }
  return toDraft(data as DraftRow)
}

export async function updateDraft(
  userId: string,
  id: string,
  patch: Partial<DraftInput>
): Promise<ProgramDraft> {
  const supabase = await createServerSupabaseClient()
  /**
   * Only the fields actually sent are written. Spreading the whole input would
   * turn "rename this" into "rename this and replace the week with undefined",
   * which is how a rename silently empties a program.
   */
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.discipline !== undefined) row.discipline = patch.discipline
  if (patch.unitSystem !== undefined) row.unit_system = patch.unitSystem
  if (patch.schedule !== undefined) row.schedule = patch.schedule
  if (patch.workingWeights !== undefined) row.working_weights = patch.workingWeights
  if (Object.keys(row).length === 0) {
    const current = await getDraft(userId, id)
    if (!current) throw new Error("That saved week no longer exists.")
    return current
  }

  const { data, error } = await supabase
    .from("program_drafts")
    .update(row)
    // The row policy already limits this to your own rows; the filter is here
    // so a wrong id returns "no such week" instead of silently changing nothing.
    .eq("user_id", userId)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle()
  if (error) {
    if (error.code === DUPLICATE_NAME) throw new Error("You already have a week saved under that name.")
    throw new Error(error.message)
  }
  if (!data) throw new Error("That saved week no longer exists.")
  return toDraft(data as DraftRow)
}

export async function deleteDraft(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("program_drafts").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(error.message)
}

/**
 * Turn a saved week into a program that is running.
 *
 * THE NAME COMES WITH IT. Starting a self-built week used to hard-code "Your
 * program" and a level of "intermediate", so three different weeks all appeared
 * under one meaningless title and you could not tell which was which.
 */
export async function startDraft(
  userId: string,
  id: string,
  opts: { barWeightKg?: number | null } = {}
): Promise<Awaited<ReturnType<typeof enrollInProgram>> & { draft: ProgramDraft }> {
  const draft = await getDraft(userId, id)
  if (!draft) throw new Error("That saved week no longer exists.")

  /**
   * The strict check, here and not at save time. A draft may hold an empty day
   * while it is being written; a program may not, because an empty day
   * prescribes a session with nothing in it, advances the cursor and logs a
   * workout that never happened.
   */
  const runnable = CustomScheduleSchema.safeParse(draft.schedule)
  if (!runnable.success) {
    // An endurance plan has weeks rather than days and cannot be hand-edited at
    // all, which is why `CustomScheduleSchema` excludes it; everything else has
    // days, and the useful thing to say is WHICH one is still empty.
    const days = "days" in draft.schedule ? draft.schedule.days : []
    const empty = days.filter((d) => d.exercises.length === 0).map((d) => d.label)
    throw new Error(
      empty.length > 0
        ? `Add at least one lift to ${empty.join(" and ")} before starting this.`
        : "This week cannot be started yet — check that every day has at least one lift."
    )
  }

  const result = await enrollInProgram(userId, {
    programId: CUSTOM_PROGRAM_ID,
    // The custom program has exactly one level and no seed weights; every lift
    // is asked for explicitly, so the level carries no information here.
    level: "intermediate",
    unitSystem: draft.unitSystem,
    workingWeights: draft.workingWeights,
    customSchedule: runnable.data as ProgramSchedule,
    barWeightKg: opts.barWeightKg ?? null,
    label: draft.name,
  })
  return { ...result, draft }
}
