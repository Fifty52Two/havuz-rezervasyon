import { z } from "zod";

// Tüm action girdileri sunucuda doğrulanır; istemci doğrulaması sadece kullanıcı kolaylığıdır.
export const uuidSchema = z.string().uuid();
export const laneSchema = z.number().int().min(1).max(10);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const reasonSchema = z.string().trim().min(2).max(200);
export const nameSchema = z.string().trim().min(2).max(60);
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
// Bcrypt 72 bayttan sonrasını yok sayar; üst sınır bu yüzden 72.
export const passwordSchema = z.string().min(8).max(72);
export const otpSchema = z.string().regex(/^\d{6,8}$/);
export const messageSchema = z.string().trim().min(1).max(2000);
export const subjectSchema = z.string().trim().min(2).max(120);

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):00$/, "Saat tam saat olmalı");

export const settingsSchema = z
  .object({
    laneCount: z.number().int().min(1).max(10),
    laneCapacity: z.number().int().min(1).max(50),
    weekdayStart: timeSchema,
    weekdayEnd: timeSchema,
    weekendStart: timeSchema,
    weekendEnd: timeSchema,
    monthlyCredits: z.number().int().min(0).max(100),
    bookingWindowDays: z.number().int().min(1).max(28),
    dailyLimit: z.number().int().min(0).max(10),
    minCancelHours: z.number().int().min(0).max(72),
  })
  .refine((s) => s.weekdayStart < s.weekdayEnd && s.weekendStart < s.weekendEnd, {
    message: "invalid_hours",
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
