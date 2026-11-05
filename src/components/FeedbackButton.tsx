"use client";

import { useState, useTransition } from "react";
import { sendFeedback } from "@/lib/actions/feedback";
import { Button, Notice } from "@/components/ui";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setResult(null);
  }

  function submit() {
    startTransition(async () => {
      const r = await sendFeedback({ message });
      if (r.ok) {
        setMessage("");
        setResult({ ok: true, text: r.message ?? "Mesajın iletildi." });
      } else {
        setResult({ ok: false, text: r.error });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/30 px-3 py-1 font-bold hover:bg-white/10"
      >
        Geri bildirim
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-0 z-50 grid place-items-end bg-deep/40 p-4 sm:place-items-center"
          onClick={close}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 text-deep"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="feedback-title" className="font-display text-2xl font-semibold">
              Geri bildirim gönder
            </h2>
            <p className="text-sm text-mist">Hata, öneri ya da şikâyetini yaz; yönetime e-postayla iletilir.</p>
            <label htmlFor="feedback-message" className="sr-only">
              Mesaj
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              className="w-full rounded-xl border border-line p-3 focus:border-lane focus:outline-none"
            />
            {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Kapat
              </Button>
              <Button onClick={submit} disabled={pending || message.trim().length === 0}>
                {pending ? "Gönderiliyor…" : "Gönder"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
