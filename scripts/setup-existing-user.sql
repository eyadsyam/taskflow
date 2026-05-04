-- Make existing user admin and add to general channel
UPDATE public.profiles 
SET role = 'admin', onboarding_completed = false
WHERE email = 'eyadsyam124@gmail.com';

-- Add all existing users to the general channel
INSERT INTO public.conversation_members (conversation_id, user_id)
SELECT c.id, p.id 
FROM public.conversations c, public.profiles p
WHERE c.type = 'channel' AND c.name = 'عام'
ON CONFLICT DO NOTHING;
