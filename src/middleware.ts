import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_FLOW = ["/login", "/register", "/verify", "/forgot-password"];

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Oturumu tazeler ve sayfa erişimini yönetir. Bu katman kullanıcı deneyimi içindir;
 * asıl yetki kontrolleri veritabanında (RLS + fonksiyonlar) ve server action'lardadır.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const redirectTo = (to: string) => NextResponse.redirect(new URL(to, request.url));

  if (path.startsWith("/auth/callback")) return response;

  const isLoginFlow = startsWithAny(path, LOGIN_FLOW);
  const isReset = startsWithAny(path, ["/reset-password"]);
  const isMfa = startsWithAny(path, ["/mfa-challenge"]);

  if (!user) {
    return isLoginFlow || isReset ? response : redirectTo("/login");
  }

  if (isReset) return response;

  // İki adımlı doğrulama açık hesaplarda ikinci adım tamamlanmadan hiçbir sayfa açılmaz.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfa = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
  if (needsMfa) return isMfa ? response : redirectTo("/mfa-challenge");
  if (isMfa || isLoginFlow) return redirectTo("/");

  if (startsWithAny(path, ["/admin"])) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return redirectTo("/");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
