"use client";

import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
      <h1 className="font-display text-2xl font-semibold">Sayfa yüklenemedi</h1>
      <p className="text-mist">Bağlantını kontrol edip tekrar dene. Sorun sürerse geri bildirim gönder.</p>
      <Button onClick={reset}>Tekrar dene</Button>
    </div>
  );
}
