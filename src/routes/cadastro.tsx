import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowRight, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { AuthLayout, safeRedirect } from "@/components/site/AuthLayout";
import { Field } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({ redirect: z.string().optional() });

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Conte como você gostaria de ser chamado.").max(100, "Use até 100 caracteres."),
    email: z.string().trim().email("Informe um e-mail válido.").max(255),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não são iguais." });

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "form", string>>;

export const Route = createFileRoute("/cadastro")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Criar conta — Mapa Cultural" },
      { name: "description", content: "Crie sua conta no Mapa Cultural para seguir artistas, locais e confirmar presença em eventos." },
      { property: "og:title", content: "Criar conta — Mapa Cultural" },
      { property: "og:description", content: "A cultura conecta. Você faz parte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (ready && session) navigate({ to: safeRedirect(redirect), replace: true });
  }, [ready, session, redirect, navigate]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      setErrors({
        form: error.message.toLowerCase().includes("registered")
          ? "Este e-mail já tem cadastro. Entre com sua senha."
          : error.message.toLowerCase().includes("not allowed") || error.message.toLowerCase().includes("invalid")
            ? "Este e-mail não pode receber mensagens. Use um endereço de e-mail real."
            : error.message.toLowerCase().includes("password")
              ? "Escolha uma senha mais segura, que não seja fácil de adivinhar."
              : "Não foi possível criar sua conta agora. Tente novamente.",
      });
      return;
    }
    if (!data.session) setSentTo(parsed.data.email);
  }

  return (
    <AuthLayout
      title={
        <>
          A cultura
          <br />
          conecta.
          <br />
          Você faz parte.
        </>
      }
      footer="Siga quem inspira. Descubra onde acontece."
    >
      {sentTo ? (
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-link">
            <MailCheck className="size-7" />
          </div>
          <h1 className="mt-7 text-4xl font-bold leading-tight">Confira seu e-mail</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Enviamos um link de confirmação para <strong className="text-foreground">{sentTo}</strong>. Abra o link para ativar sua conta e depois entre.
          </p>
          <Button asChild className="mt-8 w-full">
            <Link to="/auth" search={{ redirect }}>Ir para o login</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="eyebrow text-link">01 / Comece por aqui</p>
          <h1 className="mt-6 text-4xl font-bold md:text-[3.25rem]">Crie sua conta</h1>
          <p className="mt-4 text-lg text-muted-foreground">Uma cidade de possibilidades espera por você.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <Field label="Nome completo" htmlFor="name" error={errors.name}>
              <Input id="name" autoComplete="name" placeholder="Como você gostaria de ser chamado?" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} />
            </Field>
            <Field label="E-mail" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Senha" htmlFor="password" error={errors.password}>
              <Input id="password" type="password" autoComplete="new-password" placeholder="Crie uma senha segura" value={values.password} onChange={set("password")} aria-invalid={!!errors.password} />
            </Field>
            <Field label="Confirmar senha" htmlFor="confirm" error={errors.confirm}>
              <Input id="confirm" type="password" autoComplete="new-password" placeholder="Repita sua senha" value={values.confirm} onChange={set("confirm")} aria-invalid={!!errors.confirm} />
            </Field>
            <p className="pt-2 text-sm text-muted-foreground">
              Ao criar sua conta, você concorda com os Termos de uso
              <br className="hidden sm:block" /> e a Política de privacidade.
            </p>
            {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando…" : "Criar minha conta"}
            </Button>
          </form>

          <Link to="/auth" search={{ redirect }} className="mt-8 inline-flex items-center gap-1 font-display text-lg font-bold text-link hover:underline underline-offset-4">
            Já tem conta? &nbsp;Entrar <ArrowRight className="size-4" strokeWidth={2.5} />
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
