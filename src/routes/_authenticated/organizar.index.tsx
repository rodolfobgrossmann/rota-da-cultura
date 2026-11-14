import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { meQuery, organizerDashboardQuery } from "@/lib/queries";
import { dayMonth, firstName, hourLabel, twoDigits } from "@/lib/format";
import { ConfirmDialog } from "@/components/site/ConfirmDialog";
import { Field, PageContainer, PageHeading, Poster } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/organizar/")({
  head: () => ({
    meta: [
      { title: "Seu espaço de organizador — Mapa Cultural" },
      { name: "description", content: "Cadastre espaços, conecte artistas e publique eventos no Mapa Cultural." },
      { property: "og:title", content: "Faça a cultura acontecer — Mapa Cultural" },
      { property: "og:description", content: "Do seu palco para toda a cidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery(context.user.id));
    if (me.isOrganizer) await context.queryClient.ensureQueryData(organizerDashboardQuery(context.user.id));
  },
  component: OrganizerPage,
});

function OrganizerPage() {
  const { user } = Route.useRouteContext();
  const { data: me } = useSuspenseQuery(meQuery(user.id));
  return me.isOrganizer ? <Dashboard /> : <Activate />;
}

function Activate() {
  const { user } = Route.useRouteContext();
  const { data: me } = useSuspenseQuery(meQuery(user.id));
  const queryClient = useQueryClient();
  const router = useRouter();
  const activate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("activate_organizer");
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", user.id] });
      await router.invalidate();
      toast.success("Perfil de organizador ativado. Bem-vindo ao seu espaço!");
    },
    onError: () => toast.error("Não foi possível ativar agora. Tente novamente."),
  });
  const name = me.profile?.full_name || user.email;

  return (
    <PageContainer>
      <PageHeading eyebrow="Mapa Cultural / Seu espaço" title="Faça a cultura acontecer" subtitle="Ative seu perfil de organizador e leve seus encontros para a cidade." />
      <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-10">
        <Poster
          circle="none"
          eyebrow={null}
          className="min-h-[520px] animate-rise lg:p-12"
          titleClassName="text-5xl md:text-[4.4rem] py-0 my-0"
          title={
            <>
              Do seu palco
              <br />
              para toda
              <br />
              a cidade.
            </>
          }
          footer={
            <div className="normal-case tracking-normal">
              <ol className="mt-16 space-y-8 font-display text-xl font-bold md:text-2xl">
                <li><span className="mr-4">01</span>Cadastre espaços culturais</li>
                <li><span className="mr-4">02</span>Conecte artistas à programação</li>
                <li><span className="mr-4">03</span>Publique e gerencie seus eventos</li>
              </ol>
              <p className="mt-14">Sua conta continua com todos os recursos de público.</p>
            </div>
          }
        />
        <section className="rounded-3xl bg-card p-8 shadow-soft md:p-12 animate-rise [animation-delay:80ms]">
          <h2 className="text-3xl font-bold md:text-[2.4rem]">Olá, {firstName(me.profile?.full_name || "você")}. Vamos começar?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Seu perfil de organizador será vinculado à sua conta.</p>
          <div className="mt-10 space-y-7">
            <Field label="Nome do responsável" htmlFor="resp-name">
              <Input id="resp-name" value={name} readOnly />
            </Field>
            <Field label="E-mail da conta" htmlFor="resp-email">
              <Input id="resp-email" value={me.profile?.email || user.email} readOnly />
            </Field>
          </div>
          <p className="mt-10 max-w-xl text-lg text-muted-foreground">
            Ao ativar, você se responsabiliza pelas informações dos eventos, locais e artistas cadastrados por você.
          </p>
          <Button className="mt-10 w-full" onClick={() => activate.mutate()} disabled={activate.isPending}>
            {activate.isPending ? "Ativando…" : "Ativar perfil de organizador"}
          </Button>
          <Link to="/conta" className="mt-8 inline-block font-display text-lg font-bold text-link hover:underline underline-offset-4">
            Voltar para minha conta
          </Link>
        </section>
      </div>
    </PageContainer>
  );
}

