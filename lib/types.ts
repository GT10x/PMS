export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string | null;
          email: string | null;
          password_hash: string | null;
          full_name: string;
          role: 'admin' | 'project_manager' | 'cto' | 'consultant' | 'tester' | 'developer' | 'react_native_developer';
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username?: string | null;
          email?: string | null;
          password_hash?: string | null;
          full_name: string;
          role: 'admin' | 'project_manager' | 'cto' | 'consultant' | 'tester' | 'developer' | 'react_native_developer';
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          email?: string | null;
          password_hash?: string | null;
          full_name?: string;
          role?: 'admin' | 'project_manager' | 'cto' | 'consultant' | 'tester' | 'developer';
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_module_permissions: {
        Row: {
          id: string;
          user_id: string;
          module_name: string;
          has_access: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_name: string;
          has_access?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_name?: string;
          has_access?: boolean;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
          start_date: string | null;
          end_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
          start_date?: string | null;
          end_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          project_id: string;
          module_id: string;
          name: string;
          description: string | null;
          status: 'not_started' | 'in_progress' | 'testing' | 'completed' | 'deployed';
          priority: 'low' | 'medium' | 'high' | 'critical';
          owner_id: string | null;
          est_start_date: string | null;
          est_end_date: string | null;
          progress_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          module_id: string;
          name: string;
          description?: string | null;
          status?: 'not_started' | 'in_progress' | 'testing' | 'completed' | 'deployed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          owner_id?: string | null;
          est_start_date?: string | null;
          est_end_date?: string | null;
          progress_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          module_id?: string;
          name?: string;
          description?: string | null;
          status?: 'not_started' | 'in_progress' | 'testing' | 'completed' | 'deployed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          owner_id?: string | null;
          est_start_date?: string | null;
          est_end_date?: string | null;
          progress_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      functionalities: {
        Row: {
          id: string;
          module_id: string;
          name: string;
          description: string | null;
          owner_id: string | null;
          status: 'not_started' | 'in_progress' | 'testing' | 'completed';
          est_hours: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          name: string;
          description?: string | null;
          owner_id?: string | null;
          status?: 'not_started' | 'in_progress' | 'testing' | 'completed';
          est_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string | null;
          status?: 'not_started' | 'in_progress' | 'testing' | 'completed';
          est_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          functionality_id: string | null;
          module_id: string | null;
          title: string;
          description: string | null;
          assigned_to: string | null;
          status: 'backlog' | 'todo' | 'in_progress' | 'code_review' | 'testing' | 'done';
          priority: 'low' | 'medium' | 'high' | 'critical';
          due_date: string | null;
          est_hours: number | null;
          actual_hours: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          functionality_id?: string | null;
          module_id?: string | null;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          status?: 'backlog' | 'todo' | 'in_progress' | 'code_review' | 'testing' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          due_date?: string | null;
          est_hours?: number | null;
          actual_hours?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          functionality_id?: string | null;
          module_id?: string | null;
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          status?: 'backlog' | 'todo' | 'in_progress' | 'code_review' | 'testing' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          due_date?: string | null;
          est_hours?: number | null;
          actual_hours?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      sprints: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          sprint_number: number;
          goal: string | null;
          start_date: string;
          end_date: string;
          status: 'planning' | 'active' | 'review' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          sprint_number: number;
          goal?: string | null;
          start_date: string;
          end_date: string;
          status?: 'planning' | 'active' | 'review' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          sprint_number?: number;
          goal?: string | null;
          start_date?: string;
          end_date?: string;
          status?: 'planning' | 'active' | 'review' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          task_id: string | null;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// User role type
export type UserRole = 'admin' | 'project_manager' | 'cto' | 'consultant' | 'tester' | 'developer' | 'react_native_developer';

// User type
export type User = Database['public']['Tables']['users']['Row'];

// Project type
export type Project = Database['public']['Tables']['projects']['Row'];

// Module type
export type Module = Database['public']['Tables']['modules']['Row'];

// Functionality type
export type Functionality = Database['public']['Tables']['functionalities']['Row'];

// Task type
export type Task = Database['public']['Tables']['tasks']['Row'];

// Sprint type
export type Sprint = Database['public']['Tables']['sprints']['Row'];

// Comment type
export type Comment = Database['public']['Tables']['comments']['Row'];

// Module Permission type
export type ModulePermission = Database['public']['Tables']['user_module_permissions']['Row'];

// Module Feature type (individual features within a module)
export interface ModuleFeature {
  id: string;
  module_id: string;
  name: string;
  phase: number;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  remarks?: FeatureRemark[];
  created_by_user?: {
    id: string;
    full_name: string;
  };
}

// Q&A Question type
export interface QAQuestion {
  id: string;
  project_id: string;
  question_id: string;
  question_text: string;
  topic: string;
  priority: 'must' | 'should' | 'nice';
  assigned_to: string | null;
  context: string | null;
  cto_response: string | null;
  answer_text: string | null;
  answer_status: 'pending' | 'answered' | 'deferred' | 'follow_up';
  attachments: string[];
  deferred_to: string | null;
  deferred_from: string | null;
  deferred_note: string | null;
  parent_question_id: string | null;
  round: string | null;
  sort_order: number;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: { id: string; full_name: string; role: string };
  deferred_from_user?: { id: string; full_name: string; role: string };
  comments?: QAComment[];
  children?: QAQuestion[];
}

// Q&A Comment type
export interface QAComment {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  is_cto_response: boolean;
  created_at: string;
  updated_at: string;
  user?: { id: string; full_name: string; role: string };
}

// Feature Remark type (remarks/notes for a feature)
export interface FeatureRemark {
  id: string;
  feature_id: string;
  content: string | null;
  image_url: string | null;
  voice_url: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_user?: {
    id: string;
    full_name: string;
  };
}
