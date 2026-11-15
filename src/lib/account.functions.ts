import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deletes the signed-in user's account and everything tied to it. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = ["artist_follows", "venue_follows", "attendances"] as const;
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) throw new Error("Não foi possível remover seus vínculos.");
    }
    // Content the person organized goes with the account.
    await supabaseAdmin.from("events").delete().eq("organizer_id", userId);
    await supabaseAdmin.from("artists").delete().eq("organizer_id", userId);
    await supabaseAdmin.from("venues").delete().eq("organizer_id", userId);
    // Artist profiles created by other organizers stay, but lose the link to this account.
    await supabaseAdmin.from("artists").update({ user_id: null }).eq("user_id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Não foi possível excluir a conta.");
    return { ok: true };
  });
