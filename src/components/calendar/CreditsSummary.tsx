import { dateWithYear, monthLabel } from "@/lib/time";
import type { MonthCredit } from "@/types";

function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export default function CreditsSummary({ months, today }: { months: MonthCredit[]; today: string }) {
  const currentMonth = `${today.slice(0, 7)}-01`;
  const current = months.find((m) => m.month === currentMonth);
  const upcoming = months.filter((m) => m.month > currentMonth);
  const last = months[months.length - 1];

  if (!current && upcoming.length === 0) {
    return (
      <section className="mb-5 rounded-2xl border border-rope/30 bg-white p-4">
        <h2 className="font-bold">Bu ay için üyeliğin yok</h2>
        <p className="mt-1 text-sm text-mist">
          Seansları görebilirsin; rezervasyon yapabilmen için yönetimin üyeliğini başlatması gerekiyor.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-line">
      {current ? (
        <div>
          <p className="text-sm text-mist">{monthLabel(current.month)} için kalan hak</p>
          <p className="font-display text-5xl font-bold leading-none">
            {Math.max(current.credits - current.used, 0)}
            <span className="ml-1 text-2xl font-medium text-mist">/ {current.credits}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm">Bu ay için üyeliğin yok.</p>
      )}
      <div className="w-full text-sm text-mist sm:w-auto sm:text-right">
        {upcoming.map((m) => (
          <p key={m.month}>
            {monthLabel(m.month)}: {m.credits - m.used} hak hazır
          </p>
        ))}
        {last && <p>Üyeliğin {dateWithYear(monthEnd(last.month))} tarihine kadar</p>}
      </div>
    </section>
  );
}
