-- Migration: Add system_template_slug column to field_reports
-- Purpose: Allow storing system template slugs separately from custom template UUIDs
--
-- System templates use synthetic IDs like "system-quick-log" which are not valid UUIDs.
-- This column stores the slug (e.g., "quick-log") for system templates,
-- while template_id stores UUIDs for custom templates.
--
-- Date: 04-02-2026

-- Idempotent migration: handles both cases (tables exist or not)

-- First, ensure field_report_templates table exists (for FK)
CREATE TABLE IF NOT EXISTS field_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,
  is_system BOOLEAN NOT NULL DEFAULT false,
  base_template_id UUID REFERENCES field_report_templates(id),
  static_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  dynamic_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  active_dynamic_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create field_reports table if not exists
CREATE TABLE IF NOT EXISTS field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  template_id UUID REFERENCES field_report_templates(id),
  title TEXT,
  fields JSONB NOT NULL DEFAULT '{}'::JSONB,
  approach_count INTEGER,
  location TEXT,
  tags TEXT[],
  is_draft BOOLEAN NOT NULL DEFAULT false,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new column for system template slugs
ALTER TABLE field_reports
ADD COLUMN IF NOT EXISTS system_template_slug TEXT;

-- Add constraint: can't have both template_id AND system_template_slug
-- (only if constraint doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'field_reports_template_check'
  ) THEN
    ALTER TABLE field_reports
    ADD CONSTRAINT field_reports_template_check
    CHECK (NOT (template_id IS NOT NULL AND system_template_slug IS NOT NULL));
  END IF;
END $$;

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_field_reports_system_template
ON field_reports(system_template_slug) WHERE system_template_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_field_reports_user_id ON field_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_session_id ON field_reports(session_id);

-- Enable RLS if not already enabled
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_report_templates ENABLE ROW LEVEL SECURITY;
