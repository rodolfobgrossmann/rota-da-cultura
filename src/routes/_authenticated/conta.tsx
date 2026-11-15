import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { meQuery } from "@/lib/queries";
import { useSignOut } from "@/components/site/SiteHeader";
import { ConfirmDialog } from "@/components/site/ConfirmDialog";
import { Field, PageContainer, PageHeading } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Mapa Cultural" },
      { name: "description", content: "Seus dados e os diferentes jeitos de fazer parte da cultura." },
      { property: "og:title", content: "Minha conta — Mapa Cultural" },
      { property: "og:description", content: "Seus dados e perfis no Mapa Cultural." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery(context.user.id)).then(() => undefined),
  component: AccountPage,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(100),
    email: z.string().trim().email("Informe um e-mail válido.").max(255),
    password: z.string().refine((v) => v === "" || v.length >= 8, "A senha precisa ter pelo menos 8 caracteres."),
    confirm: z.string(),
    current: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não são iguais." })
  .refine((v) => v.password === "" || v.current !== "", { path: ["current"], message: "Informe sua senha atual para trocar a senha." });

type Key = "name" | "email" | "password" | "confirm" | "current";

function AccountPage() {
  const { user } = Route.useRouteContext();
  const { data: me } = useSuspenseQuery(meQuery(user.id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const removeAccount = useServerFn(deleteMyAccount);
  const [values, setValues] = useState({
    name: me.profile?.full_name ?? "",
    email: me.profile?.email || user.email,
    password: "",
    confirm: "",
    current: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {};
      for (const i of parsed.error.issues) next[i.path[0] as Key] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const v = parsed.data;
    try {
      const { error: pErr } = await supabase.from("profiles").update({ full_name: v.name }).eq("id", user.id);
      if (pErr) throw pErr;
      const emailChanged = v.email.toLowerCase() !== (me.profile?.email || user.email).toLowerCase();
      if (emailChanged || v.password) {
        const { error } = await supabase.auth.updateUser({
          ...(emailChanged ? { email: v.email } : {}),
          ...(v.password ? { password: v.password, current_password: v.current } : {}),
        });
        if (error) {
          setErrors(
            error.message.toLowerCase().includes("password")
              ? { current: "Confira sua senha atual." }
              : { email: "Não foi possível atualizar o e-mail." },
          );
          return;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["me", user.id] });
      setValues((s) => ({ ...s, password: "", confirm: "", current: "" }));
      toast.success(emailChanged ? "Dados salvos. Confirme o novo e-mail pelo link enviado." : "Alterações salvas.");
    } catch {
      toast.error("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const del = useMutation({
    mutationFn: () => removeAccount(),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("Sua conta foi excluída.");
      navigate({ to: "/", replace: true });
    },
    onError: () => toast.error("Não foi possível excluir a conta agora. Tente novamente."),
  });

  return (
    <PageContainer>
      <PageHeading eyebrow="Mapa Cultural / Seu espaço" title="Minha conta" subtitle="Seus dados e os diferentes jeitos de fazer parte da cultura." />
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.75fr_1fr] lg:gap-10">
        <section className="rounded-3xl bg-card p-8 shadow-soft md:p-10 animate-rise">
          <h2 className="text-3xl font-bold md:text-[2.4rem]">Dados pessoais</h2>
          <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
            <Field label="Nome completo" htmlFor="name" error={errors.name}>
              <Input id="name" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} />
            </Field>
            <Field label="E-mail" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} />
            </Field>
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Nova senha" htmlFor="password" error={errors.password}>
                <Input id="password" type="password" autoComplete="new-password" placeholder="Em branco para manter a senha" value={values.password} onChange={set("password")} aria-invalid={!!errors.password} />
              </Field>
              <Field label="Confirmar nova senha" htmlFor="confirm" error={errors.confirm}>
                <Input id="confirm" type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={values.confirm} onChange={set("confirm")} aria-invalid={!!errors.confirm} />
              </Field>
            </div>
            {values.password && (
              <Field label="Senha atual" htmlFor="current" error={errors.current}>
                <Input id="current" type="password" autoComplete="current-password" placeholder="Para confirmar a troca de senha" value={values.current} onChange={set("current")} aria-invalid={!!errors.current} />
              </Field>
            )}
            <Button type="submit" className="mt-4 sm:w-64" disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </form>
          <button type="button" onClick={() => void signOut()} className="mt-10 font-display text-lg font-bold text-link hover:underline underline-offset-4">
            Sair da conta
          </button>
        </section>

        <div className="space-y-8">
          <section className="rounded-3xl bg-tint p-8 md:p-10">
            <h2 className="text-3xl font-bold text-link md:text-[2.4rem]">Seus perfis</h2>
            <div className="mt-8">
              <h3 className="text-xl font-bold md:text-2xl">Público</h3>
              <p className="mt-2 text-muted-foreground">Ativo · Acompanhe artistas e eventos.</p>
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-bold md:text-2xl">Organizador</h3>
              <p className="mt-2 text-muted-foreground">
                {me.isOrganizer ? "Ativo · Gerencie sua programação." : "Inativo · Publique eventos, locais e artistas."}
              </p>
            </div>
            <Button asChild variant="outline" className="mt-8 w-full">
              <Link to="/organizar">
                {me.isOrganizer ? "Abrir painel do organizador" : "Ativar perfil de organizador"} <ArrowUpRight strokeWidth={2.5} />
              </Link>
            </Button>
          </section>

          <section className="rounded-3xl bg-card p-8 shadow-soft md:p-10">
            <h2 className="text-2xl font-bold text-destructive md:text-[2rem]">Excluir minha conta</h2>
            <p className="mt-4 text-muted-foreground">Esta ação remove seu acesso e suas relações com artistas, locais e eventos.</p>
            <ConfirmDialog
              trigger={
                <button type="button" className="mt-8 inline-flex items-center gap-1 font-display font-bold text-destructive hover:underline underline-offset-4" disabled={del.isPending}>
                  {del.isPending ? "Excluindo…" : "Solicitar exclusão"} <ArrowRight className="size-4" strokeWidth={2.5} />
                </button>
              }
              title="Excluir sua conta?"
              description="Seus seguidos, presenças e cadastros de organizador serão apagados. Essa ação não pode ser desfeita."
              confirmLabel="Excluir conta"
              onConfirm={() => del.mutate()}
            />
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
