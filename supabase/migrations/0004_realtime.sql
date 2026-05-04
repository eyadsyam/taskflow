-- Enable realtime broadcasts on the tables the frontend subscribes to.
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.task_history;
