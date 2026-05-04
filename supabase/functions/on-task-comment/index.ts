// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { renderShell, sendEmail, statusBadge, type StatusKey } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { comment_id } = await req.json();
    if (!comment_id) return json({ error: "comment_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: comment, error: cErr } = await supabase
      .from("task_comments")
      .select("id, content, is_internal, created_at, task_id, author:profiles!task_comments_author_id_fkey(full_name, role)")
      .eq("id", comment_id)
      .single();
    if (cErr || !comment) return json({ error: cErr?.message ?? "not found" }, 404);

    const { data: task } = await supabase
      .from("tasks")
      .select("id, title, status, client_name")
      .eq("id", comment.task_id)
      .single();
    if (!task) return json({ error: "task not found" }, 404);

    const { data: recipients } = await supabase
      .from("profiles")
      .select("email")
      .neq("email", "");
    const emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);
    if (emails.length === 0) return json({ ok: true, skipped: true });

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
    const taskUrl = `${appUrl}/tasks/${task.id}`;
    const author = (comment as any).author;

    const internalTag = comment.is_internal
      ? `<span style="background:#fde68a;color:#78350f;padding:2px 8px;border-radius:6px;font-size:11px;margin-inline-start:6px;">ملاحظة داخلية</span>`
      : "";

    const html = renderShell(
      `<p style="margin:0 0 12px;color:#64748b;font-size:14px;">${author?.full_name ?? "عضو"} (${author?.role ?? "team"}) علّق على تاسك:</p>
       <h3 style="margin:0 0 8px;font-size:16px;"><a href="${taskUrl}" style="color:#0f172a;text-decoration:none;">${escapeHtml(task.title)}</a> ${internalTag}</h3>
       <p style="margin:0 0 16px;">${statusBadge(task.status as StatusKey)}</p>
       <div style="background:#f8fafc;border-inline-start:3px solid #0f172a;padding:12px 16px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(comment.content)}</div>
       <p style="margin-top:12px;color:#64748b;font-size:12px;">العميل: ${escapeHtml(task.client_name)} &bull; ${new Date(comment.created_at).toLocaleString("ar-EG")}</p>`,
      `كومنت جديد على تاسك "${task.title}"`,
      taskUrl,
    );

    await sendEmail(emails, `💬 كومنت جديد على "${task.title}"`, html);
    return json({ ok: true, sent_to: emails.length });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
