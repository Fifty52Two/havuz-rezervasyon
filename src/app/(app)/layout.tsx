import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader name={profile.name} isAdmin={profile.isAdmin} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}
