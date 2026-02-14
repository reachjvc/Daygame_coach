-- Fix existing milestone goals incorrectly linked to weekly metrics.
-- These goals track cumulative totals, not weekly resets.
UPDATE user_goals SET linked_metric = 'approaches_cumulative'
  WHERE template_id = 'l3_approach_volume' AND linked_metric = 'approaches_weekly';

UPDATE user_goals SET linked_metric = 'numbers_cumulative'
  WHERE template_id = 'l3_phone_numbers' AND linked_metric = 'numbers_weekly';

UPDATE user_goals SET linked_metric = 'instadates_cumulative'
  WHERE template_id = 'l3_instadates' AND linked_metric = 'instadates_weekly';
