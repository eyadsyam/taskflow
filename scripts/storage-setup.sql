-- Update existing bucket
UPDATE storage.buckets 
SET public = true, 
    file_size_limit = 5368709120,
    allowed_mime_types = NULL
WHERE id = 'task-attachments';

-- Create chat-files bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-files', 'chat-files', true, 5368709120, NULL)
ON CONFLICT (id) DO UPDATE SET 
  public = true, 
  file_size_limit = 5368709120,
  allowed_mime_types = NULL;

-- Storage policies for chat-files - all authenticated users can upload/read
DROP POLICY IF EXISTS "chat_files_authenticated_all" ON storage.objects;
CREATE POLICY "chat_files_authenticated_all" ON storage.objects 
  FOR ALL TO authenticated 
  USING (bucket_id IN ('chat-files', 'task-attachments'))
  WITH CHECK (bucket_id IN ('chat-files', 'task-attachments'));

-- Public read for both buckets
DROP POLICY IF EXISTS "chat_files_public_read" ON storage.objects;
CREATE POLICY "chat_files_public_read" ON storage.objects 
  FOR SELECT TO public 
  USING (bucket_id IN ('chat-files', 'task-attachments'));
