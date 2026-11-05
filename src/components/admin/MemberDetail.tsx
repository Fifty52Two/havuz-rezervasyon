"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  addMembershipMonth,
  deleteMember,
  removeMembershipMonth,
  sendWarning,
  setMemberAdmin,
  setMembershipCredits,
} from "@/lib/actions/admin";
import { Button, Field, Notice } from "@/components/ui";
import { monthLabel } from "@/lib/time";
import { useAdminAction } from "./useAdminAction";
import type { MonthCredit } from "@/types";

interface Member {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export default function MemberDetail({
  member,
  months,
  isSelf,
  backHref,
  defaultCredits,
}: {
  member: Member;
  months: MonthCredit[];
  isSelf: boolean;
  backHref: string;
  defaultCredits: number;
}) {
  const router = useRouter();
  const { pending, result, run } = useAdminAction();
  const [credits, setCredits] = useState<Record<string, number>>(
    Object.fromEntries(months.map((m) => [m.month, m.credits]))
  );

  function onWarn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    run(
      () =>
        sendWarning({
          userId: member.id,
          subject: String(form.get("subject") ?? ""),
          message: String(form.get("message") ?? ""),
        }),
      () => formEl.reset()
    );
  }

  function onDelete() {
    if (!window.confirm(`${member.name} adlı üyeyi ve tüm rezervasyonlarını silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    run(() => deleteMember({ userId: member.id }), () => router.push(backHref));
  }

  return (
    <section className="space-y-5 rounded-2xl bg-white p-5 ring-2 ring-lane">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{member.name}</h2>
          <p className="text-sm text-mist">{member.email}</p>
          {member.isAdmin && <p className="text-sm font-bold text-lane">Admin</p>}
        </div>
        <Link href={backHref} className="text-sm text-lane hover:underline">
          Listeye dön
        </Link>
      </div>

      {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Üyelik ayları</h3>
          <Button small disabled={pending} onClick={() => run(() => addMembershipMonth({ userId: member.id }))}>
            +1 ay ekle ({defaultCredits} hak)
          </Button>
        </div>
        {months.length === 0 ? (
          <p className="text-sm text-mist">Üyelik kaydı yok. “+1 ay ekle” bu ayı başlatır.</p>
        ) : (
          <ul className="divide-y divide-line">
            {months.map((m) => (
              <li key={m.month} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-28 font-bold">{monthLabel(m.month)}</span>
                <span className="text-sm text-mist">{m.used} kullanıldı</span>
                <label className="sr-only" htmlFor={`credits-${m.month}`}>
                  {monthLabel(m.month)} hak sayısı
                </label>
                <input
                  id={`credits-${m.month}`}
                  type="number"
                  min={m.used}
                  max={100}
                  value={credits[m.month] ?? m.credits}
                  onChange={(e) => setCredits({ ...credits, [m.month]: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-line px-2 py-1"
                />
                <Button
                  small
                  variant="secondary"
                  disabled={pending || credits[m.month] === m.credits}
                  onClick={() =>
                    run(() => setMembershipCredits({ userId: member.id, month: m.month, credits: credits[m.month] }))
                  }
                >
                  Kaydet
                </Button>
                <Button
                  small
                  variant="quiet"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`${monthLabel(m.month)} üyeliği silinsin mi?`)) {
                      run(() => removeMembershipMonth({ userId: member.id, month: m.month }));
                    }
                  }}
                >
                  Sil
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onWarn} className="space-y-2">
        <h3 className="font-bold">Uyarı e-postası gönder</h3>
        <Field label="Konu" id="subject" required minLength={2} maxLength={120} />
        <label htmlFor="message" className="block text-sm font-bold">
          Mesaj
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={2000}
          rows={4}
          className="w-full rounded-xl border border-line p-3 focus:border-lane focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          E-postayı gönder
        </Button>
      </form>

      {!isSelf && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => setMemberAdmin({ userId: member.id, isAdmin: !member.isAdmin }))}
          >
            {member.isAdmin ? "Admin yetkisini kaldır" : "Admin yap"}
          </Button>
          <Button variant="danger" disabled={pending} onClick={onDelete}>
            Üyeyi sil
          </Button>
        </div>
      )}
    </section>
  );
}
