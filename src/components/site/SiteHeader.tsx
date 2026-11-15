import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Menu } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Explorar mapa", exact: true },
  { to: "/artistas", label: "Artistas", exact: false },
  { to: "/locais", label: "Locais", exact: false },
  { to: "/agenda/artistas", label: "Minha agenda", exact: false },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-4 md:gap-6">
      <span className="font-display text-2xl font-bold tracking-tight text-link md:text-[1.75rem]">
        Mapa Cultural
      </span>
      <span className="eyebrow hidden text-[0.6rem] leading-[1.15] text-muted-foreground sm:block">
        Cultura perto
        <br />
        de você
      </span>
    </Link>
  );
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function SiteHeader() {
  const location = useLocation();
  const minimal = location.pathname === "/auth" || location.pathname === "/cadastro";
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const { data: me } = useQuery({ ...meQuery(userId ?? "none"), enabled: !!userId });
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);

  const displayName = me?.profile?.full_name || session?.user.email?.split("@")[0] || "Minha conta";

  if (minimal) {
    return (
      <header className="mx-auto w-full max-w-7xl px-5 md:px-12">
        <div className="flex h-20 items-center justify-between border-b md:h-24">
          <Logo />
          <p className="hidden text-muted-foreground md:block">A cidade acontece. Faça parte.</p>
        </div>
      </header>
    );
  }

  return (
    <header className="mx-auto w-full max-w-7xl px-5 md:px-12">
      <div className="flex h-20 items-center gap-6 border-b md:h-24">
        <Logo />

        <nav className="ml-6 hidden items-center gap-8 lg:flex xl:gap-10">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="text-[1.05rem] text-foreground/85 transition-colors hover:text-link"
              activeProps={{ className: "text-link font-medium underline decoration-primary decoration-2 underline-offset-[10px]" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-10 lg:flex">
          <Link to="/organizar" className="text-[1.05rem] text-link hover:underline underline-offset-4">
            Organizar
          </Link>
          {ready && session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 text-[1.05rem] outline-none">
                {displayName}
                <ArrowDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <DropdownMenuItem asChild>
                  <Link to="/conta">Minha conta</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/agenda/presencas">Presenças confirmadas</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/organizar">Painel do organizador</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive">
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className={ready ? "" : "invisible"}>
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto lg:hidden [&_svg]:size-6" aria-label="Abrir menu">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background">
            <SheetHeader>
              <SheetTitle className="font-display text-link">Mapa Cultural</SheetTitle>
            </SheetHeader>
            <nav className="mt-4 flex flex-col gap-1 px-4" onClick={() => setOpen(false)}>
              {NAV.map((item) => (
                <Link key={item.to} to={item.to} activeOptions={{ exact: item.exact }} className="rounded-lg px-3 py-3 text-lg hover:bg-accent" activeProps={{ className: "bg-accent text-link" }}>
                  {item.label}
                </Link>
              ))}
              <Link to="/organizar" className="rounded-lg px-3 py-3 text-lg text-link hover:bg-accent">
                Organizar
              </Link>
              <div className="my-3 border-t" />
              {session ? (
                <>
                  <Link to="/conta" className="rounded-lg px-3 py-3 text-lg hover:bg-accent">
                    Minha conta · {displayName}
                  </Link>
                  <button type="button" onClick={() => void signOut()} className="rounded-lg px-3 py-3 text-left text-lg text-destructive hover:bg-accent">
                    Sair da conta
                  </button>
                </>
              ) : (
                <Link to="/auth" className="rounded-lg px-3 py-3 text-lg font-medium text-link hover:bg-accent">
                  Entrar
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-5 pb-10 pt-16 md:px-12">
      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Mapa Cultural &nbsp;/&nbsp; Sua próxima descoberta está aqui.</p>
        <p>Mapa cultural &nbsp;•&nbsp; Projeto acadêmico</p>
      </div>
    </footer>
  );
}
