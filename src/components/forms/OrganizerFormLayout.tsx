import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { InfoPanel, PageContainer } from "@/components/site/ui";

export function OrganizerFormLayout({
  title,
  subtitle,
  sideTitle,
  side,
  children,
}: {
  title: string;
  subtitle: string;
  sideTitle: string;
  side: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer>
      <Link to="/organizar" className="inline-flex items-center gap-1 font-display font-bold text-link hover:underline underline-offset-4">
        <ArrowLeft className="size-4" strokeWidth={2.5} /> Voltar ao painel do organizador
      </Link>
      <h1 className="mt-10 text-4xl font-bold md:text-[3.4rem]">{title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-10">
        <section className="rounded-3xl bg-card p-6 shadow-soft md:p-10 animate-rise">{children}</section>
        <div className="space-y-8">
          <InfoPanel title={sideTitle}>{side}</InfoPanel>
          <InfoPanel tone="card" title="Um cadastro, duas ações">
            <p>
              Use este formulário para cadastrar. Ao acessar “Editar” no painel, os dados são preenchidos e a ação passa a ser “Salvar alterações”.
            </p>
          </InfoPanel>
        </div>
      </div>
    </PageContainer>
  );
}

export function issuesToErrors<T extends string>(issues: { path: (string | number)[]; message: string }[]) {
  const out: Partial<Record<T, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0] as T;
    out[key] ??= issue.message;
  }
  return out;
}
