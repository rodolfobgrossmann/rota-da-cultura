import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/agenda/artistas", label: "Artistas seguidos" },
  { to: "/agenda/locais", label: "Locais seguidos" },
  { to: "/agenda/presencas", label: "Presenças confirmadas" },
] as const;

export function AgendaTabs() {
  return (
    <nav className="mt-8 grid gap-3 sm:grid-cols-3 lg:max-w-[52rem]" aria-label="Minha agenda">
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="rounded-xl bg-card px-6 py-4 font-display text-[1.05rem] font-bold text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "!bg-primary !text-primary-foreground" }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
