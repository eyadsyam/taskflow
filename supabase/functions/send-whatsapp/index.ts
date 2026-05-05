// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * WhatsApp Business Cloud API notification sender.
 *
 * Required env vars (set via Supabase dashboard → Edge Functions → Secrets):
 *   WHATSAPP_TOKEN        – permanent system-user access token from Meta
 *   WHATSAPP_PHONE_ID     – the phone-number ID (not the number itself)
 *   WHATSAPP_BUSINESS_NUM – the business number for display (e.g. +201055224391)
 *
 * POST body: { event, title, body, link?, recipients?: string[] }
 *   - If recipients is omitted, sends to all team members who have a phone number.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    if (!token || !phoneId) {
      console.log("[whatsapp] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set – skipping");
      return json({ ok: true, skipped: true, reason: "no_credentials" });
    }

    const { event, title, body, link, recipients } = await req.json();
    if (!title) return json({ error: "title required" }, 400);

    // Get recipient phone numbers
    let phones: string[] = recipients ?? [];
    if (phones.length === 0) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("phone")
        .not("phone", "is", null);
      phones = (profiles ?? [])
        .map((p: any) => p.phone)
        .filter((p: string) => p && p.length >= 10);
    }

    if (phones.length === 0) {
      return json({ ok: true, skipped: true, reason: "no_recipients" });
    }

    // Normalize phone numbers (remove spaces, dashes, leading 0, ensure country code)
    phones = phones.map(normalizePhone).filter(Boolean);

    const appUrl = Deno.env.get("APP_URL") ?? "https://taskflow-manga.netlify.app";
    const fullLink = link ? `${appUrl}${link}` : appUrl;
    const message = `*${title}*\n${body || ""}\n\n${fullLink}`.trim();

    const results: any[] = [];
    for (const phone of phones) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { preview_url: true, body: message },
            }),
          },
        );
        const data = await res.json();
        results.push({ phone, status: res.status, data });
      } catch (e: any) {
        results.push({ phone, error: e.message });
      }
    }

    return json({ ok: true, event, sent: results.length, results });
  } catch (e: any) {
    console.error("[whatsapp] error:", e);
    return json({ error: e.message }, 500);
  }
});

function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-()]/g, "");
  // Remove leading + if present, we'll add it back
  if (p.startsWith("+")) p = p.substring(1);
  // Egyptian numbers: convert 01xxx to 201xxx
  if (p.startsWith("01") && p.length === 11) p = "2" + p;
  // If doesn't start with country code, assume Egypt
  if (p.length === 10 && p.startsWith("1")) p = "20" + p;
  return p;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
