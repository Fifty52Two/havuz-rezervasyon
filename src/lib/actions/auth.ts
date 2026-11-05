"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, nameSchema, otpSchema, passwordSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

const fail = (error: string): ActionResult => ({ ok: false, error });

export async function login(input: { email: string; password: string }): Promise<ActionResult> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success || typeof input.password !== "string" || input.password.length === 0) {
    return fail("E-posta veya şifre hatalı.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: input.password });
  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return fail("E-posta adresin henüz doğrulanmamış. Gelen kutundaki kodu kullan.");
    }
    // Hesabın var olup olmadığını belli etmeyen tek mesaj (OWASP A07: kullanıcı numaralandırma).
    return fail("E-posta veya şifre hatalı.");
  }
  redirect("/");
}

export async function register(input: { name: string; email: string; password: string }): Promise<ActionResult> {
  const name = nameSchema.safeParse(input.name);
  if (!name.success) return fail("İsim 2–60 karakter olmalı.");
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return fail("Geçerli bir e-posta adresi gir.");
  const password = passwordSchema.safeParse(input.password);
  if (!password.success) return fail("Şifre en az 8, en fazla 72 karakter olmalı.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { data: { name: name.data }, emailRedirectTo: `${appUrl()}/auth/callback` },
  });

  if (error) {
    if (/rate limit|over_email_send_rate_limit/i.test(error.message)) {
      return fail("Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.");
    }
    if (/password/i.test(error.message)) {
      return fail("Bu şifre kabul edilmedi. Daha uzun ya da daha karmaşık bir şifre seç.");
    }
    return fail("Kayıt tamamlanamadı. Lütfen tekrar dene.");
  }

  // Adres zaten kayıtlı olsa da aynı sayfaya gidilir; hesabın varlığı belli edilmez (OWASP A07).
  redirect(`/verify?email=${encodeURIComponent(email.data)}`);
}

export async function verifyEmail(input: { email: string; token: string }): Promise<ActionResult> {
  const email = emailSchema.safeParse(input.email);
  const token = otpSchema.safeParse(input.token);
  if (!email.success || !token.success) return fail("Kod hatalı veya süresi dolmuş.");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: token.data, type: "signup" });
  if (error) return fail("Kod hatalı veya süresi dolmuş.");
  redirect("/");
}

export async function resendVerification(input: { email: string }): Promise<ActionResult> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return fail("Geçerli bir e-posta adresi gir.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data });
  if (error && /rate limit/i.test(error.message)) return fail("Biraz bekleyip tekrar dene.");
  return { ok: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(input: { email: string }): Promise<ActionResult> {
  const email = emailSchema.safeParse(input.email);
  if (email.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
    });
  }
  // Adres kayıtlı olsun olmasın aynı yanıt (OWASP A07).
  return { ok: true, message: "Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi." };
}

export async function resetPassword(input: { password: string }): Promise<ActionResult> {
  const password = passwordSchema.safeParse(input.password);
  if (!password.success) return fail("Şifre en az 8, en fazla 72 karakter olmalı.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return fail("Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir.");
  await supabase.auth.signOut();
  return { ok: true, message: "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin." };
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult> {
  const next = passwordSchema.safeParse(input.newPassword);
  if (!next.success) return fail("Yeni şifre en az 8, en fazla 72 karakter olmalı.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("Oturumun sona ermiş, tekrar giriş yap.");

  // Şifre değişikliği öncesi mevcut şifreyi doğrula (yeniden kimlik doğrulama).
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (reauthError) return fail("Mevcut şifre hatalı.");

  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) return fail("Şifre güncellenemedi. Daha güçlü bir şifre dene.");
  return { ok: true, message: "Şifren güncellendi." };
}
