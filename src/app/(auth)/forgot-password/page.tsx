"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { forgotPassword } from "@/lib/actions/auth";
import { Button, Field, Notice } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    startTransition(async () => {
      const result = await forgotPassword({ email });
      setMessage(result.ok ? result.message ?? null : result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Şifreni sıfırla</h1>
      <p className="text-sm text-mist">E-posta adresini gir, şifre sıfırlama bağlantısı gönderelim.</p>
      <Field label="E-posta" id="email" type="email" autoComplete="email" required />
      {message && <Notice tone="info">{message}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Gönderiliyor…" : "Bağlantı gönder"}
      </Button>
      <Link href="/login" className="block text-sm text-lane hover:underline">
        Girişe dön
      </Link>
    </form>
  );
}
