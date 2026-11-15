import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { issuesToErrors } from "@/components/forms/OrganizerFormLayout";
import { Field } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const toNumber = (v: string) => Number(v.replace(",", "."));

const coord = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== "" && !Number.isNaN(toNumber(v)), `Informe a ${label}.`)
    .refine((v) => toNumber(v) >= min && toNumber(v) <= max, `A ${label} deve estar entre ${min} e ${max}.`);

const schema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao local.").max(120),
  street: z.string().trim().min(3, "Informe rua e número.").max(160),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(80),
  city: z.string().trim().min(2, "Informe a cidade e o estado.").max(80),
  latitude: coord(-90, 90, "latitude"),
  longitude: coord(-180, 180, "longitude"),
  about: z.string().trim().max(2000, "Use até 2000 caracteres."),
});

type Values = z.infer<typeof schema>;
type Key = keyof Values;

export type VenueRow = {
  id: string;
  name: string;
  street: string;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
  about: string | null;
};

export function VenueForm({ userId, venue }: { userId: string; venue?: VenueRow }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => ({
    name: venue?.name ?? "",
    street: venue?.street ?? "",
    neighborhood: venue?.neighborhood ?? "",
    city: venue?.city ?? "",
    latitude: venue ? String(venue.latitude) : "",
    longitude: venue ? String(venue.longitude) : "",
    about: venue?.about ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function findCoordinates() {
    if (!values.street.trim()) {
      setErrors((e) => ({ ...e, street: "Preencha o endereço para buscar as coordenadas." }));
      return;
    }
    const q = [values.street, values.neighborhood, values.city.replace("/", ",")].filter(Boolean).join(", ");
    setLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
        headers: { "Accept-Language": "pt-BR" },
      });
      const found = (await res.json()) as { lat: string; lon: string }[];
      const first = found[0];
      if (!first) {
        toast.error("Endereço não encontrado. Informe as coordenadas manualmente.");
        return;
      }
      setValues((v) => ({ ...v, latitude: Number(first.lat).toFixed(6), longitude: Number(first.lon).toFixed(6) }));
      toast.success("Coordenadas preenchidas pelo endereço.");
    } catch {
      toast.error("Não foi possível buscar agora. Informe as coordenadas manualmente.");
    } finally {
      setLocating(false);
    }
  }

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
      street: v.street,
      neighborhood: v.neighborhood,
      city: v.city,
      latitude: toNumber(v.latitude),
      longitude: toNumber(v.longitude),
      about: v.about || null,
    };
    const { error } = venue
      ? await supabase.from("venues").update(row).eq("id", venue.id)
      : await supabase.from("venues").insert({ ...row, organizer_id: userId });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o local. Tente novamente.");
      return;
    }
    await queryClient.invalidateQueries();
    toast.success(venue ? "Alterações salvas." : "Local cadastrado.");
    navigate({ to: "/organizar" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Field label="Nome do local" htmlFor="name" required error={errors.name}>
        <Input id="name" placeholder="Bar do Zé" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Rua e número" htmlFor="street" required error={errors.street}>
        <Input id="street" placeholder="Rua das Flores, 120" value={values.street} onChange={set("street")} aria-invalid={!!errors.street} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Bairro" htmlFor="neighborhood" required error={errors.neighborhood}>
          <Input id="neighborhood" placeholder="Centro" value={values.neighborhood} onChange={set("neighborhood")} aria-invalid={!!errors.neighborhood} />
        </Field>
        <Field label="Cidade / UF" htmlFor="city" required error={errors.city}>
          <Input id="city" placeholder="Sua cidade / UF" value={values.city} onChange={set("city")} aria-invalid={!!errors.city} />
        </Field>
        <Field label="Latitude" htmlFor="lat" required error={errors.latitude}>
          <Input id="lat" inputMode="decimal" placeholder="Informe a latitude" value={values.latitude} onChange={set("latitude")} aria-invalid={!!errors.latitude} />
        </Field>
        <Field label="Longitude" htmlFor="lng" required error={errors.longitude}>
          <Input id="lng" inputMode="decimal" placeholder="Informe a longitude" value={values.longitude} onChange={set("longitude")} aria-invalid={!!errors.longitude} />
        </Field>
      </div>
      <Button type="button" variant="link" onClick={findCoordinates} disabled={locating}>
        <MapPin /> {locating ? "Buscando…" : "Preencher coordenadas pelo endereço"}
      </Button>
      <Field label="Sobre o espaço" htmlFor="about" error={errors.about}>
        <Textarea id="about" placeholder="Um espaço para descobrir artistas de perto e viver a cultura local." value={values.about} onChange={set("about")} />
      </Field>
      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:gap-8">
        <Button type="submit" className="sm:w-64" disabled={saving}>
          {saving ? "Salvando…" : venue ? "Salvar alterações" : "Cadastrar local"}
        </Button>
        <Button asChild variant="outline" className="sm:w-44">
          <Link to="/organizar">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
