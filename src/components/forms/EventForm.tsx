import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { EventItem } from "@/lib/queries";
import { fromDateTimeInputs, toDateInput, toTimeInput } from "@/lib/format";
import { issuesToErrors } from "@/components/forms/OrganizerFormLayout";
import { Field } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const toNumber = (v: string) => Number(v.replace(",", "."));

const schema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao evento.").max(120, "Use até 120 caracteres."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário."),
  venueId: z.string().min(1, "Escolha o local do evento."),
  artistIds: z.array(z.string()).min(1, "Escolha pelo menos um artista."),
  ticketUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), "Use um link completo, começando com https://"),
  price: z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(toNumber(v)) && toNumber(v) >= 0), "Informe um valor válido."),
  headline: z.string().trim().max(140, "Use até 140 caracteres."),
  description: z.string().trim().max(2000, "Use até 2000 caracteres."),
});

type Values = z.infer<typeof schema>;
type Key = keyof Values;

export function EventForm({
  userId,
  venues,
  artists,
  event,
}: {
  userId: string;
  venues: { id: string; name: string }[];
  artists: { id: string; name: string }[];
  event?: EventItem;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => ({
    name: event?.name ?? "",
    date: event ? toDateInput(event.starts_at) : "",
    time: event ? toTimeInput(event.starts_at) : "",
    venueId: event?.venue.id ?? (venues.length === 1 ? venues[0]!.id : ""),
    artistIds: event?.artists.map((a) => a.id) ?? [],
    ticketUrl: event?.ticket_url ?? "",
    price: event?.price != null ? String(event.price).replace(".", ",") : "",
    headline: event?.headline ?? "",
    description: event?.description ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends Key>(k: K, v: Values[K]) => setValues((prev) => ({ ...prev, [k]: v }));
  const toggleArtist = (id: string) =>
    set("artistIds", values.artistIds.includes(id) ? values.artistIds.filter((a) => a !== id) : [...values.artistIds, id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(issuesToErrors<Key>(parsed.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    const v = parsed.data;
    const row = {
      name: v.name,
      starts_at: fromDateTimeInputs(v.date, v.time),
      venue_id: v.venueId,
      ticket_url: v.ticketUrl || null,
      price: v.price ? toNumber(v.price) : null,
      headline: v.headline || null,
      description: v.description || null,
    };
    try {
      let eventId = event?.id;
      if (eventId) {
        const { error } = await supabase.from("events").update(row).eq("id", eventId);
        if (error) throw error;
        const { error: delErr } = await supabase.from("event_artists").delete().eq("event_id", eventId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert({ ...row, organizer_id: userId, status: "published" })
          .select("id")
          .single();
        if (error) throw error;
        eventId = data.id;
      }
      const id = eventId;
      const { error: linkErr } = await supabase
        .from("event_artists")
        .insert(v.artistIds.map((artist_id) => ({ event_id: id, artist_id })));
      if (linkErr) throw linkErr;
      await queryClient.invalidateQueries();
      toast.success(event ? "Alterações salvas." : "Evento publicado.");
      navigate({ to: "/organizar" });
    } catch {
      toast.error("Não foi possível salvar o evento. Confira os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const selectedNames = artists.filter((a) => values.artistIds.includes(a.id)).map((a) => a.name);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Field label="Nome do evento" htmlFor="name" required error={errors.name}>
        <Input id="name" placeholder="Noite de jazz no Zé" value={values.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Data" htmlFor="date" required error={errors.date}>
          <Input id="date" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} aria-invalid={!!errors.date} />
        </Field>
        <Field label="Horário" htmlFor="time" required error={errors.time}>
          <Input id="time" type="time" value={values.time} onChange={(e) => set("time", e.target.value)} aria-invalid={!!errors.time} />
        </Field>
        <Field label="Local do evento" htmlFor="venue" required error={errors.venueId}>
          <Select value={values.venueId} onValueChange={(v) => set("venueId", v)}>
            <SelectTrigger id="venue" className="h-12 rounded-xl bg-card px-4 text-base" aria-invalid={!!errors.venueId}>
              <SelectValue placeholder="Escolha um local" />
            </SelectTrigger>
            <SelectContent>
              {venues.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Artistas participantes" htmlFor="artists" required error={errors.artistIds}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                id="artists"
                type="button"
                aria-invalid={!!errors.artistIds}
                className="flex h-12 w-full items-center gap-2 truncate rounded-xl border border-input bg-card px-4 text-left text-base aria-[invalid=true]:border-destructive"
              >
                {selectedNames.length ? (
                  <span className="truncate">{selectedNames.join(", ")} ✓</span>
                ) : (
                  <span className="text-muted-foreground">Escolha os artistas</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] rounded-xl p-2">
              {artists.map((a) => {
                const on = values.artistIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleArtist(a.id)}
                    className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-accent", on && "font-medium text-link")}
                  >
                    {a.name}
                    {on && <Check className="size-4" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Field label="Link externo para ingressos" htmlFor="ticket" error={errors.ticketUrl}>
          <Input id="ticket" type="url" placeholder="https://ingressos.exemplo.com/jazz-no-ze" value={values.ticketUrl} onChange={(e) => set("ticketUrl", e.target.value)} aria-invalid={!!errors.ticketUrl} />
        </Field>
        <Field label="Valor a partir de (R$)" htmlFor="price" error={errors.price}>
          <Input id="price" inputMode="decimal" placeholder="30,00" value={values.price} onChange={(e) => set("price", e.target.value)} aria-invalid={!!errors.price} />
        </Field>
      </div>
      <Field label="Chamada do evento" htmlFor="headline" error={errors.headline} hint="Uma frase curta que aparece em destaque na página do evento.">
        <Input id="headline" placeholder="Uma noite de jazz, um encontro com a cidade." value={values.headline} onChange={(e) => set("headline", e.target.value)} />
      </Field>
      <Field label="Descrição do evento" htmlFor="description" error={errors.description}>
        <Textarea id="description" placeholder="Lia Costa e seu trio em uma noite de jazz brasileiro, improviso e boas conversas." value={values.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:gap-8">
        <Button type="submit" className="sm:w-64" disabled={saving}>
          {saving ? "Salvando…" : event ? "Salvar alterações" : "Publicar evento"}
        </Button>
        <Button asChild variant="outline" className="sm:w-44">
          <Link to="/organizar">Cancelar</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Confira data, local e artistas antes de publicar.</p>
      </div>
    </form>
  );
}
