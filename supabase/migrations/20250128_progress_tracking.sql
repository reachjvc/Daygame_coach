-- Migration: Progress Tracking System
-- Created: 2025-01-28
-- Purpose: Add tables for sessions, approaches, field reports, and reviews

-- ============================================
-- Sessions table
-- Tracks live approach sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Session goal
  goal INTEGER,                    -- Target number of approaches
  goal_met BOOLEAN DEFAULT FALSE,

  -- Session summary (calculated at end)
  total_approaches INTEGER DEFAULT 0,
  duration_minutes INTEGER,        -- Calculated from started_at to ended_at

  -- Location data
  primary_location TEXT,           -- User-entered or reverse geocoded
  location_data JSONB,             -- Array of coordinates for heatmap

  -- Session state
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Approaches table
-- Individual approaches within a session
-- ============================================
CREATE TABLE IF NOT EXISTS approaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,

  -- Approach data
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT,                    -- 'blowout', 'short', 'good', 'number', 'instadate'

  -- Quick tags (stored as array)
  tags TEXT[],                     -- e.g., ['day', 'solo', 'walking']

  -- Mood at time of approach (1-5)
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),

  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Optional quick note
  note TEXT,

  -- Voice note (URL to stored audio, if premium)
  voice_note_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Field report templates table
-- Stores template definitions and user customizations
-- ============================================
CREATE TABLE IF NOT EXISTS field_report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system templates

  -- Template info
  name TEXT NOT NULL,              -- e.g., "The Speedrun"
  slug TEXT NOT NULL,              -- e.g., "quick-log"
  description TEXT,
  icon TEXT,                       -- Lucide icon name
  estimated_minutes INTEGER,

  -- Template type
  is_system BOOLEAN DEFAULT FALSE, -- True for built-in templates
  base_template_id UUID REFERENCES field_report_templates(id), -- If customized from system template

  -- Fields configuration
  static_fields JSONB NOT NULL,    -- Fields that can't be removed
  dynamic_fields JSONB NOT NULL,   -- Fields that can be added/removed

  -- Active dynamic fields for this user's version
  active_dynamic_fields TEXT[],    -- IDs of dynamic fields currently enabled

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Field reports table
-- Actual field report submissions
-- ============================================
CREATE TABLE IF NOT EXISTS field_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Links
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  template_id UUID REFERENCES field_report_templates(id) ON DELETE SET NULL,

  -- Report content (JSONB with all field values)
  fields JSONB NOT NULL,           -- { field_id: value, ... }

  -- Metadata
  approach_count INTEGER,
  location TEXT,
  tags TEXT[],

  -- Draft state
  is_draft BOOLEAN DEFAULT FALSE,

  -- Timestamps
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When the session occurred
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Review templates table
-- Weekly, monthly, quarterly review templates
-- ============================================
CREATE TABLE IF NOT EXISTS review_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system templates

  -- Template info
  name TEXT NOT NULL,              -- e.g., "The Quick Win"
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,

  -- Review type
  review_type TEXT NOT NULL,       -- 'weekly', 'monthly', 'quarterly'

  -- Template type
  is_system BOOLEAN DEFAULT FALSE,
  base_template_id UUID REFERENCES review_templates(id),

  -- Fields configuration
  static_fields JSONB NOT NULL,
  dynamic_fields JSONB NOT NULL,
  active_dynamic_fields TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Reviews table
-- Actual review submissions
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review type and template
  review_type TEXT NOT NULL,       -- 'weekly', 'monthly', 'quarterly'
  template_id UUID REFERENCES review_templates(id) ON DELETE SET NULL,

  -- Review content
  fields JSONB NOT NULL,           -- { field_id: value, ... }

  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Commitment tracking
  previous_commitment TEXT,
  commitment_fulfilled BOOLEAN,
  new_commitment TEXT,

  -- Draft state
  is_draft BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User tracking stats table (materialized view alternative)
-- Cached stats for performance
-- ============================================
CREATE TABLE IF NOT EXISTS user_tracking_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Approach stats
  total_approaches INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_numbers INTEGER DEFAULT 0,
  total_instadates INTEGER DEFAULT 0,

  -- Streaks
  current_streak INTEGER DEFAULT 0,       -- Consecutive days with approaches
  longest_streak INTEGER DEFAULT 0,
  last_approach_date DATE,

  -- Weekly review stats
  weekly_reviews_completed INTEGER DEFAULT 0,
  current_weekly_streak INTEGER DEFAULT 0,

  -- Unlock status
  monthly_review_unlocked BOOLEAN DEFAULT FALSE,
  quarterly_review_unlocked BOOLEAN DEFAULT FALSE,

  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Milestones table
