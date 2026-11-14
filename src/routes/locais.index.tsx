import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { followedVenueIdsQuery, venuesQuery } from "@/lib/queries";
import { useToggleRelation } from "@/lib/actions";
import { useUserId } from "@/lib/session";
import { CultureCard } from "@/components/site/CultureCard";
import { ArrowLink, EmptyState, PageContainer, PageHeading } from "@/components/site/ui";

export const Route = createFileRoute("/locais/")({
  head: () => ({
    meta: [
      { title: "Locais — Mapa Cultural" },
      { name: "description", content: "Bares, casas, galerias e espaços que fazem a cultura da cidade acontecer." },
      { property: "og:title", content: "Locais — Mapa Cultural" },
      { property: "og:description", content: "Espaços de cultura para descobrir e voltar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(venuesQuery()).then(() => undefined),
  component: VenuesPage,
  errorComponent: ({ error }) => (
    <PageContainer>
      <EmptyState title="Não conseguimos carregar os locais">{error.message}</EmptyState>
    </PageContainer>
  ),
});

function VenuesPage() {
  const { data: venues } = useSuspenseQuery(venuesQuery());
  const userId = useUserId();
  const { data: followed = [] } = useQuery({ ...followedVenueIdsQuery(userId ?? "none"), enabled: !!userId });
  const follow = useToggleRelation("venue");

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Espaços de cultura"
        title="Onde a cidade acontece"
        subtitle="Siga os espaços para acompanhar a programação."
        action={<ArrowLink to="/">Ver todos no mapa</ArrowLink>}
      />
      <p className="mt-8 text-lg text-muted-foreground">{venues.length} {venues.length === 1 ? "local" : "locais"}</p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((v, i) => (
          <CultureCard
            key={v.id}
            kind="venue"
            id={v.id}
            index={i}
            name={v.name}
            label="Espaço de cultura"
            subtitle={`${v.neighborhood} · ${v.street}`}
            nextEvent={v.next_event}
            following={followed.includes(v.id)}
            pending={follow.pendingId === v.id}
            onToggle={() => follow.toggle(v.id, followed.includes(v.id))}
          />
        ))}
      </div>
    </PageContainer>
  );
}
