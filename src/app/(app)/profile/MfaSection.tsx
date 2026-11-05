"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Notice } from "@/components/ui";

type Enrollment = { factorId: string; qr: string; secret: string };

export default function MfaSection() {
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // İstemci sadece tarayıcıda, ihtiyaç anında oluşturulur (createBrowserClient tekil örnek döner).
  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setVerifiedId(data?.totp?.find((f) => f.status === "verified")?.id ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startEnroll() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    // Yarım kalmış (doğrulanmamış) eski kayıtları temizle.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      setMessage({ ok: false, text: "Kurulum başlatılamadı. Tekrar dene." });
      return;
    }
    setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll() {
    if (!enrollment) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    setBusy(false);
    if (error) {
      setMessage({ ok: false, text: "Kod hatalı. Uygulamadaki güncel kodu gir." });
      return;
    }
    setEnrollment(null);
    setCode("");
    setMessage({ ok: true, text: "İki adımlı doğrulama açıldı." });
    load();
  }

  async function disable() {
    if (!verifiedId || !window.confirm("İki adımlı doğrulamayı kapatmak istiyor musun?")) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: verifiedId });
    setBusy(false);
    setMessage(error ? { ok: false, text: "Kapatılamadı. Tekrar dene." } : { ok: true, text: "İki adımlı doğrulama kapatıldı." });
    load();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-mist">
        Girişte şifreye ek olarak telefonundaki doğrulama uygulamasından (ör. Google Authenticator) bir kod istenir.
        Adminler için önerilir.
      </p>
      {verifiedId ? (
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-mint">Açık</span>
          <Button variant="danger" small onClick={disable} disabled={busy}>
            Kapat
          </Button>
        </div>
      ) : enrollment ? (
        <div className="space-y-3">
          {/* Supabase QR kodunu SVG data URI olarak döner. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qr} alt="Doğrulama uygulamasıyla tara" className="h-44 w-44 rounded-lg ring-1 ring-line" />
          <p className="break-all text-xs text-mist">Tarayamıyorsan bu anahtarı gir: {enrollment.secret}</p>
          <label htmlFor="mfa-code" className="block text-sm font-bold">
            Uygulamadaki 6 haneli kod
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-40 rounded-xl border border-line px-3 py-2 text-center font-display text-2xl tracking-[0.3em] focus:border-lane focus:outline-none"
          />
          <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>
            Doğrula ve aç
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={startEnroll} disabled={busy}>
          İki adımlı doğrulamayı aç
        </Button>
      )}
      {message && <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>}
    </div>
  );
}
