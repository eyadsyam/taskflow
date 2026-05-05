// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { callGemini, corsHeaders, json } from "../_shared/gemini.ts";

/**
 * AI-powered search over tasks.
 *
 * POST body: { query: string }
 *
 * Returns: {
 *   interpretation: string,           // human-readable summary
 *   filters: Filters,                 // structured filters used
 *   tasks: Task[]                     // matching tasks (limited)
 * }
 *
 * The flow:
 *   1. Ask Gemini to translate the user's Arabic/English query
 *      into a structured JSON filter.
 *   2. Execute the filter as a Supabase query.
 *   3. Return results + interpretation.
 */

type Filters = {
  status?: string[];
  tags?: string[];
  assignee_name?: string | null;
  client_name?: string | null;
  created_after?: string | null;  // ISO date
  created_before?: string | null;
  due_after?: string | null;
  due_before?: string | null;
  overdue?: boolean;
  keyword?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  limit?: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return json({ error: "اكتب سؤال للبحث" }, 400);
    }

    // Use caller's JWT so RLS is enforced.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Fetch available tag + team context so Gemini can map fuzzy names
    const [{ data: recentTasks }, { data: profiles }] = await Promise.all([
      supabase.from("tasks").select("tags, client_name").limit(200),
      supabase.from("profiles").select("full_name"),
    ]);

    const allTags = new Set<string>();
    const allClients = new Set<string>();
    for (const t of recentTasks ?? []) {
      for (const tag of (t as any).tags ?? []) allTags.add(tag);
      if ((t as any).client_name) allClients.add((t as any).client_name);
    }
    const teamNames = (profiles ?? []).map((p: any) => p.full_name).filter(Boolean);

    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `You are a search query parser. Convert the user's natural-language question (in Egyptian Arabic or English) into a JSON filter for searching tasks.

Current date: ${today}

Output schema (return ONLY the JSON object, no markdown):
{
  "status": null or array of one or more of ["pending_client","in_progress","done_pending_payment","paid_closed"],
  "tags": null or array of tag names,
  "assignee_name": null or a team member name,
  "client_name": null or a client name,
  "created_after": null or "YYYY-MM-DD",
  "created_before": null or "YYYY-MM-DD",
  "due_after": null or "YYYY-MM-DD",
  "due_before": null or "YYYY-MM-DD",
  "overdue": true if user asks for overdue/late tasks,
  "keyword": null or a short search keyword (for title/description),
  "min_price": null or number,
  "max_price": null or number,
  "limit": 20 (default)
}

Status mapping:
- "لسه"، "في انتظار العميل"، "واقف على العميل" → pending_client
- "شغال"، "في التنفيذ"، "قيد الإنجاز" → in_progress
- "خلص"، "جاهز"، "مستني فلوس"، "مستني دفع" → done_pending_payment
- "مقفول"، "اتدفع"، "اتقبض"، "خالص" → paid_closed

Team members available (match fuzzy Arabic/English):
${teamNames.join(", ") || "(none)"}

Popular tags:
${Array.from(allTags).slice(0, 50).join(", ") || "(none)"}

Popular clients:
${Array.from(allClients).slice(0, 50).join(", ") || "(none)"}

Rules:
- Return ONLY the JSON object (no markdown fences, no commentary).
- Use null for fields that don't apply.
- "الشهر ده" → current month, "الأسبوع ده" → current week, etc. Compute actual dates.
- "متأخر"، "اتأخر"، "late"، "overdue" → set overdue: true.
- If the user just wants everything, return {} (empty filters).
`;

    let rawJson = await callGemini(query, {
      systemInstruction: systemPrompt,
      temperature: 0.1,
      maxOutputTokens: 400,
    });
    rawJson = rawJson.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

    let filters: Filters = {};
    try {
      filters = JSON.parse(rawJson);
    } catch (e) {
      console.error("[ai-search] JSON parse error:", rawJson, e);
      return json({ error: "فشل في فهم السؤال، جرب صيغة تانية" }, 502);
    }

    // Build Supabase query
    let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });

    if (filters.status && filters.status.length > 0) {
      q = q.in("status", filters.status);
    }
    if (filters.tags && filters.tags.length > 0) {
      q = q.overlaps("tags", filters.tags);
    }
    if (filters.client_name) {
      q = q.ilike("client_name", `%${filters.client_name}%`);
    }
    if (filters.created_after) q = q.gte("created_at", filters.created_after);
    if (filters.created_before) q = q.lte("created_at", filters.created_before);
    if (filters.due_after) q = q.gte("due_date", filters.due_after);
    if (filters.due_before) q = q.lte("due_date", filters.due_before);
    if (filters.overdue) {
      q = q.lt("due_date", today).not("status", "eq", "paid_closed");
    }
    if (filters.min_price != null) q = q.gte("price", filters.min_price);
    if (filters.max_price != null) q = q.lte("price", filters.max_price);
    if (filters.keyword) {
      // Search in title or description (Supabase 'or' syntax)
      const kw = filters.keyword.replace(/[%,]/g, "");
      q = q.or(`title.ilike.%${kw}%,description.ilike.%${kw}%`);
    }
    // assignee_name → resolve to user id
    if (filters.assignee_name) {
      const { data: match } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${filters.assignee_name}%`)
        .limit(1)
        .maybeSingle();
      if (match?.id) q = q.eq("assigned_to", match.id as string);
    }

    q = q.limit(filters.limit ?? 20);
    const { data: tasks, error } = await q;
    if (error) return json({ error: error.message }, 500);

    // Build a friendly interpretation
    const parts: string[] = [];
    if (filters.status?.length) parts.push(`حالة: ${filters.status.join("، ")}`);
    if (filters.tags?.length) parts.push(`تاجات: ${filters.tags.join("، ")}`);
    if (filters.client_name) parts.push(`عميل: ${filters.client_name}`);
    if (filters.assignee_name) parts.push(`مسند لـ: ${filters.assignee_name}`);
    if (filters.overdue) parts.push(`متأخر`);
    if (filters.keyword) parts.push(`"${filters.keyword}"`);
    if (filters.due_after || filters.due_before) {
      parts.push(
        `تسليم: ${filters.due_after || "؟"} ← ${filters.due_before || "؟"}`,
      );
    }
    if (filters.created_after || filters.created_before) {
      parts.push(
        `اتعمل: ${filters.created_after || "؟"} ← ${filters.created_before || "؟"}`,
      );
    }
    const interpretation = parts.length > 0
      ? parts.join(" · ")
      : "كل التاسكات";

    return json({
      interpretation,
      filters,
      tasks: tasks ?? [],
      count: tasks?.length ?? 0,
    });
  } catch (e: any) {
    console.error("[ai-search] error:", e);
    return json({ error: e.message }, 500);
  }
});
