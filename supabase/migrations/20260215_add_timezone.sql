-- Add timezone column to profiles for timezone-aware goal resets
ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT NULL;
