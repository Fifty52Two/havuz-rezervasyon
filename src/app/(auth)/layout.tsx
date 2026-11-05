import { LaneMark } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <LaneMark size={44} />
          <div>
            <p className="font-display text-3xl font-semibold leading-none">GTÜ Havuz</p>
            <p className="text-sm text-mist">Seans ve kulvar rezervasyonu</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6">{children}</div>
      </div>
    </main>
  );
}
