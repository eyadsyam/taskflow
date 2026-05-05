// Hand-authored types for TaskFlow single-team workspace
export type TaskStatus =
  | "pending_client"
  | "in_progress"
  | "done_pending_payment"
  | "paid_closed";

export type UserRole = "admin" | "member";

export type ConversationType = "channel" | "dm" | "task";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  phone: string | null;
  job_title: string | null;
  bio: string | null;
  preferred_language: string;
  onboarding_completed: boolean;
  timezone: string;
  status_message: string | null;
  last_seen_at: string | null;
};

export type TeamSettings = {
  id: number;
  team_name: string;
  team_logo: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
};

export type AttachmentItem = {
  /** Full public URL of the file in storage */
  url: string;
  /** Original file name (basename) */
  name: string;
  /** Relative path inside the uploaded folder, e.g. "BigData/templates/file.pdf".
   *  For single files this is just the file name. */
  path: string;
  /** MIME type */
  type?: string | null;
  /** Size in bytes */
  size?: number | null;
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
  attachment_items: AttachmentItem[] | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

// Legacy types for old comments/history tables (still in DB but not used in UI)
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

export type Conversation = {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  icon: string | null;
  task_id: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_admin: boolean;
  is_muted: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  edited_at: string | null;
  created_at: string;
};

export type MessageAttachment = {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  created_at: string;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

// Composed types for UI
export type MessageWithRelations = Message & {
  author: Profile;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  reply_to?: Message & { author: Profile };
};

export type ConversationWithLastMessage = Conversation & {
  last_message?: Message & { author: Profile };
  unread_count?: number;
  members?: Profile[];
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, "id" | "full_name" | "email" | "role">; Update: Partial<Profile>; Relationships: [] };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task>; Relationships: [] };
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation>; Relationships: [] };
      conversation_members: { Row: ConversationMember; Insert: Partial<ConversationMember>; Update: Partial<ConversationMember>; Relationships: [] };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message>; Relationships: [] };
      message_attachments: { Row: MessageAttachment; Insert: Partial<MessageAttachment>; Update: Partial<MessageAttachment>; Relationships: [] };
      message_reactions: { Row: MessageReaction; Insert: Partial<MessageReaction>; Update: Partial<MessageReaction>; Relationships: [] };
      team_settings: { Row: TeamSettings; Insert: Partial<TeamSettings>; Update: Partial<TeamSettings>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type { Json };
