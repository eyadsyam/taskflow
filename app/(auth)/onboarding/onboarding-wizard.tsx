"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { 
  User, 
  Building2, 
  Bell, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Sparkles
} from "lucide-react";

type Step = {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  { id: 1, title: "المعلومات الشخصية", description: "أخبرنا عن نفسك", icon: <User className="h-5 w-5" /> },
  { id: 2, title: "معلومات العمل", description: "تفاصيل شركتك ودورك", icon: <Building2 className="h-5 w-5" /> },
  { id: 3, title: "الإشعارات", description: "تخصيص التنبيهات", icon: <Bell className="h-5 w-5" /> },
  { id: 4, title: "اكتمل!", description: "أنت جاهز للبدء", icon: <CheckCircle2 className="h-5 w-5" /> },
];

const TIMEZONES = [
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Africa/Casablanca", label: "الدار البيضاء (GMT+1)" },
  { value: "Europe/London", label: "لندن (GMT+0)" },
  { value: "America/New_York", label: "نيويورك (GMT-5)" },
];

type OnboardingData = {
  full_name: string;
  phone: string;
  job_title: string;
  company_name: string;
  bio: string;
  timezone: string;
  preferred_language: string;
  notification_preferences: {
    email_new_task: boolean;
    email_task_assigned: boolean;
    email_task_status_change: boolean;
    email_comments: boolean;
    email_daily_digest: boolean;
  };
};

export function OnboardingWizard({ 
  userId,
  userEmail,
  initialData,
  profileExists,
}: { 
  userId: string;
  userEmail: string;
  initialData: Record<string, unknown>;
  profileExists: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [data, setData] = useState<OnboardingData>({
    full_name: (initialData.full_name as string) || "",
    phone: (initialData.phone as string) || "",
    job_title: (initialData.job_title as string) || "",
    company_name: (initialData.company_name as string) || "",
    bio: (initialData.bio as string) || "",
    timezone: (initialData.timezone as string) || "Africa/Cairo",
    preferred_language: (initialData.preferred_language as string) || "ar",
    notification_preferences: {
      email_new_task: true,
      email_task_assigned: true,
      email_task_status_change: true,
      email_comments: true,
      email_daily_digest: false,
      ...(initialData.notification_preferences as Record<string, boolean> || {}),
    },
  });

  const updateData = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const updateNotification = (key: keyof OnboardingData["notification_preferences"], value: boolean) => {
    setData(prev => ({
      ...prev,
      notification_preferences: { ...prev.notification_preferences, [key]: value },
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.full_name.trim().length >= 2;
      case 2:
        return true; // Optional fields
      case 3:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    
    const profileData = {
      id: userId,
      email: userEmail,
      full_name: data.full_name,
      role: (initialData.role as string) || "work_team",
      avatar_url: (initialData.avatar_url as string) || null,
      phone: data.phone || null,
      job_title: data.job_title || null,
      company_name: data.company_name || null,
      bio: data.bio || null,
      timezone: data.timezone,
      preferred_language: data.preferred_language,
      notification_preferences: data.notification_preferences,
      onboarding_completed: true,
    };

    let error;
    
    if (profileExists) {
      // Update existing profile
      const result = await supabase
        .from("profiles")
        .update(profileData as Record<string, unknown>)
        .eq("id", userId);
      error = result.error;
    } else {
      // Create new profile (trigger might have failed)
      const result = await supabase
        .from("profiles")
        .upsert(profileData as Record<string, unknown>, { onConflict: "id" });
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error("حدث خطأ في حفظ البيانات: " + error.message);
      console.error(error);
      return;
    }

    toast.success("تم إعداد حسابك بنجاح! 🎉");
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-1 w-12 rounded-full transition-all sm:w-20 md:w-28",
                      currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold">{STEPS[currentStep - 1].title}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم الكامل *</Label>
                  <Input
                    id="full_name"
                    value={data.full_name}
                    onChange={(e) => updateData("full_name", e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => updateData("phone", e.target.value)}
                    placeholder="+20 1XX XXX XXXX"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">المنطقة الزمنية</Label>
                  <Select value={data.timezone} onValueChange={(v) => updateData("timezone", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">اللغة المفضلة</Label>
                  <Select value={data.preferred_language} onValueChange={(v) => updateData("preferred_language", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">اسم الشركة / المؤسسة</Label>
                  <Input
                    id="company_name"
                    value={data.company_name}
                    onChange={(e) => updateData("company_name", e.target.value)}
                    placeholder="اسم شركتك أو مؤسستك"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">المسمى الوظيفي</Label>
                  <Input
                    id="job_title"
                    value={data.job_title}
                    onChange={(e) => updateData("job_title", e.target.value)}
                    placeholder="مثال: مدير المشاريع، مطور، مصمم..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك</Label>
                  <Textarea
                    id="bio"
                    value={data.bio}
                    onChange={(e) => updateData("bio", e.target.value)}
                    placeholder="اكتب نبذة قصيرة عن نفسك وخبراتك..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {data.bio.length}/500 حرف
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">
                  اختر الإشعارات التي تريد استلامها عبر البريد الإلكتروني
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">مهمة جديدة</p>
                      <p className="text-sm text-muted-foreground">عند إنشاء مهمة جديدة في النظام</p>
                    </div>
                    <Switch
                      checked={data.notification_preferences.email_new_task}
                      onCheckedChange={(v) => updateNotification("email_new_task", v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">تعيين مهمة</p>
                      <p className="text-sm text-muted-foreground">عند تعيين مهمة لك</p>
                    </div>
                    <Switch
                      checked={data.notification_preferences.email_task_assigned}
                      onCheckedChange={(v) => updateNotification("email_task_assigned", v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">تغيير حالة المهمة</p>
                      <p className="text-sm text-muted-foreground">عند تغيير حالة مهمة تتابعها</p>
                    </div>
                    <Switch
                      checked={data.notification_preferences.email_task_status_change}
                      onCheckedChange={(v) => updateNotification("email_task_status_change", v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">التعليقات</p>
                      <p className="text-sm text-muted-foreground">عند إضافة تعليق على مهامك</p>
                    </div>
                    <Switch
                      checked={data.notification_preferences.email_comments}
                      onCheckedChange={(v) => updateNotification("email_comments", v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">ملخص يومي</p>
                      <p className="text-sm text-muted-foreground">ملخص يومي بالمهام والتحديثات</p>
                    </div>
                    <Switch
                      checked={data.notification_preferences.email_daily_digest}
                      onCheckedChange={(v) => updateNotification("email_daily_digest", v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">مرحباً {data.full_name}! 🎉</h3>
                  <p className="mt-2 text-muted-foreground">
                    تم إعداد حسابك بنجاح. أنت الآن جاهز لاستخدام TaskFlow
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-right">
                  <h4 className="font-semibold mb-2">ملخص بياناتك:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• الاسم: {data.full_name}</li>
                    {data.company_name && <li>• الشركة: {data.company_name}</li>}
                    {data.job_title && <li>• المسمى الوظيفي: {data.job_title}</li>}
                    <li>• المنطقة الزمنية: {TIMEZONES.find(t => t.value === data.timezone)?.label}</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={completeOnboarding}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              ابدأ الآن
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
