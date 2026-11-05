import "server-only";
import { escapeHtml } from "@/lib/escape";
import { dateLong, sessionRange } from "@/lib/time";

// Tüm kullanıcı kaynaklı metinler escapeHtml'den geçer (OWASP A03).
function layout(title: string, body: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #C5DFE8;border-radius:12px;overflow:hidden">
    <div style="background:#0E3B5C;padding:20px 28px">
      <h2 style="color:#ffffff;margin:0;font-size:18px">${escapeHtml(title)}</h2>
      <p style="color:#CFE6EE;margin:4px 0 0;font-size:13px">GTÜ Havuz</p>
    </div>
    <div style="padding:24px 28px;color:#0E3B5C;font-size:15px;line-height:1.6">${body}</div>
  </div>`;
}

export function bookingCancelledEmail(input: {
  name: string;
  date: string;
  time: string;
  lane: number;
  reason: string;
}): { subject: string; html: string } {
  const when = `${dateLong(input.date)}, ${sessionRange(input.time)}, Kulvar ${input.lane}`;
  return {
    subject: "Havuz rezervasyonun iptal edildi",
    html: layout(
      "Rezervasyonun iptal edildi",
      `<p>Merhaba ${escapeHtml(input.name)},</p>
       <p><strong>${escapeHtml(when)}</strong> rezervasyonun yönetim tarafından iptal edildi.</p>
       <p>Sebep: ${escapeHtml(input.reason)}</p>
       <p>Bu rezervasyon için kullandığın hak iade edildi.</p>`
    ),
  };
}

export function warningEmail(input: { name: string; subject: string; message: string }) {
  return {
    subject: input.subject,
    html: layout(
      input.subject,
      `<p>Merhaba ${escapeHtml(input.name)},</p>
       <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`
    ),
  };
}

export function feedbackEmail(input: { senderName: string; senderEmail: string; message: string }) {
  return {
    subject: "Yeni geri bildirim — GTÜ Havuz",
    html: layout(
      "Yeni geri bildirim",
      `<p style="color:#5B7A8C;font-size:13px">Gönderen: ${escapeHtml(input.senderName)} (${escapeHtml(input.senderEmail)})</p>
       <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`
    ),
  };
}
