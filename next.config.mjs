// Güvenlik başlıkları (OWASP A05 Security Misconfiguration).
// CSP'de sadece Next.js'in satır içi script'lerini bozmayan yönergeler var;
// clickjacking (frame-ancestors), base/form hedefi ve eklenti (object) yasakları.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Sayfalar 30 sn istemci önbelleğinde kalır; işlemlerden sonra revalidatePath tazeler.
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
