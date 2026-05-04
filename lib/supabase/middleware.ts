import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthCallback = pathname.startsWith("/auth/callback") || pathname.startsWith("/auth/signout");
  const isLoginOrRegister = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublic = isLoginOrRegister || isAuthCallback || isOnboarding || pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api");

  // Not logged in and trying to access protected route
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in user
  if (user) {
    // Skip profile check for auth callbacks - let them complete first
    if (isAuthCallback) {
      return response;
    }

    // Check if onboarding is completed
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    // If profile doesn't exist yet (trigger might be slow), redirect to onboarding
    // The onboarding page will handle creating/updating the profile
    const profileExists = !profileError && profile;
    const onboardingCompleted = profileExists && (profile as { onboarding_completed: boolean }).onboarding_completed === true;

    // User hasn't completed onboarding and is not on onboarding page
    if (!onboardingCompleted && !isOnboarding) {
      // Allow login/register pages to redirect naturally after auth
      if (isLoginOrRegister) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        url.search = "";
        return NextResponse.redirect(url);
      }
      // For other protected pages, redirect to onboarding
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // User completed onboarding but is on login/register pages
    if (onboardingCompleted && isLoginOrRegister) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // User completed onboarding but is on onboarding page
    if (onboardingCompleted && isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
