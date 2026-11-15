import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { organizerDashboardQuery } from "@/lib/queries";
import { requireOrganizer } from "@/lib/organizer-guard";
import { EventForm } from "@/components/forms/EventForm";
import { OrganizerFormLayout } from "@/components/forms/OrganizerFormLayout";
import { EmptyState } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/organizar/eventos/novo")({
  head: () => ({ meta: [{ title: "Criar evento — Mapa Cultural" }, { name: "description", content: "Publique um novo encontro no Mapa Cultural." }, { property: "og:title", content: "Criar evento — Mapa Cultural" }, { property: "og:description", content: "O próximo encontro começa aqui." }] }),
  loader: async ({ context }) => {
    await requireOrganizer(context.queryClient, context.user.id);
    await context.queryClient.ensureQueryData(organizerDashboardQuery(context.user.id));
  },
  component: NewEvent,
});

export function EventSide() {
  return (
    <>
      <p>Cadastre o local e os artistas antes de vinculá-los ao evento.</p>
      <p>Para eventos gratuitos, deixe o link de ingressos e o valor em branco.</p>
    </>
  );
}

function NewEvent() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(organizerDashboardQuery(user.id));
  const ready = data.venues.length > 0 && data.artists.length > 0;
  return (
    <OrganizerFormLayout title="Criar evento" subtitle="Preencha os dados do encontro. Campos com * são obrigatórios." sideTitle="O próximo encontro começa aqui." side={<EventSide />}>
      {ready ? (
        <EventForm userId={user.id} venues={data.venues} artists={data.artists} />
      ) : (
        <EmptyState
          title="Falta pouco"
          action={
            <div className="flex flex-wrap justify-center gap-4">
              {data.venues.length === 0 && <Button asChild><Link to="/organizar/locais/novo">+ Cadastrar local</Link></Button>}
              {data.artists.length === 0 && <Button asChild variant="outline"><Link to="/organizar/artistas/novo">+ Cadastrar artista</Link></Button>}
            </div>
          }
        >
          Para criar um evento, cadastre antes pelo menos um local e um artista.
        </EmptyState>
      )}
    </OrganizerFormLayout>
  );
}
