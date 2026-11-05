import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callRpc } from "./rpc";
import { hhmm } from "@/lib/time";
import type { SettingsInput } from "@/lib/validation";
import type {
  AdminBooking,
  AdminOverview,
  AdminSession,
  CancelledBooking,
  MemberRow,
  MonthCredit,
} from "@/types";

interface CancelledRow {
  booking_id: string;
  user_id: string;
  email: string;
  name: string;
  local_date: string;
  local_time: string;
  lane: number;
}

function mapCancelled(rows: CancelledRow[] | null): CancelledBooking[] {
  return (rows ?? []).map((r) => ({
    bookingId: r.booking_id,
    userId: r.user_id,
    email: r.email,
    name: r.name,
    date: r.local_date,
    time: hhmm(r.local_time),
    lane: r.lane,
  }));
}

export async function fetchOverview(client: SupabaseClient): Promise<AdminOverview> {
  const rows = await callRpc<
    { member_count: number; active_member_count: number; today_bookings: number; week_bookings: number }[]
  >(client, "admin_overview");
  const r = rows[0];
  return {
    memberCount: r?.member_count ?? 0,
    activeMemberCount: r?.active_member_count ?? 0,
    todayBookings: r?.today_bookings ?? 0,
    weekBookings: r?.week_bookings ?? 0,
  };
}

export async function fetchMembers(client: SupabaseClient, query: string): Promise<MemberRow[]> {
  const rows =
    (await callRpc<
      {
        id: string;
        name: string;
        email: string;
        is_admin: boolean;
        created_at: string;
        membership_until: string | null;
        current_credits: number | null;
        current_used: number;
      }[] | null
    >(client, "admin_list_members", { p_query: query })) ?? [];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    isAdmin: r.is_admin,
    createdAt: r.created_at,
    membershipUntil: r.membership_until,
    currentCredits: r.current_credits,
    currentUsed: r.current_used,
  }));
}

export async function fetchMember(client: SupabaseClient, userId: string) {
  const rows = await callRpc<{ id: string; name: string; email: string; is_admin: boolean }[] | null>(
    client,
    "admin_get_member",
    { p_user_id: userId }
  );
  const r = rows?.[0];
  return r ? { id: r.id, name: r.name, email: r.email, isAdmin: r.is_admin } : null;
}

export async function fetchMemberMonths(client: SupabaseClient, userId: string): Promise<MonthCredit[]> {
  const rows =
    (await callRpc<{ month: string; credits: number; used: number }[] | null>(client, "admin_member_months", {
      p_user_id: userId,
    })) ?? [];
  return rows.map((r) => ({ month: r.month, credits: r.credits, used: r.used }));
}

export async function addMonth(client: SupabaseClient, userId: string): Promise<MonthCredit> {
  const rows = await callRpc<{ month: string; credits: number }[]>(client, "admin_add_month", { p_user_id: userId });
  return { month: rows[0].month, credits: rows[0].credits, used: 0 };
}

export function setMonthCredits(client: SupabaseClient, userId: string, month: string, credits: number) {
  return callRpc<null>(client, "admin_set_month_credits", { p_user_id: userId, p_month: month, p_credits: credits });
}

export function removeMonth(client: SupabaseClient, userId: string, month: string) {
  return callRpc<null>(client, "admin_remove_month", { p_user_id: userId, p_month: month });
}

export function setAdmin(client: SupabaseClient, userId: string, isAdmin: boolean) {
  return callRpc<null>(client, "admin_set_admin", { p_user_id: userId, p_is_admin: isAdmin });
}

export function prepareDelete(client: SupabaseClient, userId: string) {
  return callRpc<null>(client, "admin_prepare_delete", { p_user_id: userId });
}

export async function fetchDay(client: SupabaseClient, date: string): Promise<AdminSession[]> {
  const rows =
    (await callRpc<
      {
        session_id: string;
        local_time: string;
        starts_at: string;
        lane: number;
        capacity: number;
        booked: number;
        session_closed: boolean;
        lane_closed: boolean;
        closure_reason: string | null;
      }[] | null
    >(client, "admin_day", { p_date: date })) ?? [];
  const sessions = new Map<string, AdminSession>();
  for (const r of rows) {
    let s = sessions.get(r.session_id);
    if (!s) {
      s = {
        id: r.session_id,
        time: hhmm(r.local_time),
        startsAt: r.starts_at,
        sessionClosed: r.session_closed,
        closureReason: r.session_closed ? r.closure_reason : null,
        lanes: [],
      };
      sessions.set(r.session_id, s);
    }
    s.lanes.push({
      lane: r.lane,
      capacity: r.capacity,
      booked: r.booked,
      laneClosed: r.lane_closed,
      closureReason: r.lane_closed ? r.closure_reason : null,
    });
  }
  return Array.from(sessions.values());
}

export async function fetchDayBookings(client: SupabaseClient, date: string): Promise<AdminBooking[]> {
  const rows =
    (await callRpc<
      { booking_id: string; session_id: string; lane: number; user_id: string; name: string; email: string }[] | null
    >(client, "admin_day_bookings", { p_date: date })) ?? [];
  return rows.map((r) => ({
    bookingId: r.booking_id,
    sessionId: r.session_id,
    lane: r.lane,
    userId: r.user_id,
    name: r.name,
    email: r.email,
  }));
}

export async function closeSession(client: SupabaseClient, sessionId: string, lane: number | null, reason: string) {
  return mapCancelled(
    await callRpc<CancelledRow[] | null>(client, "admin_close", { p_session_id: sessionId, p_lane: lane, p_reason: reason })
  );
}

export async function closeDay(client: SupabaseClient, date: string, reason: string) {
  return mapCancelled(await callRpc<CancelledRow[] | null>(client, "admin_close_day", { p_date: date, p_reason: reason }));
}

export function reopen(client: SupabaseClient, sessionId: string, lane: number | null) {
  return callRpc<null>(client, "admin_reopen", { p_session_id: sessionId, p_lane: lane });
}

export async function cancelBooking(client: SupabaseClient, bookingId: string, reason: string) {
  return mapCancelled(
    await callRpc<CancelledRow[] | null>(client, "admin_cancel_booking", { p_booking_id: bookingId, p_reason: reason })
  );
}

/** Ayarları kaydeder; aylık hak değiştiyse güncellenen gelecek üyelik ayı sayısını döndürür. */
export function updateSettings(client: SupabaseClient, s: SettingsInput) {
  return callRpc<number>(client, "admin_update_settings", {
    p_lane_count: s.laneCount,
    p_lane_capacity: s.laneCapacity,
    p_weekday_start: s.weekdayStart,
    p_weekday_end: s.weekdayEnd,
    p_weekend_start: s.weekendStart,
    p_weekend_end: s.weekendEnd,
    p_monthly_credits: s.monthlyCredits,
    p_booking_window_days: s.bookingWindowDays,
    p_daily_limit: s.dailyLimit,
    p_min_cancel_hours: s.minCancelHours,
  });
}