-- Track achievement milestones
-- ============================================
CREATE TABLE IF NOT EXISTS milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Milestone info
  milestone_type TEXT NOT NULL,    -- 'first_approach', 'first_number', '100_approaches', etc.
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Associated value (e.g., approach count when achieved)
  value INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate milestones
  UNIQUE(user_id, milestone_type)
);

-- ============================================
-- Sticking points table
-- Track user's identified sticking points
-- ============================================
CREATE TABLE IF NOT EXISTS sticking_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Sticking point info
  name TEXT NOT NULL,              -- e.g., "Hook point", "Opening anxiety"
  description TEXT,

  -- Status
  status TEXT DEFAULT 'active',    -- 'active', 'working_on', 'resolved'

  -- Stats (how often it comes up)
  occurrence_count INTEGER DEFAULT 0,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_approaches_user_id ON approaches(user_id);
CREATE INDEX IF NOT EXISTS idx_approaches_session_id ON approaches(session_id);
CREATE INDEX IF NOT EXISTS idx_approaches_timestamp ON approaches(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_approaches_outcome ON approaches(outcome);

CREATE INDEX IF NOT EXISTS idx_field_reports_user_id ON field_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_session_id ON field_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_reported_at ON field_reports(reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_period ON reviews(period_start DESC);

CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_sticking_points_user_id ON sticking_points(user_id);

-- ============================================
-- Update triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

DROP TRIGGER IF EXISTS field_report_templates_updated_at ON field_report_templates;
CREATE TRIGGER field_report_templates_updated_at
  BEFORE UPDATE ON field_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

DROP TRIGGER IF EXISTS field_reports_updated_at ON field_reports;
CREATE TRIGGER field_reports_updated_at
  BEFORE UPDATE ON field_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

DROP TRIGGER IF EXISTS review_templates_updated_at ON review_templates;
CREATE TRIGGER review_templates_updated_at
  BEFORE UPDATE ON review_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

DROP TRIGGER IF EXISTS user_tracking_stats_updated_at ON user_tracking_stats;
CREATE TRIGGER user_tracking_stats_updated_at
  BEFORE UPDATE ON user_tracking_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

DROP TRIGGER IF EXISTS sticking_points_updated_at ON sticking_points;
CREATE TRIGGER sticking_points_updated_at
  BEFORE UPDATE ON sticking_points
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracking_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticking_points ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies: Users can only access their own data
-- ============================================

-- Sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Approaches
CREATE POLICY "Users can view own approaches"
  ON approaches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own approaches"
  ON approaches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own approaches"
  ON approaches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own approaches"
  ON approaches FOR DELETE
  USING (auth.uid() = user_id);

-- Field report templates (users can see system templates + own)
CREATE POLICY "Users can view system and own templates"
  ON field_report_templates FOR SELECT
  USING (is_system = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON field_report_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can update own templates"
  ON field_report_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own templates"
  ON field_report_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = FALSE);

-- Field reports
CREATE POLICY "Users can view own reports"
  ON field_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON field_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON field_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON field_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Review templates (users can see system templates + own)
CREATE POLICY "Users can view system and own review templates"
  ON review_templates FOR SELECT
  USING (is_system = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own review templates"
  ON review_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can update own review templates"
  ON review_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own review templates"
  ON review_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = FALSE);

-- Reviews
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- User tracking stats
CREATE POLICY "Users can view own stats"
  ON user_tracking_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_tracking_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_tracking_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Milestones
CREATE POLICY "Users can view own milestones"
  ON milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones"
  ON milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sticking points
CREATE POLICY "Users can view own sticking points"
  ON sticking_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sticking points"
  ON sticking_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sticking points"
  ON sticking_points FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sticking points"
  ON sticking_points FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Insert system templates
-- ============================================

-- Field report templates
INSERT INTO field_report_templates (id, name, slug, description, icon, estimated_minutes, is_system, static_fields, dynamic_fields, active_dynamic_fields)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'The Speedrun',
    'quick-log',
    'Quick 30-second log for when you''re on the move',
    'Zap',
    1,
    TRUE,
    '[
      {"id": "datetime", "type": "datetime", "label": "When", "required": true},
      {"id": "location", "type": "text", "label": "Where", "required": true},
      {"id": "approach_count", "type": "number", "label": "Approaches", "required": true},
      {"id": "energy", "type": "scale", "label": "Energy Level", "min": 1, "max": 5, "required": true}
    ]'::jsonb,
    '[
      {"id": "best_moment", "type": "textarea", "label": "Best moment", "placeholder": "What was the highlight?"},
      {"id": "improvement", "type": "textarea", "label": "One thing to improve", "placeholder": "What would you do differently?"},
      {"id": "highlight_interaction", "type": "textarea", "label": "Highlight interaction", "placeholder": "Briefly describe your best approach"},
      {"id": "vibe", "type": "select", "label": "Overall vibe", "options": ["Crushing it", "Good flow", "Neutral", "Struggling", "Rough day"]}
    ]'::jsonb,
    ARRAY['best_moment']
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'The Debrief',
    'standard',
    'Standard field report for solid session analysis',
    'FileText',
    3,
    TRUE,
    '[
      {"id": "datetime", "type": "datetime", "label": "When", "required": true},
      {"id": "context", "type": "textarea", "label": "Context", "placeholder": "Where were you? Solo or with wing? Time of day?", "required": true},
      {"id": "breakdown", "type": "textarea", "label": "Approach breakdown", "placeholder": "What did you open with? How did she respond? How did it end?", "required": true},
      {"id": "takeaway", "type": "textarea", "label": "Key takeaway", "placeholder": "One thing you learned from this session", "required": true}
    ]'::jsonb,
    '[
      {"id": "went_well", "type": "textarea", "label": "What went well", "placeholder": "Celebrate your wins"},
      {"id": "work_on", "type": "textarea", "label": "What to work on", "placeholder": "Areas for improvement"},
      {"id": "emotional_state", "type": "textarea", "label": "Emotional state", "placeholder": "How were you feeling before, during, after?"},
      {"id": "technique", "type": "text", "label": "Technique attempted", "placeholder": "Any specific technique you tried?"},
      {"id": "do_differently", "type": "textarea", "label": "Would you do it differently?", "placeholder": "If you could replay, what would you change?"}
    ]'::jsonb,
    ARRAY['went_well', 'work_on']
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'The Forensics',
    'deep-dive',
    'Deep analysis for when you want to extract maximum learning',
    'Microscope',
    10,
    TRUE,
    '[
      {"id": "datetime", "type": "datetime", "label": "When", "required": true},
      {"id": "transcript", "type": "textarea", "label": "Full reconstruction", "placeholder": "Write out the interaction as best you can remember. What did you say? What did she say?", "required": true, "rows": 8},
      {"id": "skill_focus", "type": "text", "label": "Skill focus connection", "placeholder": "How does this relate to what you''re currently working on?", "required": true}
    ]'::jsonb,
    '[
      {"id": "emotional_before", "type": "textarea", "label": "Emotional state - Before", "placeholder": "How were you feeling walking up?"},
      {"id": "emotional_during", "type": "textarea", "label": "Emotional state - During", "placeholder": "What did you feel in the interaction?"},
      {"id": "emotional_after", "type": "textarea", "label": "Emotional state - After", "placeholder": "How did you feel walking away?"},
      {"id": "body_language", "type": "textarea", "label": "Body language", "placeholder": "What do you remember about your/her body language?"},
      {"id": "tonality", "type": "textarea", "label": "Voice & tonality", "placeholder": "How was your voice? Speed, volume, tone?"},
      {"id": "techniques", "type": "textarea", "label": "Techniques attempted", "placeholder": "What specific techniques did you try? How did they land?"},
      {"id": "her_signals", "type": "textarea", "label": "Reading her signals", "placeholder": "What was she communicating? IOIs, IODs, compliance tests?"},
      {"id": "environment", "type": "textarea", "label": "Environmental factors", "placeholder": "Anything about the environment that affected things?"},
      {"id": "inner_dialogue", "type": "textarea", "label": "Inner dialogue", "placeholder": "What were you thinking during the interaction?"}
    ]'::jsonb,
    ARRAY['emotional_before', 'emotional_during', 'emotional_after', 'techniques']
  ),
  (
    'd4e5f6a7-b8c9-0123-defa-234567890123',
    'The Phoenix',
    'blowout',
    'Turn harsh rejections into growth fuel',
    'Flame',
    5,
    TRUE,
    '[
      {"id": "datetime", "type": "datetime", "label": "When", "required": true},
      {"id": "what_happened", "type": "textarea", "label": "What happened (factual)", "placeholder": "Describe what happened objectively, without judgment", "required": true},
      {"id": "how_felt", "type": "textarea", "label": "How did it feel", "placeholder": "Be honest about the emotional impact", "required": true},
      {"id": "reframe", "type": "textarea", "label": "Reframe & learning", "placeholder": "What can you learn from this? How can you reframe it?", "required": true}
    ]'::jsonb,
    '[
      {"id": "do_again", "type": "select", "label": "Would you do it again?", "options": ["Absolutely", "Probably yes", "Maybe", "Probably not", "No way"]},
      {"id": "tell_friend", "type": "textarea", "label": "What would you tell a friend?", "placeholder": "If a friend experienced this, what would you say to them?"},
      {"id": "growth_edge", "type": "textarea", "label": "Growth edge", "placeholder": "What does this experience reveal about your growth edge?"},
      {"id": "silver_lining", "type": "text", "label": "Silver lining", "placeholder": "One positive thing from this experience"}
    ]'::jsonb,
    ARRAY['do_again', 'tell_friend']
  );

