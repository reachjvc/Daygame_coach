-- ============================================================================
-- THE TWO PLAN SAVES ARE FOR SIGNED-IN PEOPLE ONLY.
--
-- Supabase grants EXECUTE on every new function to `anon` by default, and
-- `REVOKE ... FROM PUBLIC` does not take that grant back. Both saves already
-- refuse a visitor with no account (SECURITY INVOKER: row security finds no
-- plan, so "No such plan, or it is not yours"), so this closes nothing that
-- was open. It makes the refusal the grant's instead of the function body's.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION save_life_plan(JSONB, INTEGER) FROM anon;

NOTIFY pgrst, 'reload schema';
