-- =====================================================
-- Seed data for TaskFlow
-- Run AFTER creating users in Supabase Auth (see README).
-- This script assumes three users already exist in auth.users with known emails.
-- It will insert matching profiles (idempotent) and sample tasks.
-- =====================================================

-- Resolve IDs of seeded auth users
do $$
declare
  admin_id uuid;
  client_id uuid;
  work_id uuid;
begin
  select id into admin_id from auth.users where email = 'admin@taskflow.test';
  select id into client_id from auth.users where email = 'client@taskflow.test';
  select id into work_id from auth.users where email = 'work@taskflow.test';

  if admin_id is null or client_id is null or work_id is null then
    raise notice 'Seed users not found. Create them via the Supabase dashboard first.';
    return;
  end if;

  insert into public.profiles (id, full_name, email, role) values
    (admin_id, 'Admin User', 'admin@taskflow.test', 'admin'),
    (client_id, 'Omar ClientRel', 'client@taskflow.test', 'client_team'),
    (work_id, 'Ahmed Developer', 'work@taskflow.test', 'work_team')
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role;

  -- Sample tasks across all statuses
  insert into public.tasks (title, description, client_name, client_contact, assigned_to, created_by, status, due_date, price, tags)
  values
    ('تصميم لوجو لشركة نور', 'لوجو حديث بستايل ميني مال', 'شركة نور', '+201001234567', work_id, client_id, 'pending_client', current_date + 7, 1500, array['design','logo']),
    ('موقع ووردبريس لعيادة', 'موقع تعريفي مع نظام حجز', 'د. سارة محمود', '+201112223344', work_id, client_id, 'in_progress', current_date + 14, 8000, array['web','wordpress']),
    ('كامبين سوشيال ميديا', '5 بوستات تصميم + كتابة', 'براند القاهرة', '+201098765432', work_id, client_id, 'in_progress', current_date + 5, 3500, array['social','design']),
    ('هوية بصرية كاملة', 'لوجو + ألوان + تايبوجرافي', 'كافيه Beans', '+201055558888', work_id, client_id, 'done_pending_payment', current_date - 2, 6000, array['branding']),
    ('إعلان فيسبوك ممول', 'إدارة حملة لمدة شهر', 'متجر Aura', '+201233334444', work_id, client_id, 'done_pending_payment', current_date - 5, 2500, array['ads']),
    ('تصميم منيو مطعم', 'منيو بتصميمين عربي وإنجليزي', 'مطعم الشرق', '+201099887766', work_id, client_id, 'paid_closed', current_date - 20, 1200, array['print','menu']),
    ('موشن جرافيك تعريفي', 'فيديو 30 ثانية', 'شركة Vision', '+201044445555', work_id, client_id, 'paid_closed', current_date - 30, 4500, array['motion','video']),
    ('تصميم كارت شخصي', 'بزنس كارد لمهندس', 'م. خالد', '+201011112222', null, client_id, 'pending_client', current_date + 3, 300, array['print']),
    ('تحديث موقع قديم', 'نقل من HTML لنكست', 'شركة Delta', '+201077778888', work_id, client_id, 'in_progress', current_date + 21, 12000, array['web','nextjs']),
    ('بوست رمضاني', 'سلسلة تصاميم رمضان', 'براند Noor', '+201066665555', work_id, client_id, 'done_pending_payment', current_date - 1, 1800, array['social','design']);

  -- A couple of comments
  insert into public.task_comments (task_id, author_id, content, is_internal)
  select id, client_id, 'العميل طلب تعديل في الألوان', false from public.tasks where title = 'تصميم لوجو لشركة نور' limit 1;

  insert into public.task_comments (task_id, author_id, content, is_internal)
  select id, work_id, 'هبدأ التصميم النهارده إن شاء الله', false from public.tasks where title = 'موقع ووردبريس لعيادة' limit 1;
end $$;
