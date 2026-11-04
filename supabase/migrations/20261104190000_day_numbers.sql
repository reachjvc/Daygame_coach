-- ============================================================================
-- YOUR OWN TODAY BOXES CAN HOLD A NUMBER
-- (Plans/life-plan-rebuild.md, Phase 6; Q10 of Plans/life-plan-tables.md).
--
-- A Today box (`life_plan_fields`) could hold words, show a piece of the plan,
-- or open one. Now it can also hold a number: approaches, minutes, kilos, how
-- much you wanted to get up. The number belongs to the DAY, as a rating and a
-- tick do, so it lives in the day half: one row per day and box.
--
-- The table keys on any plan part, not only a box, because Q4 (straight after
-- this phase) counts a goal's "+1" here too, instead of in `user_goals`.
--
-- Adds only. The change-only save may never reach the day half; the check at
-- the end says so for this table too.
-- ============================================================================

ALTER TABLE life_plan_fields DROP CONSTRAINT IF EXISTS life_plan_fields_kind_check;
ALTER TABLE life_plan_fields ADD CONSTRAINT life_plan_fields_kind_check
  CHECK (kind IN ('write', 'read', 'go', 'number'));

CREATE TABLE IF NOT EXISTS life_plan_day_numbers (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  node_id UUID NOT NULL,
  -- Big enough for a step count or a sum of money, small enough that a typo
  -- of thirty digits is refused rather than kept.
  value NUMERIC NOT NULL CHECK (value BETWEEN -1000000000 AND 1000000000),
  PRIMARY KEY (day_id, node_id),
  CONSTRAINT life_plan_day_numbers_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_numbers_node_fk FOREIGN KEY (node_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE
);

-- A box's or goal's removal cascades to its numbers; this keeps that a lookup.
CREATE INDEX IF NOT EXISTS idx_life_plan_day_numbers_node ON life_plan_day_numbers(node_id);

-- Locked to its owner, as every life plan table.
ALTER TABLE life_plan_day_numbers ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  BEGIN
    CREATE POLICY life_plan_day_numbers_select_own ON life_plan_day_numbers FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY life_plan_day_numbers_insert_own ON life_plan_day_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY life_plan_day_numbers_update_own ON life_plan_day_numbers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY life_plan_day_numbers_delete_own ON life_plan_day_numbers FOR DELETE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- The plan saves must never reach the day half. They name their tables, so a
-- day table on either list would show in its source.
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN SELECT proname, prosrc FROM pg_proc WHERE proname IN ('apply_life_plan_changes', 'save_life_plan') LOOP
    IF position('life_plan_day_numbers' IN f.prosrc) > 0 THEN
      RAISE EXCEPTION '% names life_plan_day_numbers, which it must never reach', f.proname;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
