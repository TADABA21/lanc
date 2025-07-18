/*
  # Fix Database Schema Alignment

  This migration aligns the database schema with the React Native app requirements:

  1. Database Changes
     - Rename team_members table to employees (or create alias)
     - Add missing user_id columns to all tables
     - Update foreign key references
     - Ensure all required columns exist

  2. Security
     - Update RLS policies to use user_id properly
     - Ensure proper access control for authenticated users

  3. Data Integrity
     - Maintain existing data during schema changes
     - Add proper constraints and defaults
*/

-- First, let's add user_id columns to tables that don't have them
-- We'll use a default UUID for existing records (you may want to update these manually)

-- Add user_id to clients if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    -- Set a default user_id for existing records (update this as needed)
    UPDATE clients SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to projects if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE projects SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to team_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE team_members ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE team_members SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE team_members ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to invoices if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE invoices SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to testimonials if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'testimonials' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE testimonials ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE testimonials SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE testimonials ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to activities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE activities SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE activities ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to contracts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE contracts SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE contracts ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add user_id to email_templates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE email_templates SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    ALTER TABLE email_templates ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Create a view for employees that maps to team_members
-- This allows the app to query 'employees' while keeping the existing team_members table
CREATE OR REPLACE VIEW employees AS
SELECT 
  id,
  name,
  email,
  phone,
  role,
  salary,
  status,
  department,
  emergency_contact,
  created_at,
  updated_at,
  hire_date,
  user_id
FROM team_members;

-- Update RLS policies to properly use user_id
DROP POLICY IF EXISTS "Users can delete clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can read all clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;

CREATE POLICY "Users can manage their own clients"
  ON clients FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can read all projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;

CREATE POLICY "Users can manage their own projects"
  ON projects FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete team members" ON team_members;
DROP POLICY IF EXISTS "Users can insert team members" ON team_members;
DROP POLICY IF EXISTS "Users can read all team members" ON team_members;
DROP POLICY IF EXISTS "Users can update team members" ON team_members;

CREATE POLICY "Users can manage their own team members"
  ON team_members FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Users can read all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;

CREATE POLICY "Users can manage their own invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can read all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can update testimonials" ON testimonials;

CREATE POLICY "Users can manage their own testimonials"
  ON testimonials FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update policies for other tables to use user_id properly
DROP POLICY IF EXISTS "Users can manage activities" ON activities;
CREATE POLICY "Users can manage their own activities"
  ON activities FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage contracts" ON contracts;
CREATE POLICY "Users can manage their own contracts"
  ON contracts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage email templates" ON email_templates;
CREATE POLICY "Users can manage their own email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update project_members policy to check project ownership
DROP POLICY IF EXISTS "Users can manage project members for their projects" ON project_members;
CREATE POLICY "Users can manage project members for their projects"
  ON project_members FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Update invoice_items policy to check invoice ownership
DROP POLICY IF EXISTS "Users can manage invoice items" ON invoice_items;
CREATE POLICY "Users can manage invoice items for their invoices"
  ON invoice_items FOR ALL
  TO authenticated
  USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()))
  WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));

-- Update project_files policy to check project ownership
DROP POLICY IF EXISTS "Users can manage project files" ON project_files;
CREATE POLICY "Users can manage project files for their projects"
  ON project_files FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));