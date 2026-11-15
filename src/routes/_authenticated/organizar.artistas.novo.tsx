import { createFileRoute } from "@tanstack/react-router";

import { requireOrganizer } from "@/lib/organizer-guard";
import { ArtistForm } from "@/components/forms/ArtistForm";
import { OrganizerFormLayout } from "@/components/forms/OrganizerFormLayout";

export const Route = createFileRoute("/_authenticated/organizar/artistas/novo")({
  head: () => ({ meta: [{ title: "Cadastrar artista — Mapa Cultural" }, { name: "description", content: "Conecte um artista à cena local." }, { property: "og:title", content: "Cadastrar artista — Mapa Cultural" }, { property: "og:description", content: "Toda expressão merece um palco." }] }),
  loader: ({ context }) => requireOrganizer(context.queryClient, context.user.id),
  component: NewArtist,
});

function NewArtist() {
  const { user } = Route.useRouteContext();
  return (
    <OrganizerFormLayout
      title="Cadastrar artista"
      subtitle="Conecte um artista à cena local. Campos com * são obrigatórios."
      sideTitle="Toda expressão merece um palco."
      side={
        <>
          <p>O perfil artístico será vinculado à conta informada.</p>
          <p>Depois de cadastrar, você poderá incluir o artista na programação dos seus eventos.</p>
        </>
      }
    >
      <ArtistForm userId={user.id} />
    </OrganizerFormLayout>
  );
}
