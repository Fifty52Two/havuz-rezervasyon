import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchMyStatus } from "@/lib/data/member";
import { dateWithYear, monthLabel } from "@/lib/time";
import NameForm from "./NameForm";
import PasswordForm from "./PasswordForm";
import MfaSection from "./MfaSection";

function nameLockedUntil(changedAt: string | null): string | null {
  if (!changedAt) return null;
  const unlock = new Date(new Date(changedAt).getTime() + 30 * 86_400_000);
  return unlock.getTime() > Date.now() ? dateWithYear(unlock.toISOString().slice(0, 10)) : null;
}

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const months = await fetchMyStatus(await createClient());

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Profil</h1>

      <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-lg font-bold">Üyelik</h2>
        {months.length === 0 ? (
          <p className="text-mist">Aktif üyeliğin yok. Üyelik için yönetimle görüş.</p>
        ) : (
          <ul className="divide-y divide-line">
            {months.map((m) => (
              <li key={m.month} className="flex justify-between py-2">
                <span>{monthLabel(m.month)}</span>
                <span className="text-mist">
                  {m.credits - m.used} / {m.credits} hak kaldı
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-mist">Bir ayın hakları sadece o ayın seansları için geçerlidir, sonraki aya devretmez.</p>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-lg font-bold">Bilgilerin</h2>
        <p className="text-sm text-mist">E-posta: {profile.email}</p>
        <NameForm currentName={profile.name} lockedUntil={nameLockedUntil(profile.nameChangedAt)} />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-lg font-bold">Şifre</h2>
        <PasswordForm />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-lg font-bold">İki adımlı doğrulama</h2>
        <MfaSection />
      </section>
    </div>
  );
}
