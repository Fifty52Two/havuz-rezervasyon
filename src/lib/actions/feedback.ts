"use server";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitFeedback } from "@/lib/data/member";
import { errorCode } from "@/lib/data/rpc";
import { feedbackEmail } from "@/lib/email/templates";
import { feedbackRecipients, getMailer } from "@/lib/email/mailer";
import { messageFor } from "@/lib/errors";
import { messageSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

export async function sendFeedback(input: { message: string }): Promise<ActionResult> {
  const message = messageSchema.safeParse(input.message);
  if (!message.success) return { ok: false, error: messageFor("invalid_message") };

  const profile = await getProfile();
  if (!profile) return { ok: false, error: messageFor("not_authenticated") };

  try {
    // Kaydet + hız sınırı veritabanında (saatte 3 mesaj).
    const supabase = await createClient();
    await submitFeedback(supabase, message.data);
  } catch (err) {
    return { ok: false, error: messageFor(errorCode(err)) };
  }

  const recipients = feedbackRecipients();
  if (recipients.length > 0) {
    const mail = feedbackEmail({ senderName: profile.name, senderEmail: profile.email, message: message.data });
    await getMailer().send({ to: recipients, ...mail, replyTo: profile.email });
  }
  return { ok: true, message: "Mesajın iletildi, teşekkürler." };
}
