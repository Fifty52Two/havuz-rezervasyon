import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";
import { hhmm } from "@/lib/time";
import type { BookingStatus, MonthCredit, MyBooking, SessionView, Settings } from "@/types";

interface WeekRow {
  session_id: string;
  local_date: string;
  local_time: string;
  starts_at: string;
  lane: number;
  capacity: number;
  booked: number;
  is_closed: boolean;
  closure_reason: string | null;
  my_booking_id: string | null;
  my_lane: number | null;
  opens_on: string;
}

export async function fetchWeek(client: SupabaseClient, weekStart: string): Promise<SessionView[]> {
  const rows = (await callRpc<WeekRow[] | null>(client, "get_week", { p_week_start: weekStart })) ?? [];
  const sessions = new Map<string, SessionView>();
  for (const r of rows) {
    let s = sessions.get(r.session_id);
    if (!s) {
      s = {
        id: r.session_id,
        date: r.local_date,
        time: hhmm(r.local_time),
        startsAt: r.starts_at,
        opensOn: r.opens_on,
        myBookingId: r.my_booking_id,
        myLane: r.my_lane,
        lanes: [],
      };
      sessions.set(r.session_id, s);
    }
    s.lanes.push({
      lane: r.lane,
      capacity: r.capacity,
      booked: r.booked,
      isClosed: r.is_closed,
      closureReason: r.closure_reason,
    });
  }
  return Array.from(sessions.values());
}

export async function fetchMyStatus(client: SupabaseClient): Promise<MonthCredit[]> {
  const rows = (await callRpc<{ month: string; credits: number; used: number }[] | null>(client, "get_my_status")) ?? [];
  return rows.map((r) => ({ month: r.month, credits: r.credits, used: r.used }));
}

export async function fetchMyBookings(client: SupabaseClient): Promise<MyBooking[]> {
  const rows =
    (await callRpc<
      {
        booking_id: string;
        starts_at: string;
        local_date: string;
        local_time: string;
        lane: number;
        status: BookingStatus;
        cancel_reason: string | null;
      }[] | null
    >(client, "get_my_bookings")) ?? [];
  return rows.map((r) => ({
    id: r.booking_id,
    startsAt: r.starts_at,
    date: r.local_date,
    time: hhmm(r.local_time),
    lane: r.lane,
    status: r.status,
    cancelReason: r.cancel_reason,
  }));
}

interface SettingsRow {
  lane_count: number;
  lane_capacity: number;
  weekday_start: string;
  weekday_end: string;
  weekend_start: string;
  weekend_end: string;
  monthly_credits: number;
  booking_window_days: number;
  daily_limit: number;
  min_cancel_hours: number;
}

export async function fetchSettings(client: SupabaseClient): Promise<Settings> {
  const r = await callRpc<SettingsRow>(client, "get_settings");
  return {
    laneCount: r.lane_count,
    laneCapacity: r.lane_capacity,
    weekdayStart: hhmm(r.weekday_start),
    weekdayEnd: hhmm(r.weekday_end),
    weekendStart: hhmm(r.weekend_start),
    weekendEnd: hhmm(r.weekend_end),
    monthlyCredits: r.monthly_credits,
    bookingWindowDays: r.booking_window_days,
    dailyLimit: r.daily_limit,
    minCancelHours: r.min_cancel_hours,
  };
}

export function bookSession(client: SupabaseClient, sessionId: string, lane: number) {
  return callRpc<string>(client, "book_session", { p_session_id: sessionId, p_lane: lane });
}

export function cancelMyBooking(client: SupabaseClient, bookingId: string) {
  return callRpc<null>(client, "cancel_booking", { p_booking_id: bookingId });
}

export function updateMyName(client: SupabaseClient, name: string) {
  return callRpc<null>(client, "update_my_name", { p_name: name });
}

export function submitFeedback(client: SupabaseClient, message: string) {
  return callRpc<null>(client, "submit_feedback", { p_message: message });
}
