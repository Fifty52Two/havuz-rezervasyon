"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { resetPassword } from "@/lib/actions/auth";
import { Button, Field, Notice } from "@/components/ui";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
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
      const result = await resetPassword({ password });
      if (result.ok) setDone(result.message ?? "Şifren güncellendi.");
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Notice tone="success">{done}</Notice>
        <Link href="/login" className="block text-lane hover:underline">
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Yeni şifre belirle</h1>
      <Field label="Yeni şifre" id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      <Field label="Yeni şifre (tekrar)" id="password2" type="password" autoComplete="new-password" required />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Kaydediliyor…" : "Şifreyi kaydet"}
      </Button>
    </form>
  );
}
