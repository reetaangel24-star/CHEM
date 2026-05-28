/*
  # VR ChemLab - Complete Database Schema

  ## Overview
  Full schema for the VR-Based Chemistry Laboratory with AI Assistance platform.

  ## New Tables

  ### profiles
  - Extended user profiles linked to auth.users
  - Stores role (student/admin), student ID, name, class

  ### experiments
  - Available chemistry experiments with metadata
  - Steps, required chemicals, expected outcomes

  ### attendance_sessions
  - Tracks each lab session automatically on entry
  - Records student, experiment, device type, timestamps

  ### experiment_results
  - Stores completed experiment data per student session
  - Score, observations, steps completed, AI interactions

  ### ai_interactions
  - Log of all AI tutor Q&A during experiments

  ## Security
  - RLS enabled on all tables
  - Students can only view/edit their own data
  - Admins can view all data
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  student_id text,
  full_name text NOT NULL DEFAULT '',
  class_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration_minutes int DEFAULT 30,
  objectives text[] DEFAULT '{}',
  chemicals text[] DEFAULT '{}',
  equipment text[] DEFAULT '{}',
  steps jsonb DEFAULT '[]',
  safety_notes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view active experiments"
  ON experiments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert experiments"
  ON experiments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update experiments"
  ON experiments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Attendance sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES experiments(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time timestamptz NOT NULL DEFAULT now(),
  exit_time timestamptz,
  device_type text DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'vr', 'tablet')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attendance"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all attendance"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can insert own attendance"
  ON attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own attendance"
  ON attendance_sessions FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can update all attendance"
  ON attendance_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Experiment results table
CREATE TABLE IF NOT EXISTS experiment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  score int DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  steps_completed int DEFAULT 0,
  total_steps int DEFAULT 0,
  observations text DEFAULT '',
  mistakes_made jsonb DEFAULT '[]',
  ai_hints_used int DEFAULT 0,
  time_taken_minutes int DEFAULT 0,
  reaction_outcomes jsonb DEFAULT '{}',
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own results"
  ON experiment_results FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all results"
  ON experiment_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can insert own results"
  ON experiment_results FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own results"
  ON experiment_results FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- AI interactions log table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  interaction_type text DEFAULT 'text' CHECK (interaction_type IN ('text', 'voice', 'hint', 'correction')),
  step_context text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own AI interactions"
  ON ai_interactions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all AI interactions"
  ON ai_interactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can insert own AI interactions"
  ON ai_interactions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_experiment ON attendance_sessions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON experiment_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_experiment ON experiment_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ai_session ON ai_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Seed default experiments
INSERT INTO experiments (title, description, category, difficulty, estimated_duration_minutes, objectives, chemicals, equipment, safety_notes, steps) VALUES
(
  'Acid-Base Titration',
  'Determine the concentration of an unknown acid using a standardized base solution through volumetric titration.',
  'Analytical Chemistry',
  'intermediate',
  45,
  ARRAY['Understand titration principles', 'Use burette accurately', 'Identify equivalence point', 'Calculate molarity'],
  ARRAY['HCl (0.1M)', 'NaOH (0.1M)', 'Phenolphthalein indicator', 'Distilled water'],
  ARRAY['Burette', 'Conical flask', 'Pipette', 'Retort stand', 'Funnel', 'Beaker'],
  ARRAY['Wear safety goggles', 'Handle acids carefully', 'Neutralize spills immediately'],
  '[{"step": 1, "title": "Setup burette", "desc": "Fill burette with NaOH solution to 0.00 mL mark"}, {"step": 2, "title": "Prepare sample", "desc": "Pipette 25 mL HCl into conical flask"}, {"step": 3, "title": "Add indicator", "desc": "Add 2-3 drops of phenolphthalein"}, {"step": 4, "title": "Titrate", "desc": "Slowly add NaOH until color changes to pale pink"}, {"step": 5, "title": "Record volume", "desc": "Note the burette reading and calculate"}]'::jsonb
),
(
  'Flame Test',
  'Identify metal ions in solution by observing the characteristic colors they produce in a flame.',
  'Inorganic Chemistry',
  'beginner',
  30,
  ARRAY['Identify metal ions by flame color', 'Understand electron excitation', 'Practice lab safety'],
  ARRAY['LiCl solution', 'NaCl solution', 'KCl solution', 'CuCl2 solution', 'CaCl2 solution'],
  ARRAY['Nichrome wire', 'Bunsen burner', 'Test tubes', 'Watch glass', 'Forceps'],
  ARRAY['Keep hair tied back', 'No flammable materials near burner', 'Use forceps only'],
  '[{"step": 1, "title": "Clean wire", "desc": "Dip nichrome wire in HCl and burn until no color"}, {"step": 2, "title": "Test lithium", "desc": "Dip wire in LiCl and observe flame color (red)"}, {"step": 3, "title": "Test sodium", "desc": "Dip wire in NaCl and observe (yellow)"}, {"step": 4, "title": "Test potassium", "desc": "Dip wire in KCl and observe (lilac/violet)"}, {"step": 5, "title": "Record observations", "desc": "Note all colors and identify unknown samples"}]'::jsonb
),
(
  'Electrolysis of Water',
  'Decompose water into hydrogen and oxygen gases using electrical current and analyze the products.',
  'Electrochemistry',
  'beginner',
  35,
  ARRAY['Understand electrolysis', 'Collect and test gases', 'Apply Faradays law'],
  ARRAY['Distilled water', 'Sodium sulfate (Na2SO4)', 'Dilute H2SO4'],
  ARRAY['Electrolysis apparatus', 'Power supply (6V DC)', 'Carbon electrodes', 'Test tubes', 'Connecting wires'],
  ARRAY['Low voltage only', 'Do not touch electrodes during experiment', 'Keep away from ignition sources'],
  '[{"step": 1, "title": "Setup apparatus", "desc": "Connect electrodes to power supply"}, {"step": 2, "title": "Prepare electrolyte", "desc": "Dissolve Na2SO4 in distilled water"}, {"step": 3, "title": "Start electrolysis", "desc": "Switch on power and observe bubble formation"}, {"step": 4, "title": "Collect gases", "desc": "Collect gas in inverted tubes over each electrode"}, {"step": 5, "title": "Test gases", "desc": "Test hydrogen with lit splint, oxygen with glowing splint"}]'::jsonb
),
(
  'Precipitation Reactions',
  'Observe and analyze double displacement reactions that form insoluble precipitates.',
  'Inorganic Chemistry',
  'beginner',
  25,
  ARRAY['Identify precipitation reactions', 'Write ionic equations', 'Understand solubility rules'],
  ARRAY['AgNO3 (0.1M)', 'NaCl (0.1M)', 'BaCl2 (0.1M)', 'Na2SO4 (0.1M)', 'Pb(NO3)2 (0.1M)', 'KI (0.1M)'],
  ARRAY['Test tubes', 'Test tube rack', 'Droppers', 'Beakers'],
  ARRAY['Silver nitrate stains - avoid skin contact', 'Barium compounds are toxic', 'Lead compounds are toxic'],
  '[{"step": 1, "title": "AgNO3 + NaCl", "desc": "Mix solutions and observe white AgCl precipitate"}, {"step": 2, "title": "BaCl2 + Na2SO4", "desc": "Mix and observe white BaSO4 precipitate"}, {"step": 3, "title": "Pb(NO3)2 + KI", "desc": "Mix and observe yellow PbI2 precipitate"}, {"step": 4, "title": "Write equations", "desc": "Write balanced molecular and net ionic equations"}, {"step": 5, "title": "Analysis", "desc": "Apply solubility rules to predict other precipitates"}]'::jsonb
)
ON CONFLICT DO NOTHING;
