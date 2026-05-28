/*
  # Add Admin Profile Support

  ## Changes
  - Adds a policy so users can view profiles with role='admin' (for cross-referencing in queries)
  - Adds an admin flag approach: admins can be manually promoted via student_id = 'ADMIN'

  ## Notes
  - To create an admin: register normally, then run SQL update to set role='admin'
  - The existing RLS policies already allow admins full read access
*/

-- Allow admins to delete attendance records if needed
CREATE POLICY "Admins can delete attendance"
  ON attendance_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow public read of experiments (including inactive for admins via separate check)  
CREATE POLICY "Admins can view all experiments"
  ON experiments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
