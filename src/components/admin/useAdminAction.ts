"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/types";

type ReasonRequest = { question: string; onSubmit: (reason: string) => void };

/** Admin bileşenleri için ortak: action çalıştır, sonucu göster, gerekirse sebep sor. */
export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [reasonRequest, setReasonRequest] = useState<ReasonRequest | null>(null);

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setResult(null);
    startTransition(async () => {
      const r = await action();
      setResult(r.ok ? { ok: true, text: r.message ?? "Tamam." } : { ok: false, text: r.error });
      if (r.ok) onSuccess?.();
    });
  }

  /**
   * Sebep penceresini açar; onaylanınca onReason çağrılır.
   * Bileşen, reasonRequest doluyken <ReasonDialog> göstermelidir.
   */
  function askReason(question: string, onReason: (reason: string) => void) {
    setReasonRequest({
      question,
      onSubmit: (reason) => {
        setReasonRequest(null);
        onReason(reason);
      },
    });
  }

  function cancelReason() {
    setReasonRequest(null);
  }

  return { pending, result, run, askReason, reasonRequest, cancelReason };
}
