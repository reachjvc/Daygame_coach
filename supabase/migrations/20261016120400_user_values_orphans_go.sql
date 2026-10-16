-- ============================================================================
-- THE VALUE PICKS OF DELETED ACCOUNTS GO, AND EVERY PICK NAMES A PERSON.
--
-- 20261016120200_user_values_belong_to_a_person.sql added the key NOT VALID,
-- because 3 of production's 4 `user_values` rows named accounts that no longer
-- exist (counted 2026-10-16). The owner decided on 2026-10-16 to delete those
-- three. Nobody could see or use them: row security shows a pick only to its
-- own account, and the accounts are gone.
--
-- The delete refuses to run if it would remove more than the three approved,
-- so a different situation stops here instead of deleting what nobody agreed
-- to. Then the key is validated, so it holds for every row, not only new ones.
-- ============================================================================

DO $$
DECLARE
  gone integer;
BEGIN
  DELETE FROM user_values uv
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = uv.user_id);
  GET DIAGNOSTICS gone = ROW_COUNT;
  IF gone > 3 THEN
    RAISE EXCEPTION 'user_values: % rows name no account; the owner approved deleting 3', gone;
  END IF;
  RAISE NOTICE 'user_values: % picks of deleted accounts removed', gone;
END $$;

ALTER TABLE user_values VALIDATE CONSTRAINT user_values_user_id_fkey;
