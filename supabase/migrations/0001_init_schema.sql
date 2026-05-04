-- TaskFlow initial schema
create extension if not exists "pgcrypto";

-- =====================================================
-- profiles (extends auth.users)
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('client_team', 'work_team', 'admin')) default 'work_team',
  avatar_url text,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- =====================================================
-- tasks
-- =====================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client_name text not null,
  client_contact text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending_client' check (status in (
    'pending_client',
    'in_progress',
    'done_pending_payment',
    'paid_closed'
  )),
  due_date date,
  price numeric(10,2),
  currency text default 'EGP',
  tags text[] default '{}',
  attachments text[] default '{}',
  is_locked boolean generated always as (status = 'paid_closed') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_status_idx on public.tasks(status);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_created_at_idx on public.tasks(created_at desc);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_search_idx on public.tasks using gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(client_name,'') || ' ' || coalesce(description,''))
);

-- =====================================================
-- task_comments
-- =====================================================
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index task_comments_task_id_idx on public.task_comments(task_id, created_at desc);

-- =====================================================
-- task_history
-- =====================================================
create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

create index task_history_task_id_idx on public.task_history(task_id, changed_at desc);

-- =====================================================
-- Storage bucket for attachments
-- =====================================================
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;
