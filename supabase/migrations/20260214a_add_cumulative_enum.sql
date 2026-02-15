-- Add cumulative metric types to linked_metric enum
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'approaches_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'sessions_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'numbers_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'instadates_cumulative';
