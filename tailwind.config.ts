import type { Config } from "tailwindcss";

// Renkler havuzdan: koyu karo zemin, su yüzeyi, kulvar mavisi, kulvar ipi kırmızısı.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        deep: "#0E3B5C",    // havuz tabanı: başlıklar, ana metin
        water: "#EAF5F8",   // sayfa zemini
        lane: "#1F6FB2",    // birincil eylem
        rope: "#D7263D",    // dolu / kapalı / tehlikeli eylem
        mint: "#1E8F7A",    // senin yerin / başarı
        line: "#C5DFE8",    // kenarlıklar
        mist: "#5B7A8C",    // ikincil metin
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
