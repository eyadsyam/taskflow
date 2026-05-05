// deno-lint-ignore-file no-explicit-any
import { callGemini, corsHeaders, json } from "../_shared/gemini.ts";

/**
 * Improves / polishes a task description using Gemini.
 * Takes a messy description and returns a well-structured Arabic version
 * with clear sections (objective, deliverables, notes) when relevant.
 *
 * POST body: { description: string, client_name?, tags?: string[] }
 * Returns:   { description: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { description, client_name, tags } = await req.json();
    if (!description || description.trim().length < 5) {
      return json({ error: "اكتب شوية تفاصيل الأول" }, 400);
    }

    const parts: string[] = [];
    if (client_name) parts.push(`العميل: ${client_name}`);
    if (tags?.length) parts.push(`نوع الشغل: ${tags.join("، ")}`);
    parts.push(`التفاصيل الحالية:\n${description}`);

    const systemPrompt = `أنت مساعد ذكي بتساعد فريق شغل مصري في تحسين تفاصيل التاسكات.

المطلوب:
- خد التفاصيل اللي مكتوبة ورتّبها بشكل احترافي
- استخدم عربي مصري محترف (مش فصحى جامدة)
- نظّم المحتوى في شكل نقط لو مناسب
- لو فيه مطلوبات واضحة اعملها checklist بـ "-"
- لو فيه ملاحظات مهمة حطّها في النهاية تحت "ملاحظات:"
- ممنوع تخترع معلومات مش موجودة في النص الأصلي
- ممنوع تكتب مقدمة أو "هنا التفاصيل المحسنة" أو أي كلام زيادة
- رد بس بالنص المحسّن على طول`;

    const improved = await callGemini(parts.join("\n\n"), {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 800,
    });

    if (!improved) return json({ error: "فشل التحسين" }, 502);

    return json({ description: improved });
  } catch (e: any) {
    console.error("[improve-task-description] error:", e);
    return json({ error: e.message }, 500);
  }
});
