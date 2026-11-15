import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ownVenueQuery } from "@/lib/queries";
import { requireOrganizer } from "@/lib/organizer-guard";
import { VenueForm } from "@/components/forms/VenueForm";
import { OrganizerFormLayout } from "@/components/forms/OrganizerFormLayout";
import { EmptyState, PageContainer } from "@/components/site/ui";

export const Route = createFileRoute("/_authenticated/organizar/locais/$id")({
  head: () => ({ meta: [{ title: "Editar local — Mapa Cultural" }, { name: "description", content: "Atualize os dados do seu espaço cultural." }, { property: "og:title", content: "Editar local — Mapa Cultural" }, { property: "og:description", content: "Atualize os dados do seu espaço cultural." }] }),
  loader: async ({ context, params }) => {
    await requireOrganizer(context.queryClient, context.user.id);
    const venue = await context.queryClient.ensureQueryData(ownVenueQuery(context.user.id, params.id));
    if (!venue) throw notFound();
  },
  component: EditVenue,
  notFoundComponent: () => (
    <PageContainer>
      <EmptyState title="Local não encontrado">Só é possível editar locais cadastrados por você.</EmptyState>
    </PageContainer>
  ),
});

function EditVenue() {
  const { user } = Route.useRouteContext();
  const { id } = Route.useParams();
  const { data: venue } = useSuspenseQuery(ownVenueQuery(user.id, id));
  if (!venue) return null;
  return (
    <OrganizerFormLayout
      title="Editar local"
      subtitle="Atualize os dados do espaço. Campos com * são obrigatórios."
      sideTitle="Dê um endereço à cultura."
      side={<p>As coordenadas posicionam o espaço no mapa cultural.</p>}
    >
      <VenueForm key={venue.id} userId={user.id} venue={venue} />
    </OrganizerFormLayout>
  );
}
