import L from "leaflet";
import { useEffect, useRef } from "react";

import type { VenueSummary } from "@/lib/queries";

type Props = {
  venues: (VenueSummary & { eventCount: number })[];
  selectedId?: string | undefined;
  onSelect: (id: string | undefined) => void;
};

function markerIcon(active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="mc-marker${active ? " is-active" : ""}"><span></span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export default function CultureMap({ venues, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView([-23.548, -46.64], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(m);
    m.on("click", () => onSelectRef.current(undefined));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Fit to all venues once they are known.
  const fitted = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || fitted.current || venues.length === 0) return;
    const bounds = L.latLngBounds(venues.map((v) => [v.latitude, v.longitude] as [number, number]));
    m.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    fitted.current = true;
  }, [venues]);

  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    for (const v of venues) {
      const active = v.id === selectedId;
      const marker = L.marker([v.latitude, v.longitude], { icon: markerIcon(active), title: v.name, zIndexOffset: active ? 1000 : 0 });
      marker.bindTooltip(
        `<strong>${escapeHtml(v.name)}</strong><br/>${escapeHtml(v.neighborhood)} · ${v.eventCount} ${v.eventCount === 1 ? "evento" : "eventos"}`,
        { direction: "top", offset: [0, -30] },
      );
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(v.id);
      });
      marker.addTo(group);
    }
    const sel = venues.find((v) => v.id === selectedId);
    if (sel) m.flyTo([sel.latitude, sel.longitude], Math.max(m.getZoom(), 15), { duration: 0.6 });
  }, [venues, selectedId]);

  return <div ref={el} className="h-full w-full" aria-label="Mapa com os locais culturais" role="region" />;
}
