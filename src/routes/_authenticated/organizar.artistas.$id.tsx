import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ownArtistQuery } from "@/lib/queries";
import { requireOrganizer } from "@/lib/organizer-guard";
import { ArtistForm } from "@/components/forms/ArtistForm";
import { OrganizerFormLayout } from "@/components/forms/OrganizerFormLayout";
import { EmptyState, PageContainer } from "@/components/site/ui";

export const Route = createFileRoute("/_authenticated/organizar/artistas/$id")({
  head: () => ({ meta: [{ title: "Editar artista — Mapa Cultural" }, { name: "description", content: "Atualize o perfil do artista." }, { property: "og:title", content: "Editar artista — Mapa Cultural" }, { property: "og:description", content: "Atualize o perfil do artista." }] }),
  loader: async ({ context, params }) => {
    await requireOrganizer(context.queryClient, context.user.id);
    const artist = await context.queryClient.ensureQueryData(ownArtistQuery(context.user.id, params.id));
    if (!artist) throw notFound();
  },
  component: EditArtist,
  notFoundComponent: () => (
    <PageContainer>
      <EmptyState title="Artista não encontrado">Só é possível editar artistas cadastrados por você.</EmptyState>
    </PageContainer>
  ),
});

function EditArtist() {
  const { user } = Route.useRouteContext();
  const { id } = Route.useParams();
  const { data: artist } = useSuspenseQuery(ownArtistQuery(user.id, id));
  if (!artist) return null;
  return (
    <OrganizerFormLayout
      title="Editar artista"
      subtitle="Atualize o perfil artístico. Campos com * são obrigatórios."
      sideTitle="Toda expressão merece um palco."
      side={<p>O perfil artístico fica vinculado à conta informada.</p>}
    >
      <ArtistForm key={artist.id} userId={user.id} artist={artist} />
    </OrganizerFormLayout>
  );
}
