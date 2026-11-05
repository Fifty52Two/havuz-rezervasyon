export type BookingStatus = "active" | "cancelled_by_user" | "cancelled_by_admin";

export interface Profile {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  nameChangedAt: string | null;
}

export interface Settings {
  laneCount: number;
  laneCapacity: number;
  weekdayStart: string; // "HH:MM"
  weekdayEnd: string;
  weekendStart: string;
  weekendEnd: string;
  monthlyCredits: number;
  bookingWindowDays: number;
  dailyLimit: number;
  minCancelHours: number;
}

export interface LaneView {
  lane: number;
  capacity: number;
  booked: number;
  isClosed: boolean;
  closureReason: string | null;
}

export interface SessionView {
  id: string;
  date: string;     // "YYYY-MM-DD" (Türkiye)
  time: string;     // "HH:MM" (Türkiye)
  startsAt: string; // ISO
  opensOn: string;  // rezervasyonun açıldığı tarih
  myBookingId: string | null;
  myLane: number | null;
  lanes: LaneView[];
}

export interface MonthCredit {
  month: string; // "YYYY-MM-01"
  credits: number;
  used: number;
}

export interface MyBooking {
  id: string;
  startsAt: string;
  date: string;
  time: string;
  lane: number;
  status: BookingStatus;
  cancelReason: string | null;
}

export interface CancelledBooking {
  bookingId: string;
  userId: string;
  email: string;
  name: string;
  date: string;
  time: string;
  lane: number;
}

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  membershipUntil: string | null;
  currentCredits: number | null;
  currentUsed: number;
}

export interface AdminOverview {
  memberCount: number;
  activeMemberCount: number;
  todayBookings: number;
  weekBookings: number;
}

export interface AdminLane {
  lane: number;
  capacity: number;
  booked: number;
  laneClosed: boolean;
  closureReason: string | null;
}

export interface AdminSession {
  id: string;
  time: string;
  startsAt: string;
  sessionClosed: boolean;
  closureReason: string | null;
  lanes: AdminLane[];
}

export interface AdminBooking {
  bookingId: string;
  sessionId: string;
  lane: number;
  userId: string;
  name: string;
  email: string;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
