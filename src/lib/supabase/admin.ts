import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Secret key ile çalışan istemci: RLS'i atlar. YALNIZCA auth kullanıcısını silmek için
 * kullanılır; başka her şey kullanıcının oturumuyla RPC üzerinden yapılır (en az yetki).
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
