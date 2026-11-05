# GTÜ Havuz Rezervasyon

GTÜ yüzme havuzu için seans ve kulvar rezervasyon uygulaması. Mobil öncelikli, Türkçe arayüz.

## Ne yapıyor?

- Hafta içi 17:00–21:00, hafta sonu 09:00–14:00 arası 1 saatlik seanslar (admin değiştirebilir).
- Her seansta kulvarlar (başlangıçta 2) ve kulvar başına kapasite (başlangıçta 10). Üye kulvarını kendisi seçer.
- Aylık hak sistemi: her üyelik ayı 8 hak verir (admin değiştirebilir). Bir rezervasyon 1 hak kullanır, zamanında iptal hakkı iade eder. Bir ayın hakları sonraki aya devretmez.
- Üyelik ayları admin panelinden eklenir; üyeliği olmayan takvimi görür ama rezervasyon yapamaz.
- Admin bir seansı, tek bir kulvarı ya da bütün bir günü kapatabilir; etkilenen rezervasyonlar iptal edilir, haklar iade edilir, üyelere e-posta gider.
- Kayıt herhangi bir e-posta adresiyle yapılır; e-posta kodla doğrulanır. İsteğe bağlı iki adımlı doğrulama (TOTP).
- Geri bildirim formu (yönetime e-posta).

## Teknolojiler

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Auth, Postgres, pg_cron) · Resend · Vercel

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev                  # http://localhost:3000
```

Diğer komutlar: `npm run build`, `npm run lint`, `npm run typecheck`.

## Veritabanı kurulumu

Yeni bir Supabase projesinde, SQL Editor'de sırayla:

1. `supabase/01_schema.sql` — tablolar, güvenlik kuralları ve fonksiyonlar.
2. Database → Extensions'tan `pg_cron`'u etkinleştirin, sonra `supabase/02_cron.sql`.
3. Siteye kayıt olup e-postanızı doğrulayın, sonra `supabase/03_first_admin.sql` (kendi e-postanızla).

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje adresi |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (`sb_secret_…`); yalnızca üye silmede kullanılır. Vercel'de **Secret** olarak saklanır. |
| `RESEND_API_KEY` | Resend API anahtarı (Secret) |
| `MAIL_FROM` | Gönderen, ör. `GTÜ Havuz <noreply@alanadi.com>`; alan adı Resend'de doğrulanmış olmalı |
| `FEEDBACK_RECIPIENTS` | Geri bildirimlerin gideceği adresler, virgülle ayrılmış |
| `NEXT_PUBLIC_APP_URL` | Canlı adres (şifre sıfırlama bağlantıları için) |

`RESEND_API_KEY` veya `MAIL_FROM` tanımlı değilse e-postalar gönderilmez, sadece sunucu loguna yazılır (yerel geliştirme için).

## Proje yapısı

```text
supabase/              Veritabanı şeması, zamanlanmış iş, ilk admin
src/
  app/(auth)/          Giriş, kayıt, e-posta doğrulama, şifre sıfırlama, iki adımlı doğrulama
  app/(app)/           Takvim, rezervasyonlarım, profil, yönetim
  components/          Arayüz bileşenleri (calendar/, admin/)
  lib/data/            Veritabanı fonksiyonlarını çağıran tek katman
  lib/actions/         Server action'lar (doğrulama → veri katmanı → sonuç)
  lib/email/           E-posta gönderimi ve şablonları
  middleware.ts        Oturum, iki adımlı doğrulama ve sayfa erişimi
```

Geliştirici notları için `CLAUDE.md`, güvenlik tasarımı için `SECURITY.md`.
# havuz-rezervasyon
