# Güvenlik tasarımı (OWASP Top 10 eşlemesi)

| OWASP | Risk | Bu projede nasıl ele alındı |
|---|---|---|
| A01 Broken Access Control | Başkası adına işlem, yetkisiz admin işlemi, veri sızıntısı | Tüm tablolarda RLS açık, uygulama rollerinin tablo yazma yetkisi yok. Her işlem `security definer` fonksiyonla yapılır ve kimliği `auth.uid()`'den alır. Admin fonksiyonları `assert_admin()` ile başlar. Diğer üyelerin isim/e-postası takvimde görünmez. `/auth/callback` sadece site içi yollara yönlendirir. |
| A02 Cryptographic Failures | Anahtar sızıntısı | Anahtarlar sadece ortam değişkenlerinde; `.env.local` git dışında; secret key Vercel'de Secret tipinde ve yalnızca sunucuda (`server-only`). HSTS başlığı açık. |
| A03 Injection | SQL / HTML enjeksiyonu | SQL sadece parametreli RPC çağrılarıyla; aramada LIKE joker karakterleri kaçışlanıyor. E-postalarda tüm kullanıcı metni `escapeHtml`'den geçiyor. React çıktıları otomatik kaçışlı; `dangerouslySetInnerHTML` yok. |
| A04 Insecure Design | Kapasite aşımı, hak hilesi, yarış durumları | Kapasite, hak, günlük limit ve kapatma kontrolleri veritabanında, satır kilitleriyle tek işlemde yapılıyor. Başlamış rezervasyon iptal edilemiyor. Ayar değişikliği mevcut rezervasyonları sessizce bozamıyor. Rezervasyonlar silinmiyor (denetlenebilirlik). |
| A05 Security Misconfiguration | Varsayılan yetkiler, ayrıntılı hata mesajları | Tüm fonksiyonların `execute` yetkisi önce kapatılıp sadece gerekenler açılıyor. Güvenlik başlıkları (`X-Frame-Options`, CSP `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`), `X-Powered-By` kapalı. Kullanıcıya sadece bilinen hata kodlarının Türkçe karşılığı gösteriliyor. |
| A06 Vulnerable Components | Eski bağımlılıklar | Next.js ve React sürümleri sabitlenmiş, kilit dosyası (`package-lock.json`) commitlenir. GitHub Dependabot önerilir; `npm audit` düzenli çalıştırılmalı. |
| A07 Identification & Authentication Failures | Zayıf şifre, hesap numaralandırma, kaba kuvvet | En az 8 karakter şifre (Supabase ayarında da aynı değer). E-posta kodla doğrulama. Giriş, kayıt ve şifre sıfırlama mesajları hesabın varlığını belli etmiyor. İki adımlı doğrulama (TOTP) ve middleware'de zorunlu ikinci adım. Hız sınırları Supabase Auth'ta. |
| A08 Software & Data Integrity | Değiştirilmiş paket, imzasız güncelleme | Kilit dosyası ve sabit sürümler; yeni sürümler yayınlandıktan birkaç hafta sonra alınmalı. |
| A09 Logging & Monitoring | İz bırakmayan admin işlemleri | Her admin işlemi `admin_audit_log` tablosuna (kim, ne, kime, ne zaman) yazılıyor. Beklenmeyen hatalar sunucu loguna. |
| A10 SSRF | Sunucunun dış adrese yönlendirilmesi | Sunucu kullanıcıdan gelen adreslere istek atmıyor; tek dış istek sabit Resend adresi. |

## Kurulumda yapılacak güvenlik ayarları

- Supabase → Authentication → Providers → Email: "Confirm email" açık, minimum şifre uzunluğu 8.
- Supabase → API Keys: yalnızca yeni publishable/secret anahtarlar kullanılır; legacy JWT anahtarları kapalı.
- Vercel: `SUPABASE_SERVICE_ROLE_KEY` ve `RESEND_API_KEY` Secret tipinde.
- GitHub: Settings → Code security → Dependabot alerts ve Secret scanning + push protection açık.
- Admin hesapları için iki adımlı doğrulama açılması önerilir.
