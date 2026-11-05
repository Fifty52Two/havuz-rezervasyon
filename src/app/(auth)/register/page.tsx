"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { register } from "@/lib/actions/auth";
import { Button, Field, Notice } from "@/components/ui";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("password2") ?? "")) {
      setError("Şifreler aynı değil.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await register({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password,
      });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Hesap oluştur</h1>
      <Field label="Ad soyad" id="name" autoComplete="name" required minLength={2} maxLength={60} />
      <Field label="E-posta" id="email" type="email" autoComplete="email" required />
      <Field
        label="Şifre"
        id="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        hint="En az 8 karakter."
      />
      <Field label="Şifre (tekrar)" id="password2" type="password" autoComplete="new-password" required />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </Button>
      <p className="text-sm text-mist">
        Kayıttan sonra rezervasyon yapabilmen için yönetimin üyeliğini başlatması gerekir.{" "}
        <Link href="/login" className="text-lane hover:underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
