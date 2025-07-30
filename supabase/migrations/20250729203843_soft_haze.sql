/*
  # Fix Database Schema and Add Admin Support

  1. Schema Fixes
    - Add missing role column to user_profiles
    - Add missing tables for contact and feedback submissions
    - Fix any missing columns and constraints

  2. Admin Support
    - Add role-based access control
    - Create admin-specific tables for managing submissions

  3. Security
    - Update RLS policies for admin access
    - Maintain existing user data isolation
*/

-- Add role column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Create contact submissions table for contact form
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'general' CHECK (type IN ('general', 'support', 'bug', 'feature')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create feedback submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category text NOT NULL CHECK (category IN ('general', 'feature', 'bug', 'improvement')),
  title text NOT NULL,
  description text NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'implemented')),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on new tables
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for contact submissions (admins can see all, users can see their own)
CREATE POLICY "Admins can manage all contact submissions"
  ON contact_submissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert contact submissions"
  ON contact_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for feedback submissions (admins can see all, users can see their own)
CREATE POLICY "Admins can manage all feedback submissions"
  ON feedback_submissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert feedback submissions"
  ON feedback_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own feedback submissions"
  ON feedback_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update user_profiles policies to allow admin access
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all user profiles for user management
CREATE POLICY "Admins can read all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at);

-- Create a default admin user profile trigger
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();