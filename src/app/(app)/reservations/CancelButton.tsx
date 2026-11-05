"use client";

import { useState, useTransition } from "react";
import { cancel } from "@/lib/actions/booking";
import { Button } from "@/components/ui";

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm("Rezervasyonunu iptal etmek istiyor musun? Hakkın iade edilir.")) return;
    setError(null);
    startTransition(async () => {
      const r = await cancel({ bookingId });
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="text-right">
      <Button variant="danger" small onClick={onClick} disabled={pending}>
        {pending ? "İptal ediliyor…" : "İptal et"}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-rope">{error}</p>}
    </div>
  );
}
