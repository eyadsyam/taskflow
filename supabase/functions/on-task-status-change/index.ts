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
    const { task_id, old_status, new_status, changed_by } = await req.json();
    if (!task_id || !new_status) return json({ error: "task_id and new_status required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: task } = await supabase
      .from("tasks")
      .select("id, title, client_name")
      .eq("id", task_id)
      .single();
    if (!task) return json({ error: "task not found" }, 404);

    let changer: any = null;
    if (changed_by) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", changed_by)
        .single();
      changer = data;
    }

    const { data: recipients } = await supabase.from("profiles").select("email");
    const emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);
    if (!emails.length) return json({ ok: true, skipped: true });

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
    const taskUrl = `${appUrl}/tasks/${task.id}`;

    const html = renderShell(
      `<p style="margin:0 0 12px;color:#64748b;font-size:14px;">حالة التاسك اتغيرت بواسطة ${changer?.full_name ?? "عضو"}${changer ? ` (${changer.role})` : ""}</p>
       <h3 style="margin:0 0 12px;font-size:16px;"><a href="${taskUrl}" style="color:#0f172a;text-decoration:none;">${escapeHtml(task.title)}</a></h3>
       <table cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
         <tr>
           <td style="padding-inline-end:12px;">${old_status ? statusBadge(old_status as StatusKey) : "—"}</td>
           <td style="padding:0 12px;color:#64748b;">←</td>
           <td>${statusBadge(new_status as StatusKey)}</td>
         </tr>
       </table>
       <p style="margin-top:12px;color:#64748b;font-size:12px;">العميل: ${escapeHtml(task.client_name)} &bull; ${new Date().toLocaleString("ar-EG")}</p>`,
      `تحديث حالة "${task.title}"`,
      taskUrl,
    );

    await sendEmail(emails, `🔄 تحديث حالة "${task.title}"`, html);
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
