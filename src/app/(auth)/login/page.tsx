"use client";

import Link from "next/link";
import { Suspense, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { Button, Field, Notice } from "@/components/ui";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(
    params.get("error") === "link_expired"
      ? "Bağlantı geçersiz ya da süresi dolmuş. E-postanı doğruladıysan şifrenle giriş yapabilirsin."
      : null
  );
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await login({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Giriş yap</h1>
      <Field label="E-posta" id="email" type="email" autoComplete="email" required />
      <Field label="Şifre" id="password" type="password" autoComplete="current-password" required />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-lane hover:underline">
          Şifremi unuttum
        </Link>
        <Link href="/register" className="text-lane hover:underline">
          Hesap oluştur
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
