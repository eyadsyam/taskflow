"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { 
  User, 
  Briefcase,
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Sparkles,
  Camera
} from "lucide-react";

type Step = {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  { id: 1, title: "أهلاً بك!", description: "أخبرنا عن نفسك", icon: <User className="h-5 w-5" /> },
  { id: 2, title: "ملفك المهني", description: "ما الذي تعمل عليه", icon: <Briefcase className="h-5 w-5" /> },
  { id: 3, title: "كل شيء جاهز!", description: "دعنا نبدأ", icon: <Sparkles className="h-5 w-5" /> },
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
  bio: string;
  timezone: string;
  preferred_language: string;
  status_message: string;
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
    bio: (initialData.bio as string) || "",
    timezone: (initialData.timezone as string) || "Africa/Cairo",
    preferred_language: (initialData.preferred_language as string) || "ar",
    status_message: (initialData.status_message as string) || "",
  });

  const updateData = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    if (currentStep === 1) return data.full_name.trim().length >= 2;
    return true;
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    
    const profileData = {
      id: userId,
      email: userEmail,
      full_name: data.full_name,
      role: (initialData.role as string) || "member",
      avatar_url: (initialData.avatar_url as string) || null,
      phone: data.phone || null,
      job_title: data.job_title || null,
      bio: data.bio || null,
      timezone: data.timezone,
      preferred_language: data.preferred_language,
      status_message: data.status_message || null,
      onboarding_completed: true,
    };

    let error;
    
    if (profileExists) {
      const result = await supabase
        .from("profiles")
        .update(profileData as Record<string, unknown>)
        .eq("id", userId);
      error = result.error;
    } else {
      const result = await supabase
        .from("profiles")
        .upsert(profileData as Record<string, unknown>, { onConflict: "id" });
      error = result.error;
    }

    if (!error) {
      // Add user as member of the general channel
      const { data: generalChannel } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "channel")
        .eq("name", "عام")
        .single();
      
      if (generalChannel) {
        await supabase.from("conversation_members").upsert({
          conversation_id: (generalChannel as { id: string }).id,
          user_id: userId,
        } as Record<string, unknown>);
      }
    }

    setSaving(false);

    if (error) {
      toast.error("حدث خطأ في حفظ البيانات: " + error.message);
      return;
    }

    toast.success("تم إعداد حسابك بنجاح! 🎉");
    router.replace("/dashboard");
    router.refresh();
  };

  const avatarUrl = (initialData.avatar_url as string) || null;

  return (
    <div className="min-h-screen gradient-mesh py-8 px-4 flex items-center">
      <div className="mx-auto max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500",
                    currentStep > step.id
                      ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-1 w-16 rounded-full transition-all duration-500 sm:w-24 md:w-32",
                      currentStep > step.id ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <h2 className="text-3xl font-bold gradient-text mb-2">{STEPS[currentStep - 1].title}</h2>
            <p className="text-muted-foreground">{STEPS[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <CardContent className="p-6 md:p-8">
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-up">
                <div className="flex justify-center">
                  <div className="relative">
                    <UserAvatar 
                      name={data.full_name || "؟"} 
                      src={avatarUrl}
                      size="2xl" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم الكامل *</Label>
                  <Input
                    id="full_name"
                    value={data.full_name}
                    onChange={(e) => updateData("full_name", e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={data.phone}
                      onChange={(e) => updateData("phone", e.target.value)}
                      placeholder="+20 1XX XXX XXXX"
                      dir="ltr"
                      className="text-left h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">المنطقة الزمنية</Label>
                    <Select value={data.timezone} onValueChange={(v) => updateData("timezone", v)}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-up">
                <div className="space-y-2">
                  <Label htmlFor="job_title">المسمى الوظيفي</Label>
                  <Input
                    id="job_title"
                    value={data.job_title}
                    onChange={(e) => updateData("job_title", e.target.value)}
                    placeholder="مثال: مدير مشاريع، مطور، مصمم"
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">سيظهر هذا في ملفك الشخصي للأعضاء الآخرين</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status_message">رسالة الحالة</Label>
                  <Input
                    id="status_message"
                    value={data.status_message}
                    onChange={(e) => updateData("status_message", e.target.value)}
                    placeholder="مثال: مشغول بمشروع المتجر، متاح للمساعدة"
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">أخبر الفريق عن حالتك الآن</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك</Label>
                  <Textarea
                    id="bio"
                    value={data.bio}
                    onChange={(e) => updateData("bio", e.target.value)}
                    placeholder="نبذة قصيرة عن خبراتك ومهاراتك..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{data.bio.length}/500 حرف</p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="py-6 text-center space-y-6 animate-slide-up">
                <div className="relative mx-auto w-32 h-32">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full blur-2xl opacity-30 animate-pulse" />
                  <div className="relative w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full grid place-items-center shadow-2xl shadow-violet-500/30">
                    <Sparkles className="h-16 w-16 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-2">مرحباً {data.full_name.split(" ")[0]}! 🎉</h3>
                  <p className="text-muted-foreground">
                    حسابك جاهز. أنت الآن جزء من فريق العمل.
                  </p>
                </div>
                
                <div className="rounded-2xl bg-muted/50 p-4 text-right border border-border/50">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ملخص بياناتك
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-muted-foreground">الاسم:</span> <span className="font-medium">{data.full_name}</span></li>
                    {data.job_title && <li className="flex justify-between"><span className="text-muted-foreground">المسمى:</span> <span className="font-medium">{data.job_title}</span></li>}
                    {data.phone && <li className="flex justify-between"><span className="text-muted-foreground">الهاتف:</span> <span className="font-medium" dir="ltr">{data.phone}</span></li>}
                    <li className="flex justify-between"><span className="text-muted-foreground">المنطقة الزمنية:</span> <span className="font-medium">{TIMEZONES.find(t => t.value === data.timezone)?.label}</span></li>
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <div className="text-xl mb-1">💬</div>
                    <div className="font-medium">محادثات لحظية</div>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <div className="text-xl mb-1">📋</div>
                    <div className="font-medium">إدارة المهام</div>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <div className="text-xl mb-1">📎</div>
                    <div className="font-medium">مشاركة الملفات</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              variant="gradient"
              size="lg"
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2 flex-1 sm:flex-none"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="gradient"
              size="lg"
              onClick={completeOnboarding}
              disabled={saving}
              className="gap-2 flex-1 sm:flex-none"
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
