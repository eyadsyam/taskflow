// Shared email helpers for Edge Functions.
// Uses Resend. Fallback: logs to console if RESEND_API_KEY is not configured.

export type StatusKey =
  | "pending_client"
  | "in_progress"
  | "done_pending_payment"
  | "paid_closed";

export const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  pending_client: { label: "مستنيين رد العميل", color: "#f59e0b" },
  in_progress: { label: "شغالين عليها", color: "#3b82f6" },
  done_pending_payment: { label: "خلصت - بنستنى الفلوس", color: "#f97316" },
  paid_closed: { label: "مغلق / مدفوع", color: "#22c55e" },
};

export function statusBadge(status: StatusKey): string {
  const m = STATUS_META[status] ?? { label: status, color: "#64748b" };
  return `<span style="background:${m.color};color:#fff;padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;">${m.label}</span>`;
}

export function renderShell(inner: string, title: string, ctaHref: string): string {
  return `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="padding:20px 24px;background:#0f172a;color:#fff;font-weight:700;font-size:18px;">TaskFlow</td></tr>
      <tr><td style="padding:24px;color:#0f172a;">
        <h2 style="margin:0 0 16px;font-size:18px;">${title}</h2>
        ${inner}
        <div style="margin-top:24px;">
          <a href="${ctaHref}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">شوف التاسك</a>
        </div>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f1f5f9;color:#64748b;font-size:12px;text-align:center;">TaskFlow &bull; Internal notifications</td></tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail(to: string[], subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "TaskFlow <noreply@taskflow.local>";
  if (!apiKey) {
    console.log("[email:mock]", { to, subject });
    return { ok: true, mocked: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error", res.status, body);
    return { ok: false, error: body };
  }
  return { ok: true };
}
