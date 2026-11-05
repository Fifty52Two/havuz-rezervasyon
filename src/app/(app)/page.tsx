import { createClient } from "@/lib/supabase/server";
import { fetchMyStatus, fetchSettings, fetchWeek } from "@/lib/data/member";
import { addDays, isDateString, todayTR, weekStart } from "@/lib/time";
import CreditsSummary from "@/components/calendar/CreditsSummary";
import WeekView from "@/components/calendar/WeekView";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ hafta?: string }> }) {
  const { hafta } = await searchParams;
  const supabase = await createClient();
  const settings = await fetchSettings(supabase);

  // Gezinme: bu haftadan, rezervasyon penceresinin son gününü içeren haftaya kadar.
  const today = todayTR();
  const minWeek = weekStart(today);
  const maxWeek = weekStart(addDays(today, settings.bookingWindowDays));
  let start = isDateString(hafta) ? weekStart(hafta) : minWeek;
  if (start < minWeek) start = minWeek;
  if (start > maxWeek) start = maxWeek;

  const [sessions, months] = await Promise.all([fetchWeek(supabase, start), fetchMyStatus(supabase)]);

  return (
    <>
      <CreditsSummary months={months} today={today} />
      <WeekView
        key={start}
        weekStart={start}
        prevWeek={start > minWeek ? addDays(start, -7) : null}
        nextWeek={start < maxWeek ? addDays(start, 7) : null}
        sessions={sessions}
        today={today}
        minCancelHours={settings.minCancelHours}
      />
    </>
  );
}
