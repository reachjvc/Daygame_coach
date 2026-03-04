-- Add "daily" to the review_type for daily reflection reviews
-- The review_type column on reviews/review_templates is typed as TEXT,
-- so no ALTER TYPE is needed — validation happens at the app layer (Zod).
--
-- This migration is a no-op marker. The actual change is in:
--   src/db/trackingEnums.ts: REVIEW_TYPES now includes "daily"

SELECT 1;
