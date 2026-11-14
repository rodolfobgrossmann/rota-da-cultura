import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { dayNumber, monthShort } from "@/lib/format";
import { Label } from "@/components/ui/label";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-7xl flex-1 px-5 pt-8 md:px-12 md:pt-12", className)}>{children}</main>;
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-rise">
      <div>
        {eyebrow && <p className="eyebrow mb-4 text-link">{eyebrow}</p>}
        <h1 className="text-4xl font-bold leading-[1.05] md:text-[3.4rem]">{title}</h1>
        {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 md:mb-14">{action}</div>}
    </div>
  );
}

/** Olive (or forest/pine) poster with the sand circle, as in the design. */
export function Poster({
  tone = "olive",
  eyebrow = "Mapa Cultural apresenta",
  title,
  footer,
  className,
  circle = "corner",
  titleClassName,
}: {
  tone?: "olive" | "forest" | "pine";
  eyebrow?: ReactNode;
  title: ReactNode;
  footer?: ReactNode;
  className?: string;
  circle?: "corner" | "edge" | "none";
  titleClassName?: string;
}) {
  const toneClass = {
    olive: "bg-olive text-olive-foreground",
    forest: "bg-forest text-forest-foreground",
    pine: "bg-pine text-pine-foreground",
  }[tone];
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl p-8 md:p-10",
        circle !== "none" && "poster",
        circle === "edge" && "poster-edge",
        toneClass,
        className,
      )}
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className={cn("my-auto py-8 font-display font-bold leading-[1.02] tracking-tight", titleClassName)}>{title}</div>
      {footer && <div className="uppercase tracking-wide">{footer}</div>}
    </div>
  );
}

export function DateBadge({ iso, size = "md" }: { iso: string; size?: "md" | "lg" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-xl bg-tint font-display text-link",
        size === "md" ? "h-[4.5rem] w-[4.5rem]" : "h-24 w-24",
      )}
    >
      <span className="text-xs font-bold">{monthShort(iso)}</span>
      <span className={cn("font-bold leading-none", size === "md" ? "text-3xl" : "text-[2.6rem]")}>{dayNumber(iso)}</span>
    </div>
  );
}

export function EventRow({
  id,
  iso,
  title,
  meta,
  children,
  actions,
}: {
  id: string;
  iso: string;
  title: string;
  meta: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <div className="flex items-center gap-5 sm:gap-6">
        <DateBadge iso={iso} />
        <div className="min-w-0">
          <h3 className="text-xl font-bold md:text-[1.6rem] md:leading-tight">{title}</h3>
          <p className="mt-1 text-muted-foreground">{meta}</p>
          {children}
        </div>
      </div>
      <div className="flex shrink-0 flex-row items-center gap-6 sm:ml-auto sm:flex-col sm:items-end sm:gap-8">
        <ArrowLink to="/eventos/$id" params={{ id }}>
          Ver evento
        </ArrowLink>
        {actions}
      </div>
    </div>
  );
}

type ArrowLinkProps = {
  children: ReactNode;
  className?: string;
} & (
  | { to: "/eventos/$id" | "/artistas/$id" | "/locais/$id"; params: { id: string } }
  | { to: "/" | "/artistas" | "/locais" | "/organizar"; params?: undefined }
);

export function ArrowLink({ children, className, ...link }: ArrowLinkProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link {...(link as any)} className={cn("inline-flex items-center gap-1 font-display font-bold text-link hover:underline underline-offset-4", className)}>
      {children}
      <ArrowUpRight className="size-4" strokeWidth={2.5} />
    </Link>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <Label htmlFor={htmlFor} className="font-display text-base font-bold">
        {label}
        {required && " *"}
      </Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function InfoPanel({ title, children, tone = "tint", className }: { title: ReactNode; children: ReactNode; tone?: "tint" | "card"; className?: string }) {
  return (
    <section className={cn("rounded-3xl p-8 md:p-10", tone === "tint" ? "bg-tint" : "bg-card shadow-soft", className)}>
      <h2 className={cn("text-2xl font-bold leading-tight md:text-[1.75rem]", tone === "tint" ? "text-link" : "text-foreground")}>{title}</h2>
      <div className="mt-5 space-y-4 text-muted-foreground">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 px-8 py-14 text-center">
      <h3 className="text-2xl font-bold">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-muted-foreground">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-muted" />
      <div className="h-5 w-1/2 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 w-full animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}
