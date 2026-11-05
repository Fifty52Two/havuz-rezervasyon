import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Veritabanı fonksiyonunun fırlattığı hata kodunu taşır (ör. "lane_full"). */
export class RpcError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "RpcError";
  }
}

export async function callRpc<T>(
  client: SupabaseClient,
  fn: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    // Kod dışı (beklenmeyen) hatalar sunucu loguna yazılır, kullanıcıya genel mesaj gider.
    if (!/^[a-z_]+$/.test(error.message)) console.error(`RPC ${fn} hata:`, error.message);
    throw new RpcError(error.message);
  }
  return data as T;
}

export function errorCode(err: unknown): string {
  return err instanceof RpcError ? err.code : "unknown";
}
