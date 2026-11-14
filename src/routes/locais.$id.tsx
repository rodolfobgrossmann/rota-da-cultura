import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { followedVenueIdsQuery, venueQuery } from "@/lib/queries";
import { dayMonth, hourLabel } from "@/lib/format";
import { useToggleRelation } from "@/lib/actions";
import { useUserId } from "@/lib/session";
import { EmptyState, EventRow, PageContainer, Poster } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/locais/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(venueQuery(params.id));
    if (!data) throw notFound();
    return { name: data.venue.name, tagline: data.venue.tagline ?? `${data.venue.street} · ${data.venue.neighborhood}` };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Mapa Cultural` },
          { name: "description", content: `${loaderData.name}: ${loaderData.tagline}. Programação, endereço e como chegar.` },
          { property: "og:title", content: `${loaderData.name} — Mapa Cultural` },
          { property: "og:description", content: loaderData.tagline },
          { property: "og:type", content: "place" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Local indisponível — Mapa Cultural" }, { name: "robots", content: "noindex" }],
  }),
  component: VenuePage,
  notFoundComponent: () => (
    <PageContainer>
      <EmptyState title="Local não encontrado" action={<Button asChild><Link to="/locais">Ver locais</Link></Button>} />
    </PageContainer>
  ),
  errorComponent: ({ error }) => (
    <PageContainer>
      <EmptyState title="Não conseguimos carregar este local">{error.message}</EmptyState>
    </PageContainer>
  ),
});

function VenuePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(venueQuery(id));
  const userId = useUserId();
  const { data: followed = [] } = useQuery({ ...followedVenueIdsQuery(userId ?? "none"), enabled: !!userId });
  const follow = useToggleRelation("venue");
  if (!data) return null;
  const { venue, events } = data;
  const following = followed.includes(venue.id);

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-[1.9fr_1fr] lg:gap-14">
        <div className="animate-rise">
          <span className="pill-tag pr-16">Local de eventos</span>
          <h1 className="mt-8 text-6xl font-bold leading-none md:text-[6.5rem]">{venue.name}</h1>
          <p className="mt-6 text-xl text-muted-foreground md:text-2xl">
            {venue.tagline ?? `Cultura e encontros em ${venue.neighborhood}.`}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
            <Button
              size="lg"
              variant={following ? "outline" : "default"}
              className="sm:w-64"
              onClick={() => follow.toggle(venue.id, following)}
              disabled={follow.isPending}
            >
              {following ? "Seguindo ✓" : "+ Seguir local"}
            </Button>
            <p className="text-muted-foreground">
              {following ? "Para deixar de seguir, clique em “Seguindo”." : "Acompanhe a programação deste espaço."}
            </p>
          </div>

          {venue.about && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold md:text-[1.75rem]">
                {venue.since_year ? "Um clássico da cidade" : "Sobre o espaço"}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{venue.about}</p>
            </section>
          )}

          <section className="mt-16">
            <h2 className="text-3xl font-bold md:text-[2.4rem]">Próximos eventos</h2>
            <p className="mt-2 text-muted-foreground">
              {events.length === 0 ? "Nenhum encontro marcado por enquanto" : "A programação que movimenta o espaço"}
            </p>
            <div className="mt-6 space-y-4">
              {events.map((e) => (
                <EventRow
                  key={e.id}
                  id={e.id}
                  iso={e.starts_at}
                  title={e.name}
                  meta={`${dayMonth(e.starts_at)} · ${hourLabel(e.starts_at)}  /  ${e.artists.map((a) => a.name).join(", ") || venue.name}`}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <Poster
            tone="forest"
            className="min-h-[360px] animate-rise [animation-delay:80ms] md:min-h-[440px] [--poster-size:78%] [--poster-top:-18%] [--poster-right:-26%]"
            title={<span className="block max-w-[9ch]">{venue.slogan ?? venue.name}</span>}
            titleClassName="text-5xl md:text-6xl"
            footer={
              <span className="text-lg">
                {venue.name}
                {venue.since_year ? <> &nbsp;/&nbsp; Desde {venue.since_year}</> : <> &nbsp;/&nbsp; {venue.neighborhood}</>}
              </span>
            }
          />
          <section className="rounded-3xl bg-tint p-8 md:p-10">
            <h2 className="text-2xl font-bold text-link md:text-[1.75rem]">Como chegar</h2>
            <p className="mt-8 text-xl leading-relaxed">
              {venue.street}
              <br />
              {venue.neighborhood} · {venue.city}
            </p>
            <Button asChild variant="outline" className="mt-8 w-full">
              <Link to="/" search={{ local: venue.id }}>
                Ver no mapa <ArrowUpRight strokeWidth={2.5} />
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
