import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";

import { artistsQuery, followedArtistIdsQuery } from "@/lib/queries";
import { useToggleRelation } from "@/lib/actions";
import { useUserId } from "@/lib/session";
import { CultureCard } from "@/components/site/CultureCard";
import { EmptyState, PageContainer, PageHeading } from "@/components/site/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artistas/")({
  validateSearch: zodValidator(z.object({ tipo: z.string().optional() })),
  head: () => ({
    meta: [
      { title: "Artistas — Mapa Cultural" },
      { name: "description", content: "Conheça os artistas da cena local, siga quem inspira e veja os próximos encontros." },
      { property: "og:title", content: "Artistas — Mapa Cultural" },
      { property: "og:description", content: "Quem faz a cena da cidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery()).then(() => undefined),
  component: ArtistsPage,
  errorComponent: ({ error }) => (
    <PageContainer>
      <EmptyState title="Não conseguimos carregar os artistas">{error.message}</EmptyState>
    </PageContainer>
  ),
});

function ArtistsPage() {
  const { tipo } = Route.useSearch();
  const navigate = useNavigate({ from: "/artistas/" });
  const { data: artists } = useSuspenseQuery(artistsQuery());
  const userId = useUserId();
  const { data: followed = [] } = useQuery({ ...followedArtistIdsQuery(userId ?? "none"), enabled: !!userId });
  const follow = useToggleRelation("artist");
  const types = Array.from(new Set(artists.map((a) => a.art_type))).sort();
  const shown = tipo ? artists.filter((a) => a.art_type === tipo) : artists;

  return (
    <PageContainer>
      <PageHeading eyebrow="Artistas da cidade" title="Quem faz a cena" subtitle="Siga artistas para acompanhar os próximos encontros com eles." />
      <div className="mt-8 flex flex-wrap gap-2">
        {[undefined, ...types].map((t) => (
          <button
            key={t ?? "all"}
            type="button"
            onClick={() => navigate({ search: { tipo: t }, replace: true })}
            className={cn("rounded-xl px-5 py-2.5 font-display text-sm font-bold transition-colors", tipo === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}
          >
            {t ?? "Todos"}
          </button>
        ))}
      </div>
      <p className="mt-8 text-lg text-muted-foreground">{shown.length} {shown.length === 1 ? "artista" : "artistas"}</p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a, i) => (
          <CultureCard
            key={a.id}
            kind="artist"
            id={a.id}
            index={i}
            name={a.name}
            label="Artista local"
            subtitle={a.tagline ?? `${a.art_type} · ${a.subgenre}`}
            nextEvent={a.next_event}
            following={followed.includes(a.id)}
            pending={follow.pendingId === a.id}
            onToggle={() => follow.toggle(a.id, followed.includes(a.id))}
          />
        ))}
      </div>
    </PageContainer>
  );
}
