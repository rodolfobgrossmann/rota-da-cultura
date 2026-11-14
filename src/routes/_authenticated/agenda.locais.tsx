import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { followedVenueIdsQuery, venuesQuery } from "@/lib/queries";
import { useToggleRelation } from "@/lib/actions";
import { AgendaTabs } from "@/components/site/AgendaTabs";
import { CultureCard } from "@/components/site/CultureCard";
import { EmptyState, PageContainer, PageHeading } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/agenda/locais")({
  head: () => ({
    meta: [
      { title: "Locais seguidos — Mapa Cultural" },
      { name: "description", content: "Acompanhe os espaços que fazem parte da sua cidade." },
      { property: "og:title", content: "Locais seguidos — Mapa Cultural" },
      { property: "og:description", content: "Lugares para voltar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(venuesQuery()),
      context.queryClient.ensureQueryData(followedVenueIdsQuery(context.user.id)),
    ]);
  },
  component: FollowedVenues,
});

function FollowedVenues() {
  const { user } = Route.useRouteContext();
  const { data: venues } = useSuspenseQuery(venuesQuery());
  const { data: ids } = useSuspenseQuery(followedVenueIdsQuery(user.id));
  const follow = useToggleRelation("venue");
  const list = venues.filter((v) => ids.includes(v.id));

  return (
    <PageContainer>
      <PageHeading eyebrow="Sua conexão com a cidade" title="Lugares para voltar" subtitle="Acompanhe os espaços que fazem parte da sua cidade." />
      <AgendaTabs />
      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="text-lg text-muted-foreground">
          {list.length} {list.length === 1 ? "local seguido" : "locais seguidos"}
        </p>
        <Button asChild variant="outline" className="sm:w-72">
          <Link to="/locais">Explorar locais <ArrowUpRight strokeWidth={2.5} /></Link>
        </Button>
      </div>
      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Você ainda não segue nenhum local">Siga bares, casas e galerias para acompanhar a programação.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v, i) => (
              <CultureCard
                key={v.id}
                kind="venue"
                id={v.id}
                index={i}
                name={v.name}
                label="Espaço de cultura"
                subtitle={`${v.neighborhood} · ${v.street}`}
                nextEvent={v.next_event}
                following
                pending={follow.pendingId === v.id}
                onToggle={() => follow.toggle(v.id, true)}
              />
            ))}
          </div>
          <p className="mt-10 text-muted-foreground">Para deixar de seguir, use “Seguindo” no cartão do local.</p>
        </>
      )}
    </PageContainer>
  );
}
