/**
 * Veritabanı fonksiyonlarının fırlattığı hata kodlarının Türkçe karşılıkları.
 * Bilinmeyen hatalar kullanıcıya genel bir mesajla gösterilir; ayrıntı sızdırılmaz (OWASP A05).
 */
const MESSAGES: Record<string, string> = {
  not_authenticated: "Oturumun sona ermiş, tekrar giriş yap.",
  forbidden: "Bu işlem için yetkin yok.",
  profile_not_found: "Profil bulunamadı.",
  session_not_found: "Bu seans artık mevcut değil, sayfayı yenile.",
  session_started: "Bu seans başladı ya da geçti.",
  not_open_yet: "Bu seans için rezervasyon henüz açılmadı.",
  invalid_lane: "Geçersiz kulvar.",
  session_closed: "Bu seans ya da kulvar kapatılmış.",
  already_booked: "Bu seansta zaten yerin var.",
  daily_limit_reached: "Bugün için rezervasyon hakkını kullandın.",
  membership_required: "Bu ay için üyeliğin yok. Rezervasyon için yönetimle görüş.",
  no_credits_left: "Bu ayki rezervasyon hakların bitti.",
  lane_full: "Bu kulvar doldu, başka bir kulvar seç.",
  booking_not_found: "Rezervasyon bulunamadı ya da zaten iptal edilmiş.",
  cancel_too_late: "İptal süresi geçti.",
  invalid_name: "İsim 2–60 karakter olmalı.",
  name_change_too_soon: "İsmini 30 günde bir değiştirebilirsin.",
  invalid_message: "Mesaj 1–2000 karakter olmalı.",
  rate_limited: "Çok sık mesaj gönderdin, biraz sonra tekrar dene.",
  member_not_found: "Üye bulunamadı.",
  membership_not_found: "Bu ay için üyelik kaydı yok.",
  invalid_credits: "Hak sayısı 0–100 arasında olmalı.",
  credits_below_used: "Hak sayısı, o ay kullanılmış haktan az olamaz.",
  month_has_bookings: "Bu ayda aktif rezervasyonu olan üyeliği silemezsin; önce rezervasyonları iptal et.",
  cannot_demote_self: "Kendi admin yetkini kaldıramazsın.",
  cannot_delete_self: "Kendi hesabını buradan silemezsin.",
  invalid_reason: "Sebep 2–200 karakter olmalı.",
  already_closed: "Seansın tamamı zaten kapalı.",
  times_must_be_on_the_hour: "Saatler tam saat olmalı (ör. 17:00).",
  invalid_hours: "Başlangıç saati bitişten önce olmalı.",
  lane_has_future_bookings: "Kaldırılacak kulvarda ileri tarihli rezervasyonlar var; önce onları iptal et.",
  capacity_below_bookings: "Bazı kulvarlarda yeni kapasiteden fazla rezervasyon var; önce onları iptal et.",
  invalid_input: "Girilen bilgiler geçersiz.",
};

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene.";

export function messageFor(code: string | null | undefined): string {
  if (!code) return GENERIC;
  return MESSAGES[code] ?? GENERIC;
}