function Stat({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center gap-8 rounded-3xl px-8 py-10 md:px-10", highlight ? "bg-primary text-primary-foreground" : "bg-card shadow-soft")}>
      <span className={cn("font-display text-6xl font-bold", !highlight && "text-link")}>{twoDigits(value)}</span>
      <span className={cn("text-xl", !highlight && "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: me } = useSuspenseQuery(meQuery(user.id));
  const { data } = useSuspenseQuery(organizerDashboardQuery(user.id));
  const queryClient = useQueryClient();

  const run = useMutation({
    mutationFn: async (action: () => Promise<{ error: { code?: string; message: string } | null }>) => {
      const { error } = await action();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error: { code?: string }) =>
      toast.error(
        error.code === "23503"
          ? "Este local tem eventos vinculados. Edite ou remova os eventos antes."
          : "Não foi possível concluir agora. Tente novamente.",
      ),
  });

  const published = data.events.filter((e) => e.status === "published").length;

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Mapa Cultural / Seu espaço"
        title={`Olá, ${firstName(me.profile?.full_name || "organizador")}. A cidade espera por você.`}
        subtitle="Gerencie a programação, os espaços e os artistas que você cadastrou."
        action={
          <Button asChild className="w-full sm:w-72">
            <Link to="/organizar/eventos/novo">+ Criar evento</Link>
          </Button>
        }
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
        <Stat value={published} label={published === 1 ? "Evento publicado" : "Eventos publicados"} highlight />
        <Stat value={data.venues.length} label={data.venues.length === 1 ? "Local cadastrado" : "Locais cadastrados"} />
        <Stat value={data.artists.length} label={data.artists.length === 1 ? "Artista cadastrado" : "Artistas cadastrados"} />
      </div>

      <section className="mt-8 rounded-3xl bg-card p-8 shadow-soft md:p-10">
        <h2 className="text-2xl font-bold md:text-[1.75rem]">Seus eventos</h2>
        {data.events.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            Nenhum evento ainda. {data.venues.length === 0 ? "Comece cadastrando um local e um artista." : "Crie seu primeiro encontro."}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="eyebrow text-muted-foreground">
                  <th className="pb-3 font-bold">Evento</th>
                  <th className="pb-3 font-bold">Data e horário</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3" />
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id} className="border-t border-border/60 first:border-0">
                    <td className="py-4 pr-4 font-display text-lg font-bold">
                      <Link to="/eventos/$id" params={{ id: e.id }} className="hover:text-link">{e.name}</Link>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{dayMonth(e.starts_at)} · {hourLabel(e.starts_at)}</td>
                    <td className={cn("py-4 pr-4", e.status === "published" ? "text-link" : "text-destructive")}>
                      {e.status === "published" ? "Publicado" : "Cancelado"}
                    </td>
                    <td className="py-4 pr-4">
                      <Link to="/organizar/eventos/$id" params={{ id: e.id }} className="font-display font-bold text-link hover:underline underline-offset-4">
                        Editar
                      </Link>
                    </td>
                    <td className="py-4">
                      {e.status === "published" ? (
                        <ConfirmDialog
                          trigger={<button type="button" className="text-destructive hover:underline underline-offset-4">Cancelar</button>}
                          title="Cancelar este evento?"
                          description={`“${e.name}” deixará de aparecer no mapa e nas agendas do público.`}
                          confirmLabel="Cancelar evento"
                          onConfirm={() => run.mutate(async () => supabase.from("events").update({ status: "cancelled" }).eq("id", e.id))}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-link hover:underline underline-offset-4"
                          onClick={() => run.mutate(async () => supabase.from("events").update({ status: "published" }).eq("id", e.id))}
                        >
                          Republicar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-8 shadow-soft md:p-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-[1.75rem]">Seus locais</h2>
            <Link to="/organizar/locais/novo" className="font-display font-bold text-link hover:underline underline-offset-4">+ Cadastrar local</Link>
          </div>
          <div className="mt-6 divide-y divide-border/60">
            {data.venues.length === 0 && <p className="text-muted-foreground">Nenhum local cadastrado.</p>}
            {data.venues.map((v) => (
              <div key={v.id} className="py-5 first:pt-2">
                <p className="font-display text-xl font-bold">{v.name}</p>
                <p className="mt-1 text-muted-foreground">{v.street} · {v.neighborhood}</p>
                <div className="mt-4 flex gap-10">
                  <Link to="/organizar/locais/$id" params={{ id: v.id }} className="font-display font-bold text-link hover:underline underline-offset-4">Editar local</Link>
                  <ConfirmDialog
                    trigger={<button type="button" className="text-destructive hover:underline underline-offset-4">Remover local</button>}
                    title="Remover este local?"
                    description={`“${v.name}” sairá do mapa e deixará de ser seguido pelo público.`}
                    confirmLabel="Remover local"
                    onConfirm={() => run.mutate(async () => supabase.from("venues").delete().eq("id", v.id))}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card p-8 shadow-soft md:p-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-[1.75rem]">Seus artistas</h2>
            <Link to="/organizar/artistas/novo" className="font-display font-bold text-link hover:underline underline-offset-4">+ Cadastrar artista</Link>
          </div>
          <div className="mt-6 divide-y divide-border/60">
            {data.artists.length === 0 && <p className="text-muted-foreground">Nenhum artista cadastrado.</p>}
            {data.artists.map((a) => (
              <div key={a.id} className="grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-6 py-5 first:pt-2">
                <p className="font-display text-xl font-bold">{a.name}</p>
                <p className="text-muted-foreground">{a.subgenre}</p>
                <Link to="/organizar/artistas/$id" params={{ id: a.id }} className="font-display font-bold text-link hover:underline underline-offset-4">Editar</Link>
                <ConfirmDialog
                  trigger={<button type="button" className="text-destructive hover:underline underline-offset-4">Remover</button>}
                  title="Remover este artista?"
                  description={`“${a.name}” será desvinculado dos seus eventos e deixará de ser seguido pelo público.`}
                  confirmLabel="Remover artista"
                  onConfirm={() => run.mutate(async () => supabase.from("artists").delete().eq("id", a.id))}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-10 text-muted-foreground">Antes de cancelar ou remover um cadastro, será solicitada uma confirmação.</p>
    </PageContainer>
  );
}
