import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { artistQuery, followedArtistIdsQuery } from "@/lib/queries";
import { dayMonth, firstName, hourLabel } from "@/lib/format";
import { useToggleRelation } from "@/lib/actions";
import { useUserId } from "@/lib/session";
import { EmptyState, EventRow, PageContainer, Poster } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/artistas/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(artistQuery(params.id));
    if (!data) throw notFound();
    return { name: data.artist.name, tagline: data.artist.tagline ?? `${data.artist.art_type} · ${data.artist.subgenre}` };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Mapa Cultural` },
          { name: "description", content: `${loaderData.name}: ${loaderData.tagline}. Veja os próximos eventos e siga no Mapa Cultural.` },
          { property: "og:title", content: `${loaderData.name} — Mapa Cultural` },
          { property: "og:description", content: loaderData.tagline },
          { property: "og:type", content: "profile" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Artista indisponível — Mapa Cultural" }, { name: "robots", content: "noindex" }],
  }),
  component: ArtistPage,
  notFoundComponent: () => (
    <PageContainer>
      <EmptyState title="Artista não encontrado" action={<Button asChild><Link to="/artistas">Ver artistas</Link></Button>} />
    </PageContainer>
  ),
  errorComponent: ({ error }) => (
    <PageContainer>
      <EmptyState title="Não conseguimos carregar este perfil">{error instanceof Error ? error.message : "Tente novamente em instantes."}</EmptyState>
    </PageContainer>
  ),
});

function ArtistPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(artistQuery(id));
  const userId = useUserId();
  const { data: followed = [] } = useQuery({ ...followedArtistIdsQuery(userId ?? "none"), enabled: !!userId });
  const follow = useToggleRelation("artist");
  if (!data) return null;
  const { artist, events } = data;
  const following = followed.includes(artist.id);
  const isMusic = artist.art_type === "Música";

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-[1.9fr_1fr] lg:gap-14">
        <div className="animate-rise">
          <span className="pill-tag pr-16">Artista &nbsp;/&nbsp; {artist.art_type}</span>
          <h1 className="mt-8 text-6xl font-bold leading-none md:text-[6.5rem]">{artist.name}</h1>
          <p className="mt-6 text-xl text-muted-foreground md:text-2xl">
            {artist.tagline ?? `${artist.art_type} · ${artist.subgenre}`}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
            <Button
              size="lg"
              variant={following ? "outline" : "default"}
              className="sm:w-64"
              onClick={() => follow.toggle(artist.id, following)}
              disabled={follow.isPending}
            >
              {following ? "Seguindo ✓" : "+ Seguir artista"}
            </Button>
            <p className="text-muted-foreground">
              {following ? "Para deixar de seguir, clique em “Seguindo”." : "Receba as novidades na sua lista de artistas seguidos."}
            </p>
          </div>

          {artist.about && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold md:text-[1.75rem]">Sobre {artist.name}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{artist.about}</p>
            </section>
          )}

          <section className="mt-16">
            <h2 className="text-3xl font-bold md:text-[2.4rem]">Próximos eventos</h2>
            <p className="mt-2 text-muted-foreground">
              {events.length === 0
                ? "Nenhum encontro marcado por enquanto"
                : `${events.length} ${events.length === 1 ? "encontro" : "encontros"} para colocar na agenda`}
            </p>
            <div className="mt-6 space-y-4">
              {events.map((e) => (
                <EventRow
                  key={e.id}
                  id={e.id}
                  iso={e.starts_at}
                  title={e.name}
                  meta={`${dayMonth(e.starts_at)} · ${hourLabel(e.starts_at)}  /  ${e.venue.name} · ${e.venue.neighborhood}`}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <Poster
            className="min-h-[360px] animate-rise [animation-delay:80ms] md:min-h-[440px] [--poster-size:78%] [--poster-top:-18%] [--poster-right:-26%]"
            title={<span className="block max-w-[7ch]">{artist.name}</span>}
            titleClassName="text-5xl md:text-6xl"
            footer={<span className="text-lg">{artist.subgenre} &nbsp;/&nbsp; {artist.art_type}</span>}
          />
          <section className="rounded-3xl bg-tint p-8 md:p-10">
            <h2 className="text-2xl font-bold text-link md:text-[1.75rem]">
              {isMusic ? "O som de" : "A arte de"} {firstName(artist.name)}
            </h2>
            <dl className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <dt className="text-muted-foreground">Tipo de arte</dt>
                <dd className="mt-2 font-display text-xl font-bold">{artist.art_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Subgênero</dt>
                <dd className="mt-2 font-display text-xl font-bold">{artist.subgenre}</dd>
              </div>
            </dl>
            <p className="mt-10 text-link">Veja os eventos e acompanhe {isMusic ? "o som" : "o trabalho"}.</p>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
