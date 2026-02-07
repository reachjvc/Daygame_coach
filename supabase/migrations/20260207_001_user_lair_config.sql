-- =============================================
-- USER LAIR CONFIG: Customizable Dashboard Layout
-- Created: 2026-02-07
-- =============================================

-- =============================================
-- STEP 1: CREATE TABLE
-- =============================================

CREATE TABLE user_lair_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast lookup by user_id
CREATE INDEX idx_user_lair_config_user_id ON user_lair_config(user_id);

-- =============================================
-- STEP 2: ENABLE RLS
-- =============================================

ALTER TABLE user_lair_config ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 3: RLS POLICIES
-- Users can only access their own config
-- =============================================

CREATE POLICY "user_lair_config_select_own" ON user_lair_config
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_lair_config_insert_own" ON user_lair_config
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_lair_config_update_own" ON user_lair_config
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_lair_config_delete_own" ON user_lair_config
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 4: TRIGGER FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_user_lair_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_lair_config_updated_at_trigger
  BEFORE UPDATE ON user_lair_config
  FOR EACH ROW
  EXECUTE FUNCTION update_user_lair_config_updated_at();
