"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { LaneMark } from "@/components/ui";
import FeedbackButton from "@/components/FeedbackButton";

const LINKS = [
  { href: "/", label: "Takvim" },
  { href: "/reservations", label: "Rezervasyonlarım" },
  { href: "/profile", label: "Profil" },
];

export default function AppHeader({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Yönetim" }] : LINKS;

  return (
    <header className="bg-deep text-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-4">
        <Link href="/" className="flex items-center gap-2">
          <LaneMark size={32} />
          <span className="font-display text-2xl font-semibold leading-none">GTÜ Havuz</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-white/70 sm:inline">{name}</span>
          <FeedbackButton />
          <form action={logout}>
            <button type="submit" className="text-white/80 hover:text-white">
              Çıkış
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Ana menü" className="mx-auto max-w-2xl overflow-x-auto px-4">
        <ul className="flex gap-5 pt-3">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap border-b-4 pb-2 font-bold ${
                    active ? "border-[#5FA8D3] text-white" : "border-transparent text-white/70 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
