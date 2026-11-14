import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { myAgendaQuery } from "@/lib/queries";
import { hourLabel } from "@/lib/format";
import { useToggleRelation } from "@/lib/actions";
import { AgendaTabs } from "@/components/site/AgendaTabs";
import { EmptyState, EventRow, PageContainer, PageHeading } from "@/components/site/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/agenda/presencas")({
  head: () => ({
    meta: [
      { title: "Sua agenda cultural — Mapa Cultural" },
      { name: "description", content: "Os encontros em que você confirmou presença." },
      { property: "og:title", content: "Sua agenda cultural — Mapa Cultural" },
      { property: "og:description", content: "Os encontros em que você confirmou presença." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myAgendaQuery(context.user.id)).then(() => undefined),
  component: Attendances,
});

function Attendances() {
  const { user } = Route.useRouteContext();
  const { data: events } = useSuspenseQuery(myAgendaQuery(user.id));
  const attendance = useToggleRelation("attendance");

  return (
    <PageContainer>
      <PageHeading eyebrow="Sua conexão com a cidade" title="Sua agenda cultural" subtitle="Os encontros em que você já confirmou presença." />
      <AgendaTabs />
      <div className="mt-12 grid gap-10 lg:grid-cols-[2.1fr_1fr]">
        <section>
          <h2 className="text-2xl font-bold md:text-[1.75rem]">Próximos eventos &nbsp;({events.length})</h2>
          <div className="mt-6 space-y-5">
            {events.length === 0 ? (
              <EmptyState title="Nenhuma presença confirmada">Confirme presença na página de um evento para ele aparecer aqui.</EmptyState>
            ) : (
              events.map((e) => (
                <EventRow
                  key={e.id}
                  id={e.id}
                  iso={e.starts_at}
                  title={e.name}
                  meta={`${hourLabel(e.starts_at)} · ${e.venue.name} · ${e.venue.neighborhood}`}
                  actions={
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive hover:underline underline-offset-4"
                      disabled={attendance.pendingId === e.id}
                      onClick={() => attendance.toggle(e.id, true)}
                    >
                      Remover presença
                    </button>
                  }
                >
                  <p className="mt-2 font-display text-sm font-bold text-link">
                    {e.status === "published" ? "Presença confirmada ✓" : "Evento cancelado"}
                  </p>
                </EventRow>
              ))
            )}
          </div>
        </section>
        <aside className="space-y-8 lg:pt-16">
          <section className="rounded-3xl bg-tint p-8 md:p-10">
            <h2 className="text-2xl font-bold text-link md:text-[1.75rem]">Presença não é ingresso</h2>
            <p className="mt-6 text-muted-foreground">Para eventos pagos, compre seu ingresso no site indicado na página do evento.</p>
          </section>
          <Button asChild className="w-full">
            <Link to="/">Descobrir mais eventos <ArrowUpRight strokeWidth={2.5} /></Link>
          </Button>
          <p className="font-display text-3xl font-bold leading-tight md:text-[2.4rem]">Sua próxima boa história pode estar perto de você.</p>
        </aside>
      </div>
    </PageContainer>
  );
}
