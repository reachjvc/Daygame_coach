-- A weekly count of high-quality approaches, so the goal that ramps per week
-- can be fed a per-week number.
--
-- The "High-Quality Approaches" catalogue goal ramps 2 -> 4 -> 6 A WEEK and was
-- wired to `high_quality_approaches_cumulative`, the LIFETIME count. Anyone
-- picking it got a goal that read as complete on the day they created it, and
-- whose ramp meant nothing. There was no weekly variant to point it at; this is
-- it.
--
-- Adding a value to an enum cannot be undone in Postgres, which is the whole
-- risk here: it is additive, nothing reads it until the catalogue does, and no
-- existing row changes.

alter type linked_metric add value if not exists 'high_quality_approaches_weekly';
