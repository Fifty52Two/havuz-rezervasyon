"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth";
import { Button, Notice } from "@/components/ui";

export default function MfaChallengePage() {
  // Supabase istemcisi sadece tarayıcıda (effect ve olay içinde) oluşturulur;
  // derleme sırasındaki ön üretimde ortam değişkeni gerekmez.
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        const totp = data?.totp?.find((f) => f.status === "verified");
        if (totp) setFactorId(totp.id);
      });
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError("Kod hatalı veya süresi dolmuş.");
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">İki adımlı doğrulama</h1>
        <p className="text-sm text-mist">Doğrulama uygulamandaki 6 haneli kodu gir.</p>
        <label htmlFor="code" className="sr-only">
          Doğrulama kodu
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-full rounded-xl border border-line px-3 py-3 text-center font-display text-3xl tracking-[0.4em] focus:border-lane focus:outline-none"
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={loading || code.length !== 6 || !factorId} className="w-full">
          {loading ? "Doğrulanıyor…" : "Doğrula"}
        </Button>
      </form>
      <form action={logout}>
        <Button type="submit" variant="quiet">
          Çıkış yap
        </Button>
      </form>
    </div>
  );
}
