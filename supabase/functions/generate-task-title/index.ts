// deno-lint-ignore-file no-explicit-any
import { callGemini, corsHeaders, json } from "../_shared/gemini.ts";

/**
 * AI-powered task title generator (Gemini).
 * POST body: { description?, client_name?, tags?: string[], price?, currency? }
 * Returns:   { title: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { description, client_name, tags, price, currency } = await req.json();

    if (!description && !client_name && (!tags || tags.length === 0)) {
      return json({ error: "اكتب التفاصيل أو اسم العميل أو التاجات الأول" }, 400);
    }

    const parts: string[] = [];
    if (client_name) parts.push(`العميل: ${client_name}`);
    if (tags?.length) parts.push(`التاجات: ${tags.join("، ")}`);
    if (price) parts.push(`السعر: ${price} ${currency || "EGP"}`);
    if (description) parts.push(`التفاصيل:\n${description}`);
    const userContext = parts.join("\n");

    const systemPrompt = `أنت مساعد ذكي بتساعد فريق شغل مصري في كتابة عناوين تاسكات قصيرة ومحترفة.
قواعد:
- العنوان عربي مصري محترف
- قصير جداً: من 3 لـ 8 كلمات بالكتير
- يوصف نوع الشغل بوضوح (مثلاً: تصميم لوجو، تطوير موقع)
- لو فيه عميل ممكن تضيفه (مثلاً: "تصميم لوجو لمطعم الندى")
- ممنوع علامات اقتباس أو نقط في الآخر
- رد بس بالعنوان من غير أي شرح`;

    let title = await callGemini(userContext, {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 60,
    });

    title = title
      .replace(/^["'«»""'']+|["'«»""'']+$/g, "")
      .replace(/[.。]+$/g, "")
      .trim();

    if (!title) return json({ error: "مفيش عنوان اتولّد" }, 502);
    if (title.length > 200) title = title.substring(0, 200);

    return json({ title });
  } catch (e: any) {
    console.error("[generate-task-title] error:", e);
    return json({ error: e.message }, 500);
  }
});
