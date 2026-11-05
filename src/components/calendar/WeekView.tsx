"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCard from "./SessionCard";
import { dateLong, dayOfMonth, dayShort, weekDays, weekRangeLabel } from "@/lib/time";
import type { SessionView } from "@/types";

export default function WeekView({
  weekStart,
  prevWeek,
  nextWeek,
  sessions,
  today,
  minCancelHours,
}: {
  weekStart: string;
  prevWeek: string | null;
  nextWeek: string | null;
  sessions: SessionView[];
  today: string;
  minCancelHours: number;
}) {
  const router = useRouter();
  const days = weekDays(weekStart);
  const [selected, setSelected] = useState(days.includes(today) ? today : days[0]);

  // Doluluk başkalarının işlemleriyle değişir; sayfa açıkken 30 sn'de bir tazele.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(id);
  }, [router]);

  const byDay = useMemo(() => {
    const map = new Map<string, SessionView[]>();
    for (const s of sessions) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return map;
  }, [sessions]);

  const daySessions = byDay.get(selected) ?? [];

  return (
    <section aria-label="Haftalık seanslar">
      <div className="mb-3 flex items-center justify-between">
        <WeekLink to={prevWeek} label="Önceki hafta" symbol="‹" />
        <h2 className="font-display text-2xl font-semibold">{weekRangeLabel(weekStart)}</h2>
        <WeekLink to={nextWeek} label="Sonraki hafta" symbol="›" />
      </div>

      <div className="mb-5 grid grid-cols-7 gap-1.5" role="tablist" aria-label="Günler">
        {days.map((d) => {
          const isSelected = d === selected;
          const isPast = d < today;
          const hasMine = (byDay.get(d) ?? []).some((s) => s.myLane !== null);
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelected(d)}
              className={`relative rounded-xl py-2 text-center ${
                isSelected ? "bg-deep text-white" : "bg-white ring-1 ring-line hover:ring-lane"
              } ${isPast && !isSelected ? "opacity-50" : ""}`}
            >
              <span className="block text-xs">{dayShort(d)}</span>
              <span className={`block font-display text-2xl font-semibold leading-tight ${d === today ? "underline" : ""}`}>
                {dayOfMonth(d)}
              </span>
              {hasMine && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-mint" aria-label="Rezervasyonun var" />}
            </button>
          );
        })}
      </div>

      <h3 className="sr-only">{dateLong(selected)}</h3>
      {daySessions.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-mist ring-1 ring-line">Bu gün seans yok.</p>
      ) : (
        <div className="space-y-4">
          {daySessions.map((s) => (
            <SessionCard key={s.id} session={s} today={today} minCancelHours={minCancelHours} />
          ))}
        </div>
      )}
    </section>
  );
}

function WeekLink({ to, label, symbol }: { to: string | null; label: string; symbol: string }) {
  const cls = "grid h-10 w-10 place-items-center rounded-full font-display text-3xl leading-none";
  if (!to) return <span className={`${cls} text-line`} aria-hidden="true">{symbol}</span>;
  return (
    <Link href={`/?hafta=${to}`} aria-label={label} className={`${cls} bg-white ring-1 ring-line hover:ring-lane`}>
      {symbol}
    </Link>
  );
}
