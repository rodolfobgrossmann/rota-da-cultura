import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { ART_TYPES } from "@/lib/format";
import { issuesToErrors } from "@/components/forms/OrganizerFormLayout";
import { Field } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome artístico.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  artType: z.string().min(1, "Escolha o tipo de arte."),
  subgenre: z.string().trim().min(2, "Informe o subgênero.").max(60),
  about: z.string().trim().max(2000, "Use até 2000 caracteres."),
});

type Values = z.infer<typeof schema>;
type Key = keyof Values;

export type ArtistRow = {
  id: string;
  name: string;
  art_type: string;
  subgenre: string;
  about: string | null;
  account_email: string;
};

export function ArtistForm({ userId, artist }: { userId: string; artist?: ArtistRow }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => ({
    name: artist?.name ?? "",
    email: artist?.account_email ?? "",
    artType: artist?.art_type ?? "",
    subgenre: artist?.subgenre ?? "",
    about: artist?.about ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

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
    const { data: linkedId, error: lookupErr } = await supabase.rpc("find_user_id_by_email", { _email: v.email });
    if (lookupErr || !linkedId) {
      setSaving(false);
      setErrors({ email: "Não encontramos uma conta com este e-mail. Use o e-mail de uma pessoa já cadastrada na plataforma." });
      return;
    }
    const row = { name: v.name, art_type: v.artType, subgenre: v.subgenre, about: v.about || null, user_id: linkedId };
    const { error } = artist
      ? await supabase.from("artists").update(row).eq("id", artist.id)
      : await supabase.from("artists").insert({ ...row, organizer_id: userId });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o artista. Tente novamente.");
      return;
    }
    await queryClient.invalidateQueries();
    toast.success(artist ? "Alterações salvas." : "Artista cadastrado.");
    navigate({ to: "/organizar" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Field label="Nome artístico" htmlFor="name" required error={errors.name}>
        <Input id="name" placeholder="Lia Costa" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="E-mail da conta do artista" htmlFor="email" required error={errors.email} hint="Use o e-mail de uma pessoa já cadastrada na plataforma.">
        <Input id="email" type="email" placeholder="lia.costa@exemplo.com" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} />
      </Field>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Tipo de arte" htmlFor="artType" required error={errors.artType}>
          <Select value={values.artType} onValueChange={(v) => setValues((s) => ({ ...s, artType: v }))}>
            <SelectTrigger id="artType" className="h-12 rounded-xl bg-card px-4 text-base" aria-invalid={!!errors.artType}>
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              {ART_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subgênero" htmlFor="subgenre" required error={errors.subgenre}>
          <Input id="subgenre" placeholder="Jazz" value={values.subgenre} onChange={set("subgenre")} aria-invalid={!!errors.subgenre} />
        </Field>
      </div>
      <Field label="Sobre o artista" htmlFor="about" error={errors.about}>
        <Textarea id="about" placeholder="Pianista e compositora que transforma referências brasileiras em encontros cheios de improviso." value={values.about} onChange={set("about")} />
      </Field>
      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:gap-8">
        <Button type="submit" className="sm:w-64" disabled={saving}>
          {saving ? "Salvando…" : artist ? "Salvar alterações" : "Cadastrar artista"}
        </Button>
        <Button asChild variant="outline" className="sm:w-44">
          <Link to="/organizar">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
