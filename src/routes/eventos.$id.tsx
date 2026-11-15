import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { attendanceIdsQuery, eventQuery } from "@/lib/queries";
import { artLabel, formatPrice, hourLabel, longDate, posterDate } from "@/lib/format";
import { useToggleRelation } from "@/lib/actions";
import { useUserId } from "@/lib/session";
import { ArrowLink, EmptyState, PageContainer, Poster } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/eventos/$id")({
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(eventQuery(params.id));
    if (!event) throw notFound();
    return { name: event.name, description: event.description ?? "", venue: event.venue.name };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Mapa Cultural` },
          { name: "description", content: loaderData.description.slice(0, 155) || `${loaderData.name} em ${loaderData.venue}.` },
          { property: "og:title", content: `${loaderData.name} · ${loaderData.venue}` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Evento indisponível — Mapa Cultural" }, { name: "robots", content: "noindex" }],
  }),
  component: EventPage,
  notFoundComponent: () => (
    <PageContainer>
      <EmptyState title="Evento não encontrado" action={<Button asChild><Link to="/">Explorar o mapa</Link></Button>}>
        Esse encontro pode ter sido cancelado ou removido.
      </EmptyState>
    </PageContainer>
  ),
  errorComponent: ({ error }) => (
    <PageContainer>
      <EmptyState title="Não conseguimos carregar este evento">{error instanceof Error ? error.message : "Tente novamente em instantes."}</EmptyState>
    </PageContainer>
  ),
});

function EventPage() {
  const { id } = Route.useParams();
  const { data: event } = useSuspenseQuery(eventQuery(id));
  const userId = useUserId();
  const { data: attending = [] } = useQuery({ ...attendanceIdsQuery(userId ?? "none"), enabled: !!userId });
  const attendance = useToggleRelation("attendance");
  if (!event) return null;

  const going = attending.includes(event.id);
  const mainType = event.artists[0]?.art_type;
  const cancelled = event.status !== "published";
  const isMusic = mainType === "Música";

  return (
    <PageContainer className="md:pt-8">
      <nav className="text-muted-foreground" aria-label="Trilha">
        <Link to="/" className="hover:text-link">Explorar</Link>
        {mainType && (
          <>
            {" "}/{" "}
            <Link to="/" search={{ tipo: mainType }} className="hover:text-link">{mainType}</Link>
          </>
        )}
        {" "}/ <span>{event.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.9fr_1fr]">
        <div>
          <Poster
            circle="edge"
            className="min-h-[300px] animate-rise md:min-h-[380px] [&::after]:[--poster-size:105%] [&::after]:[--poster-right:-58%] [&::after]:[--poster-top:-35%]"
            title={<span className="block max-w-[11ch] md:max-w-[13ch]">{event.name}</span>}
            titleClassName="text-5xl md:text-7xl"
            footer={
              <span className="text-lg">
                {posterDate(event.starts_at)} &nbsp;·&nbsp; {hourLabel(event.starts_at).toUpperCase()}
                {event.artists[0] && <> &nbsp;·&nbsp; {event.artists[0].name.toUpperCase()}{isMusic ? " AO VIVO" : ""}</>}
              </span>
            }
          />

          <div className="mt-8 animate-rise [animation-delay:80ms]">
            <span className="pill-tag pr-16">{cancelled ? "Evento cancelado" : artLabel(mainType)}</span>
            <h2 className="mt-6 max-w-[22ch] text-3xl font-bold leading-tight md:text-[2.75rem]">
              {event.headline || `${event.name}, um encontro com a cidade.`}
            </h2>
            {event.description && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{event.description}</p>
            )}
          </div>

          {event.artists.length > 0 && (
            <section className="mt-12">
              <h3 className="text-2xl font-bold md:text-[1.75rem]">{isMusic ? "Quem faz o som" : "Quem faz acontecer"}</h3>
              <div className="mt-5 space-y-4">
                {event.artists.map((a) => (
                  <div key={a.id} className="flex flex-col gap-3 rounded-2xl bg-card px-8 py-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-display text-2xl font-bold">{a.name}</p>
                      <p className="text-muted-foreground">{a.tagline ? `${a.subgenre} · ${a.art_type}` : `${a.art_type} · ${a.subgenre}`}</p>
                    </div>
                    <ArrowLink to="/artistas/$id" params={{ id: a.id }} className="sm:mr-10">
                      Conhecer artista
                    </ArrowLink>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-3xl bg-card p-8 shadow-soft md:p-10 lg:sticky lg:top-6">
          <p className="eyebrow text-link">Reserve esse encontro</p>
          <p className="mt-8 font-display text-2xl font-bold md:text-[1.75rem]">{longDate(event.starts_at)}</p>
          <p className="mt-6 text-lg text-muted-foreground">Início às {hourLabel(event.starts_at)}</p>

          <p className="mt-10 font-display text-2xl font-bold md:text-[1.75rem]">{event.venue.name}</p>
          <p className="mt-3 text-lg text-muted-foreground">
            {event.venue.street} · {event.venue.neighborhood}
          </p>
          <ArrowLink to="/locais/$id" params={{ id: event.venue.id }} className="mt-4">
            Conhecer o local
          </ArrowLink>

          <div className="mt-10">
            {event.price !== null && event.price > 0 ? (
              <>
                <p className="text-muted-foreground">A partir de</p>
                <p className="mt-1 font-display text-5xl font-bold">{formatPrice(event.price)}</p>
              </>
            ) : (
              <p className="font-display text-3xl font-bold">Entrada gratuita</p>
            )}
          </div>

          {cancelled ? (
            <p className="mt-8 rounded-xl bg-destructive/10 p-4 text-destructive">Este evento foi cancelado pela organização.</p>
          ) : (
            <>
              {event.ticket_url && (
                <>
                  <Button asChild className="mt-8 w-full">
                    <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                      Comprar ingresso <ArrowUpRight strokeWidth={2.5} />
                    </a>
                  </Button>
                  <p className="mt-3 text-sm text-muted-foreground">Você será direcionado ao site de ingressos.</p>
                </>
              )}
              <Button
                variant={going ? "tint" : "outline"}
                className="mt-6 w-full"
                onClick={() => attendance.toggle(event.id, going)}
                disabled={attendance.isPending}
              >
                {going ? "Presença confirmada ✓" : "Confirmar presença"}
              </Button>
              <p className="mt-6 text-muted-foreground">
                Confirmar presença não garante ingresso.
                {going && " Clique de novo para remover a presença."}
              </p>
            </>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
