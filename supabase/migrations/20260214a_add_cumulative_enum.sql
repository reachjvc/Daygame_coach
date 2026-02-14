-- Add cumulative values to the linked_metric enum type
-- (Must be in its own migration — ALTER TYPE ... ADD VALUE cannot run inside a transaction)
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'approaches_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'sessions_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'numbers_cumulative';
ALTER TYPE linked_metric ADD VALUE IF NOT EXISTS 'instadates_cumulative';
