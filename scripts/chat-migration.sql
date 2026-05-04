-- Drop notification preferences (we are removing notifications)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS notification_preferences;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS company_name;

-- Add status (online/offline) and last_seen for presence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Team settings (single row for the entire team)
CREATE TABLE IF NOT EXISTS public.team_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  team_name TEXT NOT NULL DEFAULT 'فريق العمل',
  team_logo TEXT,
  primary_color TEXT DEFAULT '#7c3aed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.team_settings (id, team_name) VALUES (1, 'فريق العمل') ON CONFLICT DO NOTHING;

-- Conversations (channels and DMs)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('channel', 'dm', 'task')),
  name TEXT,
  description TEXT,
  icon TEXT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation members
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

-- Message attachments
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at, updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_update_conversation ON public.messages;
CREATE TRIGGER messages_update_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users (single team) have access
DROP POLICY IF EXISTS "team_all_conversations" ON public.conversations;
CREATE POLICY "team_all_conversations" ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team_all_members" ON public.conversation_members;
CREATE POLICY "team_all_members" ON public.conversation_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team_all_messages" ON public.messages;
CREATE POLICY "team_all_messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team_all_attachments" ON public.message_attachments;
CREATE POLICY "team_all_attachments" ON public.message_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team_all_reactions" ON public.message_reactions;
CREATE POLICY "team_all_reactions" ON public.message_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team_settings_read" ON public.team_settings;
CREATE POLICY "team_settings_read" ON public.team_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "team_settings_admin_write" ON public.team_settings;
CREATE POLICY "team_settings_admin_write" ON public.team_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create a default general channel
INSERT INTO public.conversations (id, type, name, description, icon, created_by)
SELECT gen_random_uuid(), 'channel', 'عام', 'القناة الرئيسية للفريق', 'hash', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.conversations WHERE type = 'channel' AND name = 'عام');
