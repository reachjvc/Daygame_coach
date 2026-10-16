-- ============================================================================
-- A PERSON'S VALUE PICKS ARE DELETED WITH THE PERSON.
--
-- Found 2026-10-13 by tests/integration/db/userDataCascades.integration.test.ts:
-- `user_values.user_id` references nothing, so deleting an account leaves every
-- value it picked behind, under an id that names nobody. Every other table
-- holding a person's rows cascades from auth.users.
--
-- NOT VALID: production holds 4 rows, and 3 of them already name accounts that
-- no longer exist (counted 2026-10-16). Validating the key would refuse to add
-- it until those rows are deleted, and deleting real data is the owner's call.
-- NOT VALID enforces the key on every new and changed row and cascades every
-- future delete; it only skips checking the rows already there. Once the owner
-- decides about the three, a later migration deletes them and runs
--   ALTER TABLE user_values VALIDATE CONSTRAINT user_values_user_id_fkey;
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE user_values
    ADD CONSTRAINT user_values_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
