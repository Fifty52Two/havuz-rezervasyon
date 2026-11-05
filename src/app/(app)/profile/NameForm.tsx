"use client";

import { useState, useTransition, type FormEvent } from "react";
import { changeName } from "@/lib/actions/profile";
import { Button, Field, Notice } from "@/components/ui";

export default function NameForm({ currentName, lockedUntil }: { currentName: string; lockedUntil: string | null }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    startTransition(async () => {
      const r = await changeName({ name });
      setResult(r.ok ? { ok: true, text: r.message ?? "Güncellendi." } : { ok: false, text: r.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field
        label="Ad soyad"
        id="name"
        defaultValue={currentName}
        required
        minLength={2}
        maxLength={60}
        disabled={lockedUntil !== null}
        hint={lockedUntil ? `İsmini ${lockedUntil} tarihinden sonra değiştirebilirsin.` : "İsmini 30 günde bir değiştirebilirsin."}
      />
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
      <Button type="submit" variant="secondary" disabled={pending || lockedUntil !== null}>
        İsmi kaydet
      </Button>
    </form>
  );
}
