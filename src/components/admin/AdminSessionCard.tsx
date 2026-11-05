"use client";

import { adminCancelBooking, closeSessionOrLane, reopenSessionOrLane } from "@/lib/actions/admin";
import { Button, Notice } from "@/components/ui";
import { sessionRange } from "@/lib/time";
import { useAdminAction } from "./useAdminAction";
import ReasonDialog from "./ReasonDialog";
import type { AdminBooking, AdminSession } from "@/types";

export default function AdminSessionCard({
  session,
  bookings,
  started,
}: {
  session: AdminSession;
  bookings: AdminBooking[];
  started: boolean;
}) {
  const { pending, result, run, askReason, reasonRequest, cancelReason } = useAdminAction();

  function close(lane: number | null) {
    const what = lane === null ? `${sessionRange(session.time)} seansı kapatılacak.` : `Kulvar ${lane} kapatılacak.`;
    askReason(`${what} Bu kısımdaki rezervasyonlar iptal edilir.`, (reason) =>
      run(() => closeSessionOrLane({ sessionId: session.id, lane, reason }))
    );
  }

  function cancelOne(b: AdminBooking) {
    askReason(`${b.name} adlı üyenin rezervasyonu iptal edilecek.`, (reason) =>
      run(() => adminCancelBooking({ bookingId: b.bookingId, reason }))
    );
  }

  return (
    <article className={`rounded-2xl bg-white p-4 ring-1 ring-line ${started ? "opacity-70" : ""}`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-3xl font-semibold leading-none">{sessionRange(session.time)}</h3>
        {!started &&
          (session.sessionClosed ? (
            <Button small variant="secondary" disabled={pending} onClick={() => run(() => reopenSessionOrLane({ sessionId: session.id, lane: null }))}>
              Seansı aç
            </Button>
          ) : (
            <Button small variant="danger" disabled={pending} onClick={() => close(null)}>
              Seansı kapat
            </Button>
          ))}
      </header>

      {session.sessionClosed && (
        <p className="mb-3 text-sm font-bold text-rope">Seans kapalı: {session.closureReason}</p>
      )}

      <ul className="space-y-3">
        {session.lanes.map((lane) => {
          const laneBookings = bookings.filter((b) => b.lane === lane.lane);
          return (
            <li key={lane.lane} className="rounded-xl bg-water p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-xl font-semibold">
                  Kulvar {lane.lane}{" "}
                  <span className="font-sans text-sm font-normal text-mist">
                    {lane.booked}/{lane.capacity}
                  </span>
                </span>
                {!started && !session.sessionClosed &&
                  (lane.laneClosed ? (
                    <Button small variant="secondary" disabled={pending} onClick={() => run(() => reopenSessionOrLane({ sessionId: session.id, lane: lane.lane }))}>
                      Kulvarı aç
                    </Button>
                  ) : (
                    <Button small variant="quiet" disabled={pending} onClick={() => close(lane.lane)}>
                      Kulvarı kapat
                    </Button>
                  ))}
              </div>
              {lane.laneClosed && <p className="text-sm text-rope">Kapalı: {lane.closureReason}</p>}
              {laneBookings.length > 0 && (
                <ul className="mt-2 divide-y divide-line">
                  {laneBookings.map((b) => (
                    <li key={b.bookingId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                      <span>
                        {b.name} <span className="text-mist">{b.email}</span>
                      </span>
                      {!started && (
                        <Button small variant="quiet" disabled={pending} onClick={() => cancelOne(b)}>
                          İptal et
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {reasonRequest && (
        <ReasonDialog question={reasonRequest.question} onSubmit={reasonRequest.onSubmit} onCancel={cancelReason} />
      )}

      {result && (
        <div className="mt-3">
          <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>
        </div>
      )}
    </article>
  );
}
