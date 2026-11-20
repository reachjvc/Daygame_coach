-- Undo 20261120090000_vice_rows_newer_wins.sql. Drops the two triggers, their function and the write function.
-- No row changes: rows that were stored while the triggers ran stay as they are.
drop trigger if exists vice_attempts_keep_newer on public.vice_attempts;
drop trigger if exists vice_reports_keep_newer on public.vice_reports;
drop function if exists public.vice_keep_newer_row();
drop function if exists public.vice_write_rows(jsonb);
