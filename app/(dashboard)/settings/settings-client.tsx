"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, User, Phone, Briefcase, Globe, Clock, Save, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ROLE_LABELS } from "@/lib/utils";
import type { Profile } from "@/lib/database.types";

interface Props {
  profile: Profile;
  teamMembers: Profile[];
}

export function SettingsClient({ profile, teamMembers }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [statusMessage, setStatusMessage] = useState(profile.status_message ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "Africa/Cairo");
  const [language, setLanguage] = useState(profile.preferred_language ?? "ar");

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        job_title: jobTitle || null,
        bio: bio || null,
        status_message: statusMessage || null,
        timezone,
        preferred_language: language,
      } as Record<string, unknown>)
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("اتحفظ بنجاح");
  }

  async function uploadAvatar(file: File) {
    const path = `avatars/${profile.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl } as Record<string, unknown>)
      .eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("الصورة اتحدثت");
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <Section title="الملف الشخصي" icon={User}>
        <div className="grid gap-5 md:grid-cols-2">
          {/* Avatar */}
          <div className="md:col-span-2 flex items-center gap-4">
            <UserAvatar name={profile.full_name} src={profile.avatar_url} size="lg" />
            <div>
              <label className="cursor-pointer">
                <span className="text-sm text-primary hover:underline">غير الصورة</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>

          <Field label="الاسم">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="رقم التليفون (للإشعارات على واتساب)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2010..." dir="ltr" />
          </Field>
          <Field label="المسمى الوظيفي">
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="مصمم، مطور، ..." />
          </Field>
          <Field label="حالتك">
            <Input value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} placeholder="شغال دلوقتي..." />
          </Field>
          <div className="md:col-span-2">
            <Field label="نبذة">
              <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="اكتب حاجة عنك..." />
            </Field>
          </div>
        </div>
      </Section>

      {/* Preferences Section */}
      <Section title="التفضيلات" icon={Globe}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="اللغة">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">عربي</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="المنطقة الزمنية">
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">القاهرة (GMT+2)</SelectItem>
                <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
                <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
                <SelectItem value="Europe/Istanbul">إسطنبول (GMT+3)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      {/* Team Overview (admin only) */}
      {profile.role === "admin" && (
        <Section title="الفريق" icon={Shield}>
          <div className="space-y-3">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-elevated/30">
                <UserAvatar name={m.full_name} src={m.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
                <div className="text-xs text-muted-foreground">{m.job_title || ROLE_LABELS[m.role as keyof typeof ROLE_LABELS]}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{m.phone || "—"}</div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              عشان واتساب يشتغل، كل عضو لازم يحط رقم تليفونه هنا في الإعدادات.
            </p>
          </div>
        </Section>
      )}

      {/* WhatsApp Info (admin only) */}
      {profile.role === "admin" && (
        <Section title="واتساب بزنس" icon={Phone}>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-sm">
              رقم البزنس: <strong dir="ltr">+201055224391</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              الإشعارات على واتساب بتتبعت تلقائي لكل عضو عنده رقم تليفون في البروفايل عند:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>إنشاء تاسك جديد</li>
              <li>تغيير حالة تاسك</li>
              <li>إرسال رسالة في الشات</li>
            </ul>
            <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">
              لتفعيل واتساب: أدخل <code className="bg-muted px-1.5 py-0.5 rounded text-xs">WHATSAPP_TOKEN</code> و <code className="bg-muted px-1.5 py-0.5 rounded text-xs">WHATSAPP_PHONE_ID</code> في Supabase Edge Function Secrets من{" "}
              <a href="https://supabase.com/dashboard/project/hlonbqaegqjydfmyofxj/settings/functions" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                لوحة التحكم
              </a>.
            </p>
          </div>
        </Section>
      )}

      {/* Save */}
      <div className="flex justify-start pt-2">
        <Button onClick={saveProfile} disabled={saving} variant="gradient">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          احفظ التغييرات
        </Button>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
