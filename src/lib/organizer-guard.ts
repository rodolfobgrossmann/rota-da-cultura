import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { meQuery } from "@/lib/queries";

/** Organizer-only pages send people without the organizer profile to the activation page. */
export async function requireOrganizer(queryClient: QueryClient, userId: string) {
  const me = await queryClient.ensureQueryData(meQuery(userId));
  if (!me.isOrganizer) throw redirect({ to: "/organizar" });
}
