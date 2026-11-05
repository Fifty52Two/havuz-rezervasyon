"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

const MIN = 2;
const MAX = 200;

/**
 * Sebep soran pencere. Tarayıcının prompt() penceresi yerine kullanılır:
 * prompt() bazı tarayıcılarda (uygulama içi tarayıcılar, VS Code) hiç çalışmaz.
 */
export default function ReasonDialog({
  question,
  onSubmit,
  onCancel,
}: {
  question: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN && trimmed.length <= MAX;

  useEffect(() => {
    textareaRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reason-title"
      className="fixed inset-0 z-50 grid place-items-end bg-deep/40 p-4 sm:place-items-center"
      onClick={onCancel}
    >
      <form
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 text-deep"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(trimmed);
        }}
      >
        <h2 id="reason-title" className="font-display text-2xl font-semibold">
          Sebep gir
        </h2>
        <p className="text-sm">{question}</p>
        <label htmlFor="reason" className="block text-sm font-bold">
          Sebep <span className="font-normal text-mist">(üyelere e-postayla gönderilir)</span>
        </label>
        <textarea
          id="reason"
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX}
          rows={3}
          placeholder="ör. Bakım çalışması"
          className="w-full rounded-xl border border-line p-3 focus:border-lane focus:outline-none"
        />
        <p className="text-right text-xs text-mist">
          {trimmed.length}/{MAX}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button type="submit" variant="danger" disabled={!valid}>
            Onayla
          </Button>
        </div>
      </form>
    </div>
  );
}
