-- Add session_id to milestones table to link achievements to sessions
ALTER TABLE milestones
ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- Index for efficient session-based lookups
CREATE INDEX idx_milestones_session_id ON milestones(session_id);
