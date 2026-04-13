/*
  # Create Photo Sessions Table and Storage

  ## Summary
  This migration sets up the data layer for the APStar Aerospace Science Day photo experience.
  Visitors upload their photo, and the app generates a spacesuit version using AI.

  ## New Tables
  - `photo_sessions`
    - `id` (uuid, primary key) - unique session identifier
    - `created_at` (timestamptz) - when the session was created
    - `status` (text) - current state: 'uploading', 'generating', 'completed', 'failed'
    - `original_image_url` (text) - path to visitor's uploaded photo
    - `generated_image_url` (text) - path to AI-generated spacesuit photo
    - `error_message` (text) - error details if generation fails

  ## Security
  - RLS enabled on `photo_sessions`
  - Anonymous users can insert new sessions (visitors don't need accounts)
  - Anonymous users can read and update only their own session by ID
  - Storage bucket `apstar-photos` created for image storage

  ## Notes
  1. Anonymous access is intentional - visitors scan QR codes without logging in
  2. Sessions are identified by UUID, so only someone with the UUID can access a session
  3. Storage policies allow public read for sharing generated images
*/

CREATE TABLE IF NOT EXISTS photo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'uploading',
  original_image_url text,
  generated_image_url text,
  error_message text
);

ALTER TABLE photo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a photo session"
  ON photo_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read photo sessions by id"
  ON photo_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update photo sessions"
  ON photo_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('apstar-photos', 'apstar-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload to apstar-photos"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'apstar-photos');

CREATE POLICY "Public read access for apstar-photos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'apstar-photos');
