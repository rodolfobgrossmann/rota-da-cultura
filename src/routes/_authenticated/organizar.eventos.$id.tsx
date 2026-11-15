import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { organizerDashboardQuery, ownEventQuery } from "@/lib/queries";
import { requireOrganizer } from "@/lib/organizer-guard";
import { EventForm } from "@/components/forms/EventForm";
import { OrganizerFormLayout } from "@/components/forms/OrganizerFormLayout";
import { EmptyState, PageContainer } from "@/components/site/ui";

export const Route = createFileRoute("/_authenticated/organizar/eventos/$id")({
  head: () => ({ meta: [{ title: "Editar evento — Mapa Cultural" }, { name: "description", content: "Atualize os dados do seu evento." }, { property: "og:title", content: "Editar evento — Mapa Cultural" }, { property: "og:description", content: "Atualize os dados do seu evento." }] }),
  loader: async ({ context, params }) => {
    await requireOrganizer(context.queryClient, context.user.id);
    const [event] = await Promise.all([
      context.queryClient.ensureQueryData(ownEventQuery(context.user.id, params.id)),
      context.queryClient.ensureQueryData(organizerDashboardQuery(context.user.id)),
    ]);
    if (!event) throw notFound();
  },
  component: EditEvent,
  notFoundComponent: () => (
    <PageContainer>
      <EmptyState title="Evento não encontrado">Só é possível editar eventos cadastrados por você.</EmptyState>
    </PageContainer>
  ),
});

function EditEvent() {
  const { user } = Route.useRouteContext();
  const { id } = Route.useParams();
  const { data: event } = useSuspenseQuery(ownEventQuery(user.id, id));
  const { data } = useSuspenseQuery(organizerDashboardQuery(user.id));
  if (!event) return null;
  return (
    <OrganizerFormLayout
      title="Editar evento"
      subtitle="Atualize os dados do encontro. Campos com * são obrigatórios."
      sideTitle="O próximo encontro começa aqui."
      side={
        <>
          <p>Cadastre o local e os artistas antes de vinculá-los ao evento.</p>
          <p>Para eventos gratuitos, deixe o link de ingressos e o valor em branco.</p>
        </>
      }
    >
      <EventForm key={event.id} userId={user.id} venues={data.venues} artists={data.artists} event={event} />
    </OrganizerFormLayout>
  );
}
