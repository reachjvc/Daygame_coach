-- =============================================
-- DAYGAME COACH: Complete RLS Implementation
-- SECURITY REVIEWED: 2026-02-04
-- FIXES: milestones, user_tracking_stats, scenarios → SELECT only
-- =============================================

-- =============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracking_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticking_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inner_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE "values" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: PROFILES TABLE
-- Note: profiles.id IS the auth user id (not user_id)
-- =============================================

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (id = auth.uid());

-- =============================================
-- STEP 3: SESSIONS TABLE
-- =============================================

CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sessions_insert_own" ON sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_delete_own" ON sessions
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 4: APPROACHES TABLE
-- =============================================

CREATE POLICY "approaches_select_own" ON approaches
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "approaches_insert_own" ON approaches
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "approaches_update_own" ON approaches
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "approaches_delete_own" ON approaches
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 5: FIELD REPORTS TABLE
-- =============================================

CREATE POLICY "field_reports_select_own" ON field_reports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "field_reports_insert_own" ON field_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "field_reports_update_own" ON field_reports
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "field_reports_delete_own" ON field_reports
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 6: FIELD REPORT TEMPLATES (Mixed: System + Custom)
-- =============================================

CREATE POLICY "field_report_templates_select" ON field_report_templates
  FOR SELECT USING (
    is_system = true
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "field_report_templates_insert_own" ON field_report_templates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_system = false
  );

CREATE POLICY "field_report_templates_update_own" ON field_report_templates
  FOR UPDATE
  USING (user_id = auth.uid() AND is_system = false)
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "field_report_templates_delete_own" ON field_report_templates
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- =============================================
-- STEP 7: REVIEWS TABLE
-- =============================================

CREATE POLICY "reviews_select_own" ON reviews
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 8: REVIEW TEMPLATES (Mixed: System + Custom)
-- =============================================

CREATE POLICY "review_templates_select" ON review_templates
  FOR SELECT USING (
    is_system = true
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "review_templates_insert_own" ON review_templates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_system = false
  );

CREATE POLICY "review_templates_update_own" ON review_templates
  FOR UPDATE
  USING (user_id = auth.uid() AND is_system = false)
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "review_templates_delete_own" ON review_templates
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- =============================================
-- STEP 9: USER TRACKING STATS (SYSTEM-ONLY - SELECT ONLY!)
-- =============================================
-- Stats are computed by incrementApproachStats() in trackingRepo.ts
-- Writes happen via service role after verifiable user actions
-- NO user INSERT/UPDATE policies - this is intentional

CREATE POLICY "user_tracking_stats_select_own" ON user_tracking_stats
  FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- STEP 10: MILESTONES (SYSTEM-ONLY - SELECT ONLY!)
-- =============================================
-- Milestones are awarded by checkAndAwardMilestone() in trackingRepo.ts
-- Writes happen via service role after verifiable achievements
-- NO user INSERT/UPDATE/DELETE policies - this is intentional

CREATE POLICY "milestones_select_own" ON milestones
  FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- STEP 11: STICKING POINTS
-- =============================================

CREATE POLICY "sticking_points_select_own" ON sticking_points
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sticking_points_insert_own" ON sticking_points
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sticking_points_update_own" ON sticking_points
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "sticking_points_delete_own" ON sticking_points
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 12: USER VALUES
-- =============================================

CREATE POLICY "user_values_select_own" ON user_values
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_values_insert_own" ON user_values
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_values_delete_own" ON user_values
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 13: VALUE COMPARISONS
-- =============================================

CREATE POLICY "value_comparisons_select_own" ON value_comparisons
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "value_comparisons_insert_own" ON value_comparisons
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "value_comparisons_delete_own" ON value_comparisons
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- STEP 14: INNER GAME PROGRESS
-- =============================================

CREATE POLICY "inner_game_progress_select_own" ON inner_game_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "inner_game_progress_insert_own" ON inner_game_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "inner_game_progress_update_own" ON inner_game_progress
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================
-- STEP 15: SCENARIOS (SYSTEM-ONLY - SELECT ONLY!)
-- =============================================
-- Scenarios include xp_earned - must be server-controlled
-- Writes happen via service role after valid AI evaluations
-- NO user INSERT/UPDATE/DELETE policies - this is intentional

CREATE POLICY "scenarios_select_own" ON scenarios
  FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- STEP 16: PURCHASES (SYSTEM-ONLY - SELECT ONLY!)
-- =============================================
-- Purchases are created ONLY by Stripe webhooks via service role
-- NO INSERT/UPDATE/DELETE policies for users - this is intentional

CREATE POLICY "purchases_select_own" ON purchases
  FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- STEP 17: SHARED TABLES (Read-Only for All Authenticated Users)
-- =============================================

CREATE POLICY "values_select_authenticated" ON "values"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "embeddings_select_authenticated" ON embeddings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================
-- VERIFICATION QUERIES (Run manually after migration)
-- =============================================

-- Verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- List all policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