-- Review templates
INSERT INTO review_templates (id, name, slug, description, icon, estimated_minutes, review_type, is_system, static_fields, dynamic_fields, active_dynamic_fields)
VALUES
  (
    'e5f6a7b8-c9d0-1234-efab-345678901234',
    'The Quick Win',
    'quick-win',
    'Fast 5-minute review to capture the essentials',
    'Trophy',
    5,
    'weekly',
    TRUE,
    '[
      {"id": "wins", "type": "list", "label": "3 wins this week", "placeholder": "What went well? (any area of life)", "required": true, "count": 3},
      {"id": "lesson", "type": "textarea", "label": "One lesson learned", "placeholder": "What''s the biggest insight from this week?", "required": true},
      {"id": "focus", "type": "text", "label": "Next week''s focus", "placeholder": "One thing to focus on", "required": true}
    ]'::jsonb,
    '[
      {"id": "gratitude", "type": "textarea", "label": "Gratitude moment", "placeholder": "What are you grateful for?"},
      {"id": "challenge", "type": "textarea", "label": "Biggest challenge", "placeholder": "What was hard this week?"},
      {"id": "energy", "type": "scale", "label": "Overall energy this week", "min": 1, "max": 10}
    ]'::jsonb,
    ARRAY[]::text[]
  ),
  (
    'f6a7b8c9-d0e1-2345-fabc-456789012345',
    'The Operator',
    'operator',
    'Balanced 10-minute review for consistent progress',
    'Target',
    10,
    'weekly',
    TRUE,
    '[
      {"id": "went_well", "type": "textarea", "label": "What went well?", "placeholder": "Life + game wins this week", "required": true},
      {"id": "patterns", "type": "textarea", "label": "Patterns I''m noticing", "placeholder": "What recurring themes are you seeing?", "required": true},
      {"id": "advice_past", "type": "textarea", "label": "Advice to last-week-me", "placeholder": "What would you tell yourself a week ago?", "required": true},
      {"id": "commitment", "type": "textarea", "label": "Next week''s commitment", "placeholder": "What do you commit to?", "required": true}
    ]'::jsonb,
    '[
      {"id": "numbers", "type": "textarea", "label": "Numbers snapshot", "placeholder": "Approaches, numbers, dates..."},
      {"id": "sticking_point", "type": "textarea", "label": "Current sticking point", "placeholder": "What''s holding you back right now?"},
      {"id": "mindset", "type": "textarea", "label": "Mindset check", "placeholder": "How''s your mental state?"},
      {"id": "life_balance", "type": "textarea", "label": "Life balance", "placeholder": "How are other areas of life affecting your game?"}
    ]'::jsonb,
    ARRAY['numbers']
  ),
  (
    'a7b8c9d0-e1f2-3456-abcd-567890123456',
    'The Deep Thinker',
    'deep-thinker',
    'Comprehensive 20-minute deep dive into your week',
    'Brain',
    20,
    'weekly',
    TRUE,
    '[
      {"id": "wins_game", "type": "list", "label": "Game wins", "placeholder": "Wins in your dating life", "count": 3, "required": true},
      {"id": "wins_life", "type": "list", "label": "Life wins", "placeholder": "Wins in other areas", "count": 3, "required": true},
      {"id": "lessons", "type": "textarea", "label": "Lessons & insights", "placeholder": "What did you learn this week?", "required": true},
      {"id": "patterns", "type": "textarea", "label": "Behavioral patterns", "placeholder": "What patterns in your behavior/results are you noticing?", "required": true},
      {"id": "adjustments", "type": "textarea", "label": "Strategic adjustments", "placeholder": "What will you do differently?", "required": true},
      {"id": "commitment", "type": "textarea", "label": "Detailed commitment", "placeholder": "Your commitment for next week", "required": true}
    ]'::jsonb,
    '[
      {"id": "emotional_state", "type": "textarea", "label": "Emotional/mental state", "placeholder": "How are you feeling overall?"},
      {"id": "gratitude", "type": "list", "label": "Gratitude list", "count": 3},
      {"id": "stretch_goal", "type": "text", "label": "Stretch goal", "placeholder": "An ambitious extra goal"},
      {"id": "identity", "type": "textarea", "label": "Identity evolution", "placeholder": "Who are you becoming?"},
      {"id": "energy_audit", "type": "textarea", "label": "Energy audit", "placeholder": "What gave you energy? What drained it?"}
    ]'::jsonb,
    ARRAY['emotional_state', 'gratitude']
  ),
  (
    'b8c9d0e1-f2a3-4567-bcde-678901234567',
    'Monthly Retrospective',
    'monthly',
    'Big picture view of your month',
    'Calendar',
    15,
    'monthly',
    TRUE,
    '[
      {"id": "month_summary", "type": "textarea", "label": "Month at a glance", "placeholder": "Summarize your month in a few sentences", "required": true},
      {"id": "biggest_wins", "type": "list", "label": "Biggest wins", "count": 5, "required": true},
      {"id": "key_lessons", "type": "list", "label": "Key lessons", "count": 3, "required": true},
      {"id": "sticking_points", "type": "textarea", "label": "Recurring sticking points", "placeholder": "What patterns keep showing up?", "required": true},
      {"id": "next_month_theme", "type": "text", "label": "Next month''s theme", "placeholder": "One word or phrase to guide next month", "required": true}
    ]'::jsonb,
    '[
      {"id": "milestones", "type": "list", "label": "Milestones achieved", "count": 3},
      {"id": "comparison", "type": "textarea", "label": "Compared to last month", "placeholder": "How does this month compare?"},
      {"id": "life_integration", "type": "textarea", "label": "Life integration", "placeholder": "How is game affecting other areas of life?"}
    ]'::jsonb,
    ARRAY['milestones']
  ),
  (
    'c9d0e1f2-a3b4-5678-cdef-789012345678',
    'Quarterly Deep Dive',
    'quarterly',
    'Strategic review of your quarter',
    'Compass',
    30,
    'quarterly',
    TRUE,
    '[
      {"id": "three_months_ago", "type": "textarea", "label": "Where were you 3 months ago?", "placeholder": "Reflect on your starting point", "required": true},
      {"id": "major_shifts", "type": "textarea", "label": "Major shifts", "placeholder": "What''s changed in your mindset and skills?", "required": true},
      {"id": "goal_review", "type": "textarea", "label": "Goal review", "placeholder": "Are you on track for your larger goals?", "required": true},
      {"id": "identity_evolution", "type": "textarea", "label": "Identity evolution", "placeholder": "Who are you becoming?", "required": true},
      {"id": "next_quarter", "type": "textarea", "label": "Next quarter vision", "placeholder": "What do you want to achieve in the next 3 months?", "required": true}
    ]'::jsonb,
    '[
      {"id": "course_correction", "type": "textarea", "label": "Course correction needed?", "placeholder": "Any strategic changes needed?"},
      {"id": "future_self", "type": "textarea", "label": "Letter to future self", "placeholder": "Write to yourself 3 months from now"},
      {"id": "top_memories", "type": "list", "label": "Top memories from this quarter", "count": 5}
    ]'::jsonb,
    ARRAY['course_correction']
  );
