import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/lib/session";

type Kind = "artist" | "venue" | "attendance";

const TABLE = {
  artist: { table: "artist_follows", column: "artist_id" },
  venue: { table: "venue_follows", column: "venue_id" },
  attendance: { table: "attendances", column: "event_id" },
} as const;

const MESSAGES: Record<Kind, { on: string; off: string }> = {
  artist: { on: "Agora você segue este artista.", off: "Você deixou de seguir este artista." },
  venue: { on: "Agora você segue este local.", off: "Você deixou de seguir este local." },
  attendance: { on: "Presença confirmada.", off: "Presença removida." },
};

/** Follow / unfollow and confirm / remove attendance. Sends signed-out visitors to sign in. */
export function useToggleRelation(kind: Kind) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const mutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!userId) throw new Error("not-signed-in");
      const { table, column } = TABLE[kind];
      if (active) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", userId)
          .eq(column, id);
        if (error) throw error;
      } else {
        const row = { user_id: userId, [column]: id } as never;
        const { error } = await supabase.from(table).insert(row);
        if (error && error.code !== "23505") throw error;
      }
      return !active;
    },
    onSuccess: (nowActive) => {
      toast.success(nowActive ? MESSAGES[kind].on : MESSAGES[kind].off);
      queryClient.invalidateQueries({ queryKey: ["follows"] });
    },
    onError: () => toast.error("Não foi possível concluir agora. Tente novamente."),
  });

  return {
    isPending: mutation.isPending,
    pendingId: mutation.isPending ? mutation.variables?.id : undefined,
    toggle: (id: string, active: boolean) => {
      if (!userId) {
        navigate({ to: "/auth", search: { redirect: location.href } });
        return;
      }
      mutation.mutate({ id, active });
    },
  };
}
