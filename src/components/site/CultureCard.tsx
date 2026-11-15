import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { NextEvent } from "@/lib/queries";
import { dayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TONES = ["bg-olive text-olive-foreground", "bg-forest text-forest-foreground", "bg-pine text-pine-foreground"];

export function toneFor(index: number, kind: "artist" | "venue") {
  // Venues start on the darker tone, like the design.
  const offset = kind === "venue" ? 1 : 0;
  return TONES[(index + offset) % TONES.length];
}

export function CultureCard({
  kind,
  id,
  index,
  name,
  subtitle,
  label,
  nextEvent,
  following,
  pending,
  onToggle,
}: {
  kind: "artist" | "venue";
  id: string;
  index: number;
  name: string;
  subtitle: string;
  label: string;
  nextEvent: NextEvent;
  following: boolean;
  pending?: boolean | undefined;
  onToggle: () => void;
}) {
  const linkClass = "w-full";
  return (
    <article className="flex flex-col rounded-3xl bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5 animate-rise" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
      <div className={cn("flex min-h-[200px] flex-col rounded-2xl p-6", toneFor(index, kind))}>
        <p className="eyebrow">{label}</p>
        <p className="my-auto font-display text-3xl font-bold leading-tight tracking-tight md:text-[2.4rem]">{name}</p>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-6">
        <h3 className="text-2xl font-bold md:text-[1.75rem]">{name}</h3>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <p className="eyebrow mt-8 text-link">Próximo evento</p>
        <p className="mt-2 min-h-6">
          {nextEvent ? (
            <Link to="/eventos/$id" params={{ id: nextEvent.id }} className="hover:text-link">
              {dayMonth(nextEvent.starts_at)} · {nextEvent.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">Sem data marcada</span>
          )}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-4 pt-8">
          <Button asChild size="sm" className="h-12 text-base">
            {kind === "artist" ? (
              <Link to="/artistas/$id" params={{ id }} className={linkClass}>
                Ver perfil <ArrowUpRight strokeWidth={2.5} />
              </Link>
            ) : (
              <Link to="/locais/$id" params={{ id }} className={linkClass}>
                Ver local <ArrowUpRight strokeWidth={2.5} />
              </Link>
            )}
          </Button>
          <Button variant="outline" size="sm" className="h-12 text-base" onClick={onToggle} disabled={pending}>
            {following ? "Seguindo ✓" : "+ Seguir"}
          </Button>
        </div>
      </div>
    </article>
  );
}
