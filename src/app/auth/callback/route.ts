import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Yalnızca site içi yollara yönlendir (OWASP A01: açık yönlendirme engeli). */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  if (tokenHash && (type === "recovery" || type === "signup" || type === "email")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${type === "recovery" ? "/reset-password" : next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
