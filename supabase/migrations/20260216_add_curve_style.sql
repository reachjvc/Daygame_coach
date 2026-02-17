-- Add curve_style column to profiles for milestone curve editor theme preference
ALTER TABLE profiles ADD COLUMN curve_style text NOT NULL DEFAULT 'zen';
