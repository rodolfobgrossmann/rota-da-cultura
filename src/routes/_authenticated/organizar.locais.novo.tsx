import { createFileRoute } from "@tanstack/react-router";

import { requireOrganizer } from "@/lib/organizer-guard";
import { VenueForm } from "@/components/forms/VenueForm";
import { OrganizerFormLayout } from "@/components/forms/OrganizerFormLayout";

export const Route = createFileRoute("/_authenticated/organizar/locais/novo")({
  head: () => ({ meta: [{ title: "Cadastrar local — Mapa Cultural" }, { name: "description", content: "Adicione um espaço cultural ao mapa." }, { property: "og:title", content: "Cadastrar local — Mapa Cultural" }, { property: "og:description", content: "Dê um endereço à cultura." }] }),
  loader: ({ context }) => requireOrganizer(context.queryClient, context.user.id),
  component: NewVenue,
});

function NewVenue() {
  const { user } = Route.useRouteContext();
  return (
    <OrganizerFormLayout
      title="Cadastrar local"
      subtitle="Adicione um espaço cultural. Campos com * são obrigatórios."
      sideTitle="Dê um endereço à cultura."
      side={
        <>
          <p>As coordenadas posicionam o espaço no mapa cultural.</p>
          <p>Verifique se o endereço já está cadastrado antes de criar um novo local.</p>
        </>
      }
    >
      <VenueForm userId={user.id} />
    </OrganizerFormLayout>
  );
}
