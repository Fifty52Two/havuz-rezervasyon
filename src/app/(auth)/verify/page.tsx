"use client";

import { Suspense, useEffect, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerification, verifyEmail } from "@/lib/actions/auth";
import { Button, Notice } from "@/components/ui";

function VerifyForm() {
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyEmail({ email, token: code });
      if (result && !result.ok) setError(result.error);
    });
  }

  function onResend() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await resendVerification({ email });
      if (!result.ok) setError(result.error);
      else {
        setInfo("Kod yeniden gönderildi.");
        setCountdown(60);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">E-postanı doğrula</h1>
      <p className="text-sm text-mist">
        <span className="font-bold text-deep">{email}</span> adresine bir doğrulama kodu gönderdik. Kodu
        aşağıya gir.
      </p>
      <label htmlFor="code" className="sr-only">
        Doğrulama kodu
      </label>
      <input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
        placeholder="000000"
        className="w-full rounded-xl border border-line px-3 py-3 text-center font-display text-3xl tracking-[0.4em] focus:border-lane focus:outline-none"
      />
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="success">{info}</Notice>}
      <Button type="submit" disabled={pending || code.length < 6} className="w-full">
        {pending ? "Doğrulanıyor…" : "Doğrula"}
      </Button>
      <p className="text-sm text-mist">
        Kod gelmedi mi?{" "}
        {countdown > 0 ? (
          <span>{countdown} sn sonra tekrar gönderebilirsin.</span>
        ) : (
          <Button variant="quiet" onClick={onResend} disabled={pending || !email}>
            Yeniden gönder
          </Button>
        )}
      </p>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
