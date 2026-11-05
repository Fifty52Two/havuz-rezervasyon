/**
 * Türkiye saatiyle tarih yardımcıları. Sunucu (Vercel) UTC'de çalışır;
 * tarih hesapları hiçbir zaman sunucunun yerel saatine bırakılmaz.
 * Türkiye 2016'dan beri kalıcı olarak UTC+3'tür.
 */
const TR_TIME_ZONE = "Europe/Istanbul";

const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const DAY_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function toUtcDate(date: string): Date {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = toUtcDate(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayTR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TR_TIME_ZONE }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Verilen tarihin haftasının Pazartesi'si. */
export function weekStart(date: string): string {
  const day = toUtcDate(date).getUTCDay(); // 0 = Pazar
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayShort(date: string): string {
  return DAY_SHORT[toUtcDate(date).getUTCDay()];
}

export function dayOfMonth(date: string): number {
  return parts(date)[2];
}

/** "4 Kasım Çarşamba" */
export function dateLong(date: string): string {
  const [, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1]} ${DAY_LONG[toUtcDate(date).getUTCDay()]}`;
}

/** "3–9 Kasım" veya "30 Kasım – 6 Aralık" */
export function weekRangeLabel(start: string): string {
  const end = addDays(start, 6);
  const [, m1, d1] = parts(start);
  const [, m2, d2] = parts(end);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS[m1 - 1]}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
}

/** "2026-11-01" → "Kasım 2026" */
export function monthLabel(month: string): string {
  const [y, m] = parts(month);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-11-30" → "30 Kasım 2026" */
export function dateWithYear(date: string): string {
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** "17:00" → "17:00–18:00" (seanslar 1 saattir) */
export function sessionRange(time: string): string {
  const h = Number(time.slice(0, 2));
  return `${hhmm(time)}–${String(h + 1).padStart(2, "0")}:00`;
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}
