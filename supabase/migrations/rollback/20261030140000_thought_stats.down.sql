-- The way back from 20261030140000_thought_stats.sql. Read-only function; nothing stored is lost.
DROP FUNCTION IF EXISTS public.thought_frequency_stats(TEXT, TIMESTAMPTZ);
