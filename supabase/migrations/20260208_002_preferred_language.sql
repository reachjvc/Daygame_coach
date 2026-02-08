-- Add preferred_language column for scenario content language (da/en)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text;

-- Set default to Danish for existing users
UPDATE profiles SET preferred_language = 'da' WHERE preferred_language IS NULL;
