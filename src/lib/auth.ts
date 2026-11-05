import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

/** İstek başına bir kez çalışır (React cache). getUser() token'ı Supabase'e doğrulatır. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, is_admin, name_changed_at")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    email: data.email as string,
    isAdmin: Boolean(data.is_admin),
    nameChangedAt: (data.name_changed_at as string | null) ?? null,
  };
});

/**
 * Admin sayfaları ve action'ları için. Asıl yetki kontrolü veritabanındaki
 * assert_admin()'dedir; bu kontrol erken ret ve doğru hata mesajı içindir (derinlemesine savunma).
 */
export async function getAdminProfile(): Promise<Profile | null> {
  const profile = await getProfile();
  return profile?.isAdmin ? profile : null;
}
