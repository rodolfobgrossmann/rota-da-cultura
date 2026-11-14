// Date helpers. All dates render in São Paulo time so server and browser agree.
const TZ = "America/Sao_Paulo";

function parts(iso: string) {
  const d = new Date(iso);
  const get = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(d);
  return { d, get };
}

const clean = (s: string) => s.replace(".", "").trim();

/** "NOV" */
export function monthShort(iso: string) {
  return clean(parts(iso).get({ month: "short" })).toUpperCase();
}

/** "21" */
export function dayNumber(iso: string) {
  return parts(iso).get({ day: "2-digit" });
}

/** "21 nov" */
export function dayMonth(iso: string) {
  const { get } = parts(iso);
  return `${get({ day: "2-digit" })} ${clean(get({ month: "short" }))}`;
}

/** "20h" or "20h30" */
export function hourLabel(iso: string) {
  const { get } = parts(iso);
  const h = get({ hour: "2-digit", hourCycle: "h23" });
  const m = get({ minute: "2-digit" }).padStart(2, "0");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** "Sábado, 21 de novembro" */
export function longDate(iso: string) {
  const { get } = parts(iso);
  const weekday = get({ weekday: "long" }).split("-")[0];
  const s = `${weekday}, ${get({ day: "numeric" })} de ${get({ month: "long" })}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "SÁB 21 NOV" */
export function posterDate(iso: string) {
  const { get } = parts(iso);
  return `${clean(get({ weekday: "short" }))} ${get({ day: "2-digit" })} ${clean(get({ month: "short" }))}`.toUpperCase();
}

/** Values for <input type="date"> and <input type="time"> */
export function toDateInput(iso: string) {
  const { get } = parts(iso);
  return `${get({ year: "numeric" })}-${get({ month: "2-digit" })}-${get({ day: "2-digit" })}`;
}
export function toTimeInput(iso: string) {
  const { get } = parts(iso);
  return `${get({ hour: "2-digit", hourCycle: "h23" })}:${get({ minute: "2-digit" }).padStart(2, "0")}`;
}

/** Combine form date + time (São Paulo, UTC-3) into an ISO timestamp. */
export function fromDateTimeInputs(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function twoDigits(n: number) {
  return String(n).padStart(2, "0");
}

/** Label shown on the event chip, e.g. "Música ao vivo". */
export function artLabel(artType: string | undefined) {
  if (!artType) return "Encontro cultural";
  if (artType === "Música") return "Música ao vivo";
  if (artType === "Artes visuais") return "Exposição";
  return artType;
}

export const ART_TYPES = [
  "Música",
  "Artes visuais",
  "Teatro",
  "Dança",
  "Literatura",
  "Cinema",
  "Cultura popular",
] as const;
