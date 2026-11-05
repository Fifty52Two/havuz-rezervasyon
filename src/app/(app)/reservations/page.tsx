import { createClient } from "@/lib/supabase/server";
import { fetchMyBookings, fetchSettings } from "@/lib/data/member";
import { dateLong, hoursUntil, sessionRange } from "@/lib/time";
import CancelButton from "./CancelButton";
import type { MyBooking } from "@/types";

function statusText(b: MyBooking): string {
  if (b.status === "cancelled_by_user") return "İptal ettin";
  if (b.status === "cancelled_by_admin") return `Yönetim iptal etti${b.cancelReason ? `: ${b.cancelReason}` : ""}`;
  return "Tamamlandı";
}

export default async function ReservationsPage() {
  const supabase = await createClient();
  const [bookings, settings] = await Promise.all([fetchMyBookings(supabase), fetchSettings(supabase)]);

  const upcoming = bookings
    .filter((b) => b.status === "active" && hoursUntil(b.startsAt) > 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const history = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 font-display text-3xl font-semibold">Yaklaşan rezervasyonların</h1>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-mist ring-1 ring-line">
            Yaklaşan rezervasyonun yok. Takvimden bir seans seçebilirsin.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
                <div>
                  <p className="font-display text-2xl font-semibold leading-tight">{sessionRange(b.time)}</p>
                  <p className="text-sm text-mist">
                    {dateLong(b.date)}, Kulvar {b.lane}
                  </p>
                </div>
                {hoursUntil(b.startsAt) >= settings.minCancelHours ? (
                  <CancelButton bookingId={b.id} />
                ) : (
                  <span className="text-xs text-mist">İptal süresi geçti</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {settings.minCancelHours > 0 && (
          <p className="mt-2 text-sm text-mist">
            Seans başlamadan en geç {settings.minCancelHours} saat önce iptal edebilirsin.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl font-semibold">Geçmiş</h2>
        {history.length === 0 ? (
          <p className="text-mist">Henüz geçmiş rezervasyonun yok.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <span>
                  {dateLong(b.date)}, {sessionRange(b.time)}, Kulvar {b.lane}
                </span>
                <span className={`text-sm ${b.status === "active" ? "text-mist" : "text-rope"}`}>{statusText(b)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
