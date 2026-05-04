// Hand-authored types (run `npm run db:types` to regenerate from Supabase schema).
export type TaskStatus =
  | "pending_client"
  | "in_progress"
  | "done_pending_payment"
  | "paid_closed";

export type UserRole = "client_team" | "work_team" | "admin";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  bio: string | null;
  preferred_language: string;
  notification_preferences: NotificationPreferences;
  onboarding_completed: boolean;
  timezone: string;
};

export type NotificationPreferences = {
  email_new_task?: boolean;
  email_task_assigned?: boolean;
  email_task_status_change?: boolean;
  email_comments?: boolean;
  email_daily_digest?: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  client_name: string;
  client_contact: string | null;
  assigned_to: string | null;
  created_by: string;
  status: TaskStatus;
  due_date: string | null;
  price: number | null;
  currency: string | null;
  tags: string[] | null;
  attachments: string[] | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
};

export type TaskHistory = {
  id: string;
  task_id: string;
  changed_by: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "full_name" | "email" | "role">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at" | "is_locked" | "tags" | "attachments" | "currency"> & {
          id?: string;
          tags?: string[] | null;
          attachments?: string[] | null;
          currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Task, "id" | "is_locked" | "created_at">>;
        Relationships: [];
      };
      task_comments: {
        Row: TaskComment;
        Insert: Omit<TaskComment, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<TaskComment>;
        Relationships: [];
      };
      task_history: {
        Row: TaskHistory;
        Insert: Omit<TaskHistory, "id" | "changed_at"> & { id?: string; changed_at?: string };
        Update: Partial<TaskHistory>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type { Json };
