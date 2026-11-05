"use client";

import { Fragment, useState, useTransition } from "react";
import { book, cancel } from "@/lib/actions/booking";
import { Button, Notice } from "@/components/ui";
import Occupancy from "./Occupancy";
import { dateLong, hoursUntil, sessionRange } from "@/lib/time";
import type { SessionView } from "@/types";

export default function SessionCard({
  session,
  today,
  minCancelHours,
}: {
  session: SessionView;
  today: string;
  minCancelHours: number;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const started = hoursUntil(session.startsAt) <= 0;
  const notOpen = today < session.opensOn;
  const wholeClosed = session.lanes.every((l) => l.isClosed);
  const canCancel = !started && hoursUntil(session.startsAt) >= minCancelHours;

  function run(action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setFeedback(null);
    startTransition(async () => {
      const r = await action();
      setFeedback(r.ok ? { ok: true, text: r.message ?? "Tamam." } : { ok: false, text: r.error });
    });
  }

  function onCancel() {
    if (!session.myBookingId) return;
    if (!window.confirm("Rezervasyonunu iptal etmek istiyor musun? Hakkın iade edilir.")) return;
    const bookingId = session.myBookingId;
    run(() => cancel({ bookingId }));
  }

  let status: string | null = null;
  if (started) status = "Geçti";
  else if (wholeClosed) status = `Kapalı: ${session.lanes[0]?.closureReason ?? ""}`;
  else if (notOpen) status = `Rezervasyon ${dateLong(session.opensOn)} açılır`;

  return (
    <article
      className={`rounded-2xl bg-white p-4 ring-1 ${session.myLane ? "ring-2 ring-mint" : "ring-line"} ${
        started ? "opacity-60" : ""
      }`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-3xl font-semibold leading-none">{sessionRange(session.time)}</h3>
        {session.myLane ? (
          <span className="font-bold text-mint">Kulvar {session.myLane}&apos;de yerin var</span>
        ) : (
          status && <span className="text-sm text-mist">{status}</span>
        )}
      </header>

      <ul>
        {session.lanes.map((lane, i) => {
          const isMine = session.myLane === lane.lane;
          const full = lane.booked >= lane.capacity;
          let action: React.ReactNode = null;

          if (isMine) {
            action = canCancel ? (
              <Button variant="danger" small onClick={onCancel} disabled={pending}>
                İptal et
              </Button>
            ) : (
              <span className="text-xs text-mist">İptal süresi geçti</span>
            );
          } else if (lane.isClosed) {
            action = <span className="text-sm font-bold text-rope">Kapalı</span>;
          } else if (full) {
            action = <span className="text-sm font-bold text-rope">Dolu</span>;
          } else if (!started && !notOpen && !session.myLane) {
            action = (
              <Button small onClick={() => run(() => book({ sessionId: session.id, lane: lane.lane }))} disabled={pending}>
                Yer ayır
              </Button>
            );
          }

          return (
            <Fragment key={lane.lane}>
              {i > 0 && <li aria-hidden="true" className="lane-rope my-3" />}
              <li className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
                <span className="font-display text-xl font-semibold">Kulvar {lane.lane}</span>
                <div>
                  <Occupancy booked={lane.booked} capacity={lane.capacity} closed={lane.isClosed} />
                  <p className="mt-1 text-xs text-mist">
                    {lane.isClosed && lane.closureReason
                      ? lane.closureReason
                      : `${lane.booked}/${lane.capacity} dolu`}
                  </p>
                </div>
                <div className="min-w-[5.5rem] text-right">{action}</div>
              </li>
            </Fragment>
          );
        })}
      </ul>

      {feedback && (
        <div className="mt-3">
          <Notice tone={feedback.ok ? "success" : "error"}>{feedback.text}</Notice>
        </div>
      )}
    </article>
  );
}
