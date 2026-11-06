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

`04_` ve sonrası, mevcut bir veritabanını güncelleyen dosyalardır. Yeni kurulumda gerekmez, çünkü `01_schema.sql` her zaman en güncel hâli içerir.

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

## CI/CD ve otomasyon

| Ne | Nerede | Ne yapar |
|---|---|---|
| **CI** | `.github/workflows/ci.yml` (GitHub Actions) | Her push ve pull request'te `npm ci`, tip kontrolü, lint, build ve canlıda çalışan paketler için güvenlik denetimi (`npm audit`, kritik seviye). Gizli anahtar gerektirmez. |
| **CD** | Vercel | `main`'e giren her değişiklik canlıya çıkar (https://gtu-havuz.vercel.app). Her pull request için ayrı bir önizleme adresi açılır; bağlantıyı `vercel[bot]` PR'a yorum olarak yazar. Sunucu bölgesi Dublin (`dub1`), ortam değişkenleri Vercel'de tutulur. |
| **Dependabot** | `.github/dependabot.yml` | Haftada bir npm paketlerinin küçük (minor/patch) güncellemelerini tek bir PR'da toplar; ayda bir GitHub Actions sürümlerini günceller. Büyük sürümleri (Next 16, Tailwind 4, TypeScript 7 gibi) önermez, çünkü bunlar kodu bozar ve ayrı bir çalışma olarak yapılır. Güvenlik açığı çıkan paketler için ayrıca güvenlik güncellemesi açar. |
| **Anahtar koruması** | GitHub → Settings → Advanced Security | Secret Protection repoda unutulan anahtarları bulur; Push protection içinde anahtar olan commit'i daha GitHub'a ulaşmadan reddeder. |
| **Branch koruması** | GitHub → Settings → Rules → `main koruması` | `main`'e doğrudan push yapılamaz; değişiklik pull request ile gelir ve **Tip, lint, build** kontrolü geçmeden merge edilemez. Force push ve dal silme engelli. |

## Çalışma akışı

Her değişiklik bir dalda yapılır ve pull request ile `main`'e girer:

```bash
git switch main && git pull            # en güncel hâlden başla
git switch -c tasarim/takvim-renkleri  # kısa, açıklayıcı bir dal adı
# ... değişiklikleri yap, yerelde dene ...
npm run typecheck && npm run lint      # CI'dan önce yerelde kontrol
git add -A && git commit -m "Takvim renkleri güncellendi"
git push -u origin tasarim/takvim-renkleri
```

GitHub'da çıkan **Compare & pull request** ile PR açılır. CI yeşil olunca ve Vercel önizlemesinde denendikten sonra **Merge pull request**, ardından **Delete branch**. Son olarak yerelde `git switch main && git pull`.

**Dependabot PR'ları:** CI yeşilse önizlemede giriş, rezervasyon ve çıkış denenir, sonra merge edilir. CI kırmızıysa merge edilmez; PR kapatılır. PR'a yorum olarak yazılabilen komutlar:

- `@dependabot rebase`: PR'ı güncel `main`'e göre yeniden hazırlar (çakışma varsa).
- `@dependabot recreate`: PR'ı baştan oluşturur (yeni önizleme gerekirse).

**Veritabanı değişiklikleri** Vercel ile otomatik gitmez: yeni bir `supabase/0N_*.sql` dosyası, kodu canlıya almadan önce Supabase SQL Editor'de elle çalıştırılır ve `01_schema.sql` de aynı şekilde güncellenir.

Geliştirici notları için `CLAUDE.md`, güvenlik tasarımı için `SECURITY.md`.
