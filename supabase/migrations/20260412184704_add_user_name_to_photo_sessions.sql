/*
  # Add user_name column to photo_sessions

  1. Modified Tables
    - `photo_sessions`
      - Added `user_name` (text) - the visitor's Chinese name (2-3 characters) displayed on the spacesuit name badge

  2. Notes
    - Column is nullable to maintain backward compatibility with existing sessions
    - Default empty string for new inserts where name is not yet provided
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photo_sessions' AND column_name = 'user_name'
  ) THEN
    ALTER TABLE photo_sessions ADD COLUMN user_name text DEFAULT '';
  END IF;
END $$;
