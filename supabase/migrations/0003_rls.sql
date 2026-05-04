-- =====================================================
-- Row Level Security policies
-- =====================================================

-- Helper: get current user's role
create or replace function public.current_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_history enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------- tasks ----------
create policy "tasks_select_authenticated"
  on public.tasks for select
  to authenticated
  using (true);

create policy "tasks_insert_client_or_admin"
  on public.tasks for insert
  to authenticated
  with check (
    public.current_role() in ('client_team', 'admin')
    and created_by = auth.uid()
  );

-- client_team: can update any field on non-locked tasks
create policy "tasks_update_client_team"
  on public.tasks for update
  to authenticated
  using (public.current_role() = 'client_team' and status <> 'paid_closed')
  with check (status <> 'paid_closed' or public.current_role() = 'admin');

-- work_team: can update (status / assigned_to enforced by UI + trigger ideally)
create policy "tasks_update_work_team"
  on public.tasks for update
  to authenticated
  using (public.current_role() = 'work_team' and status <> 'paid_closed')
  with check (true);

-- admin: full control
create policy "tasks_admin_all"
  on public.tasks for all
  to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "tasks_delete_admin"
  on public.tasks for delete
  to authenticated
  using (public.current_role() = 'admin');

-- ---------- task_comments ----------
create policy "comments_select_authenticated"
  on public.task_comments for select
  to authenticated
  using (true);

create policy "comments_insert_authenticated"
  on public.task_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.status <> 'paid_closed'
    )
  );

create policy "comments_update_own"
  on public.task_comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "comments_delete_admin_or_own"
  on public.task_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.current_role() = 'admin');

-- ---------- task_history ----------
create policy "history_select_authenticated"
  on public.task_history for select
  to authenticated
  using (true);

-- Only triggers (security definer) insert history; no direct inserts.
create policy "history_no_manual_write"
  on public.task_history for insert
  to authenticated
  with check (false);

-- ---------- Storage (task-attachments) ----------
create policy "attachments_read_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'task-attachments');

create policy "attachments_upload_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'task-attachments');

create policy "attachments_delete_own_or_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (owner = auth.uid() or public.current_role() = 'admin')
  );
