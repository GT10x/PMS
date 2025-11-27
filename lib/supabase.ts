import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'project_manager' | 'developer' | 'tester' | 'consultant'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  title: string
  description: string
  status: 'planning' | 'in_progress' | 'review' | 'completed'
  created_by: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
  due_date: string | null
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}
