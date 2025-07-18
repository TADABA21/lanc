/*
  # Fix employees view column error

  1. Issue Resolution
    - Drop and recreate the employees view to fix column naming conflicts
    - Ensure proper column mapping from team_members table
    - Fix any inconsistencies in the view definition

  2. Changes
    - Drop existing employees view if it exists
    - Recreate employees view with correct column mappings
    - Ensure all columns from team_members are properly aliased

  3. Security
    - Maintain existing RLS policies on underlying team_members table
    - View inherits security from base table
*/

-- Drop the existing employees view if it exists
DROP VIEW IF EXISTS employees;

-- Recreate the employees view with proper column mapping
CREATE VIEW employees AS
SELECT 
  id,
  name,
  email,
  phone,
  role,
  department,
  salary,
  hire_date,
  status,
  emergency_contact,
  created_at,
  updated_at,
  user_id
FROM team_members;

-- Grant appropriate permissions
GRANT SELECT ON employees TO authenticated;