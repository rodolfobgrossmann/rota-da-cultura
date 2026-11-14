import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { artistsQuery, followedArtistIdsQuery } from "@/lib/queries";
import { useToggleRelation } from "@/lib/actions";
import { AgendaTabs } from "@/components/site/AgendaTabs";
import { CultureCard } from "@/components/site/CultureCard";
import { EmptyState, PageContainer, PageHeading } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/agenda/artistas")({
  head: () => ({
    meta: [
      { title: "Artistas seguidos — Mapa Cultural" },
      { name: "description", content: "Seus artistas favoritos e os próximos encontros com eles." },
      { property: "og:title", content: "Artistas seguidos — Mapa Cultural" },
      { property: "og:description", content: "Quem faz o seu ritmo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery()),
      context.queryClient.ensureQueryData(followedArtistIdsQuery(context.user.id)),
    ]);
  },
  component: FollowedArtists,
});

function FollowedArtists() {
  const { user } = Route.useRouteContext();
  const { data: artists } = useSuspenseQuery(artistsQuery());
  const { data: ids } = useSuspenseQuery(followedArtistIdsQuery(user.id));
  const follow = useToggleRelation("artist");
  const list = artists.filter((a) => ids.includes(a.id));

  return (
    <PageContainer>
      <PageHeading eyebrow="Sua conexão com a cidade" title="Quem faz o seu ritmo" subtitle="Seus artistas favoritos e os próximos encontros com eles." />
      <AgendaTabs />
      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="text-lg text-muted-foreground">
          {list.length} {list.length === 1 ? "artista seguido" : "artistas seguidos"}
        </p>
        <Button asChild variant="outline" className="sm:w-72">
          <Link to="/artistas">Descobrir artistas <ArrowUpRight strokeWidth={2.5} /></Link>
        </Button>
      </div>
      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Você ainda não segue nenhum artista">Descubra quem faz a cena da cidade e siga para acompanhar as datas.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a, i) => (
              <CultureCard
                key={a.id}
                kind="artist"
                id={a.id}
                index={i}
                name={a.name}
                label="Artista local"
                subtitle={a.tagline ?? `${a.art_type} · ${a.subgenre}`}
                nextEvent={a.next_event}
                following
                pending={follow.pendingId === a.id}
                onToggle={() => follow.toggle(a.id, true)}
              />
            ))}
          </div>
          <p className="mt-10 text-muted-foreground">Para deixar de seguir, use “Seguindo” no cartão do artista.</p>
        </>
      )}
    </PageContainer>
  );
}
