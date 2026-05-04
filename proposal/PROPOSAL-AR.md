# إياد صيام — مطور Full-Stack

**متخصص في بناء منتجات SaaS وتطبيقات Real-time وأنظمة تعاون الفرق**

البريد: eyadsyam124@gmail.com
GitHub: github.com/eyadsyam

---

## نبذة عن الشغل

أبني منتجات SaaS جاهزة للإنتاج من البداية للنهاية — من تصميم قاعدة البيانات و الـ API، مروراً بالبنية التحتية للـ real-time، لحد الواجهات النهائية للمستخدم.

فلسفتي في الشغل: كود نظيف، أمان افتراضي في الوصول للبيانات (RLS من أول يوم)، و UX محسوس إنه متصمم بعناية مش مستخدم قوالب جاهزة.

معظم شغلي الأخير كان على منتجات تعاون الفرق — real-time chat، presence، وصلاحيات role-based، و file storage على مستوى الإنتاج.

---

## نموذج من شغلي — TaskFlow

**منصة تعاون متكاملة للفرق: شات لحظي، إدارة مهام، ومشاركة ملفات.**

### الديمو
المستودع: https://github.com/eyadsyam/taskflow
Deployment على Vercel (اللينك متاح عند الطلب)

### المنصة بتعمل إيه

TaskFlow منتج SaaS داخلي للفرق بيجمع 3 workflows أساسية في منتج واحد:

1. **شات الفريق** — قنوات + رسائل مباشرة بـ delivery لحظي، typing indicators، reactions، رفع ملفات (أي حجم)، تعديل/حذف الرسائل، وردود threaded.

2. **إدارة المهام** — Kanban board + table views مع workflow من 4 حالات (مستني العميل → شغالين → مستنيين الفلوس → مقفول/مدفوع)، بيانات العملاء، التسعير، التاجات، والمرفقات.

3. **تعاون الفريق** — مؤشرات presence حية (online/away/offline) ظاهرة في كل صفحة، غرف نقاش لكل تاسك، ورسائل حالة.

### نطاق التنفيذ

ده build كامل end-to-end — مش template أو boilerplate:

- **Authentication** — إيميل + Google OAuth، onboarding wizard من 3 خطوات، حماية الراوتات في Middleware، redirects ذكية حسب حالة المستخدم

- **Real-time Infrastructure** — Postgres triggers + Supabase Realtime للرسايل، التفاعلات، والحضور. Typing indicators عن طريق broadcast channels. تحديث profile فوري على كل العملاء المتصلين.

- **File Handling** — حد أقصى 5GB للملف الواحد، عدد ملفات مفتوح، رفع مباشر من البراوزر للـ Storage، preview للصور/الفيديو/الصوت داخل الشات، paste من الكليب بورد.

- **Database Design** — 8 جداول مع relationships سليمة، indexes على الأعمدة المهمة، Row-Level Security policies للصلاحيات على مستوى الـ DB، triggers للـ denormalization الأوتوماتيكي.

- **UI System** — design system مخصص، dark mode default، RTL للعربي، 20+ component primitive، رسومات SVG مخصصة، animations سلسة.

- **Localization** — واجهة عربية (باللهجة المصرية) بـ RTL كامل، formatting للتواريخ حسب locale، typography optimized للعربي.

### تفاصيل تقنية مهمة

**Database Schema:**
```
profiles              (المستخدمين مع presence و preferences)
tasks                 (مع lock trigger يمنع تعديل الـ paid_closed)
conversations         (قنوات، DMs، غرف مربوطة بالتاسكات)
conversation_members  (العضوية + read state لكل مستخدم)
messages              (مع reply threading)
message_attachments   (جدول منفصل لكفاءة الـ queries)
message_reactions     (unique constraint على user+emoji+message)
team_settings         (جدول بصف واحد، write محصور على admin)
```

**Row-Level Security:** كل الجداول فيها policies صريحة. غير الـ admin مش قادر يعدل tasks في حالة paid_closed (الـ enforcement في database trigger، مش بس في الـ UI).

**Middleware منطق معقد:** بيتعامل مع 4 حالات مختلفة للـ request — unauthenticated، authenticated بدون profile، authenticated محتاج onboarding، و fully onboarded — مع redirects مخصصة لكل حالة.

### التقنيات المستخدمة

| الطبقة         | التقنية                                    | السبب                                          |
|----------------|-------------------------------------------|-------------------------------------------------|
| Framework      | Next.js 14 (App Router)                   | Server components، streaming، routing جاهز     |
| Language       | TypeScript (strict)                       | اكتشاف الأخطاء compile-time                   |
| Database       | Postgres (Supabase)                       | Relational + SQL كامل + RLS                   |
| Auth           | Supabase Auth                             | OAuth، JWT، session management                |
| Realtime       | Supabase Realtime                         | بديل فعلي لسيرفر WebSocket مخصص              |
| Storage        | Supabase Storage                          | S3-compatible، رفع مباشر، CDN                 |
| UI Primitives  | Radix UI + custom                         | مكونات headless accessible                     |
| Styling        | Tailwind CSS                              | تصميم ثابت وسريع                              |
| Forms          | React Hook Form + Zod                     | Validation type-safe                           |
| State          | React Query + Zustand                     | فصل بين server state و client state           |
| Deployment     | Vercel                                    | مثالي لـ Next.js                              |

