// deno-lint-ignore-file no-explicit-any
import { callGemini, corsHeaders, json } from "../_shared/gemini.ts";

/**
 * Suggests relevant tags for a task based on its description/client.
 * Returns short Arabic tag words that describe the type of work.
 *
 * POST body: { description?, client_name?, existing_tags?: string[] }
 * Returns:   { tags: string[] }  (up to 5 suggestions, excluding existing)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { description, client_name, existing_tags } = await req.json();

    if (!description && !client_name) {
      return json({ error: "اكتب تفاصيل أو اسم عميل الأول" }, 400);
    }

    const parts: string[] = [];
    if (client_name) parts.push(`العميل: ${client_name}`);
    if (description) parts.push(`التفاصيل:\n${description}`);
    if (existing_tags?.length) parts.push(`تاجات موجودة بالفعل (لا تكررها): ${existing_tags.join("، ")}`);

    const systemPrompt = `أنت مساعد بترشّح تاجات قصيرة لتاسكات الشغل.

قواعد:
- رجّع من 3 لـ 6 تاجات كلمة أو كلمتين كل واحد
- عربي مصري (تصميم، لوجو، موقع، إعلان، سوشيال، فيديو، إلخ)
- التاجات بتوصف نوع الشغل مش تفاصيله
- ممنوع التاجات الموجودة بالفعل
- رد بتنسيق JSON array بس، مثلاً: ["تصميم", "لوجو", "هوية بصرية"]
- ممنوع أي كلام أو markdown حوالين الـ JSON`;

    let raw = await callGemini(parts.join("\n\n"), {
      systemInstruction: systemPrompt,
      temperature: 0.5,
      maxOutputTokens: 150,
    });

    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

    let tags: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === "string");
    } catch {
      // Fallback: split by commas / newlines
      tags = raw
        .split(/[,،\n]/)
        .map((t: string) => t.trim().replace(/^["'«»\-*\s]+|["'«»\-*\s]+$/g, ""))
        .filter(Boolean);
    }

    // De-dup, filter existing, cap length
    const existingSet = new Set((existing_tags ?? []).map((t: string) => t.trim()));
    tags = Array.from(new Set(tags))
      .filter((t) => t && t.length <= 30 && !existingSet.has(t))
      .slice(0, 6);

    return json({ tags });
  } catch (e: any) {
    console.error("[suggest-task-tags] error:", e);
    return json({ error: e.message }, 500);
  }
});
