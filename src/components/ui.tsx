import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-lane text-white hover:bg-[#195d96] disabled:bg-lane/50",
  secondary: "bg-white text-deep border border-line hover:border-lane disabled:opacity-50",
  danger: "bg-white text-rope border border-rope/40 hover:bg-rope hover:text-white disabled:opacity-50",
  quiet: "text-lane underline-offset-4 hover:underline disabled:opacity-50",
};

export function Button({
  variant = "primary",
  small = false,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  const size = variant === "quiet" ? "" : small ? "px-3 py-1.5 text-sm rounded-lg" : "px-4 py-2.5 rounded-xl";
  return (
    <button
      type={type}
      className={`font-bold transition-colors disabled:cursor-not-allowed ${size} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  id,
  hint,
  className = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        name={input.name ?? id}
        className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-deep placeholder:text-mist/60 focus:border-lane focus:outline-none"
        {...input}
      />
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-rope/30 bg-rope/5 text-rope",
    success: "border-mint/30 bg-mint/5 text-mint",
    info: "border-line bg-white text-deep",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

/** Üç kulvar ve iki kulvar ipinden oluşan işaret. */
export function LaneMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#0E3B5C" />
      <rect x="6" y="9" width="28" height="4" rx="2" fill="#5FA8D3" />
      <rect x="6" y="18" width="28" height="4" rx="2" fill="#5FA8D3" />
      <rect x="6" y="27" width="28" height="4" rx="2" fill="#5FA8D3" />
      <g fill="#D7263D">
        <circle cx="9" cy="15.5" r="1.4" />
        <circle cx="15" cy="15.5" r="1.4" />
        <circle cx="21" cy="15.5" r="1.4" />
        <circle cx="27" cy="15.5" r="1.4" />
        <circle cx="33" cy="15.5" r="1.4" />
        <circle cx="9" cy="24.5" r="1.4" />
        <circle cx="15" cy="24.5" r="1.4" />
        <circle cx="21" cy="24.5" r="1.4" />
        <circle cx="27" cy="24.5" r="1.4" />
        <circle cx="33" cy="24.5" r="1.4" />
      </g>
    </svg>
  );
}
