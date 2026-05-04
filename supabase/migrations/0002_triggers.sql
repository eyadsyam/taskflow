-- =====================================================
-- Auto-update updated_at
-- =====================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- =====================================================
-- Prevent editing paid_closed tasks (DB-level lock)
-- Admins may override using set_config('app.override_lock', 'true', true).
-- =====================================================
create or replace function public.prevent_locked_task_edit()
returns trigger language plpgsql as $$
declare
  override text;
begin
  override := current_setting('app.override_lock', true);
  if old.status = 'paid_closed' and (override is null or override <> 'true') then
    raise exception 'Cannot modify a paid and closed task (task_id=%)', old.id
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger lock_paid_tasks
before update on public.tasks
for each row execute function public.prevent_locked_task_edit();

-- =====================================================
-- Auto-log field changes to task_history
-- =====================================================
create or replace function public.log_task_changes()
returns trigger language plpgsql security definer as $$
declare
  actor uuid;
begin
  actor := coalesce(auth.uid(), new.created_by);

  if new.title is distinct from old.title then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'title', old.title, new.title);
  end if;
  if new.description is distinct from old.description then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'description', old.description, new.description);
  end if;
  if new.status is distinct from old.status then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'status', old.status, new.status);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'assigned_to', old.assigned_to::text, new.assigned_to::text);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'due_date', old.due_date::text, new.due_date::text);
  end if;
  if new.price is distinct from old.price then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'price', old.price::text, new.price::text);
  end if;
  if new.client_name is distinct from old.client_name then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'client_name', old.client_name, new.client_name);
  end if;
  if new.client_contact is distinct from old.client_contact then
    insert into public.task_history (task_id, changed_by, field_name, old_value, new_value)
    values (new.id, actor, 'client_contact', old.client_contact, new.client_contact);
  end if;
  return new;
end;
$$;

create trigger tasks_log_changes
after update on public.tasks
for each row execute function public.log_task_changes();

-- =====================================================
-- Auto-create profile when a new auth user is created
-- =====================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'work_team'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- Helper: notify edge function via pg_net (optional)
-- If pg_net extension is installed you can enable async webhooks.
-- Otherwise the frontend / edge function invocation is used.
-- =====================================================
