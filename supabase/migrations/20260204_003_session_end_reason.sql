-- Add end_reason column to track how a session ended
-- 'completed' = user explicitly ended the session
-- 'abandoned' = user started a new session while this one was still active

ALTER TABLE sessions
ADD COLUMN end_reason text CHECK (end_reason IN ('completed', 'abandoned'));

-- Backfill: mark all existing ended sessions as 'completed'
UPDATE sessions
SET end_reason = 'completed'
WHERE ended_at IS NOT NULL AND end_reason IS NULL;

COMMENT ON COLUMN sessions.end_reason IS 'How the session ended: completed (user ended it) or abandoned (replaced by new session)';
