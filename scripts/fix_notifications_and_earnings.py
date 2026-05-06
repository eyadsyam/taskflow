# /// script
# dependencies = ["httpx"]
# ///
"""
Apply DB changes via the Supabase Management API (preserves UTF-8 properly,
unlike curl with embedded Arabic which got corrupted to '?????').

Run with:  uv run scripts/fix_notifications_and_earnings.py
"""

import httpx
import sys
import json

import os

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "hlonbqaegqjydfmyofxj")
PAT = os.environ.get("SUPABASE_PAT")
if not PAT:
    print("Set SUPABASE_PAT env var first.", file=__import__('sys').stderr)
    raise SystemExit(1)
URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

SQL_BLOCKS = [
    # ---- 1) Rewrite all notification trigger functions with proper UTF-8 Arabic ----
    """
    CREATE OR REPLACE FUNCTION public.on_task_insert_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE v_actor text; v_body text;
    BEGIN
      SELECT full_name INTO v_actor FROM profiles WHERE id = NEW.created_by;
      v_body := COALESCE(v_actor, 'حد') || ' ضاف تاسك جديد للعميل ' || NEW.client_name;
      IF NEW.due_date IS NOT NULL THEN
        v_body := v_body || ' · تسليم: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
      END IF;
      IF NEW.price IS NOT NULL THEN
        v_body := v_body || ' · السعر: ' || NEW.price || ' ' || COALESCE(NEW.currency, 'EGP');
      END IF;
      PERFORM notify_team(
        'task_created',
        'تاسك جديد: ' || NEW.title,
        v_body,
        '/tasks/' || NEW.id,
        NEW.created_by,
        jsonb_build_object('task_id', NEW.id, 'actor_id', NEW.created_by)
      );
      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_task_insert_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_task_update_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE
      v_status_label text;
      v_old_status_label text;
      v_status_map jsonb := jsonb_build_object(
        'pending_client', 'مستني العميل',
        'in_progress', 'شغال',
        'done_pending_payment', 'خلص ومستني الدفع',
        'paid_closed', 'اتدفع ومقفول'
      );
    BEGIN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        v_status_label := v_status_map->>NEW.status;
        v_old_status_label := v_status_map->>OLD.status;
        PERFORM notify_team(
          'task_status_changed',
          'الحالة اتغيرت: ' || NEW.title,
          'من ' || COALESCE(v_old_status_label, OLD.status) || ' لـ ' || COALESCE(v_status_label, NEW.status),
          '/tasks/' || NEW.id,
          NULL,
          jsonb_build_object('task_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
        );
      END IF;

      IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
        PERFORM notify_task_chat(
          NEW.id, NULL, 'task_due_changed',
          'موعد التسليم اتغير: ' || NEW.title,
          'الموعد الجديد: ' || COALESCE(to_char(NEW.due_date, 'YYYY-MM-DD HH24:MI'), 'مفيش موعد'),
          '/tasks/' || NEW.id,
          jsonb_build_object('task_id', NEW.id, 'old_due', OLD.due_date, 'new_due', NEW.due_date)
        );
      END IF;

      IF NEW.price IS DISTINCT FROM OLD.price THEN
        PERFORM notify_task_chat(
          NEW.id, NULL, 'task_price_changed',
          'السعر اتغير: ' || NEW.title,
          'السعر الجديد: ' || COALESCE(NEW.price::text, '-') || ' ' || COALESCE(NEW.currency, 'EGP'),
          '/tasks/' || NEW.id,
          jsonb_build_object('task_id', NEW.id, 'old_price', OLD.price, 'new_price', NEW.price)
        );
      END IF;

      IF jsonb_array_length(COALESCE(NEW.submission_items, '[]'::jsonb)) >
         jsonb_array_length(COALESCE(OLD.submission_items, '[]'::jsonb)) THEN
        PERFORM notify_team(
          'task_submitted',
          'ملفات تسليم جديدة: ' || NEW.title,
          'اترفعت ' || (jsonb_array_length(NEW.submission_items) - jsonb_array_length(COALESCE(OLD.submission_items, '[]'::jsonb)))
            || ' حاجة جاهزة للعميل ' || NEW.client_name,
          '/tasks/' || NEW.id,
          NULL,
          jsonb_build_object('task_id', NEW.id)
        );
      END IF;

      IF jsonb_array_length(COALESCE(NEW.attachment_items, '[]'::jsonb)) >
         jsonb_array_length(COALESCE(OLD.attachment_items, '[]'::jsonb)) THEN
        PERFORM notify_task_chat(
          NEW.id, NULL, 'task_files_added',
          'ملفات اتضافت: ' || NEW.title,
          'اترفعت ' || (jsonb_array_length(NEW.attachment_items) - jsonb_array_length(COALESCE(OLD.attachment_items, '[]'::jsonb)))
            || ' ملف للشغل',
          '/tasks/' || NEW.id,
          jsonb_build_object('task_id', NEW.id)
        );
      END IF;

      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_task_update_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_task_assigned_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      IF NEW.assigned_to IS NULL OR NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
        RETURN NEW;
      END IF;
      PERFORM notify_users(
        ARRAY[NEW.assigned_to]::uuid[],
        'task_assigned',
        'اتعينت على تاسك: ' || NEW.title,
        'العميل: ' || NEW.client_name ||
          CASE WHEN NEW.due_date IS NOT NULL THEN ' · تسليم: ' || to_char(NEW.due_date, 'YYYY-MM-DD') ELSE '' END,
        '/tasks/' || NEW.id,
        jsonb_build_object('task_id', NEW.id)
      );
      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_task_assigned_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_message_insert_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE
      v_sender text;
      v_conv_name text;
      v_reply_to_user uuid;
      v_mentioned_id uuid;
    BEGIN
      SELECT full_name INTO v_sender FROM profiles WHERE id = NEW.author_id;
      SELECT COALESCE(name, 'محادثة') INTO v_conv_name FROM conversations WHERE id = NEW.conversation_id;

      PERFORM notify_conversation_members(
        NEW.conversation_id, NEW.author_id, 'message_received',
        COALESCE(v_sender, 'حد') || ' في ' || v_conv_name,
        COALESCE(LEFT(NEW.content, 140), '[ملف]'),
        '/chat/' || NEW.conversation_id,
        jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
      );

      IF NEW.reply_to_id IS NOT NULL THEN
        SELECT author_id INTO v_reply_to_user FROM messages WHERE id = NEW.reply_to_id;
        IF v_reply_to_user IS NOT NULL AND v_reply_to_user <> NEW.author_id THEN
          PERFORM notify_users(
            ARRAY[v_reply_to_user]::uuid[],
            'message_reply',
            COALESCE(v_sender, 'حد') || ' رد عليك',
            COALESCE(LEFT(NEW.content, 140), '[ملف]'),
            '/chat/' || NEW.conversation_id,
            jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
          );
        END IF;
      END IF;

      IF NEW.content IS NOT NULL THEN
        FOR v_mentioned_id IN
          SELECT p.id FROM profiles p
          WHERE NEW.content ILIKE '%@' || split_part(p.full_name, ' ', 1) || '%'
            AND p.id <> NEW.author_id
        LOOP
          PERFORM notify_users(
            ARRAY[v_mentioned_id]::uuid[],
            'message_mention',
            COALESCE(v_sender, 'حد') || ' ذكرك في ' || v_conv_name,
            COALESCE(LEFT(NEW.content, 140), ''),
            '/chat/' || NEW.conversation_id,
            jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
          );
        END LOOP;
      END IF;

      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_message_insert_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_message_reaction_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE v_msg_author uuid; v_conv_id uuid; v_actor text;
    BEGIN
      SELECT author_id, conversation_id INTO v_msg_author, v_conv_id FROM messages WHERE id = NEW.message_id;
      IF v_msg_author IS NULL OR v_msg_author = NEW.user_id THEN RETURN NEW; END IF;
      SELECT full_name INTO v_actor FROM profiles WHERE id = NEW.user_id;
      PERFORM notify_users(
        ARRAY[v_msg_author]::uuid[],
        'message_reaction',
        NEW.emoji || ' ' || COALESCE(v_actor, 'حد') || ' عمل react',
        'على رسالتك',
        '/chat/' || v_conv_id,
        jsonb_build_object('conversation_id', v_conv_id, 'message_id', NEW.message_id, 'emoji', NEW.emoji)
      );
      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_message_reaction_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_task_comment_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE v_actor text; v_title text;
    BEGIN
      SELECT full_name INTO v_actor FROM profiles WHERE id = NEW.author_id;
      SELECT title INTO v_title FROM tasks WHERE id = NEW.task_id;
      IF v_title IS NULL THEN RETURN NEW; END IF;
      PERFORM notify_task_chat(
        NEW.task_id, NEW.author_id, 'task_comment',
        COALESCE(v_actor, 'حد') || ' علّق على ' || v_title,
        COALESCE(LEFT(NEW.content, 140), ''),
        '/tasks/' || NEW.task_id,
        jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
      );
      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_task_comment_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_conversation_member_added_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE v_conv_name text; v_conv_type text;
    BEGIN
      SELECT name, type INTO v_conv_name, v_conv_type FROM conversations WHERE id = NEW.conversation_id;
      PERFORM notify_users(
        ARRAY[NEW.user_id]::uuid[],
        'conversation_added',
        'اتضفت في ' || COALESCE(v_conv_name, 'محادثة'),
        'دلوقتي تقدر تشارك في الكلام',
        '/chat/' || NEW.conversation_id,
        jsonb_build_object('conversation_id', NEW.conversation_id, 'type', v_conv_type)
      );
      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_conversation_member_added_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_task_delete_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      PERFORM notify_team(
        'task_deleted',
        'اتمسح تاسك: ' || OLD.title,
        'العميل: ' || OLD.client_name,
        NULL,
        NULL,
        jsonb_build_object('task_id', OLD.id, 'task_title', OLD.title)
      );
      RETURN OLD;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_task_delete_notify: %', SQLERRM;
      RETURN OLD;
    END;
    $func$;
    """,

    """
    CREATE OR REPLACE FUNCTION public.on_profile_insert_notify()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      PERFORM notify_team(
        'member_joined',
        NEW.full_name || ' انضم للفريق',
        COALESCE(NEW.email, ''),
        '/team',
        NEW.id,
        jsonb_build_object('user_id', NEW.id)
      );
      RETURN NEW;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'on_profile_insert_notify: %', SQLERRM;
      RETURN NEW;
    END;
    $func$;
    """,

    # ---- 2) Auto-status: when first submission file is added → done_pending_payment ----
    """
    CREATE OR REPLACE FUNCTION public.fire_task_auto_status_on_submission()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    DECLARE
      old_count int;
      new_count int;
    BEGIN
      old_count := jsonb_array_length(COALESCE(OLD.submission_items, '[]'::jsonb));
      new_count := jsonb_array_length(COALESCE(NEW.submission_items, '[]'::jsonb));

      -- If user added the first submission file(s) AND status is still
      -- "pending_client" or "in_progress", auto-flip to "done_pending_payment".
      IF new_count > 0 AND old_count = 0
         AND NEW.status IN ('pending_client', 'in_progress')
         AND NEW.status = OLD.status THEN
        NEW.status := 'done_pending_payment';
      END IF;

      RETURN NEW;
    END;
    $func$;

    DROP TRIGGER IF EXISTS trg_task_auto_status_on_submission ON public.tasks;
    CREATE TRIGGER trg_task_auto_status_on_submission
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.fire_task_auto_status_on_submission();
    """,

    # ---- 3) Earnings calculation function (per task) ----
    """
    -- Returns the EGP-equivalent gross amount for a task (SAR converted at fixed rate)
    CREATE OR REPLACE FUNCTION public.task_amount_egp(p_price numeric, p_currency text)
    RETURNS numeric
    LANGUAGE sql
    IMMUTABLE
    AS $func$
      SELECT CASE
        WHEN p_price IS NULL THEN 0
        WHEN UPPER(COALESCE(p_currency, 'EGP')) = 'SAR' THEN p_price * 12.5
        ELSE p_price
      END;
    $func$;

    -- Returns the creator's percentage for a given EGP amount (10% under 1000, 20% over)
    CREATE OR REPLACE FUNCTION public.creator_share_pct(p_amount_egp numeric)
    RETURNS numeric
    LANGUAGE sql
    IMMUTABLE
    AS $func$
      SELECT CASE WHEN COALESCE(p_amount_egp, 0) < 1000 THEN 0.10 ELSE 0.20 END;
    $func$;

    -- View: per-task earnings breakdown
    CREATE OR REPLACE VIEW public.task_earnings AS
    SELECT
      t.id AS task_id,
      t.title,
      t.client_name,
      t.status,
      t.created_by,
      t.assigned_to,
      t.price,
      COALESCE(t.currency, 'EGP') AS currency,
      task_amount_egp(t.price, t.currency) AS amount_egp,
      creator_share_pct(task_amount_egp(t.price, t.currency)) AS creator_pct,
      ROUND(task_amount_egp(t.price, t.currency) * creator_share_pct(task_amount_egp(t.price, t.currency)), 2) AS creator_amount_egp,
      ROUND(task_amount_egp(t.price, t.currency) * (1 - creator_share_pct(task_amount_egp(t.price, t.currency))), 2) AS assignee_amount_egp,
      t.created_at,
      t.updated_at
    FROM public.tasks t;

    GRANT SELECT ON public.task_earnings TO anon, authenticated;

    -- Per-user earnings summary (only counts paid_closed tasks for "earned")
    CREATE OR REPLACE FUNCTION public.user_earnings(p_user uuid)
    RETURNS TABLE (
      total_earned_egp numeric,
      total_pending_egp numeric,
      tasks_created bigint,
      tasks_done bigint,
      tasks_paid bigint,
      created_earned_egp numeric,
      created_pending_egp numeric,
      assigned_earned_egp numeric,
      assigned_pending_egp numeric
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $func$
      WITH earnings AS (
        SELECT
          te.task_id,
          te.created_by,
          te.assigned_to,
          te.status,
          te.creator_amount_egp,
          te.assignee_amount_egp
        FROM task_earnings te
      )
      SELECT
        ROUND(COALESCE(SUM(CASE WHEN status = 'paid_closed' AND created_by = p_user THEN creator_amount_egp ELSE 0 END), 0)
              + COALESCE(SUM(CASE WHEN status = 'paid_closed' AND assigned_to = p_user THEN assignee_amount_egp ELSE 0 END), 0), 2) AS total_earned_egp,
        ROUND(COALESCE(SUM(CASE WHEN status <> 'paid_closed' AND created_by = p_user THEN creator_amount_egp ELSE 0 END), 0)
              + COALESCE(SUM(CASE WHEN status <> 'paid_closed' AND assigned_to = p_user THEN assignee_amount_egp ELSE 0 END), 0), 2) AS total_pending_egp,
        COUNT(*) FILTER (WHERE created_by = p_user) AS tasks_created,
        COUNT(*) FILTER (WHERE assigned_to = p_user) AS tasks_done,
        COUNT(*) FILTER (WHERE status = 'paid_closed' AND (created_by = p_user OR assigned_to = p_user)) AS tasks_paid,
        ROUND(COALESCE(SUM(CASE WHEN status = 'paid_closed' AND created_by = p_user THEN creator_amount_egp ELSE 0 END), 0), 2) AS created_earned_egp,
        ROUND(COALESCE(SUM(CASE WHEN status <> 'paid_closed' AND created_by = p_user THEN creator_amount_egp ELSE 0 END), 0), 2) AS created_pending_egp,
        ROUND(COALESCE(SUM(CASE WHEN status = 'paid_closed' AND assigned_to = p_user THEN assignee_amount_egp ELSE 0 END), 0), 2) AS assigned_earned_egp,
        ROUND(COALESCE(SUM(CASE WHEN status <> 'paid_closed' AND assigned_to = p_user THEN assignee_amount_egp ELSE 0 END), 0), 2) AS assigned_pending_egp
      FROM earnings;
    $func$;

    GRANT EXECUTE ON FUNCTION public.user_earnings(uuid) TO anon, authenticated;
    """,
]


def run_sql(client: httpx.Client, sql: str, label: str = ""):
    payload = json.dumps({"query": sql}, ensure_ascii=False).encode("utf-8")
    res = client.post(
        URL,
        content=payload,
        headers={
            "Authorization": f"Bearer {PAT}",
            "Content-Type": "application/json; charset=utf-8",
        },
        timeout=30.0,
    )
    if res.status_code >= 300:
        print(f"FAIL [{label}]: {res.status_code} {res.text[:500]}", file=sys.stderr)
        return False
    print(f"OK [{label}]")
    return True


def main():
    with httpx.Client() as client:
        for i, sql in enumerate(SQL_BLOCKS):
            ok = run_sql(client, sql, label=f"block-{i+1}")
            if not ok:
                sys.exit(1)
    print("\nAll DB changes applied successfully.")


if __name__ == "__main__":
    main()
