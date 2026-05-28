import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export type UserRole = 'student' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  student_id: string | null;
  full_name: string;
  class_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Experiment {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number;
  objectives: string[];
  chemicals: string[];
  equipment: string[];
  steps: ExperimentStep[];
  safety_notes: string[];
  is_active: boolean;
  created_at: string;
}

export interface ExperimentStep {
  step: number;
  title: string;
  desc: string;
}

export interface AttendanceSession {
  id: string;
  student_id: string;
  experiment_id: string | null;
  session_date: string;
  entry_time: string;
  exit_time: string | null;
  device_type: string;
  status: 'active' | 'completed' | 'abandoned';
  ip_address: string;
  created_at: string;
  profiles?: Profile;
  experiments?: Experiment;
}

export interface ExperimentResult {
  id: string;
  session_id: string;
  student_id: string;
  experiment_id: string;
  score: number;
  steps_completed: number;
  total_steps: number;
  observations: string;
  mistakes_made: unknown[];
  ai_hints_used: number;
  time_taken_minutes: number;
  reaction_outcomes: Record<string, unknown>;
  completed_at: string;
  created_at: string;
  experiments?: Experiment;
}

export interface AiInteraction {
  id: string;
  session_id: string;
  student_id: string;
  question: string;
  answer: string;
  interaction_type: 'text' | 'voice' | 'hint' | 'correction';
  step_context: string;
  created_at: string;
}
