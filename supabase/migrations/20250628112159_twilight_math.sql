/*
  # Complete Business Management Database Schema

  1. New Tables
    - `clients` - Client information and contact details
    - `projects` - Project management with status tracking
    - `team_members` - Employee/team member records
    - `project_members` - Junction table for project assignments
    - `invoices` - Invoice management and billing
    - `invoice_items` - Line items for invoices
    - `contracts` - Contract management
    - `testimonials` - Client testimonials and reviews
    - `activities` - Activity feed for dashboard
    - `email_templates` - Email template management
    - `project_files` - File attachments for projects

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Proper foreign key relationships with auth.users

  3. Features
    - Custom enums for status fields
    - Automatic timestamp updates
    - Performance indexes
    - Employee view mapping to team_members
*/

-- Create custom types for better data consistency
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('todo', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_member_status AS ENUM ('active', 'on_leave', 'terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  company text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  budget numeric DEFAULT 0,
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT (CURRENT_DATE + interval '30 days'),
  client_id uuid,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text NOT NULL,
  department text DEFAULT '',
  salary numeric DEFAULT 0,
  hire_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  emergency_contact text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Project members junction table
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  team_member_id uuid,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, team_member_id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  project_id uuid,
  client_id uuid,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date DEFAULT (CURRENT_DATE + interval '30 days'),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  amount numeric DEFAULT 0,
  line_items jsonb DEFAULT '[]',
  notes text DEFAULT '',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL,
  client_id uuid,
  project_id uuid,
  content text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  project_id uuid,
  content text NOT NULL,
  rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  client_name text,
  client_position text,
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Activities table for dashboard feed
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  description text,
  entity_type text, -- 'project', 'client', 'invoice', etc.
  entity_id uuid,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- Project files table
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  file_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints after tables are created
DO $$
BEGIN
  -- Clients foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_user_id_fkey') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Projects foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'projects_client_id_fkey') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'projects_user_id_fkey') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Team members foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_user_id_fkey') THEN
    ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Project members foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_members_project_id_fkey') THEN
    ALTER TABLE project_members ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_members_team_member_id_fkey') THEN
    ALTER TABLE project_members ADD CONSTRAINT project_members_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE;
  END IF;

  -- Invoices foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_project_id_fkey') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_client_id_fkey') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_user_id_fkey') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Invoice items foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoice_items_invoice_id_fkey') THEN
    ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
  END IF;

  -- Contracts foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contracts_client_id_fkey') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contracts_project_id_fkey') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contracts_user_id_fkey') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Testimonials foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'testimonials_client_id_fkey') THEN
    ALTER TABLE testimonials ADD CONSTRAINT testimonials_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'testimonials_project_id_fkey') THEN
    ALTER TABLE testimonials ADD CONSTRAINT testimonials_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'testimonials_user_id_fkey') THEN
    ALTER TABLE testimonials ADD CONSTRAINT testimonials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Activities foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'activities_user_id_fkey') THEN
    ALTER TABLE activities ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Email templates foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'email_templates_user_id_fkey') THEN
    ALTER TABLE email_templates ADD CONSTRAINT email_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Project files foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_files_project_id_fkey') THEN
    ALTER TABLE project_files ADD CONSTRAINT project_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_files_uploaded_by_fkey') THEN
    ALTER TABLE project_files ADD CONSTRAINT project_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES team_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop and recreate policies for clients
  DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
  CREATE POLICY "Users can manage their own clients"
    ON clients FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for projects
  DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
  CREATE POLICY "Users can manage their own projects"
    ON projects FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for team_members
  DROP POLICY IF EXISTS "Users can manage their own team members" ON team_members;
  CREATE POLICY "Users can manage their own team members"
    ON team_members FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for project_members
  DROP POLICY IF EXISTS "Users can manage project members for their projects" ON project_members;
  CREATE POLICY "Users can manage project members for their projects"
    ON project_members FOR ALL
    TO authenticated
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Drop and recreate policies for invoices
  DROP POLICY IF EXISTS "Users can manage their own invoices" ON invoices;
  CREATE POLICY "Users can manage their own invoices"
    ON invoices FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for invoice_items
  DROP POLICY IF EXISTS "Users can manage invoice items for their invoices" ON invoice_items;
  CREATE POLICY "Users can manage invoice items for their invoices"
    ON invoice_items FOR ALL
    TO authenticated
    USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()))
    WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));

  -- Drop and recreate policies for contracts
  DROP POLICY IF EXISTS "Users can manage their own contracts" ON contracts;
  CREATE POLICY "Users can manage their own contracts"
    ON contracts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for testimonials
  DROP POLICY IF EXISTS "Users can manage their own testimonials" ON testimonials;
  CREATE POLICY "Users can manage their own testimonials"
    ON testimonials FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for activities
  DROP POLICY IF EXISTS "Users can manage their own activities" ON activities;
  CREATE POLICY "Users can manage their own activities"
    ON activities FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for email_templates
  DROP POLICY IF EXISTS "Users can manage their own email templates" ON email_templates;
  CREATE POLICY "Users can manage their own email templates"
    ON email_templates FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Drop and recreate policies for project_files
  DROP POLICY IF EXISTS "Users can manage project files for their projects" ON project_files;
  CREATE POLICY "Users can manage project files for their projects"
    ON project_files FOR ALL
    TO authenticated
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at 
  BEFORE UPDATE ON team_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at 
  BEFORE UPDATE ON contracts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at 
  BEFORE UPDATE ON email_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_team_member_id ON project_members(team_member_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_client_id ON testimonials(client_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_project_id ON testimonials(project_id);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type ON activities(entity_type);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- Create a view for employees that maps to team_members
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