import "server-only";

export interface MailMessage {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/** E-posta gönderim soyutlaması (bağımlılığın tersine çevrilmesi: action'lar Resend'e bağlı değil). */
export interface Mailer {
  send(message: MailMessage): Promise<boolean>;
}

class ResendMailer implements Mailer {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: MailMessage): Promise<boolean> {
    if (message.to.length === 0) return false;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      if (!res.ok) console.error("Resend gönderimi başarısız:", res.status);
      return res.ok;
    } catch (err) {
      console.error("Resend isteği hata verdi:", err);
      return false;
    }
  }
}

/** Anahtar tanımlı değilse (yerel geliştirme) e-posta göndermez, sadece loglar. */
class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<boolean> {
    console.info(`[e-posta gönderilmedi] ${message.subject} → ${message.to.length} alıcı`);
    return true;
  }
}

export function getMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  return key && from ? new ResendMailer(key, from) : new ConsoleMailer();
}

export function feedbackRecipients(): string[] {
  return (process.env.FEEDBACK_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
