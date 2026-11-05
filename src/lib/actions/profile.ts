"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMyName } from "@/lib/data/member";
import { errorCode } from "@/lib/data/rpc";
import { messageFor } from "@/lib/errors";
import { nameSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

export async function changeName(input: { name: string }): Promise<ActionResult> {
  const name = nameSchema.safeParse(input.name);
  if (!name.success) return { ok: false, error: messageFor("invalid_name") };
  try {
    const supabase = await createClient();
    await updateMyName(supabase, name.data);
    revalidatePath("/", "layout");
    return { ok: true, message: "İsmin güncellendi." };
  } catch (err) {
    return { ok: false, error: messageFor(errorCode(err)) };
  }
}
