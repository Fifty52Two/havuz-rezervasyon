"use client";

import { useState, type FormEvent } from "react";
import { saveSettings } from "@/lib/actions/admin";
import { Button, Field, Notice } from "@/components/ui";
import { useAdminAction } from "./useAdminAction";
import type { Settings } from "@/types";

const NUMBER_FIELDS: { key: keyof Settings; label: string; min: number; max: number; hint?: string }[] = [
  { key: "laneCount", label: "Kulvar sayısı", min: 1, max: 10 },
  { key: "laneCapacity", label: "Kulvar başına kapasite", min: 1, max: 50 },
  {
    key: "monthlyCredits",
    label: "Aylık hak",
    min: 0,
    max: 100,
    hint: "Yeni aylara ve henüz başlamamış aylara uygulanır. İçinde bulunulan ay ve üyeye özel verilen haklar değişmez.",
  },
  { key: "bookingWindowDays", label: "Rezervasyon kaç gün önceden açılır", min: 1, max: 28 },
  { key: "dailyLimit", label: "Günlük rezervasyon limiti", min: 0, max: 10, hint: "0 = sınırsız" },
  { key: "minCancelHours", label: "En geç iptal (seanstan kaç saat önce)", min: 0, max: 72 },
];

const TIME_FIELDS: { key: keyof Settings; label: string }[] = [
  { key: "weekdayStart", label: "Hafta içi ilk seans" },
  { key: "weekdayEnd", label: "Hafta içi kapanış" },
  { key: "weekendStart", label: "Hafta sonu ilk seans" },
  { key: "weekendEnd", label: "Hafta sonu kapanış" },
];

export default function SettingsForm({ initial }: { initial: Settings }) {
  const [values, setValues] = useState<Settings>(initial);
  const { pending, result, run } = useAdminAction();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(() => saveSettings(values));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-white p-5 ring-1 ring-line">
      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBER_FIELDS.map((f) => (
          <Field
            key={f.key}
            id={f.key}
            label={f.label}
            type="number"
            min={f.min}
            max={f.max}
            hint={f.hint}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }) as Settings)}
            required
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TIME_FIELDS.map((f) => (
          <Field
            key={f.key}
            id={f.key}
            label={f.label}
            type="time"
            step={3600}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value.slice(0, 5) }) as Settings)}
            required
          />
        ))}
      </div>
      <p className="text-sm text-mist">
        Seanslar 1 saattir; kapanış saati son seansın bittiği saattir (17:00–21:00 → 17, 18, 19, 20 seansları). Saat
        değişikliği rezervasyonu olmayan gelecek seansları yeniden düzenler; rezervasyonlu seanslar korunur.
      </p>
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Ayarları kaydet"}
      </Button>
    </form>
  );
}
