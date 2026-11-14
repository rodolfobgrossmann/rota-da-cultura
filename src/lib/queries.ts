import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// ---------- Shared types (browser-safe, no map imports) ----------

export type VenueSummary = {
  id: string;
  name: string;
  street: string;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
};

export type ArtistSummary = {
  id: string;
  name: string;
  art_type: string;
  subgenre: string;
  tagline: string | null;
};

export type EventItem = {
  id: string;
  name: string;
  headline: string | null;
  starts_at: string;
  ticket_url: string | null;
  price: number | null;
  description: string | null;
  status: string;
  organizer_id: string | null;
  venue: VenueSummary;
  artists: ArtistSummary[];
};

export type NextEvent = { id: string; name: string; starts_at: string } | null;

export type ArtistCard = ArtistSummary & {
  about: string | null;
  organizer_id: string | null;
  next_event: NextEvent;
};

export type VenueCard = VenueSummary & {
  about: string | null;
  tagline: string | null;
  slogan: string | null;
  since_year: number | null;
  organizer_id: string | null;
  next_event: NextEvent;
};

const VENUE_FIELDS = "id,name,street,neighborhood,city,latitude,longitude";
const ARTIST_FIELDS = "id,name,art_type,subgenre,tagline";
const EVENT_SELECT = `id,name,headline,starts_at,ticket_url,price,description,status,organizer_id,venue:venues(${VENUE_FIELDS}),event_artists(artist:artists(${ARTIST_FIELDS}))`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapEvent(row: any): EventItem {
  return {
    id: row.id,
    name: row.name,
    headline: row.headline,
    starts_at: row.starts_at,
    ticket_url: row.ticket_url,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    description: row.description,
    status: row.status,
    organizer_id: row.organizer_id,
    venue: row.venue,
    artists: (row.event_artists ?? [])
      .map((ea: any) => ea.artist)
      .filter(Boolean)
      .sort((a: ArtistSummary, b: ArtistSummary) => a.name.localeCompare(b.name)),
  };
}

function nextFrom(events: any[] | null | undefined): NextEvent {
  const now = Date.now() - 6 * 3600_000;
  const upcoming = (events ?? [])
    .filter((e) => e && e.status === "published" && new Date(e.starts_at).getTime() >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const e = upcoming[0];
  return e ? { id: e.id, name: e.name, starts_at: e.starts_at } : null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Events from a few hours ago onwards still count as upcoming (they may be happening now). */
function upcomingCutoff() {
  return new Date(Date.now() - 6 * 3600_000).toISOString();
}

// ---------- Public data ----------

export const upcomingEventsQuery = () =>
  queryOptions({
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("status", "published")
        .gte("starts_at", upcomingCutoff())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapEvent);
    },
  });

export const eventQuery = (id: string) =>
  queryOptions({
    queryKey: ["events", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapEvent(data) : null;
    },
  });

export const venuesQuery = () =>
  queryOptions({
    queryKey: ["venues", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select(`*, events(id,name,starts_at,status)`)
        .order("name");
      if (error) throw error;
      return (data ?? []).map(
        (v): VenueCard => ({
          id: v.id,
          name: v.name,
          street: v.street,
          neighborhood: v.neighborhood,
          city: v.city,
          latitude: v.latitude,
          longitude: v.longitude,
          about: v.about,
          tagline: v.tagline,
          slogan: v.slogan,
          since_year: v.since_year,
          organizer_id: v.organizer_id,
          next_event: nextFrom(v.events),
        }),
      );
    },
  });

export const artistsQuery = () =>
  queryOptions({
    queryKey: ["artists", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select(`*, event_artists(event:events(id,name,starts_at,status))`)
        .order("name");
      if (error) throw error;
      return (data ?? []).map(
        (a): ArtistCard => ({
          id: a.id,
          name: a.name,
          art_type: a.art_type,
          subgenre: a.subgenre,
          tagline: a.tagline,
          about: a.about,
          organizer_id: a.organizer_id,
          next_event: nextFrom((a.event_artists ?? []).map((ea) => ea.event)),
        }),
      );
    },
  });

export const artistQuery = (id: string) =>
  queryOptions({
    queryKey: ["artists", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: links, error: e2 } = await supabase
        .from("event_artists")
        .select("event_id")
        .eq("artist_id", id);
      if (e2) throw e2;
      const ids = (links ?? []).map((l) => l.event_id);
      let events: EventItem[] = [];
      if (ids.length) {
        const { data: evs, error: e3 } = await supabase
          .from("events")
          .select(EVENT_SELECT)
          .in("id", ids)
          .eq("status", "published")
          .gte("starts_at", upcomingCutoff())
          .order("starts_at");
        if (e3) throw e3;
        events = (evs ?? []).map(mapEvent);
      }
      return { artist: data, events };
    },
  });

export const venueQuery = (id: string) =>
  queryOptions({
    queryKey: ["venues", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: evs, error: e2 } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("venue_id", id)
        .eq("status", "published")
        .gte("starts_at", upcomingCutoff())
        .order("starts_at");
      if (e2) throw e2;
      return { venue: data, events: (evs ?? []).map(mapEvent) };
    },
  });

// ---------- Signed-in user data ----------

export const meQuery = (userId: string) =>
  queryOptions({
    queryKey: ["me", userId],
    queryFn: async () => {
      const [{ data: profile, error }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      return {
        profile,
        isOrganizer: (roles ?? []).some((r) => r.role === "organizer"),
      };
    },
  });

export const followedArtistIdsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["follows", "artists", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artist_follows").select("artist_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.artist_id);
    },
  });

export const followedVenueIdsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["follows", "venues", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("venue_follows").select("venue_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.venue_id);
    },
  });

export const attendanceIdsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["follows", "attendances", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendances").select("event_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.event_id);
    },
  });

export const myAgendaQuery = (userId: string) =>
  queryOptions({
    queryKey: ["follows", "agenda", userId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("attendances")
        .select("event_id")
        .eq("user_id", userId);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.event_id);
      if (!ids.length) return [] as EventItem[];
      const { data, error: e2 } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .in("id", ids)
        .gte("starts_at", upcomingCutoff())
        .order("starts_at");
      if (e2) throw e2;
      return (data ?? []).map(mapEvent);
    },
  });

// ---------- Organizer data ----------

export const organizerDashboardQuery = (userId: string) =>
  queryOptions({
    queryKey: ["organizer", userId, "dashboard"],
    queryFn: async () => {
      const [ev, ve, ar] = await Promise.all([
        supabase.from("events").select(EVENT_SELECT).eq("organizer_id", userId).order("starts_at"),
        supabase.from("venues").select("*").eq("organizer_id", userId).order("name"),
        supabase.from("artists").select("*").eq("organizer_id", userId).order("name"),
      ]);
      if (ev.error) throw ev.error;
      if (ve.error) throw ve.error;
      if (ar.error) throw ar.error;
      return {
        events: (ev.data ?? []).map(mapEvent),
        venues: ve.data ?? [],
        artists: ar.data ?? [],
      };
    },
  });

export const ownEventQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["organizer", userId, "event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("id", id)
        .eq("organizer_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapEvent(data) : null;
    },
  });

export const ownVenueQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["organizer", userId, "venue", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .eq("organizer_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const ownArtistQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["organizer", userId, "artist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id)
        .eq("organizer_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: email } = await supabase.rpc("artist_account_email", { _artist_id: id });
      return { ...data, account_email: email ?? "" };
    },
  });
