-- The weight rule stops saying 1000 when the column stops at 999.99.
--
-- WHAT WAS WRONG. `workout_sets.weight_kg` is `NUMERIC(5,2)` — five digits with
-- two after the point, so 999.99 is the largest value it can physically hold.
-- Beside it sat `workout_sets_weight_max CHECK (weight_kg <= 1000)`, which
-- permits a value the column cannot store. The two contradicted each other, and
-- the CHECK is the one people read.
--
-- Measured on 2026-09-10 with a throwaway workout on the test account:
--
--     weight_kg = 999.99  -> accepted
--     weight_kg = 1000    -> refused, "numeric field overflow"
--
-- So the ceiling was always 999.99. The CHECK simply said otherwise.
--
-- WHY IT MATTERED. Every validation rule in the app copied the CHECK rather than
-- the column: five places said `max(1000)`. A weight of exactly 1000 — a
-- plausible slip for 100 — passed every check the app made and was then refused
-- by Postgres with a message about numeric overflow that no lifter can act on.
-- Worse, on the "log a workout you already did" path the program's weights had
-- already been advanced by the time the write failed, so the session vanished
-- and the progression it caused stayed.
--
-- The app side was fixed on 2026-09-09 (`MAX_WEIGHT_KG = 999.99` in
-- `src/shared/weight.ts`, read from this column's type by a test). This is the
-- other half: the database now says the same number as the database.
--
-- SAFE ON THIS DATA. Checked before writing: zero rows exceed 999.99, and the
-- heaviest set anyone has stored is 237 kg. Nothing is rewritten and nothing is
-- deleted — this only narrows what may be written from here on, by 0.01 kg, to
-- what was already the truth.

ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_weight_max;

ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_weight_max CHECK (weight_kg <= 999.99);

COMMENT ON CONSTRAINT workout_sets_weight_max ON workout_sets IS
  'Matches NUMERIC(5,2) exactly. If the column is ever widened, widen this with it — they disagreed once and every validator in the app copied the wrong one.';
