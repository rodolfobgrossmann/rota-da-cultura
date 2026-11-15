import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { z } from "zod";

import { attendanceIdsQuery, upcomingEventsQuery, venuesQuery } from "@/lib/queries";
import { ART_TYPES, hourLabel } from "@/lib/format";
import { useToggleRelation } from "@/lib/actions";
import { useUserId } from "@/lib/session";
import { EmptyState, EventRow, PageContainer, Poster } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CultureMap = lazy(() => import("@/components/map/CultureMap"));

const searchSchema = z.object({
  tipo: z.string().optional(),
  local: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Explorar o mapa — Mapa Cultural" },
      { name: "description", content: "Veja no mapa os próximos shows, exposições e encontros culturais da cidade." },
      { property: "og:title", content: "Explorar o mapa — Mapa Cultural" },
      { property: "og:description", content: "Música, arte e encontros que movem a cidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(upcomingEventsQuery()),
      context.queryClient.ensureQueryData(venuesQuery()),
    ]);
  },
  component: ExplorePage,
  errorComponent: ({ error }) => (
    <PageContainer>
      <EmptyState title="Não conseguimos carregar o mapa">{error instanceof Error ? error.message : "Tente novamente em instantes."}</EmptyState>
    </PageContainer>
  ),
});

function MapFallback() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

function ExplorePage() {
  const { tipo, local } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const userId = useUserId();
  const { data: events } = useSuspenseQuery(upcomingEventsQuery());
  const { data: venues } = useSuspenseQuery(venuesQuery());
  const { data: attending = [] } = useQuery({ ...attendanceIdsQuery(userId ?? "none"), enabled: !!userId });
  const attendance = useToggleRelation("attendance");

  const byType = useMemo(
    () => (tipo ? events.filter((e) => e.artists.some((a) => a.art_type === tipo)) : events),
    [events, tipo],
  );
  const shown = local ? byType.filter((e) => e.venue.id === local) : byType;
  const types = ART_TYPES.filter((t) => events.some((e) => e.artists.some((a) => a.art_type === t)));

  const mapVenues = useMemo(
    () =>
      venues.map((v) => ({ ...v, eventCount: byType.filter((e) => e.venue.id === v.id).length })),
    [venues, byType],
  );
  const selectedVenue = venues.find((v) => v.id === local);

  const setSearch = (patch: { tipo?: string | undefined; local?: string | undefined }) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });

  return (
    <PageContainer>
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="animate-rise">
          <p className="eyebrow mb-4 text-link">Explorar o mapa</p>
          <h1 className="text-4xl font-bold leading-[1.05] md:text-[3.4rem]">O que acontece perto de você</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {events.length} {events.length === 1 ? "encontro" : "encontros"} na agenda · {venues.length} espaços de cultura no mapa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!tipo} onClick={() => setSearch({ tipo: undefined })}>Tudo</FilterChip>
          {types.map((t) => (
            <FilterChip key={t} active={tipo === t} onClick={() => setSearch({ tipo: t })}>
              {t}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative h-[420px] overflow-hidden rounded-3xl bg-card shadow-soft lg:sticky lg:top-6 lg:h-[640px]">
          <ClientOnly fallback={<MapFallback />}>
            <Suspense fallback={<MapFallback />}>
              <CultureMap venues={mapVenues} selectedId={local} onSelect={(id) => setSearch({ local: id })} />
            </Suspense>
          </ClientOnly>
          {selectedVenue && (
            <div className="absolute inset-x-4 bottom-4 z-[500] flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-link">Espaço de cultura</p>
                <p className="truncate font-display text-xl font-bold">{selectedVenue.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedVenue.neighborhood} · {selectedVenue.street}
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/locais/$id" params={{ id: selectedVenue.id }}>Ver local</Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Limpar seleção" onClick={() => setSearch({ local: undefined })}>
                <X className="size-5" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">
              {selectedVenue ? `Em ${selectedVenue.name}` : "Próximos eventos"} ({shown.length})
            </h2>
          </div>
          {shown.length === 0 ? (
            <EmptyState title="Nada por aqui ainda">Tente outro filtro ou escolha outro ponto no mapa.</EmptyState>
          ) : (
            shown.map((e) => {
              const going = attending.includes(e.id);
              return (
                <EventRow
                  key={e.id}
                  id={e.id}
                  iso={e.starts_at}
                  title={e.name}
                  meta={`${hourLabel(e.starts_at)} · ${e.venue.name} · ${e.venue.neighborhood}`}
                  actions={
                    <button
                      type="button"
                      onClick={() => attendance.toggle(e.id, going)}
                      disabled={attendance.pendingId === e.id}
                      className={cn("text-sm transition-colors hover:underline underline-offset-4", going ? "font-display font-bold text-link" : "text-muted-foreground hover:text-link")}
                    >
                      {going ? "Presença confirmada ✓" : "Confirmar presença"}
                    </button>
                  }
                >
                  {e.artists.length > 0 && (
                    <p className="mt-1 text-sm text-link">{e.artists.map((a) => a.name).join(", ")}</p>
                  )}
                </EventRow>
              );
            })
          )}

          {!userId && (
            <Poster
              tone="forest"
              circle="corner"
              className="mt-6 min-h-0 p-8 [--poster-size:45%] [--poster-top:-25%] [--poster-right:-12%]"
              eyebrow="Sua conexão com a cidade"
              title={<span className="block max-w-[16ch]">Siga quem inspira. Guarde seus encontros.</span>}
              titleClassName="text-3xl py-5"
              footer={
                <Button asChild variant="tint" size="sm" className="normal-case">
                  <Link to="/cadastro">Criar conta</Link>
                </Button>
              }
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-5 py-2.5 font-display text-sm font-bold transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
