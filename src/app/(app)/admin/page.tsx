import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  fetchDay,
  fetchDayBookings,
  fetchMember,
  fetchMemberMonths,
  fetchMembers,
  fetchOverview,
} from "@/lib/data/admin";
import { fetchSettings } from "@/lib/data/member";
import { addDays, dateLong, dateWithYear, hoursUntil, isDateString, todayTR } from "@/lib/time";
import { uuidSchema } from "@/lib/validation";
import AdminSessionCard from "@/components/admin/AdminSessionCard";
import CloseDayButton from "@/components/admin/CloseDayButton";
import MemberDetail from "@/components/admin/MemberDetail";
import QuickAddMonth from "@/components/admin/QuickAddMonth";
import SettingsForm from "@/components/admin/SettingsForm";

const TABS = [
  { id: "ozet", label: "Özet" },
  { id: "uyeler", label: "Üyeler" },
  { id: "seanslar", label: "Seanslar" },
  { id: "ayarlar", label: "Ayarlar" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Search = { tab?: string; q?: string; uye?: string; gun?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const admin = await getAdminProfile();
  if (!admin) redirect("/");

  const sp = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === sp.tab) ? (sp.tab as TabId) : "ozet";

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Yönetim</h1>
      <nav aria-label="Yönetim sekmeleri" className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2 font-bold ${
              tab === t.id ? "bg-deep text-white" : "bg-white ring-1 ring-line hover:ring-lane"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "ozet" && <Overview />}
      {tab === "uyeler" && <Members query={(sp.q ?? "").slice(0, 100)} memberId={sp.uye} adminId={admin.id} />}
      {tab === "seanslar" && <Sessions day={isDateString(sp.gun) ? sp.gun : todayTR()} />}
      {tab === "ayarlar" && <SettingsTab />}
    </div>
  );
}

async function Overview() {
  const o = await fetchOverview(await createClient());
  const stats = [
    { label: "Toplam üye", value: o.memberCount },
    { label: "Bu ay üyeliği olan", value: o.activeMemberCount },
    { label: "Bugünkü rezervasyon", value: o.todayBookings },
    { label: "Bu haftaki rezervasyon", value: o.weekBookings },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="font-display text-4xl font-bold leading-none">{s.value}</p>
          <p className="mt-1 text-sm text-mist">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

async function Members({ query, memberId, adminId }: { query: string; memberId?: string; adminId: string }) {
  const supabase = await createClient();
  const backHref = `/admin?tab=uyeler${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  let detail: React.ReactNode = null;
  if (memberId && uuidSchema.safeParse(memberId).success) {
    const [member, months, settings] = await Promise.all([
      fetchMember(supabase, memberId),
      fetchMemberMonths(supabase, memberId),
      fetchSettings(supabase),
    ]);
    if (member) {
      detail = (
        <MemberDetail
          member={member}
          months={months}
          isSelf={member.id === adminId}
          backHref={backHref}
          defaultCredits={settings.monthlyCredits}
        />
      );
    }
  }

  const members = await fetchMembers(supabase, query);

  return (
    <div className="space-y-4">
      {detail}
      <form method="get" action="/admin" className="flex gap-2">
        <input type="hidden" name="tab" value="uyeler" />
        <label htmlFor="q" className="sr-only">
          Üye ara
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="İsim veya e-posta"
          className="flex-1 rounded-xl border border-line bg-white px-3 py-2.5 focus:border-lane focus:outline-none"
        />
        <button type="submit" className="rounded-xl bg-lane px-4 font-bold text-white">
          Ara
        </button>
      </form>

      {members.length === 0 ? (
        <p className="text-mist">Üye bulunamadı.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/admin?tab=uyeler&uye=${m.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  className="font-bold text-lane hover:underline"
                >
                  {m.name}
                </Link>
                {m.isAdmin && <span className="ml-2 text-xs font-bold text-lane">Admin</span>}
                <p className="truncate text-sm text-mist">{m.email}</p>
                <p className="text-sm">
                  {m.membershipUntil ? `Üyelik: ${dateWithYear(m.membershipUntil)} tarihine kadar` : "Üyelik yok"}
                  {m.currentCredits !== null && (
                    <span className="text-mist">
                      {" "}
                      (bu ay {m.currentUsed}/{m.currentCredits})
                    </span>
                  )}
                </p>
              </div>
              <QuickAddMonth userId={m.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function Sessions({ day }: { day: string }) {
  const supabase = await createClient();
  const [sessions, bookings] = await Promise.all([fetchDay(supabase, day), fetchDayBookings(supabase, day)]);
  const dayLink = (d: string) => `/admin?tab=seanslar&gun=${d}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={dayLink(addDays(day, -1))} aria-label="Önceki gün" className="rounded-full bg-white px-3 py-1 font-display text-2xl ring-1 ring-line">
            ‹
          </Link>
          <h2 className="font-display text-2xl font-semibold">{dateLong(day)}</h2>
          <Link href={dayLink(addDays(day, 1))} aria-label="Sonraki gün" className="rounded-full bg-white px-3 py-1 font-display text-2xl ring-1 ring-line">
            ›
          </Link>
        </div>
        <form method="get" action="/admin" className="flex gap-2">
          <input type="hidden" name="tab" value="seanslar" />
          <label htmlFor="gun" className="sr-only">
            Tarih seç
          </label>
          <input key={day} id="gun" name="gun" type="date" defaultValue={day} className="rounded-xl border border-line bg-white px-2 py-1.5" />
          <button type="submit" className="rounded-xl bg-white px-3 font-bold ring-1 ring-line">
            Git
          </button>
        </form>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-mist ring-1 ring-line">Bu gün için seans yok.</p>
      ) : (
        <>
          <CloseDayButton date={day} />
          <div className="space-y-4">
            {sessions.map((s) => (
              <AdminSessionCard
                key={s.id}
                session={s}
                bookings={bookings.filter((b) => b.sessionId === s.id)}
                started={hoursUntil(s.startsAt) <= 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function SettingsTab() {
  const settings = await fetchSettings(await createClient());
  return <SettingsForm initial={settings} />;
}
