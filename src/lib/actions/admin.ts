"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as adminData from "@/lib/data/admin";
import { errorCode } from "@/lib/data/rpc";
import { bookingCancelledEmail, warningEmail } from "@/lib/email/templates";
import { getMailer } from "@/lib/email/mailer";
import { messageFor } from "@/lib/errors";
import { monthLabel } from "@/lib/time";
import {
  dateSchema,
  laneSchema,
  messageSchema,
  reasonSchema,
  settingsSchema,
  subjectSchema,
  uuidSchema,
  type SettingsInput,
} from "@/lib/validation";
import type { ActionResult, CancelledBooking } from "@/types";

/**
 * Her admin action'ı: (1) oturumdaki kullanıcının admin olduğunu doğrular,
 * (2) girdiyi doğrular, (3) veritabanı fonksiyonunu kullanıcının oturumuyla çağırır.
 * Veritabanı da assert_admin() ile ayrıca kontrol eder (derinlemesine savunma).
 */
async function withAdmin(
  run: (client: Awaited<ReturnType<typeof createClient>>) => Promise<ActionResult>
): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: messageFor("forbidden") };
  try {
    const client = await createClient();
    const result = await run(client);
    revalidatePath("/admin");
    revalidatePath("/");
    return result;
  } catch (err) {
    return { ok: false, error: messageFor(errorCode(err)) };
  }
}

const invalid = (): ActionResult => ({ ok: false, error: messageFor("invalid_input") });

async function notifyCancelled(list: CancelledBooking[], reason: string): Promise<number> {
  const mailer = getMailer();
  const results = await Promise.allSettled(
    list.map((b) =>
      mailer.send({
        to: [b.email],
        ...bookingCancelledEmail({ name: b.name, date: b.date, time: b.time, lane: b.lane, reason }),
      })
    )
  );
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}

function cancelledMessage(count: number, mailed: number): string {
  if (count === 0) return "Kapatıldı. Etkilenen rezervasyon yoktu.";
  return `${count} rezervasyon iptal edildi, ${mailed} üyeye e-posta gönderildi.`;
}

// ---------- Üyeler ----------

export async function addMembershipMonth(input: { userId: string }): Promise<ActionResult> {
  const userId = uuidSchema.safeParse(input.userId);
  if (!userId.success) return invalid();
  return withAdmin(async (client) => {
    const added = await adminData.addMonth(client, userId.data);
    return { ok: true, message: `${monthLabel(added.month)} üyeliği ${added.credits} hakla eklendi.` };
  });
}

export async function setMembershipCredits(input: { userId: string; month: string; credits: number }): Promise<ActionResult> {
  const parsed = z
    .object({ userId: uuidSchema, month: dateSchema, credits: z.number().int().min(0).max(100) })
    .safeParse(input);
  if (!parsed.success) return invalid();
  return withAdmin(async (client) => {
    await adminData.setMonthCredits(client, parsed.data.userId, parsed.data.month, parsed.data.credits);
    return { ok: true, message: "Hak sayısı güncellendi." };
  });
}

export async function removeMembershipMonth(input: { userId: string; month: string }): Promise<ActionResult> {
  const parsed = z.object({ userId: uuidSchema, month: dateSchema }).safeParse(input);
  if (!parsed.success) return invalid();
  return withAdmin(async (client) => {
    await adminData.removeMonth(client, parsed.data.userId, parsed.data.month);
    return { ok: true, message: `${monthLabel(parsed.data.month)} üyeliği silindi.` };
  });
}

