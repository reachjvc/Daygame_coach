-- Undo 20260923150000_delete_and_revise_program_workout.sql. Drops the two functions (and with them the two grants).
-- No row changes: workouts already deleted or corrected through them stay as they are.
drop function if exists public.delete_program_workout(uuid, jsonb, jsonb, integer);
drop function if exists public.revise_program_workout(uuid, jsonb, jsonb, jsonb, integer);
