import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { AuthLayout, safeRedirect } from "@/components/site/AuthLayout";
import { Field } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Entrar — Mapa Cultural" },
      { name: "description", content: "Entre para acompanhar artistas e salvar seus próximos encontros culturais." },
      { property: "og:title", content: "Entrar — Mapa Cultural" },
      { property: "og:description", content: "Sua cidade. Seu ritmo. Seu próximo rolê." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session) navigate({ to: safeRedirect(redirect), replace: true });
  }, [ready, session, redirect, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("confirm")
          ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
          : "E-mail ou senha incorretos. Confira e tente novamente.",
      );
      return;
    }
    navigate({ to: safeRedirect(redirect), replace: true });
  }

  return (
    <AuthLayout
      title={
        <>
          Sua cidade.
          <br />
          Seu ritmo.
          <br />
          Seu próximo rolê.
        </>
      }
      footer="Música, arte e encontros que movem a cidade."
    >
      <span className="pill-tag pr-16">Bem-vindo de volta</span>
      <h1 className="mt-7 text-4xl font-bold leading-[1.1] md:text-[3.25rem]">
        Que bom te ver
        <br />
        por aqui.
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">Entre para acompanhar artistas e salvar seus próximos encontros.</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6" noValidate>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Use o e-mail e a senha do seu cadastro." error={error ?? undefined}>
          <Input id="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar na minha conta"}
        </Button>
      </form>

      <p className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-2 text-lg text-muted-foreground">
        Ainda não tem conta?
        <Link to="/cadastro" search={{ redirect }} className="inline-flex items-center gap-1 font-display font-bold text-link hover:underline underline-offset-4">
          Criar conta <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
      </p>
      <Link to="/" className="mt-12 inline-flex items-center gap-1 text-lg text-link hover:underline underline-offset-4">
        Explore o mapa sem entrar <ArrowUpRight className="size-4" />
      </Link>
    </AuthLayout>
  );
}
