// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * AI-powered task title generator.
 *
 * Uses OpenAI (gpt-4o-mini) to generate a concise, professional Arabic
 * task title from the task details.
 *
 * Required env var:
 *   OPENAI_API_KEY – OpenAI API key
 *
 * POST body: { description?, client_name?, tags?: string[], price?, currency? }
 * Returns:    { title: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ error: "OPENAI_API_KEY not configured" }, 503);
    }

    const { description, client_name, tags, price, currency } = await req.json();

    if (!description && !client_name && (!tags || tags.length === 0)) {
      return json({ error: "اكتب التفاصيل أو اسم العميل أو التاجات الأول" }, 400);
    }

    // Build context for the LLM
    const parts: string[] = [];
    if (client_name) parts.push(`العميل: ${client_name}`);
    if (tags && tags.length > 0) parts.push(`التاجات: ${tags.join("، ")}`);
    if (price) parts.push(`السعر: ${price} ${currency || "EGP"}`);
    if (description) parts.push(`التفاصيل:\n${description}`);
    const userContext = parts.join("\n");

    const systemPrompt = `أنت مساعد ذكي بتساعد فريق شغل مصري في كتابة عناوين تاسكات قصيرة ومحترفة.

قواعد:
- العنوان لازم يكون باللغة العربية (مصري عامي محترف).
- قصير جداً: من 3 لـ 8 كلمات بالكتير.
- يوصف نوع الشغل المطلوب بوضوح (مثلاً: تصميم لوجو، تطوير موقع، كتابة إعلان).
- لو فيه اسم عميل، ممكن تضيفه للعنوان (مثلاً: "تصميم لوجو لمطعم الندى").
- ممنوع تكتب أي علامات اقتباس أو نقط في الآخر.
- لو التفاصيل بالإنجليزي، خلي العنوان عربي برضه.
- رد بس بالعنوان من غير أي شرح أو مقدمة.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 60,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[generate-task-title] OpenAI error:", err);
      return json({ error: "فشل في الاتصال بالـ AI" }, 502);
    }

    const data = await res.json();
    let title: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Clean up: remove surrounding quotes, trailing periods, etc.
    title = title
      .replace(/^["'«»""'']+|["'«»""'']+$/g, "")
      .replace(/[.。]+$/g, "")
      .trim();

    if (!title) return json({ error: "مفيش عنوان اتولّد" }, 502);

    // Cap to 200 chars (matches DB schema)
    if (title.length > 200) title = title.substring(0, 200);

    return json({ title });
  } catch (e: any) {
    console.error("[generate-task-title] error:", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