export async function setMemberAdmin(input: { userId: string; isAdmin: boolean }): Promise<ActionResult> {
  const parsed = z.object({ userId: uuidSchema, isAdmin: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid();
  return withAdmin(async (client) => {
    await adminData.setAdmin(client, parsed.data.userId, parsed.data.isAdmin);
    return { ok: true, message: parsed.data.isAdmin ? "Admin yapıldı." : "Admin yetkisi kaldırıldı." };
  });
}

export async function deleteMember(input: { userId: string }): Promise<ActionResult> {
  const userId = uuidSchema.safeParse(input.userId);
  if (!userId.success) return invalid();
  return withAdmin(async (client) => {
    // Yetki + kendini silme kontrolü + log veritabanında; silme işlemi secret key ile.
    await adminData.prepareDelete(client, userId.data);
    const { error } = await createAdminClient().auth.admin.deleteUser(userId.data);
    if (error) {
      console.error("Kullanıcı silinemedi:", error.message);
      return { ok: false, error: "Üye silinemedi. Lütfen tekrar dene." };
    }
    return { ok: true, message: "Üye silindi." };
  });
}

export async function sendWarning(input: { userId: string; subject: string; message: string }): Promise<ActionResult> {
  const parsed = z
    .object({ userId: uuidSchema, subject: subjectSchema, message: messageSchema })
    .safeParse(input);
  if (!parsed.success) return invalid();
  return withAdmin(async (client) => {
    const member = await adminData.fetchMember(client, parsed.data.userId);
    if (!member) return { ok: false, error: messageFor("member_not_found") };
    const mail = warningEmail({ name: member.name, subject: parsed.data.subject, message: parsed.data.message });
    const sent = await getMailer().send({ to: [member.email], ...mail });
    return sent ? { ok: true, message: "E-posta gönderildi." } : { ok: false, error: "E-posta gönderilemedi." };
  });
}

// ---------- Seanslar ----------

export async function closeSessionOrLane(input: {
  sessionId: string;
  lane: number | null;
  reason: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({ sessionId: uuidSchema, lane: laneSchema.nullable(), reason: reasonSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: messageFor("invalid_reason") };
  return withAdmin(async (client) => {
    const cancelled = await adminData.closeSession(client, parsed.data.sessionId, parsed.data.lane, parsed.data.reason);
    const mailed = await notifyCancelled(cancelled, parsed.data.reason);
    return { ok: true, message: cancelledMessage(cancelled.length, mailed) };
  });
}

export async function closeWholeDay(input: { date: string; reason: string }): Promise<ActionResult> {
  const parsed = z.object({ date: dateSchema, reason: reasonSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: messageFor("invalid_reason") };
  return withAdmin(async (client) => {
    const cancelled = await adminData.closeDay(client, parsed.data.date, parsed.data.reason);
    const mailed = await notifyCancelled(cancelled, parsed.data.reason);
    return { ok: true, message: cancelledMessage(cancelled.length, mailed) };
  });
}

export async function reopenSessionOrLane(input: { sessionId: string; lane: number | null }): Promise<ActionResult> {
  const parsed = z.object({ sessionId: uuidSchema, lane: laneSchema.nullable() }).safeParse(input);
  if (!parsed.success) return invalid();
  return withAdmin(async (client) => {
    await adminData.reopen(client, parsed.data.sessionId, parsed.data.lane);
    return { ok: true, message: "Tekrar açıldı." };
  });
}

export async function adminCancelBooking(input: { bookingId: string; reason: string }): Promise<ActionResult> {
  const parsed = z.object({ bookingId: uuidSchema, reason: reasonSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: messageFor("invalid_reason") };
  return withAdmin(async (client) => {
    const cancelled = await adminData.cancelBooking(client, parsed.data.bookingId, parsed.data.reason);
    const mailed = await notifyCancelled(cancelled, parsed.data.reason);
    return { ok: true, message: mailed > 0 ? "İptal edildi, üyeye e-posta gönderildi." : "İptal edildi." };
  });
}

// ---------- Ayarlar ----------

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const hours = parsed.error.issues.some((i) => i.message === "invalid_hours");
    return { ok: false, error: `Ayarlar kaydedilmedi: ${messageFor(hours ? "invalid_hours" : "invalid_input")}` };
  }
  const result = await withAdmin(async (client) => {
    const updatedMonths = await adminData.updateSettings(client, parsed.data);
    const credits =
      updatedMonths > 0
        ? ` ${updatedMonths} üyelik ayının hakkı ${parsed.data.monthlyCredits} olarak güncellendi.`
        : "";
    return { ok: true, message: `Ayarlar kaydedildi.${credits}` };
  });
  // Hata durumunda hiçbir ayarın kaydedilmediğini açıkça söyle.
  return result.ok ? result : { ok: false, error: `Ayarlar kaydedilmedi: ${result.error}` };
}
