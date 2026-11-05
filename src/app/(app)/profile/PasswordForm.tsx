"use client";

import { useState, useTransition, type FormEvent } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Button, Field, Notice } from "@/components/ui";

export default function PasswordForm() {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== String(form.get("newPassword2") ?? "")) {
      setResult({ ok: false, text: "Yeni şifreler aynı değil." });
      return;
    }
    startTransition(async () => {
      const r = await changePassword({ currentPassword: String(form.get("currentPassword") ?? ""), newPassword });
      if (r.ok) formEl.reset();
      setResult(r.ok ? { ok: true, text: r.message ?? "Güncellendi." } : { ok: false, text: r.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Mevcut şifre" id="currentPassword" type="password" autoComplete="current-password" required />
      <Field label="Yeni şifre" id="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      <Field label="Yeni şifre (tekrar)" id="newPassword2" type="password" autoComplete="new-password" required />
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
      <Button type="submit" variant="secondary" disabled={pending}>
        Şifreyi değiştir
      </Button>
    </form>
  );
}
