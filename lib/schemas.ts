import { z } from "zod";

export const TASK_STATUSES = [
  "pending_client",
  "in_progress",
  "done_pending_payment",
  "paid_closed",
] as const;

export const taskSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب").max(200),
  description: z.string().max(5000).optional().nullable(),
  client_name: z.string().min(2, "اسم العميل مطلوب").max(120),
  client_contact: z.string().max(80).optional().nullable(),
  status: z.enum(TASK_STATUSES),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().min(1).max(6).default("EGP"),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({
  content: z.string().min(1, "اكتب كومنت").max(4000),
  is_internal: z.boolean().default(false),
});
export type CommentFormValues = z.infer<typeof commentSchema>;

export const loginSchema = z.object({
  email: z.string().email("إيميل غير صالح"),
  password: z.string().min(6, "كلمة السر 6 حروف على الأقل"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z.string().min(2, "الاسم مطلوب").max(120),
  email: z.string().email("إيميل غير صالح"),
  password: z.string().min(6, "كلمة السر 6 حروف على الأقل"),
  role: z.enum(["client_team", "work_team"]).default("work_team"),
});
export type RegisterValues = z.infer<typeof registerSchema>;
