"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookSession, cancelMyBooking } from "@/lib/data/member";
import { errorCode } from "@/lib/data/rpc";
import { messageFor } from "@/lib/errors";
import { laneSchema, uuidSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

function refresh() {
  revalidatePath("/");
  revalidatePath("/reservations");
}

export async function book(input: { sessionId: string; lane: number }): Promise<ActionResult> {
  const sessionId = uuidSchema.safeParse(input.sessionId);
  const lane = laneSchema.safeParse(input.lane);
  if (!sessionId.success || !lane.success) return { ok: false, error: messageFor("invalid_input") };

  try {
    const supabase = await createClient();
    await bookSession(supabase, sessionId.data, lane.data);
    refresh();
    return { ok: true, message: `Kulvar ${lane.data}'de yerin ayrıldı.` };
  } catch (err) {
    return { ok: false, error: messageFor(errorCode(err)) };
  }
}

export async function cancel(input: { bookingId: string }): Promise<ActionResult> {
  const bookingId = uuidSchema.safeParse(input.bookingId);
  if (!bookingId.success) return { ok: false, error: messageFor("invalid_input") };

  try {
    const supabase = await createClient();
    await cancelMyBooking(supabase, bookingId.data);
    refresh();
    return { ok: true, message: "Rezervasyonun iptal edildi, hakkın iade edildi." };
  } catch (err) {
    return { ok: false, error: messageFor(errorCode(err)) };
  }
}