---

## طريقة شغلي على مشروعك

لو وافقت نشتغل سوا، ده اللي هيحصل:

### المرحلة 1 — التحليل و المعمارية (أسبوع)
- جلسة requirements (مباشرة أو async)
- رسم user flows
- تصميم database schema
- API contracts
- توجه الـ design system

**التسليم:** technical spec document، ERD، wireframes في Figma، بيئة التطوير جاهزة.

### المرحلة 2 — الأساس (أسبوع)
- إعداد الـ repository + CI/CD
- Supabase project + migrations + RLS
- Authentication flow كامل
- أول مجموعة من الـ components
- Pipeline الـ deployment

**التسليم:** auth شغال + shell المنصة منشور على staging.

### المرحلة 3 — الميزات الأساسية (3-4 أسابيع)
- User flows الرئيسية
- بنية تحتية للـ real-time (لو محتاج)
- File uploads (لو محتاج)
- Dashboard + charts
- صفحات الإدارة

**التسليم:** MVP شغال بكل الـ flows الرئيسية.

### المرحلة 4 — التلميع والاختبار (أسبوع)
- اختبار على البراوزرات المختلفة
- Mobile responsive
- تحسين الأداء (bundle size، database indexes)
- التعامل مع error cases و edge cases
- E2E testing للـ critical paths

**التسليم:** build جاهز للـ production.

### المرحلة 5 — الإطلاق (أسبوع)
- Deployment على production
- Custom domain + SSL
- Analytics
- Documentation
- دعم ما بعد الإطلاق (أسبوعين)

**التسليم:** منتج live + وثائق.

---

## الجدول الزمني

| النطاق                    | المدة        |
|---------------------------|--------------|
| MVP (ميزات أساسية فقط)   | 5–7 أسبوع    |
| v1 كامل (متقن)           | 7–10 أسبوع   |
| Enterprise-grade          | 10–14 أسبوع  |

المدة بتتغير حسب: iterations التصميم، تعقيد الـ integrations الخارجية، والـ requirements المخصصة.

---

## التكلفة المبدئية

النطاقات دي تقديرية — السعر النهائي بعد مكالمة 30 دقيقة لفهم الـ scope. بشتغل بـ fixed milestones مش ساعات.

| النطاق                                       | السعر (USD)      |
|---------------------------------------------|-------------------|
| MVP (auth + flow أساسي + dashboard)         | $2,500 – $4,000   |
| SaaS عادي (auth + 3-4 flows + admin)       | $4,000 – $7,500   |
| معقد (realtime + integrations + mobile)     | $7,500 – $12,000  |

**كل engagement بتشمل:**
- السورس كود كامل (GitHub، أنت المالك)
- Database schema + migrations
- Deployment على أي استضافة (Vercel, AWS, self-hosted)
- وثائق تقنية
- أسبوعين دعم ما بعد الإطلاق
- فيديو walkthrough للكود لمطوريك اللي هيكملوا بعدي

**مش متضمن (بيتحاسب منفصل لو احتاج):**
- شغل ميزات جديدة بعد الـ 2 weeks support
- تصميم من الصفر لو مفيش توجه (أقدر أرشح مصمم أو أعمل functional designs)
- اشتراكات الخدمات الخارجية (Supabase, Vercel, domain, email — عادةً $0–$50 في الشهر للـ MVP)

---

## طريقة شغلي

- **تواصل async-first** عبر Slack/Discord/email. بأوثق القرارات عشان محدش يسيب حاجة.
- **تحديثات يومية** فيديو أو مكتوب.
- **GitHub workflow** — بتشوف كل commit، ممكن تراجع الكود، وليك access من أول يوم.
- **Staging environment** من الأسبوع التاني — بتجرب البيلد قبل الإطلاق النهائي.
- **Fixed-price milestones** — أنا اللي بحمل risk التقديرات الغلط، أنت بتاخد certainty في التكلفة.

---

## الخطوة الجاية

لو مهتم نشتغل سوا، بقترح مكالمة 30 دقيقة عشان:
1. نفهم منتجك و اليوزرز بالتفصيل
2. نحدد الـ critical path للإطلاق
3. نتفق على scope + timeline + milestones
4. أبعتلك proposal مكتوب بتسعير fixed لكل milestone

ممكن نشوف ديمو TaskFlow سوا في المكالمة و نراجع الكود عشان تحكم على جودته بنفسك.

**متاح أبدأ:** بعد أسبوع من توقيع العقد.

مستني رأيك.

— إياد
